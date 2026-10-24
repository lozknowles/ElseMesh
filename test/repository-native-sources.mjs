import test from 'node:test';import assert from 'node:assert/strict';
import {isRepositoryContentPath,localRepositorySource} from '../src/world-runtime/LocalRepositoryFiles.js';
import {hostedRepositorySource} from '../src/world-runtime/HostedRepository.js';
const path='native-island/'+'a'.repeat(64)+'.bin';
test('native binary fields use exact content-addressed paths in local and hosted adapters',async()=>{
 assert(isRepositoryContentPath(path));for(const p of ['native-island/x.bin','native-island/'+ 'a'.repeat(64)+'.js','native-island/../private.json','native-island/%2e%2e/key.bin'])assert(!isRepositoryContentPath(p));
 let opened=0;const source=localRepositorySource([{webkitRelativePath:'world/world.json',size:2,arrayBuffer:async()=>new TextEncoder().encode('{}').buffer},{webkitRelativePath:'world/'+path,size:3,arrayBuffer:async()=>{opened++;return new Uint8Array([1,2,3]).buffer;}}]);
 assert.deepEqual([...await source.read(path,3)],[1,2,3]);await assert.rejects(source.read(path,2),/byte limit/);assert.equal(opened,1);
 const calls=[],hosted=hostedRepositorySource('/world/',{origin:'https://example.test',baseURL:'https://example.test/',fetch:async(url,options)=>{calls.push({url,options});return new Response(new Uint8Array([1,2,3]));}});
 assert.deepEqual([...await hosted.read(path,3)],[1,2,3]);assert.equal(calls[0].url,'https://example.test/world/'+path);assert.equal(calls[0].options.credentials,'omit');await assert.rejects(hosted.read('native-island/code.js',100),/path/);assert.equal(calls.length,1);
});
