import test from 'node:test';
import assert from 'node:assert/strict';
import { RepositoryWorldHost } from '../src/world-runtime/RepositoryWorldHost.js';
import { createWorld } from '../src/world-runtime/vendor/world-engine-contract.js';
import { Group, Scene, PerspectiveCamera, Matrix4 } from '../src/engine/index.js';
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
