import test from 'node:test';
import assert from 'node:assert/strict';
import {OwnerWorldTransport} from '../src/world-runtime/OwnerWorldTransport.js';
const fixture=()=>{const t=new OwnerWorldTransport({config:{}});t.identity={nodeId:'elsemesh-node:test'};t.worldId='elsemesh.world:test';t.membership={sessionId:'session:test',world:{epoch:1}};t.sign=async x=>x;t.ownerGrantExpiry.set(t.worldId,Date.now()+600000);t.sendOwnerEnvelope=async()=>{throw Error('Optional service timed out');};return t;};
test('welcome delivery failure does not latch movement authority offline',async()=>{for(const op of ['world-welcome-read','world-welcome-ack']){const t=fixture();await assert.rejects(t.request(op,{}, {nonfatal:true}),/timed out/);assert.equal(t.frozen,false);assert.equal(t.ownerWorldOnline.get(t.worldId),undefined);}});
test('ordinary state transport failure still freezes and optional mode cannot bypass it',async()=>{const t=fixture();await assert.rejects(t.request('state',{}, {nonfatal:true}),/limited to welcome/);assert.equal(t.frozen,false);await assert.rejects(t.request('state'),/timed out/);assert.equal(t.frozen,true);assert.equal(t.ownerWorldOnline.get(t.worldId),false);});
