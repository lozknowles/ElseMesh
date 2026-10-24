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
/** Detached independent authorized previews, hard recursion depth one. */
export class WebGLPortalViews{
 constructor({renderer,engine,mainCamera,configureScene,maxLongEdge=512}){this.forkOptions={renderer,engine,mainCamera,configureScene,maxLongEdge};this.maxLongEdge=maxLongEdge;this.renderer=renderer??engine?.renderer;this.mainCamera=mainCamera??engine?.camera;this.configureScene=configureScene;this.entries=new Map();this.active=null;}
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
   const material=new T.ShaderMaterial({vertexShader,fragmentShader,side:T.DoubleSide,uniforms:{portalView:{value:target.texture},framebufferSize:{value:new T.Vector2(1,1)},portalState:{value:0},portalTime:{value:0}}});
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
   const cam=e.camera;cam.matrixAutoUpdate=false;cam.matrix.multiplyMatrices(portalMappingMatrix(e.source,e.destination),m.matrixWorld);cam.matrix.decompose(cam.position,cam.quaternion,cam.scale);cam.matrixWorldNeedsUpdate=true;cam.projectionMatrix.copy(m.projectionMatrix);cam.projectionMatrixInverse.copy(m.projectionMatrixInverse);cam.near=m.near;cam.far=m.far;cam.updateMatrixWorld(true);
   e.candidate.nativeIsland?.bindView(cam);e.candidate.root.userData.updateWebGL?.(time);e.candidate.root.traverse(n=>{n.userData.updateNeon?.(time,e.candidate.descriptor?.project.environment?.timeOfDay??14);n.userData.updateTreeLOD?.(time,cam.position);});
   const state={target:r.getRenderTarget(),cube:r.getActiveCubeFace?.()??0,mip:r.getActiveMipmapLevel?.()??0,viewport:r.getViewport(new T.Vector4()),scissor:r.getScissor(new T.Vector4()),scissorTest:r.getScissorTest(),clip:r.clippingPlanes,localClip:r.localClippingEnabled,autoClear:r.autoClear,clearColor:r.getClearColor(new T.Color()).clone(),clearAlpha:r.getClearAlpha()};
   const hidden=[];e.scene.traverse(n=>{if(n.userData.portalAperture||n.material?.userData?.portalAperture){hidden.push([n,n.visible]);n.visible=false;}});
   try{r.clippingPlanes=[portalDestinationPlane(e.destination)];r.localClippingEnabled=true;r.autoClear=true;r.setRenderTarget(e.target);r.setViewport(0,0,size.width,size.height);r.setScissorTest(false);r.render(e.scene,cam);e.hasImage=true;this._status(e,true);}
   finally{for(const[n,v]of hidden)n.visible=v;r.clippingPlanes=state.clip;r.localClippingEnabled=state.localClip;r.autoClear=state.autoClear;r.setRenderTarget(state.target,state.cube,state.mip);r.setViewport(state.viewport);r.setScissor(state.scissor);r.setScissorTest(state.scissorTest);r.setClearColor(state.clearColor,state.clearAlpha);}
  }
 }
 _releaseCandidate(e){if(e.candidate){if(e.candidate.root.parent===e.scene)e.candidate.root.removeFromParent();if(e.ownsCandidate)disposeWebGLRepositoryScene(e.candidate);e.candidate=null;}}
 remove(id){const e=this.entries.get(id);if(!e)return;e.aperture.removeFromParent();this._releaseCandidate(e);e.aperture.geometry.dispose();e.material.dispose();e.target.dispose();this.entries.delete(id);}
 clear(){for(const id of [...this.entries.keys()])this.remove(id);}
 dispose(){this.clear();this.active=null;}
}
