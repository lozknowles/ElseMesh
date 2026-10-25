import {randomUUID} from 'node:crypto';
import {assetId,signObject} from './identity.mjs';
const check=(v,m)=>{if(!v)throw Object.assign(Error(m),{code:'EYE_CONSENT_DENIED'});};
const authorityCheck=(v,m)=>{if(!v)throw Error(m);};
const NODE=/^elsemesh-node:[a-f0-9]{64}$/;
/** Explicit recipient consent; ordinary avatar presence is never a sharing grant. */
export class OwnerEyeSharing{
 constructor({authority,world,descriptor,identity,players,sessions,acceptedGaze,notify=()=>{},now=()=>Date.now()}){Object.assign(this,{authority,world,descriptor,identity,players,sessions,acceptedGaze,notify,now});}
 context(member){return {targetNodeId:member.playerNodeId,eyeSession:assetId(Buffer.from(member.sessionId)),generation:member.generation,worldId:this.world.worldId,contentDigest:this.world.contentDigest,authorityEpoch:this.descriptor.epoch};}
 matches(a,b){return a&&b&&Object.keys(b).every(k=>a[k]===b[k]);}
 result(type,subject,revision,result,extra={}){const now=this.now();return signObject({protocol:'elsemesh.eye-sharing/1',type,worldId:this.world.worldId,authorityEpoch:this.descriptor.epoch,contentDigest:this.world.contentDigest,recipientNodeId:subject,revision,issuedAt:now,expiresAt:now+3000,...extra,result},this.identity);}
 state(state){state.eyeSharing??={revision:0,targets:{}};return state.eyeSharing;}
 view(state,session,grant){const current=state.grants[grant?.grantId];authorityCheck(current&&current.playerNodeId===session.nodeId&&current.expiresAt>this.now()&&this.authority.policy.viewPlayers.includes(session.playerId),'Eye sharing requires current world VIEW');this.authority.assertCurrent();authorityCheck(this.world.binding.expiresAt>this.now(),'Eye sharing content expired');return current;}
 revokeRecord(store,record,reason,events,{force=false}={}){if(!force&&!Object.keys(record.shares).length)return;const recipients=Object.keys(record.shares);record.shares={};record.revision=++store.revision;for(const recipient of recipients)events.push(this.result('eye-revoked',recipient,record.revision,null,{...record.context,reason}));}
 async sweep(reason='context-changed',nodeId=null){const events=[];await this.authority.ledger.transact(state=>{const store=this.state(state);for(const [node,record]of Object.entries(store.targets)){const member=state.members['player:'+node.split(':')[1]],session=this.sessions.get(node),context=member&&this.context(member);if((nodeId===node)||!member||member.status!=='ACTIVE'||!this.matches(record.context,context)||!session?.connected||this.now()-(session.lastAcceptedAt??0)>3000)this.revokeRecord(store,record,reason,events);else for(const [recipient,share]of Object.entries(record.shares))if(share.expiresAt<=this.now()){delete record.shares[recipient];record.revision=++store.revision;events.push(this.result('eye-revoked',recipient,record.revision,null,{...record.context,reason:'expired'}));}}});for(const event of events)await this.notify(event);return events;}
 async handle(envelope,session,grant){
  const p=envelope.payload??{},op=envelope.operation,events=[];const respond=(type,subject,revision,value,extra={})=>this.result(type,subject,revision,value,{...extra,requestId:envelope.requestId});
  let response;try{response=await this.authority.ledger.transact(state=>{
   this.view(state,session,grant);const store=this.state(state),now=this.now();
   if(op==='eyes-roster'){
    check(p.worldId===this.world.worldId,'Wrong eye roster world');const eyes=[];
    for(const [node,record]of Object.entries(store.targets)){
     const member=state.members['player:'+node.split(':')[1]],target=this.sessions.get(node),share=record.shares[session.nodeId],context=member&&this.context(member),gaze=target&&this.acceptedGaze(target);
     if(!share||share.expiresAt<=now||!member||member.status!=='ACTIVE'||!this.matches(record.context,context)||!target?.connected||now-(target.lastAcceptedAt??0)>3000||gaze?.pitch===undefined)continue;
     const consent=signObject({protocol:'elsemesh.eye-sharing/1',type:'eye-grant',...context,recipientNodeId:session.nodeId,recipientViewSession:assetId(Buffer.from(grant.sessionId)),revision:record.revision,grantId:share.grantId,issuedAt:share.issuedAt,expiresAt:Math.min(share.expiresAt,grant.expiresAt)},this.identity);
     eyes.push({nodeId:node,generation:member.generation,sequence:member.sequence,position:[...member.motion.position],velocity:[...member.motion.velocity],yaw:member.motion.yaw,pitch:gaze.pitch,...context,eyesConsent:consent});
    }
    return respond('eyes-roster',session.nodeId,store.revision,{eyes},{issuedAt:now,expiresAt:now+3000});
   }
   const member=state.members[session.playerId];check(member?.status==='ACTIVE'&&member.playerNodeId===session.nodeId&&member.sessionId===session.sessionId&&member.generation===session.generation&&p.worldId===this.world.worldId&&p.sessionId===member.sessionId&&p.generation===member.generation&&p.contentDigest===this.world.contentDigest,'Only the current target session can manage its own eye sharing');
   const context=this.context(member);let record=store.targets[session.nodeId];if(!record){record={context,revision:++store.revision,shares:{}};store.targets[session.nodeId]=record;}else if(!this.matches(record.context,context)){this.revokeRecord(store,record,'context-changed',events);record.context=context;record.revision=++store.revision;}
   if(op==='eyes-sharing-read')return respond('eyes-sharing',session.nodeId,record.revision,{context,recipients:Object.entries(this.players).filter(([node])=>node!==session.nodeId).map(([nodeId,p])=>({nodeId,label:p.label??'Player'})),shares:Object.entries(record.shares).filter(([,s])=>s.expiresAt>now).map(([recipientNodeId,s])=>({recipientNodeId,expiresAt:s.expiresAt}))});
   check(op==='eyes-sharing-update'&&Object.keys(p).every(k=>['worldId','sessionId','generation','contentDigest','recipientNodeId','allowed','expectedRevision','leaseMs'].includes(k)),'Invalid sharing mutation');
   check(p.expectedRevision===record.revision&&((p.recipientNodeId===null&&p.allowed===false)||(NODE.test(p.recipientNodeId)&&this.players[p.recipientNodeId]&&p.recipientNodeId!==session.nodeId))&&typeof p.allowed==='boolean','Eye sharing revision/recipient mismatch');
   check(!p.allowed||Number.isSafeInteger(p.leaseMs)&&p.leaseMs>=1000&&p.leaseMs<=60000,'Eye sharing lease outside bounds');
   if(p.recipientNodeId===null){this.revokeRecord(store,record,'explicit-revoke-all',events,{force:true});return respond('eyes-sharing-updated',session.nodeId,record.revision,{recipientNodeId:null,allowed:false,expiresAt:null});}
   record.revision=++store.revision;if(p.allowed)record.shares[p.recipientNodeId]={grantId:randomUUID(),issuedAt:now,expiresAt:now+p.leaseMs};else delete record.shares[p.recipientNodeId];
   const event=this.result(p.allowed?'eye-sharing-changed':'eye-revoked',p.recipientNodeId,record.revision,null,{...context,reason:p.allowed?'explicit-share':'explicit-revoke'});events.push(event);return respond('eyes-sharing-updated',session.nodeId,record.revision,{recipientNodeId:p.recipientNodeId,allowed:p.allowed,expiresAt:record.shares[p.recipientNodeId]?.expiresAt??null});
  });}catch(error){if(error.code!=='EYE_CONSENT_DENIED')throw error;return respond('eyes-denied',session.nodeId,this.authority.ledger.snapshot().eyeSharing?.revision??0,{code:'EYE_CONSENT_DENIED',message:error.message});}for(const event of events)await this.notify(event);return response;
 }
}
