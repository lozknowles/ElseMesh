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
import {createWorld,packWorldRepository} from '../src/world-runtime/vendor/world-engine-contract.js';


// Two actual owner facades + encrypted RPC + browser WebCrypto transport; no renderer or device claim.
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const appearance={style:'female',shirt:'#33785b',trousers:'#27313d',skin:'#805136',hair:'#171512'};
// Existing federation/2 mapping deterministically rounds vector components to six decimals.
const closeTo=(actual,expected,label)=>{assert.equal(actual.length,expected.length,label);for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<=0.00000051,label+' axis '+i+': '+actual[i]+' versus '+expected[i]);};
async function fixture(t,{destinationEnter=true,relayAbsent=false,remoteExpired=null}={}){
 const dir=await mkdtemp(join(tmpdir(),'owner-browser-roundtrip-')),web=join(dir,'web'),player=newIdentity(),blocker=newIdentity(),frames=[],runtimes=[],transports=[];
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
  configs.push(await finalizeOwnerSetup({stateDir,peerAcceptance:acceptances[1-i],enrollment:[{nodeId:player.nodeId,label:'WebCrypto traveler',view:true,enter:i===0||destinationEnter},{nodeId:blocker.nodeId,label:'Stationary other player',view:true,enter:true}],avatarAssetId:assetId(Buffer.from('repository-avatar/1')),inventoryHash:assetId(Buffer.from('empty'))}));
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
 const identity={nodeId:player.nodeId,publicKeyPEM:player.publicKeyPem,privateCryptoKey},errors=[],memberships=[],worldStatuses=[],presences=[],corrections=[];
 const transport=new OwnerWorldTransport({config:runtimes[0].config,error:e=>errors.push(e),membership:m=>memberships.push(m),worldStatus:s=>worldStatuses.push(s),presence:p=>presences.push(p),stateCorrection:p=>corrections.push(p)});
 transports.push(transport);
 const welcome=await transport.connect({identity});
 return{dir,projects,player,blocker,transports,corrections,contacts,configs,identities,runtimes,relay,frames,transport,welcome,errors,memberships,worldStatuses,presences,playerId:'player:'+player.nodeId.split(':')[1]};
}


test('signed own accepted gaze stays private from ordinary presence; correction retains confirmed pitch', {timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,worldId=f.projects[0].metadata.worldId,presence=async()=>(await tr.request('presence',{worldId})).players.find(p=>p.nodeId===f.player.nodeId);
 clearInterval(tr.ownerPoll);const pose={position:f.welcome.position,velocity:[0,0,0],yaw:0,appearance};assert.equal('pitch' in f.welcome,false);let receipt=await tr.sendAcceptedState(pose);assert.equal('pitch' in receipt,false);assert.equal('pitch' in await presence(),false);
 receipt=await tr.sendAcceptedState({...pose,pitch:0});assert.equal(receipt.pitch,0);let p=await presence();assert.equal('pitch' in p,false);assert.equal('eyeSession' in p,false);assert.equal(JSON.stringify(p).includes(tr.membership.sessionId),false);assert.equal(tr.getConfirmedPose().pitch,0);
 await tr.sendAcceptedState({...pose,pitch:.61});
 const reconnect=await tr.connect({identity:tr.identity});clearInterval(tr.ownerPoll);assert.equal(reconnect.pitch,.61);assert.equal(tr.getConfirmedPose().pitch,.61);
 const before=f.runtimes[0].authority.ledger.snapshot().members[f.playerId];
 for(const pitch of [null,1.50001,-1.50001]){const state={...pose,pitch,worldId,generation:tr.generation,sequence:tr.sequence};await assert.rejects(tr.sendOwnerEnvelope(await tr.sign({protocol:'elsemesh.owner-browser-request/1',requestId:crypto.randomUUID(),issuedAt:Date.now(),operation:'accepted-state',payload:state}),worldId),/pitch/);assert.deepEqual(f.runtimes[0].authority.ledger.snapshot().members[f.playerId],before);}
 const clear=f.runtimes[0].authority.clearance;f.runtimes[0].authority.clearance=async()=>false;const corrected=await tr.request('state',{...pose,position:[.1,20,.2],pitch:-.7,worldId,generation:tr.generation,sequence:tr.sequence++});f.runtimes[0].authority.clearance=clear;assert.equal(corrected.pitch,.61);assert.equal(tr.getConfirmedPose().pitch,.61);assert.equal('pitch' in await presence(),false);
 await tr.sendAcceptedState(pose);assert.equal('pitch' in await presence(),false);assert.equal('pitch' in tr.getConfirmedPose(),false);
});
test('owner crossing preserves own pitch through one conversion without ordinary gaze disclosure',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,a=f.projects[0],b=f.projects[1],descriptor=await tr.subscribe(b.metadata.worldId),angle=a.portals[0].yaw,pitch=-.48;
 await tr.sendAcceptedState({position:[-.2*Math.sin(angle),20,-.2*Math.cos(angle)],velocity:[-Math.sin(angle),0,-Math.cos(angle)],yaw:0,pitch,appearance});const tag=assetId(Buffer.from(tr.membership.sessionId));assert.equal('pitch' in (await tr.request('presence',{worldId:a.metadata.worldId})).players[0],false);
 const r=await tr.prepare(a.portals[0].id);assert.ok(Math.abs(r.pitch-pitch)<1e-6);tr.setRecoveryContext({reservation:r,descriptor});tr.setFrozen(true);await tr.ready(r.id,descriptor.contentDigest,descriptor.epoch);await tr.handoff(r.id);const committed=await tr.commit(r.id);tr.setFrozen(false);assert.ok(Math.abs(committed.pitch-pitch)<1e-6);assert.ok(Math.abs(tr.getConfirmedPose().pitch-pitch)<1e-6);assert.equal('pitch' in (await tr.request('presence',{worldId:b.metadata.worldId})).players[0],false);
 await tr.sendAcceptedState({position:committed.position,velocity:[0,0,0],yaw:committed.yaw,pitch,appearance});const p=(await tr.request('presence',{worldId:b.metadata.worldId})).players[0];assert.equal('pitch' in p,false);assert.equal('eyeSession' in p,false);assert.equal(tr.getConfirmedPose().pitch,pitch);assert.notEqual(assetId(Buffer.from(tr.membership.sessionId)),tag);
});

