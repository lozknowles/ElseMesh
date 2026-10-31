import {registerPinnedSparkReadiness} from './SplatReadinessContract.js';
import {T,validateSplatScene} from './vendor/world-engine-contract.js';
import {loadVerifiedSog,loadVerifiedPhysicsBytes} from './SplatSceneSource.js';
import {SUNSET_SPLAT_PROFILE,assertQualifiedSplatProfile} from './SplatSceneProfiles.js';

export const PINNED_SUNSET_SOG=SUNSET_SPLAT_PROFILE.asset;
export const PINNED_SUNSET_TRANSFORM=SUNSET_SPLAT_PROFILE.transform;
export const PINNED_SUNSET_REVIEW_SHA256=SUNSET_SPLAT_PROFILE.reviewSha256;
/** Generic authored descriptors do not grant this experimental renderer a decode capability. */
export function assertSupportedSplatScene(project){
 const errors=validateSplatScene(project?.splatScene);if(errors.length||!project?.splatScene)throw Error(errors[0]??'World has no splat scene.');
 assertQualifiedSplatProfile(project);
 return structuredClone(project.splatScene);
}
export function applySplatSceneTransform(mesh,transform){mesh.position.fromArray(transform.position);mesh.rotation.fromArray(transform.rotation);mesh.scale.setScalar(transform.scale);mesh.updateMatrixWorld(true);return mesh;}
function restoreParent(root,parent,index){root.removeFromParent();if(parent){parent.add(root);const current=parent.children.indexOf(root);parent.children.splice(current,1);parent.children.splice(Math.min(index,parent.children.length),0,root);}}
/** Renderer state is owned only for a synchronous GPU operation. */
function withSplatRendererState(renderer,operation){
 const previous={target:renderer.getRenderTarget(),cubeFace:renderer.getActiveCubeFace?.(),mipmap:renderer.getActiveMipmapLevel?.(),viewport:renderer.getViewport(new T.Vector4()).clone(),scissor:renderer.getScissor(new T.Vector4()).clone(),scissorTest:renderer.getScissorTest(),autoClear:renderer.autoClear,clippingPlanes:renderer.clippingPlanes,localClippingEnabled:renderer.localClippingEnabled,xr:renderer.xr?.enabled,toneMapping:renderer.toneMapping,outputColorSpace:renderer.outputColorSpace};
 try{return operation();}finally{renderer.setRenderTarget(previous.target,previous.cubeFace,previous.mipmap);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);renderer.setScissorTest(previous.scissorTest);renderer.autoClear=previous.autoClear;renderer.clippingPlanes=previous.clippingPlanes;renderer.localClippingEnabled=previous.localClippingEnabled;if(renderer.xr)renderer.xr.enabled=previous.xr;renderer.toneMapping=previous.toneMapping;renderer.outputColorSpace=previous.outputColorSpace;}
}
/** One initial allocation of the already-existing installed pool, before sealing.
 * No mapping, logical splat count, pool references or readiness record is changed.
 */
