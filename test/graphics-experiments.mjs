import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphicsExperiments} from '../src/world-runtime/GraphicsExperiments.js';
const mesh=(species,distant,renderOrder=0)=>({userData:{nativePlantSpecies:species,nativePlantDistant:distant},renderOrder});
const root=meshes=>({traverse(fn){meshes.forEach(fn);}});
function setup(meshes){const app={backend:'webgl2',host:{active:{root:root(meshes)}},portals:{views:{entries:new Map()}},opaqueDepthPrepass:{enabled:true}};return {app,control:new GraphicsExperiments(app)};}
test('far trees alone change; exact original orders return on disable',()=>{
 const far=mesh('trees',true,-2),near=mesh('trees',false),shrubs=mesh('shrubs',true),palms=mesh('palms',true),{control}=setup([far,near,shrubs,palms]);
 control.setFarTrees(true);assert.deepEqual([far,near,shrubs,palms].map(m=>m.renderOrder),[1,0,0,0]);assert.equal(control.snapshot().changedTreeBatches,1);
 control.setFarTrees(false);assert.equal(far.renderOrder,-2);assert.equal(control.snapshot().changedTreeBatches,0);
});
test('candidate replacement restores old references and applies only to the new roots',()=>{
 const old=mesh('trees',true),next=mesh('trees',true,3),{app,control}=setup([old]);control.setFarTrees(true);
 app.host.active={root:root([next])};control.refresh();assert.equal(old.renderOrder,0);assert.equal(next.renderOrder,1);assert.equal(control.orders.has(old),false);
 control.dispose();assert.equal(next.renderOrder,3);assert.equal(control.orders.size,0);
});
test('repeated refresh does not accumulate writes or retain released previews',()=>{
 const a=mesh('trees',true),b=mesh('trees',true,4),{app,control}=setup([a]);app.portals.views.entries.set('door',{candidate:{root:root([b])}});
 control.setFarTrees(true);for(let i=0;i<10;i++)control.refresh();assert.equal(control.snapshot().changedTreeBatches,2);
 app.portals.views.entries.clear();control.refresh();assert.equal(b.renderOrder,4);assert.equal(control.snapshot().changedTreeBatches,1);
 control.reset();assert.equal(a.renderOrder,0);assert.equal(control.snapshot().farTrees,false);
});
test('prepass is reversible and unsupported backends do not claim experiments enabled',()=>{
 const {app,control}=setup([]);control.setPrepass(false);assert.equal(app.opaqueDepthPrepass.enabled,false);control.reset();assert.equal(app.opaqueDepthPrepass.enabled,true);
 app.backend='webgpu';control.setFarTrees(true);assert.equal(control.snapshot().farTrees,false);assert.equal(control.snapshot().supported,false);
});
