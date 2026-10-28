import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {PINNED_SUNSET_SOG} from '../src/world-runtime/SplatSceneAdapter.js';
import {WebGLSunsetOutput,SUNSET_OUTPUT_WORLD} from '../src/world-runtime/WebGLSunsetOutput.js';

function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),root=new T.Group();scene.add(root);
 const uniforms={encodeLinear:{value:true}};
 for(const [key,value]of Object.entries({minPixelRadius:1,maxPixelRadius:96,blurAmount:.3,preBlurAmount:.1}))uniforms[key]={value};
 const material=new T.ShaderMaterial({uniforms}),spark=new T.Mesh(new T.BufferGeometry(),material);root.add(spark);
 Object.assign(spark,{uniforms,accumExtSplats:false,covSplats:false,minPixelRadius:1,maxPixelRadius:96,blurAmount:.3,preBlurAmount:.1});
 let priorCalls=0;material.onBeforeRender=function(){assert.equal(this,material);priorCalls++;uniforms.encodeLinear.value=true;};
 const originalHook=material.onBeforeRender,policies=new Map(),draws=[],initialized=[],glCalls=[];
 const gl={drawingBufferWidth:320,drawingBufferHeight:180,MAX_TEXTURE_SIZE:1,MAX_RENDERBUFFER_SIZE:2,
  FRAMEBUFFER:3,FRAMEBUFFER_COMPLETE:4,COLOR_ATTACHMENT0:5,FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING:6,LINEAR:7,
  FRAMEBUFFER_ATTACHMENT_RED_SIZE:8,FRAMEBUFFER_ATTACHMENT_GREEN_SIZE:9,FRAMEBUFFER_ATTACHMENT_BLUE_SIZE:10,FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE:11,
  texImage3D(){},getParameter(p){glCalls.push(['parameter',p]);return 8192;},getContextAttributes(){return {stencil:true};},
  checkFramebufferStatus(){glCalls.push(['framebuffer']);return this.badFramebuffer?0:this.FRAMEBUFFER_COMPLETE;},
  getFramebufferAttachmentParameter(target,attachment,p){glCalls.push(['attachment',p]);return p===this.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING?this.LINEAR:8;}};
 let target=null,face=2,mip=1,viewport=new T.Vector4(0,0,160,90),scissor=new T.Vector4(7,8,140,80),test=false;
 const r={isWebGLRenderer:true,domElement:new EventTarget(),xr:{enabled:false,isPresenting:false},outputColorSpace:T.SRGBColorSpace,
  autoClear:true,info:{autoReset:true},getContext:()=>gl,getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,
  getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>test,getPixelRatio:()=>2,
  setRenderTarget(t,f=0,m=0){target=t;face=f;mip=m;},setViewport(...args){viewport=args[0]?.isVector4?args[0].clone():new T.Vector4(...args);},
  setScissor(...args){scissor=args[0]?.isVector4?args[0].clone():new T.Vector4(...args);},setScissorTest:v=>{test=v;},
  setOutputSurfacePolicy(t,p){policies.set(t,Object.freeze({...p}));return()=>policies.delete(t);},getOutputSurfacePolicy:t=>policies.get(t)??null,
  initRenderTarget(t){initialized.push(t);if(this.failInit)throw Error('allocation failed');},compile(){if(this.failCompile)throw Error('compile failed');},
  render(s,c){draws.push({scene:s,camera:c,target,viewport:viewport.toArray(),autoClear:this.autoClear,autoReset:this.info.autoReset});
   if(s===scene){for(const key of ['minPixelRadius','maxPixelRadius','blurAmount','preBlurAmount'])uniforms[key].value=spark[key];material.onBeforeRender(this,s,c);}
   else if(this.failPresenter)throw Error('presenter failed');}};
 spark.renderer=r;
 const active={root,identity:{...SUNSET_OUTPUT_WORLD},player:{camera},preparedState:'active',splatScene:{spark,state:{status:'ready',warmed:true,numSplats:PINNED_SUNSET_SOG.count},
  diagnostics:()=>({assetSha256:PINNED_SUNSET_SOG.sha256,assetBytes:PINNED_SUNSET_SOG.bytes,declaredCount:PINNED_SUNSET_SOG.count,readinessContract:{active:true}})}};
 const size=new T.Vector2(320,180),portals={views:{entries:new Map([['portal',{material:{uniforms:{framebufferSize:{value:size}}}}]])}};
 const controller=new WebGLSunsetOutput({renderer:r,getActive:()=>active,getPortals:()=>portals});
 const options={scene,camera,ordinary:true},draw=()=>{r.render(scene,camera);return 'result';};
 const state=()=>({target,face,mip,viewport:viewport.toArray(),scissor:scissor.toArray(),test,autoClear:r.autoClear,autoReset:r.info.autoReset,
  hook:material.onBeforeRender,encode:uniforms.encodeLinear.value,scalars:['minPixelRadius','maxPixelRadius','blurAmount','preBlurAmount'].map(k=>[spark[k],uniforms[k].value]),size:size.toArray()});
 return{controller,r,gl,glCalls,active,spark,material,originalHook,draws,initialized,policies,options,draw,state,size,priorCalls:()=>priorCalls};
}

