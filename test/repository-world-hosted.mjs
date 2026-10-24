import test from 'node:test';
import assert from 'node:assert/strict';
import { hostedRepositorySource } from '../src/world-runtime/HostedRepository.js';
const options={origin:'http://localhost:5210',baseURL:'http://localhost:5210/worlds.html'};
test('hosted directory reads actual requested paths with bounded credential-free requests',async()=>{
 const seen=[];const source=hostedRepositorySource('/worlds/house/house/',{...options,fetch:async(url,init)=>{seen.push({url,init});return new Response('world bytes');}});
 assert.equal(new TextDecoder().decode(await source.read('world.json',100)),'world bytes');assert.equal(seen[0].url,'http://localhost:5210/worlds/house/house/world.json');assert.equal(seen[0].init.credentials,'omit');assert.equal(seen[0].init.redirect,'error');assert.equal(seen[0].init.cache,'no-store');assert.ok(seen[0].init.signal);await source.read('snapshots/'+'a'.repeat(64)+'/objects.json',100);assert.equal(seen[1].init.cache,'default');
});
test('unsafe URLs and outside-origin sources are rejected before fetching',()=>{
 for(const url of ['https://example.com/world/','http://user:pass@localhost:5210/world/','/world/?token=x','/world/#x','/world/../other/','/world/%2e%2e/other/','/world/\t../other/','/world//other/','/world\\other/','//evil.example/world/','file:///world/','/world/.git/'])assert.throws(()=>hostedRepositorySource(url,options),url);
});
test('read forbids noncontent and traversal paths without requesting them',async()=>{
 let calls=0;const source=hostedRepositorySource('/worlds/house/',{...options,fetch:async()=>{calls++;return new Response('x');}});
 for(const path of ['../world.json','.git/config','notes.txt','snapshots/not-a-digest/objects.json','https://example.com/world.json'])await assert.rejects(source.read(path,100));assert.equal(calls,0);
});
test('response and stream byte overflow and redirect are rejected',async()=>{
 for(const response of [new Response('large',{headers:{'content-length':'1000'}}),new Response('large'),new Response('x',{status:302})]){const source=hostedRepositorySource('/world/',{...options,fetch:async()=>response});await assert.rejects(source.read('world.json',2));}
});
test('timeout aborts stalled requests',async()=>{
 const source=hostedRepositorySource('/world/',{...options,timeoutMs:1,fetch:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))});await assert.rejects(source.read('world.json',100),/aborted/);
});
