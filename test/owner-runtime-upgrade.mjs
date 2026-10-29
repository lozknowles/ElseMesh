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
import {createRepositoryPortalTransition} from '../src/world-runtime/RepositoryPortalTransition.js';
import {Input} from '../src/core/Input.js';
import {Vector3} from '../src/engine/index.js';
import {createOwnerPeerRpc} from '../network/owner-peer-rpc.mjs';
import {OwnerWorldTransport} from '../src/world-runtime/OwnerWorldTransport.js';
import {createWorld,packWorldRepository} from '../src/world-runtime/vendor/world-engine-contract.js';


// Two actual owner facades + encrypted RPC + browser WebCrypto transport; no renderer or device claim.
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const appearance={style:'female',shirt:'#33785b',trousers:'#27313d',skin:'#805136',hair:'#171512'};
// Existing federation/2 mapping deterministically rounds vector components to six decimals.
const closeTo=(actual,expected,label)=>{assert.equal(actual.length,expected.length,label);for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<=0.00000051,label+' axis '+i+': '+actual[i]+' versus '+expected[i]);};
async function fixture(t,{destinationEnter=true,relayAbsent=false,remoteExpired=null,legacyMode='legacy'}={}){
 const dir=await mkdtemp(join(tmpdir(),'owner-browser-roundtrip-')),web=join(dir,'web'),player=newIdentity(),blocker=newIdentity(),excluded=newIdentity(),frames=[],runtimes=[],transports=[];
 const projected=[];let relay;const oldLocation=globalThis.location,oldSocket=globalThis.WebSocket;
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
 for(let i=0;i<2;i++)runtimes.push(await createOwnerWorldRuntime({root:web,config:configs[i],identity:identities[i],relayUrl,port:0,rpcFactory:options=>createOwnerPeerRpc({...options,handler:async message=>{const result=await options.handler(message);if(i===1&&legacyMode!=='modern'&&message.operation==='owner-browser'&&message.payload.operation==='subscribe'){
 // Exact published 2f3b90 subscribe response: {...localDescriptor,viewExpiresAt:grant.expiresAt}.
 const {viewReceipt,...legacy}=result;projected.push(legacy);if(legacyMode==='legacy')return legacy;return {...result,viewReceipt:{...viewReceipt,viewSession:'sha256:'+'f'.repeat(64)}};
 }return result;}})}));
 const origin='http://127.0.0.1:'+runtimes[0].address.port;
 globalThis.location=new URL(origin);
 globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin});}};
 const privateCryptoKey=await crypto.subtle.importKey('pkcs8',Buffer.from(player.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),{name:'Ed25519'},false,['sign']);
 const identity={nodeId:player.nodeId,publicKeyPEM:player.publicKeyPem,privateCryptoKey},errors=[],memberships=[],worldStatuses=[],presences=[],corrections=[];
 const transport=new OwnerWorldTransport({config:runtimes[0].config,error:e=>errors.push(e),membership:m=>memberships.push(m),worldStatus:s=>worldStatuses.push(s),presence:p=>presences.push(p),stateCorrection:p=>corrections.push(p)});
 transports.push(transport);
 const welcome=await transport.connect({identity});
 return{dir,projects,player,blocker,excluded,transports,projected,corrections,contacts,configs,identities,runtimes,relay,frames,transport,welcome,errors,memberships,worldStatuses,presences,playerId:'player:'+player.nodeId.split(':')[1]};
}


