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
import {createOwnerWorldRuntime,ownerStaticContentSecurityPolicy} from '../tools/networking/owner-world-runtime.mjs';
import {OwnerWorldTransport} from '../src/world-runtime/OwnerWorldTransport.js';
import {createWorld,packWorldRepository} from '../src/world-runtime/vendor/world-engine-contract.js';


import {Player} from '../src/player/Player.js';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/math/Vector3.js';

// Two actual owner facades + encrypted RPC + browser WebCrypto transport; no renderer or device claim.
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const appearance={style:'female',shirt:'#33785b',trousers:'#27313d',skin:'#805136',hair:'#171512'};
// Existing federation/2 mapping deterministically rounds vector components to six decimals.
const closeTo=(actual,expected,label)=>{assert.equal(actual.length,expected.length,label);for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<=0.00000051,label+' axis '+i+': '+actual[i]+' versus '+expected[i]);};
async function fixture(t,{destinationEnter=true,relayAbsent=false,remoteExpired=null}={}){
 const dir=await mkdtemp(join(tmpdir(),'owner-browser-roundtrip-')),web=join(dir,'web'),player=newIdentity(),blocker=newIdentity(),frames=[],runtimes=[],transports=[];
 let relay;const oldLocation=globalThis.location,oldSocket=globalThis.WebSocket;
 t.after(async()=>{for(const transport of transports)transport.disconnect();globalThis.location=oldLocation;globalThis.WebSocket=oldSocket;for(const runtime of runtimes)await runtime.close();await relay?.close();await rm(dir,{recursive:true,force:true});});
 await mkdir(web);await mkdir(join(web,'editor'));await mkdir(join(web,'nested','editor'),{recursive:true});await writeFile(join(web,'worlds.html'),'Protocol fixture; no renderer');await writeFile(join(web,'editor','native-preview.html'),'trusted installed preview');await writeFile(join(web,'nested','editor','native-preview.html'),'other path');await writeFile(join(web,'other.html'),'other HTML');
 const projects=[createWorld('Browser owner A'),createWorld('Browser owner B')];
 for(const p of projects){p.spawn.position=[0,3,-81.8];p.terrain.width=2048;p.terrain.depth=2048;p.terrain.heights=p.terrain.heights.map(()=>0);p.objects=[{id:'warehouse-floor',name:'original warehouse floor bounds',kind:'box',position:[0,2.85,-77],rotation:[0,0,0],scale:[32/1.6,.3/1.6,30/1.6],visible:true,collision:'walkable',color:'#777777'},...Array.from({length:14},(_,i)=>({id:'warehouse-tread-'+(805+i),name:'original warehouse stair tread '+i,kind:'box',position:[3,3.14+i*.25,-78.55+i*.65],rotation:[0,0,0],scale:[4/1.6,.28/1.6,.82/1.6],visible:true,collision:'walkable',color:'#777777'}))];}
 for(const[i,p]of projects.entries())p.portals=[{id:'elsemesh-portal:browser-'+i,name:'Door',position:[0,4.5,-82],yaw:0,width:3,height:3,destination:{worldId:projects[1-i].metadata.worldId,regionId:projects[1-i].metadata.regionId,portalId:'elsemesh-portal:browser-'+(1-i)},enabled:true,view:{enabled:true,maxDistance:20},traversal:{enabled:true},policyRef:'approved-owner-contact',visual:{frameColor:'#abcdef',unavailableColor:'#334455'}}];
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

test('two real owner authorities accept native Player ordinary .05s stair updates and delayed multi-tread state; strict arrivals remain strict',{timeout:30000},async t=>{
 const f=await fixture(t),transport=f.transport,worldId=f.projects[1].metadata.worldId,descriptor=await transport.subscribe(worldId);
 await transport.sendAcceptedState({position:[0,3,-82.2],velocity:[0,0,-1],yaw:0,appearance});const reservation=await transport.prepare(f.projects[0].portals[0].id);transport.setRecoveryContext({reservation,descriptor});transport.setFrozen(true);await transport.ready(reservation.id,descriptor.contentDigest,descriptor.epoch);await transport.handoff(reservation.id);await transport.commit(reservation.id);transport.setFrozen(false);clearInterval(transport.ownerPoll);
 await transport.sendAcceptedState({position:[3,3,-79.4],velocity:[0,0,0],yaw:Math.PI,appearance});
 const colliders=new Colliders();colliders.addBox(new Vector3(0,2.85,-77),new Vector3(16,.15,15),0,{walkable:true});for(let i=0;i<14;i++)colliders.addBox(new Vector3(3,3.14+i*.25,-78.55+i*.65),new Vector3(2,.14,.41),0,{walkable:true});const player=new Player({camera:{},input:{moveAxes:()=>({x:0,y:1,sprint:0}),hit:()=>false,down:()=>false},terrain:{heightAt:()=>0},colliders,query:{allocate:()=>0}});player.position.set(3,3,-79.4);player.yaw=Math.PI;player.grounded=true;player.surfaceType=()=> 'wood';let reports=0;const reached=new Set();
 for(let i=0;i<75;i++){player.updateWalk(.05);const position=player.position.toArray();for(let n=0;n<14;n++)if(Math.abs(position[1]-(3.28+n*.25))<.001)reached.add(n);await new Promise(r=>setTimeout(r,55));assert.equal(transport.sendState({position,velocity:player.velocity.toArray(),yaw:Math.PI,appearance}),true);await waitFor(()=>!transport.ownerPosePending);assert.equal(f.corrections.length,0,'ordinary frame '+i);reports++;if(position[2]>-69.8)break;}
 assert.equal(reached.size,14);assert(reports>50);const authority=f.runtimes[1].authority,member=authority.ledger.snapshot().members[f.playerId];assert(member.motion.position[1]>=6.53-.001);
 // Put the accepted source on an earlier supported tread using the ordinary strict operation.
 await transport.sendAcceptedState({position:[3.055206,4.03,-76.682031],velocity:[0,0,0],yaw:0,appearance});
 await new Promise(r=>setTimeout(r,55));assert.equal(transport.sendState({position:[3,4.78,-74.51],velocity:[0,0,3],yaw:0,appearance}),true);await waitFor(()=>!transport.ownerPosePending);assert.equal(f.corrections.length,0);assert.equal(authority.ledger.snapshot().members[f.playerId].motion.position[1],4.78);
 const before=authority.ledger.snapshot().members[f.playerId],grant=Object.values(authority.ledger.snapshot().grants).find(g=>g.playerId===f.playerId&&g.sessionId===before.sessionId),edge=[3.06546,4.03,-76.46349];
 await assert.rejects(authority.acceptedState({grantId:grant.grantId,playerId:f.playerId,sessionId:before.sessionId,motion:{position:edge,velocity:[0,0,0],yaw:0,pitch:0},sequence:before.sequence+1,generation:before.generation,purpose:'movement',previousMotion:{position:[3,4.03,-76.6]}}),/Movement clearance denied/);
 assert.deepEqual(authority.ledger.snapshot().members[f.playerId],before);
 const blockerId='player:'+f.blocker.nodeId.split(':')[1],challenge=await authority.challenge({playerId:blockerId,playerNodeId:f.blocker.nodeId,action:'ENTER',sessionId:'elsemesh-session:strict-stair-side'});await assert.rejects(authority.enterLocal({proof:signObject({protocol:'elsemesh.owner-player-proof/1',challenge},f.blocker),motion:{position:edge,velocity:[0,0,0],yaw:0,pitch:0}}),/Arrival clearance denied/);assert.equal(authority.ledger.snapshot().members[blockerId],undefined);
 const originalClearance=authority.clearance;let internal;authority.clearance=async info=>{internal=info;return originalClearance(info);};await authority.acceptedState({grantId:grant.grantId,playerId:f.playerId,sessionId:before.sessionId,motion:{position:edge,velocity:[0,0,0],yaw:0,pitch:0},sequence:before.sequence+1,generation:before.generation,purpose:'arrival',previousMotion:{position:[999,999,999]}},{allowCollisionCorrection:true});assert.equal(internal.purpose,'movement');assert.deepEqual(internal.previousMotion,before.motion);authority.clearance=originalClearance;

 const origins=f.runtimes.map(r=>'http://127.0.0.1:'+r.address.port);for(const origin of origins){assert.equal((await fetch(origin+'/editor/native-preview.html')).headers.get('content-security-policy'),"frame-ancestors 'self'; base-uri 'self'; object-src 'none'");for(const p of ['/worlds.html','/other.html','/nested/editor/native-preview.html'])assert.equal((await fetch(origin+p)).headers.get('content-security-policy'),"frame-ancestors 'none'; base-uri 'self'; object-src 'none'");}
});

test('trusted preview CSP allowlist uses only the exact normalized installed relative path',()=>{for(const p of ['editor/native-preview.html','editor\\native-preview.html'])assert.match(ownerStaticContentSecurityPolicy(p),/^frame-ancestors 'self';/);for(const p of ['native-preview.html','other.html','nested/editor/native-preview.html','editor/native-preview.html/extra','editor/../native-preview.html'])assert.match(ownerStaticContentSecurityPolicy(p),/^frame-ancestors 'none';/);});
