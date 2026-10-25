import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSplatScenePhysics,splatGeometrySha256} from '../src/world-runtime/SplatScenePhysics.js';
const encode=v=>new TextEncoder().encode(JSON.stringify(v));
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
async function fixture(){
 const transform={position:[10,4,-7],rotation:[-Math.PI/2,0,0],scale:2},accepted=[];for(let x=0;x<12;x++)for(let z=0;z<12;z++)accepted.push([x,z]);
 const doc={schema:'elsemesh.splat-physics/1',assetSha256:'a'.repeat(64),transform:structuredClone(transform),scaleStatus:'assumed-gameplay',coordinateSpace:'game-world',bounds:{min:[-3,-.5,-3],max:[3,3.5,3]},plane:{normal:[0,1,0],offset:0},supportMask:{origin:[-3,-3],cellSize:.5,shape:[12,12],accepted},collisions:{coordinateSpace:'world',provenance:'Synthetic test geometry',boxes:[{center:[0,-.025,0],half:[3,.025,3],yaw:0,walkable:true,provenance:'Synthetic fixture floor',physicsKind:'rawvoxel'}],cylinders:[]},qualification:{status:'qualified-corridor',human:{radius:.3,height:1.8,footRadius:.35},spawn:{position:[0,0,0],yaw:0,pitch:0},exitDoor:{position:[0,1.45,1.5],yaw:Math.PI,width:2.06,height:2.9},reviewedRoutes:[[[0,0,0],[0,0,1.5]],[[0,0,1.5],[0,0,0]],[[0,0,1.35],[0,0,1.1]],[[0,0,1.1],[0,0,0]]],reviewSha256:'d'.repeat(64),geometrySha256:'0'.repeat(64),sourceGeometrySha256:'f'.repeat(64),sourceProjectionEvidenceSha256:'1'.repeat(64)}};
 const project={splatScene:{schema:'elsemesh.splat-scene/1',asset:{path:'splat-scenes/'+'a'.repeat(64)+'.sog',sha256:'a'.repeat(64),bytes:8,count:16},physics:{path:'',sha256:'',bytes:0},transform,scaleStatus:'assumed-gameplay',provenance:{videoSha256:'b'.repeat(64),plySha256:'c'.repeat(64),reviewSha256:'d'.repeat(64),qualificationSha256:'e'.repeat(64)}}};
 const refresh=async({geometry=true,qualification=true}={})=>{if(geometry)doc.qualification.geometrySha256=await splatGeometrySha256(doc.collisions);if(qualification)project.splatScene.provenance.qualificationSha256=await sha(new TextEncoder().encode(JSON.stringify(doc.qualification)+'\n'));const bytes=encode(doc),hash=await sha(bytes);project.splatScene.physics={path:`splat-scenes/${hash}.json`,sha256:hash,bytes:bytes.length};return bytes;};
 return {doc,project,refresh};
}
async function rejects(change,pattern,{geometry=true}={}){const f=await fixture();change(f.doc,f.project);await assert.rejects(compileSplatScenePhysics(f.project,await f.refresh({geometry})),pattern);}
test('one shared bundle keeps game-world geometry untransformed and qualifies bounded native routes',async()=>{
 const f=await fixture(),b=await compileSplatScenePhysics(f.project,await f.refresh());assert.equal(b.terrain.heightAt(.1,.1),0);assert.deepEqual(b.colliders.boxes[0].center.toArray(),[0,-.025,0]);assert.deepEqual(b.transform.position,[10,4,-7]);assert.ok(b.clearance([0,0,0]));assert.ok(b.segment([0,0,0],[0,0,1.5]).valid);assert.ok(b.clearance(b.arrival.mappedPosition));assert.ok(b.clearance(b.arrival.egressPosition));assert.notEqual(b.sourceGeometrySha256,b.geometrySha256);assert.ok(Object.isFrozen(b.qualification));
});
test('unknown cells and real holes reject point ground, whole feet, poses and swept movement',async()=>{
 const f=await fixture();f.doc.supportMask.accepted=f.doc.supportMask.accepted.filter(([x,z])=>x!==2||z!==2);const b=await compileSplatScenePhysics(f.project,await f.refresh());
 assert.equal(b.terrain.heightAt(-1.75,-1.75),-Infinity);assert.equal(b.terrain.heightAt(-1.4,-1.75),0);assert.equal(b.supportsFootprint(-1.4,-1.75,.35),false);assert.equal(b.clearance([-1.4,0,-1.75]),false);assert.equal(b.segment([-2.5,0,-1.75],[-1,0,-1.75]).valid,false);
 assert.equal(b.colliders.groundHeightAt(-1.75,-1.75,.4),0,'raw geometry remains unchanged; callers use the shared predicate');assert.equal(b.clearance([2.8,0,0]),false);assert.equal(b.terrain.heightAt(4,0),-Infinity);
});
test('oriented native boxes and cylinders preserve dimensions and protect shared clearance after merging',async()=>{
 const f=await fixture();f.doc.collisions.boxes.push({center:[-1.5,.5,0],half:[.2,.5,.3],yaw:.7,walkable:false,provenance:'Rotated test wall'});f.doc.collisions.cylinders.push({x:1.5,z:0,radius:.2,yMin:0,yMax:1,provenance:'Test cylinder'});const b=await compileSplatScenePhysics(f.project,await f.refresh());
 assert.equal(b.colliders.boxes[1].rotY,.7);assert.equal(b.colliders.cylinders[0].radius,.2);assert.equal(b.clearance([-1.5,0,0]),false);assert.equal(b.clearance([1.5,0,0]),false);
 const {Vector3}=await import('../src/engine/index.js');b.colliders.addBox(new Vector3(1,1,1),new Vector3(.2,1,.2),0,{walkable:false});assert.equal(b.clearance([1,0,1]),false);
});
test('descriptor byte hash is verified before parsing and canonical geometry has its separate digest',async()=>{
 const f=await fixture(),bytes=await f.refresh(),changed=bytes.slice();changed[0]^=1;await assert.rejects(compileSplatScenePhysics(f.project,changed),/physics hash/);
 await rejects(doc=>{doc.collisions.boxes[0].center[0]+=.01;},/geometry SHA/,{geometry:false});
});
test('candidate status, asset/G/review mismatch and incomplete route qualification fail closed',async()=>{
 await rejects(doc=>doc.qualification.status='candidate-corridor',/explicitly be qualified/);
 await rejects(doc=>doc.assetSha256='9'.repeat(64),/asset SHA mismatch/);
 await rejects(doc=>doc.transform.scale=3,/transform mismatch/);
 await rejects(doc=>doc.qualification.reviewSha256='9'.repeat(64),/provenance/);
 await rejects(doc=>doc.qualification.reviewedRoutes=[doc.qualification.reviewedRoutes[0],doc.qualification.reviewedRoutes[2],doc.qualification.reviewedRoutes[2]],/forward\/reverse/);
});
test('unknown fields are rejected at each admitted object level',async()=>{
 for(const mutate of [d=>d.url='https://bad.invalid',d=>d.transform.script='bad',d=>d.bounds.extra=1,d=>d.plane.kind='flat',d=>d.supportMask.fillHoles=true,d=>d.collisions.script='bad',d=>d.collisions.boxes[0].execute='bad',d=>d.qualification.human.speed=3,d=>d.qualification.spawn.world='bad',d=>d.qualification.exitDoor.effect='bad',d=>d.qualification.approval=true])await rejects(mutate,/Invalid splat physics/);
});
test('caps, invalid spaces, duplicates and malformed native geometry reject',async()=>{
 await rejects(d=>d.coordinateSpace='model-space',/coordinate space/);await rejects(d=>d.collisions.coordinateSpace='model',/collision records/);
 await rejects(d=>d.supportMask.accepted.push(d.supportMask.accepted[0]),/duplicate support/);await rejects(d=>d.supportMask.shape=[257,12],/mask grid/);await rejects(d=>d.plane.normal=[0,.1,0],/plane/);await rejects(d=>d.collisions.boxes[0].half[0]=-1,/native box/);
 await rejects(d=>{d.collisions.boxes=Array(30001).fill(d.collisions.boxes[0]);},/native collision records/);
});
test('qualified endpoints, mapped arrival and every declared route require actual mask/native support',async()=>{
 await rejects(d=>d.qualification.spawn.position=[-2.9,0,0],/qualified spawn/);
 await rejects(d=>{d.supportMask.accepted=d.supportMask.accepted.filter(([x,z])=>x!==2||z!==2);d.qualification.reviewedRoutes[0]=[[0,0,0],[-1.75,0,-1.75],[0,0,1.5]];},/reviewed route/);
 await rejects(d=>{d.qualification.exitDoor.position=[0,1.45,2.9];},/qualified exit|qualified mapped|forward\/reverse/);
});
test('caller capsule options and height/budget violations cannot bypass support',async()=>{
 const f=await fixture(),b=await compileSplatScenePhysics(f.project,await f.refresh());assert.equal(b.clearance([0,2,0]),false);assert.equal(b.clearance([0,0,0],{footRadius:0}),false);assert.equal(b.clearance([0,0,0],{script:'bad'}),false);assert.equal(b.segment([0,0,0],[0,0,1],{maxLength:.1}).valid,false);assert.equal(b.segment([0,0,0],[0,0,1],{sampling:0}).valid,false);
});

