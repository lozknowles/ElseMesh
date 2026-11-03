import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeIslandTiles} from '../src/world-runtime/NativeIslandTiles.js';

// Previous implementation is the ordering/scheduling oracle, independent of
// the optimized distance-key and resident-touch implementation.
function previousView(x,z,radius=220,visible=()=>true){
 const tiles=this.tiles.filter(t=>visible(t)&&t.bounds[0]<=x+radius&&t.bounds[2]>=x-radius&&t.bounds[1]<=z+radius&&t.bounds[3]>=z-radius).sort((a,b)=>Math.hypot((a.bounds[0]+a.bounds[2])/2-x,(a.bounds[1]+a.bounds[3])/2-z)-Math.hypot((b.bounds[0]+b.bounds[2])/2-x,(b.bounds[1]+b.bounds[3])/2-z));
 for(const tile of [...tiles].reverse())if(this.entries.get(tile.id)?.data)this.request(tile).catch(()=>{});
 for(const tile of tiles){if(this.entries.has(tile.id))continue;if(this.queue.length+this.running>=8)break;this.request(tile).catch(()=>{});}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const state=cache=>({entries:[...cache.entries].map(([id,e])=>({id,used:e.used,refs:e.refs,resident:!!e.data,bytes:e.bytes})),queue:cache.queue.map(e=>e.tile.id),running:cache.running,bytes:cache.bytes,clock:cache.clock,failures:cache.failures});

test('view streaming matches previous ordering, LRU, retries and eviction on overlapping and tied tiles',async()=>{
 const tiles=Array.from({length:35},(_,i)=>({id:String(i),bounds:[(i%7-3)*12,((i/7|0)-2)*12,(i%7-3)*12+20,((i/7|0)-2)*12+20]}));
 // Duplicate centres exercise stable ties; keep their original index order.
 tiles.push({id:'tie-a',bounds:[-2,-2,2,2]},{id:'tie-b',bounds:[-1,-1,1,1]});
 const order=[[],[]],caches=order.map((events,index)=>{
  let rejected=false;
  const cache=new NativeIslandTiles({tiles,maxConcurrency:2,maxBytes:6*16,readTile:async tile=>{events.push('read:'+tile.id);if(tile.id==='17'&&!rejected){rejected=true;throw Error('retry once');}return new Uint8Array(16);},onEvict:tile=>events.push('evict:'+tile.id)});
  if(index===0)cache.requestView=previousView;
  return cache;
 });
 for(let frame=0;frame<32;frame++){
  const args=[Math.sin(frame*.3)*30,Math.cos(frame*.2)*25,frame%5===0?0:45,tile=>Number(tile.id)%4!==frame%4];
  for(const cache of caches)cache.requestView(...args);
  assert.deepEqual(state(caches[1]),state(caches[0]),'immediate frame '+frame);
  await flush();
  assert.deepEqual(state(caches[1]),state(caches[0]),'settled frame '+frame);
  assert.deepEqual(order[1],order[0]);
 }
 assert.equal(caches[1].failures.length,1);assert(order[1].filter(event=>event==='read:17').length>=2,'failed tile was retried');
 for(const cache of caches)cache.dispose();
 assert.deepEqual(state(caches[1]),state(caches[0]));
});

test('resident view touches allocate no promise and preserve reverse tie LRU order',async()=>{
 const tiles=[{id:'near-a',bounds:[-1,-1,1,1]},{id:'far',bounds:[9,-1,11,1]},{id:'near-b',bounds:[-2,-2,2,2]}];
 const cache=new NativeIslandTiles({tiles,readTile:async()=>new Uint8Array(1)});
 await Promise.all(tiles.map(tile=>cache.request(tile)));await flush();
 const before=cache.clock;
 cache.request=()=>{throw Error('Resident touch must not request a promise');};
 cache.requestView(0,0,20);
 assert.equal(cache.entries.get('far').used,before+1);
 assert.equal(cache.entries.get('near-b').used,before+2);
 assert.equal(cache.entries.get('near-a').used,before+3);
 cache.dispose();
});

test('distance key retains hypot rounding ties and huge finite-distance ordering',()=>{
 // hypot(1, 2**-26) rounds to 1; squared distance would split this tie.
 assert.equal(Math.hypot(1,2**-26),1);assert(1+(2**-26)**2>1);
 const tiles=[{id:'rounded-tie',bounds:[1,2**-26,1,2**-26]},{id:'axis-tie',bounds:[1,0,1,0]},{id:'huge',bounds:[1e200,0,1e200,0]},{id:'less-huge',bounds:[1e190,0,1e190,0]}];
 const make=index=>{const cache=new NativeIslandTiles({tiles,readTile:()=>new Promise(()=>{})});if(index===0)cache.requestView=previousView;return cache;};
 const caches=[make(0),make(1)];for(const cache of caches)cache.requestView(0,0,Infinity);
 assert.deepEqual([...caches[1].entries.keys()],['rounded-tie','axis-tie','less-huge','huge']);
 assert.deepEqual(state(caches[1]),state(caches[0]));
 for(const cache of caches)cache.dispose();
});

test('view checks inclusive radius bounds before visibility and reevaluates changed visibility',async()=>{
 const tiles=[{id:'edge',bounds:[10,-1,12,1]},{id:'outside',bounds:[11,2,12,3]},{id:'near',bounds:[-1,-1,1,1]}];
 const cache=new NativeIslandTiles({tiles,readTile:async()=>new Uint8Array(1)}),seen=[];
 cache.requestView(0,0,10,tile=>{seen.push(tile.id);return tile.id==='edge';});
 assert.deepEqual(seen,['edge','near']);assert.deepEqual([...cache.entries.keys()],['edge']);
 await flush();
 cache.requestView(0,0,10,tile=>tile.id==='near');await flush();
 assert.deepEqual([...cache.entries.keys()],['edge','near']);
 cache.dispose();
});

test('view backlog cap and retained queue promotion survive interleaved requests',async()=>{
 const tiles=Array.from({length:15},(_,i)=>({id:String(i),bounds:[i,-1,i+1,1]}));
 const caches=[0,1].map(index=>{
  const pending=[];
  const cache=new NativeIslandTiles({tiles,maxConcurrency:1,readTile:()=>new Promise(resolve=>pending.push(resolve))});
  if(index===0)cache.requestView=previousView;
  return {cache,pending};
 });
 for(const {cache} of caches)cache.requestView(0,0,100);
 assert.equal(caches[1].cache.entries.size,8);
 await flush();
 const leases=caches.map(({cache})=>cache.retain([tiles[14],tiles[6]]));
 assert.deepEqual(state(caches[1].cache),state(caches[0].cache));
 assert.deepEqual(caches[1].cache.queue.slice(0,2).map(e=>e.tile.id),['6','14']);
 for(let i=0;i<9;i++){for(const {pending} of caches)pending.shift()?.(new Uint8Array(1));await flush();}
 const releases=await Promise.all(leases);for(const release of releases)release();
 assert.deepEqual(state(caches[1].cache),state(caches[0].cache));
 for(const {cache} of caches)cache.dispose();
});

test('view after disposal starts no reads and changes no LRU clock',async()=>{
 let reads=0;const tiles=[{id:'a',bounds:[0,0,1,1]}],cache=new NativeIslandTiles({tiles,readTile:async()=>{reads++;return new Uint8Array(1);}});
 await cache.request('a');await flush();cache.dispose();const clock=cache.clock;
 cache.requestView(0,0);await flush();assert.equal(reads,1);assert.equal(cache.clock,clock);assert.equal(cache.entries.size,0);
});
