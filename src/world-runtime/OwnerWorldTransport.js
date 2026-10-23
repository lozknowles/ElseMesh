import {PortalTransport} from './PortalTransport.js';
import {verifyRuntimeSignature} from './RepositorySession.js';
import {canonical} from './vendor/world-engine-contract.js';
const encoder=new TextEncoder(),base64=bytes=>{let out='';for(const byte of bytes)out+=String.fromCharCode(byte);return btoa(out);};
/** One same-origin connection. Every destination still authorizes its own world. */
export class OwnerWorldTransport extends PortalTransport {
 constructor(options={}){super(options);this.ownerConfig=options.config;this.ownerRequestSequence=0;this.ownerHandoffCommits=true;this.ownerViews=new Set();this.ownerGrantExpiry=new Map();this.ownerLanes=new Map();this.ownerViewRenewals=new Map();this.ownerViewFresh=new Map();this.ownerWorldEpoch=new Map();this.ownerWorldOnline=new Map();this.events.worldStatus=options.worldStatus??(()=>{});this.ownerRequestTimeoutMs=options.ownerRequestTimeoutMs??5000;if(!Number.isSafeInteger(this.ownerRequestTimeoutMs)||this.ownerRequestTimeoutMs<100||this.ownerRequestTimeoutMs>20000)throw Error('Invalid owner request timeout');}
 close(){this.disconnect();}
 async sign(value){const payload={...JSON.parse(JSON.stringify(value)),signer:this.identity.nodeId,publicKey:this.identity.publicKeyPEM??this.identity.publicKey};return {...payload,signature:base64(new Uint8Array(await crypto.subtle.sign('Ed25519',this.identity.privateCryptoKey??this.identity.privateKey,encoder.encode(canonical(payload)))))};}
 localOwnerWorld(){return this.ownerConfig?.defaultWorldId??this.ownerConfig?.contacts?.find(c=>c.authorityNodeId===this.ownerConfig?.serverNodeId)?.worldId;}
 markWorldOffline(worldId){
  if(!worldId||worldId===this.localOwnerWorld())return;
  this.ownerWorldEpoch.set(worldId,(this.ownerWorldEpoch.get(worldId)??0)+1);this.ownerGrantExpiry.delete(worldId);this.ownerViewFresh.delete(worldId);
  if(this.ownerWorldOnline.get(worldId)!==false){this.ownerWorldOnline.set(worldId,false);this.events.presence({worldId,players:[]});this.events.worldStatus({worldId,status:'offline'});}
  if(worldId===this.worldId)this.setFrozen(true);
 }
 markWorldLive(worldId,epoch,connection){
  const fresh=this.ownerViewFresh.get(worldId);
  if(connection!==this.connectionEpoch||epoch!==(this.ownerWorldEpoch.get(worldId)??0)||fresh?.epoch!==epoch||fresh.connection!==connection)return;
  if(this.ownerWorldOnline.get(worldId)!==true){this.ownerWorldOnline.set(worldId,true);this.events.worldStatus({worldId,status:'live'});}
 }
 sendOwnerEnvelope(envelope,laneId){
  if([...this.ownerLanes.values()].reduce((n,l)=>n+l.queued,0)>=32)return Promise.reject(Error('Owner request queue limit'));
  let lane=this.ownerLanes.get(laneId);if(!lane){lane={tail:Promise.resolve(),queued:0};this.ownerLanes.set(laneId,lane);}
  if(lane.queued>=16)return Promise.reject(Error('Owner world request queue limit'));
  lane.queued++;const epoch=this.connectionEpoch;
  const work=()=>new Promise((resolve,reject)=>{
   if(epoch!==this.connectionEpoch||this.socket?.readyState!==1||this.closed){reject(Error('Owner connection is offline'));return;}
   const requestId=String(++this.requestSequence),timer=setTimeout(()=>{this.pending.delete(requestId);reject(Error('Owner request timed out; query transfer status before retrying mutations'));},this.ownerRequestTimeoutMs);
   this.pending.set(requestId,{resolve,reject,timer});
   try{this.socket.send(JSON.stringify({type:'owner-envelope',requestId,envelope}));}catch(error){clearTimeout(timer);this.pending.delete(requestId);reject(error);}
  });
  const result=lane.tail.then(work,work);lane.tail=result.catch(()=>{});return result.finally(()=>{lane.queued--;if(!lane.queued&&this.ownerLanes.get(laneId)===lane)this.ownerLanes.delete(laneId);});
 }
 async request(type,data={}){
  if(data.reservationId&&this.recoveryContext?.reservation?.id===data.reservationId)data={...data,sourceWorldId:this.recoveryContext.reservation.sourceWorldId};
  const target=data.worldId??data.sourceWorldId??this.worldId,connection=this.connectionEpoch;
  try{
   if(['read','presence','describe','state','accepted-state'].includes(type)&&(this.ownerGrantExpiry.get(target)??0)<Date.now()+30000)await this.subscribe(target);
   const epoch=this.ownerWorldEpoch.get(target)??0,requestId=this.identity.nodeId+':'+Date.now()+':'+(++this.ownerRequestSequence);
   const result=await this.sendOwnerEnvelope(await this.sign({protocol:'elsemesh.owner-browser-request/1',requestId,issuedAt:Date.now(),operation:type,payload:data}),target);
   if(type==='presence')this.markWorldLive(target,epoch,connection);
   return result;
  }catch(error){if(connection===this.connectionEpoch)this.markWorldOffline(target);throw error;}
 }
 async authenticatedRequest(operation,data={},action,worldId=data.worldId??this.worldId){
  const challenge=await this.request('owner-challenge',{worldId,action,sessionId:this.membership?.sessionId,portalId:data.portalId});
  const contact=this.ownerConfig?.contacts?.find(c=>c.worldId===worldId),trusted=new Set(this.ownerConfig?.trustedAuthorities??[]);
  if(!contact||challenge.signer!==contact.authorityNodeId||!trusted.has(challenge.signer)||!await verifyRuntimeSignature(challenge,trusted)||challenge.worldId!==contact.authorityWorldId||challenge.action!==action||challenge.playerNodeId!==this.identity.nodeId||challenge.expiresAt<=Date.now()||challenge.expiresAt>Date.now()+65000)throw Error('Destination authentication challenge is invalid');
  return this.request(operation,{...data,proof:await this.sign({protocol:'elsemesh.owner-player-proof/1',challenge})});
 }
 async verifyCancellation(result){
  const contact=this.ownerConfig.contacts.find(c=>c.worldId===result.destinationWorldId),proof=result.ownerTombstone,binding=result.ownerBinding;
  if(!contact||!binding||!proof||proof.kind!=='owner-world-cancel-tombstone'||!await verifyRuntimeSignature(proof,new Set([contact.authorityNodeId]))||proof.transferId!==result.id||binding.transferId!==result.id||binding.playerNodeId!==this.identity.nodeId)throw Error('Definitive destination cancellation is not proved');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(canonical(binding)))),n=>n.toString(16).padStart(2,'0')).join('');
  if(proof.bindingHash!=='sha256:'+hash)throw Error('Cancellation does not match original transfer binding');return result;
 }
 async connect(options={}){
  let welcome=await super.connect(options);
  if(welcome.pendingTransfer){this.setFrozen(true);const pending=welcome.pendingTransfer;this.setRecoveryContext({reservation:pending,descriptor:null});
   try{let result=await this.request('status',{reservationId:pending.id,sourceWorldId:pending.sourceWorldId});
    if(result.state==='committed'){const descriptor=await this.subscribe(result.destinationWorldId);this.setRecoveryContext({reservation:pending,descriptor});await this.adoptCommit(result);welcome={...this.membership,world:descriptor,nextSequence:this.sequence,position:result.position,velocity:result.velocity,yaw:result.yaw};}
    else {if(result.state!=='cancelled')result=await this.request('cancel',{reservationId:pending.id,sourceWorldId:pending.sourceWorldId});await this.verifyCancellation(result);this.worldId=pending.sourceWorldId;this.membership={...welcome,worldId:pending.sourceWorldId};}
   }catch(error){this.disconnect();throw Error('Pending owner transfer remains unresolved: '+error.message);}finally{if(!this.closed)this.setFrozen(false);}
  }
  await this.subscribe(welcome.worldId);const result=await this.authenticatedRequest('owner-enter-local',{},'ENTER',welcome.worldId);
  Object.assign(this,{worldId:result.worldId,generation:result.generation,sequence:result.nextSequence??0,membership:result});this.events.membership(result);this.setFrozen(false);this.startOwnerPolling();return result;}
 startOwnerPolling(){clearInterval(this.ownerPoll);this.ownerPoll=setInterval(()=>{if(this.ownerPolling||this.closed)return;this.ownerPolling=true;void(async()=>{for(const worldId of this.ownerViews){try{const packet=await this.request('presence',{worldId});this.events.presence(packet);}catch(error){this.events.error(error.message);}}})().finally(()=>{this.ownerPolling=false;});},250);
 }
 async subscribe(worldId,portalId){
  if(!this.ownerConfig?.contacts?.some(c=>c.worldId===worldId))throw Error('Unknown owner world');
  this.ownerViews.add(worldId);
  if(this.ownerViewRenewals.has(worldId))return this.ownerViewRenewals.get(worldId);
  const epoch=this.ownerWorldEpoch.get(worldId)??0,connection=this.connectionEpoch;
  const operation=(async()=>{const value=await this.authenticatedRequest('subscribe',{worldId,portalId},'VIEW',worldId);if(connection!==this.connectionEpoch||epoch!==(this.ownerWorldEpoch.get(worldId)??0))throw Error('Stale destination authorization');this.ownerViews.add(worldId);this.ownerGrantExpiry.set(worldId,value.viewExpiresAt);this.ownerViewFresh.set(worldId,{epoch,connection});return value;})();
  this.ownerViewRenewals.set(worldId,operation);try{return await operation;}finally{if(this.ownerViewRenewals.get(worldId)===operation)this.ownerViewRenewals.delete(worldId);}
 }
 disconnect(){clearInterval(this.ownerPoll);for(const worldId of this.ownerViews??[])this.markWorldOffline(worldId);this.ownerGrantExpiry?.clear();this.ownerViewFresh?.clear();this.ownerViewRenewals?.clear();this.ownerLanes?.clear();super.disconnect();}
 async prepare(portalId){const target=await this.request('owner-portal-target',{portalId}),transferId=crypto.randomUUID();const pending={id:transferId,nodeId:this.identity.nodeId,sourceWorldId:this.worldId,destinationWorldId:target.worldId,sourceGeneration:this.generation};this.pendingReservation=pending;this.setRecoveryContext({reservation:pending,descriptor:null});let r;try{r=await this.authenticatedRequest('prepare',{portalId,transferId},'ENTER',target.worldId);}catch(error){try{r=await this.request('owner-pending',{reservationId:transferId,sourceWorldId:pending.sourceWorldId});}catch{throw error;}}const authority=this.ownerConfig.contacts.find(c=>c.worldId===r.destinationWorldId)?.authorityNodeId;if(r.state==='cancelled'){await this.verifyCancellation(r);this.pendingReservation=null;return r;}if(!authority||r.ownerReservation?.kind!=='owner-world-reservation'||!await verifyRuntimeSignature(r.ownerReservation,new Set([authority]))||r.ownerReservation.transferId!==r.id)throw Error('Invalid destination reservation');this.pendingReservation=null;return r;}
 sendState(state){const now=performance.now();if(this.ownerPosePending||this.frozen||this.closed||now-this.lastStateAt<50)return false;this.lastStateAt=now;this.ownerPosePending=true;void this.request('state',{worldId:this.worldId,generation:this.generation,sequence:this.sequence++,timestamp:Date.now(),...state}).catch(e=>this.events.error(e.message)).finally(()=>{this.ownerPosePending=false;});return true;}
 async reconnectForRecovery(){
  if(!this.frozen||!this.recoveryContext?.reservation)throw Error('Recovery requires a frozen transfer context');
  const identity=this.identity,previous=this.membership;await super.connect({identity});this.membership=previous;this.worldId=previous.worldId;this.generation=previous.generation;this.recoveryWelcome=null;return previous;
 }
 validateRecoveryStatus(result){const r=this.recoveryContext?.reservation;if(!r||result.id!==r.id||result.nodeId!==this.identity.nodeId||result.sourceWorldId!==r.sourceWorldId||result.destinationWorldId!==r.destinationWorldId||result.sourceGeneration!==r.sourceGeneration||!['prepared','committed','cancelled','expired'].includes(result.state))throw Error('Owner ledgers have not proved a definitive transfer result');if(['cancelled','expired'].includes(result.state)){void this.subscribe(result.sourceWorldId).then(()=>this.startOwnerPolling()).catch(e=>this.events.error(e.message));}return result;}
 async adoptCommit(result){if(result.state!=='committed')return result;const descriptor=this.recoveryContext?.destination,authority=descriptor?.published?.descriptor?.authority?.nodeId;if(!authority||!result.ownerReceipt||result.ownerReceipt.kind!=='owner-world-commit-receipt'||!await verifyRuntimeSignature(result.ownerReceipt,new Set([authority]))||result.ownerReceipt.transferId!==result.id||result.ownerReceipt.bindingHash!==this.recoveryContext.reservation.ownerReservation.bindingHash)throw Error('Destination commit receipt is invalid');const adopted=super.adoptCommit(result);this.sequence=result.nextSequence;await this.subscribe(result.destinationWorldId);this.startOwnerPolling();return adopted;}
 async commit(id){return this.adoptCommit(await this.request('commit',{reservationId:id}));}
 async status(id){const r=await this.request('status',{reservationId:id});if(r.state==='cancelled')await this.verifyCancellation(r);return this.adoptCommit(r);}
 async cancel(id){const r=await this.request('cancel',{reservationId:id});if(r.state==='cancelled')await this.verifyCancellation(r);return r;}
}
