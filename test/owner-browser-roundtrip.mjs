import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {WebSocket} from 'ws';
import {newIdentity,assetId,verifyObject,signObject,canonical} from '../network/identity.mjs';
import {initOwnerSetup,inviteOwnerSetup,acceptOwnerSetup,finalizeOwnerSetup} from '../tools/networking/owner-world-setup.mjs';
import {createOwnerPeerRelay} from '../tools/networking/owner-peer-relay.mjs';
import {createOwnerWorldRuntime} from '../tools/networking/owner-world-runtime.mjs';
import {OwnerWorldTransport} from '../src/world-runtime/OwnerWorldTransport.js';
import {createWorld,packWorldRepository,loadWorldSource,mapPortalPoint,mapPortalDirection,mapPortalYaw} from '../src/world-runtime/vendor/world-engine-contract.js';

// Protocol integration only: browser transport class + Node WebCrypto/Origin shim. No renderer or physical browser/device evidence.
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const appearance={style:'female',shirt:'#33785b',trousers:'#27313d',skin:'#805136',hair:'#171512'};
// Existing federation/2 mapping deterministically rounds vector components to six decimals.
const closeTo=(actual,expected,label)=>{assert.equal(actual.length,expected.length,label);for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<=0.00000051,label+' axis '+i+': '+actual[i]+' versus '+expected[i]);};
async function fixture(t,{destinationEnter=true,relayAbsent=false,remoteExpired=null}={}){
 const dir=await mkdtemp(join(tmpdir(),'owner-browser-roundtrip-')),web=join(dir,'web'),player=newIdentity(),frames=[],runtimes=[],transports=[];
 let relay;const oldLocation=globalThis.location,oldSocket=globalThis.WebSocket;
 t.after(async()=>{for(const transport of transports)transport.disconnect();globalThis.location=oldLocation;globalThis.WebSocket=oldSocket;for(const runtime of runtimes)await runtime.close();await relay?.close();await rm(dir,{recursive:true,force:true});});
 await mkdir(web);await writeFile(join(web,'worlds.html'),'Protocol fixture; no renderer');
 const projects=[createWorld('Browser owner A'),createWorld('Browser owner B')];
 for(const p of projects){p.spawn.position=[0,20,.2];p.terrain.heights.fill(20);} // Explicit supported floor for admission.
 for(const[i,p]of projects.entries())p.portals=[{id:'elsemesh-portal:browser-'+i,name:'Door',position:[0,21.5,0],yaw:i?-.3:.4,width:3,height:3,destination:{worldId:projects[1-i].metadata.worldId,regionId:projects[1-i].metadata.regionId,portalId:'elsemesh-portal:browser-'+(1-i)},enabled:true,view:{enabled:true,maxDistance:20},traversal:{enabled:true},policyRef:'approved-owner-contact',visual:{frameColor:'#abcdef',unavailableColor:'#334455'}}];
 const states=[join(dir,'owner-a'),join(dir,'owner-b')],contacts=[],configs=[],identities=[];
 for(const[i,p]of projects.entries()){
  const root=join(dir,'repo-'+i);await mkdir(root);
  for(const[path,bytes]of await packWorldRepository(p)){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),bytes);}
  git(root,'init','-q');git(root,'add','.');git(root,'-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','fixture');
  contacts.push(await initOwnerSetup({stateDir:states[i],worldRoot:root,commit:git(root,'rev-parse','HEAD'),staticRoot:web}));
 }
 const invitations=await Promise.all(states.map((stateDir,i)=>inviteOwnerSetup({stateDir,peerContact:contacts[1-i],peerOwnerNodeId:contacts[1-i].signer})));
 const acceptances=await Promise.all(states.map((stateDir,i)=>acceptOwnerSetup({stateDir,invitation:invitations[1-i]})));
 for(const[i,stateDir]of states.entries()){
  configs.push(await finalizeOwnerSetup({stateDir,peerAcceptance:acceptances[1-i],enrollment:[{nodeId:player.nodeId,label:'WebCrypto traveler',view:true,enter:i===0||destinationEnter}],avatarAssetId:assetId(Buffer.from('repository-avatar/1')),inventoryHash:assetId(Buffer.from('empty'))}));
  identities.push(JSON.parse(await readFile(join(stateDir,'authority.json'),'utf8')));
 }
 relay=await createOwnerPeerRelay({port:0,onFrame:p=>frames.push(JSON.parse(JSON.stringify(p)))});
 const relayUrl='ws://127.0.0.1:'+relay.address.port;
 if(relayAbsent)await relay.close();
 if(remoteExpired){
  const owners=await Promise.all(states.map(async dir=>JSON.parse(await readFile(join(dir,'owner.json'),'utf8'))));
  const resign=(signed,owner,patch)=>{const {signature,signer,publicKey,...body}=signed;return signObject({...body,...patch},owner);};
  if(remoteExpired==='delegation')for(const peer of configs[0].peers)peer.delegation=resign(peer.delegation,owners[1],{expiresAt:Date.now()-1000});
  else{const peer=configs[0].peers[0];peer.invitation=resign(peer.invitation,owners[0],{expiresAt:Date.now()-1000});peer.acceptance=resign(peer.acceptance,owners[1],{invitationHash:assetId(Buffer.from(canonical(peer.invitation)))});}
 }
 for(let i=0;i<2;i++)runtimes.push(await createOwnerWorldRuntime({root:web,config:configs[i],identity:identities[i],relayUrl,port:0}));
 const origin='http://127.0.0.1:'+runtimes[0].address.port;
 globalThis.location=new URL(origin);
 globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin});}};
 const privateCryptoKey=await crypto.subtle.importKey('pkcs8',Buffer.from(player.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),{name:'Ed25519'},false,['sign']);
 const identity={nodeId:player.nodeId,publicKeyPEM:player.publicKeyPem,privateCryptoKey},errors=[],memberships=[],worldStatuses=[],presences=[];
 const transport=new OwnerWorldTransport({config:runtimes[0].config,error:e=>errors.push(e),membership:m=>memberships.push(m),worldStatus:s=>worldStatuses.push(s),presence:p=>presences.push(p)});
 transports.push(transport);
 const welcome=await transport.connect({identity});
 return{dir,projects,player,contacts,configs,identities,runtimes,relay,frames,transport,welcome,errors,memberships,worldStatuses,presences,playerId:'player:'+player.nodeId.split(':')[1]};
}
const crossingPose=(project,yaw)=>{const angle=project.portals[0].yaw;return{position:[-.2*Math.sin(angle),20,-.2*Math.cos(angle)],velocity:[-Math.sin(angle),0,-Math.cos(angle)],yaw,appearance};};
async function travel(f,from,to,yaw){
 const transport=f.transport,source=f.projects[from],destination=f.projects[to],sourceId=source.metadata.worldId,destinationId=destination.metadata.worldId,sourceSession=transport.membership.sessionId,sourceGeneration=transport.generation;
 const descriptor=await transport.subscribe(destinationId,source.portals[0].id);
 assert.equal(descriptor.worldId,destinationId);
 const preview=await loadWorldSource(transport.source(destinationId));
 assert.equal(preview.identity.contentDigest,descriptor.contentDigest);
 assert.equal(preview.project.metadata.worldId,destinationId);
 const pose=crossingPose(source,yaw),receipt=await transport.sendAcceptedState(pose);
 assert.equal(receipt.authoredWorldId,sourceId);assert.equal(receipt.sessionId,sourceSession);
 assert.equal(verifyObject(receipt,new Set([f.identities[from].nodeId])),true);
 const reservation=await transport.prepare(source.portals[0].id);
 assert.equal(reservation.sourceWorldId,sourceId);assert.equal(reservation.destinationWorldId,destinationId);assert.equal(reservation.state,'prepared');
 assert.equal(f.runtimes[from].authority.ledger.snapshot().members[f.playerId].status,'FROZEN');
 transport.setRecoveryContext({reservation,descriptor});transport.setFrozen(true);
 const ready=await transport.ready(reservation.id,descriptor.contentDigest,descriptor.epoch);assert.equal(ready.ready,true);
 await transport.handoff(reservation.id);
 const committed=await transport.commit(reservation.id);
 assert.equal(committed.state,'committed');assert.equal(transport.worldId,destinationId);assert.equal(transport.generation,sourceGeneration+1);
 assert.equal(transport.membership.sessionId,reservation.destinationSessionId);assert.notEqual(transport.membership.sessionId,sourceSession);
 assert.equal(transport.membership.world.contentDigest,descriptor.contentDigest);assert.equal(transport.membership.world.worldId,destinationId);
 assert.equal(transport.sequence,committed.nextSequence);
 closeTo(committed.position,mapPortalPoint(source.portals[0],destination.portals[0],pose.position),'mapped position');
 closeTo(committed.velocity,mapPortalDirection(source.portals[0],destination.portals[0],pose.velocity),'mapped velocity');
 assert.ok(Math.abs(committed.yaw-mapPortalYaw(source.portals[0],destination.portals[0],yaw))<1e-9,'mapped yaw');
 assert.equal(f.runtimes[from].authority.ledger.snapshot().members[f.playerId],undefined);
 const member=f.runtimes[to].authority.ledger.snapshot().members[f.playerId];assert.equal(member.status,'ACTIVE');assert.equal(member.sessionId,transport.membership.sessionId);assert.equal(member.generation,transport.generation);
 const status=await transport.status(reservation.id);assert.equal(status.state,'committed');assert.equal(transport.generation,sourceGeneration+1);
 transport.setFrozen(false);return committed;
}

