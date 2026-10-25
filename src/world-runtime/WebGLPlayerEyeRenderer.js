import {T} from './vendor/world-engine-contract.js';
import {createWebGLPortalMaterial,drawWebGLPortal,portalTargetSize,webGLPortalInView,withWebGLPortalRenderState} from './WebGLPortalViews.js';

/** View-only passes borrowing authorized resident scenes, never their render targets.
 * Normal WebGLPortalViews rendering must be skipped while this pass is active.
 */
export class WebGLPlayerEyeRenderer {
 constructor({renderer,resolveScene,resolveTarget,ordinaryToneMapping=renderer?.toneMapping,maxLongEdge=512}={}){
  if(!renderer||typeof resolveScene!=='function'||!Number.isFinite(maxLongEdge)||maxLongEdge<1||maxLongEdge>512)throw Error('Invalid player-eye renderer dependencies.');
  Object.assign(this,{renderer,resolveScene,resolveTarget,ordinaryToneMapping,maxLongEdge});this.slots=[];this.disposed=false;this.lastError=null;
 }
 resolve(worldId){try{const scene=this.resolveScene(worldId);return scene?.authorized===true&&scene.scene&&scene.candidate?.root&&scene.candidate.disposed!==true&&scene.project&&scene.descriptor?.worldId===worldId?scene:null;}catch{return null;}}
 source(frame){
  const worldId=frame?.target?.worldId,source=this.resolve(worldId),fence=frame?.target?.fence;
  if(!source||!fence||source.scene!==frame.scene||source.candidate!==frame.candidate)return null;
  const target=this.resolveTarget?.(frame.target.key);if(!target||target.validated!==true||target.fresh!==true||target.ready!==true||target.scene!==source.scene||target.candidate!==source.candidate||target.fence?.consent!==fence.consent||JSON.stringify(target.fence)!==JSON.stringify(fence))return null;
  const descriptor=source.descriptor,authority=descriptor.published?.descriptor?.authority?.nodeId;
  if(descriptor.worldId!==worldId||fence.world!==worldId||descriptor.contentDigest!==fence.content||descriptor.epoch!==fence.epoch||authority!==fence.authority)return null;
  if(source.fence&&['world','authority','epoch','content'].some(key=>source.fence[key]!==fence[key]))return null;
  return source;
 }
 slot(index){
  while(this.slots.length<=index){const target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,type:T.HalfFloatType});this.slots.push({target,material:createWebGLPortalMaterial(target),camera:new T.PerspectiveCamera()});}
  return this.slots[index];
 }
 render(frame,{width=1,height=1,time=0}={}){
  if(this.disposed||!frame?.camera||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return false;
  let source=this.source(frame);if(!source)return false;
  const r=this.renderer,swaps=[],hidden=[],sourceApertures=[];this.lastError=null;
  try{return withWebGLPortalRenderState(r,()=>{
   // Prepare owned images while canonical source materials remain installed.
   // Readiness checks must inspect the original resident graph, never our pass.
   // Unbudgeted apertures are hidden; all visible ones swap only for main draw.
   source.scene.traverse(node=>{if(node.userData.portalAperture||node.material?.userData?.portalAperture)sourceApertures.push(node);});
   const entries=source.viewEntries instanceof Map?source.viewEntries:new Map();let index=0;
   for(const aperture of sourceApertures){
    const entry=[...entries.values()].find(e=>e.aperture===aperture);
    if(!entry||index>=2){hidden.push([aperture,aperture.visible]);aperture.visible=false;continue;}
    const slot=this.slot(index++);slot.material.uniforms.portalState.value=0;slot.material.uniforms.portalTime.value=time;slot.material.uniforms.framebufferSize.value.set(width,height);swaps.push([aperture,aperture.material,slot.material]);
    const route=source.project.portals?.find(p=>p.id===entry.id),worldId=route?.destination?.worldId;
    if(!route?.enabled||route.view?.enabled===false||!worldId||!webGLPortalInView(frame.camera,route))continue;
    if(!this.source(frame))return false;
    const destination=this.resolve(worldId),exit=destination?.project.portals?.find(p=>p.id===route.destination.portalId);
    if(!destination||!exit?.enabled)continue;
    const binding=JSON.stringify([destination.descriptor.worldId,destination.descriptor.contentDigest,destination.descriptor.epoch,destination.descriptor.published?.descriptor?.authority?.nodeId]);
    const size=portalTargetSize(width,height,this.maxLongEdge);slot.target.setSize(size.width,size.height);
    try{
     drawWebGLPortal({renderer:r,sourceCamera:frame.camera,camera:slot.camera,source:route,destination:exit,scene:destination.scene,candidate:destination.candidate,target:slot.target,width:size.width,height:size.height,time,ordinaryToneMapping:this.ordinaryToneMapping});
     // A revoked grant during synchronous rendering must not expose its image.
     const still=this.resolve(worldId);if(still?.scene===destination.scene&&still.candidate===destination.candidate&&JSON.stringify([still.descriptor.worldId,still.descriptor.contentDigest,still.descriptor.epoch,still.descriptor.published?.descriptor?.authority?.nodeId])===binding){slot.material.uniforms.portalState.value=3;const toneMapped=!destination.candidate.splatScene;if(slot.material.toneMapped!==toneMapped){slot.material.toneMapped=toneMapped;slot.material.needsUpdate=true;}}
    }catch(error){this.lastError=String(error?.message??error);slot.material.uniforms.portalState.value=0;}
   }
   source=this.source(frame);if(!source)return false;
   const avatar=frame.avatar?.group;if(!avatar)return false;hidden.push([avatar,avatar.visible]);avatar.visible=false;
   source.candidate.nativeIsland?.bindView(frame.camera);source.candidate.root.userData.updateWebGL?.(time);source.candidate.root.traverse(node=>{node.userData.updateNeon?.(time,source.project.environment?.timeOfDay??14);node.userData.updateTreeLOD?.(time,frame.camera.position);});
   if(!this.source(frame))return false;
   r.clippingPlanes=[];r.localClippingEnabled=false;r.autoClear=true;if(r.xr)r.xr.enabled=false;r.toneMapping=source.candidate.splatScene?.expectedToneMapping??this.ordinaryToneMapping;
   r.setRenderTarget(null);const ratio=r.getPixelRatio?.()??1;r.setViewport(0,0,width/ratio,height/ratio);r.setScissorTest(false);
   for(const[node,,ownedMaterial]of swaps)node.material=ownedMaterial;
   try{this.hasSharedPixels=true;r.render(source.scene,frame.camera);}
   finally{for(const[node,material]of swaps)node.material=material;}
   // Restore canonical materials before the full resident readiness recheck.
   return !!this.source(frame);
  });}
  catch(error){this.lastError=String(error?.message??error);throw error;}
  finally{for(const[node,material]of swaps)node.material=material;for(const[node,visible]of hidden)node.visible=visible;}
 }
 diagnostics(){return {targets:this.slots.length,materials:this.slots.length,cameras:this.slots.length,disposed:this.disposed,lastError:this.lastError};}
 reset(){if(this.hasSharedPixels){this.hasSharedPixels=false;try{withWebGLPortalRenderState(this.renderer,()=>{this.renderer.setRenderTarget(null);this.renderer.setScissorTest(false);this.renderer.clear?.(true,true,true);});}catch{}}for(const slot of this.slots){slot.material.dispose();slot.target.dispose();}this.slots=[];this.lastError=null;}
 dispose(){if(this.disposed)return;this.reset();this.disposed=true;}
}
