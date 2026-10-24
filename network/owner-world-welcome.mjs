import {randomUUID} from 'node:crypto';
import {canonical,assetId,signObject} from './identity.mjs';
const check=(v,m)=>{if(!v)throw Error(m);};
export function welcomeIdentity(project){
 const welcome=project.welcome;
 if(welcome===undefined)return {welcome:null,welcomeHash:null};
 check(welcome&&typeof welcome==='object'&&!Array.isArray(welcome)&&Object.keys(welcome).every(k=>['schema','text','audio'].includes(k))&&welcome.schema==='elsemesh.world-welcome/1'&&typeof welcome.text==='string'&&welcome.text.trim().length>0&&welcome.text.length<=2000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(welcome.text)&&typeof welcome.audio==='boolean','Invalid authored world welcome');
 return {welcome:structuredClone(welcome),welcomeHash:assetId(Buffer.from(canonical(welcome)))};
}
/** Private visit records attach to stable world and authenticated player identities. */
export class OwnerWorldWelcome{
 constructor({project,world,identity,authority,clock=Date.now,claimLifetimeMs=10000}){
 check(Number.isSafeInteger(claimLifetimeMs)&&claimLifetimeMs>0&&claimLifetimeMs<=10000,'Welcome claim lifetime must be at most ten seconds');
 Object.assign(this,{world,identity,authority,clock,claimLifetimeMs},welcomeIdentity(project));
 }
 async handle(envelope,s,viewGrant){
 const p=envelope.payload??{},op=envelope.operation;let now=this.clock();
 const response=(allowed,result=null,reason=allowed?'Allowed':'Access restricted')=>signObject({protocol:'elsemesh.world-welcome-result/1',operation:op,requestId:envelope.requestId,welcomeRequestId:p.welcomeRequestId??null,playerNodeId:s.nodeId,playerId:s.playerId,worldId:this.world.worldId,contentDigest:this.world.contentDigest,authorityEpoch:this.world.epoch,sessionId:s.sessionId,generation:s.generation,welcomeHash:this.welcomeHash,issuedAt:now,expiresAt:now+3000,allowed,message:reason,result},this.identity);
 try{return await this.authority.ledger.transact(state=>{
 now=this.clock();this.authority.assertCurrent();check(Number.isSafeInteger(this.world.binding?.expiresAt)&&this.world.binding.expiresAt>now,'Expired content admission');
 const member=state.members[s.playerId],grant=state.grants[viewGrant?.grantId];
 if(!['world-welcome-read','world-welcome-ack'].includes(op)||!grant||grant.playerNodeId!==s.nodeId||grant.playerId!==s.playerId||grant.sessionId!==s.sessionId||grant.expiresAt<=now||member?.status!=='ACTIVE'||member.playerNodeId!==s.nodeId||member.sessionId!==s.sessionId||member.generation!==s.generation||!this.authority.policy.viewPlayers.includes(s.playerId)||!this.authority.policy.enterPlayers.includes(s.playerId)||p.authorityEpoch!==this.world.epoch||p.welcomeHash!==this.welcomeHash||p.worldId!==this.world.worldId||p.contentDigest!==this.world.contentDigest||p.sessionId!==s.sessionId||p.generation!==s.generation||typeof p.welcomeRequestId!=='string'||p.welcomeRequestId.length<1||p.welcomeRequestId.length>128||typeof p.presentationId!=='string'||p.presentationId.length<1||p.presentationId.length>128)return response(false);
 if((op==='world-welcome-ack'||p.welcomeHash!==undefined)&&p.welcomeHash!==this.welcomeHash)return response(false);
 if(!this.welcome)return response(true,{seen:false,configured:false});
 const visits=state.worldWelcome??=( {schema:'elsemesh.private-world-visits/1',visits:{}} );
 check(visits.schema==='elsemesh.private-world-visits/1'&&visits.visits&&typeof visits.visits==='object'&&!Array.isArray(visits.visits),'Invalid private visit store');
 const key=JSON.stringify([this.world.worldId,s.playerId]),visit=visits.visits[key];
 const sameClaim=c=>c&&c.playerNodeId===s.nodeId&&c.sessionId===s.sessionId&&c.generation===s.generation&&c.welcomeHash===this.welcomeHash&&c.contentDigest===this.world.contentDigest&&c.presentationId===p.presentationId;
 if(visit?.seen){
 if(op==='world-welcome-ack'&&(!sameClaim(visit)||p.claimId!==visit.claimId))return response(false);
 return response(true,{seen:true,configured:true});
 }

 if(op==='world-welcome-ack'){
 if(!visit||!sameClaim(visit)||visit.claimId!==p.claimId||visit.claimExpiresAt<=now)return response(false);
 visits.visits[key]={...visit,seen:true,seenAt:now};
 return response(true,{seen:true,configured:true});
 }
 if(visit?.claimExpiresAt>now){
 if(sameClaim(visit))return response(true,{seen:false,configured:true,claimId:visit.claimId,claimExpiresAt:visit.claimExpiresAt,welcome:this.welcome});
 return response(true,{seen:false,configured:true,pending:true,retryAt:visit.claimExpiresAt});
 }
 const claim={seen:false,claimId:randomUUID(),claimExpiresAt:now+this.claimLifetimeMs,presentationId:p.presentationId,playerNodeId:s.nodeId,sessionId:s.sessionId,generation:s.generation,welcomeHash:this.welcomeHash,contentDigest:this.world.contentDigest};
 visits.visits[key]=claim;
 return response(true,{seen:false,configured:true,claimId:claim.claimId,claimExpiresAt:claim.claimExpiresAt,welcome:this.welcome});
 });}catch{return response(false,null,'Welcome unavailable');}
 }
}