test('actual browser transport performs signed preview, encrypted remote reads, committed travel and return',{timeout:60000},async t=>{
 const f=await fixture(t),aid=f.projects[0].metadata.worldId,bid=f.projects[1].metadata.worldId;
 assert.equal(f.welcome.worldId,aid);assert.equal(f.transport.sequence,f.welcome.nextSequence);
 assert.notEqual(f.contacts[0].signer,f.contacts[1].signer);assert.notEqual(f.identities[0].nodeId,f.identities[1].nodeId);
 const first=await travel(f,0,1,.23);
 assert.equal(f.transport.worldId,bid);
 const accepted=await f.transport.sendAcceptedState({...crossingPose(f.projects[1],first.yaw),velocity:[0,0,0]});
 assert.equal(accepted.authoredWorldId,bid);assert.equal(verifyObject(accepted,new Set([f.identities[1].nodeId])),true);
 const back=await travel(f,1,0,first.yaw);
 assert.equal(f.transport.worldId,aid);assert.equal(f.transport.generation,2);assert.ok(Math.abs(back.yaw-.23)<1e-9);
 assert.equal(Object.keys(f.runtimes[0].authority.ledger.snapshot().members).length,1);assert.equal(Object.keys(f.runtimes[1].authority.ledger.snapshot().members).length,0);
 assert.ok(f.frames.some(p=>p.kind==='sealed'));assert.equal(JSON.stringify(f.frames).includes('world.json'),false);assert.equal(JSON.stringify(f.frames).includes('owner-browser'),false);
 assert.deepEqual(f.errors,[]);
});

