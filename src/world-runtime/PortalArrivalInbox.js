import {validatePortalPresentation,PORTAL_PRESENTATION_DURATION_MS} from '../../network/portal-presentation.mjs';
import {verifyRuntimeSignature} from './RepositorySession.js';
/** Bounded verified-record cache shared by active and preview representations.
 * Each original avatar consumes the same absolute effect timeline, never a replay.
 */
export class PortalArrivalInbox{
 constructor({verify=verifyRuntimeSignature,now=Date.now,getConnectionEpoch=()=>0,capacity=256}={}){if(!Number.isSafeInteger(capacity)||capacity<1||capacity>1024)throw Error('Arrival verification capacity must be 1..1024');Object.assign(this,{verify,now,getConnectionEpoch,capacity});this.records=new Map();this.pending=new Map();this.latest=new Map();this.stats={verified:0,rejected:0,stale:0};}
 prune(){const now=this.now();for(const [id,e]of this.latest)if(e.expiresAt<=now)this.latest.delete(id);while(this.latest.size>this.capacity)this.latest.delete(this.latest.keys().next().value);for(const [id,e]of this.records)if(e.record.expiresAt<=now)this.records.delete(id);while(this.records.size>this.capacity)this.records.delete(this.records.keys().next().value);}
 async accept(proof,{worldId,pose,descriptor}={}){
  this.prune();const epoch=this.getConnectionEpoch(),authorityNodeId=descriptor?.published?.descriptor?.authority?.nodeId;
  const context={worldId,nodeId:pose?.nodeId,playerId:pose?.playerId,generation:pose?.generation,authorityEpoch:descriptor?.epoch,authorityNodeId,now:this.now()};
  if(!authorityNodeId||descriptor?.worldId!==worldId||!pose||typeof pose.nodeId!=='string'||typeof pose.playerId!=='string'||!Number.isSafeInteger(descriptor?.epoch)||!Number.isSafeInteger(pose.generation)||!validatePortalPresentation(proof,context)){this.stats.rejected++;return null;}
  const newest=this.latest.get(proof.playerNodeId);if(newest&&(proof.destinationGeneration<newest.generation||proof.destinationGeneration===newest.generation&&proof.transferId!==newest.transferId)){this.stats.rejected++;return null;}
  const fingerprint=JSON.stringify(proof);if(fingerprint.length>4096){this.stats.rejected++;return null;}
  const cached=this.records.get(proof.transferId);if(cached){if(cached.fingerprint!==fingerprint){this.stats.rejected++;return null;}return this.now()-cached.record.committedAt<PORTAL_PRESENTATION_DURATION_MS?cached.record:null;}
  const key=epoch+':'+fingerprint;let work=this.pending.get(key);
  if(!work){if(this.pending.size>=this.capacity){this.stats.rejected++;return null;}work=Promise.resolve().then(()=>this.verify(proof,new Set([authorityNodeId])));this.pending.set(key,work);}
  try{
   if(!await work){this.stats.rejected++;return null;}
   if(epoch!==this.getConnectionEpoch()){this.stats.stale++;return null;}
   if(!validatePortalPresentation(proof,{...context,now:this.now()})){this.stats.rejected++;return null;}
   const existing=this.records.get(proof.transferId);if(existing){if(existing.fingerprint!==fingerprint){this.stats.rejected++;return null;}return this.now()-existing.record.committedAt<PORTAL_PRESENTATION_DURATION_MS?existing.record:null;}
   const newer=this.latest.get(proof.playerNodeId);if(newer&&(proof.destinationGeneration<newer.generation||proof.destinationGeneration===newer.generation&&proof.transferId!==newer.transferId)){this.stats.rejected++;return null;}
   const record=Object.freeze({...proof});this.latest.set(record.playerNodeId,{generation:record.destinationGeneration,transferId:record.transferId,expiresAt:record.expiresAt});this.records.set(record.transferId,{fingerprint,record});this.prune();this.stats.verified++;
   return this.now()-record.committedAt<PORTAL_PRESENTATION_DURATION_MS?record:null;
  }catch{this.stats.rejected++;return null;}finally{if(this.pending.get(key)===work)this.pending.delete(key);}
 }
 diagnostics(){this.prune();return {...this.stats,records:this.records.size,pending:this.pending.size};}
}
