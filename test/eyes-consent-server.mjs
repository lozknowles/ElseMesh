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
 const dir=await mkdtemp(join(tmpdir(),'owner-browser-roundtrip-')),web=join(dir,'web'),player=newIdentity(),blocker=newIdentity(),excluded=newIdentity(),frames=[],runtimes=[],transports=[];
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
  configs.push(await finalizeOwnerSetup({stateDir,peerAcceptance:acceptances[1-i],enrollment:[{nodeId:player.nodeId,label:'WebCrypto traveler',view:true,enter:i===0||destinationEnter},{nodeId:blocker.nodeId,label:'Recipient',view:true,enter:true},{nodeId:excluded.nodeId,label:'Excluded',view:true,enter:true}],avatarAssetId:assetId(Buffer.from('repository-avatar/1')),inventoryHash:assetId(Buffer.from('empty'))}));
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
 return{dir,projects,player,blocker,excluded,transports,corrections,contacts,configs,identities,runtimes,relay,frames,transport,welcome,errors,memberships,worldStatuses,presences,playerId:'player:'+player.nodeId.split(':')[1]};
}


async function addClient(f,raw){const privateCryptoKey=await crypto.subtle.importKey('pkcs8',Buffer.from(raw.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),{name:'Ed25519'},false,['sign']),events=[],transport=new OwnerWorldTransport({config:f.runtimes[0].config,eyeConsent:e=>events.push(e)});f.transports.push(transport);await transport.connect({identity:{nodeId:raw.nodeId,publicKeyPEM:raw.publicKeyPem,privateCryptoKey}});clearInterval(transport.ownerPoll);return {transport,events};}
async function pose(tr,position,pitch=.4){return tr.sendAcceptedState({position,velocity:[0,0,0],yaw:0,pitch,appearance});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('three real authenticated clients: default deny, explicit recipient-only gaze, signed revoke, replay fences and ordinary avatars',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport,a=f.projects[0].metadata.worldId;clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const b=await addClient(f,f.blocker);await pose(b.transport,[4,20,.2]);const c=await addClient(f,f.excluded);await pose(c.transport,[0,20,.2]);
 assert.deepEqual(await b.transport.eyeRoster(a),[]);assert.deepEqual(await c.transport.eyeRoster(a),[]);
 let settings=await target.readEyeSharing();assert.equal(settings.shares.length,0);assert.equal(settings.recipients.length,2);await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});
 let rows=await b.transport.eyeRoster(a);assert.equal(rows.length,1);const granted=rows[0];assert.deepEqual(b.transport.currentEyeRoster(a),rows);const clone=b.transport.currentEyeRoster(a)[0];clone.pitch=-.99;assert.equal(b.transport.isEyeConsentValid(clone),false);assert.ok(b.transport.isEyeConsentValid(granted));let emptyAtRevoke=false;b.transport.subscribeEyeConsent(e=>{if(e.type==='eye-revoked')emptyAtRevoke=b.transport.currentEyeRoster(a).length===0;});assert.equal(granted.nodeId,f.player.nodeId);assert.equal(granted.pitch,.4);assert.ok(b.transport.isEyeConsentValid(granted));assert.deepEqual((await b.transport.eyeRoster(a))[0].eyesConsent,granted.eyesConsent,'Permission token remains stable across accepted-pose roster refresh');assert.equal(b.transport.isEyeConsentValid({...granted,pitch:-.4}),false);assert.deepEqual(await c.transport.eyeRoster(a),[]);
 const ordinary=(await c.transport.request('presence',{worldId:a})).players;assert.equal(ordinary.length,3);assert.ok(ordinary.every(p=>p.pitch===undefined&&p.eyeSession===undefined));
 settings=await target.readEyeSharing();await assert.rejects(c.transport.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision}),/revision|recipient/);
 const oldRoster=await b.transport.request('eyes-roster',{worldId:a});settings=await target.readEyeSharing();await target.setEyeSharing(null,false,{expectedRevision:settings.revision});for(let n=0;n<50&&!b.events.some(e=>e.type==='eye-revoked');n++)await delay(10);assert.ok(b.events.some(e=>e.type==='eye-revoked'));assert.equal(emptyAtRevoke,true);assert.equal(b.transport.isEyeConsentValid(granted),false);assert.deepEqual(await b.transport.eyeRoster(a),[]);
 const original=b.transport.request.bind(b.transport);b.transport.request=async()=>oldRoster;assert.deepEqual(await b.transport.eyeRoster(a),[]);b.transport.request=original;
 const event=b.events.find(e=>e.type==='eye-revoked');assert.equal(await b.transport.receiveEyeEvent(event),false);await assert.rejects(b.transport.receiveEyeEvent({...event,revision:event.revision+1}),/Invalid eye/);
 settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});assert.equal((await b.transport.eyeRoster(a)).length,1);
 target.disconnect();for(let n=0;n<50&&b.transport.eyeConsents.size;n++)await delay(10);assert.equal(b.transport.eyeConsents.size,0);assert.deepEqual(await b.transport.eyeRoster(a),[]);
});
test('cross-owner eyes require a fresh explicit share after arrival; source consent cannot follow, and VIEW remains necessary',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport,a=f.projects[0],dest=f.projects[1];clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const recipient=await addClient(f,f.blocker);await pose(recipient.transport,[4,20,.2]);const excluded=await addClient(f,f.excluded);await pose(excluded.transport,[-4,20,.2]);
 await recipient.transport.subscribe(dest.metadata.worldId);await excluded.transport.subscribe(dest.metadata.worldId);let settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});assert.equal((await recipient.transport.eyeRoster(a.metadata.worldId)).length,1);
 const angle=a.portals[0].yaw,descriptor=await target.subscribe(dest.metadata.worldId);await target.sendAcceptedState({position:[-.2*Math.sin(angle),20,-.2*Math.cos(angle)],velocity:[-Math.sin(angle),0,-Math.cos(angle)],yaw:0,pitch:-.48,appearance});const r=await target.prepare(a.portals[0].id);target.setRecoveryContext({reservation:r,descriptor});target.setFrozen(true);await target.ready(r.id,descriptor.contentDigest,descriptor.epoch);await target.handoff(r.id);const committed=await target.commit(r.id);target.setFrozen(false);
 assert.deepEqual(await recipient.transport.eyeRoster(a.metadata.worldId),[]);assert.deepEqual(await recipient.transport.eyeRoster(dest.metadata.worldId),[]);await pose(target,committed.position,-.48);assert.deepEqual(await recipient.transport.eyeRoster(dest.metadata.worldId),[]);
 settings=await target.readEyeSharing();assert.equal(settings.shares.length,0);await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});const rows=await recipient.transport.eyeRoster(dest.metadata.worldId);assert.equal(rows.length,1);assert.equal(rows[0].pitch,-.48);assert.equal(rows[0].generation,1);assert.ok(recipient.transport.isEyeConsentValid(rows[0]));assert.deepEqual(await excluded.transport.eyeRoster(dest.metadata.worldId),[]);
 settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,false,{expectedRevision:settings.revision});await assert.rejects(target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision}),/revision/);assert.equal(target.frozen,false,'Authenticated application denial must not freeze the remote physical membership');assert.notEqual(target.ownerWorldOnline.get(dest.metadata.worldId),false);const sequence=target.sequence;await pose(target,committed.position,-.48);assert.ok(target.sequence>sequence);assert.deepEqual(await recipient.transport.eyeRoster(dest.metadata.worldId),[]);
 const before=f.runtimes[1].authority.policy.viewPlayers;f.runtimes[1].authority.policy.viewPlayers=before.filter(p=>p!==f.blocker.nodeId.replace('elsemesh-node:','player:'));await assert.rejects(recipient.transport.eyeRoster(dest.metadata.worldId),/VIEW|grant|policy|Remote request rejected/i);assert.equal(recipient.transport.isEyeConsentValid(rows[0]),false);f.runtimes[1].authority.policy.viewPlayers=before;
});
test('finite consent lease and revoke in flight cannot resurrect a previously signed roster',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport,worldId=f.projects[0].metadata.worldId;clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const b=await addClient(f,f.blocker);let settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision,leaseMs:1000});const rows=await b.transport.eyeRoster(worldId);assert.equal(rows.length,1);await delay(1100);assert.equal(b.transport.isEyeConsentValid(rows[0]),false);assert.deepEqual(await b.transport.eyeRoster(worldId),[]);
 settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});const old=await b.transport.request('eyes-roster',{worldId});let finish;const original=b.transport.request.bind(b.transport);b.transport.request=()=>new Promise(r=>finish=r);const pending=b.transport.eyeRoster(worldId);settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,false,{expectedRevision:settings.revision});for(let n=0;n<50&&!b.events.some(e=>e.reason==='explicit-revoke');n++)await delay(10);finish(old);assert.deepEqual(await pending,[]);b.transport.request=original;
});
test('only the authenticated target may alter consent and mutations reject stale revision, replay, forged subject and invalid leases',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport,a=f.projects[0].metadata.worldId;clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const b=await addClient(f,f.blocker),settings=await target.readEyeSharing();
 for(const leaseMs of [0,60001,NaN])await assert.rejects(target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision,leaseMs}),/lease/);
 await assert.rejects(b.transport.request('eyes-sharing-update',{...target.ownEyeContext(),recipientNodeId:f.blocker.nodeId,allowed:true,expectedRevision:settings.revision,leaseMs:1000}),/Only the current target/);
 const envelope=await target.sign({protocol:'elsemesh.owner-browser-request/1',requestId:crypto.randomUUID(),issuedAt:Date.now(),operation:'eyes-sharing-update',payload:{...target.ownEyeContext(),recipientNodeId:f.blocker.nodeId,allowed:true,expectedRevision:settings.revision,leaseMs:60000}});await target.sendOwnerEnvelope(envelope,a);await assert.rejects(target.sendOwnerEnvelope(envelope,a),/replay/);await assert.rejects(target.setEyeSharing(f.blocker.nodeId,false,{expectedRevision:settings.revision}),/revision/);assert.equal((await b.transport.eyeRoster(a)).length,1);
});
test('owner restart clears persisted sharing before any renewed accepted gaze can resurrect it',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport,a=f.projects[0].metadata.worldId;clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const b=await addClient(f,f.blocker);const settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});assert.equal((await b.transport.eyeRoster(a)).length,1);target.disconnect();b.transport.disconnect();await f.runtimes[0].close();
 const restarted=await createOwnerWorldRuntime({root:join(f.dir,'web'),config:f.configs[0],identity:f.identities[0],relayUrl:'ws://127.0.0.1:'+f.relay.address.port,port:0});f.runtimes[0]=restarted;const origin='http://127.0.0.1:'+restarted.address.port;globalThis.location=new URL(origin);globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin});}};target.ownerConfig=restarted.config;b.transport.ownerConfig=restarted.config;await target.connect({identity:target.identity});clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);await b.transport.connect({identity:b.transport.identity});clearInterval(b.transport.ownerPoll);assert.deepEqual(await b.transport.eyeRoster(a),[]);assert.equal((await target.readEyeSharing()).shares.length,0);
});

