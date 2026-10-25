import {loadAppearance,validateAppearance} from '../player/AvatarAppearance.js';
import {verifyRuntimeSignature} from './RepositorySession.js';
import { canonical, privateNeonIdentity } from './vendor/world-engine-contract.js';
const encoder=new TextEncoder(),MAX_FILE=128*1024*1024;
const b64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);};
/** Optional radians: unavailable gaze must never become a fabricated zero. */
export function optionalPitch(pose){if(pose.pitch===undefined)return {};if(!Number.isFinite(pose.pitch)||Math.abs(pose.pitch)>1.5)throw Error('Invalid optional player pitch');return {pitch:pose.pitch};}
/** Persistent browser identity; same-origin endpoint set by runtime, never authored data. */
export class PortalTransport {
 constructor({status=()=>{},presence=()=>{},membership=()=>{},error=()=>{}}={}){this.events={status,presence,membership,error};this.socket=null;this.pending=new Map();this.sequence=0;this.generation=0;this.worldId=null;this.lastStateAt=-Infinity;this.requestSequence=0;this.queue=Promise.resolve();this.closed=true;this.connectionEpoch=0;this.frozen=false;}
 async connect({identity}={}){
  this.disconnect();this.closed=false;this.identity=identity??await privateNeonIdentity();this.events.status('Authenticating '+this.identity.nodeId);const url=new URL('/__worlds',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
  return new Promise((resolve,reject)=>{const socket=new WebSocket(url);this.socket=socket;let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('Coordinator authentication timed out'));socket.close();}},12000);
   socket.onmessage=async event=>{if(this.socket!==socket)return;try{if(typeof event.data!=='string'||event.data.length>2*1024*1024)throw Error('Oversized coordinator message');const packet=JSON.parse(event.data);
    if(packet.type==='challenge'){const challenge=packet.challenge;if(challenge?.protocol!=='elsemesh.repository-auth/1'||challenge.path!=='/__worlds'||!/^[a-f0-9]{64}$/.test(challenge.nonce)||Math.abs(challenge.expiresAt-Date.now())>15000)throw Error('Invalid authentication challenge');const signature=new Uint8Array(await crypto.subtle.sign('Ed25519',this.identity.privateCryptoKey??this.identity.privateKey,encoder.encode(canonical(challenge))));socket.send(JSON.stringify({type:'authenticate',publicKey:this.identity.publicKeyPEM??this.identity.publicKey,signature:b64(signature)}));}
    else if(packet.type==='welcome'){if(!Number.isSafeInteger(packet.nextSequence)||packet.nextSequence<0)throw Error('Invalid authoritative next sequence');this.closed=false;this.worldId=packet.worldId;this.generation=packet.generation;this.sequence=packet.nextSequence;this.membership=packet;this.events.membership(packet);this.events.status('Connected as '+packet.label);if(!settled){settled=true;clearTimeout(timer);resolve(packet);}}
    else if(packet.type==='pending'){this.events.status('PENDING: '+packet.nodeId);this.events.error('Pending operator enrolment: '+packet.nodeId);if(!settled){settled=true;clearTimeout(timer);reject(Error('Pending operator enrolment: '+packet.nodeId));}}
    else if(packet.type==='presence'){if(typeof packet.worldId!=='string'||!Array.isArray(packet.players)||packet.players.length>128)throw Error('Invalid presence');this.events.presence(packet);}
    else if(packet.type==='result'){const wait=this.pending.get(packet.requestId);if(wait){this.pending.delete(packet.requestId);clearTimeout(wait.timer);if(packet.error)wait.reject(Error(packet.error));else wait.resolve(packet.result);}}
    else if(packet.type==='error'){this.events.error(packet.error);if(!settled){settled=true;clearTimeout(timer);reject(Error(packet.error));}}
   }catch(error){this.events.error(error.message);if(!settled){settled=true;clearTimeout(timer);reject(error);socket.close();}}};
   socket.onerror=()=>{if(this.socket===socket)this.events.error('Coordinator connection failed');};socket.onclose=()=>{clearTimeout(timer);if(this.socket!==socket){if(!settled){settled=true;reject(Error('Connection superseded'));}return;}this.closed=true;this.events.status('Disconnected');for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(Error('Coordinator disconnected; query transfer status after recovery'));}this.pending.clear();if(!settled){settled=true;reject(Error('Coordinator disconnected'));}};
  });
 }
 request(type,data={}){const epoch=this.connectionEpoch;const work=()=>new Promise((resolve,reject)=>{if(epoch!==this.connectionEpoch||this.socket?.readyState!==1||this.closed){reject(Error('Coordinator is offline'));return;}const requestId=String(++this.requestSequence);const timer=setTimeout(()=>{this.pending.delete(requestId);reject(Error(type+' timed out; query reservation status before retrying commit'));},20000);this.pending.set(requestId,{resolve,reject,timer});this.socket.send(JSON.stringify({type,requestId,...data}));});const result=this.queue.then(work,work);this.queue=result.catch(()=>{});return result;}
 describe(worldId){return this.request('describe',{worldId});}
 subscribe(worldId,portalId){return this.request('subscribe',{worldId,portalId});}
 unsubscribe(worldId){return this.request('unsubscribe',{worldId});}
 source(worldId){return {kind:'local',label:'runtime:'+worldId,read:async(path,maxBytes)=>{
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_FILE)throw Error('Invalid content byte limit');let total=null,offset=0;const chunks=[];
  do{const part=await this.request('read',{worldId,path,offset,limit:maxBytes});if(!Number.isSafeInteger(part.total)||part.total<0||part.total>maxBytes||part.offset!==offset||typeof part.bytes!=='string'||part.bytes.length>90000||total!==null&&total!==part.total)throw Error('Invalid content response');total=part.total;const bytes=Uint8Array.from(atob(part.bytes),c=>c.charCodeAt(0));if(bytes.length>65536||offset+bytes.length>total||!bytes.length&&offset<total)throw Error('Invalid content chunk');chunks.push(bytes);offset+=bytes.length;}while(offset<total);
  const result=new Uint8Array(total);let at=0;for(const c of chunks){result.set(c,at);at+=c.length;}return result;
 }};}
 setFrozen(value){this.frozen=!!value;}
 setRecoveryContext({reservation,descriptor}){if(this.recoveryContext?.reservation?.id!==reservation.id)this.recoveryWelcome=null;this.recoveryContext={reservation,source:this.recoveryContext?.reservation?.id===reservation.id?this.recoveryContext.source:this.membership?.world,destination:descriptor};}

 validateRecoveryStatus(result){
  const r=this.recoveryContext?.reservation,m=this.recoveryWelcome??this.membership;
  if(!r||!m||result?.id!==r.id||result.nodeId!==this.identity.nodeId||result.sourceGeneration!==r.sourceGeneration||result.sourceWorldId!==r.sourceWorldId||result.destinationWorldId!==r.destinationWorldId)throw Error('Recovery ledger does not match the original reservation');
  const committed=result.state==='committed',worldId=committed?r.destinationWorldId:r.sourceWorldId,sessionId=committed?r.destinationSessionId:r.handoff.sessionId,generation=committed?r.sourceGeneration+1:r.sourceGeneration;
  if(m.worldId!==worldId||m.sessionId!==sessionId||m.generation!==generation||committed&&result.generation!==generation)throw Error('Original recovery session expired or membership changed; controls remain frozen');
  return result;
 }
 async reconnectForRecovery(){
  if(!this.frozen)throw Error('Recovery reconnect requires frozen controls');
  const identity=this.identity,context=this.recoveryContext,previous=this.membership;
  if(!identity||!context?.reservation||!previous)throw Error('Recovery identity or reservation unavailable');
  const r=context.reservation,authority=r.handoff?.destinationAuthority??previous.world?.published?.descriptor?.authority?.nodeId;
  try{
   const welcome=await this.connect({identity}),expected=welcome.worldId===r.destinationWorldId?context.destination:welcome.worldId===r.sourceWorldId?context.source:null;
   if(this.identity!==identity||welcome.nodeId!==identity.nodeId||!expected||welcome.world?.contentDigest!==expected.contentDigest||welcome.world?.epoch!==expected.epoch||welcome.world?.regionId!==expected.regionId||canonical(welcome.world?.published)!==canonical(expected.published)||welcome.world?.published?.descriptor?.authority?.nodeId!==authority)throw Error('Recovery welcome does not match the pinned authority and content');
   if(welcome.worldId===r.destinationWorldId&&(welcome.sessionId!==r.destinationSessionId||welcome.generation!==r.sourceGeneration+1)||welcome.worldId===r.sourceWorldId&&(welcome.sessionId!==r.handoff.sessionId||welcome.generation!==r.sourceGeneration))throw Error('Recovery welcome membership fence mismatch');
   // Reauthentication updates only transport membership/sequence. The existing
   // transition must still query its owned ledger reservation before activation.
   this.recoveryWelcome=welcome;return welcome;
  }catch(error){this.disconnect();throw error;}
 }

 async sendAcceptedState({position,velocity=[0,0,0],yaw=0,pitch,timestamp=Date.now(),appearance=loadAppearance()}){
  validateAppearance(appearance);const gaze=optionalPitch({pitch});
  const state={appearance:{...appearance},worldId:this.worldId,generation:this.generation,sequence:this.sequence++,timestamp,position:[...position],velocity:[...velocity],yaw,...gaze};
  const receipt=await this.request('accepted-state',{state}),authority=this.membership?.world?.published?.descriptor?.authority?.nodeId??this.membership?.authorityNodeId;
  if(!authority||!await verifyRuntimeSignature(receipt,new Set([authority]))||receipt.protocol!=='elsemesh.world-wss/2'||receipt.type!=='pose-accepted'||receipt.playerNodeId!==this.identity.nodeId||receipt.authoredWorldId!==state.worldId||receipt.sessionId!==this.membership.sessionId||receipt.generation!==state.generation||receipt.sequence!==state.sequence||canonical(receipt.position)!==canonical(state.position)||canonical(receipt.velocity)!==canonical(state.velocity)||receipt.yaw!==state.yaw||receipt.pitch!==state.pitch||canonical(receipt.appearance)!==canonical(state.appearance))throw Error('Invalid authoritative crossing receipt');
  this.lastAcceptedPose=receipt;return receipt;
 }
 handoff(reservationId){return this.request('handoff',{reservationId});}
 prepare(portalId){return this.request('prepare',{portalId});}
 ready(reservationId,contentDigest,epoch){return this.request('ready',{reservationId,contentDigest,epoch});}
 adoptCommit(result){if(result.state==='committed'&&(this.worldId!==result.destinationWorldId||this.generation!==result.generation)){this.worldId=result.destinationWorldId;this.generation=result.generation;this.sequence=0;const {pitch:previousPitch,...previousMembership}=this.membership??{};this.membership={...previousMembership,...result,world:this.recoveryContext?.reservation?.id===result.id?this.recoveryContext.destination:this.membership.world,sessionId:result.destinationSessionId};this.events.membership(result);}return result;}
 async commit(reservationId){return this.adoptCommit(await this.request('commit',{reservationId}));}
 async status(reservationId){return this.adoptCommit(await this.request('status',{reservationId}));}
 cancel(reservationId){return this.request('cancel',{reservationId});}
 sendState({position,velocity=[0,0,0],yaw=0,pitch,timestamp=Date.now(),appearance=loadAppearance()}){const now=performance.now();if(this.frozen||this.closed||this.socket?.readyState!==1||now-this.lastStateAt<50||this.socket.bufferedAmount>65536)return false;validateAppearance(appearance);const gaze=optionalPitch({pitch});this.lastStateAt=now;this.socket.send(JSON.stringify({type:'state',worldId:this.worldId,generation:this.generation,sequence:this.sequence++,timestamp,position,velocity,yaw,...gaze,appearance:{...appearance}}));return true;}
 disconnect(){this.connectionEpoch++;this.closed=true;const socket=this.socket;this.socket=null;socket?.close();for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(Error('Coordinator disconnected'));}this.pending.clear();this.queue=Promise.resolve();}
 dispose(){this.disconnect();}
}
