import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes,randomUUID,verify} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {roomSecurity,sendBounded} from './RoomSecurity.mjs';
import {prepareRepositoryConfig} from './repository-world-server.mjs';
import {OwnerWorldAuthority,playerIdForNode} from '../../network/owner-world-authority.mjs';
import {createOwnerPeerRpc} from '../../network/owner-peer-rpc.mjs';
import {canonical,nodeId,signObject,verifyObject} from '../../network/identity.mjs';
import {validateAppearance} from '../../src/player/AvatarAppearance.js';
import {OwnerWorldWelcome} from '../../network/owner-world-welcome.mjs';
import {OwnerObjectAccess} from '../../network/owner-object-access.mjs';
import {loadWorldSource,portalLocalPoint} from '../../src/world-runtime/vendor/world-engine-contract.js';
const check=(v,m)=>{if(!v)throw Error(m);},MAX=128*1024*1024;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2'};
/** Local native owner facade: immutable local content and a single local authority. */
export async function createOwnerWorldRuntime({root,config,identity,host='127.0.0.1',port=5201,relayUrl='ws://127.0.0.1:18891',rpcFactory=createOwnerPeerRpc,relayRetryMs=250}={}){
 check(Number.isSafeInteger(relayRetryMs)&&relayRetryMs>=25&&relayRetryMs<=5000,'Invalid relay retry interval');
 check(config?.protocol==='elsemesh.owner-runtime/1'&&config.worlds?.length===1,'Exactly one owner world is required');
 check(config.contacts?.length>0&&config.contacts.length<=2,'One or two pinned owner contacts required');
 const security=roomSecurity({host,publicOrigin:null,production:false});root=await realpath(root);
 const prepared=await prepareRepositoryConfig(config,identity),world=prepared.worlds[0],contacts=new Map(config.contacts.map(c=>[c.worldId,c]));
 check(contacts.has(world.worldId)&&contacts.get(world.worldId).authorityNodeId===identity.nodeId,'Local contact authority mismatch');
 const sessions=new Map(),routes=new Map(),replay=new Map();let authority,rpc,objectAccess,worldWelcome;
 const descriptor=id=>{const c=contacts.get(id);check(c,'Unknown owner world');return c.descriptor;};
 const localDescriptor=descriptor(world.worldId);
 check(canonical(localDescriptor.binding)===canonical(world.binding)&&canonical(localDescriptor.published)===canonical(world.published)&&localDescriptor.contentDigest===world.contentDigest,'Local descriptor/content mismatch');
 for(const c of contacts.values()){check(c.descriptor.worldId===c.worldId&&c.descriptor.published.descriptor.authority.nodeId===c.authorityNodeId&&verifyObject(c.descriptor.published,new Set(config.trustedOwners))&&verifyObject(c.descriptor.binding,new Set(config.trustedOwners)),'Invalid pinned contact descriptor');}
 const browserReservation=t=>{const b=t.binding,d=[...contacts.values()].find(c=>c.descriptor.published.descriptor.worldId===b.destinationWorld)?.descriptor;check(d,'Original destination contact unavailable');return {id:b.transferId,nodeId:b.playerNodeId,state:t.status==='CANCELLED'?'cancelled':'prepared',sourceWorldId:world.worldId,destinationWorldId:d.worldId,sourceGeneration:b.generation,destinationSessionId:t.reservation?.destinationSessionId??null,contentDigest:d.contentDigest,epoch:d.epoch,ownerBinding:b,ownerTombstone:t.tombstone??null,ownerReservation:t.reservation??null,ownerReceipt:t.receipt??null,...(t.reservation?.spawn??b.motion),handoff:{handoffId:b.transferId,sessionId:b.sessionId,destinationAuthority:b.destinationAuthority},ready:!!t.handoff};};
 const session=node=>{let s=sessions.get(node);if(!s){s={nodeId:node,playerId:playerIdForNode(node),sessionId:'elsemesh-session:'+randomUUID(),generation:0,sequence:-1,worldId:world.worldId,grants:new Map(),transfers:new Map(),appearance:null};if(authority){const state=authority.ledger.snapshot(),member=state.members[s.playerId];if(member){s.sessionId=member.sessionId;s.motion=member.motion;s.sequence=member.sequence;s.generation=member.generation;}else{const outgoing=Object.values(state.transfers).filter(t=>t.role==='SOURCE'&&t.status==='DEPARTED'&&t.binding.playerNodeId===node).sort((a,b)=>(b.receipt.committedAt??0)-(a.receipt.committedAt??0))[0];if(outgoing){const destination=[...contacts.values()].find(c=>c.descriptor.published.descriptor.worldId===outgoing.binding.destinationWorld);check(destination,'Original remote membership contact missing');s.worldId=destination.worldId;s.sessionId=outgoing.reservation.destinationSessionId;s.motion=outgoing.reservation.spawn;s.sequence=outgoing.binding.sequence;s.generation=outgoing.binding.generation+1;}}}sessions.set(node,s);}return s;};
 const welcome=s=>{const m=authority?.ledger.snapshot().members[s.playerId];if(m){s.worldId=world.worldId;s.sessionId=m.sessionId;s.motion=m.motion;s.sequence=m.sequence;s.generation=m.generation;}return ({nodeId:s.nodeId,playerId:s.playerId,label:config.players?.[s.nodeId]?.label??'Owner visitor',worldId:s.worldId,sessionId:s.sessionId,generation:s.generation,nextSequence:s.sequence+1,position:s.motion?.position??world.spawn,velocity:s.motion?.velocity??[0,0,0],yaw:s.motion?.yaw??0,world:descriptor(s.worldId),pendingTransfer:(()=>{const t=Object.values(authority.ledger.snapshot().transfers).find(t=>t.role==='SOURCE'&&t.binding.playerNodeId===s.nodeId&&['PREPARING','FENCED','ISSUED'].includes(t.status));return t?browserReservation(t):null;})()});};
 const readWorld=async({path,offset,limit})=>{check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>0&&limit<=MAX,'Invalid content read');const bytes=await world.source.read(path,limit);check(offset<=bytes.length,'Invalid offset');return {total:bytes.length,offset,bytes:bytes.subarray(offset,offset+65536).toString('base64')};};
 const route=async(target,envelope)=>{if(target===world.worldId)return receive(envelope);const node=contacts.get(target)?.authorityNodeId;authority.peer(node);return rpc.request(node,'owner-browser',envelope);};
 const invoke=(op,data)=>authority.dispatch(op,data);
 const verifyEnvelope=envelope=>{check(envelope?.protocol==='elsemesh.owner-browser-request/1'&&typeof envelope.requestId==='string'&&envelope.requestId.length<256&&Number.isSafeInteger(envelope.issuedAt)&&Math.abs(Date.now()-envelope.issuedAt)<30000&&verifyObject(envelope,new Set([envelope.signer])),'Invalid browser operation signature');for(const [id,at]of replay)if(at<Date.now()-30000)replay.delete(id);check(!replay.has(envelope.requestId)&&replay.size<10000,'Browser operation replay');replay.set(envelope.requestId,Date.now());check(config.players?.[envelope.signer],'Player is not enrolled');return session(envelope.signer);};
 async function receive(envelope){
  const s=verifyEnvelope(envelope),p=envelope.payload??{},op=envelope.operation;
  if(op==='owner-challenge'){check(p.worldId===world.worldId,'Wrong challenge owner');return invoke('challenge',{playerId:s.playerId,playerNodeId:s.nodeId,action:p.action,sessionId:p.sessionId??s.sessionId,portalId:p.portalId??null});}
  if(op==='subscribe'){check(p.worldId===world.worldId&&p.proof?.signer===s.nodeId,'Wrong VIEW subject');const grant=await invoke('subscribe',{proof:p.proof});s.grants.set(world.worldId,grant);s.sessionId=grant.sessionId;const member=authority.state({grantId:grant.grantId});if(member){s.worldId=world.worldId;s.motion=member.motion;s.generation=member.generation;s.sequence=member.sequence;s.sessionId=member.sessionId;}return {...localDescriptor,viewExpiresAt:grant.expiresAt};}
  const grant=s.grants.get(world.worldId);
  if(op.startsWith('world-welcome-'))return worldWelcome.handle(envelope,s,grant);
  if(op.startsWith('object-'))return objectAccess.handle(envelope,s,grant);
  if(op==='owner-enter-local'){
   check(s.worldId===world.worldId,'Player membership belongs to a remote owner; recover original transfer');
   check(p.proof?.signer===s.nodeId,'Wrong ENTER subject');const existing=grant&&authority.state({grantId:grant.grantId,playerId:s.playerId});
   if(existing){await authority.ledger.transact(state=>{const proof=authority.consumeProof(state,p.proof,'ENTER');check(proof.playerId===s.playerId&&proof.sessionId===existing.sessionId&&!proof.portalId,'Existing membership proof mismatch');return null;});check(existing.status==='ACTIVE','Local membership is frozen; recover transfer');s.sessionId=existing.sessionId;s.motion=existing.motion;return welcome(s);}
   const member=await invoke('enter-local',{proof:p.proof,motion:{position:world.spawn,velocity:[0,0,0],yaw:0,pitch:0}});s.sessionId=member.sessionId;s.motion=member.motion;s.sequence=member.sequence;s.generation=member.generation;return welcome(s);
  }
  if(['owner-pending','ready','handoff','commit','status','cancel'].includes(op)){
  let r=s.transfers.get(p.reservationId);
  if(!r){let t=authority.ledger.snapshot().transfers[p.reservationId];if(t?.role==='SOURCE'&&t.binding.playerNodeId===s.nodeId&&t.status==='PREPARING'&&op==='owner-pending'){await authority.recoverPrepare({transferId:p.reservationId,playerId:s.playerId});t=authority.ledger.snapshot().transfers[p.reservationId];}check(t?.role==='SOURCE'&&t.binding.playerNodeId===s.nodeId&&t.binding.playerId===s.playerId,'Unknown original owner reservation');const b=t.binding;r=browserReservation(t);s.transfers.set(r.id,r);s.sequence=b.sequence;s.generation=b.generation;s.sessionId=b.sessionId;s.motion=b.motion;}
  check(r.nodeId===s.nodeId,'Transfer subject mismatch');if(op==='owner-pending')return r;
  if(op==='ready'){check(p.contentDigest===r.contentDigest&&p.epoch===r.epoch,'Readiness content mismatch');r.ready=true;return r;}
  if(op==='handoff'){check(r.ready,'Destination graphics are not ready');r.ownerReceipt=await invoke('handoff',{transferId:r.id});r.state='committed';return r;}
  if(op==='commit'||op==='status'||op==='cancel'){
   const record=op==='commit'?r.ownerReceipt:await invoke(op,{transferId:r.id});
   if(record?.kind==='owner-world-commit-receipt'){check(verifyObject(record,new Set([contacts.get(r.destinationWorldId).authorityNodeId]))&&record.transferId===r.id,'Invalid destination receipt');r.ownerReceipt=record;r.state='committed';r.generation=r.sourceGeneration+1;if(!r.presentation){try{r.presentation=await rpc.request(contacts.get(r.destinationWorldId).authorityNodeId,'owner-presentation',{transferId:r.id,sourceWorldId:r.sourceWorldId,destinationWorldId:r.destinationWorldId,generation:r.generation});}catch{}}r.nextSequence=s.sequence+1;s.worldId=r.destinationWorldId;s.generation=r.generation;s.sessionId=r.destinationSessionId;s.motion={position:r.position,velocity:r.velocity,yaw:r.yaw,pitch:r.pitch??0};}
   else if(record?.kind==='owner-world-cancel-tombstone'){check(verifyObject(record,new Set([contacts.get(r.destinationWorldId).authorityNodeId])),'Invalid cancellation proof');r.state='cancelled';r.ownerTombstone=record;r.ownerBinding=authority.ledger.snapshot().transfers[r.id].binding;}
   return r;
  }
  }
  check(grant,'Destination VIEW authentication is required');authority.grant(grant.grantId);
  if(op==='read')return invoke('read',{grantId:grant.grantId,request:p});
  if(op==='describe')return localDescriptor;
  if(op==='presence'){const snapshot=authority.ledger.snapshot();return {worldId:world.worldId,players:[...sessions.values()].filter(x=>x.motion&&snapshot.members[x.playerId]?.status==='ACTIVE').map(x=>{const t=Object.values(snapshot.transfers).find(t=>t.role==='DESTINATION'&&t.status==='COMMITTED'&&t.binding.playerId===x.playerId&&t.reservation.destinationSessionId===x.sessionId),committedAt=t?.receipt.committedAt,source=t&&[...contacts.values()].find(c=>c.descriptor.published.descriptor.worldId===t.binding.sourceWorld);const presentation=source&&Number.isSafeInteger(committedAt)&&Date.now()<committedAt+3000?signObject({protocol:'elsemesh.portal-presentation/1',type:'portal-arrival',transferId:t.binding.transferId,playerNodeId:x.nodeId,playerId:x.playerId,sourceWorldId:source.worldId,destinationWorldId:world.worldId,destinationGeneration:x.generation,authorityEpoch:localDescriptor.epoch,committedAt,expiresAt:committedAt+3000},identity):undefined;return {nodeId:x.nodeId,playerId:x.playerId,generation:x.generation,sequence:x.sequence,timestamp:Date.now(),...x.motion,appearance:x.appearance,...presentation?{presentation}:{}};})};}
  if(op==='unsubscribe'){s.grants.delete(world.worldId);return true;}
  if(op==='state'||op==='accepted-state'){
   const state=p.state??p;check(state.worldId===world.worldId&&Number.isSafeInteger(state.sequence)&&state.sequence>s.sequence,'State sequence/world mismatch');check(state.generation===s.generation,'State generation mismatch');validateAppearance(state.appearance);const motion={position:state.position,velocity:state.velocity,yaw:state.yaw,pitch:0};
   const accepted=await authority.acceptedState({grantId:grant.grantId,playerId:s.playerId,sessionId:s.sessionId,motion,sequence:state.sequence,generation:state.generation},{allowCollisionCorrection:op==='state'});
   if(accepted.corrected){
    const member=accepted.member,issuedAt=Date.now();
    return signObject({protocol:'elsemesh.world-wss/2',type:'pose-corrected',reason:'movement-clearance',requestId:envelope.requestId,authorityEpoch:localDescriptor.epoch,playerNodeId:s.nodeId,authoredWorldId:world.worldId,sessionId:member.sessionId,generation:member.generation,rejectedSequence:accepted.rejectedSequence,acceptedSequence:member.sequence,position:[...member.motion.position],velocity:[0,0,0],yaw:member.motion.yaw??0,issuedAt,expiresAt:issuedAt+5000},identity);
   }
   s.motion=motion;s.sequence=state.sequence;s.appearance=state.appearance;
   return signObject({protocol:'elsemesh.world-wss/2',type:'pose-accepted',playerNodeId:s.nodeId,authoredWorldId:world.worldId,sessionId:s.sessionId,generation:s.generation,sequence:s.sequence,...motion,appearance:state.appearance,portalCrossings:world.portals.filter(p=>p.enabled&&(()=>{const q=portalLocalPoint(p,motion.position);return Math.abs(q[2])<1&&Math.abs(q[0])<p.width/2&&q[1]>-p.height/2-.1&&q[1]+1.8<p.height/2+.1;})()).map(p=>p.id)},identity);
  }
  if(op==='owner-portal-target'){const portal=world.portals.find(x=>x.id===p.portalId);check(portal?.enabled,'Portal unavailable');return {worldId:portal.destination.worldId};}
  if(op==='prepare'){
   check(p.proof?.signer===s.nodeId,'Wrong transfer subject');const portal=world.portals.find(x=>x.id===p.portalId);check(portal?.enabled&&s.motion&&(()=>{const q=portalLocalPoint(portal,s.motion.position);return Math.abs(q[2])<1&&Math.abs(q[0])<portal.width/2&&q[1]>-portal.height/2-.1&&q[1]+1.8<portal.height/2+.1;})(),'Portal crossing was not accepted');
   const value=await invoke('prepare',{transferId:p.transferId,portalId:p.portalId,proof:p.proof,motion:s.motion,avatarAssetId:config.avatarAssetId,inventoryHash:config.inventoryHash,sequence:s.sequence,grantId:grant.grantId}),d=descriptor(portal.destination.worldId);
   const r=browserReservation(authority.ledger.snapshot().transfers[value.transferId]);
   s.transfers.set(r.id,r);return r;
  }
  throw Error('Unknown browser operation');
 }
 rpc=rpcFactory({identity,contacts:config.contacts.filter(c=>c.authorityNodeId!==identity.nodeId).map(c=>({nodeId:c.authorityNodeId,publicKeyPem:c.publicKeyPem})),relayUrl,handler:({callerNodeId,operation,payload})=>{authority.peer(callerNodeId);if(operation==='owner-browser')return receive(payload);if(operation==='owner-presentation'){const t=authority.ledger.snapshot().transfers[payload.transferId];check(t?.role==='DESTINATION'&&t.status==='COMMITTED'&&t.binding.sourceAuthority===callerNodeId&&contacts.get(payload.sourceWorldId)?.authorityNodeId===callerNodeId&&payload.destinationWorldId===world.worldId&&payload.generation===t.binding.generation+1,'Arrival presentation transfer mismatch');const committedAt=t.receipt.committedAt??Date.now();return signObject({protocol:'elsemesh.portal-presentation/1',type:'portal-arrival',transferId:payload.transferId,playerNodeId:t.binding.playerNodeId,playerId:t.binding.playerId,sourceWorldId:payload.sourceWorldId,destinationWorldId:world.worldId,destinationGeneration:payload.generation,authorityEpoch:localDescriptor.epoch,committedAt,expiresAt:committedAt+3000},identity);}return authority.dispatch(operation,payload,{callerNodeId});}});
 authority=await OwnerWorldAuthority.open({identity,published:world.published,delegation:world.delegation,trustedOwners:new Set(config.trustedOwners),peers:config.peers,ledgerPath:config.ledgerPath,policy:config.policy,readWorld,clearance:({spawn,reservations,members})=>world.clearance(spawn.position)&&![...members.map(m=>m.motion),...reservations.map(t=>t.reservation?.spawn)].filter(Boolean).some(m=>Math.hypot(m.position[0]-spawn.position[0],m.position[2]-spawn.position[2])<.65&&Math.abs(m.position[1]-spawn.position[1])<1.8),rpc:(node,...args)=>{authority.peer(node);return rpc.request(node,...args);}});
 try{const project=(await loadWorldSource(world.source)).project;worldWelcome=new OwnerWorldWelcome({project,world,identity,authority});objectAccess=new OwnerObjectAccess({project,world,identity,authority,players:config.players??{},adminDelegations:config.objectAdminDelegations??[]});}catch(error){await authority.close();await rpc.close();throw error;}
 const wss=new WebSocketServer({noServer:true,maxPayload:192*1024,perMessageDeflate:false});
 const runtimeConfig={protocol:'elsemesh.owner-runtime/1',endpoint:'/__worlds',defaultWorldId:world.worldId,worldIds:[...contacts.keys()],worlds:[...contacts.values()].map(c=>({worldId:c.worldId,name:c.descriptor.name??c.worldId,contentDigest:c.descriptor.contentDigest})),serverNodeId:identity.nodeId,trustedOwners:config.trustedOwners,trustedAuthorities:[...contacts.values()].map(c=>c.authorityNodeId),contacts:[...contacts.values()].map(c=>({worldId:c.worldId,authorityNodeId:c.authorityNodeId,authorityWorldId:c.descriptor.published.descriptor.worldId}))};
 const server=createServer(async(req,res)=>{try{
  check(req.headers.host==='127.0.0.1:'+server.address().port||req.headers.host==='[::1]:'+server.address().port,'Host denied');check(['GET','HEAD'].includes(req.method),'Method denied');const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/runtime-config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:JSON.stringify(runtimeConfig));return;}
  const path=decodeURIComponent(url.pathname==='/'?'/worlds.html':url.pathname);check(!path.includes('\\'),'Path denied');const file=await realpath(resolve(root,'.'+path)),rel=relative(root,file);check(rel&&!rel.startsWith('..')&&!rel.includes(':')&&!rel.split(/[\\/]/).some(x=>x.startsWith('.')),'Path denied');const info=await stat(file);check(info.isFile()&&info.size<MAX,'Invalid static file');res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'self'; object-src 'none'"});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch{res.writeHead(404).end();}});
 server.on('upgrade',(req,socket,head)=>{if(req.url!=='/__worlds'||!security.accept(req,server.address().port)){socket.destroy();return;}wss.handleUpgrade(req,socket,head,peer=>{
  let subject=null,authenticating=false,queuedRequests=0;const targetLanes=new Map();const challenge={protocol:'elsemesh.repository-auth/1',nonce:randomBytes(32).toString('hex'),expiresAt:Date.now()+10000,path:'/__worlds'};sendBounded(peer,JSON.stringify({type:'challenge',challenge}));const timer=setTimeout(()=>peer.close(1008,'Authentication timeout'),10000);timer.unref();
  peer.on('message',async bytes=>{let p,targetKey,workLane;try{p=JSON.parse(bytes.toString());if(!subject){check(!authenticating,'Authentication already pending');authenticating=true;check(p.type==='authenticate'&&Date.now()<challenge.expiresAt&&typeof p.publicKey==='string'&&p.publicKey.length<2000&&verify(null,Buffer.from(canonical(challenge)),p.publicKey,Buffer.from(p.signature,'base64')),'Browser identity rejected');const candidate=nodeId(p.publicKey);if(!config.players?.[candidate]){sendBounded(peer,JSON.stringify({type:'pending',nodeId:candidate}));peer.close(1008,'Pending owner enrolment');return;}subject=candidate;clearTimeout(timer);sendBounded(peer,JSON.stringify({type:'welcome',...welcome(session(subject))}));return;}
   check(p.type==='owner-envelope'&&p.envelope?.signer===subject,'Signed owner request required');const e=p.envelope,s=session(subject),target=e.payload?.reservationId?(e.payload.sourceWorldId??routes.get(e.payload.reservationId)??s.worldId):(e.operation==='owner-challenge'||['subscribe','describe','read','unsubscribe','presence','object-overlay-read'].includes(e.operation)?e.payload.worldId:s.worldId);
   check(contacts.has(target),'Unknown owner world');
   let lane=targetLanes.get(target);if(!lane){lane={tail:Promise.resolve(),queued:0};targetLanes.set(target,lane);}
   // A browser may time out before an older peer operation finishes. Queue its
   // next signed request without overlapping mutations or consuming local slots.
   check(queuedRequests<8&&lane.queued<4,'Owner request queue limit');
   targetKey=target;workLane=lane;queuedRequests++;lane.queued++;
   const execute=()=>{check(peer.readyState===1,'Browser disconnected');return route(target,e);};
   const resultPromise=lane.tail.then(execute,execute);lane.tail=resultPromise.catch(()=>{});
   const result=await resultPromise;if(e.operation==='prepare'&&result?.id)routes.set(result.id,target);if(['commit','status','cancel'].includes(e.operation)&&result?.state==='committed'){s.worldId=result.destinationWorldId;s.generation=result.generation;s.sessionId=result.destinationSessionId;s.motion={position:result.position,velocity:result.velocity,yaw:result.yaw};}
   sendBounded(peer,JSON.stringify({type:'result',requestId:p.requestId,result}));
  }catch(error){sendBounded(peer,JSON.stringify({type:subject?'result':'error',requestId:p?.requestId,error:error.message}));if(!subject)peer.close(1008,'Authentication rejected');}finally{if(workLane){queuedRequests--;workLane.queued--;if(!workLane.queued&&targetLanes.get(targetKey)===workLane)targetLanes.delete(targetKey);}authenticating=false;}});
  peer.on('error',()=>peer.terminate());peer.once('close',()=>clearTimeout(timer));
 });});
 let relayTimer,relayClosing=false,relayConnecting=false,relayConnected=false,retryDelay=relayRetryMs;
 const connectRelay=async()=>{
  if(relayClosing||relayConnecting)return;
  relayConnecting=true;
  try{if(!(rpc.status?.().connected??relayConnected)){await rpc.start();relayConnected=true;}retryDelay=relayRetryMs;}
  catch{relayConnected=false;}
  finally{relayConnecting=false;if(!relayClosing){const online=rpc.status?.().connected??relayConnected;relayTimer=setTimeout(connectRelay,online?Math.max(250,relayRetryMs):retryDelay);relayTimer.unref?.();if(!online)retryDelay=Math.min(5000,retryDelay*2);}}
 };
 try{await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok);});}catch(e){relayClosing=true;await authority.close();await rpc.close();throw e;}
 // Local authority and immutable content are usable without the optional relay.
 void connectRelay();
 return {server,wss,authority,rpc,address:server.address(),config:runtimeConfig,close:async()=>{relayClosing=true;clearTimeout(relayTimer);for(const p of wss.clients)p.terminate();await new Promise(ok=>wss.close(ok));await new Promise(ok=>server.close(ok));await rpc.close();await authority.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const config=JSON.parse(await readFile(process.env.ELSEMESH_OWNER_CONFIG,'utf8'));
 // Provisioning creates keys on the owner machine before this executable starts.
 const identity=JSON.parse(await readFile(process.env.ELSEMESH_OWNER_IDENTITY,'utf8'));
 const runtime=await createOwnerWorldRuntime({root:process.env.ELSEMESH_OWNER_STATIC??resolve('dist'),config,identity,port:Number(process.env.ELSEMESH_OWNER_PORT??5201),relayUrl:process.env.ELSEMESH_OWNER_RELAY??'ws://127.0.0.1:18891'});console.log('Local owner runtime listening on loopback '+runtime.address.port);
}
