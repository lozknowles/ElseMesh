import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OwnerWorldLedger} from '../network/owner-world-ledger.mjs';
import {newIdentity,verifyObject} from '../network/identity.mjs';
import {OwnerWorldWelcome,welcomeIdentity} from '../network/owner-world-welcome.mjs';
const authored=text=>({welcome:{schema:'elsemesh.world-welcome/1',text,audio:true}});
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'owner-welcome-')),file=join(dir,'ledger.sqlite'),binding={world:'stable-world'},identity=newIdentity(),player=newIdentity(),other=newIdentity(),world={worldId:'stable-world',contentDigest:'content',epoch:1,binding:{expiresAt:1000000}};
 let ledger=await OwnerWorldLedger.open(file,binding),now=100000,sequence=0;
 const s={nodeId:player.nodeId,playerId:'player:'+player.nodeId.split(':')[1],sessionId:'current-session',generation:2},grant={grantId:'view'};
 await ledger.transact(state=>{state.members[s.playerId]={playerNodeId:s.nodeId,sessionId:s.sessionId,generation:s.generation,status:'ACTIVE'};state.grants.view={...grant,playerNodeId:s.nodeId,playerId:s.playerId,sessionId:s.sessionId,expiresAt:now+100000};return true;});
 const authority={ledger,assertCurrent(){},policy:{viewPlayers:[s.playerId],enterPlayers:[s.playerId]}};
 let service=new OwnerWorldWelcome({project:authored('Welcome <literal> https://example.test'),world,identity,authority,clock:()=>now});
 t.after(async()=>{await ledger.close();await rm(dir,{recursive:true,force:true});});
 return {s,world,identity,other,authority,get ledger(){return ledger;},get service(){return service;},get now(){return now;},advance(ms){now+=ms;},async reopen(text){await ledger.close();ledger=await OwnerWorldLedger.open(file,binding);authority.ledger=ledger;service=new OwnerWorldWelcome({project:authored(text),world,identity,authority,clock:()=>now});},call(op='world-welcome-read',extra={},actor=s){return service.handle({requestId:'request-'+sequence++,operation:op,payload:{worldId:world.worldId,contentDigest:world.contentDigest,authorityEpoch:world.epoch,welcomeHash:service.welcomeHash,sessionId:actor.sessionId,generation:actor.generation,presentationId:'arrival-a',welcomeRequestId:'welcome-'+sequence,...extra}},actor,grant);}};
}
test('welcome schema rejects malformed data and preserves literal text',()=>{
 assert.equal(welcomeIdentity({}).welcome,null);
 for(const welcome of [null,{schema:'wrong',text:'x',audio:true},{schema:'elsemesh.world-welcome/1',text:' ',audio:true},{schema:'elsemesh.world-welcome/1',text:'x',audio:'yes'},{schema:'elsemesh.world-welcome/1',text:'x',audio:true,url:'bad'},{schema:'elsemesh.world-welcome/1',text:'x\u0000',audio:true}])assert.throws(()=>welcomeIdentity({welcome}));
 assert.equal(welcomeIdentity(authored('<b>literal</b>')).welcome.text,'<b>literal</b>');
});
test('first active arrival claims; read retry retains claim; signed response binds request and context',async t=>{
 const f=await fixture(t),r=await f.call(),retry=await f.call();assert.equal(r.allowed,true);assert.equal(r.result.seen,false);assert.equal(r.result.claimId,retry.result.claimId);assert.equal(r.result.claimExpiresAt-f.now,10000);assert.equal(r.expiresAt-r.issuedAt,3000);assert.equal(r.worldId,f.world.worldId);assert.equal(r.playerNodeId,f.s.nodeId);assert.equal(verifyObject(r,new Set([f.identity.nodeId])),true);assert.ok(r.welcomeRequestId);assert.ok(r.requestId);
});
test('concurrent tabs cannot take a live claim; expiry permits a new arrival claim',async t=>{
 const f=await fixture(t),first=await f.call(),pending=await f.call('world-welcome-read',{presentationId:'arrival-b'});assert.equal(pending.result.pending,true);assert.equal(pending.result.welcome,undefined);assert.equal(pending.result.retryAt,first.result.claimExpiresAt);
 f.advance(10000);const next=await f.call('world-welcome-read',{presentationId:'arrival-b'});assert.notEqual(next.result.claimId,first.result.claimId);assert.equal(next.result.welcome.audio,true);
 assert.equal((await f.call('world-welcome-ack',{claimId:first.result.claimId})).allowed,false);
});
test('ack is durable/idempotent; reload and return do not greet; same world text edits preserve seen',async t=>{
 const f=await fixture(t),first=await f.call(),data={claimId:first.result.claimId};assert.equal((await f.call('world-welcome-ack',data)).result.seen,true);assert.equal((await f.call('world-welcome-ack',data)).result.seen,true);
 await f.reopen('Edited welcome with the same stable world identity');const after=await f.call('world-welcome-read',{presentationId:'return-arrival'});assert.equal(after.result.seen,true);assert.equal(after.result.welcome,undefined);assert.equal((await f.call('world-welcome-ack',data)).allowed,false);
});
test('wrong player, session, generation, authority, world, content and welcome hash deny without visit mutation',async t=>{
 const f=await fixture(t);
 for(const patch of [{sessionId:'wrong'},{generation:1},{authorityEpoch:2},{worldId:'other'},{contentDigest:'other'},{welcomeHash:'other'}])assert.equal((await f.call('world-welcome-read',patch)).allowed,false);
 const wrong={...f.s,nodeId:f.other.nodeId,playerId:'player:'+f.other.nodeId.split(':')[1]};assert.equal((await f.call('world-welcome-read',{},wrong)).allowed,false);assert.equal(f.ledger.snapshot().worldWelcome,undefined);
});
test('frozen or absent membership and missing VIEW or ENTER deny failed transfers without consuming visit',async t=>{
 const f=await fixture(t);
 for(const status of ['FROZEN','DEPARTED']){await f.ledger.transact(state=>{state.members[f.s.playerId].status=status;return true;});assert.equal((await f.call()).allowed,false);}
 await f.ledger.transact(state=>{delete state.members[f.s.playerId];return true;});assert.equal((await f.call()).allowed,false);
 assert.equal(f.ledger.snapshot().worldWelcome,undefined);
});
test('generic VIEW/ENTER ceilings are required and ordinary denial does not freeze membership',async t=>{
 const f=await fixture(t);f.authority.policy.viewPlayers=[];assert.equal((await f.call()).allowed,false);f.authority.policy.viewPlayers=[f.s.playerId];f.authority.policy.enterPlayers=[];assert.equal((await f.call()).allowed,false);assert.equal(f.ledger.snapshot().members[f.s.playerId].status,'ACTIVE');assert.equal(f.ledger.snapshot().worldWelcome,undefined);
});
test('ack requires exact live claim and presentation; expiry does not record seen',async t=>{
 const f=await fixture(t),r=await f.call();for(const patch of [{claimId:'wrong'},{claimId:r.result.claimId,presentationId:'other'}])assert.equal((await f.call('world-welcome-ack',patch)).allowed,false);
 f.advance(10000);assert.equal((await f.call('world-welcome-ack',{claimId:r.result.claimId})).allowed,false);assert.equal(f.ledger.snapshot().worldWelcome.visits[JSON.stringify([f.world.worldId,f.s.playerId])].seen,false);
});
test('private visit read never exposes another player records; unavailable storage returns typed failure',async t=>{
 const f=await fixture(t);await f.call();const r=await f.call();assert.equal(r.result.visits,undefined);assert.equal(r.result.playerId,undefined);
 const service=new OwnerWorldWelcome({project:authored('Hello'),world:f.world,identity:f.identity,authority:{...f.authority,ledger:{transact(){throw Error('private database detail');}}},clock:()=>f.now});
 const unavailable=await service.handle({operation:'world-welcome-read',requestId:'failed',payload:{welcomeRequestId:'failure'}},f.s,{grantId:'view'});assert.equal(unavailable.allowed,false);assert.equal(unavailable.message,'Welcome unavailable');assert.equal(JSON.stringify(unavailable).includes('private database detail'),false);
});
