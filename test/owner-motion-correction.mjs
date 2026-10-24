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
 for(const p of projects)p.spawn.position=[0,20,.2];
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
 return{dir,projects,player,blocker,corrections,contacts,configs,identities,runtimes,relay,frames,transport,welcome,errors,memberships,worldStatuses,presences,playerId:'player:'+player.nodeId.split(':')[1]};
}

const waitFor=async(predicate)=>{const until=Date.now()+2000;while(!predicate()){if(Date.now()>until)throw Error('Motion response did not settle');await new Promise(r=>setTimeout(r,10));}};
async function arrivedFixture(t){
 const f=await fixture(t),transport=f.transport,a=f.projects[0],b=f.projects[1],descriptor=await transport.subscribe(b.metadata.worldId);
 const angle=a.portals[0].yaw;
 await transport.sendAcceptedState({position:[-.2*Math.sin(angle),20,-.2*Math.cos(angle)],velocity:[-Math.sin(angle),0,-Math.cos(angle)],yaw:0,appearance});
 const reservation=await transport.prepare(a.portals[0].id);transport.setRecoveryContext({reservation,descriptor});transport.setFrozen(true);
 await transport.ready(reservation.id,descriptor.contentDigest,descriptor.epoch);await transport.handoff(reservation.id);await transport.commit(reservation.id);transport.setFrozen(false);
 const playerId='player:'+f.blocker.nodeId.split(':')[1],sessionId='elsemesh-session:stationary-other-player';
 const challenge=await f.runtimes[1].authority.challenge({playerId,playerNodeId:f.blocker.nodeId,action:'ENTER',sessionId});
 await f.runtimes[1].authority.enterLocal({proof:signObject({protocol:'elsemesh.owner-player-proof/1',challenge},f.blocker),motion:{position:[2,20,1],velocity:[0,0,0],yaw:0,pitch:0}});
 await transport.sendAcceptedState({position:[0,20,1],velocity:[0,0,0],yaw:.2,appearance});
 clearInterval(transport.ownerPoll);return f;
}
test('ordinary remote movement into another player corrects pose without freezing a reachable owner',{timeout:30000},async t=>{
 const f=await arrivedFixture(t),transport=f.transport,worldId=f.projects[1].metadata.worldId;
 const before=f.runtimes[1].authority.ledger.snapshot().members[f.playerId],rejectedSequence=transport.sequence;
 assert.equal(transport.sendState({position:[1.8,20,1],velocity:[3,0,0],yaw:.2,appearance}),true);
 await waitFor(()=>!transport.ownerPosePending);
 const after=f.runtimes[1].authority.ledger.snapshot().members[f.playerId];
 assert.deepEqual(after,before,'Blocked movement must not advance authoritative membership');
 assert.equal(transport.frozen,false,'A legitimate collision must not be classified as remote owner outage');
 assert.equal(f.corrections.length,1);
 const correction=f.corrections[0];assert.equal(correction.type,'pose-corrected');assert.equal(correction.reason,'movement-clearance');
 assert.equal(correction.authoredWorldId,worldId);assert.equal(correction.sessionId,before.sessionId);assert.equal(correction.generation,before.generation);
 assert.equal(correction.rejectedSequence,rejectedSequence);assert.equal(correction.acceptedSequence,before.sequence);assert.deepEqual(correction.position,before.motion.position);assert.deepEqual(correction.velocity,[0,0,0]);
 assert.equal(verifyObject(correction,new Set([f.identities[1].nodeId])),true);
 assert.equal(transport.sequence,rejectedSequence+1,'Correction must not roll sequence backward');
 assert.ok(!f.worldStatuses.some(s=>s.worldId===worldId&&s.status==='offline'));
 const next=await transport.sendAcceptedState({position:[-.2,20,1],velocity:[-1,0,0],yaw:.2,appearance});assert.equal(next.sequence,rejectedSequence+1);
});


