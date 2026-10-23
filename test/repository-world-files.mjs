import test from 'node:test';
import assert from 'node:assert/strict';
import { localRepositorySource } from '../src/world-runtime/LocalRepositoryFiles.js';
const file=(path,text='data',extra={})=>({webkitRelativePath:path,size:Buffer.byteLength(text),arrayBuffer:async()=>Uint8Array.from(Buffer.from(text)).buffer,...extra});
test('folder import strips exactly one root and lazily reads only requested content',async()=>{
 let unrelated=0;const source=localRepositorySource([file('A folder/world.json','{}'),file('A folder/.git/config','secret',{arrayBuffer:()=>{unrelated++;throw Error('must not read');}}),file('A folder/notes.txt','notes',{arrayBuffer:()=>{unrelated++;throw Error('must not read');}})]);
 assert.equal(source.label,'A folder');assert.equal(new TextDecoder().decode(await source.read('world.json',10)),'{}');await assert.rejects(source.read('.git/config',100));await assert.rejects(source.read('notes.txt',100));assert.equal(unrelated,0);
});
test('duplicate paths are rejected rather than silently replacing bytes',()=>{assert.throws(()=>localRepositorySource([file('world/world.json'),file('world/world.json')]),/Duplicate/);});
test('unsafe, mixed root and missing manifest inputs fail before any byte read',()=>{
 for(const path of ['world/../world.json','world/./world.json','/world/world.json','world\\world.json','world//world.json','world.json'])assert.throws(()=>localRepositorySource([file(path)]));
 assert.throws(()=>localRepositorySource([file('a/world.json'),file('b/notes.txt')]),/one repository/);assert.throws(()=>localRepositorySource([file('a/readme.txt')]),/world.json/);assert.throws(()=>localRepositorySource([]));
});
test('byte limits apply before read and are checked against returned bytes',async()=>{
 let reads=0;const source=localRepositorySource([file('a/world.json','1234',{arrayBuffer:async()=>{reads++;return new Uint8Array(5).buffer;}})]);
 await assert.rejects(source.read('world.json',3),/byte limit/);assert.equal(reads,0);await assert.rejects(source.read('world.json',10),/size changed/);await assert.rejects(source.read('../world.json',10),/not allowed/);assert.equal(reads,1);
});
