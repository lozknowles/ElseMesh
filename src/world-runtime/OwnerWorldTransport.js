import {PortalTransport,optionalPitch} from './PortalTransport.js';
import {verifyRuntimeSignature} from './RepositorySession.js';
import {canonical} from './vendor/world-engine-contract.js';
const encoder=new TextEncoder(),base64=bytes=>{let out='';for(const byte of bytes)out+=String.fromCharCode(byte);return btoa(out);};
/** One same-origin connection. Every destination still authorizes its own world. */
export class OwnerWorldTransport extends PortalTransport {
 constructor(options={}){super(options);this.ownerConfig=options.config;this.ownerRequestSequence=0;this.ownerHandoffCommits=true;this.ownerViews=new Set();this.ownerGrantExpiry=new Map();this.ownerLanes=new Map();this.ownerViewRenewals=new Map();this.ownerViewFresh=new Map();this.ownerWorldEpoch=new Map();this.ownerWorldOnline=new Map();this.events.worldStatus=options.worldStatus??(()=>{});this.events.stateCorrection=options.stateCorrection??(()=>{});this.ownerCorrections=new Set();this.eyeConsents=new Map();this.eyeRevisions=new Map();this.eyeDescriptors=new Map();this.eyeListeners=new Set();if(options.eyeConsent)this.eyeListeners.add(options.eyeConsent);this.eyeClocks=new Map();this.eyeWorldFences=new Map();this.ownerViewSessions=new Map();this.ownerViewSessionRevision=0;this.eyeEpoch=0;this.ownerRequestTimeoutMs=options.ownerRequestTimeoutMs??5000;if(!Number.isSafeInteger(this.ownerRequestTimeoutMs)||this.ownerRequestTimeoutMs<100||this.ownerRequestTimeoutMs>20000)throw Error('Invalid owner request timeout');}
 close(){this.disconnect();}
 motionContext(){return {connection:this.connectionEpoch,worldId:this.worldId,generation:this.generation,sessionId:this.membership?.sessionId,authorityEpoch:this.membership?.world?.epoch,playerNodeId:this.identity?.nodeId,contentDigest:this.membership?.world?.contentDigest,authorityNodeId:this.membership?.world?.published?.descriptor?.authority?.nodeId,federationWorldId:this.membership?.world?.published?.descriptor?.worldId,federationRegionId:this.membership?.world?.published?.descriptor?.regionId};}
 sameMotionContext(context){const current=this.motionContext();return Object.keys(current).every(key=>current[key]===context?.[key]);}
 resetConfirmedMotion(){this.ownerConfirmedMotion=null;this.ownerPosePendingToken=null;this.ownerPosePending=false;}
 rememberConfirmedMotion(pose,context,kind){
  if(!this.sameMotionContext(context))return false;const vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
  if(!vec(pose.position)||!vec(pose.velocity??[0,0,0])||!Number.isFinite(pose.yaw)||!Number.isSafeInteger(pose.sequence)||pose.sequence<(kind==='authenticated-membership'?-1:0))throw Error('Invalid confirmed owner motion');
  const gaze=optionalPitch(pose),previous=this.ownerConfirmedMotion;
  if(previous&&this.sameMotionContext(previous.context)&&(pose.sequence<previous.sequence||pose.sequence===previous.sequence&&kind!=='correction'))return false;
  this.ownerConfirmedMotion=Object.freeze({context:Object.freeze({...context}),position:Object.freeze([...pose.position]),velocity:Object.freeze([...(pose.velocity??[0,0,0])]),yaw:pose.yaw,...gaze,sequence:pose.sequence,confirmedAt:performance.now(),kind});return true;
 }
 bootstrapConfirmedMotion(membership){
  this.resetConfirmedMotion();if(membership!==this.membership||membership.worldId!==this.worldId||membership.generation!==this.generation||typeof membership.sessionId!=='string'||!membership.sessionId||!Number.isSafeInteger(membership.nextSequence)||membership.nextSequence<0)return false;
  return this.rememberConfirmedMotion({...membership,sequence:membership.nextSequence-1},this.motionContext(),'authenticated-membership');
 }
 getConfirmedPose(worldId=this.worldId){
  const pose=this.ownerConfirmedMotion;if(pose&&!this.sameMotionContext(pose.context)){this.resetConfirmedMotion();return null;}
  if(this.ownerPosePendingToken&&!this.sameMotionContext(this.ownerPosePendingToken.context)){this.ownerPosePendingToken=null;this.ownerPosePending=false;}
  if(!pose||worldId!==this.worldId||this.closed||this.frozen||this.socket?.readyState!==1)return null;
  return {...pose,context:{...pose.context},position:[...pose.position],velocity:[...pose.velocity],pending:!!this.ownerPosePending&&!!this.ownerPosePendingToken&&this.sameMotionContext(this.ownerPosePendingToken.context)};
 }
 async verifyAcceptedPose(receipt,{state,context,connection}){
  if(connection!==this.connectionEpoch||!this.sameMotionContext(context))return false;
  const contact=this.ownerConfig?.contacts?.find(c=>c.worldId===state.worldId),authority=contact?.authorityNodeId,published=this.membership?.world?.published?.descriptor?.authority?.nodeId;
  if(state.worldId!==context.worldId||state.generation!==context.generation||!Number.isSafeInteger(context.authorityEpoch)||receipt?.authorityEpoch!==context.authorityEpoch||context.federationWorldId!==undefined&&receipt?.worldId!==context.federationWorldId||context.federationRegionId!==undefined&&receipt?.regionId!==context.federationRegionId||!authority||published&&published!==authority||receipt?.signer!==authority||receipt.protocol!=='elsemesh.world-wss/2'||receipt.type!=='pose-accepted'||receipt.playerNodeId!==this.identity?.nodeId||receipt.authoredWorldId!==state.worldId||receipt.sessionId!==context.sessionId||receipt.generation!==state.generation||receipt.sequence!==state.sequence||canonical(receipt.position)!==canonical(state.position)||canonical(receipt.velocity)!==canonical(state.velocity)||receipt.yaw!==state.yaw||receipt.pitch!==state.pitch||canonical(receipt.appearance)!==canonical(state.appearance)||!await verifyRuntimeSignature(receipt,new Set([authority])))throw Error('Invalid authoritative accepted motion receipt');
  if(connection!==this.connectionEpoch||!this.sameMotionContext(context))return false;
  return this.rememberConfirmedMotion(receipt,context,'signed-receipt');
 }