async function addClient(f,raw){const privateCryptoKey=await crypto.subtle.importKey('pkcs8',Buffer.from(raw.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),{name:'Ed25519'},false,['sign']),events=[],transport=new OwnerWorldTransport({config:f.runtimes[0].config,eyeConsent:e=>events.push(e)});f.transports.push(transport);await transport.connect({identity:{nodeId:raw.nodeId,publicKeyPEM:raw.publicKeyPem,privateCryptoKey}});clearInterval(transport.ownerPoll);return {transport,events};}
async function pose(tr,position,pitch=.4){return tr.sendAcceptedState({position,velocity:[0,0,0],yaw:0,pitch,appearance});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
// This is an actual authenticated browser + modern source owner + encrypted
// owner RPC destination response projection, not a synthetic empty response.
test('published 2f3b90 destination reports upgrade required without admitting VIEW, membership or pending travel; modern source continues',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,source=f.projects[0].metadata.worldId,destination=f.projects[1].metadata.worldId;clearInterval(tr.ownerPoll);const sourceMember=structuredClone(tr.membership);await pose(tr,f.welcome.position);
 await assert.rejects(tr.subscribe(destination),e=>e.message==='Owner runtime upgrade required'&&e.code==='OWNER_RUNTIME_UPGRADE_REQUIRED');assert.ok(f.projected.length);const actual=f.projected[0];assert.equal(actual.worldId,destination);assert.ok(actual.binding.signature&&actual.published.signature&&actual.viewExpiresAt>Date.now());assert.equal(Object.hasOwn(actual,'viewReceipt'),false);assert.deepEqual(Object.keys(actual).sort(),[...Object.keys(f.configs[1].contacts.find(c=>c.worldId===destination).descriptor),'viewExpiresAt'].sort());
 assert.equal(tr.ownerWorldOnline.get(destination),false);assert.equal(tr.ownerGrantExpiry.has(destination),false);assert.equal(tr.ownerViewFresh.has(destination),false);assert.equal(tr.ownerViewSessions.has(destination),false);assert.deepEqual(tr.currentEyeRoster(destination),[]);assert.equal(tr.worldId,source);assert.equal(tr.membership.sessionId,sourceMember.sessionId);assert.equal(tr.frozen,false);assert.equal(tr.pendingReservation??null,null);
 await assert.rejects(tr.prepare(f.projects[0].portals[0].id),/Owner runtime upgrade required/);assert.equal(tr.pendingReservation??null,null);assert.equal(tr.recoveryContext??null,null);for(const runtime of f.runtimes)assert.equal(Object.keys(runtime.authority.ledger.snapshot().transfers).length,0,'Legacy destination never starts an owner reservation');assert.equal(Object.keys(f.runtimes[1].authority.ledger.snapshot().members).length,0);
 const sequence=tr.sequence,receipt=await pose(tr,f.welcome.position,.2);assert.equal(receipt.type,'pose-accepted');assert.equal(tr.getConfirmedPose().sequence,sequence);assert.equal(tr.frozen,false);assert.equal(tr.worldId,source);assert.notEqual(tr.ownerWorldOnline.get(source),false);
});
test('present tampered destination VIEW receipt remains an authentication failure, never a legacy upgrade downgrade',{timeout:30000},async t=>{
 const f=await fixture(t,{legacyMode:'tampered'}),tr=f.transport,destination=f.projects[1].metadata.worldId;clearInterval(tr.ownerPoll);await assert.rejects(tr.subscribe(destination),e=>/Invalid authoritative VIEW session receipt/.test(e.message)&&e.message!=='Owner runtime upgrade required');assert.equal(tr.ownerViewSessions.has(destination),false);assert.equal(tr.ownerViewFresh.has(destination),false);assert.equal(tr.frozen,false);await pose(tr,f.welcome.position);
});
test('actual published legacy signed motion shape is rejected with upgrade message; present bad modern fields or signatures stay authentication failures',async()=>{
 const owner=newIdentity(),player=newIdentity(),worldId='elsemesh.world:upgrade',tr=new OwnerWorldTransport({config:{contacts:[{worldId,authorityNodeId:owner.nodeId}]}}),sessionId='elsemesh-session:upgrade';Object.assign(tr,{identity:{nodeId:player.nodeId},worldId,generation:0,membership:{worldId,sessionId,world:{epoch:1,contentDigest:'a'.repeat(64),published:{descriptor:{worldId:'elsemesh-world:upgrade',regionId:'elsemesh-region:upgrade',authority:{nodeId:owner.nodeId}}}}}});const state={worldId,generation:0,sequence:1,position:[0,0,0],velocity:[0,0,0],yaw:0,appearance};
 // Exact signed legacy fields from 2f3b90 owner-world-runtime pose-accepted.
 const body={protocol:'elsemesh.world-wss/2',type:'pose-accepted',playerNodeId:player.nodeId,authoredWorldId:worldId,sessionId,generation:0,sequence:1,position:state.position,velocity:state.velocity,yaw:0,appearance,portalCrossings:[]},args={state,context:tr.motionContext(),connection:tr.connectionEpoch};await assert.rejects(tr.verifyAcceptedPose(signObject(body,owner),args),e=>e.message==='Owner runtime upgrade required');assert.equal(tr.ownerConfirmedMotion??null,null);
 for(const receipt of [signObject({...body,authorityEpoch:2},owner),{...signObject(body,owner),signature:'bad'},signObject({...body,worldId:'elsemesh-world:upgrade',regionId:'elsemesh-region:upgrade',authorityEpoch:1,position:[1,0,0]},owner)])await assert.rejects(tr.verifyAcceptedPose(receipt,args),e=>/Invalid authoritative accepted motion receipt/.test(e.message)&&e.message!=='Owner runtime upgrade required');assert.equal(tr.ownerConfirmedMotion??null,null);
});


