import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer,WebSocket } from 'ws';
import { verifyObject } from '../../network/identity.mjs';
import { MAX_WIRE_BYTES } from '../../network/owner-peer-rpc.mjs';

// A networking registry only: no worlds, policies, owner keys or game membership.
export async function createOwnerPeerRelay({host='127.0.0.1',port=18891,maxPeers=2,onFrame}={}) {
 if(!['127.0.0.1','::1','localhost'].includes(host)||!Number.isInteger(maxPeers)||maxPeers<1||maxPeers>2)throw new Error('Invalid loopback relay configuration');
 const peers=new Map(),sockets=new Set();
 const server=new WebSocketServer({host,port,maxPayload:MAX_WIRE_BYTES,perMessageDeflate:false,verifyClient:({req})=>!req.headers.origin});
 server.on('connection',socket=>{
  if(sockets.size>=maxPeers){socket.close(1008,'Connection limit');return;}
  sockets.add(socket);let identity;
  const nonce=randomBytes(32).toString('hex');
  const timer=setTimeout(()=>socket.close(1008,'Registration timeout'),5000);
  socket.send(JSON.stringify({kind:'challenge',nonce}));
  socket.on('message',data=>{
   try{
    if(data.length>MAX_WIRE_BYTES)throw new Error();
    const m=JSON.parse(data.toString());
    if(!identity){
     const p=m.proof;
     if(m.kind!=='register'||!p||p.protocol!=='elsemesh.owner-peer/1'||p.kind!=='relay-registration'||p.nonce!==nonce||p.nodeId!==p.signer||!verifyObject(p,new Set([p.signer]))||peers.has(p.nodeId))throw new Error();
     identity=p.nodeId;peers.set(identity,socket);clearTimeout(timer);socket.send(JSON.stringify({kind:'registered',nodeId:identity}));return;
    }
    if(m.kind!=='route'||typeof m.to!=='string'||!m.packet||m.packet.from!==identity||m.packet.to!==m.to||!['hello','hello-response','sealed'].includes(m.packet.kind))throw new Error();
    onFrame?.(m.packet);
    const target=peers.get(m.to);
    if(!target){socket.send(JSON.stringify({kind:'peer-offline',nodeId:m.to}));return;}
    if(target.readyState!==WebSocket.OPEN||target.bufferedAmount>MAX_WIRE_BYTES*4)throw new Error();
    const frame=JSON.stringify({kind:'packet',packet:m.packet});if(Buffer.byteLength(frame)>MAX_WIRE_BYTES)throw new Error();
    target.send(frame);
   }catch{socket.close(1008,'Invalid relay frame');}
  });
  socket.on('error',()=>{});
  socket.on('close',()=>{clearTimeout(timer);sockets.delete(socket);if(identity&&peers.get(identity)===socket){peers.delete(identity);for(const other of peers.values())if(other.readyState===WebSocket.OPEN)other.send(JSON.stringify({kind:'peer-offline',nodeId:identity}));}});
 });
 await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 return{address:server.address(),status:()=>({role:'non-authoritative-byte-relay',registeredPeers:peers.size,route:'relayed'}),async close(){for(const socket of sockets)socket.terminate();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const relay=await createOwnerPeerRelay();console.log(JSON.stringify({role:'non-authoritative-byte-relay',address:relay.address,route:'relayed'}));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>relay.close().then(()=>process.exit(0)));
}