test('actual browser preview VIEW does not authorize destination ENTER',{timeout:60000},async t=>{
 const f=await fixture(t,{destinationEnter:false}),aid=f.projects[0].metadata.worldId,bid=f.projects[1].metadata.worldId;
 const descriptor=await f.transport.subscribe(bid);
 assert.equal((await loadWorldSource(f.transport.source(bid))).identity.contentDigest,descriptor.contentDigest);
 await f.transport.sendAcceptedState(crossingPose(f.projects[0],0));
 const denied=await f.transport.prepare(f.projects[0].portals[0].id);
 assert.equal(denied.state,'cancelled');assert.equal(f.transport.worldId,aid);assert.equal(f.transport.generation,0);
 assert.equal(verifyObject(denied.ownerTombstone,new Set([f.identities[1].nodeId])),true);
 assert.equal(f.runtimes[0].authority.ledger.snapshot().members[f.playerId].status,'ACTIVE');
 assert.equal(f.runtimes[1].authority.ledger.snapshot().members[f.playerId],undefined);
});


test('browser rejects valid authority signatures carrying the wrong transfer record kind',async()=>{
 const authority=newIdentity(),player=newIdentity(),worldId='elsemesh.world:kind-destination',sourceId='elsemesh.world:kind-source',id=crypto.randomUUID();
 const binding={transferId:id,playerNodeId:player.nodeId},bindingHash=assetId(Buffer.from(canonical(binding)));
 const kinds=['owner-world-cancel-tombstone','owner-world-reservation','owner-world-commit-receipt'];
 const signed=kind=>{const proof=signObject({kind,transferId:id,bindingHash},authority);assert.equal(verifyObject(proof,new Set([authority.nodeId])),true);return proof;};
 const transport=new OwnerWorldTransport({config:{contacts:[{worldId,authorityNodeId:authority.nodeId}]}});
 transport.identity={nodeId:player.nodeId};transport.worldId=sourceId;transport.generation=0;
 transport.membership={worldId:sourceId,sessionId:'elsemesh-session:before',generation:0};
 transport.setFrozen(true);
 for(const kind of kinds.filter(k=>k!=='owner-world-cancel-tombstone')){
  await assert.rejects(transport.verifyCancellation({id,destinationWorldId:worldId,ownerBinding:binding,ownerTombstone:signed(kind)}),/cancellation is not proved/);
  assert.equal(transport.frozen,true);
 }
 const reservation={id,sourceWorldId:sourceId,destinationWorldId:worldId,sourceGeneration:0,ownerReservation:{bindingHash}};
 const descriptor={published:{descriptor:{authority:{nodeId:authority.nodeId}}}};
 transport.setRecoveryContext({reservation,descriptor});
 for(const kind of kinds.filter(k=>k!=='owner-world-commit-receipt')){
  await assert.rejects(transport.adoptCommit({id,state:'committed',destinationWorldId:worldId,generation:1,destinationSessionId:'elsemesh-session:after',ownerReceipt:signed(kind)}),/commit receipt is invalid/);
  assert.equal(transport.worldId,sourceId);assert.equal(transport.generation,0);assert.equal(transport.membership.sessionId,'elsemesh-session:before');assert.equal(transport.frozen,true);
 }
 transport.request=async()=>({worldId});
 for(const kind of kinds.filter(k=>k!=='owner-world-reservation')){
  transport.authenticatedRequest=async(_operation,data)=>{
   const proof=signObject({kind,transferId:data.transferId,bindingHash},authority);
   assert.equal(verifyObject(proof,new Set([authority.nodeId])),true);
   return{id:data.transferId,state:'prepared',destinationWorldId:worldId,ownerReservation:proof};
  };
  await assert.rejects(transport.prepare('elsemesh-portal:kind-check'),/Invalid destination reservation/);
  assert.equal(transport.worldId,sourceId);assert.equal(transport.generation,0);assert.equal(transport.frozen,true);
 }
 transport.disconnect();
});