test('modern ordinary ENTER remains independent of destination VIEW when no legacy owner was observed',{timeout:30000},async t=>{
 const f=await fixture(t,{legacyMode:'modern'}),tr=f.transport,destination=f.projects[1].metadata.worldId;clearInterval(tr.ownerPoll);await pose(tr,f.welcome.position);assert.equal(tr.ownerViewSessions.has(destination),false);assert.equal(tr.ownerGrantExpiry.has(destination),false);assert.equal(tr.ownerUpgradeWorlds.has(destination),false);const reservation=await tr.prepare(f.projects[0].portals[0].id);assert.ok(reservation.ownerReservation);assert.equal(tr.ownerViewSessions.has(destination),false,'ordinary ENTER does not create or require VIEW');assert.equal(tr.ownerGrantExpiry.has(destination),false);await tr.cancel(reservation.id);assert.equal(tr.worldId,f.projects[0].metadata.worldId);assert.equal(tr.frozen,false);
});


test('learned upgrade markers are scoped to connection and pinned authority/content context, never an admission',()=>{
 const owner=newIdentity(),worldId='elsemesh.world:legacy-marker',tr=new OwnerWorldTransport({config:{contacts:[{worldId,authorityNodeId:owner.nodeId}]}}),descriptor={epoch:1,contentDigest:'a'.repeat(64)};tr.rememberOwnerUpgrade(worldId,descriptor);assert.equal(tr.ownerUpgradeKnown(worldId),true);tr.connectionEpoch++;assert.equal(tr.ownerUpgradeKnown(worldId),false);tr.rememberOwnerUpgrade(worldId,descriptor);tr.eyeDescriptors.set(worldId,{epoch:2,contentDigest:'b'.repeat(64)});assert.equal(tr.ownerUpgradeKnown(worldId),false);assert.equal(tr.ownerViewSessions.has(worldId),false);tr.rememberOwnerUpgrade(worldId,descriptor);tr.disconnect();assert.equal(tr.ownerUpgradeWorlds.size,0);
});


