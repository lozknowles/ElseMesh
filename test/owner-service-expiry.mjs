import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newIdentity} from '../network/identity.mjs';
import {publishRegion,issueDelegation} from '../network/federation.mjs';
import {OwnerWorldAuthority,playerIdForNode} from '../network/owner-world-authority.mjs';
import {OwnerObjectAccess} from '../network/owner-object-access.mjs';
import {OwnerWorldWelcome} from '../network/owner-world-welcome.mjs';
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'owner-service-expiry-')),owner=newIdentity(),identity=newIdentity(),player=newIdentity(),realNow=Date.now,base=realNow();let offset=0;
 Date.now=()=>base+offset;t.after(()=>{Date.now=realNow;});
 const published=publishRegion({protocol:'elsemesh.region/1',regionId:'elsemesh-region:expiry',worldId:'elsemesh-world:expiry',version:1,ownerPlayerId:playerIdForNode(owner.nodeId),ownerNodeId:owner.nodeId,admins:[],hosts:[identity.nodeId],authority:{nodeId:identity.nodeId,epoch:1},rules:{gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'DAY',weapons:'DISALLOW',movement:['WALK'],requiredCapabilities:[]},assets:[],portals:[],participants:{players:[],npcs:[]}},owner);
 const delegation=issueDelegation(owner,{regionId:published.descriptor.regionId,hostNodeId:identity.nodeId,permission:'AUTHORITY',expiresAt:base+100000,version:1});
 const s={nodeId:player.nodeId,playerId:playerIdForNode(player.nodeId),sessionId:'elsemesh-session:expiry',generation:0},world={worldId:'elsemesh.world:expiry',contentDigest:'content',ownerNodeId:owner.nodeId,epoch:1,binding:{expiresAt:base+100000}};
 const authority=await OwnerWorldAuthority.open({identity,published,delegation,trustedOwners:[owner.nodeId],ledgerPath:join(dir,'ledger.sqlite'),policy:{viewPlayers:[s.playerId],enterPlayers:[s.playerId]},readWorld:async()=>null,clearance:async()=>true});t.after(async()=>{await authority.close();await rm(dir,{recursive:true,force:true});});
 await authority.ledger.transact(state=>{state.members[s.playerId]={playerNodeId:s.nodeId,sessionId:s.sessionId,generation:0,status:'ACTIVE',motion:{position:[0,0,0]}};state.grants.view={grantId:'view',playerNodeId:s.nodeId,playerId:s.playerId,sessionId:s.sessionId,expiresAt:base+50000};return true;});
 const project={objects:[{id:'computer',kind:'computer',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,computer:{}}],welcome:{schema:'elsemesh.world-welcome/1',text:'Welcome',audio:false}},access=new OwnerObjectAccess({project,world,identity,authority,players:{[s.nodeId]:{label:'Player'}}}),welcome=new OwnerWorldWelcome({project,world,identity,authority});let request=0;
 const call=(service,operation,extra={})=>service.handle({requestId:'expiry-'+request++,operation,payload:{worldId:world.worldId,contentDigest:world.contentDigest,sessionId:s.sessionId,generation:0,authorityEpoch:1,welcomeHash:welcome.welcomeHash,presentationId:'presentation',welcomeRequestId:'welcome-'+request,...extra}},s,{grantId:'view'});
 return {authority,world,access,welcome,s,call,advance(ms){offset+=ms;}};
}
test('expired actual signed authority delegation cannot read/use objects or consume a first visit',async t=>{
 const f=await fixture(t),before=f.authority.ledger.snapshot();f.advance(100001);
 await assert.rejects(f.call(f.access,'object-access-read'),/delegation|expired/i);
 assert.equal((await f.call(f.welcome,'world-welcome-read')).allowed,false);assert.deepEqual(f.authority.ledger.snapshot(),before);
});
test('content admission is rechecked inside execution before access or welcome mutation',async t=>{
 const f=await fixture(t),before=f.authority.ledger.snapshot();f.world.binding.expiresAt=Date.now()-1;
 await assert.rejects(f.call(f.access,'object-access-read'),/content admission/i);assert.equal((await f.call(f.welcome,'world-welcome-read')).allowed,false);assert.deepEqual(f.authority.ledger.snapshot(),before);
});
test('queued object and welcome work cannot use a VIEW grant that expires before execution',async t=>{
 const f=await fixture(t);await f.call(f.access,'object-access-read');const before=f.authority.ledger.snapshot();let release,entered;
 const begun=new Promise(r=>entered=r),blocked=f.authority.ledger.transact(async()=>{entered();await new Promise(r=>release=r);return null;});await begun;
 const a=f.call(f.access,'object-access-read'),w=f.call(f.welcome,'world-welcome-read');f.advance(50001);release();await blocked;
 assert.equal((await a).allowed,false);assert.equal((await w).allowed,false);assert.deepEqual(f.authority.ledger.snapshot(),before);
});
test('queued work rechecks authority expiry after awaiting the ledger lane',async t=>{
 const f=await fixture(t),before=f.authority.ledger.snapshot();let release,entered;
 const begun=new Promise(r=>entered=r),blocked=f.authority.ledger.transact(async()=>{entered();await new Promise(r=>release=r);return null;});await begun;
 const a=f.call(f.access,'object-access-read'),w=f.call(f.welcome,'world-welcome-read');f.advance(100001);release();await blocked;
 await assert.rejects(a,/delegation|expired/i);assert.equal((await w).allowed,false);assert.deepEqual(f.authority.ledger.snapshot(),before);
});