const waitFor=async(predicate,message,timeout=7000)=>{const until=Date.now()+timeout;while(!predicate()){if(Date.now()>until)throw Error('Timed out: '+message);await new Promise(resolve=>setTimeout(resolve,20));}};
test('local owner starts and moves with absent relay; reconnect requires fresh VIEW before live',{timeout:30000},async t=>{
 const f=await fixture(t,{relayAbsent:true}),aid=f.projects[0].metadata.worldId,bid=f.projects[1].metadata.worldId,port=f.relay.address.port;
 assert.equal(f.transport.worldId,aid);assert.equal(f.runtimes[0].rpc.status().connected,false);
 const initial=await f.transport.sendAcceptedState(crossingPose(f.projects[0],0));assert.equal(initial.authoredWorldId,aid);
 await assert.rejects(f.transport.subscribe(bid),/disconnected|rejected/);
 assert.equal(f.worldStatuses.at(-1).status,'offline');assert.ok(f.presences.some(p=>p.worldId===bid&&p.players.length===0));
 let relay=await createOwnerPeerRelay({port});t.after(()=>relay.close());
 await waitFor(()=>f.runtimes.every(r=>r.rpc.status().connected),'relay connects without restarting authorities');
 await waitFor(()=>f.worldStatuses.some(s=>s.worldId===bid&&s.status==='live'),'fresh VIEW and authenticated presence restore live');
 const grants=()=>Object.values(f.runtimes[1].authority.ledger.snapshot().grants).filter(g=>g.playerNodeId===f.player.nodeId).length;
 const firstGrants=grants();assert.ok(firstGrants>=1);
 const firstEpoch=f.transport.ownerWorldEpoch.get(bid)??0,connection=f.transport.connectionEpoch;
 await relay.close();await waitFor(()=>f.transport.ownerWorldOnline.get(bid)===false,'peer offline clears portal state');
 assert.equal(f.transport.ownerGrantExpiry.has(bid),false);
 const events=f.worldStatuses.length;f.transport.markWorldLive(bid,firstEpoch,connection);assert.equal(f.worldStatuses.length,events,'Stale earlier epoch cannot restore portal');
 const local=await f.transport.sendAcceptedState(crossingPose(f.projects[0],.1));assert.equal(local.authoredWorldId,aid);
 relay=await createOwnerPeerRelay({port});
 await waitFor(()=>f.transport.ownerWorldOnline.get(bid)===true,'second fresh VIEW restores live');
 assert.ok(grants()>firstGrants,'Pre-outage grant cannot restore live');
 assert.equal(f.transport.generation,0);assert.equal(f.runtimes[0].authority.ledger.snapshot().members[f.playerId].status,'ACTIVE');
 await relay.close();
 let starts=0;const a=f.runtimes.shift();a.rpc.start=async()=>{starts++;throw Error('Absent relay');};
 await waitFor(()=>starts>0,'single retry scheduler attempts connection');
 await a.close();const afterClose=starts;await new Promise(r=>setTimeout(r,600));assert.equal(starts,afterClose,'Terminal shutdown cancels retries');
});
test('a hanging remote presence lane does not delay signed local accepted state',{timeout:15000},async t=>{
 const f=await fixture(t),aid=f.projects[0].metadata.worldId,bid=f.projects[1].metadata.worldId;
 await f.transport.subscribe(bid);clearInterval(f.transport.ownerPoll);
 let release,started=false;
 // Hold one remote facade request before peer transmission while the same browser sends local state.
 const originalRequest=f.runtimes[0].rpc.request;
 f.runtimes[0].rpc.request=async(...args)=>{if(args[1]==='owner-browser'&&args[2]?.operation==='presence'){started=true;await new Promise(resolve=>{release=resolve;});}return originalRequest(...args);};
 const remote=f.transport.request('presence',{worldId:bid});
 await waitFor(()=>started&&release,'remote request deliberately held',1000);
 const before=performance.now();const local=await f.transport.sendAcceptedState(crossingPose(f.projects[0],.2));
 assert.ok(performance.now()-before<1000,'Local mutation must not wait for remote timeout');assert.equal(local.authoredWorldId,aid);
 release();assert.equal((await remote).worldId,bid);
 f.runtimes[0].rpc.request=originalRequest;
});
for(const remoteExpired of ['delegation','invitation'])test('expired remote '+remoteExpired+' cannot prevent local owner startup or authorize remote content',{timeout:15000},async t=>{
 const f=await fixture(t,{remoteExpired}),aid=f.projects[0].metadata.worldId,bid=f.projects[1].metadata.worldId;
 assert.equal(f.transport.worldId,aid);assert.equal((await f.transport.sendAcceptedState(crossingPose(f.projects[0],0))).authoredWorldId,aid);
 await assert.rejects(f.transport.subscribe(bid),/Expired|expired|rejected/);
 assert.equal(f.transport.ownerWorldOnline.get(bid),false);assert.equal(f.runtimes[0].authority.ledger.snapshot().members[f.playerId].status,'ACTIVE');
 await waitFor(()=>f.runtimes.every(r=>r.rpc.status().connected),'peer transport connected for inbound expiry check');
 const envelope=signObject({protocol:'elsemesh.owner-browser-request/1',requestId:crypto.randomUUID(),issuedAt:Date.now(),operation:'owner-challenge',payload:{worldId:aid,action:'VIEW',sessionId:'elsemesh-session:expired-inbound'}},f.player);
 await assert.rejects(f.runtimes[1].rpc.request(f.identities[0].nodeId,'owner-browser',envelope),/rejected/);
});


