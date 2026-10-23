import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createOwnerPeerRelay} from '../tools/networking/owner-peer-relay.mjs';
test('native-only loopback relay rejects browser Origin before registration',async()=>{const relay=await createOwnerPeerRelay({port:0});try{const ws=new WebSocket('ws://127.0.0.1:'+relay.address.port,{origin:'https://untrusted.example'});const message=await new Promise(resolve=>{ws.once('error',e=>resolve(e.message));ws.once('open',()=>resolve('unexpected open'));});assert.match(message,/401|403/);assert.equal(relay.status().registeredPeers,0);}finally{await relay.close();}});
