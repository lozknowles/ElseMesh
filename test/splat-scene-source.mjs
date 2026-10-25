import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,packWorldRepository,repositoryDigest,loadWorldSource,createSplatSceneResourceReader,isSplatSceneResourcePath,MAX_SPLAT_SCENE_BYTES,MAX_SPLAT_PHYSICS_BYTES} from '../src/world-runtime/vendor/world-engine-contract.js';
import {loadVerifiedSog,loadVerifiedPhysicsBytes,readSplatSceneSource} from '../src/world-runtime/SplatSceneSource.js';
import {localRepositorySource,isRepositoryContentPath} from '../src/world-runtime/LocalRepositoryFiles.js';
const encoder=new TextEncoder();
async function fixture(){const sog=new Uint8Array([80,75,3,4,1,2,3,4]),physics=encoder.encode('{"opaque":"physics schema admitted separately"}'),hash=await repositoryDigest(sog),phash=await repositoryDigest(physics),provenance=Object.fromEntries(['videoSha256','plySha256','reviewSha256','qualificationSha256'].map(k=>[k,'a'.repeat(64)]));const project={...createWorld('Private splat fixture'),splatScene:{schema:'elsemesh.splat-scene/1',asset:{path:`splat-scenes/${hash}.sog`,sha256:hash,bytes:sog.length,count:16},physics:{path:`splat-scenes/${phash}.json`,sha256:phash,bytes:physics.length},transform:{position:[0,0,0],rotation:[0,0,0],scale:.2},scaleStatus:'assumed-gameplay',provenance}};const blobs=new Map([[project.splatScene.asset.path,sog],[project.splatScene.physics.path,physics]]);return {project,sog,physics,blobs,read:async(path,limit)=>{const bytes=blobs.get(path);if(!bytes||bytes.length>limit)throw Error('VIEW denied or missing');return bytes;}};}
test('generated installed contract packs signed closure; local VIEW reader loads resources lazily and exactly',async()=>{
 const f=await fixture(),packed=await packWorldRepository(f.project,{splatSceneRead:f.read});let reads=0;const files=[...packed].map(([path,bytes])=>({webkitRelativePath:'private-world/'+path,size:bytes.length,arrayBuffer:async()=>{if(path.startsWith('splat-scenes/'))reads++;return bytes.slice().buffer;}}));const loaded=await loadWorldSource(localRepositorySource(files));assert.equal(reads,0);assert.deepEqual(loaded.project.splatScene,f.project.splatScene);assert.deepEqual(await loadVerifiedSog(loaded.project,loaded.splatSceneRead),f.sog);assert.deepEqual(await loadVerifiedPhysicsBytes(loaded.project,loaded.splatSceneRead),f.physics);assert.equal(reads,2);
});
test('SOG and physics exact hash path grammar is the same on installed local/hosted and contract readers',async()=>{
 const f=await fixture();for(const path of f.blobs.keys()){assert.equal(isRepositoryContentPath(path),true);assert.equal(isSplatSceneResourcePath(path),true);}
 for(const path of ['../secret.sog','splat-scenes/a.sog','splat-scenes/'+ 'a'.repeat(64)+'.SOG','splat-scenes/'+ 'a'.repeat(64)+'.ply','splat-scenes/'+ 'a'.repeat(64)+'.sog/../world.json','https://example.invalid/a.sog']){assert.equal(isRepositoryContentPath(path),false);assert.equal(isSplatSceneResourcePath(path),false);}
});
test('dedicated reader cannot expand its admitted resource closure or exceed caller budgets',async()=>{
 const f=await fixture(),reader=readSplatSceneSource(f.project,f.read);assert.ok(Object.isFrozen(reader));await assert.rejects(reader.read('world.json',1024),/not admitted/);await assert.rejects(reader.read(f.project.splatScene.asset.path,1),/byte limit/);const copy=await reader.readSog();copy[0]=0;assert.equal(f.sog[0],80);
});
test('absent, denied, mismatched and oversized private resources fail closed with no fetch fallback',async()=>{
 const f=await fixture();await assert.rejects(loadVerifiedSog(f.project,undefined),/source unavailable/);await assert.rejects(loadVerifiedPhysicsBytes(f.project,async()=>{throw Error('VIEW denied');}),/VIEW denied/);for(const bytes of [new Uint8Array(f.sog.length),new Uint8Array(f.sog.length+1)])await assert.rejects(loadVerifiedSog(f.project,async()=>bytes),/hash or size/);
 for(const [kind,maximum]of [['asset',MAX_SPLAT_SCENE_BYTES],['physics',MAX_SPLAT_PHYSICS_BYTES]]){const p=structuredClone(f.project);p.splatScene[kind].bytes=maximum+1;assert.throws(()=>createSplatSceneResourceReader(p,f.read),/byte size/);}
});
test('private descriptor unknown fields and external or traversal resources are rejected before loading',async()=>{
 const f=await fixture();for(const mutate of [p=>p.splatScene.url='https://example.invalid/a.sog',p=>p.splatScene.asset.path='../secret',p=>p.splatScene.provenance.script='bad',p=>p.splatScene.transform.scale=Infinity,p=>p.splatScene.asset.count=1_000_001]){const p=structuredClone(f.project);mutate(p);await assert.rejects(packWorldRepository(p,{splatSceneRead:f.read}),/splat scene|Executable hooks/);}
});
