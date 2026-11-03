import test from 'node:test';
import assert from 'node:assert/strict';
import { RepositoryWorldHost } from '../src/world-runtime/RepositoryWorldHost.js';
import { createWorld } from '../src/world-runtime/vendor/world-engine-contract.js';
import { Group,Scene,PerspectiveCamera,Matrix4 } from '../src/engine/index.js';
import { Colliders } from '../src/world/Colliders.js';
const object=(id,kind,parentId)=>({id,kind,parentId,visible:true,mediaScreen:{width:4}});
async function setup(){
 const host=new RepositoryWorldHost({engine:{scene:new Scene(),camera:new PerspectiveCamera()},input:{pressed:new Set(),_clearTransientInput(){}},
  buildCandidate:async descriptor=>({root:new Group(),terrain:descriptor.terrain,colliders:new Colliders(),matrices:new Map()})});
 const project=createWorld('interactions');await host.activate({project,identity:{worldId:project.metadata.worldId}});host.active.player.position.set(0,0,0);host.engine.camera.position.set(0,.5,0);return host;
}
const place=(host,o,x,y,z=0)=>host.active.matrices.set(o.id,new Matrix4().makeTranslation(x,y,z));
test('media visibility inherits live ancestors and live transforms; strict range and nearest authored tie order',async()=>{
 const host=await setup(),parent=object('parent','group'),a=object('a','media-screen','parent'),b=object('b','media-screen');
 host.active.project.objects=[parent,a,b];place(host,a,2,1.65);place(host,b,3,1.65);
 assert.equal(host.nearestMedia(),a);parent.visible=false;assert.equal(host.nearestMedia(),b);
 parent.visible=true;a.visible=false;assert.equal(host.nearestMedia(),b);a.visible=true;
 place(host,a,3,1.65);assert.equal(host.nearestMedia(),a);place(host,a,4,1.65);place(host,b,4,1.65);assert.equal(host.nearestMedia(),null);
 place(host,b,3.999,1.65);assert.equal(host.nearestMedia(),b);host.active.player.position.x=20;assert.equal(host.nearestMedia(),null);
 host.dispose();
});
test('computer query reads live hierarchy and matrices, preserves nearest order, strict boundary and E callback',async()=>{
 const host=await setup(),parent=object('parent','group'),a=object('a','computer','parent'),b=object('b','computer');
 host.active.project.objects=[parent,a,b];place(host,a,1,0);place(host,b,2,0);
 assert.equal(host.nearestComputer(),a);parent.visible=false;assert.equal(host.nearestComputer(),b);
 parent.visible=true;place(host,b,.5,0);assert.equal(host.nearestComputer(),b);place(host,b,1,0);assert.equal(host.nearestComputer(),a);
 place(host,a,3,0);place(host,b,3,0);assert.equal(host.nearestComputer(),null);place(host,a,2.999,0);
 const calls=[];host.onInteract=o=>calls.push(o);host.input.pressed.add('KeyE');host.update(0,0,{move:false,interact:true});assert.deepEqual(calls,[a]);
 host.dispose();
});
test('array replacement and world activation discard previous interaction candidates',async()=>{
 const host=await setup(),tv=object('tv','media-screen'),computer=object('pc','computer');host.active.project.objects=[tv,computer];place(host,tv,0,1.65);place(host,computer,0,0);
 assert.equal(host.nearestMedia(),tv);assert.equal(host.nearestComputer(),computer);
 host.active.project.objects=[];assert.equal(host.nearestMedia(),null);assert.equal(host.nearestComputer(),null);
 host.active.project.objects=[tv,computer];assert.equal(host.nearestMedia(),tv);
 const project=createWorld('next');await host.activate({project,identity:{worldId:project.metadata.worldId}});
 assert.equal(host.nearestMedia(),null);assert.equal(host.nearestComputer(),null);host.dispose();assert.equal(host.nearestMedia(),null);
});
test('media range clamps to 3–8 metres; inherited cycles and live reparenting retain visibility semantics',async()=>{
 const host=await setup(),parent=object('parent','group','tv'),tv=object('tv','media-screen','parent'),hidden=object('hidden','group');hidden.visible=false;
 host.active.project.objects=[parent,tv,hidden];tv.mediaScreen.width=1;place(host,tv,3,1.65);assert.equal(host.nearestMedia(),null);
 place(host,tv,2.999,1.65);assert.equal(host.nearestMedia(),tv);parent.visible=false;assert.equal(host.nearestMedia(),null);parent.visible=true;
 tv.parentId='hidden';assert.equal(host.nearestMedia(),null);tv.parentId='parent';assert.equal(host.nearestMedia(),tv);
 tv.mediaScreen.width=20;place(host,tv,8,1.65);assert.equal(host.nearestMedia(),null);place(host,tv,7.999,1.65);assert.equal(host.nearestMedia(),tv);
 host.dispose();
});
