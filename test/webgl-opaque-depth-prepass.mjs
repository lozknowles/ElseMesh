import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {getQualifiedWarehouseDepthOccluders,isEligibleWebGLDepthOccluder,renderWebGLOpaqueDepthPrepass} from '../src/world-runtime/WebGLOpaqueDepthPrepass.js';
import {updateWebGLWeatherShelter} from '../src/world-runtime/WebGLWeatherShelter.js';
import {webGLRepositoryReadinessSignature} from '../src/world-runtime/WebGLRepositoryReadiness.js';

function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),material=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry();
 const wall=new T.InstancedMesh(geometry,material,3),other=new T.Mesh(geometry,material),child=new T.Mesh(geometry,new T.MeshBasicMaterial());other.add(child);scene.add(wall,other);scene.background=new T.Color('#123456');
 wall.layers.mask=3;other.layers.mask=5;child.layers.mask=9;
 const observations=[],clears=[],r={isWebGLRenderer:true,autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:false,xr:{enabled:false},shadowMap:{enabled:false},clippingPlanes:[],localClippingEnabled:false,getRenderTarget:()=>null,info:{autoReset:true,render:{calls:0},reset(){this.render.calls=0;}},
  render(s,c){if(this.info.autoReset)this.info.reset();if(this.autoClear||s.background?.isColor)clears.push([this.autoClearColor,this.autoClearDepth,this.autoClearStencil]);
   const drawn=[];s.traverse(o=>{if(o.isMesh&&o.visible&&o.layers.test(c.layers)){drawn.push({object:o,geometry:o.geometry,material:o.material,colorWrite:o.material.colorWrite,count:o.count??1});this.info.render.calls++;}});observations.push({drawn,background:s.background,autoClear:this.autoClear,autoClearDepth:this.autoClearDepth});if(this.failAt===observations.length)throw Error('draw failed');}};
 const flags=()=>[r.autoClear,r.autoClearColor,r.autoClearDepth,r.autoClearStencil,r.info.autoReset,scene.background,material.colorWrite,wall.layers.mask,other.layers.mask,child.layers.mask];
 return{scene,camera,wall,other,child,material,geometry,r,observations,clears,flags};
}

const qualifiedIdentity={worldId:'elsemesh.world:2842c4f2-93a0-4492-b942-e53e524de319',contentDigest:'fcba18b28ac9b8bf7ef52a1fc8ba0d3dc489d0bd4c94c651cdc559a7617a0e5d'};

test('only the qualified Warehouse world and exact content bytes supply current occluders',()=>{
 const invalid=[null,{}, {identity:{}}, {identity:{worldId:qualifiedIdentity.worldId}},
  {identity:{contentDigest:qualifiedIdentity.contentDigest}},
  {identity:{...qualifiedIdentity,worldId:'another-world'}},
  {identity:{...qualifiedIdentity,contentDigest:'another-digest'}},
  {identity:{...qualifiedIdentity},disposed:true}];
 for(const value of invalid){
  const f=fixture(),saved=f.flags(),active=value&&{...value,depthOccluders:[f.wall,f.child]},phases=[];
  const occluders=getQualifiedWarehouseDepthOccluders(active);assert.deepEqual(occluders,[]);
  const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders,onPhase:p=>phases.push(p)});
  assert.equal(result.used,false);assert.equal(result.reason,'no-eligible-occluders');assert.equal(f.observations.length,1);assert.equal(result.totalDrawCalls,3);assert.deepEqual(phases,['color','idle']);assert.deepEqual(f.flags(),saved);
  if(active)assert.deepEqual(active.depthOccluders,[f.wall,f.child]);
 }
 const f=fixture(),saved=f.flags(),active={identity:{...qualifiedIdentity},depthOccluders:[f.wall,f.child]};
 assert.equal(getQualifiedWarehouseDepthOccluders(active),active.depthOccluders,'borrow the current list without copying or caching');
 const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:getQualifiedWarehouseDepthOccluders(active)});
 assert.equal(result.used,true);assert.equal(result.depthDrawCalls,2);assert.equal(result.colorDrawCalls,3);assert.equal(f.observations.length,2);assert.deepEqual(f.flags(),saved);
 active.depthOccluders=[f.child];assert.equal(getQualifiedWarehouseDepthOccluders(active),active.depthOccluders);
 assert.deepEqual(getQualifiedWarehouseDepthOccluders({identity:{...qualifiedIdentity}}),[]);
});