test('a remotely owned traveler remains frozen during relay outage without local membership bootstrap',{timeout:30000},async t=>{
 const f=await fixture(t),aid=f.projects[0].metadata.worldId,bid=f.projects[1].metadata.worldId;
 const committed=await travel(f,0,1,.1),session=f.transport.membership.sessionId,identity=f.transport.identity;
 await f.relay.close();
 await waitFor(()=>f.transport.frozen,'remote owner outage freezes browser controls');
 assert.equal(f.transport.worldId,bid);assert.equal(f.transport.generation,1);assert.equal(f.transport.membership.sessionId,session);
 assert.equal(f.runtimes[0].authority.ledger.snapshot().members[f.playerId],undefined);
 assert.equal(f.runtimes[1].authority.ledger.snapshot().members[f.playerId].status,'ACTIVE');
 await assert.rejects(f.transport.connect({identity}),/disconnected|rejected/);
 assert.equal(f.transport.frozen,true);assert.equal(f.runtimes[0].authority.ledger.snapshot().members[f.playerId],undefined);
 const relay=await createOwnerPeerRelay({port:f.relay.address.port});t.after(()=>relay.close());
 await waitFor(()=>f.runtimes.every(r=>r.rpc.status().connected),'remote owner route restored');
 assert.equal(f.transport.frozen,true,'Route restoration alone must not thaw traveler');
 const recovered=await f.transport.connect({identity});
 assert.equal(recovered.worldId,bid);assert.equal(recovered.sessionId,committed.destinationSessionId);assert.equal(recovered.generation,1);assert.equal(f.transport.frozen,false);
 assert.equal(f.runtimes[0].authority.ledger.snapshot().members[f.playerId],undefined);
});