function correctionUnit(){
 const authority=newIdentity(),attacker=newIdentity(),player=newIdentity(),worldId='elsemesh.world:motion-current',sessionId='elsemesh-session:motion-current',corrections=[];
 const transport=new OwnerWorldTransport({config:{defaultWorldId:'elsemesh.world:motion-local',contacts:[{worldId,authorityNodeId:authority.nodeId}]},stateCorrection:r=>corrections.push(r)});
 transport.identity={nodeId:player.nodeId};transport.worldId=worldId;transport.generation=3;transport.membership={sessionId,world:{epoch:7}};
 transport.ownerGrantExpiry.set(worldId,Date.now()+600000);transport.sign=async value=>value;
 const state={worldId,generation:3,sequence:9,position:[2,20,1],velocity:[3,0,0],yaw:.2,appearance};
 const receipt=(requestId,patch={},signer=authority)=>{const issuedAt=Date.now();return signObject({protocol:'elsemesh.world-wss/2',type:'pose-corrected',reason:'movement-clearance',requestId,authorityEpoch:7,playerNodeId:player.nodeId,authoredWorldId:worldId,sessionId,generation:3,rejectedSequence:9,acceptedSequence:8,position:[0,20,1],velocity:[0,0,0],yaw:.2,issuedAt,expiresAt:issuedAt+5000,...patch},signer);};
 const context={worldId,generation:3,sessionId,authorityEpoch:7};
 return{transport,authority,attacker,player,worldId,sessionId,state,receipt,context,corrections};
}
test('current correction validates signed request, context, freshness and consumes exactly once',async()=>{
 const f=correctionUnit(),requestId='unit-original-request',result=f.receipt(requestId),args={type:'state',requestId,state:f.state,connection:f.transport.connectionEpoch,context:f.context};
 assert.equal(await f.transport.verifyStateCorrection(result,args),true);assert.equal(f.corrections.length,1);
 await assert.rejects(f.transport.verifyStateCorrection(result,args),/movement correction/);assert.equal(f.corrections.length,1);
});
test('wrong signed correction type, signer, request, player, world, session, generation, epoch, expiry or motion fails closed',async()=>{
 const cases=[{type:'pose-accepted'},{signer:'attacker'},{requestId:'another-request'},{playerNodeId:newIdentity().nodeId},{authoredWorldId:'elsemesh.world:other'},{sessionId:'elsemesh-session:other'},{generation:4},{authorityEpoch:8},{expiresAt:Date.now()-1},{issuedAt:Date.now()+2000,expiresAt:Date.now()+5000},{expiresAt:Date.now()+60000},{position:[null,20,1]},{velocity:[1,0,0]},{acceptedSequence:9}];
 for(const patch of cases){
  const f=correctionUnit(),signer=patch.signer==='attacker'?f.attacker:f.authority,{signer:unused,...fields}=patch;
  f.transport.sendOwnerEnvelope=async envelope=>f.receipt(envelope.requestId,fields,signer);
  await assert.rejects(f.transport.request('state',f.state),/movement correction/);
  assert.equal(f.corrections.length,0);assert.equal(f.transport.frozen,true);assert.equal(f.transport.ownerWorldOnline.get(f.worldId),false);
 }
});
test('late correction after session or connection change cannot move the new context',async()=>{
 for(const change of ['session','connection','world']){
  const f=correctionUnit(),requestId='late-'+change,result=f.receipt(requestId),args={type:'state',requestId,state:f.state,connection:f.transport.connectionEpoch,context:f.context};
  const validating=f.transport.verifyStateCorrection(result,args);
  if(change==='session')f.transport.membership={...f.transport.membership,sessionId:'elsemesh-session:new'};
  if(change==='connection')f.transport.connectionEpoch++;
  if(change==='world'){f.transport.worldId='elsemesh.world:new';f.transport.generation=4;}
  assert.equal(await validating,false);assert.equal(f.corrections.length,0);assert.equal(f.transport.frozen,false);
 }
});
test('relay failure retains fail-closed freezing and never masquerades as collision correction',async()=>{
 const f=correctionUnit();f.transport.sendOwnerEnvelope=async()=>{throw Error('Relay disconnected');};
 await assert.rejects(f.transport.request('state',f.state),/Relay disconnected/);
 assert.equal(f.transport.frozen,true);assert.equal(f.corrections.length,0);assert.equal(f.transport.ownerWorldOnline.get(f.worldId),false);
});
test('strict crossing clearance denial still throws before prepare or commit and leaves membership unchanged',{timeout:30000},async t=>{
 const f=await arrivedFixture(t),transport=f.transport,before=f.runtimes[1].authority.ledger.snapshot().members[f.playerId];let prepared=false,committed=false;
 await assert.rejects((async()=>{await transport.sendAcceptedState({position:[1.8,20,1],velocity:[3,0,0],yaw:.2,appearance});prepared=true;const r=await transport.prepare(f.projects[1].portals[0].id);committed=true;return transport.commit(r.id);})(),/Remote request rejected/);
 assert.equal(prepared,false);assert.equal(committed,false);assert.deepEqual(f.runtimes[1].authority.ledger.snapshot().members[f.playerId],before);assert.equal(f.corrections.length,0);
});
test('clearance correction is unavailable before authentication/context checks or for unexpected results',{timeout:30000},async t=>{
 const f=await arrivedFixture(t),authority=f.runtimes[1].authority,member=authority.ledger.snapshot().members[f.playerId],grant=Object.values(authority.ledger.snapshot().grants).find(g=>g.playerId===f.playerId&&g.sessionId===member.sessionId);
 const payload={grantId:grant.grantId,playerId:f.playerId,sessionId:member.sessionId,motion:{position:[1.8,20,1],velocity:[3,0,0],yaw:.2,pitch:0},sequence:member.sequence+1,generation:member.generation};
 for(const patch of [{grantId:'missing'},{playerId:'player:wrong'},{sessionId:'elsemesh-session:wrong'},{sequence:member.sequence},{generation:member.generation+1},{motion:{...payload.motion,position:[NaN,20,1]}}])await assert.rejects(authority.acceptedState({...payload,...patch},{allowCollisionCorrection:true}));
 const original=authority.clearance;authority.clearance=async()=>undefined;
 await assert.rejects(authority.acceptedState(payload,{allowCollisionCorrection:true}),/Movement clearance denied/);
 authority.clearance=async()=>{throw Error('Unexpected clearance failure');};
 await assert.rejects(authority.acceptedState(payload,{allowCollisionCorrection:true}),/Unexpected clearance failure/);
 authority.clearance=original;
 assert.deepEqual(authority.ledger.snapshot().members[f.playerId],member);
});