test('default disabled draws exactly once and leaves the renderer method untouched',()=>{
 const f=fixture(),render=f.r.render,saved=f.state();assert.equal(f.controller.renderMain(f.draw,f.options),'result');
 assert.equal(f.draws.length,1);assert.equal(f.initialized.length,0);assert.equal(f.r.render,render);assert.deepEqual(f.state(),saved);
 f.controller.dispose();
});

test('fixed2x main target and encoded four-texel presenter restore all scoped state without hot GL queries',()=>{
 const f=fixture(),saved=f.state();f.controller.setEnabled(true);
 assert.equal(f.controller.renderMain(()=>{assert.equal(f.spark.maxPixelRadius,192);assert.equal(f.spark.blurAmount,1.2);
  assert.deepEqual(f.size.toArray(),[640,360]);const value=f.draw();assert.equal(f.spark.uniforms.encodeLinear.value,false);return value;},f.options),'result');
 assert.equal(f.priorCalls(),1);assert.equal(f.draws.length,2);assert.equal(f.draws[0].target.width,640);assert.equal(f.draws[0].target.samples,0);
 assert.equal(f.draws[0].target.texture.internalFormat,'RGBA8');assert.equal(f.draws[0].target.texture.colorSpace,T.LinearSRGBColorSpace);
 assert.deepEqual(f.draws[0].viewport,[0,0,320,180]);assert.equal(f.draws[1].target,null);assert.equal(f.draws[1].autoClear,false);
 assert.equal(f.draws[1].autoReset,false);assert.equal(f.draws[1].scene.children.length,1);assert.equal(f.draws[1].scene.children[0].material.toneMapped,false);
 assert.match(f.draws[1].scene.children[0].material.fragmentShader,/c\*=0\.25/);assert.deepEqual(f.state(),saved);
 const queries=f.glCalls.length;f.controller.renderMain(f.draw,f.options);assert.equal(f.glCalls.length,queries);
 assert.equal(f.controller.snapshot().active,true);assert.deepEqual(f.controller.snapshot().internalSize,{width:640,height:360});f.controller.dispose();assert.equal(f.policies.size,0);
});

test('unsupported, preview, eye, stale readiness and oversized output fall back before exactly one draw',()=>{
 for(const variant of ['preview','camera','inactive','readiness','policy','large','target','scissor','viewport','world','digest']){
  const f=fixture();f.controller.setEnabled(true);let options=f.options;
  if(variant==='preview')options={...options,ordinary:false};if(variant==='camera')options={...options,camera:new T.PerspectiveCamera()};
  if(variant==='inactive')f.active.preparedState='discarded';if(variant==='readiness')f.active.splatScene.diagnostics=()=>({});
  if(variant==='policy')delete f.r.setOutputSurfacePolicy;if(variant==='large')f.gl.drawingBufferWidth=9000;
  if(variant==='target')f.r.setRenderTarget({width:1});
  if(variant==='world')f.active.identity.worldId='another-world';
  if(variant==='digest')f.active.identity.contentDigest='changed-content';
  if(variant==='scissor')f.r.setScissorTest(true);if(variant==='viewport')f.r.setViewport(1,0,160,90);
  let count=0;f.controller.renderMain(()=>{count++;},options);assert.equal(count,1,variant);assert.equal(f.initialized.length,0,variant);
  assert.equal(f.controller.snapshot().active,false);assert.notEqual(f.controller.snapshot().reason,'active');f.controller.dispose();
 }
});

test('ordinary fallback draw exceptions propagate without a second draw',()=>{
 for(const enabled of [false,true]){const f=fixture();f.controller.setEnabled(enabled);let calls=0;
  assert.throws(()=>f.controller.renderMain(()=>{calls++;throw Error('ordinary failed');},{...f.options,ordinary:false}),/ordinary failed/);
  assert.equal(calls,1);f.controller.dispose();}
});