test('a timed-out remote read lane can renew VIEW without same-world pending rejection',{timeout:15000},async t=>{
 const f=await fixture(t),bid=f.projects[1].metadata.worldId,aid=f.projects[0].metadata.worldId;
 await f.transport.subscribe(bid);clearInterval(f.transport.ownerPoll);f.transport.ownerRequestTimeoutMs=200;
 const original=f.runtimes[0].rpc.request;let held=false;
 f.runtimes[0].rpc.request=async(...args)=>{if(!held&&args[1]==='owner-browser'&&args[2]?.operation==='presence'){held=true;await new Promise(resolve=>setTimeout(resolve,300));}return original(...args);};
 await assert.rejects(f.transport.request('presence',{worldId:bid}),/timed out/);
 const renewed=f.transport.subscribe(bid).then(value=>({value}),error=>({error}));
 const before=performance.now(),local=await f.transport.sendAcceptedState(crossingPose(f.projects[0],.2));
 assert.equal(local.authoredWorldId,aid);assert.ok(performance.now()-before<200,'Remote renewal queue must not block local state');
 const outcome=await renewed;assert.ifError(outcome.error);assert.equal(outcome.value.worldId,bid);
 assert.equal((await f.transport.request('presence',{worldId:bid})).worldId,bid);
 f.runtimes[0].rpc.request=original;
});
