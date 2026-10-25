import {prepareSplatWorldPhysics,splatPlayerClearance} from '../../network/splat-world-physics.mjs';
import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes, verify } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { roomSecurity, sendBounded } from './RoomSecurity.mjs';
import { nodeId, canonical, loadOrCreateIdentity, verifyObject } from '../../network/identity.mjs';
import { RepositoryFederation, challengePayload } from '../../network/repository-federation.mjs';
import { FEDERATION_CAPABILITIES } from '../../network/federation.mjs';
import { isRepositoryContentPath } from '../../src/world-runtime/LocalRepositoryFiles.js';
import { loadWorldSource, admitFederatedRuntimeWorld, collisionWorldBounds, sampleTerrain } from '../../src/world-runtime/vendor/world-engine-contract.js';
import {createRepositoryMotionClearance} from '../../network/repository-motion-clearance.mjs';
import {prepareNativeIslandPhysics} from '../../network/repository-native-physics.mjs';
const exec=promisify(execFile),check=(v,m)=>{if(!v)throw Error(m);},MAX_FILE=128*1024*1024;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.svg':'image/svg+xml','.woff2':'font/woff2'};
/** Reads immutable Git objects only. Never exposes a worktree, .git or filesystem path. */
export async function pinnedRepository(root,commit){
 root=await realpath(root);check(/^[a-f0-9]{40}$/.test(commit),'Full pinned Git commit required');
 const actual=(await exec('git',['-C',root,'rev-parse',commit+'^{commit}'])).stdout.trim();check(actual===commit,'Commit mismatch');
 let cachePath,cacheBytes;const sceneCache=new Map(),pending=new Map();let sceneCacheBytes=0,gitShowReads=0;
 const read=async(path,limit)=>{check(isRepositoryContentPath(path),'Content path denied');check(Number.isSafeInteger(limit)&&limit>0&&limit<=MAX_FILE,'Invalid content limit');
  const scene=/^splat-scenes\/[a-f0-9]{64}\.(sog|json)$/.test(path),cap=scene?(path.endsWith('.sog')?16*1024*1024:8*1024*1024):MAX_FILE,effective=Math.min(limit,cap);
  if(sceneCache.has(path)){const value=sceneCache.get(path);check(value.length<=effective,'Content exceeds purpose byte cap');sceneCache.delete(path);sceneCache.set(path,value);return value;}
  if(cachePath===path){check(cacheBytes.length<=effective,'Content exceeds limit');return cacheBytes;}
  if(pending.has(path)){const value=await pending.get(path);check(value.length<=effective,'Content exceeds limit');return value;}
  const work=(async()=>{
   const size=Number((await exec('git',['-C',root,'cat-file','-s',commit+':'+path])).stdout.trim());
   // Bound the Git object size BEFORE git show allocates its output buffer.
   check(Number.isSafeInteger(size)&&size>=0&&size<=effective,'Content exceeds purpose byte cap or caller limit');
   gitShowReads++;const {stdout}=await exec('git',['-C',root,'show',commit+':'+path],{encoding:'buffer',maxBuffer:effective+1024,timeout:15000});check(stdout.length===size,'Content changed');
   if(scene){while(sceneCache.size>=2||sceneCacheBytes+size>24*1024*1024){const first=sceneCache.keys().next().value;sceneCacheBytes-=sceneCache.get(first).length;sceneCache.delete(first);}sceneCache.set(path,stdout);sceneCacheBytes+=size;}
   else{cachePath=path;cacheBytes=stdout;}return stdout;
  })();pending.set(path,work);try{return await work;}finally{if(pending.get(path)===work)pending.delete(path);}
 };return {kind:'local',label:'pinned:'+commit,read,cacheDiagnostics:()=>({entries:sceneCache.size,bytes:sceneCacheBytes,gitShowReads})};
}