 subscribeEyeConsent(listener){this.eyeListeners.add(listener);return()=>this.eyeListeners.delete(listener);}
 emitEyeConsent(event){for(const listener of this.eyeListeners)try{listener(event);}catch(error){this.events.error(error.message);}}
 clearEyeWorld(worldId,reason){this.eyeWorldFences.set(worldId,(this.eyeWorldFences.get(worldId)??0)+1);let changed=false;for(const [key,record]of this.eyeConsents)if(record.worldId===worldId){this.eyeConsents.delete(key);changed=true;}if(changed)this.emitEyeConsent({type:'eye-unavailable',worldId,reason});}
 clearAllEyes(reason){if(!this.eyeConsents)return;this.eyeEpoch++;const worlds=new Set([...this.eyeConsents.values()].map(r=>r.worldId));this.eyeConsents.clear();for(const worldId of worlds)this.emitEyeConsent({type:'eye-unavailable',worldId,reason});this.eyeClocks?.clear();}
 eyeKey(worldId,nodeId){return worldId+'|'+nodeId;}
 eyeServerNow(worldId=this.worldId){const c=this.eyeClocks.get(worldId);return c?c.issuedAt+performance.now()-c.at+c.uncertainty:Infinity;}
 async verifyEyeEnvelope(value,worldId,expectedType,{started=performance.now(),connection=this.connectionEpoch}={}){
  const contact=this.ownerConfig?.contacts?.find(c=>c.worldId===worldId),descriptor=this.eyeDescriptors.get(worldId)??(this.membership?.worldId===worldId?this.membership.world:null),now=Date.now();
  if(!contact||!descriptor||value?.protocol!=='elsemesh.eye-sharing/1'||value.type!==expectedType||value.signer!==contact.authorityNodeId||value.worldId!==worldId||value.authorityEpoch!==descriptor.epoch||value.contentDigest!==descriptor.contentDigest||value.recipientNodeId!==this.identity?.nodeId||!Number.isSafeInteger(value.revision)||value.revision<0||!Number.isSafeInteger(value.issuedAt)||!Number.isSafeInteger(value.expiresAt)||value.expiresAt-value.issuedAt!==3000||Math.abs(value.issuedAt-now)>5000||!await verifyRuntimeSignature(value,new Set([contact.authorityNodeId])))throw Error('Invalid signed eye-sharing envelope');
  if(connection!==this.connectionEpoch||this.closed)throw Error('Stale eye-sharing connection');const elapsed=performance.now()-started;if(elapsed>3000)throw Error('Eye-sharing response expired in flight');this.eyeClocks.set(worldId,{issuedAt:value.issuedAt,at:performance.now(),uncertainty:elapsed});return value;
 }
 isEyeConsentValid(record){
  const token=record?.eyesConsent,viewSession=this.ownerViewSessions.get(record?.worldId),key=this.eyeKey(record?.worldId,record?.nodeId),installed=this.eyeConsents.get(key),revision=this.eyeRevisions.get(key),descriptor=this.eyeDescriptors.get(record?.worldId);
  return !!installed&&canonical(installed.eyesConsent)===canonical(token)&&['position','velocity','yaw','pitch','sequence','generation'].every(k=>canonical(installed[k])===canonical(record[k]))&&!this.closed&&!this.frozen&&this.socket?.readyState===1&&(this.ownerGrantExpiry.get(record.worldId)??0)>Date.now()&&viewSession?.connection===this.connectionEpoch&&viewSession.digest===token.recipientViewSession&&descriptor?.epoch===token.authorityEpoch&&descriptor?.contentDigest===token.contentDigest&&token.recipientNodeId===this.identity?.nodeId&&token.targetNodeId===record.nodeId&&token.eyeSession===record.eyeSession&&token.generation===record.generation&&token.worldId===record.worldId&&token.authorityEpoch===record.authorityEpoch&&token.contentDigest===record.contentDigest&&revision?.revision===token.revision&&!revision.revoked&&token.expiresAt>this.eyeServerNow(record.worldId);
 }
 currentEyeRoster(worldId=this.worldId){return [...this.eyeConsents.values()].filter(r=>r.worldId===worldId&&this.isEyeConsentValid(r)).map(r=>structuredClone(r));}
 async eyeRoster(worldId=this.worldId){
  const fence=this.eyeWorldFences.get(worldId)??0,eyeEpoch=this.eyeEpoch,viewSession=this.ownerViewSessions.get(worldId),current=()=>fence===(this.eyeWorldFences.get(worldId)??0)&&eyeEpoch===this.eyeEpoch&&viewSession===this.ownerViewSessions.get(worldId);
  const started=performance.now(),connection=this.connectionEpoch,response=await this.request('eyes-roster',{worldId});await this.verifyEyeEnvelope(response,worldId,'eyes-roster',{started,connection});const rows=response.result?.eyes;if(!Array.isArray(rows)||rows.length>128)throw Error('Invalid eye roster bounds');const accepted=[];
  for(const row of rows){const t=row.eyesConsent,contact=this.ownerConfig.contacts.find(c=>c.worldId===worldId),vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
   if(!t||t.protocol!=='elsemesh.eye-sharing/1'||t.type!=='eye-grant'||!/^elsemesh-node:[a-f0-9]{64}$/.test(t.targetNodeId)||!/^sha256:[a-f0-9]{64}$/.test(t.eyeSession)||!/^sha256:[a-f0-9]{64}$/.test(t.recipientViewSession)||t.recipientViewSession!==viewSession?.digest||viewSession?.connection!==connection||!Number.isSafeInteger(t.generation)||t.generation<0||t.signer!==contact.authorityNodeId||t.worldId!==worldId||t.authorityEpoch!==response.authorityEpoch||t.contentDigest!==response.contentDigest||t.recipientNodeId!==this.identity.nodeId||t.targetNodeId!==row.nodeId||t.eyeSession!==row.eyeSession||t.generation!==row.generation||row.worldId!==worldId||row.authorityEpoch!==t.authorityEpoch||row.contentDigest!==t.contentDigest||!Number.isSafeInteger(t.revision)||t.revision<0||typeof t.grantId!=='string'||!Number.isSafeInteger(t.issuedAt)||!Number.isSafeInteger(t.expiresAt)||t.issuedAt>response.issuedAt||t.expiresAt<=response.issuedAt||t.expiresAt<=t.issuedAt||t.expiresAt-t.issuedAt>60000||!vec(row.position)||!vec(row.velocity)||!Number.isFinite(row.yaw)||!Number.isFinite(row.pitch)||Math.abs(row.pitch)>1.5||!Number.isSafeInteger(row.sequence)||row.sequence<0||!await verifyRuntimeSignature(t,new Set([contact.authorityNodeId])))throw Error('Invalid recipient eye grant');
   if(connection!==this.connectionEpoch||this.closed||!current())throw Error('Stale eye roster');const key=this.eyeKey(worldId,row.nodeId),fence=this.eyeRevisions.get(key);if(fence&&(t.revision<fence.revision||t.revision===fence.revision&&fence.revoked))continue;this.eyeRevisions.set(key,{revision:t.revision,revoked:false});accepted.push(structuredClone(row));
  }
  if(connection!==this.connectionEpoch||this.closed||!current())throw Error('Stale eye roster');const incoming=new Set(accepted.map(r=>this.eyeKey(worldId,r.nodeId)));for(const [key,row]of this.eyeConsents)if(row.worldId===worldId&&!incoming.has(key)){this.eyeConsents.delete(key);this.emitEyeConsent({type:'eye-unavailable',worldId,targetNodeId:row.nodeId,reason:'roster-removed'});}for(const row of accepted){const key=this.eyeKey(worldId,row.nodeId),f=this.eyeRevisions.get(key),previous=this.eyeConsents.get(key);if(f?.revision===row.eyesConsent.revision&&!f.revoked&&(!previous||row.generation!==previous.generation||row.sequence>=previous.sequence))this.eyeConsents.set(key,row);}return accepted.filter(r=>this.isEyeConsentValid(r)).map(r=>structuredClone(r));
 }
 ownEyeContext(){return {worldId:this.worldId,sessionId:this.membership?.sessionId,generation:this.generation,contentDigest:this.membership?.world?.contentDigest};}
 async readEyeSharing(){const context=this.ownEyeContext(),started=performance.now(),connection=this.connectionEpoch,r=await this.request('eyes-sharing-read',context);await this.verifyEyeEnvelope(r,context.worldId,'eyes-sharing',{started,connection});if(canonical(context)!==canonical(this.ownEyeContext()))throw Error('Eye sharing target changed');return {...r.result,revision:r.revision};}
 async setEyeSharing(recipientNodeId,allowed,{expectedRevision,leaseMs=60000}={}){const context=this.ownEyeContext(),started=performance.now(),connection=this.connectionEpoch,r=await this.request('eyes-sharing-update',{...context,recipientNodeId,allowed,expectedRevision,leaseMs});await this.verifyEyeEnvelope(r,context.worldId,'eyes-sharing-updated',{started,connection});if(canonical(context)!==canonical(this.ownEyeContext()))throw Error('Eye sharing target changed');return {...r.result,revision:r.revision};}
 async receiveEyeEvent(event,connection=this.connectionEpoch){
  const contact=this.ownerConfig?.contacts?.find(c=>c.worldId===event?.worldId),descriptor=this.eyeDescriptors.get(event?.worldId);if(!contact||!descriptor||event?.protocol!=='elsemesh.eye-sharing/1'||!['eye-revoked','eye-sharing-changed'].includes(event.type)||event.signer!==contact.authorityNodeId||event.recipientNodeId!==this.identity?.nodeId||event.authorityEpoch!==descriptor.epoch||event.contentDigest!==descriptor.contentDigest||typeof event.targetNodeId!=='string'||!Number.isSafeInteger(event.revision)||event.revision<0||!Number.isSafeInteger(event.issuedAt)||!Number.isSafeInteger(event.expiresAt)||event.expiresAt-event.issuedAt!==3000||Math.abs(Date.now()-event.issuedAt)>5000||!await verifyRuntimeSignature(event,new Set([contact.authorityNodeId])))throw Error('Invalid eye consent event');
  if(connection!==this.connectionEpoch||this.closed)return false;const key=this.eyeKey(event.worldId,event.targetNodeId),old=this.eyeRevisions.get(key);if(old&&event.revision<=old.revision)return false;this.eyeRevisions.set(key,{revision:event.revision,revoked:event.type==='eye-revoked'});this.eyeConsents.delete(key);this.emitEyeConsent(event);return true;
 }
 installEyeEvents(){const socket=this.socket,connection=this.connectionEpoch;if(this.eyeEventSocket===socket)return;this.eyeEventSocket=socket;socket.addEventListener('message',event=>{if(this.socket!==socket||connection!==this.connectionEpoch||typeof event.data!=='string')return;try{const packet=JSON.parse(event.data);if(packet.type==='eye-consent')void this.receiveEyeEvent(packet.event,connection).catch(e=>{this.clearAllEyes('invalid-event');this.events.error(e.message);});}catch{}});}

