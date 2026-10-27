import * as N from '../engine/index.js';
import { Material } from '../engine/render/Material.js';
import { RenderTarget } from '../engine/gpu/Texture.js';
import { createViewUniforms, setFrameCamera, FrameUniforms } from '../engine/render/Frame.js';
import { GPU } from '../engine/gpu/GPU.js';
import { SceneRenderer } from '../engine/render/SceneRenderer.js';
import { DEPTH_FORMAT } from '../engine/render/SceneRenderer.js';
import { portalMappingElements } from './vendor/world-engine-contract.js';
import { repositoryProjectWaterHeight } from './RepositoryWater.js';
import { disposeRepositoryScene } from './RepositoryScene.js';

export const PORTAL_VIEW_LIMIT = 2;
export const PORTAL_VIEW_LONG_EDGE = 512;
export const PORTAL_VIEW_STATES = Object.freeze({ unavailable:0, loading:1, restricted:2, live:3, cached:4 });
export function portalTargetSize(width,height,maxLongEdge=PORTAL_VIEW_LONG_EDGE) {
 const scale=Math.min(1,Math.min(1024,Math.max(256,maxLongEdge))/Math.max(1,width,height));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
// Rigid upright aperture transforms. Local front is +Z and positions are aperture centres.
export function portalMappingMatrix(source,destination) {
 return new N.Matrix4().fromArray(portalMappingElements(source,destination));
}
export function portalDestinationPlane(destination,margin=.015) {
 const yaw=destination.yaw||0,n=new N.Vector3(Math.sin(yaw),0,Math.cos(yaw));
 return new N.Vector4(n.x,n.y,n.z,-n.dot(new N.Vector3(...destination.position))-margin);
}
// Per-destination medium state is independent of the main membership's water.
export function portalViewWaterState(candidate,camera,time=0){
 const project=candidate?.descriptor?.project??candidate?.project;
 const native=candidate?.nativeIsland?.water;
 const seaLevel=native?.seaLevel??project?.nativeIsland?.sea?.level??project?.water?.level??0;
 let height=native?seaLevel:repositoryProjectWaterHeight(project,camera.position.x,camera.position.z,time);
 const query=native?.query;
 if(query?.cpuValid&&Math.hypot(query.resultInputs?.[0]-camera.position.x,query.resultInputs?.[1]-camera.position.z)<.01)height=query.cpu[0];
 const wet=Number.isFinite(height)&&height>-99999;
 return{seaLevel,cameraWaterHeight:wet?height:seaLevel,cameraUnderwater:wet&&camera.position.y<height?1:0,windSpeed:project?.environment?.windSpeed??7};
}

const output=/* wgsl */`
 let uv = in.pixel * frame.invResolution;
 let stripe = step(0.5, fract((in.uv.x + in.uv.y) * 12.0 + frame.time * 0.25));
 var color = vec3f(0.055,0.065,0.075);
 if (mat.portalState > 0.5 && mat.portalState < 1.5) { color = mix(vec3f(0.04,0.09,0.16),vec3f(0.08,0.22,0.32),stripe); }
 if (mat.portalState > 1.5 && mat.portalState < 2.5) { color = mix(vec3f(0.14,0.025,0.025),vec3f(0.33,0.06,0.04),stripe); }
 if (mat.portalState > 2.5) {
   let image = textureSampleLevel(portalView,smpLinearClamp,uv,0.0).rgb;
   color = image;
   if (mat.portalState > 3.5) { color = mix(image * 0.4,vec3f(0.18,0.12,0.025),0.35 + stripe * 0.2); }
 }
 // A closed back face never displays a destination image.
 if (!in.front) { color = vec3f(0.045,0.045,0.05); }
 r.color = vec4f(color,1.0);
`;

/** Detached native scenes, one level of rendering, no host activation or membership changes.
 * setDestination owns candidate unless ownsCandidate:false. Any root must be detached.
 * source/destination: {position:[x,y,z],yaw:radians,width?,height?}.
 * State becomes live only after this frame actually draws an authorized destination.
 */
export class PortalViews {
 constructor({engine,meshRenderer,mainCamera,maxLongEdge=512,prepareResources,background}) {
  if(background&&mainCamera.reversedDepth===false)throw Error('Portal sky requires reversed-depth camera');
  this.background=background;
  this.forkOptions={engine,meshRenderer,mainCamera,maxLongEdge,prepareResources,background};this.prepareResources=prepareResources;this.maxLongEdge=maxLongEdge;this.engine=engine;this.meshRenderer=meshRenderer;this.mainCamera=mainCamera;
  this.entries=new Map();this.active=null;
 }
 fork(){return new PortalViews(this.forkOptions);}
 park(){const entries=this.entries;this.entries=new Map();this.active=null;return entries;}
 restore(active,entries){
  if(this.entries.size)this.clear();this.active=active;this.entries=entries??new Map();
  // Graphics may remain resident, but VIEW grants are scoped to the new membership.
  // Drop destination references before prune can leave a stale/evicted candidate here.
  for(const e of this.entries.values()){this._releaseCandidate(e);e.authorizedView=false;e.hasImage=false;e.state=e.source?.enabled===false?'unavailable':'loading';this._status(e);}
 }
 disposeEntries(entries){const current=this.entries;this.entries=entries;this.clear();this.entries=current;}
 setActive(active) { if(this.active!==active){this.clear();this.active=active;} }
 setDestination(portalId,options={}) {
  let e=this.entries.get(portalId);
  if(!e) {
   if(this.entries.size>=PORTAL_VIEW_LIMIT)this.remove(this.entries.keys().next().value);
   const target=new RenderTarget(1,1,{colors:['rgba16float'],depth:DEPTH_FORMAT,label:'portal:'+portalId});
   const material=new Material({name:'portal-aperture:'+portalId,lit:false,side:'double',textures:{portalView:target.texture},uniforms:{portalState:['f32',0]},output,receiveShadows:false});
   const aperture=new N.Mesh(new N.PlaneGeometry(1,1),material);
   aperture.castShadow=false;aperture.userData.portalAperture=true;aperture.userData.portalId=portalId;
   e={id:portalId,target,material,aperture,scene:new N.Scene(),camera:new N.PerspectiveCamera(),block:createViewUniforms('portal:'+portalId),state:'unavailable',authorizedView:false,hasImage:false};
   const pack=e.block.onBeforePack;e.block.onBeforePack=()=>{pack();if(e.candidate){for(const [key,value]of Object.entries(portalViewWaterState(e.candidate,e.camera,e.viewTime??0)))e.block.fields[key].value=value;}};
   this.entries.set(portalId,e);
  }
  if(options.candidate && options.candidate!==e.candidate) {
   if(options.authorizedView!==true)throw Error('Portal destination requires explicit authorizedView');
   if(options.candidate.root.parent)throw Error('Portal preview root must be independently built and detached');
   this._releaseCandidate(e);e.candidate=options.candidate;e.ownsCandidate=options.ownsCandidate!==false;
   e.scene.add(e.candidate.root);e.hasImage=false;
   if(e.candidate.nativeIsland){
    e.viewRenderer=new SceneRenderer(this.meshRenderer,e.scene,e.camera);
    e.viewWater=e.candidate.nativeIsland.water.createView(e.viewRenderer);
    e.viewBackground=this.background?.createMRT?.();
    e.viewRenderer.background=e.viewBackground??null;
    e.material.bindings.portalView={texture:e.viewRenderer.sceneRT.texture};
    e.material.needsUpdate=true;
   }else{e.material.bindings.portalView={texture:e.target.texture};}

  }
  if(options.source)e.source=options.source;
  if(options.destination)e.destination=options.destination;
  if('authorizedView' in options)e.authorizedView=options.authorizedView===true;
  if(options.state)e.state=options.state;
  if(!e.authorizedView && e.candidate){this._releaseCandidate(e);e.hasImage=false;}
  if(e.source) {
   e.aperture.position.fromArray(e.source.position);e.aperture.rotation.set(0,e.source.yaw||0,0);
   e.aperture.scale.set(e.source.width||2,e.source.height||3,1);
  }
  if((this.prepareResources||this.background)&&(!e.resourcesReady||options.candidate&&(!options.candidate.residentReady||e.viewRenderer))){
   const token=(e.prepareToken??0)+1;e.prepareToken=token;e.preparing=true;e.aperture.visible=false;const candidate=e.candidate;
   e.readyPromise=Promise.all([...(this.prepareResources?[this.prepareResources(e.aperture),...(candidate?[this.prepareResources(candidate.root)]:[])]:[]),...(this.background?[this.background.readyPromise]:[]),...(e.viewRenderer?[this._prepareView(e)]:[])]).then(()=>{
    if(this.entries.get(portalId)!==e||e.prepareToken!==token)return false;
    e.preparing=false;e.resourcesReady=true;e.aperture.visible=true;this._status(e);return true;
   },error=>{if(this.entries.get(portalId)===e&&e.prepareToken===token){e.preparing=false;e.state='unavailable';e.readinessError=error.message;this._status(e);}throw error;});
   void e.readyPromise.catch(()=>{});
  }
  this._status(e);return e.aperture;
 }
 async whenReady(portalId){return await (this.entries.get(portalId)?.readyPromise??Promise.resolve(true));}
 getAperture(portalId){return this.entries.get(portalId)?.aperture||null;}
 getScene(portalId){return this.entries.get(portalId)?.scene||null;}
 setState(portalId,state){const e=this.entries.get(portalId);if(e){e.state=state;this._status(e);}}
 _status(e,drawn=false) {
  const state=e.preparing?'loading':!e.authorizedView && ['live','cached'].includes(e.state)?'restricted':e.state==='cached'&&!e.hasImage?'loading':e.state;
  e.material.set('portalState',PORTAL_VIEW_STATES[state==='live'&&!drawn?(e.hasImage?'cached':'loading'):state]??0);
  e.aperture.userData.portalViewState=state==='live'&&!drawn?(e.hasImage?'cached':'loading'):state;
 }
 render({width=1,height=1,time=0}={}) {
  if(this.background&&this.mainCamera.reversedDepth===false)throw Error('Portal sky requires reversed-depth camera');
  this.mainCamera.updateMatrixWorld();
  const frustum=new N.Frustum().setFromProjectionMatrix(new N.Matrix4().multiplyMatrices(this.mainCamera.projectionMatrix,this.mainCamera.matrixWorldInverse),this.mainCamera.coordinateSystem,this.mainCamera.reversedDepth);
  const cameraPosition=new N.Vector3().setFromMatrixPosition(this.mainCamera.matrixWorld);
  for(const e of this.entries.values()) {
   this._status(e);
   if(e.preparing||e.state!=='live'||!e.authorizedView||!e.candidate||!e.source||!e.destination)continue;
   if(this.background&&!this.background.isReady()){e.state='unavailable';e.hasImage=false;this._status(e);continue;}
   const normal=new N.Vector3(Math.sin(e.source.yaw||0),0,Math.cos(e.source.yaw||0));
   if(normal.dot(cameraPosition.clone().sub(new N.Vector3(...e.source.position)))<=0)continue;
   const sphere=new N.Sphere(new N.Vector3(...e.source.position),Math.hypot(e.source.width||2,e.source.height||3)/2);
   if(!frustum.intersectsSphere(sphere))continue;
   e.viewTime=time;const size=portalTargetSize(width,height,this.maxLongEdge);e.target.setSize(size.width,size.height);
   const cam=e.camera;
   cam.matrixAutoUpdate=false;
   cam.matrix.multiplyMatrices(portalMappingMatrix(e.source,e.destination),this.mainCamera.matrixWorld);
   cam.matrix.decompose(cam.position,cam.quaternion,cam.scale);
   cam.matrixWorldNeedsUpdate=true;
   cam.projectionMatrix.copy(this.mainCamera.projectionMatrix);
   cam.near=this.mainCamera.near;cam.far=this.mainCamera.far;cam.reversedDepth=this.mainCamera.reversedDepth;
   setFrameCamera(cam,size.width,size.height,{block:e.block,
    // Match the main jitter in NDC despite the lower target resolution.
    jitterX:FrameUniforms.fields.jitter.value.x*size.width/2,
    jitterY:FrameUniforms.fields.jitter.value.y*size.height/2});
   e.block.fields.portalClipPlane.value=portalDestinationPlane(e.destination);
   e.candidate.nativeIsland?.bindView(cam,e.viewWater);
   e.candidate.root.userData.updateAmbientBehaviour?.(time);
   e.candidate.root.traverse(n=>{n.userData.updateNeon?.(time,14);n.userData.updateTreeLOD?.(time,cam.position);});
   const horizon=FrameUniforms.fields.horizonColor.value;
   if(e.viewRenderer){
    e.viewRenderer.setSize(size.width,size.height);
    e.viewRenderer.clearColor=[horizon.r??horizon.x,horizon.g??horizon.y,horizon.b??horizon.z,1];
    // View-dependent animation and LOD above are settled before sharing transforms
    // across opaque, refraction and transparent passes. Never reuse across views.
    this.meshRenderer.withSceneTransforms(e.scene,()=>e.viewRenderer.render({frameBlock:e.block,filter:o=>!o.userData.portalAperture&&!o.material?.userData.portalAperture,defines:{PORTAL_CLIP:1,PORTAL_VIEW:1}}));
    // LOD storage and material buffers are mutable across views. Submit before rebinding.
    GPU.submit();
   }else this.meshRenderer.render(e.scene,{label:'portal:'+e.id,kind:'color',camera:cam,frameBlock:e.block,
    colorViews:[e.target.texture.view()],colorFormats:e.target.formats,clearColors:[[horizon.r??horizon.x,horizon.g??horizon.y,horizon.b??horizon.z,1]],
    depthView:e.target.depthTexture.view(),depthFormat:DEPTH_FORMAT,clearDepth:cam.reversedDepth===false?1:0,
    betweenLists:this.background?(rp=>this.background.draw(rp,e.block,cam)):undefined,
    // Hard recursion depth 1: no portal aperture can appear in any destination view.
    filter:o=>!o.userData.portalAperture&&!o.material?.userData.portalAperture,defines:{PORTAL_CLIP:1}});
   e.hasImage=true;this._status(e,true);
  }
 }
 async _prepareView(e){
  setFrameCamera(e.camera,1,1,{block:e.block});
  const mr=this.meshRenderer,previous=mr.precompiling;
  mr.precompiling=true;
  try{e.candidate.nativeIsland.bindView(e.camera,e.viewWater);e.viewRenderer.render({prepare:true,frameBlock:e.block,cull:false,defines:{PORTAL_CLIP:1,PORTAL_VIEW:1},filter:o=>!o.userData.portalAperture&&!o.material?.userData.portalAperture});}
  finally{mr.precompiling=previous;}
  GPU.submit();await GPU.pipelinesReady();await e.viewBackground?.readyPromise;
  const failed=[...mr.pipelines.values()].some(p=>p.handle.failed);
  if(failed)throw Error('Portal native pipeline failed');
 }
 _releaseCandidate(e){if(e.candidate){
  const renderer=e.viewRenderer,water=e.viewWater,background=e.viewBackground;
  if(renderer){const release=()=>{water?.dispose();background?.dispose();renderer.dispose();};if(GPU.encoder)GPU.onSubmit(null,release);else release();e.viewRenderer=e.viewWater=e.viewBackground=null;}
if(e.candidate.root.parent===e.scene)e.candidate.root.removeFromParent();if(e.ownsCandidate)disposeRepositoryScene(e.candidate);e.candidate=null;}}
 remove(id){const e=this.entries.get(id);if(!e)return;e.aperture.removeFromParent();this._releaseCandidate(e);const release=()=>{e.aperture.geometry.dispose();e.material.dispose();e.material.uniformBlock.buffer?.destroy();e.target.texture.destroy();e.target.depthTexture.destroy();e.block.buffer?.destroy();};if(GPU.encoder)GPU.onSubmit(null,release);else release();this.entries.delete(id);}
 clear(){for(const id of [...this.entries.keys()])this.remove(id);}
 dispose(){this.clear();this.active=null;}
}
