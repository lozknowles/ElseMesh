import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeIslandTiles} from '../src/world-runtime/NativeIslandTiles.js';
import {NativeIslandTerrain,sampleNativeField} from '../src/world-runtime/NativeIslandTerrain.js';
const tiles=Array.from({length:4},(_,i)=>({id:String(i),x:i*2,z:0,width:2,height:2,bounds:[i*2,0,i*2+2,2]}));
test('tile requests deduplicate and obey concurrency and byte budget',async()=>{
 let active=0,peak=0,calls=0;const cache=new NativeIslandTiles({tiles,maxConcurrency:2,maxBytes:32,readTile:async()=>{calls++;active++;peak=Math.max(active,peak);await new Promise(r=>setTimeout(r,4));active--;return{heights:new Float32Array(4)};}});
 const first=cache.request(tiles[0]);assert.equal(first,cache.request(tiles[0]));await Promise.all([first,...tiles.slice(1).map(t=>cache.request(t))]);
 assert.equal(calls,4);assert.equal(peak,2);assert.ok(cache.stats().bytes<=32);assert.equal(cache.stats().residentTiles,2);cache.dispose();assert.equal(cache.stats().bytes,0);
});
test('arrival holds verified tile until release; over-budget load fails closed',async()=>{
 const cache=new NativeIslandTiles({tiles,maxBytes:16,readTile:async()=>({heights:new Float32Array(4)})});
 const release=await cache.ensureAt(.5,.5,0);assert.ok(cache.readyAt(.5,.5));await assert.rejects(cache.request(tiles[1]),/pinned/);assert.equal(cache.stats().bytes,16);release();release();await cache.request(tiles[1]);assert.equal(cache.readyAt(.5,.5),false);cache.dispose();
});
test('disposal rejects queued and late reads without retaining bytes',async()=>{
 let resolve;const cache=new NativeIslandTiles({tiles,maxConcurrency:1,readTile:()=>new Promise(r=>resolve=r)});
 const running=cache.request(tiles[0]),queued=cache.request(tiles[1]);const checks=Promise.all([assert.rejects(running,/disposed/),assert.rejects(queued,/disposed/)]);await Promise.resolve();cache.dispose();resolve({heights:new Float32Array(4)});await checks;assert.equal(cache.stats().bytes,0);
});
test('cell-centred height matches captured values and gates unready physics',()=>{
 const coarse={res:4,heights:Float32Array.from({length:16},(_,i)=>i)};assert.equal(sampleNativeField(coarse.heights,4,0,4,1.5,1.5),5);
 const data=new NativeIslandTerrain({res:4,size:4,origin:0,coarse});assert.ok(Number.isNaN(data.heightAt(1.5,1.5)));data.cache={readyAt:()=>true};assert.equal(data.heightAt(1.5,1.5),5);assert.deepEqual(data.boundsFor(),[-92,12]);
 data.apply({x:1,z:1,width:2,height:2},{heights:new Float32Array([21,22,23,24])});assert.equal(data.heightAt(1.5,1.5),21);
});

import {readNativeIslandSource} from '../src/world-runtime/NativeIslandSource.js';
test('contract source reads coarse fields first and leaves exact fine bytes lazy',async()=>{
 const resources=[],payloads=new Map(),seen=[];const add=(channel,level,channels,format,data)=>{const id=channel+level;resources.push({id,channel,level,x:0,z:0,width:level?2:4,height:level?2:4,channels,format,bytes:data.byteLength??100});payloads.set(id,data);};
 for(const level of [0,1]){add('height',level,1,'f32le',new Float32Array(level?4:16));add('normal',level,4,'u8',new Uint8Array(level?16:64));add('splat',level,4,'u8',new Uint8Array(level?16:64));}
 add('shore',1,4,'f32le',new Float32Array(16));add('grass',1,4,'u8',new Uint8Array(16));
 const names=['palms','trees','bananas','shrubs','youngPalms','ferns','monsteras','elephantEars','heliconias','strelitzias'];add('vegetation',0,1,'vegetation-json',{records:Object.fromEntries(names.map(n=>[n,[]]))});
 const project={nativeIsland:{schema:'elsemesh.native-island/1',vegetationRecipe:'elsemesh.native-vegetation/1',grid:{resolution:4,size:4,origin:[-2,-2]},resources,sea:{appearance:{}}}};
 const source=await readNativeIslandSource(project,async id=>{seen.push(id);return{ref:resources.find(r=>r.id===id),data:payloads.get(id)};});
 assert.equal(source.coarse.res,2);assert.ok(!seen.includes('height0'));assert.ok(!seen.includes('normal0'));assert.ok(!seen.includes('splat0'));
 const fine=await source.readTile(source.tiles[0]);assert.equal(fine.fields.heights,payloads.get('height0'));assert.equal(seen.filter(id=>id==='height0').length,1);source.dispose();await assert.rejects(source.readTile(source.tiles[0]),/disposed/);
});

import {loadNativeIslandBark} from '../src/world-runtime/NativeIslandBark.js';
test('native bark rejects missing bindings and mismatched decoded dimensions before GPU',async()=>{
 await assert.rejects(loadNativeIslandBark({}),/portable/);
 const old=globalThis.createImageBitmap;let closed=0;globalThis.createImageBitmap=async()=>({width:4096,height:4096,close(){closed++;}});
 const vegetationTextures={palm:{albedo:'pa',normal:'pn',orm:'po'},tree:{albedo:'ta',normal:'tn',orm:'to'}};const barkAssets=['pa','pn','po','ta','tn','to'].map(id=>({id,mediaType:'image/jpeg',width:1024,height:1024}));
 try{await assert.rejects(loadNativeIslandBark({vegetationTextures,barkAssets,readAsset:async()=>new Uint8Array([255,216,255,217])}),/dimensions/);assert.equal(closed,6);}finally{globalThis.createImageBitmap=old;}
});

import {RepositoryWorldHost} from '../src/world-runtime/RepositoryWorldHost.js';
import {createWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {Group,Scene,PerspectiveCamera} from '../src/engine/index.js';
import {Colliders} from '../src/world/Colliders.js';
test('host awaits verified native arrival before ground queries and gates unready movement',async()=>{
 let ready=false,arrived,updates=0,disposed=0,moves=0;const project=createWorld('native gate');
 const input={pressed:new Set(),_clearTransientInput(){},consumeLook:()=>({x:0,y:0}),moveAxes:()=>({x:0,y:0,sprint:0}),down:()=>false,hit:()=>false};
 const host=new RepositoryWorldHost({engine:{scene:new Scene(),camera:new PerspectiveCamera()},input,buildCandidate:async descriptor=>({root:new Group(),terrain:{heightAt(){assert.ok(ready,'arrival was verified first');return 0;}},colliders:new Colliders(),descriptor,matrices:new Map(),nativeIsland:{async ensureArrival(position){await Promise.resolve();arrived=position;ready=true;},canOccupy(){return ready;},update(){updates++;},dispose(){disposed++;}}})});
 const loaded={project,identity:{worldId:project.metadata.worldId,contentDigest:'gate',location:'test:gate'}};await host.activate(loaded);assert.deepEqual(arrived,host.active.descriptor.spawn.position);host.active.player.update=()=>moves++;
 ready=false;host.update(.016,1);assert.equal(moves,0);assert.equal(updates,1);ready=true;host.update(.016,2);assert.equal(moves,1);host.dispose();assert.equal(disposed,1);
});
