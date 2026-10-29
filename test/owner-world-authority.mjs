import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newIdentity,signObject,assetId } from '../network/identity.mjs';
import { publishRegion,issueDelegation,createPortalInvitation,acceptPortalInvitation } from '../network/federation.mjs';
import { OwnerWorldAuthority,playerIdForNode } from '../network/owner-world-authority.mjs';
const dir=await mkdtemp(join(tmpdir(),'owner-authority-'));
const ownerA=newIdentity(),ownerB=newIdentity(),a=newIdentity(),b=newIdentity(),player=newIdentity(),viewer=newIdentity();
const playerId=playerIdForNode(player.nodeId),viewerId=playerIdForNode(viewer.nodeId),sessionId='elsemesh-session:browser';
const trustedOwners=new Set([ownerA.nodeId,ownerB.nodeId]);
const rules={gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'DAY',weapons:'DISALLOW',movement:['WALK'],requiredCapabilities:[]};
const portal={protocol:'elsemesh.portal/1',portalId:'elsemesh-portal:a-b',sourceRegion:'elsemesh-region:a',destinationRegion:'elsemesh-region:b',visual:'DOOR',entry:{position:[0,0,0],yaw:0},exit:{position:[10,0,0],yaw:0},enabled:true,requiredCapabilities:[],access:{mode:'PUBLIC',allowPlayers:[]},handoffPolicy:'SIGNED',revision:1};
function published(owner,authority,name){return publishRegion({protocol:'elsemesh.region/1',regionId:`elsemesh-region:${name}`,worldId:`elsemesh-world:${name}`,version:1,ownerPlayerId:playerIdForNode(owner.nodeId),ownerNodeId:owner.nodeId,admins:[],hosts:[authority.nodeId],authority:{nodeId:authority.nodeId,epoch:1},rules,assets:[],portals:name==='a'?[portal.portalId]:['elsemesh-portal:b-a'],participants:{players:[],npcs:[]}},owner);}
const pa=published(ownerA,a,'a'),pb=published(ownerB,b,'b');
const da=issueDelegation(ownerA,{regionId:pa.descriptor.regionId,hostNodeId:a.nodeId,permission:'AUTHORITY',expiresAt:Date.now()+3600000,version:1});
const db=issueDelegation(ownerB,{regionId:pb.descriptor.regionId,hostNodeId:b.nodeId,permission:'AUTHORITY',expiresAt:Date.now()+3600000,version:1});
const reversePortal={...portal,portalId:'elsemesh-portal:b-a',sourceRegion:portal.destinationRegion,destinationRegion:portal.sourceRegion,entry:portal.exit,exit:portal.entry};
const reverseInvitation=createPortalInvitation(ownerB,reversePortal,Date.now()+3600000),reverseAcceptance=acceptPortalInvitation(ownerA,reverseInvitation,trustedOwners);
const invitation=createPortalInvitation(ownerA,portal,Date.now()+3600000),acceptance=acceptPortalInvitation(ownerB,invitation,trustedOwners);
let A,B,dropCommit=false,offline=false;
function opts(identity,published,delegation,peer,name){return {identity,published,delegation,trustedOwners,peers:[{...peer,invitation,acceptance},{...peer,invitation:reverseInvitation,acceptance:reverseAcceptance}],ledgerPath:join(dir,name+'.json'),policy:{viewPlayers:[playerId,viewerId],enterPlayers:[playerId],capacity:2},readWorld:async()=>({frozen:'data'}),clearance:async({reservations,members})=>!reservations.length&&!members.length,rpc:async(node,operation,payload)=>{if(offline)throw new Error('network timeout'); const target=node===a.nodeId?A:B;const result=await target.dispatch(operation,payload,{callerNodeId:identity.nodeId});if(dropCommit&&operation==='commit'){dropCommit=false;throw new Error('reply lost');}return result;}};}
const oa=opts(a,pa,da,{published:pb,delegation:db},'a'),ob=opts(b,pb,db,{published:pa,delegation:da},'b');
// Portal reservations and commit must never invoke the LOCAL spawn allocator.
ob.localSpawnCandidates=()=>{throw Error('Portal arrival attempted local spawn relocation');};
async function proof(authority,identity,action,portalId=null,proofSessionId=sessionId){const challenge=await authority.challenge({playerId:playerIdForNode(identity.nodeId),playerNodeId:identity.nodeId,action,sessionId:proofSessionId,portalId});return signObject({protocol:'elsemesh.owner-player-proof/1',challenge},identity);}
try {
 A=await OwnerWorldAuthority.open(oa);B=await OwnerWorldAuthority.open(ob);
 const view=await B.subscribe({proof:await proof(B,viewer,'VIEW')});assert.deepEqual(await B.read({grantId:view.grantId,request:{}}),{frozen:'data'});
 await assert.rejects(B.enterLocal({proof:await proof(B,viewer,'ENTER'),motion:{position:[0,0,0],velocity:[0,0,0],yaw:0,pitch:0}}),/ENTER access denied/);
 await assert.rejects(B.read({grantId:'made-up'}),/VIEW/);
 const grant=await A.subscribe({proof:await proof(A,player,'VIEW')});
 const motion={position:[0,0,0],velocity:[0,0,1],yaw:0,pitch:0};
 await A.enterLocal({proof:await proof(A,player,'ENTER'),motion});
 const prepare=()=>A.prepare({grantId:grant.grantId,portalId:portal.portalId,proof:undefined,motion,avatarAssetId:assetId(Buffer.from('avatar')),inventoryHash:assetId(Buffer.from('bag'))});
 const request={grantId:grant.grantId,portalId:portal.portalId,proof:await proof(B,player,'ENTER',portal.portalId),motion,avatarAssetId:assetId(Buffer.from('avatar')),inventoryHash:assetId(Buffer.from('bag'))};
 const {transferId}=await A.prepare(request);assert.equal(A.state({grantId:grant.grantId}).status,'FROZEN');
 offline=true;await assert.rejects(A.cancel({transferId}),/network timeout/);assert.equal(A.state({grantId:grant.grantId}).status,'FROZEN');offline=false;
 await A.close();A=await OwnerWorldAuthority.open(oa);assert.equal(A.state({grantId:grant.grantId}).status,'FROZEN');
 const tombstone=await A.cancel({transferId});assert.equal(tombstone.kind,'owner-world-cancel-tombstone');assert.equal(A.state({grantId:grant.grantId}).status,'ACTIVE');
 assert.equal((await B.ready({binding:B.ledger.snapshot().transfers[transferId].binding,proof:request.proof},{callerNodeId:a.nodeId})).kind,'owner-world-cancel-tombstone');
 const second=await A.prepare({...request,proof:await proof(B,player,'ENTER',portal.portalId)});
 dropCommit=true;await assert.rejects(A.handoff({transferId:second.transferId}),/reply lost/);
 assert.equal(A.state({grantId:grant.grantId}).status,'FROZEN');assert.equal(B.ledger.snapshot().members[playerId].status,'ACTIVE');
 await A.close();await B.close();A=await OwnerWorldAuthority.open(oa);B=await OwnerWorldAuthority.open(ob);
 const receipt=await A.status({transferId:second.transferId});assert.equal(receipt.kind,'owner-world-commit-receipt');assert.equal(A.state({grantId:grant.grantId}),null);
 assert.equal(Object.keys(B.ledger.snapshot().members).length,1);
 assert.deepEqual(await A.handoff({transferId:second.transferId}),receipt);
 const saved=B.ledger.snapshot().transfers[second.transferId];assert.deepEqual(await B.commit({transferId:second.transferId,envelope:A.ledger.snapshot().transfers[second.transferId].envelope},{callerNodeId:a.nodeId}),receipt);
 const destinationSession=B.ledger.snapshot().members[playerId].sessionId;
 const destinationGrant=await B.subscribe({proof:await proof(B,player,'VIEW',null,destinationSession)});
 const destinationMember=B.state({grantId:destinationGrant.grantId});assert.equal(destinationMember.generation,1);
 assert.deepEqual(destinationMember.motion.position,B.ledger.snapshot().transfers[second.transferId].reservation.spawn.position);
 await assert.rejects(B.acceptedState({grantId:destinationGrant.grantId,playerId,sessionId:destinationSession,motion:destinationMember.motion,sequence:0,generation:1}),/Stale/);
 const back=await B.prepare({grantId:destinationGrant.grantId,portalId:reversePortal.portalId,proof:await proof(A,player,'ENTER',reversePortal.portalId,destinationSession),motion:destinationMember.motion,avatarAssetId:request.avatarAssetId,inventoryHash:request.inventoryHash,sequence:destinationMember.sequence});
 await B.handoff({transferId:back.transferId});assert.equal(Object.keys(B.ledger.snapshot().members).length,0);assert.equal(A.ledger.snapshot().members[playerId].generation,2);
 console.log('PASS roundtrip with distinct owners; durable sequence/generation;  explicit VIEW/ENTER; durable fence, cancellation tombstone, commit replay and restart recovery');
} finally {await A?.close();await B?.close();await rm(dir,{recursive:true,force:true});}
