import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {sign} from 'node:crypto';
import {WebSocket} from 'ws';
import {newIdentity,signObject,canonical,verifyObject} from '../network/identity.mjs';
import {publishRegion,issueDelegation} from '../network/federation.mjs';
import {createOwnerWorldRuntime} from '../tools/networking/owner-world-runtime.mjs';
import {pinnedRepository} from '../tools/networking/repository-world-server.mjs';
import {createWorld,packWorldRepository,loadWorldSource} from '../src/world-runtime/vendor/world-engine-contract.js';
const git=(root,args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const next=ws=>new Promise((resolve,reject)=>{const error=e=>{ws.off('message',message);reject(e);},message=b=>{ws.off('error',error);resolve(JSON.parse(b));};ws.once('message',message);ws.once('error',error);});
function assertArrivalPresentation(presence,{requestStarted,responseReceived,receipt,authority,transferId,playerId,sourceWorldId,destinationWorldId,generation,epoch}){
 const arrival=presence.players.find(p=>p.playerId===playerId);assert.ok(arrival,'committed player is present');
 const expiresAt=receipt.committedAt+3000;
 if(responseReceived<expiresAt)assert.ok(arrival.presentation,'a request completed within the lease requires presentation');
 else if(requestStarted>=expiresAt)assert.equal(arrival.presentation,undefined,'a request started after the lease requires absence');
 // A request spanning expiry may observe either state; every returned proof must be exact.
 for(const player of presence.players){if(player.presentation===undefined)continue;const p=player.presentation;
  assert.equal(verifyObject(p,new Set([authority])),true);
  assert.equal(p.protocol,'elsemesh.portal-presentation/1');assert.equal(p.type,'portal-arrival');
  assert.equal(p.transferId,transferId);assert.equal(p.playerId,playerId);assert.equal(p.playerId,player.playerId);
  assert.equal(p.playerNodeId,player.nodeId);assert.equal(p.sourceWorldId,sourceWorldId);assert.equal(p.destinationWorldId,destinationWorldId);
  assert.equal(p.destinationGeneration,generation);assert.equal(p.authorityEpoch,epoch);
  assert.equal(p.committedAt,receipt.committedAt);assert.equal(p.expiresAt,expiresAt);
 }
}
test('local owner immutable bytes, signed VIEW/ENTER, origin, replay and private configuration',{timeout:30000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'owner-runtime-'));let runtime,ws;
 try{
  const content=join(dir,'content'),web=join(dir,'web');await mkdir(content);await mkdir(web);await writeFile(join(web,'worlds.html'),'owner runtime');
  const project=createWorld('Owned world');project.spawn.position=[0,20,0];project.terrain.heights.fill(20);for(const [path,bytes]of await packWorldRepository(project)){await mkdir(dirname(join(content,path)),{recursive:true});await writeFile(join(content,path),bytes);}
  git(content,['init','-q']);git(content,['add','.']);git(content,['-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','content']);const commit=git(content,['rev-parse','HEAD']);
  const loaded=await loadWorldSource(await pinnedRepository(content,commit)),identity=newIdentity(),owner=newIdentity(),player=newIdentity(),playerId='player:'+player.nodeId.split(':')[1];
  const region={protocol:'elsemesh.region/1',regionId:'elsemesh-region:owned',worldId:'elsemesh-world:owned',version:1,ownerPlayerId:'player:owner',ownerNodeId:owner.nodeId,admins:[],hosts:[identity.nodeId],authority:{nodeId:identity.nodeId,epoch:1},rules:{gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'DAY',weapons:'DISALLOW',movement:['WALK'],requiredCapabilities:[]},assets:[],portals:[],participants:{players:[],npcs:[]}};
  const published=publishRegion(region,owner),binding=signObject({kind:'elsemesh.world-content-admission/1',authoredWorldId:project.metadata.worldId,authoredRegionId:project.metadata.regionId,contentDigest:loaded.identity.contentDigest,federationWorldId:region.worldId,federationRegionId:region.regionId,authorityNodeId:identity.nodeId,authorityEpoch:1,serverId:identity.nodeId,sessionEpoch:'owner-test',expiresAt:Date.now()+3600000},owner);
  const descriptor={worldId:project.metadata.worldId,regionId:project.metadata.regionId,contentDigest:loaded.identity.contentDigest,epoch:1,binding,published};
  const world={...descriptor,root:content,commit,ownerNodeId:owner.nodeId,delegation:issueDelegation(owner,{regionId:region.regionId,hostNodeId:identity.nodeId,permission:'AUTHORITY',expiresAt:Date.now()+3600000,version:1})};
  const config={protocol:'elsemesh.owner-runtime/1',worlds:[world],trustedOwners:[owner.nodeId],contacts:[{worldId:world.worldId,authorityNodeId:identity.nodeId,publicKeyPem:identity.publicKeyPem,descriptor}],peers:[],ledgerPath:join(dir,'private','ledger.json'),players:{[player.nodeId]:{label:'Local owner'}},policy:{viewPlayers:[playerId],enterPlayers:[playerId]}};
  runtime=await createOwnerWorldRuntime({root:web,identity,config,port:0,rpcFactory:()=>({start:async()=>{},close:async()=>{},request:async()=>{throw Error('No remote owner');}})});
  const origin='http://127.0.0.1:'+runtime.address.port,cfg=await(await fetch(origin+'/runtime-config')).json();
  assert.equal(cfg.protocol,'elsemesh.owner-runtime/1');assert.equal(JSON.stringify(cfg).includes(dir),false);assert.equal(JSON.stringify(cfg).includes('privateKey'),false);assert.equal(await(await fetch(origin+'/')).text(),'owner runtime');
  ws=new WebSocket(origin.replace('http','ws')+'/__worlds',{origin});const challenge=(await next(ws)).challenge;ws.send(JSON.stringify({type:'authenticate',publicKey:player.publicKeyPem,signature:sign(null,Buffer.from(canonical(challenge)),player.privateKeyPem).toString('base64')}));const welcome=await next(ws);assert.equal(welcome.type,'welcome');
  let seq=0;const call=async(operation,payload,envelope)=>{const response=next(ws);ws.send(JSON.stringify({type:'owner-envelope',requestId:String(++seq),envelope:envelope??signObject({protocol:'elsemesh.owner-browser-request/1',requestId:'test:'+seq,issuedAt:Date.now(),operation,payload:JSON.parse(JSON.stringify(payload))},player)}));return response;};
  assert.match((await call('read',{worldId:world.worldId,path:'world.json',offset:0,limit:100000})).error,/VIEW/);
  const proof=async action=>{const c=(await call('owner-challenge',{worldId:world.worldId,action,sessionId:welcome.sessionId})).result;assert.equal(c.signer,identity.nodeId);return signObject({protocol:'elsemesh.owner-player-proof/1',challenge:c},player);};
  assert.equal((await call('subscribe',{worldId:world.worldId,proof:await proof('VIEW')})).result.worldId,world.worldId);
  const entered=await call('owner-enter-local',{proof:await proof('ENTER')});assert.equal(entered.error,undefined,entered.error);assert.equal(entered.result.worldId,world.worldId);assert.equal(entered.result.nextSequence,1);
  const appearance={style:'male',shirt:'#7194aa',trousers:'#27313d',skin:'#805136',hair:'#171512'};
  const pose=await call('accepted-state',{state:{worldId:world.worldId,generation:0,sequence:entered.result.nextSequence,position:entered.result.position,velocity:[0,0,0],yaw:0,appearance}});assert.equal(pose.error,undefined,pose.error);assert.equal(pose.result.sequence,1);
  const bytes=await call('read',{worldId:world.worldId,path:'world.json',offset:0,limit:100000});assert.ok(bytes.result.total>0);assert.match((await call('read',{worldId:world.worldId,path:'.git/config',offset:0,limit:100000})).error,/denied/);
  const envelope=signObject({protocol:'elsemesh.owner-browser-request/1',requestId:'unique-replay',issuedAt:Date.now(),operation:'describe',payload:{worldId:world.worldId}},player);assert.ok((await call('describe',{},envelope)).result);assert.match((await call('describe',{},envelope)).error,/replay/);
  const oldLocation=globalThis.location,oldSocket=globalThis.WebSocket;globalThis.location=new URL(origin);globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin});}};let transport;
  try{const der=Buffer.from(player.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),privateCryptoKey=await crypto.subtle.importKey('pkcs8',der,{name:'Ed25519'},false,['sign']);transport=new OwnerWorldTransport({config:runtime.config});const actual=await transport.connect({identity:{nodeId:player.nodeId,publicKeyPEM:player.publicKeyPem,privateCryptoKey}});assert.equal(actual.nextSequence,2);const signed=await transport.sendAcceptedState({position:actual.position,velocity:[0,0,0],yaw:0,appearance});assert.equal(signed.sequence,2);}finally{transport?.disconnect();globalThis.location=oldLocation;globalThis.WebSocket=oldSocket;}
 }finally{ws?.terminate();await runtime?.close();await rm(dir,{recursive:true,force:true});}
});


