/** Read-only scene lookup. Residency is not VIEW authority; this never fetches,
 * acquires a grant, changes parents, or mutates portal rendering state. */
export function resolveAuthorizedEyeScene(runtime,worldId,expected={}){
 try{
  const t=runtime?.transport,now=Date.now();
  if(typeof worldId!=='string'||!runtime.connected||runtime.pending||runtime.authorityOffline||!t||t.closed||t.frozen||t.socket?.readyState!==1||runtime.offlineWorlds?.has(worldId))return null;
  // Owner VIEW grants carry explicit expiry and connection/authorization fences.
  // Legacy coordinator residency alone supplies no equivalent expiring grant.
  const fresh=t.ownerViewFresh?.get(worldId),grantExpiry=t.ownerGrantExpiry?.get(worldId),viewEpoch=t.ownerWorldEpoch?.get(worldId)??0;
  if(!t.ownerViews?.has(worldId)||!Number.isSafeInteger(grantExpiry)||grantExpiry<=now||fresh?.connection!==t.connectionEpoch||fresh.epoch!==viewEpoch||t.ownerWorldOnline?.get(worldId)!==true)return null;
  const descriptor=runtime.descriptors?.get(worldId),loaded=runtime.loaded?.get(worldId),published=descriptor?.published?.descriptor,authority=published?.authority;
  if(descriptor?.worldId!==worldId||loaded?.identity?.worldId!==worldId||loaded.identity.contentDigest!==descriptor.contentDigest||!Number.isSafeInteger(descriptor.epoch)||authority?.epoch!==descriptor.epoch||typeof authority.nodeId!=='string'||!Number.isFinite(descriptor.binding?.expiresAt)||descriptor.binding.expiresAt<=now)return null;
  const contact=t.ownerConfig?.contacts?.find(c=>c.worldId===worldId);
  if(!contact||contact.authorityNodeId!==authority.nodeId)return null;
  const fence={worldId,connection:t.connectionEpoch,authorityEpoch:descriptor.epoch,authorityNodeId:authority.nodeId,contentDigest:descriptor.contentDigest};
  if(['connection','authorityEpoch','authorityNodeId','contentDigest'].some(key=>expected[key]!==undefined&&expected[key]!==fence[key]))return null;
  const active=runtime.host?.active;let candidate,scene,project,peerLayer,viewEntries;
  if(active?.identity?.worldId===worldId){
   if(t.worldId!==worldId||runtime.eyeSceneConnection!==t.connectionEpoch||active.identity.contentDigest!==descriptor.contentDigest||active.root?.parent!==runtime.engine?.scene)return null;
   candidate=active;scene=runtime.engine.scene;project=active.project;peerLayer=runtime.activeLayer;viewEntries=runtime.views?.entries;
  }else{
   const pair=[...(runtime.previewRecords??new Map())].find(([id,r])=>r.worldId===worldId&&r.loaded&&r.record&&!r.loading&&!r.error&&r.connection===t.connectionEpoch&&runtime.views?.entries?.get(id)?.authorizedView===true&&runtime.views.entries.get(id).state==='live');
   if(!pair)return null;const [id,preview]=pair,record=preview.record,entry=runtime.views.entries.get(id);
   if(record.disposed||record.pin||!record.previewOwner||record.loaded.identity.contentDigest!==descriptor.contentDigest||record.epoch!==descriptor.epoch||record.authority!==authority.nodeId||!runtime.residents?.isReady(record)||entry.preparing||entry.readinessError||entry.candidate?.root!==record.candidate.root||record.candidate.root.parent!==entry.scene)return null;
   candidate=record.candidate;scene=entry.scene;project=record.loaded.project;peerLayer=record.peerLayer;viewEntries=record.viewEntries;
  }
  if(!scene||!candidate?.root||!project)return null;
  return Object.freeze({...fence,authorized:true,scene,candidate,project,descriptor,viewEntries:viewEntries??new Map(),peerLayer});
 }catch{return null;}
}
export function listAuthorizedEyeScenes(runtime){return [...(runtime?.descriptors?.keys()??[])].map(id=>resolveAuthorizedEyeScene(runtime,id)).filter(Boolean);}
