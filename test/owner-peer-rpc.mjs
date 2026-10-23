import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { newIdentity } from '../network/identity.mjs';
import { createOwnerPeerRpc,sealPeerPacket,openPeerPacket,MAX_RPC_BYTES,MAX_CHUNK_BYTES } from '../network/owner-peer-rpc.mjs';
import { createOwnerPeerRelay } from '../tools/networking/owner-peer-relay.mjs';

async function fixture(t,{onFrame,handler}={}){
 const a=newIdentity(),b=newIdentity(),frames=[];
 const relay=await createOwnerPeerRelay({port:0,onFrame:p=>{frames.push(JSON.parse(JSON.stringify(p)));onFrame?.(p);}});
 const relayUrl='ws://127.0.0.1:'+relay.address.port;
 const left=createOwnerPeerRpc({identity:a,contacts:[b],relayUrl,timeoutMs:300,handler:async x=>x});
 const right=createOwnerPeerRpc({identity:b,contacts:[a],relayUrl,timeoutMs:300,handler:handler??(async x=>x)});
 t.after(async()=>{await Promise.all([left.close(),right.close()]);await relay.close();});
 await Promise.all([left.start(),right.start()]);
 return{a,b,left,right,relay,frames};
}
test('mutual authentication carries caller identity; relay has no private payload',async t=>{
 const f=await fixture(t),secret='private-owner-world-content-'+randomBytes(20).toString('hex');
 const result=await f.left.request(f.b.nodeId,'read-file',{secret,chunk:Buffer.alloc(MAX_CHUNK_BYTES,7).toString('base64')});
 assert.equal(result.callerNodeId,f.a.nodeId);assert.equal(result.payload.secret,secret);
 assert.equal(JSON.stringify(f.frames).includes(secret),false);
 assert.equal(JSON.stringify(f.frames).includes('read-file'),false);
 assert.equal(f.left.status().route,'relayed');assert.equal(f.relay.status().registeredPeers,2);
 assert.deepEqual(f.right.status().authenticatedPeers,[f.a.nodeId]);
});
test('simultaneous requests converge on one authenticated session',async t=>{
 const f=await fixture(t);
 const r=await Promise.all([f.left.request(f.b.nodeId,'a',1),f.right.request(f.a.nodeId,'b',2)]);
 assert.equal(r[0].payload,1);assert.equal(r[1].payload,2);
});
test('contact key mismatch and public remote relay are rejected',()=>{
 const a=newIdentity(),b=newIdentity(),c=newIdentity();
 assert.throws(()=>createOwnerPeerRpc({identity:a,contacts:[{nodeId:b.nodeId,publicKeyPem:c.publicKeyPem}]}),/trusted contact/);
 assert.throws(()=>createOwnerPeerRpc({identity:a,relayUrl:'ws://192.0.2.1:18891'}),/SSH forward/);
 assert.throws(()=>createOwnerPeerRpc({identity:a,contacts:[b,b]}),/trusted contact/);
});
test('bad peer handshake signature never reaches handler',async t=>{
 let called=0;
 const f=await fixture(t,{onFrame:p=>{if(p.kind==='hello')p.signature=Buffer.alloc(64).toString('base64');},handler:async()=>{called++;}});
 await assert.rejects(f.left.request(f.b.nodeId,'read',{}),/timed out|disconnected|rejected/);assert.equal(called,0);
});
test('tampered sealed request never reaches handler',async t=>{
 let called=0;
 const f=await fixture(t,{onFrame:p=>{if(p.kind==='sealed'&&p.counter===2)p.tag=Buffer.alloc(16).toString('base64');},handler:async()=>{called++;}});
 await assert.rejects(f.left.request(f.b.nodeId,'read',{}),/timed out|rejected|disconnected/);assert.equal(called,0);
});
test('AES-GCM rejects replay, wrong direction, wrong session and tamper',()=>{
 const key=randomBytes(32),tx={id:'session',txKey:key,tx:0},rx={id:'session',rxKey:key,rx:0};
 const p=sealPeerPacket(tx,'a','b',{kind:'test',private:'world'});
 const bad={...p,tag:Buffer.alloc(16).toString('base64')};
 assert.throws(()=>openPeerPacket(rx,bad,'a','b'));
 assert.equal(rx.rx,0);assert.equal(openPeerPacket(rx,p,'a','b').private,'world');
 assert.throws(()=>openPeerPacket(rx,p,'a','b'),/replay/);
 assert.throws(()=>openPeerPacket({...rx,rx:0},p,'b','a'),/session/);
 assert.throws(()=>openPeerPacket({...rx,id:'different',rx:0},p,'a','b'),/session/);
});
test('oversized payload and handler error produce bounded errors without secret text',async t=>{
 const f=await fixture(t,{handler:async()=>{throw new Error('PRIVATE-PATH-AND-SECRET');}});
 await assert.rejects(f.left.request(f.b.nodeId,'read','x'.repeat(MAX_RPC_BYTES)),/exceeds limit/);
 await assert.rejects(f.left.request(f.b.nodeId,'read',{}),e=>e.message==='Remote request rejected');
});
test('disconnect rejects outstanding RPC promptly',async t=>{
 const f=await fixture(t,{handler:async()=>new Promise(()=>{})});
 const request=f.left.request(f.b.nodeId,'pending',{});const rejected=assert.rejects(request,/disconnected/);
 await new Promise(resolve=>setTimeout(resolve,30));await f.right.close();await rejected;
});