test('any scene stencil-writing material triggers one unchanged colour draw, including unselected and array materials',()=>{
 for(const kind of ['unselected','array','non-renderable']){
  const f=fixture(),stencil=new T.MeshBasicMaterial({stencilWrite:true});
  if(kind==='unselected')f.other.material=stencil;
  else if(kind==='array')f.other.material=[new T.MeshBasicMaterial(),stencil];
  else {const group=new T.Group();group.material=stencil;f.scene.add(group);}
  const saved=f.flags(),material=f.other.material,phases=[];
  const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall,f.child],onPhase:p=>phases.push(p)});
  assert.equal(result.used,false);assert.equal(result.reason,'stencil');assert.equal(result.depthDrawCalls,0);assert.equal(result.additionalDrawCalls,0);assert.equal(result.colorDrawCalls,3);assert.equal(f.observations.length,1);assert.deepEqual(phases,['color','idle']);assert.deepEqual(f.flags(),saved);assert.equal(f.other.material,material);assert.equal(stencil.stencilWrite,true);assert.equal(stencil.colorWrite,true);assert.deepEqual(f.clears,[[true,true,false]]);
 }
});

test('exact admitted geometry/material/instances fill depth; shared materials, child layers and next frame are restored',()=>{
 const f=fixture(),saved=f.flags(),phases=[];
 const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall,f.child,f.wall],onPhase:p=>phases.push(p)});
 assert.deepEqual(phases,['depth','color','idle']);assert.equal(result.used,true);assert.equal(result.eligibleOccluders,2);assert.equal(result.depthDrawCalls,2);assert.equal(result.colorDrawCalls,3);assert.equal(result.totalDrawCalls,5);assert.equal(f.r.info.render.calls,5);
 assert.deepEqual(f.observations[0].drawn.map(d=>d.object),[f.wall,f.child],'layer masking leaves a selected child renderable below an unselected mesh');
 for(const d of f.observations[0].drawn){assert.equal(d.colorWrite,false);assert.equal(d.geometry,d.object.geometry);assert.equal(d.material,d.object.material);}assert.equal(f.observations[0].drawn[0].count,3);
 assert.deepEqual(f.clears,[[true,true,false],[true,false,false]],'depth fill respects preserved stencil; forced Color-background clear preserves depth and stencil');assert.equal(f.observations[0].background,null);assert.equal(f.observations[1].background,saved[5]);assert.ok(f.observations[1].drawn.every(d=>d.colorWrite));assert.deepEqual(f.flags(),saved);
 const baseline=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall],enabled:false});assert.equal(baseline.used,false);assert.equal(baseline.totalDrawCalls,3);assert.equal(f.r.info.render.calls,3);assert.deepEqual(f.flags(),saved);assert.deepEqual(f.clears.at(-1),[true,true,false]);
});

test('both depth and colour exceptions restore every borrowed state and signal idle',()=>{
 for(const failAt of [1,2]){const f=fixture(),saved=f.flags(),phases=[];f.r.failAt=failAt;assert.throws(()=>renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall],onPhase:p=>phases.push(p)}),/draw failed/);assert.deepEqual(f.flags(),saved);assert.equal(phases.at(-1),'idle');f.r.failAt=0;f.r.render(f.scene,f.camera);assert.equal(f.observations.at(-1).drawn.length,3);}
});

test('eligibility rejects nonordinary depth and deformation while preserving source material callbacks',()=>{
 const changes=[m=>m.material.transparent=true,m=>m.material.opacity=.5,m=>m.material.alphaTest=.1,m=>m.material.alphaHash=true,m=>m.material.alphaToCoverage=true,m=>m.material.alphaMap={},m=>m.material.stencilWrite=true,m=>m.material.polygonOffset=true,m=>m.material.displacementMap={},m=>m.material.depthWrite=false,m=>m.material.depthTest=false,m=>m.material.depthFunc=T.LessDepth,m=>m.material.colorWrite=false,m=>m.material.transmission=1,m=>m.material=new T.ShaderMaterial(),m=>m.material=[m.material],m=>m.isSkinnedMesh=true,m=>m.morphTargetInfluences=[0],m=>m.onBeforeRender=()=>{},m=>m.material.onBeforeRender=()=>{},m=>m.geometry.morphAttributes.position=[{}]];
 for(const change of changes){const f=fixture();change(f.wall);assert.equal(isEligibleWebGLDepthOccluder(f.wall),false);const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall]});assert.equal(result.used,false);assert.equal(f.observations.length,1);}
 const f=fixture();f.material.onBeforeCompile=shader=>{shader.fragmentShader+='gl_FragDepth=0.0;';};assert.equal(isEligibleWebGLDepthOccluder(f.wall),false,'unrecognised depth-writing compile hook is rejected');
 const customKey=fixture();customKey.material.customProgramCacheKey=()=> 'custom-depth';assert.equal(isEligibleWebGLDepthOccluder(customKey.wall),false);
 const spoof=fixture();spoof.material.onBeforeCompile=()=>{};spoof.material.customProgramCacheKey=()=>T.Material.prototype.onBeforeCompile.toString()+'|weather-shelter-v1';assert.equal(isEligibleWebGLDepthOccluder(spoof.wall),false,'key suffix alone does not establish the audited installer');
 const weather=fixture();updateWebGLWeatherShelter({scene:weather.scene,camera:weather.camera},null,0,true);assert.equal(isEligibleWebGLDepthOccluder(weather.wall),true,'actual audited default+shelter chain is admitted');
 weather.material.onBeforeCompile=()=>{};assert.equal(isEligibleWebGLDepthOccluder(weather.wall),false,'replacing the installed shelter hook revokes eligibility');
 const customWeather=fixture();customWeather.material.onBeforeCompile=()=>{};updateWebGLWeatherShelter({scene:customWeather.scene,camera:customWeather.camera},null,0,true);assert.equal(isEligibleWebGLDepthOccluder(customWeather.wall),false,'shelter over an unknown prior hook is rejected');
});

