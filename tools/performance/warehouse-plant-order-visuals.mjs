// Serialize this function with page.evaluate AFTER timed frames; no imports or app graph replacement.
export function validateWarehousePlantOrder({includeUnchangedImages=true,extended=false,enforcePlantSubsequence=false,enforceNativeSubsequence=false,enforceSelectedNativeSubsequence=true}={}){
 const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;
 if(!a?.engine?.renderer?.isWebGLRenderer||a.backend!=='webgl2')throw Error('Existing production WebGL app required');
 if(b?.scenario)throw Error('Visual readback must run outside timed frames');
 const r=a.engine.renderer,camera=a.camera,scene=a.engine.scene,gl=r.getContext();
 const readiness=()=>b?.observeReadiness?.({requireLive:false,diagnostic:true})??null;
 const before=readiness();if(!before?.passed)throw Error('Coupled Warehouse/Sunset readiness required: '+JSON.stringify(before));
 const door=a.host.active.project.portals.find(p=>/sunset/i.test(p.name));if(!door)throw Error('Actual authored Sunset portal missing');
 const allPlants=[],allNative=[];scene.traverse(o=>{if(o.userData?.nativePlantSpecies)allPlants.push(o);if(o.userData?.nativePlantSpecies||o.userData?.nativeTextures||o.userData?.nativeBase)allNative.push(o);});
 const nativeIds=new Set(allNative.map(o=>o.id)),selected=allNative.filter(o=>o.renderOrder===1);
 if(!selected.length)throw Error('Constructed candidate native opaque order=1 objects required');
 const uniforms=new Map(),materials=[...new Set(allPlants.flatMap(o=>Array.isArray(o.material)?o.material:[o.material]))];
 for(const material of materials){const u=r.properties.get(material).uniforms;if(!u?.nativeTime||!u?.nativeGust)throw Error('Compiled native plant time/gust uniforms required');for(const name of ['nativeTime','nativeGust'])if(!uniforms.has(u[name]))uniforms.set(u[name],{name,value:u[name].value?.clone?.()??u[name].value});}
 const originalTimes=[...uniforms.values()].filter(u=>u.name==='nativeTime').map(u=>u.value);
 const nativeMaterials=[...new Set(allNative.flatMap(o=>Array.isArray(o.material)?o.material:[o.material]))];
 const materialState=nativeMaterials.map(material=>({material,version:material.version,onBeforeCompile:material.onBeforeCompile,key:material.customProgramCacheKey()}));
 const geometryState=allNative.map(object=>({object,geometry:object.geometry,attributes:Object.entries({...object.geometry.attributes,index:object.geometry.index}).filter(([name,attribute])=>attribute&&!['iPlant','iRecord'].includes(name)).map(([name,attribute])=>({name,attribute,array:attribute.array,version:attribute.version,count:attribute.count}))}));
 const geometryUnchanged=()=>geometryState.every(s=>s.object.geometry===s.geometry&&s.attributes.every(v=>{const attribute=v.name==='index'?s.geometry.index:s.geometry.getAttribute(v.name);return attribute===v.attribute&&attribute.array===v.array&&attribute.version===v.version&&attribute.count===v.count;}));
 const setTime=time=>{for(const[uniform,snapshot]of uniforms)if(snapshot.name==='nativeTime')uniform.value=time===null?snapshot.value:time;};
 const copyVector=()=>({copy:v=>v.clone()}),cameraFields=['position','quaternion','scale','matrix','matrixWorld','matrixWorldInverse','projectionMatrix','projectionMatrixInverse'];
 const savedCamera=Object.fromEntries(cameraFields.map(k=>[k,camera[k].clone()]));
 const saved={target:r.getRenderTarget(),cube:r.getActiveCubeFace?.()??0,mip:r.getActiveMipmapLevel?.()??0,viewport:r.getViewport(copyVector()),scissor:r.getScissor(copyVector()),scissorTest:r.getScissorTest(),autoClear:r.autoClear,clearColor:r.getClearColor(copyVector()),clearAlpha:r.getClearAlpha(),toneMapping:r.toneMapping,clippingPlanes:r.clippingPlanes,localClippingEnabled:r.localClippingEnabled,xr:r.xr?.enabled,infoAutoReset:r.info.autoReset,infoRender:{...r.info.render},matrixAutoUpdate:camera.matrixAutoUpdate,matrixWorldNeedsUpdate:camera.matrixWorldNeedsUpdate,fly:{yaw:a.fly.yaw,pitch:a.fly.pitch,velocity:a.fly.velocity?.clone()},freeCam:a.freeCam};
 const originalDirect=r.renderBufferDirect,orders=allNative.map(o=>[o,o.renderOrder]);
 const width=r.domElement.width,height=r.domElement.height,ratio=r.getPixelRatio();
 const normal=[Math.sin(door.yaw||0),0,Math.cos(door.yaw||0)],tangent=[Math.cos(door.yaw||0),0,-Math.sin(door.yaw||0)];
 const point=(distance,lateral=0)=>door.position.map((v,i)=>v+normal[i]*distance+tangent[i]*lateral);
 const checkpoints=[{name:'gold-front-3m',position:point(3)},{name:'gold-near-1m',position:point(1)},{name:'gold-angle-left',position:point(3,-1.5)},{name:'gold-angle-right',position:point(3,1.5)},{name:'gold-turn-away',position:point(3),away:true}].map(p=>({...p,original:true,windTime:null}));
 if(extended){const poses=[{name:'window-oblique-left',position:point(3,-3),yawOffset:-.18},{name:'window-oblique-right',position:point(3,3),yawOffset:.18},{name:'window-near-left-edge',position:point(1,-1.5),yawOffset:-.18},{name:'window-near-right-edge',position:point(1,1.5),yawOffset:.18},{name:'gold-further-left',position:point(5,-1.5),yawOffset:-.18},{name:'gold-further-right',position:point(5,1.5),yawOffset:.18}];for(const windTime of [0,5,100])for(const pose of poses)checkpoints.push({...pose,name:pose.name+'-wind-'+windTime,windTime,original:false});}
 const instanceFingerprint=()=>allPlants.map(o=>{let hash=2166136261;for(const attr of [o.instanceMatrix,o.geometry.getAttribute('iPlant'),o.geometry.getAttribute('iRecord')]){const bytes=new Uint8Array(attr.array.buffer,attr.array.byteOffset,o.count*attr.itemSize*attr.array.BYTES_PER_ELEMENT);for(const byte of bytes)hash=Math.imul(hash^byte,16777619);}return [o.id,o.count,hash>>>0];});
 const png=(pixels,isDiff=false)=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),image=context.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const source=((height-1-y)*width+x)*4,dest=(y*width+x)*4;image.data[dest]=pixels[source];image.data[dest+1]=pixels[source+1];image.data[dest+2]=pixels[source+2];image.data[dest+3]=isDiff?255:pixels[source+3];}
  context.putImageData(image,0,0);return canvas.toDataURL('image/png');
 };
 const difference=(left,right)=>{
  const pixels=new Uint8Array(left.length);let changed=0,changedRGB=0,max=0,total=0,alphaChanged=0;
  for(let i=0;i<left.length;i+=4){let differs=false,rgb=false;for(let j=0;j<4;j++){const delta=Math.abs(left[i+j]-right[i+j]);pixels[i+j]=j===3?255:delta;if(delta){differs=true;if(j<3)rgb=true;}if(j<3){max=Math.max(max,delta);total+=delta;}else if(delta)alphaChanged++;}if(differs)changed++;if(rgb)changedRGB++;}
  return {metrics:{changedPixels:changed,changedRGBPixels:changedRGB,changedFraction:changed/(width*height),maxRGBAbsoluteDelta:max,meanRGBAbsoluteDelta:total/(width*height*3),alphaChangedPixels:alphaChanged},pixels};
 };
 let currentDraws=null;
 r.renderBufferDirect=function(cam,renderScene,geometry,material,object,group){
  const triangles=r.info.render.triangles,calls=r.info.render.calls;const result=originalDirect.apply(this,arguments);
  if(currentDraws&&cam===camera&&renderScene===scene)currentDraws.push({sequence:currentDraws.length,objectId:object.id,name:object.name,species:object.userData?.nativePlantSpecies??null,canopy:object.userData?.mediaOcclusionPlant==='native-canopy-v1',candidateBatch:selected.includes(object),nativeOpaque:nativeIds.has(object.id),nativeKind:object.userData?.nativePlantSpecies?'plant':object.userData?.nativeTextures?'fine-terrain':object.userData?.nativeBase?'base-terrain':null,renderOrder:object.renderOrder,transparent:material.transparent,materialId:material.id,group:group?{start:group.start,count:group.count,materialIndex:group.materialIndex}:null,instances:object.isInstancedMesh?object.count:1,triangles:r.info.render.triangles-triangles,drawCalls:r.info.render.calls-calls,indexCount:geometry.index?.count??null,positionCount:geometry.attributes.position?.count??null});
  return result;
 };
 const draw=candidate=>{
  for(const[plant,order]of orders)plant.renderOrder=candidate?order:0;
  r.setRenderTarget(null);r.setViewport(0,0,width/ratio,height/ratio);r.setScissorTest(false);r.autoClear=true;r.info.autoReset=false;
  const draws=[];currentDraws=draws;try{r.render(scene,camera);}finally{currentDraws=null;}
  const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const readError=gl.getError();if(readError!==gl.NO_ERROR)throw Error('Visual readPixels WebGL error '+readError);
  const signatures=draws.map(d=>JSON.stringify([d.objectId,d.materialId,d.group,d.instances,d.triangles,d.drawCalls])).sort();
  const far=draws.filter(d=>d.candidateBatch),opaque0=draws.filter(d=>!d.transparent&&d.renderOrder<=0),transparent=draws.filter(d=>d.transparent);
  const plantSubsequence=draws.filter(d=>d.species).map(d=>[d.objectId,d.materialId,d.group,d.instances,d.triangles,d.drawCalls]);
  const nativeSubsequence=draws.filter(d=>d.nativeOpaque&&!d.transparent).map(d=>[d.objectId,d.materialId,d.group,d.instances,d.triangles,d.drawCalls]);
  const selectedNativeSubsequence=draws.filter(d=>d.candidateBatch&&!d.transparent).map(d=>[d.objectId,d.materialId,d.group,d.instances,d.triangles,d.drawCalls]);
  const opaqueBeforeSelected=candidate?far.every(f=>opaque0.every(o=>o.sequence<f.sequence)):null,selectedBeforeTransparent=candidate?far.every(f=>transparent.every(t=>f.sequence<t.sequence)):null;
  return {pixels,draws,signatures,plantSubsequence,nativeSubsequence,selectedNativeSubsequence,counts:{draws:draws.length,instances:draws.reduce((n,d)=>n+d.instances,0),triangles:draws.reduce((n,d)=>n+d.triangles,0),candidateDraws:far.length,candidateInstances:far.reduce((n,d)=>n+d.instances,0)},ordering:{opaque0BeforeSelected1:opaqueBeforeSelected,selected1BeforeTransparent:selectedBeforeTransparent,opaque0BeforeCanopy1:opaqueBeforeSelected,canopy1BeforeTransparent:selectedBeforeTransparent}};
 };
 const results=[];
 try{
  for(const checkpoint of checkpoints){
   const p=checkpoint.position,target=door.position,yaw=(checkpoint.away?Math.atan2(-normal[0],-normal[2]):Math.atan2(p[0]-target[0],p[2]-target[2]))+(checkpoint.yawOffset??0),pitch=checkpoint.away?0:Math.atan2(target[1]-p[1],Math.hypot(target[0]-p[0],target[2]-p[2]));
   setTime(checkpoint.windTime);
   a.fly.setPose(camera.position.clone().fromArray(p),yaw,pitch);a.host.active.nativeIsland?.bindView(camera);
   // Refresh actual Sunset once; preserve its texture and simulation throughout A/B/A.
   a.portals.views.render({width:a.engine.width,height:a.engine.height,time:(b?.simulationFrame??a.engine.frame)/60});
   const matrixBefore=camera.matrixWorld.toArray(),projectionBefore=camera.projectionMatrix.toArray(),instancesBefore=JSON.stringify(instanceFingerprint()),baseline=draw(false),candidate=draw(true),repeat=draw(false);
   const noise=difference(baseline.pixels,repeat.pixels),change=difference(baseline.pixels,candidate.pixels);
   const sameVisibleDraws=JSON.stringify(baseline.signatures)===JSON.stringify(candidate.signatures)&&JSON.stringify(baseline.signatures)===JSON.stringify(repeat.signatures);
   if(!sameVisibleDraws)throw Error(checkpoint.name+': A/B/A visible geometry changed');
   const samePlantSubsequence=JSON.stringify(baseline.plantSubsequence)===JSON.stringify(candidate.plantSubsequence)&&JSON.stringify(baseline.plantSubsequence)===JSON.stringify(repeat.plantSubsequence);
   if(enforcePlantSubsequence&&!samePlantSubsequence)throw Error(checkpoint.name+': complete plant draw subsequence changed');
   const sameNativeSubsequence=JSON.stringify(baseline.nativeSubsequence)===JSON.stringify(candidate.nativeSubsequence)&&JSON.stringify(baseline.nativeSubsequence)===JSON.stringify(repeat.nativeSubsequence);
   if(enforceNativeSubsequence&&!sameNativeSubsequence)throw Error(checkpoint.name+': complete native opaque draw subsequence changed');
   const sameSelectedNativeSubsequence=JSON.stringify(baseline.selectedNativeSubsequence)===JSON.stringify(candidate.selectedNativeSubsequence)&&JSON.stringify(baseline.selectedNativeSubsequence)===JSON.stringify(repeat.selectedNativeSubsequence);
   if(enforceSelectedNativeSubsequence&&!sameSelectedNativeSubsequence)throw Error(checkpoint.name+': selected native opaque draw subsequence changed');
   const nativeGeometryUnchanged=geometryUnchanged();if(!nativeGeometryUnchanged)throw Error(checkpoint.name+': native tile/plant geometry changed');
   const instancesUnchanged=instancesBefore===JSON.stringify(instanceFingerprint());if(!instancesUnchanged)throw Error(checkpoint.name+': instance transforms/records changed inside triplet');
   const shadersUnchanged=materialState.every(s=>s.version===s.material.version&&s.onBeforeCompile===s.material.onBeforeCompile&&s.key===s.material.customProgramCacheKey());if(!shadersUnchanged)throw Error(checkpoint.name+': plant shader/material admission changed');
   if(!candidate.ordering.opaque0BeforeCanopy1||!candidate.ordering.canopy1BeforeTransparent)throw Error(checkpoint.name+': candidate opaque/transparent ordering violated');
   const cameraUnchanged=JSON.stringify(matrixBefore)===JSON.stringify(camera.matrixWorld.toArray())&&JSON.stringify(projectionBefore)===JSON.stringify(camera.projectionMatrix.toArray());if(!cameraUnchanged)throw Error('Camera changed inside synchronous triplet');
   const images=includeUnchangedImages&&checkpoint.original||change.metrics.changedPixels||noise.metrics.changedPixels?{baseline:png(baseline.pixels),candidate:png(candidate.pixels),diff:png(change.pixels,true)}:{};
   results.push({name:checkpoint.name,position:p,yaw,pitch,windTime:checkpoint.windTime??originalTimes,originalCheckpoint:checkpoint.original,cameraMatrixWorld:matrixBefore,projectionMatrix:projectionBefore,cameraUnchanged,sameVisibleDraws,samePlantSubsequence,sameNativeSubsequence,sameSelectedNativeSubsequence,nativeGeometryUnchanged,instancesUnchanged,shadersUnchanged,plantSubsequence:{baseline:baseline.plantSubsequence,candidate:candidate.plantSubsequence,repeat:repeat.plantSubsequence},nativeSubsequence:{baseline:baseline.nativeSubsequence,candidate:candidate.nativeSubsequence,repeat:repeat.nativeSubsequence},selectedNativeSubsequence:{baseline:baseline.selectedNativeSubsequence,candidate:candidate.selectedNativeSubsequence,repeat:repeat.selectedNativeSubsequence},baselineRepeatNoise:noise.metrics,candidateDifference:change.metrics,pixelIdentity:change.metrics.changedPixels===0,draws:{baseline:baseline.draws,candidate:candidate.draws,repeat:repeat.draws},counts:{baseline:baseline.counts,candidate:candidate.counts,repeat:repeat.counts},ordering:candidate.ordering,readiness:readiness(),images});
  }
  const after=readiness();if(!after?.passed)throw Error('Coupled world readiness lost after visual checkpoints');
  return {schema:4,scope:'Synchronous actual Warehouse A(native opaque order0)/B(constructed native opaque orders)/A(native opaque order0) visual and draw-sequence checks outside all FPS samples',extended,enforcePlantSubsequence,enforceNativeSubsequence,enforceSelectedNativeSubsequence,width,height,ratio,uniformSnapshot:{nativeTimes:originalTimes,gustOffsets:[...uniforms.values()].filter(u=>u.name==='nativeGust').map(u=>u.value.toArray())},candidateObjectIds:selected.map(o=>o.id),constructedOrders:orders.map(([o,order])=>({id:o.id,species:o.userData.nativePlantSpecies??null,nativeKind:o.userData.nativePlantSpecies?'plant':o.userData.nativeTextures?'fine-terrain':'base-terrain',order})),before,after,checkpoints:results,caveats:['The full plant/native opaque order may change; these measured flags are reported independently. Only the constructed selected-native subsequence is enforced by default. Pixel differences remain fully reported without tolerance.','No engine/host update occurs within A/B/A; render callbacks can still produce repeat noise, reported separately.','Extended times change the captured shared native-island time uniform (also used by sea and copied into sky during bindView); spatial gust offsets remain frozen at captured actual values. All states stay fixed within each triplet.','Depth-tied coplanar fragments can change with ordering; universal pixel identity is not guaranteed.','This validation is not an FPS measurement.'],restoration:'Camera, fly pose, native time/gust uniform values, renderer state, draw hook and original plant orders restored in finally'};
 }finally{
  currentDraws=null;r.renderBufferDirect=originalDirect;for(const[o,order]of orders)o.renderOrder=order;
  for(const[uniform,snapshot]of uniforms){if(snapshot.value?.clone)uniform.value.copy(snapshot.value);else uniform.value=snapshot.value;}
  for(const k of cameraFields)camera[k].copy(savedCamera[k]);camera.matrixAutoUpdate=saved.matrixAutoUpdate;camera.matrixWorldNeedsUpdate=saved.matrixWorldNeedsUpdate;
  a.fly.yaw=saved.fly.yaw;a.fly.pitch=saved.fly.pitch;if(saved.fly.velocity)a.fly.velocity.copy(saved.fly.velocity);a.freeCam=saved.freeCam;
  try{a.host.active.nativeIsland?.bindView(camera);}finally{
   r.autoClear=saved.autoClear;r.toneMapping=saved.toneMapping;r.clippingPlanes=saved.clippingPlanes;r.localClippingEnabled=saved.localClippingEnabled;if(r.xr)r.xr.enabled=saved.xr;
   r.setRenderTarget(saved.target,saved.cube,saved.mip);r.setViewport(saved.viewport);r.setScissor(saved.scissor);r.setScissorTest(saved.scissorTest);r.setClearColor(saved.clearColor,saved.clearAlpha);r.info.autoReset=saved.infoAutoReset;Object.assign(r.info.render,saved.infoRender);
  }
 }
}
