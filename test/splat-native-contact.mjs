import test from 'node:test';
import assert from 'node:assert/strict';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/index.js';
import {compileSplatScenePhysics,splatGeometrySha256} from '../src/world-runtime/SplatScenePhysics.js';
const captured=[.3205928913904597,.0006486487226720905,.2545356596808423];
// Actual source candidate box15588, not a hypothesized floor contact.
const wall={center:[.025,.95,3.608224830031759e-16],half:[.025,1.0502032556357703,.125],yaw:0,walkable:false,provenance:'Captured authored safety-box regression',physicsKind:'safetybounds'};
const floor={center:[0,-.05,0],half:[3,.05,3],yaw:0,walkable:true,provenance:'Synthetic known floor'};
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
async function bundle(boxes=[wall],cylinders=[]){
 const accepted=[];for(let x=0;x<12;x++)for(let z=0;z<12;z++)accepted.push([x,z]);const transform={position:[0,0,0],rotation:[0,0,0],scale:1},collisions={coordinateSpace:'world',provenance:'Unit-only qualified capability',boxes:[floor,...boxes],cylinders};
 const q={status:'qualified-corridor',human:{radius:.3,height:1.8,footRadius:.35},spawn:{position:[1.5,0,0],yaw:0,pitch:0},exitDoor:{position:[1.5,1.45,1.5],yaw:Math.PI,width:2.06,height:2.9},reviewedRoutes:[[[1.5,0,0],[1.5,0,1.5]],[[1.5,0,1.5],[1.5,0,0]],[[1.5,0,1.35],[1.5,0,1.1]]],reviewSha256:'d'.repeat(64),geometrySha256:await splatGeometrySha256(collisions),sourceGeometrySha256:'f'.repeat(64),sourceProjectionEvidenceSha256:'1'.repeat(64)};
 const doc={schema:'elsemesh.splat-physics/1',assetSha256:'a'.repeat(64),transform,scaleStatus:'assumed-gameplay',coordinateSpace:'game-world',bounds:{min:[-3,-.5,-3],max:[3,4,3]},plane:{normal:[0,1,0],offset:0},supportMask:{origin:[-3,-3],cellSize:.5,shape:[12,12],accepted},collisions,qualification:q},bytes=new TextEncoder().encode(JSON.stringify(doc)),h=await sha(bytes),project={splatScene:{schema:'elsemesh.splat-scene/1',asset:{path:`splat-scenes/${doc.assetSha256}.sog`,sha256:doc.assetSha256,bytes:8,count:16},physics:{path:`splat-scenes/${h}.json`,sha256:h,bytes:bytes.length},transform,scaleStatus:'assumed-gameplay',provenance:{videoSha256:'b'.repeat(64),plySha256:'c'.repeat(64),reviewSha256:q.reviewSha256,qualificationSha256:await sha(new TextEncoder().encode(JSON.stringify(q)+'\n'))}}};return compileSplatScenePhysics(project,bytes);
}
function trace(c,position,indexed){c.optimizeSpatialQueries=indexed;const p=new Vector3(...position),contacts=[],hit=c.resolveCapsule(p,.3,1.8,.4,contact=>contacts.push(contact));return {hit,position:p.toArray(),displacement:p.distanceTo(new Vector3(...position)),contacts};}
test('native hook reports the captured rounded safety tangent without changing native output or hit boolean',async()=>{
 const b=await bundle();let previous;for(const indexed of [false,true]){const c=b.colliders;c.optimizeSpatialQueries=indexed;const plain=new Vector3(...captured),plainHit=c.resolveCapsule(plain,.3,1.8,.4),t=trace(c,captured,indexed);assert.equal(t.hit,true);assert.equal(plainHit,t.hit);assert.deepEqual(t.position,plain.toArray());assert.deepEqual(t.position,captured);assert.equal(t.contacts.length,1);const contact=t.contacts[0];assert.equal(contact.type,'box');assert.equal(contact.collider,c.boxes[1]);assert.equal(contact.penetration,0);assert.deepEqual(contact.position,captured);const comparable={position:t.position,penetration:contact.penetration,local:contact.localPosition,normal:contact.normal};if(previous)assert.deepEqual(comparable,previous);previous=comparable;}
});
test('compiler accepts only linear-roundoff tangent noise, retaining captured genuine diagonal rejection',async()=>{
 const b=await bundle();for(const indexed of [false,true]){b.colliders.optimizeSpatialQueries=indexed;const tangent=b.inspectPose(captured,{allowAirborne:true});assert.equal(tangent.valid,true);assert.equal(tangent.contactSummary.contactCount,1);assert.equal(tangent.contactSummary.meaningfulContact,false);assert.equal(tangent.contactSummary.maximumPenetration,0);
  const diagonal=b.inspectPose([.3215546239,.0006945878446,.2519435347],{allowAirborne:true});assert.equal(diagonal.valid,false);assert.ok(diagonal.contactSummary.maximumPenetration>2e-4);assert.equal(diagonal.contactSummary.meaningfulContact,true);
 }
});
test('shallow genuine penetration above the linear epsilon is rejected even far below the former .001 net bound',async()=>{
 const b=await bundle(),point=[captured[0]-.9019763046348656*1e-10,captured[1],captured[2]-.431785532269473*1e-10];for(const indexed of [false,true]){b.colliders.optimizeSpatialQueries=indexed;const p=b.inspectPose(point);assert.equal(p.valid,false);assert.ok(p.displacement<.001);assert.ok(p.contactSummary.maximumPenetration>p.contactSummary.maximumEpsilon*100);}
});
test('centred cylinder remains rejected although native resolution produces zero net displacement',async()=>{
 const b=await bundle([],[{x:0,z:0,radius:.2,yMin:0,yMax:1,provenance:'Centred cylinder regression'}]);for(const indexed of [false,true]){const t=trace(b.colliders,[0,0,0],indexed);assert.equal(t.hit,true);assert.equal(t.displacement,0);assert.equal(t.contacts.length,1);assert.equal(t.contacts[0].type,'cylinder');assert.equal(t.contacts[0].penetration,.5);assert.equal(b.clearance([0,0,0]),false);}
});
test('opposing meaningful box pushes cannot cancel into accepted clearance',async()=>{
 const boxes=[-.25,.25].map(x=>({center:[x,1,0],half:[.1,1,1],yaw:0,walkable:false,provenance:'Opposing cancellation regression'})),b=await bundle(boxes);for(const indexed of [false,true]){const t=trace(b.colliders,[-.15,0,0],indexed);assert.equal(t.hit,true);assert.ok(t.displacement<1e-12);assert.equal(t.contacts.length,2);assert.ok(t.contacts.every(c=>c.penetration>.2));assert.equal(b.clearance([-.15,0,0]),false);}
});
test('rotated box contact uses the same native contribution in both paths, with bounded noise only',async()=>{
 const box={center:[-1,.95,-1],half:[.2,1,.4],yaw:.73,walkable:false,provenance:'Rotated contact regression'},b=await bundle([box]),r=.3/Math.sqrt(2),point=inset=>{const x=.2+r-inset,z=.4+r-inset;return [-1+x*Math.cos(.73)+z*Math.sin(.73),0,-1-x*Math.sin(.73)+z*Math.cos(.73)];};
 let reference;for(const indexed of [false,true]){b.colliders.optimizeSpatialQueries=indexed;const noisy=b.inspectPose(point(Number.EPSILON));assert.equal(noisy.valid,true);const real=b.inspectPose(point(1e-9));assert.equal(real.valid,false);assert.ok(real.contactSummary.maximumPenetration>real.contactSummary.maximumEpsilon);const value={noisy:noisy.valid,real:real.valid,penetration:real.contactSummary.maximumPenetration};if(reference)assert.deepEqual(value,reference);reference=value;}
});