test('main and presenter exceptions restore state, disable later output, and never repeat the main draw',()=>{
 for(const at of ['main','presenter']){const f=fixture(),saved=f.state();f.controller.setEnabled(true);let calls=0;
  f.r.failPresenter=at==='presenter';assert.throws(()=>f.controller.renderMain(()=>{calls++;f.draw();if(at==='main')throw Error('main failed');},f.options),/failed/);
  assert.equal(calls,1);assert.deepEqual(f.state(),saved);assert.equal(f.controller.snapshot().enabled,false);
  f.r.failPresenter=false;f.controller.renderMain(f.draw,f.options);assert.equal(f.draws.at(-1).target,null);f.controller.dispose();}
});

test('resize validates replacement before swapping; allocation failure preserves old owned resources and falls back once',()=>{
 const f=fixture();f.controller.setEnabled(true);f.controller.renderMain(f.draw,f.options);const old=f.initialized[0];let disposed=0;old.addEventListener('dispose',()=>disposed++);
 f.gl.drawingBufferWidth=400;f.r.setViewport(0,0,200,90);f.controller.renderMain(f.draw,f.options);assert.equal(disposed,1);assert.equal(f.initialized[1].width,800);
 const current=f.controller.resources.target;let currentDisposed=0;current.addEventListener('dispose',()=>currentDisposed++);
 f.gl.drawingBufferWidth=450;f.r.setViewport(0,0,225,90);f.r.failInit=true;let calls=0;f.controller.renderMain(()=>{calls++;assert.equal(f.r.getRenderTarget(),null);},f.options);
 assert.equal(calls,1);assert.equal(currentDisposed,0);assert.equal(f.controller.resources.target,current);assert.equal(f.controller.snapshot().reason,'setup-failed');
 assert.equal(f.policies.size,1);f.controller.dispose();assert.equal(currentDisposed,1);assert.equal(f.policies.size,0);
});

test('compile failure cleans partial resources and draws ordinary once',()=>{
 const f=fixture();f.r.failCompile=true;f.controller.setEnabled(true);let calls=0;f.controller.renderMain(()=>{calls++;},f.options);
 assert.equal(calls,1);assert.equal(f.policies.size,0);assert.equal(f.controller.snapshot().reason,'setup-failed');f.controller.dispose();
});

test('pre-draw setup failure restores first and falls back once; callback ownership is compare-and-swap',()=>{
 const f=fixture(),saved=f.state();f.controller.getPortals=()=>{throw Error('portal lookup failed');};f.controller.setEnabled(true);let calls=0;
 f.controller.renderMain(()=>{calls++;assert.deepEqual(f.state(),saved);},f.options);assert.equal(calls,1);assert.equal(f.controller.snapshot().enabled,false);
 f.controller.dispose();
 const g=fixture(),replacement=()=>{};g.controller.setEnabled(true);
 g.controller.renderMain(()=>{g.draw();g.material.onBeforeRender=replacement;},g.options);
 assert.equal(g.material.onBeforeRender,replacement);g.controller.dispose();
});

test('disable releases owned targets and reset requested during a draw waits for state restoration',()=>{
 const f=fixture(),saved=f.state();f.controller.setEnabled(true);
 f.controller.renderMain(()=>{const result=f.draw();f.controller.reset('world-change');assert.equal(f.policies.size,1);return result;},f.options);
 assert.equal(f.policies.size,0);assert.deepEqual(f.state(),saved);assert.equal(f.controller.snapshot().reason,'world-change');
 f.controller.setEnabled(true);f.controller.renderMain(f.draw,f.options);f.controller.setEnabled(false);
 assert.equal(f.policies.size,0);assert.equal(f.controller.snapshot().internalSize,null);f.controller.dispose();
});

test('context loss/reset/dispose release only owned resources and require explicit re-enable',()=>{
 const f=fixture();f.controller.setEnabled(true);f.controller.renderMain(f.draw,f.options);
 f.r.domElement.dispatchEvent(new Event('webglcontextlost'));assert.equal(f.controller.snapshot().enabled,false);assert.equal(f.policies.size,0);
 f.r.domElement.dispatchEvent(new Event('webglcontextrestored'));assert.equal(f.controller.snapshot().enabled,false);
 f.controller.setEnabled(true);f.controller.renderMain(f.draw,f.options);assert.equal(f.controller.snapshot().active,true);
 f.controller.reset('world-change');assert.equal(f.policies.size,0);assert.equal(f.controller.snapshot().reason,'world-change');
 f.controller.dispose();f.controller.dispose();assert.equal(f.controller.snapshot().disposed,true);
});