 async sign(value){const payload={...JSON.parse(JSON.stringify(value)),signer:this.identity.nodeId,publicKey:this.identity.publicKeyPEM??this.identity.publicKey};return {...payload,signature:base64(new Uint8Array(await crypto.subtle.sign('Ed25519',this.identity.privateCryptoKey??this.identity.privateKey,encoder.encode(canonical(payload)))))};}
 localOwnerWorld(){return this.ownerConfig?.defaultWorldId??this.ownerConfig?.contacts?.find(c=>c.authorityNodeId===this.ownerConfig?.serverNodeId)?.worldId;}
 markWorldOffline(worldId){
  this.clearEyeWorld(worldId,'offline');this.ownerViewSessions.delete(worldId);if(!worldId||worldId===this.localOwnerWorld())return;
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
 async verifyStateCorrection(result,{type,requestId,state,connection,context}){
  const current=()=>connection===this.connectionEpoch&&this.sameMotionContext(context);
  if(!current())return false;
  const prior=this.ownerConfirmedMotion;optionalPitch(result);if(prior&&this.sameMotionContext(prior.context)&&prior.sequence===result.acceptedSequence&&prior.pitch!==result.pitch)throw Error('Invalid authoritative movement correction pitch');
  const contact=this.ownerConfig?.contacts?.find(c=>c.worldId===state.worldId),now=Date.now(),vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
  if(type!=='state'||result.protocol!=='elsemesh.world-wss/2'||result.type!=='pose-corrected'||result.reason!=='movement-clearance'||!contact||result.signer!==contact.authorityNodeId||result.requestId!==requestId||result.playerNodeId!==this.identity.nodeId||result.authoredWorldId!==state.worldId||result.sessionId!==context.sessionId||result.generation!==state.generation||result.authorityEpoch!==context.authorityEpoch||result.rejectedSequence!==state.sequence||!Number.isSafeInteger(result.acceptedSequence)||result.acceptedSequence<0||result.acceptedSequence>=result.rejectedSequence||!vec(result.position)||!vec(result.velocity)||result.velocity.some(n=>n!==0)||!Number.isFinite(result.yaw)||!Number.isSafeInteger(result.issuedAt)||!Number.isSafeInteger(result.expiresAt)||result.issuedAt>now+1000||result.expiresAt<=now||result.expiresAt-result.issuedAt<=0||result.expiresAt-result.issuedAt>5000||this.ownerCorrections.has(requestId)||!await verifyRuntimeSignature(result,new Set([contact.authorityNodeId])))throw Error('Invalid authoritative movement correction');
  if(!current())return false;
  if(result.expiresAt<=Date.now()||this.ownerCorrections.has(requestId))throw Error('Expired or replayed authoritative movement correction');
  this.ownerCorrections.add(requestId);if(this.ownerCorrections.size>256)this.ownerCorrections.delete(this.ownerCorrections.values().next().value);
  this.rememberConfirmedMotion({...result,sequence:result.acceptedSequence},context,'correction');this.events.stateCorrection(result);return true;
 }
 async request(type,data={}, {nonfatal=false}={}){
  if(nonfatal&&!['world-welcome-read','world-welcome-ack'].includes(type))throw Error('Optional request mode is limited to welcome delivery');
  if(data.reservationId&&this.recoveryContext?.reservation?.id===data.reservationId)data={...data,sourceWorldId:this.recoveryContext.reservation.sourceWorldId};
  if(['state','accepted-state'].includes(type)){optionalPitch(data.state??data);data=structuredClone(data);}
  const target=data.worldId??data.sourceWorldId??this.worldId,connection=this.connectionEpoch;
  try{
   if(['read','presence','describe','state','accepted-state','eyes-roster','eyes-sharing-read','eyes-sharing-update'].includes(type)&&(this.ownerGrantExpiry.get(target)??0)<Date.now()+30000)await this.subscribe(target);
   const epoch=this.ownerWorldEpoch.get(target)??0,requestId=this.identity.nodeId+':'+Date.now()+':'+(++this.ownerRequestSequence),state=data.state??data,context=this.motionContext();
   const result=await this.sendOwnerEnvelope(await this.sign({protocol:'elsemesh.owner-browser-request/1',requestId,issuedAt:Date.now(),operation:type,payload:data}),target);
   if(type==='subscribe'&&result?.viewReceipt?.requestId!==requestId)throw Error('VIEW session response request mismatch');
   if(type.startsWith('eyes-')&&result?.requestId!==requestId)throw Error('Eye-sharing response request mismatch');
   if(type.startsWith('eyes-')&&result?.type==='eyes-denied'){await this.verifyEyeEnvelope(result,target,'eyes-denied',{connection});if(result.result?.code!=='EYE_CONSENT_DENIED'||typeof result.result.message!=='string'||result.result.message.length>256)throw Error('Invalid signed eye-sharing denial');this.clearEyeWorld(target,'consent-denied');throw Object.assign(Error('Eye sharing: '+(result.result?.message??'Not permitted')),{eyeApplicationDenied:true,code:'EYE_CONSENT_DENIED'});}
   if(result?.type==='pose-corrected'||result?.rejectedSequence!==undefined||result?.acceptedSequence!==undefined)await this.verifyStateCorrection(result,{type,requestId,state,connection,context});
   if(result?.type==='pose-accepted')await this.verifyAcceptedPose(result,{state,context,connection});
   if(type==='unsubscribe'){this.clearEyeWorld(target,'VIEW-revoked');this.ownerViews.delete(target);this.ownerGrantExpiry.delete(target);this.ownerViewFresh.delete(target);this.ownerViewSessions.delete(target);this.eyeDescriptors.delete(target);}
   if(type==='presence')this.markWorldLive(target,epoch,connection);
   return result;
  }catch(error){if(!nonfatal&&!error.eyeApplicationDenied&&connection===this.connectionEpoch)this.markWorldOffline(target);throw error;}
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
  this.installEyeEvents();await this.subscribe(welcome.worldId);const result=await this.authenticatedRequest('owner-enter-local',{},'ENTER',welcome.worldId);
  Object.assign(this,{worldId:result.worldId,generation:result.generation,sequence:result.nextSequence??0,membership:result});this.bootstrapConfirmedMotion(result);this.events.membership(result);this.setFrozen(false);this.startOwnerPolling();return result;}
 startOwnerPolling(){clearInterval(this.ownerPoll);this.ownerPoll=setInterval(()=>{if(this.ownerPolling||this.closed)return;this.ownerPolling=true;void(async()=>{for(const worldId of this.ownerViews){try{const packet=await this.request('presence',{worldId});this.events.presence(packet);try{await this.eyeRoster(worldId);}catch(error){this.clearEyeWorld(worldId,'unavailable');}}catch(error){this.events.error(error.message);}}})().finally(()=>{this.ownerPolling=false;});},250);
 }
 async subscribe(worldId,portalId){
  if(!this.ownerConfig?.contacts?.some(c=>c.worldId===worldId))throw Error('Unknown owner world');
  this.ownerViews.add(worldId);
  if(this.ownerViewRenewals.has(worldId))return this.ownerViewRenewals.get(worldId);
  const epoch=this.ownerWorldEpoch.get(worldId)??0,connection=this.connectionEpoch;
  const operation=(async()=>{const value=await this.authenticatedRequest('subscribe',{worldId,portalId},'VIEW',worldId);const receipt=value.viewReceipt,contact=this.ownerConfig.contacts.find(c=>c.worldId===worldId);if(!receipt||receipt.protocol!=='elsemesh.owner-view-session/1'||receipt.type!=='view-session'||receipt.signer!==contact.authorityNodeId||receipt.worldId!==worldId||receipt.authorityEpoch!==value.epoch||receipt.contentDigest!==value.contentDigest||receipt.playerNodeId!==this.identity.nodeId||!/^sha256:[a-f0-9]{64}$/.test(receipt.viewSession)||typeof receipt.grantId!=='string'||!Number.isSafeInteger(receipt.issuedAt)||!Number.isSafeInteger(receipt.expiresAt)||receipt.issuedAt>Date.now()+1000||receipt.expiresAt<=Date.now()||receipt.expiresAt!==value.viewExpiresAt||!await verifyRuntimeSignature(receipt,new Set([contact.authorityNodeId])))throw Error('Invalid authoritative VIEW session receipt');if(connection!==this.connectionEpoch||epoch!==(this.ownerWorldEpoch.get(worldId)??0))throw Error('Stale destination authorization');this.ownerViews.add(worldId);const previousSession=this.ownerViewSessions.get(worldId);if(previousSession&&previousSession.digest!==receipt.viewSession)this.clearEyeWorld(worldId,'VIEW-session-changed');this.ownerViewSessions.set(worldId,{digest:receipt.viewSession,grantId:receipt.grantId,revision:++this.ownerViewSessionRevision,connection,expiresAt:receipt.expiresAt});this.ownerGrantExpiry.set(worldId,value.viewExpiresAt);this.ownerViewFresh.set(worldId,{epoch,connection});const previous=this.eyeDescriptors.get(worldId);if(previous&&(previous.epoch!==value.epoch||previous.contentDigest!==value.contentDigest)){this.clearEyeWorld(worldId,'authority-changed');for(const key of this.eyeRevisions.keys())if(key.startsWith(worldId+'|'))this.eyeRevisions.delete(key);}this.eyeDescriptors.set(worldId,value);return value;})();
  this.ownerViewRenewals.set(worldId,operation);try{return await operation;}finally{if(this.ownerViewRenewals.get(worldId)===operation)this.ownerViewRenewals.delete(worldId);}
 }
 disconnect(){this.clearAllEyes('disconnected');this.eyeDescriptors?.clear();this.ownerViewSessions?.clear();this.resetConfirmedMotion();clearInterval(this.ownerPoll);for(const worldId of this.ownerViews??[])this.markWorldOffline(worldId);this.ownerGrantExpiry?.clear();this.ownerViewFresh?.clear();this.ownerViewRenewals?.clear();this.ownerLanes?.clear();super.disconnect();}
 async prepare(portalId){const target=await this.request('owner-portal-target',{portalId}),transferId=crypto.randomUUID();const pending={id:transferId,nodeId:this.identity.nodeId,sourceWorldId:this.worldId,destinationWorldId:target.worldId,sourceGeneration:this.generation};this.pendingReservation=pending;this.setRecoveryContext({reservation:pending,descriptor:null});let r;try{r=await this.authenticatedRequest('prepare',{portalId,transferId},'ENTER',target.worldId);}catch(error){try{r=await this.request('owner-pending',{reservationId:transferId,sourceWorldId:pending.sourceWorldId});}catch{throw error;}}const authority=this.ownerConfig.contacts.find(c=>c.worldId===r.destinationWorldId)?.authorityNodeId;if(r.state==='cancelled'){await this.verifyCancellation(r);this.pendingReservation=null;return r;}if(!authority||r.ownerReservation?.kind!=='owner-world-reservation'||!await verifyRuntimeSignature(r.ownerReservation,new Set([authority]))||r.ownerReservation.transferId!==r.id)throw Error('Invalid destination reservation');this.pendingReservation=null;return r;}
 sendState(state){optionalPitch(state);const now=performance.now();if(this.ownerPosePendingToken&&!this.sameMotionContext(this.ownerPosePendingToken.context)){this.ownerPosePendingToken=null;this.ownerPosePending=false;}if(this.ownerPosePending||this.frozen||this.closed||now-this.lastStateAt<50)return false;this.lastStateAt=now;const token={context:this.motionContext()};this.ownerPosePendingToken=token;this.ownerPosePending=true;const payload=structuredClone({...state,worldId:this.worldId,generation:this.generation,sequence:this.sequence++,timestamp:Date.now()});void this.request('state',payload).catch(e=>this.events.error(e.message)).finally(()=>{if(this.ownerPosePendingToken===token){this.ownerPosePendingToken=null;this.ownerPosePending=false;}});return true;}
 async sendAcceptedState(state){const context=this.motionContext(),receipt=await super.sendAcceptedState(state);if(!this.sameMotionContext(context)){this.lastAcceptedPose=null;throw Error('Crossing receipt belongs to a previous owner connection');}return receipt;}
 async reconnectForRecovery(){
  if(!this.frozen||!this.recoveryContext?.reservation)throw Error('Recovery requires a frozen transfer context');
  const identity=this.identity,previous=this.membership;await super.connect({identity});this.membership=previous;this.worldId=previous.worldId;this.generation=previous.generation;this.recoveryWelcome=null;return previous;
 }
 validateRecoveryStatus(result){const r=this.recoveryContext?.reservation;if(!r||result.id!==r.id||result.nodeId!==this.identity.nodeId||result.sourceWorldId!==r.sourceWorldId||result.destinationWorldId!==r.destinationWorldId||result.sourceGeneration!==r.sourceGeneration||!['prepared','committed','cancelled','expired'].includes(result.state))throw Error('Owner ledgers have not proved a definitive transfer result');if(['cancelled','expired'].includes(result.state)){void this.subscribe(result.sourceWorldId).then(()=>this.startOwnerPolling()).catch(e=>this.events.error(e.message));}return result;}
 async adoptCommit(result){if(result.state!=='committed')return result;const descriptor=this.recoveryContext?.destination,authority=descriptor?.published?.descriptor?.authority?.nodeId;if(!authority||!result.ownerReceipt||result.ownerReceipt.kind!=='owner-world-commit-receipt'||!await verifyRuntimeSignature(result.ownerReceipt,new Set([authority]))||result.ownerReceipt.transferId!==result.id||result.ownerReceipt.bindingHash!==this.recoveryContext.reservation.ownerReservation.bindingHash)throw Error('Destination commit receipt is invalid');this.clearAllEyes('world-changed');const adopted=super.adoptCommit(result);this.membership={...this.membership,worldId:result.destinationWorldId,sessionId:result.destinationSessionId,generation:result.generation,nextSequence:result.nextSequence};this.sequence=result.nextSequence;this.bootstrapConfirmedMotion(this.membership);await this.subscribe(result.destinationWorldId);this.startOwnerPolling();return adopted;}
 async commit(id){return this.adoptCommit(await this.request('commit',{reservationId:id}));}
 async status(id){const r=await this.request('status',{reservationId:id});if(r.state==='cancelled')await this.verifyCancellation(r);return this.adoptCommit(r);}
 async cancel(id){const r=await this.request('cancel',{reservationId:id});if(r.state==='cancelled')await this.verifyCancellation(r);return r;}
}