import {readFile} from 'node:fs/promises';
import {initOwnerSetup,inviteOwnerSetup,acceptOwnerSetup,finalizeOwnerSetup} from '../tools/networking/owner-world-setup.mjs';
import {createOwnerPeerRelay} from '../tools/networking/owner-peer-relay.mjs';
import {assetId} from '../network/identity.mjs';
import {OwnerWorldTransport} from '../src/world-runtime/OwnerWorldTransport.js';

test('two native owner facades over encrypted relay recover prepared and committed replies across restart and return',{timeout:60000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'owner-facades-')),web=join(dir,'web'),player=newIdentity(),appearance={style:'male',shirt:'#7194aa',trousers:'#27313d',skin:'#805136',hair:'#171512'};
 let relay,A,B,client;const configs=[],identities=[],states=[join(dir,'a-state'),join(dir,'b-state')];
 const projects=[createWorld('A'),createWorld('B')];for(const p of projects){p.spawn.position=[0,20,.2];p.terrain.heights.fill(20);} // Explicit supported floor for admission.
 for(const [i,p]of projects.entries())p.portals=[{id:'elsemesh-portal:'+['a','b'][i],name:'Door',position:[0,21.5,0],yaw:[.4,-.3][i],width:3,height:3,destination:{worldId:projects[1-i].metadata.worldId,regionId:projects[1-i].metadata.regionId,portalId:'elsemesh-portal:'+['b','a'][i]},enabled:true,view:{enabled:true,maxDistance:20},traversal:{enabled:true},policyRef:'approved',visual:{frameColor:'#abcdef',unavailableColor:'#334455'}}];
 async function browser(runtime){
  const origin='http://127.0.0.1:'+runtime.address.port,ws=new WebSocket(origin.replace('http','ws')+'/__worlds',{origin});const challenge=(await next(ws)).challenge;ws.send(JSON.stringify({type:'authenticate',publicKey:player.publicKeyPem,signature:sign(null,Buffer.from(canonical(challenge)),player.privateKeyPem).toString('base64')}));const welcome=await next(ws);assert.equal(welcome.type,'welcome');let n=0;
  const call=async(operation,payload={})=>{const response=next(ws);ws.send(JSON.stringify({type:'owner-envelope',requestId:String(++n),envelope:signObject({protocol:'elsemesh.owner-browser-request/1',requestId:crypto.randomUUID(),issuedAt:Date.now(),operation,payload:JSON.parse(JSON.stringify(payload))},player)}));const p=await response;if(p.error)throw Error(p.error);return p.result;};
  const proof=async(worldId,action,sessionId,portalId)=>signObject({protocol:'elsemesh.owner-player-proof/1',challenge:await call('owner-challenge',{worldId,action,sessionId,portalId})},player);
  return {ws,welcome,call,proof,view:async(worldId,sessionId)=>call('subscribe',{worldId,proof:await proof(worldId,'VIEW',sessionId)})};
 }
 try{
  await mkdir(web);await writeFile(join(web,'worlds.html'),'test');
  const contacts=[];
  for(const [i,p]of projects.entries()){const root=join(dir,'repo'+i);await mkdir(root);for(const [path,bytes]of await packWorldRepository(p)){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),bytes);}git(root,['init','-q']);git(root,['add','.']);git(root,['-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','world']);contacts.push(await initOwnerSetup({stateDir:states[i],worldRoot:root,commit:git(root,['rev-parse','HEAD']),staticRoot:web}));}
  const invitations=await Promise.all(states.map((stateDir,i)=>inviteOwnerSetup({stateDir,peerContact:contacts[1-i],peerOwnerNodeId:contacts[1-i].signer})));
  const acceptances=await Promise.all(states.map((stateDir,i)=>acceptOwnerSetup({stateDir,invitation:invitations[1-i]})));
  for(const [i,stateDir]of states.entries()){configs.push(await finalizeOwnerSetup({stateDir,peerAcceptance:acceptances[1-i],enrollment:[{nodeId:player.nodeId,label:'Traveller',view:true,enter:true}],avatarAssetId:assetId(Buffer.from('avatar')),inventoryHash:assetId(Buffer.from('inventory'))}));identities.push(JSON.parse(await readFile(join(stateDir,'authority.json'),'utf8')));}
  const frames=[];relay=await createOwnerPeerRelay({port:0,onFrame:p=>frames.push(p)});const relayUrl='ws://127.0.0.1:'+relay.address.port;
  const start=i=>createOwnerWorldRuntime({root:web,config:configs[i],identity:identities[i],relayUrl,port:0});
  A=await start(0);B=await start(1);client=await browser(A);
  const aid=projects[0].metadata.worldId,bid=projects[1].metadata.worldId;
  await client.view(aid,client.welcome.sessionId);let member=await client.call('owner-enter-local',{proof:await client.proof(aid,'ENTER',client.welcome.sessionId)});
  let sequence=member.nextSequence;
  const occupant=newIdentity(),occupantId='player:'+occupant.nodeId.split(':')[1];A.authority.policy.enterPlayers.push(occupantId);
  const occupiedChallenge=await A.authority.challenge({playerId:occupantId,playerNodeId:occupant.nodeId,action:'ENTER',sessionId:'elsemesh-session:occupancy'});
  const nearby=await A.authority.enterLocal({proof:signObject({protocol:'elsemesh.owner-player-proof/1',challenge:occupiedChallenge},occupant),motion:{position:member.position,velocity:[0,0,0],yaw:0,pitch:0}});
  assert.deepEqual(nearby.motion.position,[-.8,20,.2]);
  assert.ok(Math.hypot(nearby.motion.position[0]-member.position[0],nearby.motion.position[2]-member.position[2])>=.65);
  await A.authority.ledger.transact(state=>{delete state.members[occupantId];return null;});
  let currentYaw=0;const pose=async(worldId,generation)=>{const angle=worldId===aid?.4:-.3;return client.call('accepted-state',{state:{worldId,generation,sequence:sequence++,position:[-.2*Math.sin(angle),20,-.2*Math.cos(angle)],velocity:[-Math.sin(angle),0,-Math.cos(angle)],yaw:currentYaw,appearance}});};
  const prepare=async(source,destination,portalId,sessionId)=>client.call('prepare',{portalId,transferId:crypto.randomUUID(),proof:await client.proof(destination,'ENTER',sessionId,portalId)});
  await pose(aid,0);await client.view(bid,member.sessionId);
  for(const reason of ['denied','full','occupied']){
   const saved=B.authority.policy.enterPlayers;
   if(reason==='denied')B.authority.policy.enterPlayers=[];
   else await B.authority.ledger.transact(state=>{state.members.blocker={playerId:'blocker',playerNodeId:'blocker',sessionId:'elsemesh-session:blocker',status:'ACTIVE',motion:{position:reason==='occupied'?[0,20,0]:[20,20,20],velocity:[0,0,0],yaw:0,pitch:0}};return null;});
   if(reason==='full')B.authority.policy.capacity=1;
   const denied=await prepare(aid,bid,'elsemesh-portal:a',member.sessionId);assert.equal(denied.state,'cancelled');assert.equal(verifyObject(denied.ownerTombstone,new Set([identities[1].nodeId])),true);assert.equal(A.authority.ledger.snapshot().members['player:'+player.nodeId.split(':')[1]].status,'ACTIVE');assert.equal(B.authority.ledger.snapshot().transfers[denied.id].status,'CANCELLED');assert.equal((await client.call('cancel',{reservationId:denied.id,sourceWorldId:aid})).state,'cancelled');
   B.authority.policy.enterPlayers=saved;B.authority.policy.capacity=16;await B.authority.ledger.transact(state=>{delete state.members.blocker;return null;});
  }
  // A lost ready request before it reaches B leaves PREPARING, with no destination
  // record. Fresh browser bootstrap must obtain a signed no-commit tombstone.
  const unknownId=crypto.randomUUID(),originalRpc=A.rpc.request;A.rpc.request=async(...args)=>{if(args[1]==='ready')throw Error('ready request lost before delivery');return originalRpc(...args);};
  await assert.rejects(client.call('prepare',{portalId:'elsemesh-portal:a',transferId:unknownId,proof:await client.proof(bid,'ENTER',member.sessionId,'elsemesh-portal:a')}),/lost before delivery/);A.rpc.request=originalRpc;
  assert.equal(B.authority.ledger.snapshot().transfers[unknownId],undefined);
  client.ws.terminate();await A.close();A=await start(0);
  const freshOrigin='http://127.0.0.1:'+A.address.port,oldLocation=globalThis.location,oldSocket=globalThis.WebSocket;globalThis.location=new URL(freshOrigin);globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:freshOrigin});}};let recoveredTransport;
  try{const der=Buffer.from(player.privateKeyPem.replace(/-----[^-]+-----|\s/g,''),'base64'),privateCryptoKey=await crypto.subtle.importKey('pkcs8',der,{name:'Ed25519'},false,['sign']);recoveredTransport=new OwnerWorldTransport({config:A.config});const recovered=await recoveredTransport.connect({identity:{nodeId:player.nodeId,publicKeyPEM:player.publicKeyPem,privateCryptoKey}});assert.equal(recovered.worldId,aid);assert.equal(recoveredTransport.frozen,false);assert.equal(A.authority.ledger.snapshot().transfers[unknownId].status,'CANCELLED');assert.equal(B.authority.ledger.snapshot().transfers[unknownId].status,'CANCELLED');assert.equal((await B.authority.ready({binding:A.authority.ledger.snapshot().transfers[unknownId].binding,proof:null},{callerNodeId:identities[0].nodeId})).kind,'owner-world-cancel-tombstone');}
  finally{recoveredTransport?.disconnect();globalThis.location=oldLocation;globalThis.WebSocket=oldSocket;}
  client=await browser(A);await client.view(aid,member.sessionId);await client.view(bid,member.sessionId);
  const first=await prepare(aid,bid,'elsemesh-portal:a',member.sessionId);assert.equal(A.authority.ledger.snapshot().members['player:'+player.nodeId.split(':')[1]].status,'FROZEN');
  // Discard the prepare reply, lose all facade maps and rediscover by the client's UUID.
  client.ws.terminate();await A.close();A=await start(0);client=await browser(A);
  const discovered=await client.call('owner-pending',{reservationId:first.id,sourceWorldId:aid});assert.equal(discovered.id,first.id);
  const cancelled=await client.call('cancel',{reservationId:first.id,sourceWorldId:aid});assert.equal(cancelled.state,'cancelled');
  await client.view(aid,member.sessionId);sequence=A.authority.ledger.snapshot().members['player:'+player.nodeId.split(':')[1]].sequence+1;await pose(aid,0);
  const second=await prepare(aid,bid,'elsemesh-portal:a',member.sessionId);await client.call('ready',{reservationId:second.id,sourceWorldId:aid,contentDigest:second.contentDigest,epoch:second.epoch});
  await client.call('handoff',{reservationId:second.id,sourceWorldId:aid});
  // Discard handoff/commit acknowledgement and restart source. Bootstrap must locate B.
  client.ws.terminate();await A.close();A=await start(0);client=await browser(A);assert.equal(client.welcome.worldId,bid);
  const committed=await client.call('status',{reservationId:second.id,sourceWorldId:aid});assert.equal(committed.state,'committed');assert.equal(committed.generation,1);assert.ok(Math.abs(committed.yaw-(Math.PI-.7))<1e-10);assert.ok(Math.abs(committed.velocity[0]-Math.sin(-.3))<1e-6);assert.ok(Math.abs(committed.velocity[2]-Math.cos(-.3))<1e-6);
  await client.view(bid,committed.destinationSessionId);
  const receipt=B.authority.ledger.snapshot().transfers[second.id].receipt;
  assert.equal(verifyObject(receipt,new Set([identities[1].nodeId])),true);
  const presentationContext={receipt,authority:identities[1].nodeId,transferId:second.id,playerId:'player:'+player.nodeId.split(':')[1],sourceWorldId:aid,destinationWorldId:bid,generation:committed.generation,epoch:configs[1].worlds[0].published.descriptor.authority.epoch};
  const requestStarted=Date.now(),arrivalPresence=await client.call('presence',{worldId:bid}),responseReceived=Date.now();
  assertArrivalPresentation(arrivalPresence,{...presentationContext,requestStarted,responseReceived});
  // Exercise both lease branches deterministically against the real signed presence response.
  const realNow=Date.now;
  try{for(const offset of [1000,3000]){const at=receipt.committedAt+offset;Date.now=()=>at;
   const observed=await client.call('presence',{worldId:bid});
   assertArrivalPresentation(observed,{...presentationContext,requestStarted:at,responseReceived:at});
  }}finally{Date.now=realNow;}
  sequence=committed.nextSequence;currentYaw=committed.yaw;await pose(bid,1);
  await client.view(aid,committed.destinationSessionId);
  const back=await prepare(bid,aid,'elsemesh-portal:b',committed.destinationSessionId);await client.call('ready',{reservationId:back.id,sourceWorldId:bid,contentDigest:back.contentDigest,epoch:back.epoch});await client.call('handoff',{reservationId:back.id,sourceWorldId:bid});const returned=await client.call('commit',{reservationId:back.id,sourceWorldId:bid});assert.equal(returned.destinationWorldId,aid);assert.equal(returned.generation,2);assert.ok(Math.abs(returned.yaw)<1e-10);assert.ok(Math.abs(returned.velocity[0]-Math.sin(.4))<1e-6);assert.ok(Math.abs(returned.velocity[2]-Math.cos(.4))<1e-6);
  assert.equal(Object.keys(A.authority.ledger.snapshot().members).length,1);assert.equal(Object.keys(B.authority.ledger.snapshot().members).length,0);
  assert.equal(JSON.stringify(frames).includes('world.json'),false);
 }finally{client?.ws.terminate();await A?.close();await B?.close();await relay?.close();await rm(dir,{recursive:true,force:true});}
});
