import test from 'node:test';
import assert from 'node:assert/strict';
import { RepositoryWorldHost } from '../src/world-runtime/RepositoryWorldHost.js';
import { createWorld } from '../src/world-runtime/vendor/world-engine-contract.js';
import { Group, Scene, PerspectiveCamera, Matrix4, Vector3 } from '../src/engine/index.js';
import { Colliders } from '../src/world/Colliders.js';
const loaded=name=>{const project=createWorld(name);return {project,identity:{worldId:project.metadata.worldId,contentDigest:name,location:'test:'+name}};};
const input=()=>({pressed:new Set(),clears:0,_clearTransientInput(){this.clears++;},consumeLook:()=>({x:0,y:0}),moveAxes:()=>({x:0,y:0,sprint:0}),down:()=>false,hit:()=>false});
const candidate=descriptor=>({root:new Group(),terrain:descriptor.terrain,colliders:new Colliders(),descriptor,matrices:new Map()});
const setup=(buildCandidate=async d=>candidate(d))=>{const engine={scene:new Scene(),camera:new PerspectiveCamera()},inp=input();return new RepositoryWorldHost({engine,input:inp,buildCandidate});};
test('A to B to A atomically replaces player, root, terrain and collisions',async()=>{
 const host=setup(),a=loaded('a'),b=loaded('b');await host.activate(a);const old=host.active;await host.activate(b);
 assert.equal(old.root.parent,null);assert.notEqual(host.active.player,old.player);assert.notEqual(host.active.colliders,old.colliders);assert.equal(host.engine.scene.children.length,1);
 await host.activate(a);assert.equal(host.active.identity.worldId,a.identity.worldId);assert.equal(host.active.player.mode,'walk');assert.equal(host.active.player.velocity.length(),0);assert.equal(host.input.clears,3);host.dispose();assert.equal(host.engine.scene.children.length,0);
});
test('invalid candidate preserves playable active world and controls',async()=>{
 const host=setup();await host.activate(loaded('a'));const old=host.active;const bad=loaded('b');bad.project.terrain.heights=[NaN];await assert.rejects(host.activate(bad));assert.equal(host.active,old);assert.equal(old.root.parent,host.engine.scene);host.update(.016,1);assert.ok(host.active.player.position.toArray().every(Number.isFinite));host.dispose();
});
test('stale candidate cannot replace newer selection and detached resources are released',async()=>{
 let release;const host=setup(async d=>{if(d.project.metadata.name==='slow')await new Promise(r=>release=r);return candidate(d);});
 await host.activate(loaded('a'));const slow=host.activate(loaded('slow'));await host.activate(loaded('new'));release();assert.equal(await slow,false);assert.equal(host.active.project.metadata.name,'new');assert.equal(host.engine.scene.children.length,1);host.dispose();
});

test('delayed remote update cannot replace a different selected world',async()=>{
 let resolve;const host=setup();host.checkSourceUpdate=()=>new Promise(r=>resolve=r);await host.activate(loaded('a'));const update=host.checkUpdate();await host.activate(loaded('b'));resolve(loaded('a-updated'));assert.equal(await update,false);assert.equal(host.active.project.metadata.name,'b');host.dispose();
});
test('hidden computers and computers under hidden parents cannot be interacted with',async()=>{
 const host=setup();await host.activate(loaded('a'));
 const object=(id,kind,visible,parentId)=>({id,kind,visible,parentId,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],collision:'none'});
 host.active.project.objects=[object('parent','group',false),object('hidden','computer',false),object('nested','computer',true,'parent')];
 for(const o of host.active.project.objects)host.active.matrices.set(o.id,new Matrix4().makeTranslation(0,0,0));host.engine.camera.position.set(0,.5,0);
 assert.equal(host.nearestComputer(),null);host.active.project.objects[0].visible=true;assert.equal(host.nearestComputer().id,'nested');host.dispose();
});