export async function prepareRepositoryConfig(config,identity){
 const worlds=[];
 for(const configured of config.worlds){
  const source=await pinnedRepository(configured.root,configured.commit),loaded=await loadWorldSource(source),project=loaded.project;
  check(project.metadata.worldId===configured.worldId&&project.metadata.regionId===configured.regionId,'Authored identity mismatch');
  check(configured.binding&&Number.isSafeInteger(configured.binding.expiresAt)&&configured.binding.expiresAt>Date.now(),'Expired content admission');
  check(configured.binding&&verifyObject(configured.binding,new Set([configured.ownerNodeId])),'Untrusted content admission');
  admitFederatedRuntimeWorld(project,loaded.identity.contentDigest,configured.binding,configured.published,{verifyBinding:b=>b===configured.binding,verifyRegion:p=>p.descriptor});
  const splatPhysics=await prepareSplatWorldPhysics(project,source.read);
  const physics=splatPhysics?null:await prepareNativeIslandPhysics(project,source.read),heightAt=physics?.heightAt??((x,z)=>sampleTerrain(project.terrain,x,z));
  const clearance=splatPhysics?splatPlayerClearance(splatPhysics):createRepositoryMotionClearance({colliders:collisionWorldBounds(project),heightAt,width:physics?project.nativeIsland.grid.size:project.terrain.width,depth:physics?project.nativeIsland.grid.size:project.terrain.depth});
  check(!configured.portals||canonical(configured.portals.map(({invitation,acceptance,...p})=>p))===canonical(project.portals??[]),'Operator portal data disagrees with pinned content');
  const approvals=new Map((configured.portals??[]).map(p=>[p.id,{invitation:p.invitation,acceptance:p.acceptance}]));
  const preparedWorld={...configured,contentDigest:loaded.identity.contentDigest,spawn:project.spawn.position,portals:(project.portals??[]).map(p=>({...p,...approvals.get(p.id)})),clearance,source};if(splatPhysics)Object.defineProperty(preparedWorld,'splatPhysics',{value:splatPhysics,enumerable:false});worlds.push(preparedWorld);
 }
 return {...config,worlds};
}
export async function createRepositoryWorldServer({root=resolve('dist'),config,identity,host='127.0.0.1',port=5201,publicOrigin=null,production=false}={}){
 const security=roomSecurity({host,publicOrigin,production});root=await realpath(root);config=await prepareRepositoryConfig(config,identity);const federation=new RepositoryFederation(config,identity),peers=new Map();
 const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false});
 const server=createServer({headersTimeout:10000,requestTimeout:15000,maxHeaderSize:8192},async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/runtime-config'){const bytes=JSON.stringify({protocol:'elsemesh.repository-runtime/1',endpoint:'/__worlds',defaultWorldId:config.defaultWorldId,worldIds:config.worlds.map(w=>w.worldId),worlds:config.worlds.map(w=>({worldId:w.worldId,name:w.name??w.worldId,contentDigest:w.contentDigest})),serverNodeId:identity.nodeId,trustedOwners:[...new Set(config.worlds.map(w=>w.ownerNodeId))],serverId:identity.nodeId});res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:bytes);return;}
   const path=decodeURIComponent(url.pathname==='/'?'/worlds.html':url.pathname);check(!path.includes('\\'),'Invalid path');const file=await realpath(resolve(root,'.'+path)),rel=relative(root,file);check(rel&&!rel.startsWith('..')&&!rel.includes(':')&&!rel.split(/[\\/]/).some(p=>p.startsWith('.')),'Path denied');const info=await stat(file);check(info.isFile()&&info.size<MAX_FILE,'Invalid file');res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'self'; object-src 'none'"});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(404).end();else res.destroy();}
 });
 const broadcast=()=>{for(const [node,peer] of peers){const s=federation.members.get(node);if(s)for(const worldId of s.views)sendBounded(peer,JSON.stringify({type:'presence',worldId,players:federation.presence(worldId)}));}};
 server.on('upgrade',(req,socket,head)=>{try{check(req.url==='/__worlds'&&security.accept(req,server.address().port),'Origin denied');check(wss.clients.size<64,'Server full');wss.handleUpgrade(req,socket,head,peer=>{
  let authenticated=null,busy=false,windowAt=Date.now(),count=0,statesAt=0,stateCount=0;const nonce=randomBytes(32).toString('hex'),expiresAt=Date.now()+10000,challenge=challengePayload(nonce,expiresAt);sendBounded(peer,JSON.stringify({type:'challenge',challenge}));const timeout=setTimeout(()=>peer.close(1008,'Authentication timeout'),10000);timeout.unref();peer.on('error',()=>peer.terminate());peer.alive=true;peer.on('pong',()=>peer.alive=true);
  peer.on('message',async(bytes,binary)=>{let packet;try{check(!binary,'Text required');packet=JSON.parse(bytes.toString());if(!authenticated){check(Date.now()<expiresAt&&packet.type==='authenticate'&&typeof packet.publicKey==='string'&&packet.publicKey.length<2000&&typeof packet.signature==='string'&&packet.signature.length<256,'Invalid identity proof');const node=nodeId(packet.publicKey);check(verify(null,Buffer.from(canonical(challenge)),packet.publicKey,Buffer.from(packet.signature,'base64')),'Identity proof failed');clearTimeout(timeout);check(!peers.has(node),'Identity already connected');if(!config.players?.[node]){sendBounded(peer,JSON.stringify({type:'pending',nodeId:node,message:'Pending operator enrolment'}));peer.close(1008,'Pending enrolment');return;}const s=federation.attach(node,packet.capabilities??FEDERATION_CAPABILITIES);authenticated=node;peers.set(node,peer);sendBounded(peer,JSON.stringify({type:'welcome',nodeId:node,playerId:s.playerId,label:s.label,worldId:s.worldId,sessionId:s.sessionId,generation:s.generation,nextSequence:s.sequence+1,appearance:s.appearance,position:s.position,velocity:s.velocity,yaw:s.yaw,world:federation.describe(s.worldId)}));broadcast();return;}
   const now=Date.now();if(now-windowAt>=1000){windowAt=now;count=0;}check(++count<=100,'Rate exceeded');
   if(packet.type==='state'){if(now-statesAt>=1000){statesAt=now;stateCount=0;}if(++stateCount>20)return;federation.update(authenticated,packet);return;}
   check(!busy,'Request already pending');busy=true;let result;
   try{switch(packet.type){
    case 'subscribe':result=federation.subscribe(authenticated,packet.worldId,packet.portalId);break;
    case 'unsubscribe':{const s=federation.members.get(authenticated);if(packet.worldId!==s.worldId)s.views.delete(packet.worldId);result=true;break;}
    case 'describe':{check(federation.members.get(authenticated).views.has(packet.worldId),'No VIEW subscription');result=federation.describe(packet.worldId);break;}
    case 'read':{const s=federation.members.get(authenticated);check(s.views.has(packet.worldId),'No VIEW subscription');const world=federation.authorize(authenticated,packet.worldId,'view');check(Number.isSafeInteger(packet.offset)&&packet.offset>=0&&Number.isSafeInteger(packet.limit)&&packet.limit>0&&packet.limit<=MAX_FILE,'Invalid read');const data=await world.source.read(packet.path,packet.limit);check(packet.offset<=data.length,'Invalid offset');result={total:data.length,offset:packet.offset,bytes:data.subarray(packet.offset,packet.offset+65536).toString('base64')};break;}
    case 'accepted-state':result=federation.acceptedPose(authenticated,packet.state);break;
    case 'handoff':result=federation.issue(authenticated,packet.reservationId);break;
    case 'prepare':result=federation.prepare(authenticated,packet.portalId);break;
    case 'ready':result=federation.ready(authenticated,packet.reservationId,packet.contentDigest,packet.epoch);break;
    case 'commit':result=federation.commit(authenticated,packet.reservationId);broadcast();break;
    case 'status':result=federation.status(authenticated,packet.reservationId);break;
    case 'cancel':{const r=federation.reservations.get(packet.reservationId);check(r?.nodeId===authenticated,'Unknown reservation');if(r.state==='prepared')r.state='cancelled';result=federation.status(authenticated,packet.reservationId);break;}
    default:throw Error('Unknown request');
   }}finally{busy=false;}sendBounded(peer,JSON.stringify({type:'result',requestId:packet.requestId,result}));
  }catch(error){if(!authenticated){sendBounded(peer,JSON.stringify({type:'error',error:error.message}));peer.close(1008,'Authentication rejected');}else if(packet?.requestId)sendBounded(peer,JSON.stringify({type:'result',requestId:packet.requestId,error:error.message}));}});
  peer.once('close',()=>{clearTimeout(timeout);if(authenticated&&peers.get(authenticated)===peer){peers.delete(authenticated);federation.detach(authenticated);broadcast();}});
 });}catch{socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();}});
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok);});const updates=setInterval(broadcast,50),heartbeat=setInterval(()=>{federation.expire();for(const p of wss.clients){if(!p.alive){p.terminate();continue;}p.alive=false;p.ping();}},15000);updates.unref();heartbeat.unref();
 return {server,wss,federation,address:server.address(),close:async()=>{clearInterval(updates);clearInterval(heartbeat);for(const p of wss.clients)p.terminate();await new Promise(ok=>wss.close(ok));await new Promise(ok=>server.close(ok));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const config=JSON.parse(await readFile(process.env.ELSEMESH_WORLD_CONFIG,'utf8')),identity=await loadOrCreateIdentity(process.env.ELSEMESH_WORLD_IDENTITY);const result=await createRepositoryWorldServer({root:process.env.ELSEMESH_WORLD_STATIC??resolve('dist'),config,identity,port:Number(process.env.ELSEMESH_WORLD_PORT??5201),publicOrigin:process.env.ELSEMESH_PUBLIC_ORIGIN??null,production:process.env.NODE_ENV==='production'});console.log('Repository world coordinator listening on loopback port '+result.address.port);}
