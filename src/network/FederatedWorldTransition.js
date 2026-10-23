const runtimeKey = ({ownerNodeId,worldId,regionId,version}) =>
  [ownerNodeId,worldId,regionId,version].join('|');

/** Registry for preinstalled world packages. Network manifests never execute code. */
export class FederatedWorldRuntimeRegistry {
  constructor({verifyManifest}={}){
    if(typeof verifyManifest!=='function')throw new Error('World manifest verifier is required');
    this.verifyManifest=verifyManifest;this.packages=new Map();
  }
  register({ownerNodeId,worldId,regionId,version,manifestHash,prepare}={}){
    if(!/^elsemesh-node:[a-f0-9]{64}$/.test(ownerNodeId??'')||
       !/^elsemesh-world:[A-Za-z0-9._-]{1,128}$/.test(worldId??'')||
       !/^elsemesh-region:[A-Za-z0-9._-]{1,128}$/.test(regionId??'')||
       !Number.isSafeInteger(version)||version<1||
       !/^sha256:[a-f0-9]{64}$/.test(manifestHash)||typeof prepare!=='function')
      throw new Error('Invalid preinstalled world package registration');
    const key=runtimeKey({ownerNodeId,worldId,regionId,version});
    if(this.packages.has(key))throw new Error('World package is already registered');
    this.packages.set(key,{prepare,manifestHash});
    return ()=>this.packages.delete(key);
  }
  async prepare({manifest,signal}={}){
    const d=manifest?.descriptor;
    if(!manifest||manifest.kind!=='region-version'||manifest.signer!==d?.ownerNodeId||
       !/^sha256:[a-f0-9]{64}$/.test(manifest.manifestHash??'')||
       !Number.isSafeInteger(d?.version)||!await this.verifyManifest(manifest))throw new Error('Unverified or invalid world manifest');
    const entry=this.packages.get(runtimeKey({ownerNodeId:manifest.signer,worldId:d.worldId,regionId:d.regionId,version:d.version}));
    if(!entry)throw new Error('No preinstalled runtime matches the signed destination world package');
    if(entry.manifestHash&&entry.manifestHash!==manifest.manifestHash)
      throw new Error('Signed destination manifest does not match the pinned runtime package');
    const runtime=await entry.prepare({manifest,signal});
    if(signal?.aborted){await runtime?.dispose?.();throw new Error('World preparation was cancelled');}
    if(!runtime||typeof runtime.activate!=='function')throw new Error('Prepared world package has no activation boundary');
    return runtime;
  }
}

/**
 * Two-phase client coordinator. The destination package is prepared before the
 * source authority fences the player. After handoff issuance, failures remain
 * suspended until a future reconciliation protocol can prove safe resumption.
 */