test('Stop sharing on an empty record fences a delayed grant from a second authenticated connection',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport;clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const other=await addClient(f,f.player),settings=await target.readEyeSharing();assert.equal(settings.shares.length,0);
 const original=target.sendOwnerEnvelope.bind(target);let release,held;target.sendOwnerEnvelope=(envelope,lane)=>{if(envelope.operation==='eyes-sharing-update'&&envelope.payload.allowed===true){held=envelope;return new Promise((resolve,reject)=>{release=()=>original(envelope,lane).then(resolve,reject);});}return original(envelope,lane);};
 const pending=target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});const rejected=assert.rejects(pending,/revision/);for(let n=0;n<50&&!held;n++)await delay(2);assert.ok(held,'Grant is signed but held before owner delivery');const stopped=await other.transport.setEyeSharing(null,false,{expectedRevision:settings.revision});assert.ok(stopped.revision>settings.revision);release();await rejected;target.sendOwnerEnvelope=original;assert.equal((await target.readEyeSharing()).shares.length,0);
});
test('verified VIEW renewal fences a roster that was already in flight',{timeout:30000},async t=>{
 const f=await fixture(t),target=f.transport,worldId=f.projects[0].metadata.worldId;clearInterval(target.ownerPoll);await pose(target,[2,20,.2]);const b=await addClient(f,f.blocker),settings=await target.readEyeSharing();await target.setEyeSharing(f.blocker.nodeId,true,{expectedRevision:settings.revision});const old=await b.transport.request('eyes-roster',{worldId}),before=b.transport.ownerViewSessions.get(worldId);let release;const original=b.transport.request.bind(b.transport);b.transport.request=(operation,payload,...rest)=>operation==='eyes-roster'?new Promise(r=>release=()=>r(old)):original(operation,payload,...rest);const pending=b.transport.eyeRoster(worldId),rejected=assert.rejects(pending,/Stale eye roster/);await b.transport.subscribe(worldId);assert.notEqual(b.transport.ownerViewSessions.get(worldId),before);release();await rejected;b.transport.request=original;assert.equal((await b.transport.eyeRoster(worldId)).length,1);
});
