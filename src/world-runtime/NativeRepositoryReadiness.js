import {GPU} from '../engine/gpu/GPU.js';
import {RenderTarget} from '../engine/gpu/Texture.js';
import {SCENE_FORMATS,DEPTH_FORMAT} from '../engine/render/SceneRenderer.js';
import {createAvatarTransportPresentation,createAvatarTransportMaterialAdapter} from './AvatarTransportPresentation.js';
import {PlayerAvatar} from '../player/PlayerAvatar.js';
/** Reuses App.precompile: collect every mesh, request async pipelines, no draws.
 * Flags are restored synchronously before yielding to the running source frame.
 */
export async function prepareNativeRepositoryResources({meshRenderer,camera,root,gpu=GPU,targetFactory=(formats)=>new RenderTarget(1,1,{colors:formats,depth:DEPTH_FORMAT,label:'repository-prepare'})}={}){
 if(!root||!meshRenderer)throw Error('Native resource preparation dependencies required');
 const targets=[],materialIds=new Set(),previous=meshRenderer.precompiling;
 root.traverse?.(node=>{for(const material of Array.isArray(node.material)?node.material:[node.material])if(material)materialIds.add(String(material.id));});
 try{
  const main=targetFactory(SCENE_FORMATS),portal=targetFactory(['rgba16float']);targets.push(main,portal);
  const shared={camera,cull:false,depthFormat:DEPTH_FORMAT,depthCompare:'greater-equal',clearDepth:0};
  meshRenderer.precompiling=true;
  try{
   const colors=target=>({colorViews:target.textures.map(t=>t.view()),colorFormats:target.formats,depthView:target.depthTexture.view(),clearColors:target.formats.map(()=>[0,0,0,0])});
   meshRenderer.render(root,{...shared,...colors(main),kind:'main',label:'repository prepare main'});
   meshRenderer.render(root,{...shared,...colors(main),kind:'main',late:true,label:'repository prepare late'});
   meshRenderer.render(root,{...shared,kind:'depth',label:'repository prepare shadows',depthView:main.depthTexture.view(),clearDepth:1,depthCompare:'less-equal',depthBias:2,depthBiasSlopeScale:1.5});
   meshRenderer.render(root,{...shared,...colors(portal),kind:'color',label:'repository prepare portal',defines:{PORTAL_CLIP:1},filter:o=>!o.userData.portalAperture&&!o.material?.userData.portalAperture});
  }finally{meshRenderer.precompiling=previous;}
  const handles=[...(meshRenderer.pipelines??new Map())].filter(([key])=>materialIds.has(String(key).split('.')[0])).map(([,p])=>p.handle);
  gpu.submit();
  await gpu.pipelinesReady();
  if(handles.some(h=>h.failed||!h.pipeline))throw Error('Required native repository pipeline failed to compile');
  await gpu.queue.onSubmittedWorkDone();
  return {ready:true,pipelines:handles.length};
 }finally{
  meshRenderer.precompiling=previous;
  for(const target of targets){for(const texture of target.textures??[])texture.destroy();target.depthTexture?.destroy();}
 }
}
/** Installed original avatars become visible only after exact native variants compile. */
export class ReadiedRepositoryAvatar extends PlayerAvatar{
 constructor(scene,boat,{prepareResources,...options}={}){super(scene,boat,options);this.prepareResources=prepareResources;this.transportPresentation=createAvatarTransportPresentation({root:this.group,materialAdapter:createAvatarTransportMaterialAdapter(()=>this.scanned?.materials)});}
 update(...args){
  super.update(...args);this.transportPresentation?.update();
  // Original stock characters are required. The inherited primitive stand-in
  // must never draw while a character or its exact native pipelines are pending.
  if(!this.scanned||this.scanned.group.visible===false)this.group.visible=false;
 }
 observeVerifiedTransfer(record,worldId){return this.transportPresentation?.observeVerifiedTransfer(record,worldId)??false;}
 dispose(){this.transportPresentation?.dispose();super.dispose();}
 async loadCharacter(){
  const work=super.loadCharacter(),version=this.loadVersion;await work;
  if(this.disposed||version!==this.loadVersion)return;
  const model=this.scanned;if(!model)return;
  model.group.visible=false;
  try{await this.prepareResources?.(this.group);if(this.scanned===model&&!this.disposed)model.group.visible=true;}
  catch(error){model.group.visible=false;throw error;}
 }
}
