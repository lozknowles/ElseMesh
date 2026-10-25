import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadWorldSource,describeRuntimeWorld,mapPortalPoint,portalLocalPoint,portalWorldPoint,sweepPortalCapsule} from '../src/world-runtime/vendor/world-engine-contract.js';
import {yawTowardsXZ,nativeForward} from './public-sunset-navigation.mjs';
import {resolve} from 'node:path';
import {Colliders} from '../src/world/Colliders.js';
import {compileSplatScenePhysics} from '../src/world-runtime/SplatScenePhysics.js';
import {Vector3} from '../src/engine/index.js';
const root=process.env.PUBLIC_WAREHOUSE_SOURCE??process.argv[2];
if(!root)throw Error('Usage: PUBLIC_WAREHOUSE_SOURCE=clean-world-directory node test/public-sunset-route.mjs');
const {project}=await loadWorldSource({kind:'local',label:root,read:async path=>new Uint8Array(await readFile(root+'/'+path))});
const descriptor=describeRuntimeWorld(project),colliders=new Colliders();
for(const box of descriptor.boxes)colliders.addBox(new Vector3(...box.center),new Vector3(...box.half),box.rotY??box.yaw??0,{walkable:box.walkable,solid:box.solid,tag:box.id});
const samples=[];
const waypoints=[project.spawn.position,[-1.5,3,-75],[-1.5,3,-79.2]];
for(let segment=0;segment<waypoints.length-1;segment++)for(let step=0;step<=100;step++){
 const a=waypoints[segment],b=waypoints[segment+1],t=step/100,feet=new Vector3(...a).lerp(new Vector3(...b),t),resolved=feet.clone();
 colliders.resolveCapsule(resolved,.3,1.8,.001);
 const horizontal=Math.hypot(resolved.x-feet.x,resolved.z-feet.z),vertical=resolved.y-feet.y;
 assert.equal(colliders.groundHeightAt(feet.x,feet.z,3.1),3);assert.ok(horizontal<1e-7,JSON.stringify({segment,step,feet:feet.toArray(),resolved:resolved.toArray()}));
 assert.ok(Math.abs(vertical)<.01);
 samples.push({feet:feet.toArray(),horizontal,vertical});
}
const door={position:[-1.5,4.45,-78.5],yaw:0,width:2.06,height:2.9};
for(const x of [-.73,0,.73])for(const z of [-.6,0,.6]){
 const feet=new Vector3(door.position[0]+x,3,door.position[2]+z),resolved=feet.clone();colliders.resolveCapsule(resolved,.3,1.8,.001);
 assert.equal(colliders.groundHeightAt(feet.x,feet.z,3.1),3);assert.ok(resolved.distanceTo(feet)<1e-7,JSON.stringify({apertureProbe:feet.toArray(),resolved:resolved.toArray()}));
}
const sourcePortal=project.portals.find(p=>/Sunset/i.test(p.name))??{...door,enabled:true,traversal:{enabled:true}};
const approachCases=[];
for(const start of [[-4,3,-75],...Array.from({length:31},(_,i)=>[-1.8+i*.02,3,-75])])for(const yawError of Array.from({length:11},(_,i)=>-.1+i*.02)){
 const yaw=yawTowardsXZ(start,door.position)+yawError,[vx,vz]=nativeForward(yaw),distance=(door.position[2]-.6-start[2])/vz,count=Math.ceil(distance/.02);
 for(let n=0;n<=count;n++){const t=distance*n/count,feet=new Vector3(start[0]+vx*t,3,start[2]+vz*t),resolved=feet.clone();colliders.resolveCapsule(resolved,.3,1.8,.001);assert.ok(resolved.distanceTo(feet)<1e-7);assert.equal(colliders.groundHeightAt(feet.x,feet.z,3.1),3);}
 const beforeDistance=(door.position[2]+.02-start[2])/vz,afterDistance=(door.position[2]-.02-start[2])/vz;
 const previous=[start[0]+vx*beforeDistance,3,start[2]+vz*beforeDistance],next=[start[0]+vx*afterDistance,3,start[2]+vz*afterDistance],sweep=sweepPortalCapsule({portal:sourcePortal,previousFeet:previous,nextFeet:next,radius:.3,bodyHeight:1.8});
 assert.ok(sweep,'Actual capsule crosses from verified start '+JSON.stringify({start,yawError}));approachCases.push({start,yawError,yaw,samples:count+1,entryFeet:sweep.feet});
}
const out=resolve(process.env.PUBLIC_SUNSET_EVIDENCE??'.local-evidence/public-sunset-route');await mkdir(out,{recursive:true,mode:0o700});
const report={source:root,spawn:project.spawn,dockPortal:project.portals[0],candidate:door,route:waypoints,actualColliderCount:descriptor.boxes.length,routeSamples:samples.length,approachCases,apertureCapsuleProbes:9,floorHeight:3,capsule:{radius:.3,height:1.8,floorAllowance:.001},passed:true,limitations:['CPU capsule clearance; actual browser route and visibility still require acceptance.']};
if(process.env.PUBLIC_SUNSET_SOURCE){
 const destinationRoot=process.env.PUBLIC_SUNSET_SOURCE;
 const {project:destination}=await loadWorldSource({kind:'local',label:destinationRoot,read:async path=>new Uint8Array(await readFile(destinationRoot+'/'+path))});
 const sourcePortal=project.portals.find(p=>p.destination.worldId===destination.metadata.worldId),exit=destination.portals.find(p=>p.id===sourcePortal.destination.portalId);
 assert.ok(sourcePortal&&exit);
 const physics=await compileSplatScenePhysics(destination,new Uint8Array(await readFile(destinationRoot+'/'+destination.splatScene.physics.path)));
 const mapped=mapPortalPoint(sourcePortal,exit,[sourcePortal.position[0],3,sourcePortal.position[2]]),local=portalLocalPoint(exit,mapped),front=[...local];front[2]=.15;const arrival=portalWorldPoint(exit,front);front[2]=.4;const egress=portalWorldPoint(exit,front),segments=[physics.segment(mapped,arrival,{radius:.3,height:1.8,footRadius:.35,stepHeight:.001}),physics.segment(arrival,egress,{radius:.3,height:1.8,footRadius:.35,stepHeight:.001})];
 assert.ok(segments.every(s=>s.valid));report.mapping={mapped,arrival,egress,segments};
 const returnSweeps=[];
 for(const lateral of [-.7,0,.7]){
  const previous=portalWorldPoint(exit,[lateral,0,.05]),next=portalWorldPoint(exit,[lateral,0,-.05]);
  previous[1]=physics.terrain.heightAt(previous[0],previous[2]);next[1]=physics.terrain.heightAt(next[0],next[2]);
  const swept=sweepPortalCapsule({portal:exit,previousFeet:previous,nextFeet:next,radius:.3,bodyHeight:1.8});
  returnSweeps.push({lateral,previous,next,swept});assert.ok(swept,'Grounded Sunset return crosses the authored aperture at lateral '+lateral);
 }
 report.mapping.returnSweeps=returnSweeps;
}
await writeFile(out+'/route-candidate.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

