import {PortalArrivalInbox} from './PortalArrivalInbox.js';
import {PORTAL_PRESENTATION_DURATION_MS} from '../../network/portal-presentation.mjs';
/** Presentation integration only. Membership and simulation remain owned by runtime. */
export class PortalArrivalController{
 constructor({runtime,localAvatar,now=Date.now}={}){Object.assign(this,{runtime,localAvatar,now});this.inbox=new PortalArrivalInbox({now,getConnectionEpoch:()=>runtime.transport.connectionEpoch});this.stats={local:0,remote:0};this.localProof=null;this.work=new Set();}
 descriptor(worldId){const loaded=this.runtime.loaded.get(worldId),d=this.runtime.descriptors.get(worldId);return loaded&&d?.contentDigest===loaded.identity.contentDigest?d:null;}
 receive(){this.update();}
 activated(){this.localProof=this.runtime.transport.membership?.presentation??this.runtime.transitionAttempt?.reservation?.presentation??null;this.update();}
 update(){
  const r=this.runtime;if(!r.connected||r.transport.closed)return;
  const known=new Map();for(const [worldId,packet]of r.presence){if(!r.getPeerLayer(worldId))continue;for(const pose of packet.players??[]){const old=known.get(pose.nodeId);if(!old||pose.generation>old.generation||pose.timestamp>old.timestamp)known.set(pose.nodeId,pose);}}
  for(const worldId of r.loaded.keys()){const layer=r.getPeerLayer(worldId);layer?.prewarmKnownProfiles?.([...known.values()]).catch(error=>{this.error=error.message;});}
  for(const [worldId,packet]of r.presence){if(!r.getPeerLayer(worldId))continue;for(const pose of packet.players??[]){
   if(!this.isCurrent(pose.presentation))continue;
   if(pose.nodeId===r.transport.identity?.nodeId){if(r.host.active?.identity.worldId===worldId&&r.transport.worldId===worldId&&!r.pending)this.present(pose.presentation,worldId,pose,true);}
   else this.present(pose.presentation,worldId,pose,false);
  }}
  if(this.localProof&&!this.isCurrent(this.localProof))this.localProof=null;
  const proof=this.localProof;if(proof&&r.host.active?.identity.worldId===proof.destinationWorldId&&r.transport.generation===proof.destinationGeneration&&!r.pending)this.present(proof,proof.destinationWorldId,{nodeId:r.transport.identity.nodeId,playerId:r.transport.membership?.playerId,generation:r.transport.generation},true);
 }
 isCurrent(proof){const now=this.now();return !!proof&&Number.isFinite(proof.committedAt)&&Number.isFinite(proof.expiresAt)&&proof.committedAt<=now+250&&now<proof.committedAt+PORTAL_PRESENTATION_DURATION_MS&&now<proof.expiresAt;}
 present(proof,worldId,pose,local){
  if(!this.isCurrent(proof))return;
  const descriptor=this.descriptor(worldId);if(!descriptor)return;const epoch=this.runtime.transport.connectionEpoch,key=epoch+':'+worldId+':'+proof.transferId+':'+pose.nodeId;if(this.work.has(key))return;this.work.add(key);
  void this.inbox.accept(proof,{worldId,pose,descriptor}).then(record=>{
   const r=this.runtime;if(!record||epoch!==r.transport.connectionEpoch||!r.connected||r.transport.closed)return;
   if(local){if(r.host.active?.identity.worldId!==worldId||r.transport.worldId!==worldId||r.transport.generation!==record.destinationGeneration||r.pending)return;if(this.localAvatar.observeVerifiedTransfer?.(record,worldId))this.stats.local++;}
   else{const current=r.presence.get(worldId)?.players?.find(p=>p.nodeId===record.playerNodeId);if(current?.generation!==record.destinationGeneration)return;const layer=r.getPeerLayer(worldId),avatar=layer?.avatars?.get(record.playerNodeId);if(avatar?.observeVerifiedTransfer?.(record,worldId))this.stats.remote++;}
  }).catch(error=>{this.error=error.message;}).finally(()=>this.work.delete(key));
 }
 diagnostics(){const warming=[];for(const worldId of this.runtime.loaded.keys()){const layer=this.runtime.getPeerLayer(worldId);if(layer)warming.push({worldId,pending:layer.pendingPrewarms??0,avatars:layer.avatars.size});}return {...this.stats,inbox:this.inbox.diagnostics(),warming,localEffect:this.localAvatar.transportPresentation?.diagnostics(),error:this.error};}
}
