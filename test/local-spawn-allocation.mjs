import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {newIdentity,signObject} from '../network/identity.mjs';
import {publishRegion,issueDelegation} from '../network/federation.mjs';
import {OwnerWorldAuthority,playerIdForNode} from '../network/owner-world-authority.mjs';
import {createLocalSpawnCandidates,LOCAL_SPAWN} from '../network/spawn-allocation.mjs';
import {createRepositoryMotionClearance,createRepositoryGeometrySupport} from '../network/repository-motion-clearance.mjs';

const motion={position:[999,999,999],velocity:[1,2,3],yaw:1.25,pitch:.2};
async function fixture(t,{capacity=4,supportAt=()=>0,clearance=()=>true}={}) {
  const dir=await mkdtemp(join(tmpdir(),'local-spawn-')),owner=newIdentity(),identity=newIdentity(),players=Array.from({length:5},()=>newIdentity());
  const published=publishRegion({protocol:'elsemesh.region/1',regionId:'elsemesh-region:spawn',worldId:'elsemesh-world:spawn',version:1,ownerPlayerId:playerIdForNode(owner.nodeId),ownerNodeId:owner.nodeId,admins:[],hosts:[identity.nodeId],authority:{nodeId:identity.nodeId,epoch:1},rules:{gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'DAY',weapons:'DISALLOW',movement:['WALK'],requiredCapabilities:[]},assets:[],portals:[],participants:{players:[],npcs:[]}},owner);
  const delegation=issueDelegation(owner,{regionId:published.descriptor.regionId,hostNodeId:identity.nodeId,permission:'AUTHORITY',expiresAt:Date.now()+3600000,version:1});
  const options={identity,published,delegation,trustedOwners:new Set([owner.nodeId]),ledgerPath:join(dir,'ledger.sqlite'),policy:{enterPlayers:players.slice(0,4).map(p=>playerIdForNode(p.nodeId)),capacity},readWorld:async()=>null,localSpawnCandidates:createLocalSpawnCandidates({position:[0,0,0],supportAt,clearance}),clearance:async({spawn,members,reservations})=>{
    await Promise.resolve();
    return clearance(spawn.position)&&![...members.map(m=>m.motion),...reservations.map(r=>r.reservation.spawn)].some(m=>Math.hypot(m.position[0]-spawn.position[0],m.position[2]-spawn.position[2])<.65&&Math.abs(m.position[1]-spawn.position[1])<1.8);
  }};
  let authority=await OwnerWorldAuthority.open(options);
  t.after(async()=>{await authority.close();await rm(dir,{recursive:true,force:true});});
  const proof=async(player,portalId=null)=>signObject({protocol:'elsemesh.owner-player-proof/1',challenge:await authority.challenge({playerId:playerIdForNode(player.nodeId),playerNodeId:player.nodeId,action:'ENTER',sessionId:'elsemesh-session:spawn',portalId})},player);
  return {get authority(){return authority;},players,proof,reopen:async()=>{await authority.close();authority=await OwnerWorldAuthority.open(options);}};
}

test('simultaneous local entries choose authored then deterministic nearest clear poses atomically; capacity and replay persist',async t=>{
  const f=await fixture(t,{capacity:3}),proofs=await Promise.all(f.players.slice(0,4).map(p=>f.proof(p)));
  const result=await Promise.allSettled(proofs.map(proof=>f.authority.enterLocal({proof,motion})));
  assert.deepEqual(result.map(r=>r.status),['fulfilled','fulfilled','fulfilled','rejected']);
  assert.match(result[3].reason.message,/capacity full/);
  assert.deepEqual(result.slice(0,3).map(r=>r.value.motion.position),[[0,0,0],[-.8,0,0],[0,0,-.8]]);
  for(const r of result.slice(0,3)) {assert.equal(r.value.motion.yaw,motion.yaw);assert.deepEqual(r.value.motion.velocity,motion.velocity);assert.equal(r.value.motion.pitch,motion.pitch);}
  await f.reopen();
  assert.equal(Object.keys(f.authority.ledger.snapshot().members).length,3);
  await assert.rejects(f.authority.enterLocal({proof:proofs[0],motion}),/signature\/nonce/);
});

test('blocked authored pose skips solid geometry; unknown floors, steep height differences and all blocked poses fail closed',async t=>{
  const clear=p=>Math.abs(p[0])>.4||Math.abs(p[2])>.4;
  const f=await fixture(t,{clearance:clear});
  assert.deepEqual((await f.authority.enterLocal({proof:await f.proof(f.players[0]),motion})).motion.position,[-.8,0,0]);
  for(const options of [{supportAt:()=>-Infinity},{supportAt:()=>NaN},{supportAt:()=>2},{clearance:()=>false}]) {
    const blocked=await fixture(t,options),proof=await blocked.proof(blocked.players[0]);
    await assert.rejects(blocked.authority.enterLocal({proof,motion}),/Arrival clearance denied/);
    const state=blocked.authority.ledger.snapshot();
    assert.equal(Object.keys(state.members).length,0);
    assert.ok(state.challenges[proof.challenge.nonce], 'failed admission rolls back nonce with membership');
  }
});

test('signed ENTER policy and portal binding are checked before candidate allocation',async t=>{
  const f=await fixture(t);
  f.authority.localSpawnCandidates=()=>{throw Error('allocator must not run');};
  await assert.rejects(f.authority.enterLocal({proof:await f.proof(f.players[4]),motion}),/ENTER access denied/);
  await assert.rejects(f.authority.enterLocal({proof:await f.proof(f.players[0],'elsemesh-portal:other'),motion}),/portal requires transfer/);
});

test('reserved portal arrivals block local poses and count toward capacity',async t=>{
  const f=await fixture(t,{capacity:2});
  await f.authority.ledger.transact(state=>{state.transfers.reserved={role:'DESTINATION',status:'RESERVED',binding:{playerId:'player:reserved'},reservation:{spawn:{position:[0,0,0]}}};return null;});
  const first=await f.authority.enterLocal({proof:await f.proof(f.players[0]),motion});
  assert.deepEqual(first.motion.position,[-.8,0,0]);
  await assert.rejects(f.authority.enterLocal({proof:await f.proof(f.players[1]),motion}),/capacity full/);
});

test('candidate list preserves authored supported height and uses bounded nearest ground with real geometry',()=>{
  const colliders=[{object:{collision:'solid'},bounds:{min:{x:-.35,y:0,z:-.35},max:{x:.35,y:2,z:.35}}}];
  const heightAt=(x,z)=>x<0?.2:0,clearance=createRepositoryMotionClearance({colliders,heightAt,width:10,depth:10});
  const candidates=createLocalSpawnCandidates({position:[0,0,0],supportAt:createRepositoryGeometrySupport(colliders,heightAt),clearance})();
  assert.deepEqual(candidates[0],[-.8,.2,0]);
  for(const p of candidates){assert.ok(Math.hypot(p[0],p[2])<=LOCAL_SPAWN.radius+1e-7);assert.ok(clearance(p));}
  assert.ok(candidates.length<=LOCAL_SPAWN.maxCandidates);
  assert.deepEqual(createLocalSpawnCandidates({position:[0,.02,0],supportAt:()=>0,clearance:()=>true})()[0],[0,.02,0]);
  assert.deepEqual(createLocalSpawnCandidates({position:[0,0,0],supportAt:()=>-Infinity,clearance:()=>true})(),[]);
});
