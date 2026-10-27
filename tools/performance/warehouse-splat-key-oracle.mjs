// Test-only: serialize into the existing Warehouse page AFTER acceptance timing.
// This never installs CPU keys or ordering into Spark and never admits new assets.
export async function runWarehouseSplatKeyOracle({timeoutMs=15000,maxExamples=8,sortVariants=2}={}) {
 const app=window.__repositoryWorldApp,b=window.__warehouseBenchmark,engine=app?.engine,renderer=engine?.renderer;
 if(!b||app?.backend!=='webgl2'||!renderer?.isWebGLRenderer)throw Error('Existing Warehouse WebGL2 runtime required');
 if(b.scenario)throw Error('Key oracle must run after benchmark timing');
 if(b.splatOracleGateAvailable!==true)throw Error('Diagnostic runner must provide the explicit splat oracle frame gate');
 if(b.splatKeyOracleActive)throw Error('Key oracle already active');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)throw Error('timeoutMs must be 1000..30000');
 if(!Number.isSafeInteger(maxExamples)||maxExamples<0||maxExamples>32||!Number.isSafeInteger(sortVariants)||sortVariants<1||sortVariants>4)throw Error('Invalid diagnostic bounds');
 const count=719538,capacity=720896,width=2048,height=352,start=performance.now(),deadline=start+timeoutMs;
 const report={diagnosticOnly:true,acceptanceEvidence:false,count,capacity,startedAt:start,status:'running',timings:{},variants:[],ordering:[],invariants:{},notes:['No CPU key or ordering is installed into Spark. All worker inputs are independent copies.','Exact bit and full permutation comparison; no quality tolerance is applied.','Generated attachment0 contains camera-relative half-float packed centers, not original float32 centers/flags. Its oracle is explicitly quantized.','Float32 operation variants are candidate arithmetic models; GLSL length and quaternion operations may contract or reassociate on the GPU.','Timeout cannot cancel submitted renderer readback or sorter operations. They may still touch shared GL state or the shared worker. A timeout invalidates the diagnostic session; close the page and do not use subsequent visual checks as acceptance evidence.']};
 const entries=[...app.portals.views.entries.values()].filter(entry=>entry.candidate?.splatScene?.spark&&/sunset/i.test(String(entry.source?.name??'')+' '+String(entry.id??'')));
 if(entries.length!==1)throw Error('Expected exactly one named Sunset portal');
 const entry=entries[0],adapter=entry.candidate.splatScene,spark=adapter.spark,mesh=adapter.splat,gl=renderer.getContext();
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 const tick=()=>{if(performance.now()>=deadline)throw Error('Key oracle deadline exceeded');if(gl.isContextLost())throw Error('WebGL context lost during key oracle');};
 const bounded=async(promise)=>{tick();let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Key oracle deadline exceeded')),Math.max(1,deadline-performance.now()));})]);}finally{clearTimeout(timer);}};
 const vector=value=>[value.x,value.y,value.z];
 const half=value=>{const sign=value&32768?-1:1,exponent=value>>>10&31,fraction=value&1023;return exponent===31?(fraction?NaN:sign*Infinity):exponent?sign*2**(exponent-15)*(1+fraction/1024):sign*2**-14*(fraction/1024);};
 const f=Math.fround,castBuffer=new ArrayBuffer(4),castFloat=new Float32Array(castBuffer),castUint=new Uint32Array(castBuffer);
 const bits=value=>{castFloat[0]=value;return castUint[0];};
 const numeric=value=>{castUint[0]=value;return castFloat[0];};
 const hash=async array=>{const digest=await bounded(crypto.subtle.digest('SHA-256',array));return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');};
 const saved={paused:b.splatOraclePaused,autoUpdate:spark.autoUpdate,driveSort:spark.driveSort};
 const pauseSort=function(){return Promise.resolve();};
 let current=null,originalFingerprint=null;
 const state=()=>({target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace?.(),mip:renderer.getActiveMipmapLevel?.(),viewport:renderer.getViewport({copy(value){return {x:value.x,y:value.y,z:value.z,w:value.w};}}),scissor:renderer.getScissor({copy(value){return {x:value.x,y:value.y,z:value.z,w:value.w};}}),scissorTest:renderer.getScissorTest(),readBuffer:gl.getParameter(gl.READ_BUFFER),pack:gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING)});
 const restoreState=s=>{renderer.setRenderTarget(s.target,s.face,s.mip);renderer.setViewport(s.viewport.x,s.viewport.y,s.viewport.z,s.viewport.w);renderer.setScissor(s.scissor.x,s.scissor.y,s.scissor.z,s.scissor.w);renderer.setScissorTest(s.scissorTest);gl.readBuffer(s.readBuffer);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,s.pack);};
 // Restore renderer state synchronously at enqueue, then again after completion.
 const capture=async(target,attachment,destination)=>{const s=state();let promise;try{renderer.setRenderTarget(target,0);gl.readBuffer(gl.COLOR_ATTACHMENT0+attachment);promise=renderer.readRenderTargetPixelsAsync(target,0,0,width,height,destination,undefined,attachment);}finally{restoreState(s);}try{await bounded(promise);}finally{restoreState(s);}tick();};
 try {
  b.splatKeyOracleActive=true;b.splatOraclePaused=true;
  spark.autoUpdate=false;spark.driveSort=pauseSort;
  const settleStart=performance.now();while(spark.sorting){await bounded(new Promise(resolve=>setTimeout(resolve,4)));tick();}
  report.timings.pendingSortSettleMs=performance.now()-settleStart;
  assert(spark.sortWorker&&typeof spark.sortWorker.call==='function','Existing installed sort worker required');
  assert(mesh?.numSplats===count&&mesh.packedSplats?.packedArray instanceof Uint32Array,'Pinned decoded CPU packed splats required');
  assert(!mesh.context?.enableLod?.value&&!mesh.skinning&&!mesh.rgbaDisplaceEdits&&!mesh.objectModifiers?.length&&!mesh.worldModifiers?.length&&!mesh.covSplats&&!mesh.onFrame,'Unsupported LOD or geometry modifiers');
  assert(spark.sortRadial===true,'Only installed radial depth keys supported');
  current=spark.current;const target=current.target,packed=mesh.packedSplats.packedArray;
  assert(current.numSplats===count&&current.maxSplats===capacity&&!current.extSplats&&!current.covSplats,'Pinned accumulator count/layout mismatch');
  assert(target?.isWebGLArrayRenderTarget&&target.width===width&&target.height===height&&target.depth===1&&target.textures.length===2,'Pinned target layout mismatch');
  assert(target.textures[0].format===1033&&target.textures[0].type===1014&&(!target.textures[0].internalFormat||target.textures[0].internalFormat==='RGBA32UI'),'Generated center attachment must be RGBA32UI-compatible');
  assert(current.mapping.length===1&&current.mapping[0].node===mesh&&current.mapping[0].base===0&&current.mapping[0].count===count,'Pinned single-mesh identity mapping required');
  assert(current.mapping[0].version===mesh.version&&current.mapping[0].mappingVersion===mesh.mappingVersion,'Current source generator versions must match captured context');
  const transform=mesh.context.transform,scale=f(transform.scale.value),q=[...vector(transform.rotate.value),transform.rotate.value.w].map(f),translation=vector(transform.translate.value).map(f),origin=vector(current.viewOrigin).map(f);
  const matrix=[...mesh.matrixWorld.elements],version=current.version,mappingVersion=current.mappingVersion;
  assert([scale,...q,...translation,...origin,...matrix].every(Number.isFinite),'Nonfinite source transform');
  assert(Math.abs(mesh.scale.x-11.2307273607188)<1e-12&&mesh.position.toArray().every((v,i)=>v===[1.585657106720535,1.235958392161293,-1.757775309929035][i])&&mesh.rotation.x===-Math.PI/2&&mesh.rotation.y===0&&mesh.rotation.z===0,'Pinned Sunset local transform mismatch');
  originalFingerprint=await hash(packed);
  report.source={entryId:entry.id,sparkId:spark.id,assetSha256:adapter.diagnostics?.().assetSha256??null,packedSha256:originalFingerprint,packedWords:packed.length,version,mappingVersion,viewOrigin:vector(current.viewOrigin),viewDirection:vector(current.viewDirection),scale,quaternion:q,translation,matrix,targetTextureIds:target.textures.map(texture=>texture.id),targetTextures:target.textures.map(texture=>({format:texture.format,type:texture.type,internalFormat:texture.internalFormat}))};
  const gpuKeys=new Uint32Array(capacity),generated=new Uint32Array(capacity*4),captureStart=performance.now();
  await capture(target,1,new Uint8Array(gpuKeys.buffer));await capture(target,0,generated);
  report.timings.captureMs=performance.now()-captureStart;
  const unchanged=()=>spark.current===current&&current.version===version&&current.mappingVersion===mappingVersion&&current.target===target&&current.mapping[0].version===mesh.version&&current.mapping[0].mappingVersion===mesh.mappingVersion&&matrix.every((v,i)=>v===mesh.matrixWorld.elements[i])&&origin.every((v,i)=>v===f(vector(current.viewOrigin)[i]))&&scale===f(transform.scale.value)&&translation.every((v,i)=>v===f(vector(transform.translate.value)[i]))&&q.every((v,i)=>v===f([transform.rotate.value.x,transform.rotate.value.y,transform.rotate.value.z,transform.rotate.value.w][i]));
  assert(unchanged(),'Source changed during captures');
  report.source.gpuKeysSha256=await hash(gpuKeys);report.source.generatedPackedSha256=await hash(generated);
  const cross=(left,right)=>[f(f(left[1]*right[2])-f(left[2]*right[1])),f(f(left[2]*right[0])-f(left[0]*right[2])),f(f(left[0]*right[1])-f(left[1]*right[0]))];
  const world=(center,strict)=>{
   const v=center.map(value=>f(value*scale));
   if(!strict){const t=[2*(q[1]*v[2]-q[2]*v[1]),2*(q[2]*v[0]-q[0]*v[2]),2*(q[0]*v[1]-q[1]*v[0])],c=[q[1]*t[2]-q[2]*t[1],q[2]*t[0]-q[0]*t[2],q[0]*t[1]-q[1]*t[0]];return v.map((value,i)=>f(f(value+q[3]*t[i]+c[i])+translation[i]));}
   const t=cross(q,v).map(value=>f(2*value)),c=cross(q,t);return v.map((value,i)=>f(f(f(value+f(q[3]*t[i]))+c[i])+translation[i]));
  };
  const variants=[{name:'raw-quaternion-f32-left-dot',strict:true,dot:'left'},{name:'raw-quaternion-f32-right-dot',strict:true,dot:'right'},{name:'raw-quaternion-relaxed-dot',strict:false,dot:'relaxed'},{name:'generated-half-relative-f32-dot',generated:true,strict:true,dot:'left'}];
  const arrays=[];const computeStart=performance.now();
  for(const variant of variants){
   const keys=new Uint32Array(capacity);keys.fill(0x7f800000);const stats={name:variant.name,quantizedGeneratedCenter:!!variant.generated,keyDifferences:0,activeFlagDifferences:0,gpuActiveCount:0,cpuActiveCount:0,maxUnsignedBitDelta:0,maxMetricAbsDelta:0,examples:[]};
   for(let index=0;index<count;index++){
    if((index&16383)===0)tick();const offset=index*4,data=variant.generated?generated:packed,w1=data[offset+1],w2=data[offset+2],w3=data[offset+3],active=(w3&0xffffff)!==0;
    let key=0x7f800000;
    if(active){let relative=[half(w1&65535),half(w1>>>16),half(w2&65535)];if(!variant.generated)relative=world(relative,variant.strict).map((value,i)=>f(value-origin[i]));
     const square=relative.map(value=>f(value*value)),dot=variant.dot==='relaxed'?f(relative[0]**2+relative[1]**2+relative[2]**2):variant.dot==='right'?f(square[0]+f(square[1]+square[2])):f(f(square[0]+square[1])+square[2]);key=bits(f(Math.sqrt(dot)));
    }
    keys[index]=key;const gpu=gpuKeys[index],gpuActive=gpu!==0x7f800000;if(gpuActive)stats.gpuActiveCount++;if(active)stats.cpuActiveCount++;if(active!==gpuActive)stats.activeFlagDifferences++;
    if(key!==gpu){stats.keyDifferences++;stats.maxUnsignedBitDelta=Math.max(stats.maxUnsignedBitDelta,Math.abs(key-gpu));const delta=Math.abs(numeric(key)-numeric(gpu));if(Number.isFinite(delta))stats.maxMetricAbsDelta=Math.max(stats.maxMetricAbsDelta,delta);if(stats.examples.length<maxExamples)stats.examples.push({index,gpu,cpu:key,gpuMetric:numeric(gpu),cpuMetric:numeric(key)});}
   }
   report.variants.push(stats);arrays.push({variant,stats,keys});
  }
  report.timings.cpuVariantsMs=performance.now()-computeStart;
  // Test exact installed sorter behavior, including ties, only on detached copies.
  const orderingLength=Math.max(spark.maxSplats,Math.ceil(capacity/16384)*16384);
  const sort=async(keys)=>{tick();const sortStart=performance.now(),result=await bounded(spark.sortWorker.call('sortSplats32',{numSplats:count,readback:keys.slice(),ordering:new Uint32Array(orderingLength)}));tick();assert(result?.ordering instanceof Uint32Array&&result.ordering.length===orderingLength,'Unexpected installed sorter result');return {result,elapsedMs:performance.now()-sortStart};};
  const reference=await sort(gpuKeys);report.timings.gpuKeysWorkerMs=reference.elapsedMs;
  const promising=arrays.filter(item=>!item.variant.generated).sort((left,right)=>left.stats.keyDifferences-right.stats.keyDifferences).slice(0,sortVariants);
  for(const item of promising){const candidate=await sort(item.keys),left=reference.result,right=candidate.result;let differences=0,firstDifference=null;for(let index=0;index<left.ordering.length;index++){if((index&16383)===0)tick();if(left.ordering[index]!==right.ordering[index]){differences++;firstDifference??=index;}}
   report.ordering.push({variant:item.variant.name,comparedElements:left.ordering.length,differences,firstDifference,gpuActiveCount:left.activeSplats,cpuActiveCount:right.activeSplats,activeCountsEqual:left.activeSplats===right.activeSplats,identical:differences===0&&left.activeSplats===right.activeSplats,workerMs:candidate.elapsedMs});
  }
  assert(unchanged(),'Source changed during CPU oracle');assert(await hash(packed)===originalFingerprint,'Decoded source changed during oracle');
  report.invariants={currentIdentity:true,versionsStable:true,targetStable:true,matrixStable:true,packedFingerprintStable:true,orderingNeverInstalled:true};
  report.exactOrderingPromising=report.ordering.some(result=>result.identical);report.status=report.exactOrderingPromising?'exact-order-candidate-needs-pixel-validation':'rejected-exact-order';
 }catch(error){report.status='unavailable-or-failed';report.error=String(error?.stack??error);}
 finally {
  if(spark.driveSort===pauseSort)spark.driveSort=saved.driveSort;spark.autoUpdate=saved.autoUpdate;
  b.splatOraclePaused=saved.paused;b.splatKeyOracleActive=false;report.endedAt=performance.now();report.elapsedMs=report.endedAt-start;report.restored={autoUpdate:spark.autoUpdate===saved.autoUpdate,driveSort:spark.driveSort===saved.driveSort,frameGate:b.splatOraclePaused===saved.paused};
 }
 return report;
}
