// Isolated feasibility check. Never publishes prototype textures to Spark.
// The caller installs window.__createWebGLMergeSorter from the prototype module
// and provides the explicit post-timing rAF gate used by the CPU key oracle.
export async function runWarehouseGpuSortOracle({route, timeoutMs=90000,profileStages=false,method='point-scatter'}={}) {
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>120000)throw Error('timeoutMs must be 1000..120000');
  const app=window.__repositoryWorldApp, b=window.__warehouseBenchmark;
  if(app?.backend!=='webgl2'||!b?.splatOracleGateAvailable||b.scenario)throw Error('Post-timing Warehouse WebGL gate required');
  const entry=[...app.portals.views.entries.values()].find(e=>e.candidate?.splatScene?.spark&&/sunset/i.test(String(e.source?.name??'')+' '+e.id));
  if(!entry)throw Error('Existing Sunset renderer required');
  const spark=entry.candidate.splatScene.spark,mesh=entry.candidate.splatScene.splat;
  const renderer=app.engine.renderer, gl=renderer.getContext();
  const deadline=performance.now()+timeoutMs;
  const saved={autoUpdate:spark.autoUpdate,driveSort:spark.driveSort,paused:b.splatOraclePaused};
  const vectorCopy={copy:value=>({x:value.x,y:value.y,z:value.z,w:value.w})};
  const rendererEntry={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(vectorCopy),scissor:renderer.getScissor(vectorCopy),scissorTest:renderer.getScissorTest()};
  const cameraEntry={position:app.camera.position.clone(),quaternion:app.camera.quaternion.clone(),rotationOrder:app.camera.rotation.order,yaw:app.fly.yaw,pitch:app.fly.pitch,velocity:app.fly.velocity.clone()};
  const pauseSort=()=>Promise.resolve();
  const report={diagnosticOnly:true,acceptanceEvidence:false,algorithm:method,synthetics:[],captures:[],readbacksDuringSort:{readPixels:0,getBufferSubData:0},published:false,notes:['A timeout invalidates this diagnostic session. Submitted GL readback, worker and frame callbacks cannot be cancelled by restoring flags; close the browser session before further checks.','Complete ordering equality is tested; prototype ordering is never installed and rendered pixel equality is not tested.']};
  let sorter,sourceTexture,inSort=false,query=null;
  const originals={readPixels:gl.readPixels,getBufferSubData:gl.getBufferSubData};
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  const tick=()=>{assert(performance.now()<deadline,'GPU sort oracle deadline exceeded');assert(!gl.isContextLost(),'WebGL context lost');};
  const bounded=async promise=>{tick();let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('GPU sort oracle deadline exceeded')),Math.max(1,deadline-performance.now()));})]);}finally{clearTimeout(timer);}};
  const wait=async()=>{await new Promise(resolve=>setTimeout(resolve,4));tick();};
  const hash=async array=>[...new Uint8Array(await bounded(crypto.subtle.digest('SHA-256',array)))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const compare=(left,right)=>{let differences=0;const examples=[];for(let i=0;i<left.length;i++)if(left[i]!==right[i]){differences++;if(examples.length<8)examples.push({index:i,gpu:left[i],worker:right[i]});}return {elements:left.length,differences,examples};};
  const sortReference=async(keys,count,capacity)=>bounded(spark.sortWorker.call('sortSplats32',{numSplats:count,readback:keys.slice(),ordering:new Uint32Array(capacity)}));
  const restoreRenderer=()=>{renderer.resetState();renderer.setRenderTarget(rendererEntry.target,rendererEntry.face,rendererEntry.mip);const v=rendererEntry.viewport,s=rendererEntry.scissor;renderer.setViewport(v.x,v.y,v.z,v.w);renderer.setScissor(s.x,s.y,s.z,s.w);renderer.setScissorTest(rendererEntry.scissorTest);};
  const runSort=options=>{inSort=true;try{return sorter.sort(options);}finally{inSort=false;}};
  const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const timeSort=async options=>{
    assert(timer,'GPU timer queries unavailable; do not substitute CPU submission time');
    assert(!gl.getParameter(timer.GPU_DISJOINT_EXT),'GPU timer disjoint before sample');
    query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);
    const start=performance.now();let output;
    try{output=runSort(options);}finally{gl.endQuery(timer.TIME_ELAPSED_EXT);}
    const submissionMs=performance.now()-start;gl.flush();
    while(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE))await wait();
    const disjoint=gl.getParameter(timer.GPU_DISJOINT_EXT),nanoseconds=gl.getQueryParameter(query,gl.QUERY_RESULT);
    gl.deleteQuery(query);query=null;
    assert(!disjoint,'GPU timer disjoint after sample');
    return {gpuMs:nanoseconds/1e6,submissionMs,passes:output.passes,count:output.count,capacity:output.capacity};
  };
  const uploadKeys=keys=>{
    const activeTexture=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);
    const binding=gl.getParameter(gl.TEXTURE_BINDING_2D),unpack=gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING);
    const stores=[gl.UNPACK_ALIGNMENT,gl.UNPACK_ROW_LENGTH,gl.UNPACK_SKIP_ROWS,gl.UNPACK_SKIP_PIXELS].map(key=>[key,gl.getParameter(key)]);
    try {
    if(sourceTexture)gl.deleteTexture(sourceTexture);
    sourceTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sourceTexture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R32UI,2048,keys.length/2048,0,gl.RED_INTEGER,gl.UNSIGNED_INT,keys);
    return sourceTexture;
    } finally {for(const [key,value]of stores)gl.pixelStorei(key,value);gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,unpack);gl.bindTexture(gl.TEXTURE_2D,binding);gl.activeTexture(activeTexture);}
  };
  try {
    b.splatOraclePaused=true;spark.autoUpdate=false;spark.driveSort=pauseSort;
    while(spark.sorting)await wait();
    assert(mesh?.numSplats===719538&&spark.activeSplats===719538,'Pinned all-active Sunset cohort required');
    assert(spark.sortRadial&&!mesh.context?.enableLod?.value&&!mesh.skinning&&!mesh.objectModifiers?.length&&!mesh.worldModifiers?.length&&!mesh.onFrame,'Unsupported variable source');
    assert(spark.sortWorker,'Existing installed sorter worker required');
    report.environment={renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),timerAvailable:!!timer,sourceCount:mesh.numSplats};
    const originalOrdering=spark.orderingTexture,originalActive=spark.activeSplats;
    for(const name of Object.keys(originals))gl[name]=function(...args){if(inSort)report.readbacksDuringSort[name]++;return originals[name].apply(this,args);};
    sorter=window.__createWebGLMergeSorter(gl);
    let seed=0x6e624eb7;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
    const special=[0,1,0x007fffff,0x00800000,0x3f800000,0x3f800001,0x7f7fffff,0x7f800000,0x7fc00000,0x80000000,0xbf800000,0xffffffff];
    const cases=[
      {name:'empty',count:0},{name:'one',count:1},{name:'two',count:2},{name:'odd',count:7},
      {name:'all-equal',count:257,kind:'equal'},{name:'all-invalid',count:257,kind:'invalid'},
      {name:'already-descending',count:513,kind:'descending'},{name:'ascending',count:513,kind:'ascending'},
      ...[4095,4096,4097,16383,16384,16385,32769].map(count=>({name:'boundary-'+count,count})),
      {name:'mixed-special-repeat',count:257},
    ];
    for(const fixture of cases){
      tick();const capacity=Math.max(16384,Math.ceil(fixture.count/16384)*16384),keys=new Uint32Array(capacity);
      // Deliberately valid keys in padding: the worker must ignore them.
      keys.fill(0x7f7fffff);
      for(let i=0;i<fixture.count;i++)keys[i]=fixture.kind==='equal'?0x3f800000:fixture.kind==='invalid'?special[7+i%5]:fixture.kind==='descending'?0x4f000000-i:fixture.kind==='ascending'?0x3f000000+i:i%4===0?special[i%special.length]:random();
      const reference=await sortReference(keys,fixture.count,capacity);
      // Independently check the recovered source contract against shipped WASM.
      const indices=Array.from({length:fixture.count},(_,i)=>i).filter(i=>keys[i]<0x7f800000).sort((a,c)=>keys[c]-keys[a]||a-c);
      const contract=new Uint32Array(capacity);contract.set(indices);
      assert(reference.activeSplats===indices.length&&compare(contract,reference.ordering).differences===0,'Installed worker disagrees with recovered source contract: '+fixture.name);
      runSort({sourceTexture:uploadKeys(keys),sourceKind:'r32ui',sourceWidth:2048,count:fixture.count,capacity});
      const result=sorter.readResultForValidation();
      const comparison=compare(result.ordering,reference.ordering);
      report.synthetics.push({name:fixture.name,count:fixture.count,capacity,activeCount:result.activeCount,workerActiveCount:reference.activeSplats,...comparison});
      assert(result.activeCount===reference.activeSplats&&comparison.differences===0,'GPU synthetic mismatch: '+fixture.name);
      assert(gl.getError()===gl.NO_ERROR,'WebGL error after synthetic '+fixture.name);
    }
    // Explicitly inspect stable keys from three real camera origins. No app
    // frames are delivered while a captured generation is being sorted.
    for(const offset of [0,1,-1]){
      tick();restoreRenderer();
      assert(route?.position&&route?.target,'Named portal route required for camera oracle');
      const position=route.position.map((v,i)=>v+(route.tangent?.[i]??(i===0?1:0))*offset);
      const target=route.target;
      const yaw=Math.atan2(position[0]-target[0],position[2]-target[2]);
      const pitch=Math.atan2(target[1]-position[1],Math.hypot(target[0]-position[0],target[2]-position[2]));
      app.fly.setPose(app.camera.position.clone().fromArray(position),yaw,pitch);
      spark.autoUpdate=true;b.splatOraclePaused=false;
      for(let i=0;i<10;i++)await bounded(new Promise(resolve=>requestAnimationFrame(resolve)));
      b.splatOraclePaused=true;spark.autoUpdate=false;
      const current=spark.current,targetTexture=current.target.textures[1];
      const nativeTexture=renderer.properties.get(targetTexture).__webglTexture;
      assert(nativeTexture&&current.numSplats===719538&&current.maxSplats===720896,'Unexpected current GPU depth target');
      const version=current.version,mappingVersion=current.mappingVersion,origin=current.viewOrigin.toArray();
      const options={sourceTexture:nativeTexture,sourceKind:'rgba8-array',sourceWidth:current.target.width,count:current.numSplats,capacity:current.maxSplats};
      const times=[];
      // Two full warm sorts, then five samples. Query includes initialization,
      // every merge pass and final packing; no result readback inside timer.
      for(let i=0;i<2;i++)await timeSort(options);
      for(let i=0;i<5;i++)times.push(await timeSort(options));
      const result=sorter.readResultForValidation();
      const keys=new Uint32Array(current.maxSplats);
      restoreRenderer();renderer.setRenderTarget(current.target,0);
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      await bounded(renderer.readRenderTargetPixelsAsync(current.target,0,0,current.target.width,current.target.height,new Uint8Array(keys.buffer),undefined,1));
      restoreRenderer();
      const reference=await sortReference(keys,current.numSplats,current.maxSplats),comparison=compare(result.ordering,reference.ordering);
      const stable=current===spark.current&&current.version===version&&current.mappingVersion===mappingVersion&&origin.every((v,i)=>v===current.viewOrigin.toArray()[i]);
      report.captures.push({offset,origin,count:current.numSplats,capacity:current.maxSplats,version,mappingVersion,sourceSha256:await hash(keys),orderingSha256:await hash(result.ordering),activeCount:result.activeCount,workerActiveCount:reference.activeSplats,stable,...comparison,times});
      assert(stable&&comparison.differences===0&&result.activeCount===reference.activeSplats,'GPU real-camera ordering mismatch');
      assert(gl.getError()===gl.NO_ERROR,'WebGL error after real capture');
      if(profileStages&&offset===0){report.stageDiagnostics=await bounded(window.__profileWebGLMergeStages(gl,sorter,options));assert(report.stageDiagnostics.status==='complete','GPU stage diagnostic failed: '+report.stageDiagnostics.error);}
    }
    assert(spark.orderingTexture===originalOrdering&&spark.activeSplats===originalActive,'Prototype must never publish ordering or active count');
    assert(report.readbacksDuringSort.readPixels===0&&report.readbacksDuringSort.getBufferSubData===0,'Recurring readback in prototype sort');
    report.status='exact-order-cost-measured';
  } catch(error){report.status='unavailable-or-failed';report.error=String(error.stack??error);}
  finally {
    if(query)gl.deleteQuery(query);
    sorter?.dispose();if(sourceTexture)gl.deleteTexture(sourceTexture);
    for(const name of Object.keys(originals))gl[name]=originals[name];
    restoreRenderer();spark.autoUpdate=saved.autoUpdate;if(spark.driveSort===pauseSort)spark.driveSort=saved.driveSort;b.splatOraclePaused=saved.paused;
    app.fly.setPose(cameraEntry.position,cameraEntry.yaw,cameraEntry.pitch);app.camera.rotation.order=cameraEntry.rotationOrder;app.camera.quaternion.copy(cameraEntry.quaternion);app.fly.velocity.copy(cameraEntry.velocity);
    const v=renderer.getViewport(vectorCopy),s=renderer.getScissor(vectorCopy);
    report.restored={autoUpdate:spark.autoUpdate===saved.autoUpdate,driveSort:spark.driveSort===saved.driveSort,frameGate:b.splatOraclePaused===saved.paused,cameraPosition:app.camera.position.toArray().every((n,i)=>n===cameraEntry.position.toArray()[i]),cameraQuaternion:app.camera.quaternion.toArray().every((n,i)=>n===cameraEntry.quaternion.toArray()[i]),flyPose:app.fly.yaw===cameraEntry.yaw&&app.fly.pitch===cameraEntry.pitch,renderTarget:renderer.getRenderTarget()===rendererEntry.target,viewport:['x','y','z','w'].every(key=>v[key]===rendererEntry.viewport[key]),scissor:['x','y','z','w'].every(key=>s[key]===rendererEntry.scissor[key])&&renderer.getScissorTest()===rendererEntry.scissorTest};
  }
  if(Object.values(report.restored).some(value=>value!==true)){report.status='unavailable-or-failed';report.error=(report.error?report.error+'\n':'')+'Diagnostic state restoration failed';}
  if(report.status==='unavailable-or-failed')report.sessionInvalidated=true;
  return report;
}