export function preparePinnedAccumulatorTargets({spark,renderer,SplatAccumulator}){
 const pool=[...new Set([spark?.display,spark?.current,...(spark?.accumulators??[])])],count=PINNED_SUNSET_SOG.count,capacity=720896;
 if(typeof SplatAccumulator!=='function'||pool.length!==3||!renderer?.initRenderTarget||pool.some(accumulator=>!(accumulator instanceof SplatAccumulator)||accumulator.extSplats!==false||accumulator.covSplats!==false||accumulator.ensureGenerate!==SplatAccumulator.prototype.ensureGenerate))throw Error('Pinned Spark initial preparation requires exactly three installed packed accumulators.');
 const order={display:spark.display,current:spark.current,array:spark.accumulators,entries:[...spark.accumulators]},observed=pool.map(accumulator=>({accumulator,target:accumulator.target,attachments:accumulator.target?[...accumulator.target.textures]:null,mapping:accumulator.mapping,entries:[...accumulator.mapping],version:accumulator.version,mappingVersion:accumulator.mappingVersion,numSplats:accumulator.numSplats}));
 for(const original of observed){const accumulator=original.accumulator;
  if(original.target&&(accumulator.maxSplats!==capacity||original.target.width!==2048||original.target.height!==352||original.target.depth!==1))throw Error('Pinned Spark initial preparation cannot replace an existing active target.');
  accumulator.ensureGenerate({maxSplats:count});const target=accumulator.target;
  if(!target?.isWebGLArrayRenderTarget||target.width!==2048||target.height!==352||target.depth!==1||target.textures.length!==2||accumulator.maxSplats!==capacity)throw Error('Pinned Spark initial target layout differs from its bounded capacity.');
  if(original.target&&(target!==original.target||target.textures.length!==original.attachments.length||target.textures.some((value,index)=>value!==original.attachments[index])))throw Error('Pinned Spark initial preparation replaced existing target resources.');
  if(accumulator.mapping!==original.mapping||accumulator.mapping.length!==original.entries.length||accumulator.mapping.some((value,index)=>value!==original.entries[index])||accumulator.version!==original.version||accumulator.mappingVersion!==original.mappingVersion||accumulator.numSplats!==original.numSplats)throw Error('Pinned Spark initial preparation changed logical accumulator state.');
 }
 if(spark.display!==order.display||spark.current!==order.current||spark.accumulators!==order.array||spark.accumulators.length!==order.entries.length||spark.accumulators.some((value,index)=>value!==order.entries[index]))throw Error('Pinned Spark initial preparation changed pool ordering.');
 withSplatRendererState(renderer,()=>{for(const accumulator of pool)renderer.initRenderTarget(accumulator.target);});
 return {poolSize:3,pointCount:count,capacity,targets:observed.map(value=>({textureId:value.accumulator.target.texture.id,width:2048,height:352,depth:1,existing:!!value.target})),gpuStorageInitialized:true};
}
/** Real detached-scene Spark preparation. Fake renderers may test restoration, never GPU qualification. */
export async function warmupSplatResources({root,spark,renderer,camera,isDisposed=()=>false}){
 if(!root||!spark||!renderer?.render||!camera?.isCamera)throw Error('Splat warmup requires its renderer, root, Spark renderer and camera.');
 if(isDisposed())throw Error('Splat resources disposed during preparation.');
 const parent=root.parent,index=parent?.children.indexOf(root)??0,staging=new T.Scene(),target=new T.WebGLRenderTarget(160,120),warmCamera=camera.clone();
 camera.getWorldPosition(warmCamera.position);camera.getWorldQuaternion(warmCamera.quaternion);camera.getWorldScale(warmCamera.scale);warmCamera.updateMatrixWorld(true);
 // Renderer state belongs to a synchronous GPU operation, never to the whole
 // async preparation: the live world may render or resize at every await.
 const scopedGPU=operation=>withSplatRendererState(renderer,()=>{
  renderer.autoClear=true;renderer.clippingPlanes=[];renderer.localClippingEnabled=false;if(renderer.xr)renderer.xr.enabled=false;
  renderer.setRenderTarget(target);const ratio=renderer.getPixelRatio?.()??1;renderer.setViewport(0,0,160/ratio,120/ratio);renderer.setScissor(new T.Vector4(0,0,160/ratio,120/ratio));renderer.setScissorTest(false);return operation();
 });
 try{
  staging.add(root);root.updateMatrixWorld(true);
  // Spark's synchronous generation/readback restores its own renderer state
  // before returning its sorting promise (inspected installed Spark 2.4.0).
  // Restore our scope immediately; sorting must not hold the renderer hostage.
  const preparation=scopedGPU(()=>spark.update({scene:staging,camera:warmCamera}));
  await preparation;
  for(let i=0;i<3;i++){
   if(isDisposed())throw Error('Splat resources disposed during preparation.');
   scopedGPU(()=>renderer.render(staging,warmCamera));
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(isDisposed()||!Number.isFinite(spark.activeSplats)||spark.activeSplats<1)throw Error('Splat renderer did not prepare any active Gaussians.');
 }finally{
  try{target.dispose();}finally{restoreParent(root,parent,index);}
 }
}
/** No world activation. read must be the caller's verified bounded world-source capability. */
export async function createSplatSceneAdapter(project,{read,renderer,camera}={}){
 const scene=assertSupportedSplatScene(project);project=structuredClone(project);const profile=assertQualifiedSplatProfile(project);
 if(!renderer?.isWebGLRenderer||!camera?.isCamera)throw Error('Splat scene requires the installed WebGL renderer and camera.');
 const root=new T.Group();root.name='repository-splat-scene';root.userData.splatScene=true;
 const state={status:'loading',disposed:false,warmed:false,numSplats:0};let splat,spark,physics,preparing=null,released=false,readinessContract=null;
 const release=()=>{if(released)return;released=true;readinessContract?.dispose();root.removeFromParent();const errors=[];for(const resource of [spark,splat])try{resource?.dispose();}catch(error){errors.push(String(error?.message??error));}root.clear();if(errors.length)state.disposalErrors=errors;};
 const dispose=()=>{if(state.disposed)return;state.disposed=true;readinessContract?.dispose();state.status='disposed';root.removeFromParent();if(preparing)void preparing.then(release,release);else release();};
 try{
  // Physics admission precedes GPU allocation. Its game-world collision records never receive G again.
  const physicsBytes=await loadVerifiedPhysicsBytes(project,read);const {compileSplatScenePhysics}=await import('./SplatScenePhysics.js');physics=await compileSplatScenePhysics(project,physicsBytes);
  if(!physics?.terrain?.heightAt||!physics.colliders?.resolveCapsule||typeof physics.clearance!=='function')throw Error('Splat physics compiler did not return admitted terrain and colliders.');
  const bytes=await loadVerifiedSog(project,read);
  const {SparkRenderer,SplatMesh,SplatAccumulator}=await import('@sparkjsdev/spark');
  // Both admitted profiles retain the exact legacy packed allocation count.
  splat=new SplatMesh({fileBytes:bytes.slice(),fileName:'qualified-scene.sog',maxSplats:PINNED_SUNSET_SOG.count,lod:false});await splat.initialized;
  if(splat.numSplats!==profile.asset.count||splat.numSplats!==scene.asset.count||splat.numSplats>1_000_000)throw Error('Decoded pinned splat count mismatch.');
  applySplatSceneTransform(splat,scene.transform);root.add(splat);spark=new SparkRenderer({renderer,autoUpdate:true,maxPixelRadius:96});root.add(spark);state.numSplats=splat.numSplats;state.status='decoded-awaiting-warmup';
  const adapter={root,spark,splat,state,terrain:physics.terrain,colliders:physics.colliders,clearance:physics.clearance,physics,
   expectedToneMapping:T.NoToneMapping,
   prepareResources(warmCamera=camera){if(state.disposed)return Promise.reject(Error('Splat scene is disposed.'));if(state.warmed)return Promise.resolve();if(preparing)return preparing;try{state.initialPoolPreparation=preparePinnedAccumulatorTargets({spark,renderer,SplatAccumulator});}catch(error){state.preparationFailure={reason:'initial-pool-preparation',message:error.message};dispose();return Promise.reject(error);}preparing=warmupSplatResources({root,spark,renderer,camera:warmCamera,isDisposed:()=>state.disposed}).then(()=>{if(state.disposed)throw Error('Splat scene disposed during preparation.');state.warmed=true;state.status='ready';try{readinessContract=registerPinnedSparkReadiness(adapter,{asset:scene.asset,project});}catch(error){state.preparationFailure={reason:error.reason??'registration.error',details:error.details??null};error.message+=' '+JSON.stringify(state.preparationFailure).slice(0,3000);dispose();throw error;}},error=>{dispose();throw error;});return preparing;},
   dispose,diagnostics:()=>({...state,readinessContract:readinessContract?.diagnostics()??null,assetSha256:scene.asset.sha256,assetBytes:scene.asset.bytes,declaredCount:scene.asset.count,backend:'Spark 2.4.0 / WebGL',toneMappingMatchesSource:renderer.toneMapping===T.NoToneMapping,scaleStatus:scene.scaleStatus})};return adapter;
 }catch(error){dispose();throw error;}
}