test('authoritative sign power overrides config while local overlays retain config fallback',async()=>{
 const host=setup();await host.activate(loaded('a'));let powered;const neon=new Group();neon.userData.neonObjectId='sign';neon.userData.updateNeon=(time,hour,value)=>{powered=value;};host.active.root.add(neon);
 host.overlay={signs:[{id:'sign',config:{powered:true},powered:false}]};host.update(.016,1);assert.equal(powered,false);
 host.overlay={signs:[{id:'sign',config:{powered:false},powered:true}]};host.update(.016,2);assert.equal(powered,true);
 host.overlay={signs:[{id:'sign',config:{powered:false}}]};host.update(.016,3);assert.equal(powered,false);host.dispose();
});

test('checking only stages a revision; applying is deliberate and stale stages cannot apply',async()=>{
 const host=setup();await host.activate(loaded('a'));const current=host.active;let activations=0;host.beforeActivate=async()=>activations++;host.overlay={signs:[]};
 host.checkSourceUpdate=async()=>loaded('a-new');const checked=await host.checkUpdate();assert.equal(checked.toDigest,'a-new');assert.equal(host.active,current);assert.equal(activations,0);assert.ok(host.overlay);
 assert.equal(await host.applyUpdate(),true);assert.equal(host.active.identity.contentDigest,'a-new');assert.equal(activations,1);assert.equal(host.overlay,null);
 await assert.rejects(host.applyUpdate(),/Check for an update again/);
 await host.checkUpdate();await host.activate(loaded('b'));await assert.rejects(host.applyUpdate(),/Check for an update again/);assert.equal(host.active.project.metadata.name,'b');host.dispose();
});