test('owner process restart never infers available gaze from a persisted legacy-compatible pitch',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,worldId=f.projects[0].metadata.worldId,identity=tr.identity;
 await tr.sendAcceptedState({position:f.welcome.position,velocity:[0,0,0],yaw:0,pitch:0,appearance});tr.disconnect();await f.runtimes[0].close();
 const restarted=await createOwnerWorldRuntime({root:join(f.dir,'web'),config:f.configs[0],identity:f.identities[0],relayUrl:'ws://127.0.0.1:'+f.relay.address.port,port:0});f.runtimes[0]=restarted;tr.ownerConfig=restarted.config;
 const origin='http://127.0.0.1:'+restarted.address.port;globalThis.location=new URL(origin);globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin});}};
 const welcome=await tr.connect({identity});clearInterval(tr.ownerPoll);assert.equal('pitch' in welcome,false);assert.equal('pitch' in tr.getConfirmedPose(),false);assert.equal('pitch' in (await tr.request('presence',{worldId})).players[0],false);
 await tr.sendAcceptedState({position:welcome.position,velocity:[0,0,0],yaw:0,pitch:0,appearance});assert.equal('pitch' in (await tr.request('presence',{worldId})).players[0],false);assert.equal(tr.getConfirmedPose().pitch,0);
});

test('cached runtime gaze cannot bless another accepted ledger sequence or a changed session/generation',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,worldId=f.projects[0].metadata.worldId;clearInterval(tr.ownerPoll);await tr.sendAcceptedState({position:[2,20,.2],velocity:[0,0,0],yaw:0,pitch:.3,appearance});
 const privateCryptoKey=await crypto.subtle.importKey('pkcs8',Buffer.from(f.blocker.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),{name:'Ed25519'},false,['sign']),recipient=new OwnerWorldTransport({config:f.runtimes[0].config});f.transports.push(recipient);await recipient.connect({identity:{nodeId:f.blocker.nodeId,publicKeyPEM:f.blocker.publicKeyPem,privateCryptoKey}});clearInterval(recipient.ownerPoll);const sharing=await tr.readEyeSharing();await tr.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:sharing.revision});assert.equal((await recipient.eyeRoster(worldId)).length,1);
 const authority=f.runtimes[0].authority,snapshot=authority.ledger.snapshot(),member=snapshot.members[f.playerId],grant=Object.values(snapshot.grants).find(g=>g.playerId===f.playerId&&g.sessionId===member.sessionId);
 await authority.acceptedState({grantId:grant.grantId,playerId:f.playerId,sessionId:member.sessionId,motion:{position:member.motion.position,velocity:[0,0,0],yaw:0},sequence:member.sequence+1,generation:member.generation});
 assert.deepEqual(await recipient.eyeRoster(worldId),[]);const p=(await tr.request('presence',{worldId})).players[0];assert.equal('pitch' in p,false);assert.equal('eyeSession' in p,false);
});
