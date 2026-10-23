import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sign } from 'node:crypto';
import { WebSocket } from 'ws';
import { newIdentity, signObject, canonical, verifyObject } from '../network/identity.mjs';
import { publishRegion } from '../network/federation.mjs';
import { createRepositoryWorldServer, pinnedRepository } from '../tools/networking/repository-world-server.mjs';
import { createWorld, packWorldRepository, loadWorldSource } from '../src/world-runtime/vendor/world-engine-contract.js';
const git=(root,args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const next=ws=>new Promise((resolve,reject)=>{ws.once('message',b=>resolve(JSON.parse(b)));ws.once('error',reject);});
function proof(identity,challenge){return {type:'authenticate',publicKey:identity.publicKeyPem,signature:sign(null,Buffer.from(canonical(challenge)),identity.privateKeyPem).toString('base64')};}
test('real pinned repository + origin-gated WebSocket proof + authenticated allowlisted bounded reads',{timeout:30000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'repository-world-server-'));let server;const sockets=[];
 try{const content=join(dir,'content'),web=join(dir,'web');await mkdir(content);await mkdir(web);await writeFile(join(web,'worlds.html'),'test');const project=createWorld('Pinned world');const files=await packWorldRepository(project);for(const [path,bytes]of files){await mkdir(dirname(join(content,path)),{recursive:true});await writeFile(join(content,path),bytes);}git(content,['init','-q']);git(content,['add','.']);git(content,['-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','content']);const commit=git(content,['rev-parse','HEAD']);const source=await pinnedRepository(content,commit),loaded=await loadWorldSource(source);const original=await source.read('world.json',100000);await writeFile(join(content,'world.json'),'UNCOMMITTED');assert.deepEqual(await source.read('world.json',100000),original);await assert.rejects(source.read('.git/config',100000),/denied/);await assert.rejects(source.read('world.json',2),/limit/);
  const identity=newIdentity(),owner=newIdentity(),player=newIdentity();const descriptor={protocol:'elsemesh.region/1',regionId:'elsemesh-region:pinned',worldId:'elsemesh-world:pinned',version:1,ownerPlayerId:'player:owner',ownerNodeId:owner.nodeId,admins:[],hosts:[identity.nodeId],authority:{nodeId:identity.nodeId,epoch:1},rules:{gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'DAY',weapons:'DISALLOW',movement:['WALK'],requiredCapabilities:[]},assets:[],portals:[],participants:{players:[],npcs:[]}};
  const binding=signObject({kind:'elsemesh.world-content-admission/1',authoredWorldId:project.metadata.worldId,authoredRegionId:project.metadata.regionId,contentDigest:loaded.identity.contentDigest,federationWorldId:descriptor.worldId,federationRegionId:descriptor.regionId,authorityNodeId:identity.nodeId,authorityEpoch:1,serverId:identity.nodeId,sessionEpoch:'prototype',expiresAt:Date.now()+3600000},owner);
  const world={worldId:project.metadata.worldId,regionId:project.metadata.regionId,federationWorldId:descriptor.worldId,federationRegionId:descriptor.regionId,root:content,commit,ownerNodeId:owner.nodeId,published:publishRegion(descriptor,owner),binding,policies:{view:[player.nodeId],enter:[player.nodeId]}};
  server=await createRepositoryWorldServer({root:web,identity,config:{worlds:[world],defaultWorldId:world.worldId,players:{[player.nodeId]:{label:'Player 1'}}},port:0});const origin='http://127.0.0.1:'+server.address.port;
  const cfg=await(await fetch(origin+'/runtime-config')).json();assert.equal(cfg.defaultWorldId,world.worldId);assert.equal(JSON.stringify(cfg).includes(content),false);assert.equal(JSON.stringify(cfg).includes('privateKey'),false);assert.equal(await(await fetch(origin+'/')).text(),'test');assert.equal(await(await fetch(origin+'/worlds.html?renderer=webgl2')).text(),'test');assert.equal(await(await fetch(origin+'/?renderer=webgl2')).text(),'test');assert.equal((await fetch(origin+'/../.git/config')).status,404);
  const connect=()=>{const ws=new WebSocket(origin.replace('http','ws')+'/__worlds',{origin});ws.on('error',()=>{});sockets.push(ws);return ws;};
  let ws=connect(),challenge=(await next(ws)).challenge;ws.send(JSON.stringify(proof(newIdentity(),challenge)));const pending=await next(ws);assert.equal(pending.type,'pending');
  ws=connect();challenge=(await next(ws)).challenge;ws.send(JSON.stringify(proof(player,challenge)));const welcome=await next(ws);assert.equal(welcome.type,'welcome');assert.equal(welcome.label,'Player 1');assert.equal(welcome.world.contentDigest,loaded.identity.contentDigest);assert.equal(welcome.appearance.style,'male');assert.equal(welcome.nextSequence,0);
  const replay=connect();const nextChallenge=(await next(replay)).challenge;assert.notEqual(nextChallenge.nonce,challenge.nonce);replay.send(JSON.stringify(proof(player,challenge)));assert.equal((await next(replay)).type,'error');
  const request=async packet=>{const response=new Promise((resolve,reject)=>{const listener=b=>{const p=JSON.parse(b);if(p.type==='result'&&p.requestId==='test'){ws.off('message',listener);resolve(p);}};ws.on('message',listener);setTimeout(()=>{ws.off('message',listener);reject(Error('Request timeout'));},2000).unref();});ws.send(JSON.stringify({requestId:'test',...packet}));return response;};
  const appearance={style:'female',shirt:'#7194aa',trousers:'#27313d',skin:'#805136',hair:'#171512'};
  const accepted=await request({type:'accepted-state',state:{worldId:welcome.worldId,generation:welcome.generation,sequence:0,timestamp:Date.now(),position:welcome.position,velocity:[0,0,0],yaw:0,appearance}});
  assert.equal(verifyObject(accepted.result,new Set([identity.nodeId])),true);assert.deepEqual(accepted.result.appearance,appearance);assert.deepEqual(server.federation.presence(welcome.worldId)[0].appearance,appearance);
  const invalid=await request({type:'accepted-state',state:{worldId:welcome.worldId,generation:welcome.generation,sequence:1,timestamp:Date.now(),position:welcome.position,velocity:[0,0,0],yaw:0,appearance:{...appearance,style:'https://invalid/model.glb'}}});
  assert.match(invalid.error,/appearance/);assert.deepEqual(server.federation.presence(welcome.worldId)[0].appearance,appearance);
  // A warm reconnect retains the identity session and must start beyond the
  // authority's accepted sequence, rather than silently dropping thousands of poses.
  const disconnected=new Promise(resolve=>ws.once('close',resolve));ws.close();await disconnected;
  ws=connect();const warmChallenge=(await next(ws)).challenge;ws.send(JSON.stringify(proof(player,warmChallenge)));
  const resumed=await next(ws);assert.equal(resumed.type,'welcome');assert.equal(resumed.sessionId,welcome.sessionId);assert.equal(resumed.generation,welcome.generation);assert.equal(resumed.nextSequence,1);
  const firstWarmPose=await request({type:'accepted-state',state:{worldId:resumed.worldId,generation:resumed.generation,sequence:resumed.nextSequence,timestamp:Date.now(),position:resumed.position,velocity:[0,0,0],yaw:0,appearance}});
  assert.equal(verifyObject(firstWarmPose.result,new Set([identity.nodeId])),true);assert.equal(firstWarmPose.result.sequence,1);assert.equal(firstWarmPose.result.sessionId,welcome.sessionId);

  const read=await request({type:'read',worldId:world.worldId,path:'world.json',offset:0,limit:100000});assert.equal(read.result.total,original.length);assert.deepEqual(Buffer.from(read.result.bytes,'base64'),original);assert.match((await request({type:'read',worldId:world.worldId,path:'.git/config',offset:0,limit:100000})).error,/denied/);assert.match((await request({type:'read',worldId:'world.unknown',path:'world.json',offset:0,limit:100000})).error,/VIEW/);
  const rejected=new WebSocket(origin.replace('http','ws')+'/__worlds',{origin:'https://wrong.invalid'});rejected.on('error',()=>{});sockets.push(rejected);const failure=await new Promise(resolve=>rejected.once('unexpected-response',(_request,response)=>{response.resume();resolve(response.statusCode);}));assert.equal(failure,403);
 }finally{for(const ws of sockets)ws.terminate();if(server)await server.close();await rm(dir,{recursive:true,force:true});}
});