test('full-circle mask uses disk/rectangle intersection rather than an AABB or sparse ring samples',async()=>{
 const f=await fixture();f.doc.supportMask.accepted=f.doc.supportMask.accepted.filter(([x,z])=>x!==2||z!==2);const b=await compileSplatScenePhysics(f.project,await f.refresh());
 assert.equal(b.supportsFootprint(-1.25,-1.25,.35),true,'disk clears the missing cell corner despite overlapping its AABB');
 assert.equal(b.supportsFootprint(-1.26,-1.26,.35),false,'disk crosses the missing cell corner');
});
test('partial last grid cells do not expand the admitted crop',async()=>{
 const f=await fixture();f.doc.bounds.max[2]=2.75;const b=await compileSplatScenePhysics(f.project,await f.refresh());
 assert.equal(b.terrain.heightAt(0,2.74),0);assert.equal(b.terrain.heightAt(0,2.76),-Infinity);assert.equal(b.supportsFootprint(0,2.5,.35),false);
});
test('compilation copies descriptor and physics bytes before asynchronous hashing',async()=>{
 const f=await fixture(),bytes=await f.refresh(),pending=compileSplatScenePhysics(f.project,bytes);bytes.fill(0);f.project.splatScene.transform.position[0]=999;const b=await pending;assert.equal(b.transform.position[0],10);assert.ok(b.clearance([0,0,0]));
});
test('airborne is explicit and legitimate jumps preserve actual vertical movement within the mask',async()=>{
 const f=await fixture(),b=await compileSplatScenePhysics(f.project,await f.refresh());assert.equal(b.clearance([0,1,0]),false);assert.equal(b.clearance([0,1,0],{allowAirborne:true}),true);assert.equal(b.segment([0,0,0],[0,1,0]).valid,false);
 const jump=b.segment([0,0,0],[0,1,0],{allowAirborne:true});assert.ok(jump.valid);assert.equal(jump.points[0][1],0);assert.equal(jump.points.at(-1)[1],1);assert.ok(jump.points.some(p=>p[1]>.4&&p[1]<.6));assert.equal(b.clearance([0,1,0],{allowAirborne:'yes'}),false);
});
test('airborne movement cannot cross holes, leave full-capsule bounds or go below the floor',async()=>{
 const f=await fixture();f.doc.supportMask.accepted=f.doc.supportMask.accepted.filter(([x,z])=>x!==2||z!==2);const b=await compileSplatScenePhysics(f.project,await f.refresh());
 assert.equal(b.segment([-2.5,1,-1.75],[-1,1,-1.75],{allowAirborne:true}).valid,false);assert.equal(b.clearance([2.8,1,0],{allowAirborne:true}),false);assert.equal(b.clearance([0,2,0],{allowAirborne:true}),false);assert.equal(b.clearance([0,-.09,0],{allowAirborne:true}),false);
});
test('airborne support queries use the fixed floor, not an obstacle top near high feet',async()=>{
 const f=await fixture(),b=await compileSplatScenePhysics(f.project,await f.refresh()),{Vector3}=await import('../src/engine/index.js');b.colliders.addBox(new Vector3(1.5,.7,0),new Vector3(.2,.1,.2),0,{walkable:true});
 const pose=b.inspectPose([1.5,1,0],{allowAirborne:true});assert.equal(pose.valid,true);assert.equal(pose.nativeGround,0);assert.equal(b.segment([1,1,0],[2,1,0],{allowAirborne:true}).valid,true);
});
test('native ceiling contact and vertical-only ceiling tunnelling remain rejected',async()=>{
 const f=await fixture();f.doc.bounds.max[1]=6;const b=await compileSplatScenePhysics(f.project,await f.refresh()),{Vector3}=await import('../src/engine/index.js');b.colliders.addBox(new Vector3(0,2.1,0),new Vector3(.5,.05,.5),0,{walkable:false});
 assert.equal(b.clearance([0,.6,0],{allowAirborne:true}),false);assert.equal(b.clearance([0,0,0],{allowAirborne:true}),true);assert.equal(b.clearance([0,2.3,0],{allowAirborne:true}),true);assert.equal(b.segment([0,0,0],[0,2.3,0],{allowAirborne:true}).valid,false);
});
test('experimental splat terrain permits walk mode only',async()=>{
 const f=await fixture(),b=await compileSplatScenePhysics(f.project,await f.refresh());assert.equal(b.terrain.assertMovementMode('walk'),true);for(const mode of ['boat','swim','fly','helicopter',undefined])assert.throws(()=>b.terrain.assertMovementMode(mode),/walk movement only/);
});

test('declared qualification provenance must bind the actual status and placement independently of physics SHA',async()=>{
 const f=await fixture(),initial=await f.refresh();f.project.splatScene.provenance.qualificationSha256='9'.repeat(64);await assert.rejects(compileSplatScenePhysics(f.project,initial),/qualification SHA mismatch/);
 await f.refresh();const oldQualificationSha=f.project.splatScene.provenance.qualificationSha256;f.doc.qualification.spawn.yaw=.2;const changed=await f.refresh({qualification:false});assert.equal(f.project.splatScene.physics.sha256,await sha(changed),'updated whole-resource hash is otherwise valid');assert.equal(f.project.splatScene.provenance.qualificationSha256,oldQualificationSha);await assert.rejects(compileSplatScenePhysics(f.project,changed),/qualification SHA mismatch/);
 const rebound=await f.refresh();assert.notEqual(f.project.splatScene.provenance.qualificationSha256,oldQualificationSha);assert.ok((await compileSplatScenePhysics(f.project,rebound)).clearance([0,0,0]));
});
