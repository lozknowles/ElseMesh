import {applyPortalObliqueProjection} from './SplatPortalProjection.js';
import {T,portalMappingElements} from './vendor/world-engine-contract.js';
import {disposeWebGLRepositoryScene} from './WebGLRepositoryScene.js';
export const PORTAL_VIEW_LIMIT=2,PORTAL_VIEW_LONG_EDGE=512;
export const PORTAL_VIEW_STATES=Object.freeze({unavailable:0,loading:1,restricted:2,live:3,cached:4});
export function portalTargetSize(width,height,maxLongEdge=512){const s=Math.min(1,Math.min(1024,Math.max(256,maxLongEdge))/Math.max(1,width,height));return {width:Math.max(1,Math.floor(width*s)),height:Math.max(1,Math.floor(height*s))};}
export const portalMappingMatrix=(s,d)=>new T.Matrix4().fromArray(portalMappingElements(s,d));
export function portalDestinationPlane(d,margin=.015){const n=new T.Vector3(Math.sin(d.yaw||0),0,Math.cos(d.yaw||0));return new T.Plane(n,-n.dot(new T.Vector3(...d.position))-margin);}
const vertexShader=`varying vec2 apertureUv;void main(){apertureUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader=`uniform sampler2D portalView;uniform vec2 framebufferSize;uniform float portalState;uniform float portalTime;varying vec2 apertureUv;
void main(){
 float stripe=step(.5,fract((apertureUv.x+apertureUv.y)*12.+portalTime*.25));
 vec3 color=vec3(.055,.065,.075);
 if(portalState>.5&&portalState<1.5)color=mix(vec3(.04,.09,.16),vec3(.08,.22,.32),stripe);
 if(portalState>1.5&&portalState<2.5)color=mix(vec3(.14,.025,.025),vec3(.33,.06,.04),stripe);
 if(portalState>2.5){vec3 image=texture2D(portalView,gl_FragCoord.xy/framebufferSize).rgb;color=image;if(portalState>3.5)color=mix(image*.4,vec3(.18,.12,.025),.35+stripe*.2);}
 if(!gl_FrontFacing)color=vec3(.045,.045,.05);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
/** Independent material; callers own and dispose it, never share uniforms. */
export function createWebGLPortalMaterial(target){return new T.ShaderMaterial({vertexShader,fragmentShader,side:T.DoubleSide,uniforms:{portalView:{value:target.texture},framebufferSize:{value:new T.Vector2(1,1)},portalState:{value:0},portalTime:{value:0}}});}
/** All renderer changes are synchronous, including failure restoration. */
export function withWebGLPortalRenderState(renderer,draw){
 const r=renderer,state={toneMapping:r.toneMapping,target:r.getRenderTarget(),cube:r.getActiveCubeFace?.()??0,mip:r.getActiveMipmapLevel?.()??0,viewport:r.getViewport(new T.Vector4()),scissor:r.getScissor(new T.Vector4()),scissorTest:r.getScissorTest(),clip:r.clippingPlanes,localClip:r.localClippingEnabled,autoClear:r.autoClear,clearColor:r.getClearColor(new T.Color()).clone(),clearAlpha:r.getClearAlpha(),xr:r.xr?.enabled};
 try{return draw();}
 finally{r.toneMapping=state.toneMapping;r.clippingPlanes=state.clip;r.localClippingEnabled=state.localClip;r.autoClear=state.autoClear;if(r.xr)r.xr.enabled=state.xr;r.setRenderTarget(state.target,state.cube,state.mip);r.setViewport(state.viewport);r.setScissor(state.scissor);r.setScissorTest(state.scissorTest);r.setClearColor(state.clearColor,state.clearAlpha);}
}
export function webGLPortalInView(sourceCamera,source){
 sourceCamera.updateMatrixWorld();const position=new T.Vector3().setFromMatrixPosition(sourceCamera.matrixWorld),normal=new T.Vector3(Math.sin(source.yaw||0),0,Math.cos(source.yaw||0));
 if(normal.dot(position.sub(new T.Vector3(...source.position)))<=0)return false;
 const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(sourceCamera.projectionMatrix,sourceCamera.matrixWorldInverse));return frustum.intersectsSphere(new T.Sphere(new T.Vector3(...source.position),Math.hypot(source.width||2,source.height||3)/2));
}
/** Draw an already authorized resident scene without parenting or owning it. */
export function drawWebGLPortal({renderer:r,sourceCamera,camera:cam,source,destination,scene,candidate,target,width,height,time=0,ordinaryToneMapping}){
 sourceCamera.updateMatrixWorld();cam.matrixAutoUpdate=false;cam.matrix.multiplyMatrices(portalMappingMatrix(source,destination),sourceCamera.matrixWorld);cam.matrix.decompose(cam.position,cam.quaternion,cam.scale);cam.matrixWorldNeedsUpdate=true;cam.projectionMatrix.copy(sourceCamera.projectionMatrix);cam.projectionMatrixInverse.copy(sourceCamera.projectionMatrixInverse);cam.near=sourceCamera.near;cam.far=sourceCamera.far;cam.updateMatrixWorld(true);
 const hidden=[];scene.traverse(node=>{if(node.userData.portalAperture||node.material?.userData?.portalAperture){hidden.push([node,node.visible]);node.visible=false;}});
 try{return withWebGLPortalRenderState(r,()=>{
  candidate.nativeIsland?.bindView(cam);candidate.root.userData.updateWebGL?.(time);candidate.root.traverse(node=>{node.userData.updateNeon?.(time,candidate.descriptor?.project.environment?.timeOfDay??14);node.userData.updateTreeLOD?.(time,cam.position);});
  r.clippingPlanes=[portalDestinationPlane(destination)];r.localClippingEnabled=true;r.autoClear=true;if(r.xr)r.xr.enabled=false;r.setRenderTarget(target);
  const splat=candidate.splatScene;if(splat){applyPortalObliqueProjection(cam,destination);r.toneMapping=splat.expectedToneMapping;}else r.toneMapping=ordinaryToneMapping;
  const ratio=r.getPixelRatio?.()??1;r.setViewport(0,0,width/ratio,height/ratio);r.setScissorTest(false);r.render(scene,cam);return true;
 });}finally{for(const[node,visible]of hidden)node.visible=visible;}
}
/** Detached independent authorized previews, hard recursion depth one. */
export class WebGLPortalViews{
 constructor({renderer,engine,mainCamera,configureScene,maxLongEdge=512,ordinaryToneMapping}){this.forkOptions={renderer,engine,mainCamera,configureScene,maxLongEdge,ordinaryToneMapping:ordinaryToneMapping??(renderer??engine?.renderer)?.toneMapping};this.maxLongEdge=maxLongEdge;this.renderer=renderer??engine?.renderer;this.mainCamera=mainCamera??engine?.camera;this.configureScene=configureScene;this.entries=new Map();this.active=null;this.ordinaryToneMapping=this.forkOptions.ordinaryToneMapping;}
 fork(){return new WebGLPortalViews(this.forkOptions);}
 park(){const entries=this.entries;this.entries=new Map();this.active=null;return entries;}
 restore(active,entries){
  if(this.entries.size)this.clear();this.active=active;this.entries=entries??new Map();
  // Graphics may remain resident, but VIEW grants are scoped to the new membership.
  // Drop destination references before prune can leave a stale/evicted candidate here.
  for(const e of this.entries.values()){this._releaseCandidate(e);e.authorizedView=false;e.hasImage=false;e.state=e.source?.enabled===false?'unavailable':'loading';this._status(e);}
 }
 disposeEntries(entries){const current=this.entries;this.entries=entries;this.clear();this.entries=current;}
 setActive(a){if(this.active!==a){this.clear();this.active=a;}}
 setDestination(id,o={}){
  if(o.candidate){if(o.authorizedView!==true)throw Error('Portal destination requires explicit authorizedView');if(o.candidate!==this.entries.get(id)?.candidate&&o.candidate.root.parent)throw Error('Portal preview root must be independently built and detached');}
  let e=this.entries.get(id);
  if(!e){
   if(this.entries.size>=2)this.remove(this.entries.keys().next().value);
   const target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,type:T.HalfFloatType});
   const material=createWebGLPortalMaterial(target);
   const aperture=new T.Mesh(new T.PlaneGeometry(1,1),material);aperture.userData.portalAperture=true;aperture.userData.portalId=id;
   e={id,target,material,aperture,scene:new T.Scene(),camera:new T.PerspectiveCamera(),state:'unavailable',authorizedView:false,hasImage:false};this.entries.set(id,e);
  }
  if(o.candidate&&o.candidate!==e.candidate){this._releaseCandidate(e);e.scene.clear();e.candidate=o.candidate;e.ownsCandidate=o.ownsCandidate!==false;e.scene.add(e.candidate.root);e.hasImage=false;this.configureScene?.(e.scene,e.candidate);}
  if(o.source)e.source=o.source;if(o.destination)e.destination=o.destination;if('authorizedView'in o)e.authorizedView=o.authorizedView===true;if(o.state)e.state=o.state;
  if(!e.authorizedView&&e.candidate){this._releaseCandidate(e);e.hasImage=false;}
  if(e.source){e.aperture.position.fromArray(e.source.position);e.aperture.rotation.set(0,e.source.yaw||0,0);e.aperture.scale.set(e.source.width||2,e.source.height||3,1);}
  this._status(e);return e.aperture;
 }
 getAperture(id){return this.entries.get(id)?.aperture??null;}
 getScene(id){return this.entries.get(id)?.scene??null;}
 setState(id,state){const e=this.entries.get(id);if(e){e.state=state;this._status(e);}}
 _status(e,drawn=false){let s=!e.authorizedView&&['live','cached'].includes(e.state)?'restricted':e.state;if((s==='cached'&&!e.hasImage)||(s==='live'&&!drawn))s=e.hasImage?'cached':'loading';e.material.uniforms.portalState.value=PORTAL_VIEW_STATES[s]??0;e.aperture.userData.portalViewState=s;}
 render({width=1,height=1,time=0}={}){
  const r=this.renderer,m=this.mainCamera;m.updateMatrixWorld();
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(m.projectionMatrix,m.matrixWorldInverse)),position=new T.Vector3().setFromMatrixPosition(m.matrixWorld);
  for(const e of this.entries.values()){
   this._status(e);e.material.uniforms.framebufferSize.value.set(width,height);e.material.uniforms.portalTime.value=time;
   if(e.state!=='live'||!e.authorizedView||!e.candidate||!e.source||!e.destination)continue;
   const normal=new T.Vector3(Math.sin(e.source.yaw||0),0,Math.cos(e.source.yaw||0));
   if(normal.dot(position.clone().sub(new T.Vector3(...e.source.position)))<=0)continue;
   if(!frustum.intersectsSphere(new T.Sphere(new T.Vector3(...e.source.position),Math.hypot(e.source.width||2,e.source.height||3)/2)))continue;
   const size=portalTargetSize(width,height,this.maxLongEdge);e.target.setSize(size.width,size.height);
   const toneMapped=!e.candidate.splatScene;if(e.material.toneMapped!==toneMapped){e.material.toneMapped=toneMapped;e.material.needsUpdate=true;}
   try{drawWebGLPortal({renderer:r,sourceCamera:m,camera:e.camera,source:e.source,destination:e.destination,scene:e.scene,candidate:e.candidate,target:e.target,width:size.width,height:size.height,time,ordinaryToneMapping:this.ordinaryToneMapping});e.hasImage=true;this._status(e,true);}
   catch(error){if(!e.candidate.splatScene)throw error;e.error=String(error?.message??error);e.state='unavailable';e.hasImage=false;this._status(e);}
  }
 }
 _releaseCandidate(e){if(e.candidate){if(e.candidate.root.parent===e.scene)e.candidate.root.removeFromParent();if(e.ownsCandidate)disposeWebGLRepositoryScene(e.candidate);e.candidate=null;}}
 remove(id){const e=this.entries.get(id);if(!e)return;e.aperture.removeFromParent();this._releaseCandidate(e);e.aperture.geometry.dispose();e.material.dispose();e.target.dispose();this.entries.delete(id);}
 clear(){for(const id of [...this.entries.keys()])this.remove(id);}
 dispose(){this.clear();this.active=null;}
}
