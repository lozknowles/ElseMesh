import {T} from './vendor/world-engine-contract.js';
import {PINNED_SUNSET_SOG} from './SplatSceneAdapter.js';

export const SUNSET_OUTPUT_WORLD=Object.freeze({
 worldId:'elsemesh.world:0934ce76-df15-406f-914e-74209d48accf',
 contentDigest:'3d904b583d30a198311e0b64248b93c689cf6c2442259964f822794346778992'
});

// The qualified presenter averages encoded, premultiplied RGBA8 values. Neither
// texture sampling nor presentation adds another colour transfer or tone mapping.
const vertexShader=`void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const fragmentShader=`precision highp float;precision highp int;uniform sampler2D sourceColor;uniform int factor;out vec4 outColor;
 void main(){ivec2 base=ivec2(gl_FragCoord.xy)*factor;vec4 c=texelFetch(sourceColor,base,0);if(factor==2){c+=texelFetch(sourceColor,base+ivec2(1,0),0);c+=texelFetch(sourceColor,base+ivec2(0,1),0);c+=texelFetch(sourceColor,base+ivec2(1,1),0);c*=0.25;}outColor=c;}`;

function saveState(r){return {target:r.getRenderTarget(),face:r.getActiveCubeFace(),mip:r.getActiveMipmapLevel(),
 viewport:r.getViewport(new T.Vector4()),scissor:r.getScissor(new T.Vector4()),test:r.getScissorTest(),
 autoClear:r.autoClear,autoReset:r.info.autoReset};}
function restoreState(r,s){r.autoClear=s.autoClear;r.info.autoReset=s.autoReset;
 r.setRenderTarget(s.target,s.face,s.mip);r.setViewport(s.viewport);r.setScissor(s.scissor);r.setScissorTest(s.test);}

/** Opt-in main-output pass. Never wraps renderer.render or changes sort cadence.
 * draw owns the complete ordinary main pass, including an optional depth prepass.
 */
export class WebGLSunsetOutput {
 constructor({renderer,getActive,getPortals}={}){
  if(!renderer||typeof getActive!=='function'||typeof getPortals!=='function')throw Error('Invalid Sunset output dependencies.');
  this.renderer=renderer;this.getActive=getActive;this.getPortals=getPortals;
  this.enabled=false;this.active=false;this.disposed=false;this.contextLost=false;this.reason='disabled';
  this.outputSize=null;this.internalSize=null;this.resources=null;this.drawing=false;
  this.pendingReset=null;
  this.frames=0;this.presentCalls=0;this.lastError=null;this.capabilities=null;
  this.onLost=()=>{this.contextLost=true;this.reset('context-lost');};
  this.onRestored=()=>{this.contextLost=false;this.reset('context-restored-enable-required');this.capabilities=null;};
  renderer.domElement?.addEventListener('webglcontextlost',this.onLost);
  renderer.domElement?.addEventListener('webglcontextrestored',this.onRestored);
 }
 setEnabled(value){if(typeof value!=='boolean')throw Error('Sunset output enable must be boolean.');
  if(this.disposed)return this.snapshot();if(!value)return this.reset('disabled');
  this.enabled=true;this.active=false;this.reason='awaiting-eligible-main';
  return this.snapshot();}
 release(resources){if(!resources)return;
  try{resources.unregister?.();}finally{resources.target?.dispose();resources.geometry?.dispose();resources.material?.dispose();resources.scene?.clear();}}
 reset(reason='reset'){this.enabled=false;this.active=false;this.reason=String(reason);
  if(this.drawing){this.pendingReset=this.reason;return this.snapshot();}
  const old=this.resources;this.resources=null;
  this.outputSize=null;this.internalSize=null;this.release(old);return this.snapshot();}
 setupCapabilities(){
  if(this.capabilities)return this.capabilities;
  const r=this.renderer;
  if(!r.isWebGLRenderer||typeof r.setOutputSurfacePolicy!=='function'||typeof r.getOutputSurfacePolicy!=='function')
   return this.capabilities={supported:false,reason:'output-policy-unavailable'};
  const gl=r.getContext();
  if(!gl||typeof gl.texImage3D!=='function')return this.capabilities={supported:false,reason:'webgl2-required'};
  const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE),maxRenderbuffer=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  if(!Number.isFinite(maxTexture)||!Number.isFinite(maxRenderbuffer))return this.capabilities={supported:false,reason:'unknown-target-limits'};
  return this.capabilities={supported:true,maxEdge:Math.min(maxTexture,maxRenderbuffer),stencil:gl.getContextAttributes()?.stencil===true};
 }
 eligible(scene,camera,ordinary){
  const r=this.renderer,active=this.getActive(),adapter=active?.splatScene,spark=adapter?.spark,state=adapter?.state;
  if(!ordinary||!scene||!camera?.isPerspectiveCamera||camera.isArrayCamera||r.xr?.isPresenting||r.xr?.enabled||r.getRenderTarget()!==null)
   return {reason:'ordinary-default-main-required'};
  if(!active||active.disposed||active.preparedState!=='active'||active.player?.camera!==camera||
     active.identity?.worldId!==SUNSET_OUTPUT_WORLD.worldId||active.identity?.contentDigest!==SUNSET_OUTPUT_WORLD.contentDigest||
     !adapter||state?.disposed||state?.status!=='ready'||!state.warmed||state.numSplats!==PINNED_SUNSET_SOG.count||
     !spark||spark.isDisposed||spark.renderer!==r||spark.accumExtSplats!==false||spark.covSplats!==false)
   return {reason:'active-pinned-sunset-required'};
  let inScene=false;for(let node=active.root;node;node=node.parent)if(node===scene){inScene=true;break;}
  if(!inScene)return {reason:'active-scene-required'};
  const diagnostics=adapter.diagnostics?.();
  if(diagnostics?.assetSha256!==PINNED_SUNSET_SOG.sha256||diagnostics.assetBytes!==PINNED_SUNSET_SOG.bytes||
     diagnostics.declaredCount!==PINNED_SUNSET_SOG.count||diagnostics.readinessContract?.active!==true)
   return {reason:'live-pinned-readiness-required'};
  if(!spark.material||spark.material.uniforms!==spark.uniforms||!spark.uniforms?.encodeLinear||
     !['minPixelRadius','maxPixelRadius','blurAmount','preBlurAmount'].every(key=>Number.isFinite(spark[key])))
   return {reason:'unsupported-spark-material'};
  const callback=Object.getOwnPropertyDescriptor(spark.material,'onBeforeRender');
  if(typeof spark.material.onBeforeRender!=='function'||callback&&(callback.writable===false||callback.get||callback.set))
   return {reason:'unsupported-spark-callback'};
  return {spark};
 }
 allocate(width,height){
  const r=this.renderer,gl=r.getContext(),saved=saveState(r),resources={};
  try{
   const target=resources.target=new T.WebGLRenderTarget(width*2,height*2,{type:T.UnsignedByteType,format:T.RGBAFormat,
    depthBuffer:true,stencilBuffer:this.capabilities.stencil,samples:0});
   target.texture.type=T.UnsignedByteType;target.texture.format=T.RGBAFormat;
   target.texture.internalFormat='RGBA8';target.texture.colorSpace=T.LinearSRGBColorSpace;
   resources.unregister=r.setOutputSurfacePolicy(target,{colorSpace:r.outputColorSpace,toneMapping:true});
   const policy=r.getOutputSurfacePolicy(target);
   if(typeof resources.unregister!=='function'||!Object.isFrozen(policy)||policy.colorSpace!==r.outputColorSpace||policy.toneMapping!==true)
    throw Error('Output policy registration failed.');
   resources.colorSpace=r.outputColorSpace;
   r.initRenderTarget(target);r.setRenderTarget(target);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Sunset output framebuffer incomplete.');
   for(const channel of [gl.FRAMEBUFFER_ATTACHMENT_RED_SIZE,gl.FRAMEBUFFER_ATTACHMENT_GREEN_SIZE,
    gl.FRAMEBUFFER_ATTACHMENT_BLUE_SIZE,gl.FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE]){
    if(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,channel)!==8)throw Error('Sunset output requires RGBA8 storage.');
   }
   if(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING)!==gl.LINEAR)
    throw Error('Sunset output requires linear RGBA8 storage for encoded bytes.');
   resources.scene=new T.Scene();resources.camera=new T.Camera();resources.geometry=new T.BufferGeometry();
   resources.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(9),3));
   resources.material=new T.RawShaderMaterial({glslVersion:T.GLSL3,vertexShader,fragmentShader,
    uniforms:{sourceColor:{value:target.texture},factor:{value:2}},blending:T.NoBlending,transparent:false,
    depthTest:false,depthWrite:false,stencilWrite:false,colorWrite:true,side:T.DoubleSide,lights:false,fog:false,
    clipping:false,toneMapped:false,dithering:false,alphaToCoverage:false,polygonOffset:false,forceSinglePass:true});
   const mesh=new T.Mesh(resources.geometry,resources.material);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;
   resources.scene.add(mesh);resources.scene.background=null;resources.scene.fog=null;
   // Compile the owned presenter before a main draw can commit. No Spark in this scene.
   r.compile(resources.scene,resources.camera);
   return resources;
  }catch(error){this.release(resources);throw error;}finally{restoreState(r,saved);}
 }
 prepare(scene,camera,ordinary){
   const eligible=this.eligible(scene,camera,ordinary);
   if(!eligible.spark){this.reason=eligible.reason;return null;}
   const capabilities=this.setupCapabilities();if(!capabilities.supported){this.reason=capabilities.reason;return null;}
   const gl=this.renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
   this.outputSize={width,height};
   if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
      width*2>capabilities.maxEdge||height*2>capabilities.maxEdge||width*height*4>16000000){this.reason='fixed-2x-target-limit';return null;}
   const viewport=this.renderer.getViewport(new T.Vector4()),ratio=this.renderer.getPixelRatio();
   if(this.renderer.getScissorTest()||viewport.x!==0||viewport.y!==0||
      Math.abs(viewport.z*ratio-width)>1||Math.abs(viewport.w*ratio-height)>1){this.reason='full-main-viewport-required';return null;}
   if(!this.resources||this.resources.target.width!==width*2||this.resources.target.height!==height*2||
      this.resources.colorSpace!==this.renderer.outputColorSpace){
    const replacement=this.allocate(width,height),old=this.resources;this.resources=replacement;this.release(old);
   }
   return {...eligible,width,height};
 }
 renderMain(draw,{scene,camera,ordinary=false}={}){
  if(typeof draw!=='function')throw Error('Main draw callback required.');
  this.active=false;
  if(this.disposed||!this.enabled||this.contextLost){this.reason=this.disposed?'disposed':this.contextLost?'context-lost':'disabled';return draw();}
  if(this.drawing){this.reason='nested-main';return draw();}
  let prepared;
  try{prepared=this.prepare(scene,camera,ordinary);}
  catch(error){this.enabled=false;this.reason='setup-failed';this.lastError=String(error?.message??error);}
  // Deliberately outside the setup catch: a failed ordinary draw is never retried.
  if(!prepared)return draw();
  const {spark,width,height}=prepared;
  const r=this.renderer,material=spark.material,prior=material.onBeforeRender,
   descriptor=Object.getOwnPropertyDescriptor(material,'onBeforeRender'),saved=saveState(r),scaled=[],vectors=[],encode=spark.uniforms.encodeLinear.value;
  const target=this.resources.target;
  const hook=function(...args){const result=prior.apply(this,args);if(r.getRenderTarget()===target)spark.uniforms.encodeLinear.value=false;return result;};
  let drew=false,fallbackBeforeDraw=false;
  this.drawing=true;
  try{
   material.onBeforeRender=hook;
   for(const [key,multiplier]of [['minPixelRadius',2],['maxPixelRadius',2],['blurAmount',4],['preBlurAmount',4]]){
    scaled.push([key,spark[key],spark.uniforms[key]?.value]);spark[key]*=multiplier;
   }
   const portals=this.getPortals(),entries=portals?.views?.entries??portals?.entries;
   for(const entry of entries?.values?.()??[]){const value=entry.material?.uniforms?.framebufferSize?.value;
    if(value?.clone&&value?.set){vectors.push([value,value.clone()]);value.set(target.width,target.height);}}
   r.setRenderTarget(target);r.setViewport(0,0,target.width/r.getPixelRatio(),target.height/r.getPixelRatio());r.setScissorTest(false);
   drew=true;const result=draw();this.frames++;
   r.setRenderTarget(null);r.setViewport(0,0,width/r.getPixelRatio(),height/r.getPixelRatio());r.setScissorTest(false);
   r.autoClear=false;r.info.autoReset=false;r.render(this.resources.scene,this.resources.camera);this.presentCalls++;
   this.outputSize={width,height};this.internalSize={width:width*2,height:height*2};this.active=true;this.reason='active';
   return result;
  }catch(error){this.enabled=false;this.active=false;this.reason='render-failed';this.lastError=String(error?.message??error);
   if(drew)throw error;fallbackBeforeDraw=true;
  }finally{
   if(material.onBeforeRender===hook){if(descriptor)Object.defineProperty(material,'onBeforeRender',descriptor);else delete material.onBeforeRender;}
   spark.uniforms.encodeLinear.value=encode;
   for(const [key,value,uniform]of scaled){spark[key]=value;if(spark.uniforms[key])spark.uniforms[key].value=uniform;}
   for(const [value,before]of vectors)value.copy(before);
   restoreState(r,saved);this.drawing=false;
   if(this.pendingReset){const reason=this.pendingReset;this.pendingReset=null;this.reset(reason);}
  }
  if(fallbackBeforeDraw)return draw();
 }
 snapshot(){return {enabled:this.enabled,active:this.active,reason:this.reason,disposed:this.disposed,contextLost:this.contextLost,
  outputSize:this.outputSize?{...this.outputSize}:null,internalSize:this.internalSize?{...this.internalSize}:null,
  factor:2,samples:0,frames:this.frames,presentCalls:this.presentCalls,lastError:this.lastError};}
 dispose(){if(this.disposed)return;this.reset('disposed');this.disposed=true;
  this.renderer.domElement?.removeEventListener('webglcontextlost',this.onLost);
  this.renderer.domElement?.removeEventListener('webglcontextrestored',this.onRestored);}
}