test('prepare is detached and preserves active root, camera, input, overlay and session callback',async()=>{
 const host=setup();await host.activate(loaded('a'));let callbacks=0;host.beforeActivate=async()=>callbacks++;
 const old=host.active,camera=host.engine.camera,position=camera.position.clone(),quaternion=camera.quaternion.clone(),clears=host.input.clears,generation=host.generation;
 host.overlay={signs:[]};const overlay=host.overlay,prepared=await host.prepare(loaded('b'));
 assert.equal(host.active,old);assert.equal(old.root.parent,host.engine.scene);assert.equal(prepared.root.parent,null);
 assert.notEqual(prepared.player.camera,camera);assert.deepEqual(camera.position.toArray(),position.toArray());assert.deepEqual(camera.quaternion.toArray(),quaternion.toArray());
 assert.equal(host.input.clears,clears);assert.equal(host.overlay,overlay);assert.equal(host.generation,generation);assert.equal(callbacks,0);
 const root=prepared.root;assert.equal(await host.activatePrepared(prepared),true);
 assert.equal(host.active,prepared);assert.equal(host.active.root,root);assert.equal(host.active.player.camera,camera);assert.equal(callbacks,1);
 await assert.rejects(host.activatePrepared(prepared),/consumed or discarded/);assert.equal(root.parent,host.engine.scene);host.dispose();
});
test('arrival preparation preserves exact position velocity and view without ground clamping',async()=>{
 const host=setup(async d=>({...candidate(d),terrain:{heightAt:()=>0}}));await host.activate(loaded('a'));
 const pose={position:[2,5,3],velocity:[1,-.5,2],yaw:1.25,pitch:-.3},prepared=await host.prepare(loaded('b'),{pose});
 assert.deepEqual(prepared.player.position.toArray(),pose.position);assert.deepEqual(prepared.player.velocity.toArray(),pose.velocity);
 assert.equal(prepared.player.yaw,pose.yaw);assert.equal(prepared.player.pitch,pose.pitch);
 assert.equal(await host.activatePrepared(prepared),true);
 assert.deepEqual(host.active.player.position.toArray(),pose.position);assert.deepEqual(host.active.player.velocity.toArray(),pose.velocity);
 assert.equal(host.active.player.yaw,pose.yaw);assert.equal(host.engine.camera.position.y,6.62);host.dispose();
});
test('invalid finite, terrain and capsule arrival preparation keeps previous world playable',async()=>{
 const host=setup(async descriptor=>{
  const c={...candidate(descriptor),terrain:{heightAt:()=>0}};if(descriptor.project.metadata.name==='solid')c.colliders.addBox(new Vector3(0,1,0),new Vector3(1,1,1),0,{walkable:true,solid:true});return c;
 });
 await host.activate(loaded('a'));const old=host.active,clears=host.input.clears;
 await assert.rejects(host.prepare(loaded('bad'),{pose:{position:[0,NaN,0],velocity:[0,0,0],yaw:0}}),/not finite/);
 await assert.rejects(host.prepare(loaded('low'),{pose:{position:[0,-20,0],velocity:[0,0,0],yaw:0}}),/terrain/);
 await assert.rejects(host.prepare(loaded('solid'),{pose:{position:[0,0,0],velocity:[0,0,0],yaw:0}}),/solid/);
 assert.equal(host.active,old);assert.equal(old.root.parent,host.engine.scene);assert.equal(host.input.clears,clears);assert.equal(host.prepared.size,0);
 host.update(.016,2);assert.ok(host.active.player.position.toArray().every(Number.isFinite));host.dispose();
});
test('stale and explicitly discarded prepared candidates are released without replacing active',async()=>{
 const host=setup();await host.activate(loaded('a'));const stale=await host.prepare(loaded('b'));let releases=0;stale.root.userData.disposeAssetTextures=()=>releases++;
 await host.activate(loaded('c'));const current=host.active;
 assert.equal(await host.activatePrepared(stale),false);assert.equal(releases,1);assert.equal(stale.preparedState,'discarded');assert.equal(host.active,current);
 const cancelled=await host.prepare(loaded('d'));assert.equal(host.discardPrepared(cancelled),true);assert.equal(host.discardPrepared(cancelled),false);
 await assert.rejects(host.activatePrepared(cancelled),/consumed or discarded/);host.dispose();
});
test('failed activation callback discards prepared candidate while preserving old world',async()=>{
 const host=setup();await host.activate(loaded('a'));const old=host.active,prepared=await host.prepare(loaded('b'));
 host.beforeActivate=async()=>{throw Error('session refused');};
 await assert.rejects(host.activatePrepared(prepared),/session refused/);
 assert.equal(host.active,old);assert.equal(old.root.parent,host.engine.scene);assert.equal(prepared.preparedState,'discarded');host.dispose();
});

test('native resource readiness is awaited detached and failure preserves source and input',async()=>{
 const host=setup();await host.activate(loaded('source'));const original=host.active,clears=host.input.clears;
 let release;host.prepareResources=()=>new Promise(r=>release=r);const pending=host.prepare(loaded('destination'));while(!release)await new Promise(r=>setImmediate(r));
 assert.equal(host.active,original);assert.equal(host.prepared.size,0);assert.equal(host.input.clears,clears);release();const prepared=await pending;assert.equal(prepared.preparedState,'ready');host.discardPrepared(prepared);
 host.prepareResources=async()=>{throw Error('pipeline failed');};await assert.rejects(host.prepare(loaded('failed')),/pipeline failed/);assert.equal(host.active,original);assert.equal(host.input.clears,clears);host.dispose();
});
test('stale native readiness completion disposes candidate without activation',async()=>{
 const host=setup();await host.activate(loaded('source'));const original=host.active;let release;host.prepareResources=()=>new Promise(r=>release=r);const pending=host.prepare(loaded('stale'));while(!release)await new Promise(r=>setImmediate(r));host.disconnect();release();assert.equal(await pending,false);assert.equal(host.active,original);assert.equal(host.prepared.size,0);host.dispose();
});