test('pending RPC concurrency limit rejects excess work',async t=>{
 const f=await fixture(t,{handler:async({operation})=>operation==='prime'?null:new Promise(()=>{})});
 await f.left.request(f.b.nodeId,'prime',{}).catch(()=>{});
 const calls=Array.from({length:32},()=>f.left.request(f.b.nodeId,'hold',{}).catch(e=>e.message));
 // Allow all requests to pass the already established handshake microtask.
 await new Promise(resolve=>setTimeout(resolve,20));
 await assert.rejects(f.left.request(f.b.nodeId,'excess',{}),/pending limit/);
 await f.right.close();
 const errors=await Promise.all(calls);assert.equal(errors.length,32);
 assert.ok(errors.every(value=>/disconnected/.test(value)));
});


test('restartable RPC clears sessions, fences old handler completion, coalesces start and closes terminally',async t=>{
 const a=newIdentity(),b=newIdentity();let releaseOld,oldStarted=false,relay=await createOwnerPeerRelay({port:0});
 const port=relay.address.port,relayUrl='ws://127.0.0.1:'+port,frames=[];
 const left=createOwnerPeerRpc({identity:a,contacts:[b],relayUrl,timeoutMs:300});
 const right=createOwnerPeerRpc({identity:b,contacts:[a],relayUrl,timeoutMs:300,handler:async({operation,payload})=>{if(operation==='hold'){oldStarted=true;return new Promise(resolve=>{releaseOld=resolve;});}return payload;}});
 t.after(async()=>{await Promise.all([left.close(),right.close()]);await relay.close();});
 await Promise.all([left.start(),left.start(),right.start()]);
 assert.equal(await left.request(b.nodeId,'echo','first'),'first');
 const beforeGeneration=left.status().generation;
 const held=left.request(b.nodeId,'hold',{});const disconnected=assert.rejects(held,/disconnected/);
 for(let i=0;i<100&&!oldStarted;i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(oldStarted,true);await relay.close();await disconnected;
 assert.deepEqual(left.status().authenticatedPeers,[]);assert.equal(left.status().connected,false);
 await assert.rejects(left.start(),/disconnected/);
 relay=await createOwnerPeerRelay({port,onFrame:p=>frames.push(p)});
 await Promise.all([left.start(),left.start(),right.start()]);
 assert.ok(left.status().generation>beforeGeneration);
 assert.equal(await left.request(b.nodeId,'echo','fresh'),'fresh');
 const count=frames.length;releaseOld({private:'old-handler-response'});
 await new Promise(r=>setTimeout(r,25));assert.equal(frames.length,count,'Old async handler cannot send into new connection');
 await left.close();await assert.rejects(left.start(),/closed/);
});
