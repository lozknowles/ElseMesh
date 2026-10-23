export const PORTAL_PRESENTATION_PROTOCOL='elsemesh.portal-presentation/1';
export const PORTAL_PRESENTATION_DURATION_MS=1500;
export const PORTAL_PRESENTATION_LIFETIME_MS=3000;
const fields=new Set(['protocol','type','transferId','playerNodeId','playerId','sourceWorldId','destinationWorldId','destinationGeneration','authorityEpoch','committedAt','expiresAt','signer','publicKey','signature']);
const text=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Presentation-only evidence. This never admits a player or changes membership. */
export function validatePortalPresentation(record,{worldId,nodeId,playerId,generation,authorityEpoch,authorityNodeId,now=Date.now()}={}){
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!fields.has(k)))return false;
 if(record.protocol!==PORTAL_PRESENTATION_PROTOCOL||record.type!=='portal-arrival'||!text(record.transferId)||!text(record.sourceWorldId)||!text(record.destinationWorldId)||!/^elsemesh-node:[a-f0-9]{64}$/.test(record.playerNodeId)||record.playerId!=='player:'+record.playerNodeId.slice(14))return false;
 if(!Number.isSafeInteger(record.destinationGeneration)||record.destinationGeneration<1||!Number.isSafeInteger(record.authorityEpoch)||record.authorityEpoch<0||!Number.isSafeInteger(record.committedAt)||!Number.isSafeInteger(record.expiresAt)||record.expiresAt-record.committedAt!==PORTAL_PRESENTATION_LIFETIME_MS||record.committedAt>now+1000||record.expiresAt<=now)return false;
 return (worldId===undefined||record.destinationWorldId===worldId)&&(nodeId===undefined||record.playerNodeId===nodeId)&&(playerId===undefined||record.playerId===playerId)&&(generation===undefined||record.destinationGeneration===generation)&&(authorityEpoch===undefined||record.authorityEpoch===authorityEpoch)&&(authorityNodeId===undefined||record.signer===authorityNodeId);
}
