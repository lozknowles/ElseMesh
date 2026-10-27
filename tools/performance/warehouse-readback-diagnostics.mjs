// Serialize this function into the already running Warehouse page. Diagnostic only.
export function installWarehouseReadbackDiagnostics({usage='original',restorePack=false,drainQueue=false,maxEvents=5000}={}) {
 const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;
 if(!a?.engine?.renderer||!b)throw Error('Warehouse runtime and benchmark are required');
 if(b.readbackProfile&&!b.readbackProfile.disposed)throw Error('Readback diagnostics already installed');
 if(!['original','STATIC_READ','DYNAMIC_READ','STREAM_DRAW'].includes(usage))throw Error('Unknown PBO usage diagnostic');
 if((restorePack&&usage!=='original')||(drainQueue&&(restorePack||usage!=='original')))throw Error('Change only one diagnostic variable per run');
 if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>100000)throw Error('maxEvents must be 1..100000');
 const renderer=a.engine.renderer,gl=renderer.getContext(),restores=[],events=[],calls=[],changes=[],counts={},firstStacks={};
 const ids={buffer:new WeakMap(),fence:new WeakMap(),framebuffer:new WeakMap(),target:new WeakMap()};
 const liveBuffers=new Map(),liveFences=new Map(),pending=new Map(),drains=new Map();
 const drainGL={fenceSync:gl.fenceSync,flush:gl.flush,wait:gl.clientWaitSync,deleteSync:gl.deleteSync};
 let nextId=0,sequence=0,dropped=0,disposed=false,scope=null,renderCalls=0;
 // Initial queries happen only at diagnostic installation, outside acceptance timing.
 let pack=gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING),readFramebuffer=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),drawFramebuffer=gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),readBuffer=gl.getParameter(gl.READ_BUFFER);
 const id=(kind,value)=>{if(!value)return null;let result=ids[kind].get(value);if(!result){result=kind+':'+(++nextId);ids[kind].set(value,result);}return result;};
 const bounded=(array,value)=>{if(array.length<maxEvents){array.push(value);return true;}dropped++;return false;};
 const clock=()=>({at:performance.now(),stage:b.stage??null,simulationFrame:b.simulationFrame??null,engineFrame:a.engine.frame??null,rendererFrame:renderer.info?.render?.frame??null,renderCalls});
 const record=(kind,extra={})=>{if(disposed)return null;counts[kind]=(counts[kind]??0)+1;const event={sequence:++sequence,kind,...clock(),...extra};bounded(events,event);return event;};
 const stack=key=>{if(!firstStacks[key])firstStacks[key]=(new Error().stack??'').split('\n').slice(2,14);};
 const wrap=(object,key,make)=>{const original=object[key];if(typeof original!=='function')throw Error('Required diagnostic method missing: '+key);const wrapped=make(original);object[key]=wrapped;restores.push(()=>{if(object[key]===wrapped)object[key]=original;});};
 const state=()=>({packBuffer:id('buffer',pack),readFramebuffer:id('framebuffer',readFramebuffer),drawFramebuffer:id('framebuffer',drawFramebuffer),readBuffer});
 const targetInfo=target=>({id:id('target',target),width:target?.width??null,height:target?.height??null,depth:target?.depth??target?.texture?.image?.depth??null,isArrayTarget:!!target?.isWebGLArrayRenderTarget,textures:(target?.textures??[]).slice(0,8).map(texture=>({id:texture.id??null,format:texture.format??null,type:texture.type??null,internalFormat:texture.internalFormat??null,isArrayTexture:!!texture.isDataArrayTexture,imageWidth:texture.image?.width??null,imageHeight:texture.image?.height??null,imageDepth:texture.image?.depth??null}))});
 const describeError=error=>{try{return String(error);}catch{return 'Unprintable error';}};
 const track=(map,object,value)=>{if(map.size<maxEvents)map.set(object,value);else dropped++;};
 const successful=status=>status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED;
 const releaseDrain=(call,reason)=>{
  const drain=call.drain;if(!drain)return;
  if(drain.timer){clearTimeout(drain.timer);drain.timer=null;}
  if(drain.sync){try{drainGL.deleteSync.call(gl,drain.sync);record('drain.deleteSync',{callId:call.id,fenceId:drain.fenceId});}catch(error){drain.cleanupError=describeError(error);}drain.sync=null;}
  if(drain.active){drain.active=false;drain.releasedAt=performance.now();drain.durationMs=drain.releasedAt-drain.startedAt;drain.renderCallsDuringDrain=renderCalls-drain.renderCallsAtStart;drain.releaseReason=reason;record('drain.release',{callId:call.id,reason,durationMs:drain.durationMs,renderCallsDuringDrain:drain.renderCallsDuringDrain});}
  if(b.readbackDrain?.callId===call.id)b.readbackDrain={...b.readbackDrain,active:false,releasedAt:drain.releasedAt,reason,error:drain.error??null};
  drains.delete(call.id);
 };
 const failDrain=(call,message)=>{call.drain.error=message;releaseDrain(call,'failed');throw Error(message);};
 const beginDrain=(call,originalStatus)=>{
  if(drains.size)throw Error('Queue-drain diagnostic requires one concurrent pinned readback');
  const startedAt=performance.now(),drain=call.drain={active:true,startedAt,renderCallsAtStart:renderCalls,originalStatus,polls:0,fenceId:null,sync:null,timer:null,error:null};
  drains.set(call.id,call);b.readbackDrain={active:true,callId:call.id,startedAt,deadlineAt:startedAt+1000,diagnosticOnly:true};
  try{
   if(gl.isContextLost())failDrain(call,'WebGL context lost before queue drain');
   drain.sync=drainGL.fenceSync.call(gl,gl.SYNC_GPU_COMMANDS_COMPLETE,0);
   if(!drain.sync)failDrain(call,'Queue-drain fence creation failed');
   drain.fenceId=id('fence',drain.sync);drainGL.flush.call(gl);
   record('drain.begin',{callId:call.id,fenceId:drain.fenceId,originalStatus,deadlineMs:1000});
   // Release the harness even if the vendor stops polling. Its next poll/copy rejects.
   drain.timer=setTimeout(()=>{if(!drain.active)return;drain.error='Queue-drain diagnostic exceeded 1000ms';releaseDrain(call,'deadline');},1000);
  }catch(error){drain.error=describeError(error);releaseDrain(call,'begin-error');throw error;}
 };
 try {
  wrap(renderer,'render',original=>function(...args){if(!disposed)renderCalls++;return original.apply(this,args);});
  wrap(gl,'createBuffer',original=>function(...args){const result=original.apply(this,args);if(!disposed&&scope&&result){const info={id:id('buffer',result),call:scope};track(liveBuffers,result,info);record('createBuffer',{callId:scope.id,bufferId:info.id});}return result;});
  wrap(gl,'bindBuffer',original=>function(...args){const result=original.apply(this,args);if(!disposed&&args[0]===gl.PIXEL_PACK_BUFFER){pack=args[1];const info=liveBuffers.get(pack);if(scope||info)record('bindBuffer',{callId:scope?.id??info?.call.id??null,bufferId:id('buffer',pack),target:args[0]});}return result;});
  wrap(gl,'bindFramebuffer',original=>function(...args){const result=original.apply(this,args);if(!disposed){if(args[0]===gl.FRAMEBUFFER||args[0]===gl.READ_FRAMEBUFFER)readFramebuffer=args[1];if(args[0]===gl.FRAMEBUFFER||args[0]===gl.DRAW_FRAMEBUFFER)drawFramebuffer=args[1];if(scope)record('bindFramebuffer',{callId:scope.id,target:args[0],framebufferId:id('framebuffer',args[1])});}return result;});
  wrap(gl,'readBuffer',original=>function(...args){const result=original.apply(this,args);if(!disposed){readBuffer=args[0];if(scope)record('readBuffer',{callId:scope.id,value:args[0]});}return result;});
  wrap(gl,'bufferData',original=>function(...args){if(disposed)return original.apply(this,args);const info=liveBuffers.get(pack),matched=!!scope&&info?.call===scope&&args[0]===gl.PIXEL_PACK_BUFFER&&args[1]===2883584;let forwarded=args;
   if(matched&&usage!=='original'){forwarded=args.slice();forwarded[2]=gl[usage];bounded(changes,{...clock(),callId:scope.id,bufferId:info.id,kind:'usage',from:args[2],to:forwarded[2],usage});}
   const start=performance.now();try{return original.apply(this,forwarded);}finally{if(scope&&args[0]===gl.PIXEL_PACK_BUFFER)record('bufferData',{callId:scope.id,bufferId:id('buffer',pack),bytes:typeof args[1]==='number'?args[1]:args[1]?.byteLength??null,originalUsage:args[2],usage:forwarded[2],matched,start,end:performance.now(),syncCpuMs:performance.now()-start});}
  });
  wrap(gl,'readPixels',original=>function(...args){if(disposed||!scope)return original.apply(this,args);const call=scope,start=performance.now();try{return original.apply(this,args);}finally{const end=performance.now();call.enqueue={...clock(),start,end,...state()};record('readPixels',{callId:call.id,...state(),x:args[0],y:args[1],width:args[2],height:args[3],format:args[4],type:args[5],destinationOffset:typeof args[6]==='number'?args[6]:null,start,end,syncCpuMs:end-start});}});
  wrap(gl,'fenceSync',original=>function(...args){const result=original.apply(this,args);if(!disposed&&scope&&result){const info={id:id('fence',result),call:scope};track(liveFences,result,info);record('fenceSync',{callId:scope.id,fenceId:info.id,condition:args[0],flags:args[1]});}return result;});
  wrap(gl,'clientWaitSync',original=>function(...args){
   const info=liveFences.get(args[0]);if(disposed||!info)return original.apply(this,args);
   const start=performance.now(),call=info.call,polledFence=drainQueue&&call.drain?'drain':'original';let status,returnedStatus,errorText;
   try{
    if(drainQueue&&call.drain){
     const drain=call.drain;
     if(drain.error)throw Error(drain.error);
     if(!drain.active||!drain.sync)failDrain(call,'Queue-drain state unavailable before copy');
     if(performance.now()-drain.startedAt>=1000)failDrain(call,'Queue-drain diagnostic exceeded 1000ms');
     if(gl.isContextLost())failDrain(call,'WebGL context lost during queue drain');
     const pollStart=performance.now();status=drainGL.wait.call(gl,drain.sync,0,0);drain.polls++;
     record('drain.clientWaitSync',{callId:call.id,fenceId:drain.fenceId,status,flags:0,timeout:0,start:pollStart,end:performance.now()});
     if(status===gl.WAIT_FAILED)failDrain(call,'Queue-drain fence wait failed');
     if(successful(status)){drain.signalledAt=performance.now();returnedStatus=drain.originalStatus;}
     else if(status===gl.TIMEOUT_EXPIRED)returnedStatus=gl.TIMEOUT_EXPIRED;
     else failDrain(call,'Unexpected queue-drain fence status: '+status);
    }else{
     status=original.apply(this,args);
     if(successful(status)&&call.firstSignalledAt===null)call.firstSignalledAt=performance.now();
     returnedStatus=status;
     if(drainQueue){
      if(status===gl.WAIT_FAILED||gl.isContextLost())throw Error('Original readback fence wait failed or WebGL context lost');
      if(successful(status)){beginDrain(call,status);returnedStatus=gl.TIMEOUT_EXPIRED;}
     }
    }
    return returnedStatus;
   }catch(error){errorText=describeError(error);call.diagnosticError=errorText;if(call.drain){call.drain.error=errorText;releaseDrain(call,'poll-error');}if(drainQueue){returnedStatus=gl.WAIT_FAILED;return returnedStatus;}throw error;}
   finally{const end=performance.now();call.fencePollCount++;record('clientWaitSync',{callId:call.id,fenceId:info.id,flags:args[1],timeout:args[2],status:status??null,returnedStatus:returnedStatus??null,polledFence,statusName:status===gl.ALREADY_SIGNALED?'ALREADY_SIGNALED':status===gl.CONDITION_SATISFIED?'CONDITION_SATISFIED':status===gl.TIMEOUT_EXPIRED?'TIMEOUT_EXPIRED':status===gl.WAIT_FAILED?'WAIT_FAILED':'unknown-or-threw',error:errorText??null,start,end,syncCpuMs:end-start});}
  });
  wrap(gl,'getBufferSubData',original=>function(...args){
   const info=args[0]===gl.PIXEL_PACK_BUFFER?liveBuffers.get(pack):null;if(disposed||!info)return original.apply(this,args);
   stack('getBufferSubData');const call=info.call,destination=args[2],elementBytes=destination?.BYTES_PER_ELEMENT??1,offset=args[3]??0,length=args[4]??0,bytes=length?length*elementBytes:Math.max(0,(destination?.byteLength??0)-offset*elementBytes);
   const atCopy={...clock(),...state()};let start=null,end=null;
   try{
    if(drainQueue){if(call.drain?.error)throw Error(call.drain.error);if(!call.drain?.active||!call.drain.signalledAt)throw Error('Queue drain did not signal before matched copy');if(performance.now()-call.drain.startedAt>=1000)failDrain(call,'Queue-drain diagnostic exceeded 1000ms');if(gl.isContextLost())failDrain(call,'WebGL context lost before matched copy');}
    start=performance.now();const result=original.apply(this,args);end=performance.now();
    if(drainQueue){
     if(gl.isContextLost())failDrain(call,'WebGL context lost during matched copy');
     const comparison=new Uint8Array(destination.length),secondArgs=args.slice();secondArgs[2]=comparison;
     const secondStart=performance.now();original.apply(this,secondArgs);const secondEnd=performance.now();
     if(gl.isContextLost())failDrain(call,'WebGL context lost during comparison copy');
     const compareStart=performance.now();let differingBytes=0,firstDifference=null;
     for(let index=0;index<destination.length;index++)if(destination[index]!==comparison[index]){differingBytes++;if(firstDifference===null)firstDifference=index;}
     call.copyComparison={bytes:comparison.byteLength,start:secondStart,end:secondEnd,syncCpuMs:secondEnd-secondStart,differingBytes,firstDifference,identical:differingBytes===0,comparisonCpuMs:performance.now()-compareStart};record('drain.copyComparison',{callId:call.id,...call.copyComparison});
    }
    return result;
   }catch(error){if(call.drain)call.drain.error=describeError(error);throw error;}
   finally{
    if(start!==null){end??=performance.now();call.copy={...atCopy,start,end,syncCpuMs:end-start,bytes,sourceByteOffset:args[1],destinationElementOffset:offset,lengthElements:args[4]??null,bufferId:info.id,renderCallsSinceEnqueue:atCopy.renderCalls-(call.enqueue?.renderCalls??call.entry.renderCalls)};record('getBufferSubData',{callId:call.id,...call.copy});}
    if(drainQueue)releaseDrain(call,call.drain?.error?'copy-error':'copy-complete');
   }
  });
  for(const [method,map,kind] of [['deleteBuffer',liveBuffers,'buffer'],['deleteSync',liveFences,'fence']])wrap(gl,method,original=>function(...args){const info=map.get(args[0]);const result=original.apply(this,args);if(!disposed&&info){record(method,{callId:info.call.id,[kind+'Id']:info.id});map.delete(args[0]);}return result;});
  wrap(renderer,'readRenderTargetPixelsAsync',original=>function(...args){
   if(disposed)return original.apply(this,args);
   const target=args[0],attachment=args[7]??0,depth=target?.depth??target?.texture?.image?.depth;
   const matched=args[1]===0&&args[2]===0&&args[3]===2048&&args[4]===352&&args[5] instanceof Uint8Array&&args[5].length===2883584&&attachment===1&&depth===1&&!!target?.isWebGLArrayRenderTarget;
   record('readbackInvocation',{matched,width:args[3],height:args[4],bytes:args[5]?.byteLength??null,attachment});
   if(!matched)return original.apply(this,args);
   stack('readRenderTargetPixelsAsync');
   // Entry state is intentionally queried per pinned diagnostic call, never per draw.
   pack=gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);readFramebuffer=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);drawFramebuffer=gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);readBuffer=gl.getParameter(gl.READ_BUFFER);
   const entryPack=pack,parent=scope,call={id:++sequence,entry:{...clock(),...state()},target:targetInfo(target),attachment,activeCubeFaceIndex:args[6]??null,fencePollCount:0,firstSignalledAt:null,status:'invoking',concurrentPinnedCalls:pending.size};bounded(calls,call);track(pending,call.id,call);scope=call;let promise;
   try{promise=original.apply(this,args);call.synchronousReturn={...clock(),...state()};call.status='pending';}
   catch(error){call.status='threw';call.error=describeError(error);pending.delete(call.id);throw error;}
   finally{scope=parent;if(restorePack){const before=id('buffer',pack);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,entryPack);bounded(changes,{...clock(),callId:call.id,kind:'restorePackAfterSynchronousReturn',before,after:id('buffer',pack),entry:id('buffer',entryPack)});}}
   if(promise&&typeof promise.then==='function')promise.then(()=>{if(call.drain)releaseDrain(call,'fulfilled');if(disposed)return;call.status='fulfilled';call.settledAt=performance.now();call.readbackWallMs=call.settledAt-call.entry.at;pending.delete(call.id);},error=>{if(call.drain){call.drain.error??=describeError(error);releaseDrain(call,'rejected');}if(disposed)return;call.status='rejected';call.error=describeError(error);call.settledAt=performance.now();call.readbackWallMs=call.settledAt-call.entry.at;pending.delete(call.id);});
   else{call.status='returned-non-promise';pending.delete(call.id);}
   return promise; // Preserve exact original Promise identity and rejection semantics.
  });
 } catch(error) {for(const call of [...drains.values()])releaseDrain(call,'installation-error');disposed=true;for(const restore of restores.reverse())restore();throw error;}
 const api={get disposed(){return disposed;},snapshot(){return JSON.parse(JSON.stringify({diagnosticOnly:true,usage,restorePack,drainQueue,maxEvents,disposed,collectedAt:performance.now(),performanceTimeOrigin:performance.timeOrigin,events,calls,changes,counts,firstStacks,droppedRecords:dropped,activeDrains:[...drains.keys()],harnessDrain:b.readbackDrain??null,pendingCalls:[...pending.values()].map(call=>({id:call.id,status:call.status,startedAt:call.entry.at})),liveBuffers:[...liveBuffers.values()].map(info=>({id:info.id,callId:info.call.id})),liveFences:[...liveFences.values()].map(info=>({id:info.id,callId:info.call.id})),notes:['Instrumentation changes CPU timing; diagnostic output is not acceptance timing.',drainQueue?'QUEUE DRAIN DIAGNOSTIC ONLY: adds a fence, flush, zero-timeout polls and a second CPU copy/byte comparison. Harness must defer all rAF callbacks while readbackDrain.active. Never acceptance FPS.':'Only existing renderer and WebGL resources are observed. No extra waits, readPixels, finish or flush calls.','Drain deadline releases the harness asynchronously; JavaScript cannot interrupt a synchronous driver call or force a stalled vendor Promise to reject without replacing its identity.','Pending promises at disposal remain pending in this snapshot; wrappers restore only when still owned.']}));},dispose(){if(disposed)return api.snapshot();for(const call of [...drains.values()])releaseDrain(call,'dispose');disposed=true;for(const restore of restores.reverse())restore();return api.snapshot();}};
 b.readbackProfile=api;
 return {diagnosticOnly:true,usage,restorePack,drainQueue,maxEvents,installedAt:performance.now(),pinnedSignature:{width:2048,height:352,bytes:2883584,attachment:1,arrayDepth:1}};
}
