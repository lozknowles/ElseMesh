import { generateKeyPairSync, createPublicKey, diffieHellman, hkdfSync, randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { WebSocket } from 'ws';
import { canonical,nodeId,signObject,verifyObject } from './identity.mjs';
export const MAX_CHUNK_BYTES=64*1024, MAX_RPC_BYTES=192*1024, MAX_WIRE_BYTES=384*1024;
const PROTOCOL='elsemesh.owner-peer/1', LIMIT=32;
const size=x=>Buffer.byteLength(JSON.stringify(x));
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const error=x=>new Error(x);
const wait=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{resolve,reject,promise};};
const ephemeral=()=>{const p=generateKeyPairSync('x25519');return{privateKey:p.privateKey,publicKey:p.publicKey.export({type:'spki',format:'der'}).toString('base64')};};
function derive(identity,peer,eph,first,second) {
 const remote=identity.nodeId===first.from?second:first;
 const publicKey=createPublicKey({key:Buffer.from(remote.ephemeral,'base64'),type:'spki',format:'der'});
 if(publicKey.asymmetricKeyType!=='x25519')throw error('Invalid ephemeral key');
 const id=hash({first,second}),secret=diffieHellman({privateKey:eph.privateKey,publicKey});
 const material=Buffer.from(hkdfSync('sha256',secret,Buffer.from(id,'hex'),Buffer.from(PROTOCOL),64));
 const a=identity.nodeId===first.from;
 return{id,peer,txKey:material.subarray(a?0:32,a?32:64),rxKey:material.subarray(a?32:0,a?64:32),tx:0,rx:0};
}
const iv=n=>{const b=Buffer.alloc(12);b.writeBigUInt64BE(BigInt(n),4);return b;};
export function sealPeerPacket(session,from,to,message) {
 if(size(message)>MAX_RPC_BYTES)throw error('RPC payload exceeds limit');
 const counter=++session.tx;if(!Number.isSafeInteger(counter))throw error('Session exhausted');
 const aad={protocol:PROTOCOL,from,to,session:session.id,counter};
 const cipher=createCipheriv('aes-256-gcm',session.txKey,iv(counter));cipher.setAAD(Buffer.from(canonical(aad)));
 return{...aad,kind:'sealed',ciphertext:Buffer.concat([cipher.update(JSON.stringify(message)),cipher.final()]).toString('base64'),tag:cipher.getAuthTag().toString('base64')};
}
export function openPeerPacket(session,packet,from,to) {
 if(packet.protocol!==PROTOCOL||packet.from!==from||packet.to!==to||packet.session!==session.id||packet.counter!==session.rx+1)throw error('Invalid session or replay counter');
 if(typeof packet.ciphertext!=='string'||typeof packet.tag!=='string'||size(packet)>MAX_WIRE_BYTES)throw error('Invalid sealed frame');
 const aad={protocol:PROTOCOL,from,to,session:session.id,counter:packet.counter};
 const decipher=createDecipheriv('aes-256-gcm',session.rxKey,iv(packet.counter));decipher.setAAD(Buffer.from(canonical(aad)));decipher.setAuthTag(Buffer.from(packet.tag,'base64'));
 const clear=Buffer.concat([decipher.update(Buffer.from(packet.ciphertext,'base64')),decipher.final()]);
 if(clear.length>MAX_RPC_BYTES)throw error('RPC payload exceeds limit');
 const message=JSON.parse(clear.toString());session.rx=packet.counter;return message;
}
export function createOwnerPeerRpc({identity,contacts=[],relayUrl='ws://127.0.0.1:18891',handler,timeoutMs=10000}={}) {
 if(!identity||nodeId(identity.publicKeyPem)!==identity.nodeId||contacts.length>2)throw error('Invalid owner peer configuration');
 const trusted=new Map();
 for(const c of contacts){if(!c||nodeId(c.publicKeyPem)!==c.nodeId||c.nodeId===identity.nodeId||trusted.has(c.nodeId))throw error('Invalid trusted contact');trusted.set(c.nodeId,c.publicKeyPem);}
 const url=new URL(relayUrl);
 if(url.protocol!=='ws:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw error('Relay requires local encrypted SSH forward');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)throw error('Invalid RPC timeout');
 let ws,registered=false,startWait,closed=false,active=0,generation=0;
 const sessions=new Map(),handshakes=new Map(),pending=new Map(),seen=new Set();
 function send(packet){if(!registered||ws?.readyState!==WebSocket.OPEN)throw error('Relay disconnected');if(size(packet)>MAX_WIRE_BYTES||ws.bufferedAmount>MAX_WIRE_BYTES*4)throw error('Peer queue limit');ws.send(JSON.stringify({kind:'route',to:packet.to,packet}));}
 function rejectPeer(peer,reason){sessions.delete(peer);const h=handshakes.get(peer);if(h){clearTimeout(h.timer);h.reject(reason);handshakes.delete(peer);}for(const[id,p]of pending)if(p.peer===peer){clearTimeout(p.timer);p.reject(reason);pending.delete(id);}}
 function disconnect(reason=error('Relay disconnected')){registered=false;const attempt=startWait;startWait=null;attempt?.reject(reason);for(const p of trusted.keys())rejectPeer(p,error('Peer disconnected'));}
 function valid(p,peer){return p.protocol===PROTOCOL&&p.to===identity.nodeId&&p.from===peer&&p.signer===peer&&p.publicKey===trusted.get(peer)&&verifyObject(p,new Set([peer]));}
 async function receive(p,epoch){
  if(epoch!==generation||closed||!registered)return;
  if(!p||size(p)>MAX_WIRE_BYTES||!trusted.has(p.from)||p.to!==identity.nodeId)throw error('Untrusted peer frame');
  const peer=p.from;
  if(p.kind==='hello'){
   if(!valid(p,peer)||typeof p.nonce!=='string'||!/^[0-9a-f]{64}$/.test(p.nonce)||typeof p.ephemeral!=='string'||p.ephemeral.length>128)throw error('Invalid peer handshake');
   const replay=peer+':'+p.nonce;if(seen.has(replay))throw error('Replayed handshake');seen.add(replay);if(seen.size>1024)seen.delete(seen.values().next().value);
   if(handshakes.has(peer)&&identity.nodeId<peer)return;
   const eph=ephemeral(),response=signObject({protocol:PROTOCOL,kind:'hello-response',from:identity.nodeId,to:peer,nonce:randomBytes(32).toString('hex'),ephemeral:eph.publicKey,helloHash:hash(p)},identity);
   sessions.set(peer,derive(identity,peer,eph,p,response));send(response);return;
  }
  if(p.kind==='hello-response'){
   const h=handshakes.get(peer);
   if(!h||!valid(p,peer)||p.helloHash!==hash(h.hello)||typeof p.nonce!=='string'||!/^[0-9a-f]{64}$/.test(p.nonce)||typeof p.ephemeral!=='string'||p.ephemeral.length>128)throw error('Invalid handshake response');
   const s=derive(identity,peer,h.eph,h.hello,p);sessions.set(peer,s);send(sealPeerPacket(s,identity.nodeId,peer,{kind:'confirm'}));clearTimeout(h.timer);handshakes.delete(peer);h.resolve(s);return;
  }
  if(p.kind!=='sealed'||!sessions.has(peer))throw error('Unauthenticated peer frame');
  const s=sessions.get(peer),m=openPeerPacket(s,p,peer,identity.nodeId),h=handshakes.get(peer);
  if(h){clearTimeout(h.timer);handshakes.delete(peer);h.resolve(s);}
  if(m.kind==='confirm')return;
  if(typeof m.id!=='string'||!/^[0-9a-f-]{36}$/.test(m.id))throw error('Invalid RPC identity');
  if(m.kind==='response'){const q=pending.get(m.id);if(!q||q.peer!==peer)return;clearTimeout(q.timer);pending.delete(m.id);m.ok===true?q.resolve(m.result):q.reject(error('Remote request rejected'));return;}
  if(m.kind!=='request'||typeof m.operation!=='string'||!m.operation.length||m.operation.length>128)throw error('Invalid RPC request');
  let response={kind:'response',id:m.id,ok:false};
  if(active<LIMIT&&typeof handler==='function'){active++;try{const result=await handler({callerNodeId:peer,operation:m.operation,payload:m.payload});const candidate={kind:'response',id:m.id,ok:true,result:result??null};if(size(candidate)<=MAX_RPC_BYTES)response=candidate;}catch{}finally{active--;}}
  if(epoch===generation&&registered&&sessions.get(peer)===s)send(sealPeerPacket(s,identity.nodeId,peer,response));
 }
 async function ensure(peer){
  if(!trusted.has(peer))throw error('Untrusted peer');
  if(sessions.has(peer))return sessions.get(peer);
  if(handshakes.has(peer))return handshakes.get(peer).promise;
  const d=wait(),eph=ephemeral(),hello=signObject({protocol:PROTOCOL,kind:'hello',from:identity.nodeId,to:peer,nonce:randomBytes(32).toString('hex'),ephemeral:eph.publicKey},identity);
  const h={...d,eph,hello,timer:setTimeout(()=>rejectPeer(peer,error('Peer handshake timed out')),timeoutMs)};handshakes.set(peer,h);
  try{send(hello);}catch(e){rejectPeer(peer,e);}return d.promise;
 }
 return{
  async start(){
   if(closed)throw error('Transport closed');
   if(registered&&ws?.readyState===WebSocket.OPEN)return;
   if(startWait)return startWait.promise;
   const attempt=wait();startWait=attempt;
   const epoch=++generation,socket=new WebSocket(relayUrl,{maxPayload:MAX_WIRE_BYTES});ws=socket;
   const current=()=>ws===socket&&generation===epoch&&!closed;
   const finish=reason=>{if(!current())return;clearTimeout(timer);ws=null;generation++;disconnect(reason);if(socket.readyState!==WebSocket.CLOSED)socket.terminate();};
   const timer=setTimeout(()=>finish(error('Relay registration timed out')),timeoutMs);
   socket.on('message',data=>{if(!current())return;try{if(data.length>MAX_WIRE_BYTES)throw error('Frame limit');const m=JSON.parse(data.toString());
    if(m.kind==='challenge'&&!registered){if(typeof m.nonce!=='string'||!/^[0-9a-f]{64}$/.test(m.nonce))throw error('Invalid challenge');socket.send(JSON.stringify({kind:'register',proof:signObject({protocol:PROTOCOL,kind:'relay-registration',nonce:m.nonce,nodeId:identity.nodeId},identity)}));return;}
    if(m.kind==='registered'&&m.nodeId===identity.nodeId){registered=true;clearTimeout(timer);startWait=null;attempt.resolve();return;}
    if(m.kind==='peer-offline'&&trusted.has(m.nodeId)){rejectPeer(m.nodeId,error('Peer disconnected'));return;}
    if(m.kind==='packet'&&registered)receive(m.packet,epoch).catch(()=>{if(current())rejectPeer(m.packet?.from,error('Peer protocol rejected'));});
   }catch{finish(error('Relay protocol rejected'));}});
   socket.on('error',()=>finish(error('Relay disconnected')));socket.on('close',()=>finish(error('Relay disconnected')));
   return attempt.promise;
  },
  async request(peer,operation,payload){
   if(pending.size>=LIMIT)throw error('RPC pending limit');if(typeof operation!=='string'||!operation.length||operation.length>128)throw error('Invalid RPC operation');
   const id=randomUUID(),message={kind:'request',id,operation,payload:payload??null};if(size(message)>MAX_RPC_BYTES)throw error('RPC payload exceeds limit');
   const s=await ensure(peer);if(pending.size>=LIMIT)throw error('RPC pending limit');const d=wait(),timer=setTimeout(()=>{pending.delete(id);d.reject(error('Peer request timed out'));},timeoutMs);pending.set(id,{...d,timer,peer});
   try{send(sealPeerPacket(s,identity.nodeId,peer,message));}catch(e){clearTimeout(timer);pending.delete(id);d.reject(e);}return d.promise;
  },
  async close(){closed=true;generation++;const socket=ws;ws=null;disconnect();if(socket&&socket.readyState!==WebSocket.CLOSED)await new Promise(resolve=>{socket.once('close',resolve);socket.terminate();});},
  status(){return{nodeId:identity.nodeId,connected:registered,connecting:!!startWait,generation,route:'relayed',authenticatedPeers:[...sessions.keys()]};}
 };
}