function realTransition(f){const tr=f.transport,input=Object.assign(Object.create(Input.prototype),{enabled:true,keys:new Set(['KeyW']),pressed:new Set(['Space']),look:{x:3,y:2},moveStick:{x:0,y:1},lookStick:{x:0,y:0},_touchStickResetters:[],_touchFlightResetters:[],_touchActionResetters:[]}),source={identity:{worldId:tr.worldId,contentDigest:tr.membership.world.contentDigest},player:{position:new Vector3(...f.welcome.position),velocity:new Vector3(),yaw:f.welcome.yaw??0}},host={active:source,prepare:async()=>{throw Error('Legacy graphics must never prepare');},discardPrepared(){},activatePrepared:async()=>{throw Error('Legacy destination must never activate');}},api=createRepositoryPortalTransition({transport:tr,host,portal:f.projects[0].portals[0],sourceActive:source,load:async()=>{throw Error('Legacy world load must never begin');},getAppearance:()=>appearance,onFrozen:value=>value?input.suspend():input.resume()});return {api,host,source,input};}
test('REAL transition known legacy rejection precedes uncertainty: restores actual Input and source session without reservation',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,destination=f.projects[1].metadata.worldId;clearInterval(tr.ownerPoll);await assert.rejects(tr.subscribe(destination),/Owner runtime upgrade required/);const {api,host,source,input}=realTransition(f),position=source.player.position.toArray(),session=tr.membership.sessionId,generation=tr.generation;let prepares=0,cancels=0;const original=tr.prepare.bind(tr);tr.prepare=(...args)=>{prepares++;return original(...args);};const originalCancel=tr.cancel.bind(tr);tr.cancel=(...args)=>{cancels++;return originalCancel(...args);};
 await assert.rejects(api.travel(),/Owner runtime upgrade required/);assert.equal(api.transition.state,'idle');assert.equal(api.frozen,false);assert.equal(tr.frozen,false);assert.equal(input.enabled,true);assert.equal(input.keys.size,0);assert.deepEqual(input.look,{x:0,y:0});assert.equal(host.active,source);assert.deepEqual(source.player.position.toArray(),position);assert.equal(tr.membership.sessionId,session);assert.equal(tr.generation,generation);assert.equal(prepares,0);assert.equal(cancels,0);assert.equal(tr.pendingReservation??null,null);for(const runtime of f.runtimes)assert.equal(Object.keys(runtime.authority.ledger.snapshot().transfers).length,0);await pose(tr,position);
});
test('REAL transition uncached legacy discovery after reservation waits for definitive signed cancellation before resuming Input',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport,destination=f.projects[1].metadata.worldId;clearInterval(tr.ownerPoll);assert.equal(tr.ownerUpgradeKnown(destination),false);const {api,source,input}=realTransition(f),session=tr.membership.sessionId,generation=tr.generation,position=source.player.position.toArray();let release,cancelId;const originalCancel=tr.cancel.bind(tr);tr.cancel=id=>{cancelId=id;return new Promise((resolve,reject)=>{release=()=>originalCancel(id).then(resolve,reject);});};const pending=api.travel(),rejected=assert.rejects(pending,/Owner runtime upgrade required/);for(let i=0;i<200&&!release;i++)await delay(5);assert.ok(release,'Cancellation is requested only after actual owner reservation');assert.ok(api.reservation.id);assert.equal(cancelId,api.reservation.id);assert.equal(api.frozen,true);assert.equal(tr.frozen,true);assert.equal(input.enabled,false,'No control resumption while cancellation proof is in flight');assert.equal(api.reservation.state,'prepared');assert.equal(tr.ownerUpgradeKnown(destination),true);release();await rejected;
 assert.equal(api.reservation.state,'cancelled');assert.ok(api.reservation.ownerTombstone);assert.equal(verifyObject(api.reservation.ownerTombstone,new Set([f.identities[1].nodeId])),true);assert.equal(api.transition.state,'idle');assert.equal(api.frozen,false);assert.equal(tr.frozen,false);assert.equal(input.enabled,true);assert.deepEqual(source.player.position.toArray(),position);assert.equal(tr.membership.sessionId,session);assert.equal(tr.generation,generation);for(const runtime of f.runtimes)assert.ok(Object.values(runtime.authority.ledger.snapshot().transfers).every(r=>r.status==='CANCELLED'));await pose(tr,position);
});
test('REAL transition without authoritative cancellation proof stays frozen and only definitive recovery can resume',{timeout:30000},async t=>{
 const f=await fixture(t),tr=f.transport;clearInterval(tr.ownerPoll);const {api,input}=realTransition(f),cancel=tr.cancel.bind(tr);tr.cancel=async()=>{throw Error('Cancellation proof unavailable');};await assert.rejects(api.travel(),/Source resumption could not be proved/);assert.equal(api.transition.state,'outcome-unknown');assert.equal(api.frozen,true);assert.equal(tr.frozen,true);assert.equal(input.enabled,false);assert.ok(api.reservation.id);tr.cancel=cancel;await api.recover();assert.equal(api.transition.state,'idle');assert.equal(api.frozen,false);assert.equal(tr.frozen,false);assert.equal(input.enabled,true);assert.equal(api.reservation.state,'cancelled');
});
