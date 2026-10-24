import {verifyRuntimeSignature} from './RepositorySession.js';
export function canResumeObjectInteraction(c,{active,hostGeneration,pending,authorityOffline,transport:t,connected,ownerMode}){
 return !!c&&c.inputEnabled&&c.active===active&&c.hostGeneration===hostGeneration&&!pending&&!authorityOffline&&!t.frozen&&(!ownerMode||(connected&&!t.closed&&c.transport===t&&c.connection===t.connectionEpoch&&c.sessionId===t.membership?.sessionId&&c.generation===t.generation));
}
export class AccessRestricted extends Error {constructor(){super('Access restricted');}}
/** A signed short lease is valid only in the membership and content that requested it. */
export class OwnerObjectAccessClient {
 constructor({getContext,verify=verifyRuntimeSignature,now=()=>Date.now(),onLost=()=>{},onSnapshot=()=>{}}){Object.assign(this,{getContext,verify,now,onLost,onSnapshot});this.snapshot=null;this.lease=null;this.epoch=0;this.pending=false;this.nextPoll=0;}
 context(){const c=this.getContext();if(!c||!c.transport||c.transport.closed||c.transport.frozen||!c.ready)throw Error('Object access unavailable');return {...c};}
 same(c){try{const n=this.context();return n.transport===c.transport&&n.connection===c.connection&&n.active===c.active&&n.worldId===c.worldId&&n.contentDigest===c.contentDigest&&n.sessionId===c.sessionId&&n.generation===c.generation;}catch{return false;}}
 invalidate(){this.epoch++;this.snapshot=null;this.onSnapshot(null);const held=this.lease;this.lease=null;if(held)this.onLost();}
 async request(operation,data={},discover=false){
  const c=this.context(),epoch=this.epoch,accessRequestId=crypto.randomUUID(),revision=this.snapshot?.policyRevision,policyDigest=this.snapshot?.policyDigest;
  const payload={worldId:c.worldId,contentDigest:c.contentDigest,sessionId:c.sessionId,generation:c.generation,accessRequestId,...(!discover&&policyDigest?{policyDigest,policyRevision:revision}:{}),...data};
  let r;try{r=await c.transport.request(operation,payload);}catch{if(this.same(c)&&epoch===this.epoch)this.invalidate();throw Error('Object access unavailable');}
  const now=this.now(),contact=c.transport.ownerConfig?.contacts?.find(x=>x.worldId===c.worldId);
  const valid=r&&contact&&r.protocol==='elsemesh.object-access-result/1'&&r.accessRequestId===accessRequestId&&r.operation===operation&&r.signer===contact.authorityNodeId&&r.worldId===c.worldId&&r.contentDigest===c.contentDigest&&r.playerNodeId===c.transport.identity.nodeId&&r.sessionId===c.sessionId&&r.generation===c.generation&&r.authorityEpoch===c.authorityEpoch&&r.policyVersion===1&&typeof r.policyDigest==='string'&&Number.isSafeInteger(r.policyRevision)&&r.policyRevision>=0&&(revision===undefined||r.policyRevision>=revision)&&Number.isSafeInteger(r.issuedAt)&&Number.isSafeInteger(r.expiresAt)&&r.issuedAt<=now+1000&&r.expiresAt>now&&r.expiresAt-r.issuedAt>0&&r.expiresAt-r.issuedAt<=3000&&typeof r.allowed==='boolean';
  if(!valid||!await this.verify(r,new Set([contact.authorityNodeId]))){if(this.same(c)&&epoch===this.epoch)this.invalidate();throw Error('Object access unavailable');}
  if(epoch!==this.epoch||!this.same(c)||r.expiresAt<=this.now()||(this.snapshot&&r.policyRevision<this.snapshot.policyRevision)||(this.snapshot&&r.policyRevision===this.snapshot.policyRevision&&r.policyDigest!==this.snapshot.policyDigest))throw Error('Object access unavailable');
  if(!r.allowed){if(operation==='object-use')this.invalidate();throw new AccessRestricted();}
  if(this.snapshot&&r.policyRevision!==this.snapshot.policyRevision){this.snapshot=null;const held=this.lease;this.lease=null;if(held)this.onLost();}
  return {receipt:r,context:c};
 }
 async read(){const {receipt:r,context}=await this.request('object-access-read',{},true);this.snapshot={...r.result,policyDigest:r.policyDigest,policyRevision:r.policyRevision,expiresAt:r.expiresAt,context};this.onSnapshot(this.snapshot);return this.snapshot;}
 async update(data){await this.request('object-access-update',data);return this.read();}
 async use(objectId){const {receipt:r,context}=await this.request('object-use',{objectId});if(r.result?.objectId!==objectId||r.result?.action!=='computer.use'){this.invalidate();throw Error('Object access unavailable');}this.lease={objectId,expiresAt:r.expiresAt,renewAt:this.now()+1000,context};return true;}
 valid(objectId=this.lease?.objectId){return !!this.lease&&this.lease.objectId===objectId&&this.lease.expiresAt>this.now()&&this.same(this.lease.context);}
 async effect(objectId,targetObjectId,action,value){if(!this.valid(objectId))throw new AccessRestricted();await this.request(action==='neon.power'?'object-neon-power':'object-neon-configure',{objectId,targetObjectId,...(action==='neon.power'?{value}:{config:value})});await this.read();}
 tick(){
  if(this.lease&&!this.valid()){this.invalidate();return;}
  if(this.snapshot&&!this.same(this.snapshot.context)){this.invalidate();return;}
  if(this.pending)return;
  const now=this.now(),renew=this.lease&&now>=this.lease.renewAt,poll=now>=this.nextPoll;
  if(!renew&&!poll)return;
  try{this.context();}catch{return;}
  this.pending=true;this.nextPoll=now+1000;
  const objectId=this.lease?.objectId,epoch=this.epoch,context=this.context();
  void (async()=>{if(poll)await this.read();if(renew&&objectId&&this.lease?.objectId===objectId)await this.use(objectId);})().catch(error=>{if(epoch===this.epoch&&this.same(context)){this.invalidate();this.lastError=error.message;}}).finally(()=>this.pending=false);
 }
}
