// External qualification prototype ONLY. Default disabled; no runtime admission.
export function installCanonicalGenerationPrototype({app=window.__repositoryWorldApp}={}) {
 if(app?.backend!=='webgl2'||!app.engine?.renderer?.isWebGLRenderer)throw Error('Existing verified WebGL2 app required');
 const entries=[...app.portals.views.entries.values()].filter(entry=>entry.candidate?.splatScene?.spark&&/sunset/i.test(String(entry.source?.name??'')+' '+entry.id));
 if(entries.length!==1)throw Error('One pinned Sunset adapter required');
 const entry=entries[0],adapter=entry.candidate.splatScene,spark=adapter.spark,mesh=adapter.splat,renderer=app.engine.renderer;
 const source=mesh?.packedSplats,packed=source?.packedArray,meshPrototype=Object.getPrototypeOf(mesh),basePrototype=Object.getPrototypeOf(meshPrototype),Generator=basePrototype?.constructor;
 const diagnostics=adapter.diagnostics?.();
 if(adapter.state?.status!=='ready'||diagnostics?.assetSha256!=='66334b9bcea5abb6b2a310c44c584fd7fdc8fb999db9c718c785473c41019298'||mesh?.numSplats!==719538||!(packed instanceof Uint32Array)||typeof Generator!=='function'||!(mesh instanceof Generator))throw Error('Fresh verified pinned packed adapter required');
 if(mesh.update!==meshPrototype.update||mesh.constructGenerator!==meshPrototype.constructGenerator||typeof mesh.frameUpdate!=='function')throw Error('Known installed mesh methods required at installation');
 const captured={updateInternal:spark.updateInternal,driveSort:spark.driveSort,readbackDepth:spark.readbackDepth,worker:spark.sortWorker,workerCall:spark.sortWorker?.call,frameUpdate:mesh.frameUpdate,update:mesh.update,constructGenerator:mesh.constructGenerator,fetchSplat:source.fetchSplat,sourcePrepare:source.prepareFetchSplat,sourceSetSh:source.setMaxSh,sourceHasRgbDir:source.hasRgbDir,sourceGetSh:source.getNumSh,meshPrototype,basePrototype,generator:mesh.generator,cameraConstructor:entry.camera.constructor,cameraWorldPosition:entry.camera.getWorldPosition,cameraWorldDirection:entry.camera.getWorldDirection};
 if(typeof captured.updateInternal!=='function')throw Error('Existing updateInternal required');
 const canonical=entry.camera.clone(false);canonical.parent=null;
 let enabled=false,disposed=false,calls=0,canonicalCalls=0,fallbackCalls=0,guardErrors=0,lastReason=null;
 const reasons=new Map();
 const count=reason=>{lastReason=reason;const key=reasons.has(reason)||reasons.size<64?reason:'other';reasons.set(key,(reasons.get(key)??0)+1);};
 function guard(parameters){
  if(disposed)return 'disposed';if(!enabled)return 'disabled';if(parameters?.autoUpdate!==true)return 'explicit-update';
  const {scene,camera}=parameters;
  if(camera?.parent)return 'parented-camera';
  if(entry.candidate?.splatScene!==adapter||adapter.spark!==spark||adapter.splat!==mesh||adapter.state?.disposed||adapter.state?.status!=='ready'||spark.isDisposed)return 'adapter-changed-or-disposed';
  if(spark.driveSort!==captured.driveSort||spark.readbackDepth!==captured.readbackDepth||spark.sortWorker!==captured.worker||spark.sortWorker?.call!==captured.workerCall)return 'sort-method-or-worker-identity';
  if(mesh.packedSplats!==source||mesh.splats!==source||source.packedArray!==packed||source.numSplats!==719538||mesh.numSplats!==719538)return 'source-identity-or-count';
  if(Object.getPrototypeOf(mesh)!==captured.meshPrototype||Object.getPrototypeOf(captured.meshPrototype)!==captured.basePrototype||mesh.frameUpdate!==captured.frameUpdate||mesh.update!==captured.update||mesh.constructGenerator!==captured.constructGenerator)return 'mesh-method-identity';
  if(source.fetchSplat!==captured.fetchSplat||source.prepareFetchSplat!==captured.sourcePrepare||source.setMaxSh!==captured.sourceSetSh||source.hasRgbDir!==captured.sourceHasRgbDir||source.getNumSh!==captured.sourceGetSh)return 'source-method-identity';
  if(mesh.generator!==captured.generator||mesh.generatorDirty||mesh.covGenerator)return 'custom-or-dirty-generator';
  if(spark.enableLod!==false||spark.enableDriveLod!==false||mesh.enableLod!==false)return 'lod-flags-not-explicitly-disabled';
  if(source.lodSplats||source.nonLod||mesh.paged||mesh.extSplats||source.lod||mesh.context?.enableLod?.value)return 'lod-or-nonpacked-source';
  if(mesh.covSplats||spark.covSplats||spark.accumExtSplats||spark.current?.extSplats||spark.current?.covSplats||spark.display?.extSplats||spark.display?.covSplats)return 'extended-or-covariance';
  if(mesh.skinning||mesh.onFrame||mesh.splatRgba||mesh.rgbaDisplaceEdits||mesh.objectModifiers?.length||mesh.worldModifiers?.length||mesh.covObjectModifiers?.length||mesh.covWorldModifiers?.length||mesh.edits?.length)return 'mesh-edits-or-modifiers';
  if(mesh.enableViewToWorld||mesh.enableWorldToView||mesh.enableViewToObject)return 'directional-transform-flags';
  if(spark.sortRadial!==true)return 'nonradial-sort';
  if(renderer.xr?.isPresenting||camera?.isArrayCamera||camera?.isXRCamera)return 'xr-or-array-camera';
  if(scene!==entry.scene||!scene?.traverse||!camera?.isCamera||camera.constructor!==captured.cameraConstructor||!camera.matrixWorld?.elements||!camera.projectionMatrix||!camera.projectionMatrixInverse)return 'scene-or-camera-contract';
  if(camera.getWorldPosition!==captured.cameraWorldPosition||camera.getWorldDirection!==captured.cameraWorldDirection||camera.matrixWorldNeedsUpdate)return 'custom-or-unprepared-camera';
  // Caller prepares its real camera before this test scope. A pending local
  // translation would make vendor getWorldPosition refresh a different matrix.
  if(camera.matrixAutoUpdate&&(!Object.is(camera.position.x,camera.matrix.elements[12])||!Object.is(camera.position.y,camera.matrix.elements[13])||!Object.is(camera.position.z,camera.matrix.elements[14])))return 'pending-local-camera-translation';
  let generatorCount=0,foreignGenerator=false,edit=false;
  scene.traverse(node=>{if(node.isSplatEdit||node.isSplatEditSdf)edit=true;if(node instanceof Generator){generatorCount++;if(node!==mesh)foreignGenerator=true;}else if(node!==spark&&(node.generator||node.covGenerator))foreignGenerator=true;});
  if(edit)return 'scene-global-splat-edit';if(generatorCount!==1||foreignGenerator)return 'scene-custom-generator';
  // Inspect the actual world affine matrix. No positional epsilon or rounding.
  const e=camera.matrixWorld.elements;if(!Array.from(e).every(Number.isFinite))return 'nonfinite-camera';
  if(e[3]!==0||e[7]!==0||e[11]!==0||e[15]!==1)return 'nonaffine-camera';
  const x=[e[0],e[1],e[2]],y=[e[4],e[5],e[6]],z=[e[8],e[9],e[10]],dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),det=x[0]*(y[1]*z[2]-y[2]*z[1])-y[0]*(x[1]*z[2]-x[2]*z[1])+z[0]*(x[1]*y[2]-x[2]*y[1]);
  if(Math.abs(dot(x,x)-1)>1e-10||Math.abs(dot(y,y)-1)>1e-10||Math.abs(dot(z,z)-1)>1e-10||Math.abs(dot(x,y))>1e-10||Math.abs(dot(x,z))>1e-10||Math.abs(dot(y,z))>1e-10||Math.abs(det-1)>1e-10)return 'scaled-sheared-or-reflected-camera';
  return null;
 }
 const wrapper=function(...args){
  calls++;let reason;try{reason=this===spark?guard(args[0]):'borrowed-update-method';}catch{guardErrors++;reason='guard-exception';}
  if(reason){fallbackCalls++;count(reason);return captured.updateInternal.apply(this,args);}
  // copy() retains camera projection, layers, near/far and type-specific values;
  // only the detached generator camera pose becomes world-aligned.
  const camera=args[0].camera,e=camera.matrixWorld.elements;
  try{canonical.copy(camera,false);canonical.parent=null;canonical.matrixAutoUpdate=true;canonical.matrixWorldAutoUpdate=true;canonical.position.set(e[12],e[13],e[14]);canonical.quaternion.set(0,0,0,1);canonical.scale.set(1,1,1);canonical.layers.mask=camera.layers.mask;canonical.projectionMatrix.copy(camera.projectionMatrix);canonical.projectionMatrixInverse.copy(camera.projectionMatrixInverse);canonical.updateMatrix();canonical.updateMatrixWorld(true);
   if(!Object.is(canonical.matrixWorld.elements[12],e[12])||!Object.is(canonical.matrixWorld.elements[13],e[13])||!Object.is(canonical.matrixWorld.elements[14],e[14])){fallbackCalls++;count('translation-not-bit-exact');return captured.updateInternal.apply(this,args);}
  }catch{guardErrors++;fallbackCalls++;count('camera-clone-update-failed');return captured.updateInternal.apply(this,args);}
  canonicalCalls++;count('canonical');const forwarded=args.slice();forwarded[0]={...args[0],camera:canonical};return captured.updateInternal.apply(this,forwarded);
 };
 spark.updateInternal=wrapper;
 const api={setEnabled(value){if(disposed)throw Error('Prototype disposed');if(typeof value!=='boolean')throw Error('setEnabled requires boolean');enabled=value;return api.snapshot();},snapshot(){return {diagnosticOnly:true,externalQualificationOnly:true,enabled,disposed,calls,canonicalCalls,fallbackCalls,guardErrors,lastReason,reasons:Object.fromEntries(reasons),pinnedCount:719538,pinnedAssetSha256:diagnostics.assetSha256,lodFlagsInstallerChanged:false,notes:['External mechanism prototype, not a production optimisation or qualification. Default disabled.','No early-return cache: every eligible invocation runs the full original vendor updateInternal, including version/recolor changes, mapping and actual sorting.','Caller must independently verify no LOD source before explicitly disabling renderer enableLod/enableDriveLod and mesh enableLod; installer never changes those flags.','Fresh verified app is the trust boundary for captured method/packed-source identity. In-place source changes are not hashed per call and continue through full vendor processing; unknown source/method replacements fall back.','Packed SH fetch is permitted only through the captured known source implementation; its direction depends on object-to-view translation. Custom view-dependent transform flags are rejected.','Only the generator camera is canonicalized; actual render camera stays unchanged. Pixel/order/motion proof remains required.']};},dispose(){if(!disposed){enabled=false;disposed=true;if(spark.updateInternal===wrapper)spark.updateInternal=captured.updateInternal;}return api.snapshot();}};
 return api;
}
