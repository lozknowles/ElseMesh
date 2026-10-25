import test from 'node:test';import assert from 'node:assert/strict';
import {RepositoryPortalRuntime} from '../src/world-runtime/RepositoryPortalRuntime.js';import {RepositoryWorldHost} from '../src/world-runtime/RepositoryWorldHost.js';import {Vector3} from '../src/engine/index.js';
function runtimeFixture(){const sent=[],layerCameras=[],bodyCamera={},viewCamera={},position=new Vector3(0,0,-.2),active={identity:{worldId:'a'},player:{position,velocity:new Vector3(),yaw:.2},project:{portals:[{id:'door',position:[0,1.5,0],yaw:0,width:3,height:3,enabled:true,traversal:{enabled:true},view:{enabled:false,maxDistance:3},destination:{worldId:'b'}}]}};const runtime=Object.create(RepositoryPortalRuntime.prototype);Object.assign(runtime,{host:{active},engine:{camera:bodyCamera},connected:true,pending:false,authorityOffline:false,transport:{closed:false,sendState:s=>sent.push(s)},activeLayer:{update:(dt,p,c)=>layerCameras.push(c)},previewLayers:new Map(),views:{entries:new Map()},previewRecords:new Map(),lastPosition:[0,0,.2],getAppearance:()=>({}),getPitch:()=>.4,cross:()=>{runtime.crossed=true;}});return {runtime,active,sent,viewCamera,bodyCamera,layerCameras};}
test('eye viewing still publishes actual neutral body pose but skips crossing and advances sweep history',()=>{
 const f=runtimeFixture();f.runtime.update(.05,1,{allowCrossing:false,viewCamera:f.viewCamera});assert.equal(f.runtime.crossed,undefined);assert.equal(f.sent.length,1);assert.equal(f.sent[0].pitch,.4);assert.deepEqual(f.sent[0].position,[0,0,-.2]);assert.equal(f.layerCameras[0],f.viewCamera);assert.deepEqual(f.runtime.lastPosition,[0,0,-.2]);
 f.runtime.update(.05,2,{allowCrossing:true});assert.equal(f.runtime.crossed,undefined,'returning must not replay the old crossing sweep');
 f.runtime.lastPosition=[0,0,.2];f.runtime.update(.05,3);assert.equal(f.runtime.crossed,true,'ordinary crossing default remains enabled');
});
test('optional gaze publisher omits unsupported modes rather than inventing zero',()=>{const f=runtimeFixture();f.runtime.getPitch=()=>undefined;f.runtime.update(.05,1,{allowCrossing:false});assert.equal('pitch' in f.sent[0],false);});
test('host keeps ordinary gravity/body updates while eye mode disables interaction',()=>{
 const host=Object.create(RepositoryWorldHost.prototype),camera={position:new Vector3()},viewCamera={position:new Vector3(5,6,7)},seen=[];let physics=0,interactions=0;
 const player={position:new Vector3(),velocity:new Vector3(),yaw:0,update:()=>physics++},root={traverse:()=>{}},active={player,root,forest:{userData:{updateTreeLOD:(t,p)=>seen.push(p)}},project:{environment:{timeOfDay:14}}};Object.assign(host,{active,engine:{camera},input:{pressed:new Set(['KeyE'])},onInteract:()=>interactions++,nearestComputer:()=>({id:'computer'}),overlay:null});
 host.update(.05,1,{move:true,interact:false,viewCamera});assert.equal(physics,1);assert.equal(interactions,0);assert.equal(seen[0],viewCamera.position);assert.equal(host.engine.camera,camera);
 host.update(.05,2);assert.equal(physics,2);assert.equal(interactions,1,'ordinary interaction default follows movement');host.update(.05,3,{move:false});assert.equal(physics,2);assert.equal(interactions,1);
});

test('selected eye camera affects only peer culling in its own world',()=>{
 const f=runtimeFixture(),previewCamera={},seen=[];f.runtime.views.entries.set('door',{camera:previewCamera});f.runtime.previewRecords.set('door',{worldId:'b'});f.runtime.previewLayers.set('door',{update:(dt,p,c)=>seen.push(c)});
 f.runtime.update(.05,1,{allowCrossing:false,viewCamera:f.viewCamera,viewWorldId:'b'});assert.equal(f.layerCameras[0],f.bodyCamera);assert.equal(seen[0],f.viewCamera);
 f.runtime.update(.05,2,{allowCrossing:false,viewCamera:f.viewCamera,viewWorldId:'a'});assert.equal(f.layerCameras[1],f.viewCamera);assert.equal(seen[1],previewCamera);
});
