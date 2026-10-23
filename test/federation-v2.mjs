import test from 'node:test';
import assert from 'node:assert/strict';
import {newIdentity,assetId,signObject} from '../network/identity.mjs';
import {ReplayGuard} from '../network/protocol.mjs';
import {sampleRegions} from '../network/federation-fixtures.mjs';
import {createPortalHandoffV2,acceptPortalHandoffV2,FEDERATION_CAPABILITIES} from '../network/federation.mjs';
function fixture(){
 const source=newIdentity(),destination=newIdentity(),player=newIdentity(),f=sampleRegions(source.nodeId,destination.nodeId),portal={...f.caveEntry,entry:{position:[0,0,0],yaw:180},exit:{position:[10,0,0],yaw:0}},hash=assetId(Buffer.alloc(0));
 const handoff=createPortalHandoffV2(source,{portal,playerId:'player:visitor',playerNodeId:player.nodeId,destinationAuthority:destination.nodeId,destinationSessionId:'elsemesh-session:destination',sessionId:'elsemesh-session:source',sequence:3,authorityEpoch:1,avatarAssetId:hash,inventoryHash:hash,position:[0,0,-.2],velocity:[0,0,-2],yaw:0,pitch:0,controlMode:'HUMAN'});
 const options={portal,sourceAuthority:source.nodeId,sourceEpoch:1,destinationAuthority:destination.nodeId,destinationSessionId:handoff.destinationSessionId,playerNodeId:player.nodeId,destinationRules:f.underneath.rules,supportedCapabilities:FEDERATION_CAPABILITIES,trustedAuthorities:new Set([source.nodeId]),replay:new ReplayGuard(),destinationAdmission:({handoff:h})=>({accepted:true,playerId:h.playerId,playerNodeId:h.playerNodeId,sessionId:h.sessionId,destinationSessionId:h.destinationSessionId,destinationRegion:portal.destinationRegion})};
 return {handoff,options,source,destination,player};
}
test('signed v2 admission binds identity, destination authority/session and rejects replay',()=>{const {handoff,options}=fixture();const r=acceptPortalHandoffV2(handoff,options);assert.deepEqual(r.spawn.position,[10,0,.2]);assert.deepEqual(r.spawn.velocity,[0,0,2]);assert.throws(()=>acceptPortalHandoffV2(handoff,options),/Replayed/);});
for(const field of ['playerNodeId','destinationAuthority','destinationSessionId'])test('signed v2 rejects wrong '+field,()=>{const {handoff,options}=fixture();assert.throws(()=>acceptPortalHandoffV2(handoff,{...options,[field]:field==='destinationSessionId'?'elsemesh-session:other':newIdentity().nodeId}),/content/);});
test('source signature alone does not admit destination entry',()=>{const {handoff,options}=fixture();assert.throws(()=>acceptPortalHandoffV2(handoff,{...options,destinationAdmission:undefined}),/admission denied/);assert.throws(()=>acceptPortalHandoffV2(handoff,{...options,destinationAdmission:()=>({accepted:true})}),/admission denied/);});
test('signed v2 rejects wrong independently admitted session',()=>{const {handoff,options}=fixture();const admit=options.destinationAdmission;assert.throws(()=>acceptPortalHandoffV2(handoff,{...options,destinationAdmission:args=>({...admit(args),sessionId:'elsemesh-session:other'})}),/admission denied/);});
