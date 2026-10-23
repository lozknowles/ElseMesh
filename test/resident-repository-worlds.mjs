import test from 'node:test';
import assert from 'node:assert/strict';
import {ResidentRepositoryWorlds} from '../src/world-runtime/ResidentRepositoryWorlds.js';
import {RepositoryWorldHost} from '../src/world-runtime/RepositoryWorldHost.js';
import {Scene,Group,PerspectiveCamera,Vector3} from '../src/engine/index.js';
import {Colliders} from '../src/world/Colliders.js';
import {createWorld,createTerrain,describeRuntimeWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
function setup(){
 let builds=0,warms=0;const disposed=[],loaded=['a','b','c','d'].map(name=>{const project=createWorld(name);project.terrain=createTerrain(32,32,9);return {project,identity:{worldId:project.metadata.worldId,contentDigest:name}};}),descriptors=new Map(loaded.map(l=>[l.identity.worldId,{worldId:l.identity.worldId,contentDigest:l.identity.contentDigest,epoch:1,published:{descriptor:{authority:{nodeId:'authority'}}}}]));
 const manager=new ResidentRepositoryWorlds({dispose:c=>{disposed.push(c.root);c.root.removeFromParent();}}),input={pressed:new Set(),_clearTransientInput(){},consumeLook:()=>({x:0,y:0}),moveAxes:()=>({x:0,y:0}),down:()=>false,hit:()=>false},host=new RepositoryWorldHost({engine:{scene:new Scene(),camera:new PerspectiveCamera()},input,buildCandidate:async descriptor=>{builds++;return {root:new Group(),descriptor,terrain:descriptor.terrain,colliders:new Colliders(),matrices:new Map()};},prepareResources:async()=>{warms++;},disposeCandidate:c=>{if(c?.root)disposed.push(c.root);},acquireResources:l=>manager.borrow(l,descriptors.get(l.identity.worldId)),registerResources:p=>{manager.register(p.loaded,descriptors.get(p.identity.worldId),p);return manager.borrow(p.loaded,descriptors.get(p.identity.worldId));},retainResources:p=>!!p&&[...manager.records.values()].some(r=>r.candidate.root===p.root)});
 const preview=l=>{const descriptor=describeRuntimeWorld(l.project),candidate={root:new Group(),descriptor,terrain:descriptor.terrain,colliders:new Colliders(),matrices:new Map()};builds++;warms++;const record=manager.register(l,descriptors.get(l.identity.worldId),candidate);manager.linkPreview(record,'preview:'+l.identity.worldId);return record;};
 return {manager,host,loaded,descriptors,preview,disposed,get builds(){return builds;},get warms(){return warms;}};
}
test('warm borrowed preview remains rendered until committed activation; fresh isolated player uses exact reserved pose',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);const source=f.host.active,record=f.preview(b),previewScene=new Scene();previewScene.add(record.candidate.root);const root=record.candidate.root,colliders=record.candidate.colliders,pose={position:[1,record.candidate.terrain.heightAt(1,2),2],velocity:[0,0,2],yaw:1,pitch:.1},prepared=await f.host.prepare(b,{pose});
 assert.equal(root.parent,previewScene);assert.equal(f.host.active,source);assert.equal(prepared.root,root);assert.equal(prepared.colliders,colliders);assert.notEqual(prepared.player,source.player);assert.notEqual(prepared.player.camera,f.host.engine.camera);assert.deepEqual(prepared.player.position.toArray(),pose.position);
 assert.equal(f.builds,2);assert.equal(f.warms,2);await f.host.activatePrepared(prepared);assert.equal(root.parent,f.host.engine.scene);assert.equal(f.manager.records.size,2);assert.equal(f.disposed.length,0);assert.equal(f.manager.active,record);
});
test('twenty warm round trips retain actual roots/colliders without rebuild or compile readiness calls',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);f.preview(b);const roots=new Map([...f.manager.records.values()].map(r=>[r.loaded.identity.worldId,r.candidate.root]));
 for(let i=0;i<20;i++){const l=i%2? a:b;await f.host.activate(l);assert.equal(f.host.active.root,roots.get(l.identity.worldId));assert.equal(f.manager.records.size,2);assert.equal(f.builds,2);assert.equal(f.warms,2);}
 assert.equal(f.disposed.length,0);
});
test('cancel, collision rejection and stale preparation preserve borrowed preview ownership',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);const r=f.preview(b),scene=new Scene();scene.add(r.candidate.root);
 const p=await f.host.prepare(b);f.host.discardPrepared(p);assert.equal(r.pin,null);assert.equal(r.candidate.root.parent,scene);assert.equal(r.disposed,false);
 await assert.rejects(f.host.prepare(b,{pose:{position:[0,-100,0],velocity:[0,0,0],yaw:0}}),/terrain/);assert.equal(r.pin,null);assert.equal(r.candidate.root.parent,scene);
 const pending=f.host.prepare(b);f.host.disconnect();assert.equal(await pending,false);assert.equal(r.pin,null);assert.equal(f.disposed.length,0);
});
test('unresolved lease pins source and destination until recovery, then activates same prepared resources',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);const r=f.preview(b),prepared=await f.host.prepare(b);f.manager.prune(new Set());assert.equal(f.manager.records.size,2);assert.throws(()=>f.manager.dispose(),/Unresolved/);assert.equal(f.manager.records.size,2);assert.equal(f.disposed.length,0);assert.equal(r.pin!==null,true);await f.host.activatePrepared(prepared);assert.equal(f.host.active.root,r.candidate.root);
});
test('descriptor epoch/digest and bounded topology are explicit and fail closed',async()=>{
 const f=setup(),[a,b,c,d]=f.loaded;await f.host.activate(a);const rb=f.preview(b);assert.throws(()=>f.manager.borrow(b,{...f.descriptors.get(b.identity.worldId),epoch:2}),/epoch/);assert.equal(f.manager.get({...b,identity:{...b.identity,contentDigest:'changed'}},{...f.descriptors.get(b.identity.worldId),contentDigest:'changed'}),null);
 assert.throws(()=>f.manager.borrow(a,f.descriptors.get(a.identity.worldId)),/Same-world/);assert.throws(()=>f.manager.linkPreview(rb,'duplicate'),/Duplicate/);f.preview(c);assert.throws(()=>f.preview(d),/capacity/);assert.equal(f.manager.records.size,3);
 f.manager.prune(new Set([b.identity.worldId]));assert.equal(f.manager.records.size,2);f.manager.dispose();assert.equal(new Set(f.disposed).size,f.disposed.length);
});
test('resident activation failure keeps graphics pinned for recovery without rebuilding',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);f.preview(b);const prepared=await f.host.prepare(b);f.host.beforeActivate=async()=>{throw Error('activation failed');};await assert.rejects(f.host.activatePrepared(prepared),/activation failed/);assert.ok(prepared.resourceLease.record.pin);f.host.beforeActivate=async()=>{};await f.host.activatePrepared(prepared);assert.equal(f.builds,2);assert.equal(f.warms,2);
});

test('changed material readiness cannot be borrowed until explicit prewarming updates the fingerprint',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);const record=f.preview(b);const material={id:123,version:0};record.candidate.root.material=material;assert.throws(()=>f.manager.borrow(b,f.descriptors.get(b.identity.worldId)),/readiness changed/);f.manager.markReady(record);const lease=f.manager.borrow(b,f.descriptors.get(b.identity.worldId));lease.release();material.version++;assert.throws(()=>f.manager.borrow(b,f.descriptors.get(b.identity.worldId)),/readiness changed/);
});
test('new content evicts only an unpinned inactive package and disposes it exactly once',async()=>{
 const f=setup(),[a,b]=f.loaded;await f.host.activate(a);const old=f.preview(b),newLoaded={...b,identity:{...b.identity,contentDigest:'new-digest'}},descriptor={...f.descriptors.get(b.identity.worldId),contentDigest:'new-digest'},root=new Group();const replacement=f.manager.register(newLoaded,descriptor,{...old.candidate,root});assert.equal(old.disposed,true);assert.equal(f.disposed.filter(r=>r===old.candidate.root).length,1);assert.equal(f.manager.records.size,2);assert.equal(replacement.candidate.root,root);
});
