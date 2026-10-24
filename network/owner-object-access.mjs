import {canonical,assetId,signObject,verifyObject} from './identity.mjs';
import {effectiveObjectAccess,resolveWorldMatrices,effectiveObjectState,validateNeonSign} from '../src/world-runtime/vendor/world-engine-contract.js';
const check=(v,m)=>{if(!v)throw Error(m);};
const key=(node,id,action)=>JSON.stringify([node,id,action]);
export function normalizeObjectAccess(project){
 const raw=effectiveObjectAccess(project),rules=raw.rules.map(r=>({objectId:r.objectId,actions:[...r.actions].sort()})).sort((a,b)=>a.objectId.localeCompare(b.objectId)),legacy=!Object.hasOwn(project,'objectAccess');
 const policyVersion=1,policyMode=legacy?'Legacy world defaults':'Explicit world policy';
 return {policyVersion,policyMode,rules,policyDigest:assetId(Buffer.from(canonical({schema:raw.schema,policyVersion,policyMode,rules})))};
}
export function issueObjectAdminDelegation(owner,{worldId,contentDigest,authorityNodeId,authorityEpoch,playerNodeId,expiresAt}){
 check(/^elsemesh-node:[a-f0-9]{64}$/.test(playerNodeId)&&Number.isSafeInteger(expiresAt)&&expiresAt>Date.now(),'Invalid administrator delegation');
 return signObject({protocol:'elsemesh.object-admin/1',worldId,contentDigest,authorityNodeId,authorityEpoch,playerNodeId,issuedAt:Date.now(),expiresAt},owner);
}
export class OwnerObjectAccess{
 constructor({project,world,identity,authority,players,adminDelegations=[]}){
 Object.assign(this,{project,world,identity,authority,players,adminDelegations});this.policy=normalizeObjectAccess(project);this.objects=new Map(project.objects.map(o=>[o.id,o]));this.matrices=resolveWorldMatrices(project.objects);
 for(const d of adminDelegations)check(this.validAdmin(d,d.playerNodeId),'Invalid private administrator delegation');
 }
 validAdmin(d,node){return d?.protocol==='elsemesh.object-admin/1'&&d.playerNodeId===node&&d.signer===this.world.ownerNodeId&&verifyObject(d,new Set([this.world.ownerNodeId]))&&d.worldId===this.world.worldId&&d.contentDigest===this.world.contentDigest&&d.authorityNodeId===this.identity.nodeId&&d.authorityEpoch===this.world.epoch&&Number.isSafeInteger(d.issuedAt)&&d.issuedAt<=Date.now()&&Number.isSafeInteger(d.expiresAt)&&d.expiresAt>Date.now();}
 isAdmin(node){return this.adminDelegations.some(d=>this.validAdmin(d,node));}
 async handle(envelope,s,viewGrant){
 const p=envelope.payload??{},op=envelope.operation;
 return this.authority.ledger.transact(state=>{
 const now=Date.now();this.authority.assertCurrent();check(Number.isSafeInteger(this.world.binding?.expiresAt)&&this.world.binding.expiresAt>now,'Expired content admission');
 const context={contentDigest:this.world.contentDigest,policyDigest:this.policy.policyDigest,policyVersion:this.policy.policyVersion};
 let access=state.objectAccess;
 if(!access||access.contentDigest!==context.contentDigest||access.policyDigest!==context.policyDigest){access={...context,revision:(access?.revision??0)+1,grants:{},audit:[],overlay:{signs:[]},replay:{}};state.objectAccess=access;}
 const result=(allowed,value=null)=>signObject({protocol:'elsemesh.object-access-result/1',requestId:envelope.requestId,accessRequestId:p.accessRequestId??null,operation:op,allowed,message:allowed?'Allowed':'Access restricted',worldId:this.world.worldId,...context,policyRevision:access.revision,playerNodeId:s.nodeId,sessionId:s.sessionId,generation:s.generation,authorityEpoch:this.world.epoch,issuedAt:now,expiresAt:now+3000,result:value},this.identity);
 const member=state.members[s.playerId],g=state.grants[viewGrant?.grantId],overlayRead=op==='object-overlay-read';
 // Every operation is authenticated and replay checked again in the transaction.
 if(!g||g.playerNodeId!==s.nodeId||g.sessionId!==s.sessionId||g.expiresAt<=now||!this.authority.policy.viewPlayers.includes(s.playerId)||(!overlayRead&&(member?.status!=='ACTIVE'||member.playerNodeId!==s.nodeId||member.sessionId!==s.sessionId||member.generation!==s.generation))||p.sessionId!==s.sessionId||p.generation!==s.generation||p.worldId!==this.world.worldId||p.contentDigest!==context.contentDigest)return result(false);
 for(const [id,at]of Object.entries(access.replay))if(at<now-30000)delete access.replay[id];
 if(access.replay[envelope.requestId]||Object.keys(access.replay).length>=10000)return result(false);
 access.replay[envelope.requestId]=now;
 const read=op==='object-access-read'||overlayRead;
 if((!read||p.policyDigest!==undefined)&&p.policyDigest!==context.policyDigest||(!read||p.policyRevision!==undefined)&&p.policyRevision!==access.revision)return result(false);
 if(overlayRead)return result(true,{overlay:access.overlay});
 const admin=this.isAdmin(s.nodeId),ceiling=(id,a)=>this.policy.rules.some(r=>r.objectId===id&&r.actions.includes(a)),permitted=(id,a)=>ceiling(id,a)&&access.grants[key(s.nodeId,id,a)]===true;
 if(read)return result(true,{isAdmin:admin,policyMode:this.policy.policyMode,rules:this.policy.rules,effectiveActions:this.policy.rules.map(r=>({objectId:r.objectId,actions:r.actions.filter(a=>this.authority.policy.enterPlayers.includes(s.playerId)&&permitted(r.objectId,a))})),grants:Object.entries(access.grants).filter(([k,v])=>v&&(admin||JSON.parse(k)[0]===s.nodeId)).map(([k])=>{const[playerNodeId,objectId,action]=JSON.parse(k);return{playerNodeId,objectId,action};}),...(admin?{players:Object.entries(this.players).map(([nodeId,p])=>({nodeId,label:p.label}))}:{}),overlay:access.overlay});
 if(op==='object-access-update'){
 if(!admin||p.expectedRevision!==access.revision||!Object.hasOwn(this.players,p.playerNodeId)||typeof p.allowed!=='boolean'||!ceiling(p.objectId,p.action))return result(false);
 const k=key(p.playerNodeId,p.objectId,p.action);if(p.allowed)access.grants[k]=true;else delete access.grants[k];
 access.revision++;access.audit.push({revision:access.revision,actor:s.nodeId,playerNodeId:p.playerNodeId,objectId:p.objectId,action:p.action,allowed:p.allowed,at:now});if(access.audit.length>4096)access.audit.shift();
 return result(true,{revision:access.revision});
 }
 const o=this.objects.get(p.objectId),t=this.project.terminals?.find(t=>t.objectId===p.objectId),m=this.matrices.get(p.objectId);
 if(!o||!(o.kind==='computer'||t)||!m||!effectiveObjectState(this.project.objects,o.id).visible||!permitted(o.id,'computer.use')||!this.authority.policy.enterPlayers.includes(s.playerId))return result(false);
 const position=[m.elements[12],m.elements[13]+.5,m.elements[14]],distance=Math.hypot(...position.map((v,i)=>v-member.motion.position[i]));
 if(distance>Math.min(3,t?.interactionRadius??3))return result(false);
 if(op==='object-use')return result(true,{objectId:o.id,action:'computer.use'});
 const action=op==='object-neon-power'?'neon.power':op==='object-neon-configure'?'neon.configure':null,target=this.objects.get(p.targetObjectId);
 if(!action||!target||target.kind!=='neon-sign'||o.computer?.targetSignId!==target.id||!effectiveObjectState(this.project.objects,target.id).visible||!permitted(target.id,action))return result(false);
 let config=structuredClone(access.overlay.signs.find(x=>x.id===target.id)?.config??target.neon);
 if(action==='neon.power'){if(typeof p.value!=='boolean')return result(false);config.powered=p.value;}else {if(validateNeonSign(p.config).length)return result(false);config=structuredClone(p.config);}
 access.overlay.signs=access.overlay.signs.filter(x=>x.id!==target.id);access.overlay.signs.push({id:target.id,config});
 return result(true,{overlay:access.overlay});
 });
 }
}
