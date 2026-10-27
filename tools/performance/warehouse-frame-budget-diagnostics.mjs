// Serialized into the existing Warehouse page. Alters submission cadence for diagnosis only.
export function installWarehouseFrameBudgetDiagnostics({budget=2,maxEvents=10000}={}) {
 const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark,renderer=a?.engine?.renderer;
 if(!b||!renderer?.isWebGLRenderer||a.backend!=='webgl2')throw Error('Existing Warehouse WebGL2 runtime and benchmark required');
 if(b.frameBudget&&!b.frameBudget.disposed)throw Error('Frame-budget diagnostics already installed');
 if(!Number.isSafeInteger(budget)||budget<1||budget>64)throw Error('budget must be an integer from 1 to 64');
 if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>100000)throw Error('maxEvents must be an integer from 1 to 100000');
 const gl=renderer.getContext(),events=[],queue=[],sorts=[],restores=[];
 const sortProvenance={available:false,reason:'Sunset Spark not selected',entryId:null,sparkId:null,observerErrors:0,overlaps:0,missingAssociations:0,wrappers:[]};
 let spark=null,activeSort=null,completedSort=null,sortSequence=0;
 let disposed=false,error=null,nextId=0,droppedRecords=0,maxInflight=0,attemptedSlots=0,deniedSlots=0,acceptedSlots=0,submittedFrames=0,fencesCreated=0,fencesDeleted=0,maxOldestAgeMs=0;
 const clock=()=>({at:performance.now(),stage:b.stage??null,simulationFrame:b.simulationFrame??null,engineFrame:a.engine.frame??null,rendererFrame:renderer.info?.render?.frame??null});
 const record=(kind,details={})=>{const event={kind,...clock(),...details};if(events.length<maxEvents)events.push(event);else droppedRecords++;};
 const textError=value=>{try{return String(value);}catch{return 'Unprintable error';}};
 const safely=operation=>{try{return operation();}catch(value){sortProvenance.observerErrors++;sortProvenance.reason='Sort observation unavailable: '+textError(value);try{record('sortObserverError',{error:textError(value)});}catch{}return null;}};
 const vector=value=>value&&[value.x,value.y,value.z].every(Number.isFinite)?[value.x,value.y,value.z]:null;
 const sourceInfo=current=>({version:Number.isFinite(current?.version)?current.version:null,mappingVersion:Number.isFinite(current?.mappingVersion)?current.mappingVersion:null,viewOrigin:vector(current?.viewOrigin),viewDirection:vector(current?.viewDirection)});
 const distance=(left,right)=>left&&right?Math.hypot(...left.map((value,index)=>value-right[index])):null;
 const directionDifference=(left,right)=>{if(!left||!right)return null;const denominator=Math.hypot(...left)*Math.hypot(...right);return denominator?Math.acos(Math.max(-1,Math.min(1,left.reduce((sum,value,index)=>sum+value*right[index],0)/denominator))):null;};
 const freshness=()=>{
  if(!spark)return {available:false,current:null,display:null,completedSortId:null,completedSortAgeMs:null,sourceAgeMs:null,sourceVersionGap:null,sourceOriginDistance:null,sourceDirectionRadians:null};
  const current=sourceInfo(spark.current),display=sourceInfo(spark.display),source=completedSort?.source??null;
  return {available:sortProvenance.available,current,display,sorting:spark.sorting??null,activeSortId:activeSort?.id??null,completedSortId:completedSort?.id??null,completedSortAgeMs:completedSort?performance.now()-completedSort.completedAt:null,sourceAgeMs:completedSort?performance.now()-completedSort.readbackRequestedAt:null,sourceVersionGap:source?.version!==null&&source?.version!==undefined&&current.version!==null?current.version-source.version:null,displaySourceVersionGap:source?.version!==null&&source?.version!==undefined&&display.version!==null?display.version-source.version:null,sourceOriginDistance:distance(current.viewOrigin,source?.viewOrigin),sourceDirectionRadians:directionDifference(current.viewDirection,source?.viewDirection),displayOriginDistance:distance(display.viewOrigin,source?.viewOrigin),displayDirectionRadians:directionDifference(display.viewDirection,source?.viewDirection)};
 };
 const wrapSort=(object,key,make)=>{
  if(!object||typeof object[key]!=='function'){sortProvenance.reason='Missing existing sort observation method: '+key;return false;}
  const original=object[key],wrapped=make(original);object[key]=wrapped;
  restores.push(()=>{if(object[key]===wrapped)object[key]=original;});sortProvenance.wrappers.push(key);return true;
 };
 const observePromise=(promise,fulfilled,rejected)=>{if(promise&&typeof promise.then==='function')promise.then(()=>{if(!disposed)safely(fulfilled);},value=>{if(!disposed)safely(()=>rejected(value));});else safely(()=>rejected('Original method returned no Promise'));};
 safely(()=>{
  const candidates=[...(a.portals?.views?.entries?.values?.()??[])].filter(entry=>entry.candidate?.splatScene?.spark&&/sunset/i.test(String(entry.source?.name??'')+' '+String(entry.id??'')));
  if(candidates.length!==1){sortProvenance.reason='Expected exactly one Sunset portal Spark; found '+candidates.length;return;}
  const entry=candidates[0];spark=entry.candidate.splatScene.spark;sortProvenance.entryId=entry.id??null;sortProvenance.sparkId=spark.id??null;
  const readbackWrapped=wrapSort(spark,'readbackDepth',original=>function(...args){
   if(disposed)return original.apply(this,args);
   const observed=safely(()=>{
    const overlap=!!activeSort;if(activeSort){activeSort.status='overlapped';activeSort.associationValid=false;sortProvenance.overlaps++;}
    const item={id:++sortSequence,...clock(),readbackRequestedAt:performance.now(),source:sourceInfo(args[0]?.current),sourceProvided:!!args[0]?.current,status:'readback-pending',workerDone:false,associationValid:!overlap};
    if(sorts.length<maxEvents)sorts.push(item);else droppedRecords++;activeSort=item;record('sort.readbackRequest',{sortId:item.id,source:item.source,sourceProvided:item.sourceProvided});return item;
   });
   let result;try{result=original.apply(this,args);}catch(value){safely(()=>{if(observed){observed.status='readback-threw';observed.error=textError(value);if(activeSort===observed)activeSort=null;}record('sort.readbackThrow',{sortId:observed?.id??null,error:textError(value)});});throw value;}
   observePromise(result,()=>{if(observed){observed.readbackResolvedAt=performance.now();observed.status='readback-ready';record('sort.readbackResult',{sortId:observed.id});}},value=>{if(observed){observed.status='readback-rejected';observed.error=textError(value);if(activeSort===observed)activeSort=null;record('sort.readbackReject',{sortId:observed.id,error:observed.error});}});
   return result;
  });
  const workerWrapped=wrapSort(spark.sortWorker,'call',original=>function(...args){
   if(disposed||args[0]!=='sortSplats32')return original.apply(this,args);
   const observed=safely(()=>{const item=activeSort;if(!item||!item.associationValid){sortProvenance.missingAssociations++;record('sort.workerUnassociated');return null;}item.workerRequestedAt=performance.now();item.status='worker-pending';record('sort.workerRequest',{sortId:item.id,method:args[0]});return item;});
   let result;try{result=original.apply(this,args);}catch(value){safely(()=>{if(observed){observed.status='worker-threw';observed.error=textError(value);if(activeSort===observed)activeSort=null;}record('sort.workerThrow',{sortId:observed?.id??null,error:textError(value)});});throw value;}
   observePromise(result,()=>{if(observed){observed.workerResolvedAt=performance.now();observed.workerDone=true;observed.status='worker-ready';record('sort.workerResult',{sortId:observed.id});}},value=>{if(observed){observed.status='worker-rejected';observed.error=textError(value);if(activeSort===observed)activeSort=null;record('sort.workerReject',{sortId:observed.id,error:observed.error});}});
   return result;
  });
  const dirtyWrapped=wrapSort(spark,'setDirty',original=>function(...args){
   let result;try{result=original.apply(this,args);}catch(value){if(!disposed)safely(()=>record('sort.setDirtyThrow',{sortId:activeSort?.id??null,error:textError(value)}));throw value;}
   if(!disposed)safely(()=>{if(spark.sorting===false&&activeSort?.workerDone){const item=activeSort;item.completedAt=performance.now();item.status='completed';item.completionCurrent=sourceInfo(spark.current);item.completionDisplay=sourceInfo(spark.display);completedSort=item;activeSort=null;record('sort.completed',{sortId:item.id,sourceAgeMs:item.completedAt-item.readbackRequestedAt,workerMs:item.workerResolvedAt-item.workerRequestedAt});}});
   return result;
  });
  sortProvenance.available=readbackWrapped&&workerWrapped&&dirtyWrapped;
  sortProvenance.reason=sortProvenance.available?null:sortProvenance.reason;
 });
 const oldestAge=()=>queue.length?Math.max(0,performance.now()-queue[0].createdAt):0;
 const removeFence=(item,reason)=>{
  const start=performance.now();try{gl.deleteSync(item.sync);fencesDeleted++;item.deleted=true;record('deleteFence',{fenceId:item.id,reason,start,end:performance.now()});}
  catch(value){record('deleteFenceError',{fenceId:item.id,reason,error:textError(value),start,end:performance.now()});throw value;}
 };
 const clean=(reason)=>{const failures=[];for(let index=queue.length-1;index>=0;index--){const item=queue[index];try{removeFence(item,reason);queue.splice(index,1);}catch(value){failures.push(textError(value));}}return failures;};
 const fail=value=>{
  error??=textError(value);record('failure',{error,oldestAgeMs:oldestAge(),inflight:queue.length});
  clean('failure');throw Error(error);
 };
 const check=()=>{if(disposed)throw Error('Frame-budget diagnostics disposed');if(error)throw Error(error);if(gl.isContextLost())fail('WebGL context lost during frame-budget diagnostic');};
 const checkAge=()=>{const age=oldestAge();maxOldestAgeMs=Math.max(maxOldestAgeMs,age);if(age>=1000)fail('Frame-budget fence exceeded 1000ms');return age;};
 const api={
  get disposed(){return disposed;},
  shouldSubmit(){
   const start=performance.now();let allowed=null;
   attemptedSlots++;
   try{
    check();const ageAtEntry=checkAge();
    // Poll every owned fence once without waiting; there are at most budget fences.
    for(let index=0;index<queue.length;){
     const item=queue[index],pollStart=performance.now();let status;
     try{status=gl.clientWaitSync(item.sync,0,0);}catch(value){fail(value);}
     record('pollFence',{fenceId:item.id,status,flags:0,timeout:0,start:pollStart,end:performance.now(),ageMs:performance.now()-item.createdAt});
     if(gl.isContextLost())fail('WebGL context lost while polling frame-budget fence');
     if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED){try{removeFence(item,'signalled');}catch(value){fail(value);}queue.splice(index,1);}
     else if(status===gl.TIMEOUT_EXPIRED)index++;
     else if(status===gl.WAIT_FAILED)fail('Frame-budget fence wait failed');
     else fail('Unexpected frame-budget fence status: '+status);
    }
    checkAge();allowed=queue.length<budget;
    if(allowed)acceptedSlots++;else deniedSlots++;
    record('submissionDecision',{allowed,inflight:queue.length,oldestAgeAtEntryMs:ageAtEntry,oldestAgeMs:oldestAge(),start,end:performance.now()});
    return allowed;
   }catch(value){if(!error&&!disposed)fail(value);throw value;}
   finally{record('shouldSubmit',{allowed,start,end:performance.now(),inflight:queue.length});}
  },
  afterFrame(){
   const start=performance.now();let item=null;
   try{
    check();checkAge();
    if(queue.length>=budget)fail('afterFrame exceeded frame-budget capacity');
    const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
    if(!sync)fail('Frame-budget fence creation failed');
    item={id:++nextId,sync,createdAt:performance.now(),deleted:false};queue.push(item);fencesCreated++;submittedFrames++;maxInflight=Math.max(maxInflight,queue.length);
    record('createFence',{fenceId:item.id,condition:gl.SYNC_GPU_COMMANDS_COMPLETE,flags:0,inflight:queue.length,start,end:performance.now()});
    gl.flush();record('flush',{fenceId:item.id,start,end:performance.now()});
    if(gl.isContextLost())fail('WebGL context lost after frame-budget fence submission');
   }catch(value){if(!error&&!disposed)fail(value);throw value;}
   finally{record('afterFrame',{fenceId:item?.id??null,start,end:performance.now(),inflight:queue.length,sortFreshness:safely(freshness)});}
  },
  snapshot(){return {diagnosticOnly:true,budget,maxEvents,disposed,error,collectedAt:performance.now(),performanceTimeOrigin:performance.timeOrigin,attemptedSlots,acceptedSlots,deniedSlots,submittedFrames,fencesCreated,fencesDeleted,maxInflight,maxOldestAgeMs,currentOldestAgeMs:oldestAge(),pendingFences:queue.map(item=>({id:item.id,createdAt:item.createdAt,ageMs:performance.now()-item.createdAt})),sortProvenance:{...sortProvenance,wrappers:[...sortProvenance.wrappers]},sortFreshness:safely(freshness),sorts:JSON.parse(JSON.stringify(sorts)),pendingSortId:activeSort?.id??null,droppedRecords,events:events.map(event=>({...event})),notes:['Cadence is deliberately altered; never use these FPS results as acceptance evidence.','Harness calls shouldSubmit before a whole app frame and afterFrame exactly once after each submitted whole app frame.','Only owned frame fences are polled/deleted. Polls use flags 0 and timeout 0. A fence and flush are added after each submitted frame.','The 1000ms age limit is checked on helper calls; no timers or rAF interception are installed.','Sort freshness observes only the named Sunset portal instance and existing worker. Completion is the observed setDirty after worker success with sorting false; it does not prove presentation or GPU visibility. Initial completion age and gaps remain null.']};},
  dispose(){if(!disposed){const cleanupErrors=clean('dispose');disposed=true;for(const restore of restores.reverse())safely(restore);record('dispose',{cleanupErrors,pendingFences:queue.length});if(cleanupErrors.length)error??='Fence cleanup failed: '+cleanupErrors.join('; ');}return api.snapshot();}
 };
 b.frameBudget=api;
 return {diagnosticOnly:true,budget,maxEvents,installedAt:performance.now()};
}