test('unsupported scene/renderer modes fall back exactly once without masks or flag changes',()=>{
 const modes=[f=>f.scene.onBeforeRender=()=>{},f=>f.scene.onAfterRender=()=>{},f=>f.r.xr.enabled=true,f=>f.r.shadowMap.enabled=true,f=>f.r.getRenderTarget=()=>({}),f=>f.r.localClippingEnabled=true,f=>f.r.autoClear=false,f=>f.scene.overrideMaterial=new T.MeshBasicMaterial(),f=>{f.other.material=new T.MeshPhysicalMaterial({transmission:.5});}];
 for(const mode of modes){const f=fixture();mode(f);const saved=f.flags(),phases=[];const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall],onPhase:p=>phases.push(p)});assert.equal(result.used,false);assert.equal(f.observations.length,1);assert.deepEqual(phases,['color','idle']);assert.deepEqual(f.flags(),saved);}
});

test('manual info accumulation reports additional work without resetting earlier draws',()=>{
 const f=fixture();f.r.info.autoReset=false;f.r.info.render.calls=7;const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall]});assert.equal(result.depthDrawCalls,1);assert.equal(result.colorDrawCalls,3);assert.equal(result.totalDrawCalls,4);assert.equal(f.r.info.render.calls,11);assert.equal(f.r.info.autoReset,false);
});

test('disabled and empty-list paths do no helper traversal before the ordinary draw',()=>{
 for(const options of [{enabled:false,occluders:[{}]},{occluders:[]}]){const f=fixture();let traversals=0;const traverse=f.scene.traverse.bind(f.scene);f.scene.traverse=callback=>{traversals++;return traverse(callback);};const result=renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,...options});assert.equal(result.used,false);assert.equal(traversals,1,'only the renderer traverses the scene');assert.equal(result.totalDrawCalls,3);}
});

test('depth fill preserves the original stencil clear policy for both supported settings',()=>{
 for(const stencil of [false,true]){const f=fixture();f.r.autoClearStencil=stencil;const saved=f.flags();renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall]});assert.deepEqual(f.clears,[[true,true,stencil],[true,false,false]]);assert.deepEqual(f.flags(),saved);}
});

test('world switching rejects stale occluder references and renders only the current scene once',()=>{
 const previous=fixture(),current=fixture(),oldState=previous.flags(),currentState=current.flags();
 const result=renderWebGLOpaqueDepthPrepass({renderer:current.r,scene:current.scene,camera:current.camera,occluders:[previous.wall]});
 assert.equal(result.used,false);assert.equal(result.reason,'no-eligible-occluders');assert.equal(result.eligibleOccluders,0);assert.equal(result.totalDrawCalls,3);assert.equal(current.observations.length,1);assert.ok(current.observations[0].drawn.every(d=>d.object!==previous.wall));assert.deepEqual(previous.flags(),oldState);assert.deepEqual(current.flags(),currentState);assert.equal(previous.wall.parent,previous.scene);
});

test('real repository readiness signature survives successful depth fill and either pass throwing',()=>{
 for(const failAt of [0,1,2]){
  const f=fixture(),candidate={root:f.scene},before=webGLRepositoryReadinessSignature(candidate),state=f.flags();f.r.failAt=failAt;
  const draw=()=>renderWebGLOpaqueDepthPrepass({renderer:f.r,scene:f.scene,camera:f.camera,occluders:[f.wall]});
  if(failAt)assert.throws(draw,/draw failed/);else assert.equal(draw().used,true);
  assert.equal(webGLRepositoryReadinessSignature(candidate),before,'canonical structure remains admitted outside callbacks');assert.deepEqual(f.flags(),state);assert.equal(f.wall.parent,f.scene);assert.equal(f.child.parent,f.other);
 }
});