export class FederatedWorldTransition {
  constructor({sourceClient,destinationClient,runtimeRegistry,sourceRuntime,portal,avatarAssetId,inventoryHash,controlMode='HUMAN',onState=()=>{}}={}){
    if(!sourceClient||!destinationClient||!runtimeRegistry||!sourceRuntime||typeof sourceRuntime.suspend!=='function'||!portal||typeof portal.portalId!=='string')throw Error('Federated world transition dependencies are incomplete');
    Object.assign(this,{sourceClient,destinationClient,runtimeRegistry,sourceRuntime,portal,avatarAssetId,inventoryHash,controlMode,onState});
    this.generation=0;this.activeRuntime=sourceRuntime;this.state='idle';
  }
  set state(value){this._state=value;this.onState?.(value);}
  get state(){return this._state;}
  async restoreBeforeHandoff(candidate,error){
    try{await candidate?.dispose?.();await this.sourceRuntime.resume?.();this.state='idle';}
    catch(recoveryError){this.state='outcome-unknown';throw new AggregateError([error,recoveryError],'Source resumption could not be proved; controls remain suspended');}
    throw error;
  }
  async travel({signal}={}){
    if(this.state!=='idle')throw Error('A world transition is already active');
    const generation=++this.generation;
    if(signal?.aborted)throw Error('World transition cancelled before preparation');
    this.state='preparing';let candidate;
    try{
      await Promise.all([this.sourceClient.ready,this.destinationClient.ready]);
      if(this.destinationClient.mode!=='visit'||!this.destinationClient.grant?.permissions.includes('visit'))throw Error('Destination visit admission is required');
      if(this.destinationClient.manifest?.descriptor?.regionId!==this.portal.destinationRegion)throw Error('Destination manifest does not match the portal');
      candidate=await this.runtimeRegistry.prepare({manifest:this.destinationClient.manifest,signal});
      if(signal?.aborted||generation!==this.generation)throw Error('World transition cancelled before handoff');
      this.state='suspending';await this.sourceRuntime.suspend();
      if(signal?.aborted||generation!==this.generation)throw Error('World transition cancelled before handoff');
    }catch(error){return this.restoreBeforeHandoff(candidate,error);}
    this.state='handoff-pending';
    try{
      const handoff=await this.sourceClient.requestHandoff({portalId:this.portal.portalId,destinationRegion:this.portal.destinationRegion,destinationAuthority:this.destinationClient.owner,destinationSessionId:this.destinationClient.grant.sessionId,avatarAssetId:this.avatarAssetId,inventoryHash:this.inventoryHash,controlMode:this.controlMode});
      if(signal?.aborted||generation!==this.generation)throw Error('Handoff was issued; source remains suspended pending reconciliation');
      this.state='destination-pending';const pending=this.waitForArrival(handoff.handoffId,signal,generation);void pending.promise.catch(()=>{});let arrival;
      try{await this.destinationClient.travel(handoff);arrival=await pending.promise;}catch(error){pending.dispose();throw error;}
      if(signal?.aborted||generation!==this.generation)throw Error('Destination outcome changed after cancellation; reconciliation required');
      this.state='activating';await candidate.activate(arrival.spawn,{arrival,manifest:this.destinationClient.manifest,handoff});
      this.activeRuntime=candidate;this.state='active';let cleanupError=null;try{await this.sourceRuntime.dispose?.();}catch(error){cleanupError=error;}
      return {arrival,runtime:candidate,...cleanupError?{cleanupError}:{}};
    }catch(error){if(this.state!=='active'){try{await candidate?.dispose?.();}catch{}this.state='outcome-unknown';}throw error;}
  }
  waitForArrival(handoffId,signal,generation){
    let off,timer,abort;const promise=new Promise((resolve,reject)=>{
      const finish=(fn,value)=>{off?.();clearTimeout(timer);signal?.removeEventListener('abort',abort);fn(value);};
      abort=()=>finish(reject,Error('Transition wait cancelled after handoff; source remains suspended'));
      off=this.destinationClient.onMessage(message=>{if(generation!==this.generation)return finish(reject,Error('Superseded transition'));if(message.type==='travel-admitted'&&message.arrival?.handoffId===handoffId)finish(resolve,message.arrival);else if(['error','protocol-error','disconnected','denied'].includes(message.type))finish(reject,Error(message.error||'Destination travel failed'));});
      timer=setTimeout(()=>finish(reject,Error('Destination travel outcome unknown; source remains suspended')),15000);signal?.addEventListener('abort',abort,{once:true});
    });return {promise,dispose:()=>{off?.();clearTimeout(timer);signal?.removeEventListener('abort',abort);}};
  }
  async reconcile({runtime,arrival}={}){
    if(this.state!=='outcome-unknown'||!runtime||!arrival)throw Error('No unresolved transition to reconcile');
    this.state='activating';try{await runtime.activate(arrival.spawn,{arrival});this.activeRuntime=runtime;this.state='active';return {arrival,runtime};}catch(error){this.state='outcome-unknown';throw error;}
  }
  async proveCancelled({proof}={}){if(this.state!=='outcome-unknown'||!proof||!['cancelled','expired'].includes(proof.state))throw Error('Authoritative cancellation proof required');await this.sourceRuntime.resume?.();this.state='idle';return true;}
  cancel(){this.generation++;if(['handoff-pending','destination-pending','activating'].includes(this.state))this.state='outcome-unknown';}
}
