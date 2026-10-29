import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundColliderHierarchy,GROUND_HIERARCHY_LIMITS} from '../src/world/GroundColliderHierarchy.js';
import {ColliderGrid} from '../src/world/ColliderGrid.js';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/index.js';
const box=(x=0,z=0,half=.2)=>({center:{x,z},half:{x:half,z:half},cos:1,sin:0,radius:Math.SQRT2*half,top:1,bottom:0,walkable:true});
const equal=(tree,grid,args)=>assert.deepEqual(tree.query(...args),grid.query(...args));

test('equal centres partition deterministically without reordering source; storage stays bounded and full precision',()=>{
 const records=Array.from({length:513},()=>box(-2.0000000000000004,4)),before=records.slice(),grid=new ColliderGrid(records,'box',2),tree=new GroundColliderHierarchy(records,grid),other=new GroundColliderHierarchy(records);
 assert.equal(tree.usingFallback,false);assert.deepEqual(records,before);assert.deepEqual(tree.ids,other.ids);assert.ok(tree.bounds instanceof Float64Array);assert.ok(tree.ids instanceof Uint32Array);
 assert.equal(tree.bounds[0],grid.bounds[0][0]);assert.ok(tree.maxDepth<=GROUND_HIERARCHY_LIMITS.depth);assert.ok(tree.nodeCount<=tree.nodeCapacity);assert.ok(tree.storage().arrayBufferBytes<100000);
 for(const after of [-1,0,255,512])equal(tree,grid,[-3,3,-1,5,after]);
 assert.notEqual(tree.candidates,other.candidates);assert.notEqual(tree.stack,other.stack);const held=tree.query(-3,3,-1,5).slice();other.query(100,100,101,101);assert.deepEqual(tree.candidates,held);
});

test('forced partition and allocation failures discard partial hierarchy and use complete2m fallback',()=>{
 class PartitionFailure extends GroundColliderHierarchy{_partition(){this.partitionFallbacks++;return false;}}
 class AllocationFailure extends GroundColliderHierarchy{_build(){throw new RangeError('simulated-allocation-failure');}}
 const records=Array.from({length:65},()=>box()),grid=new ColliderGrid(records,'box',2);
 for(const C of [PartitionFailure,AllocationFailure]){const tree=new C(records,grid);assert.equal(tree.usingFallback,true);assert.equal(tree.bounds,null);assert.equal(tree.storage().arrayBufferBytes,0);assert.equal(tree.fallback,grid);equal(tree,grid,[-1,-1,1,1]);equal(tree,grid,[-1,-1,1,1,32]);}
});

test('record cap, malformed bounds and finite extremes never lose fallback candidates',()=>{
 const records=new Array(GROUND_HIERARCHY_LIMITS.records+1).fill(box()),grid=new ColliderGrid(records,'box',2),tree=new GroundColliderHierarchy(records,grid);assert.equal(tree.fallbackReason,'record-limit');equal(tree,grid,[-1,-1,1,1,65530]);
 for(const record of [{...box(),cos:NaN},{...box(),radius:NaN},box(Number.MAX_VALUE,0),box(0,0,Number.MAX_VALUE)]){const records=[box(),record],grid=new ColliderGrid(records,'box',2),tree=new GroundColliderHierarchy(records,grid);assert.equal(tree.usingFallback,true);for(const q of [[-1,-1,1,1],[NaN,0,1,1],[-Infinity,-Infinity,Infinity,Infinity]])equal(tree,grid,q);}
});

test('large overflow, negative boundaries, after and invalid/unbounded query fallback preserve exact order',()=>{
 const records=[box(-2,-2),box(0,0,1000),box(2,2)],grid=new ColliderGrid(records,'box',2),tree=new GroundColliderHierarchy(records,grid);assert.equal(tree.usingFallback,false);assert.deepEqual(tree.overflow,grid.overflow);
 for(const q of [[-2,-2,-2,-2],[-2-1e-7,-2-1e-7,-2+1e-7,-2+1e-7],[-.1,-.1,.1,.1],[NaN,0,1,1],[1,1,-1,-1],[-1e6,-1e6,1e6,1e6]])for(const after of [-1,0,1,2])equal(tree,grid,[...q,after]);
 class QueryFailure extends GroundColliderHierarchy{_query(){throw Error('simulated-query-failure');}}
 const failed=new QueryFailure(records,grid);equal(failed,grid,[-.1,-.1,.1,.1]);assert.equal(failed.usingFallback,true);assert.equal(failed.bounds,null);
});

test('integration rebuilds both hierarchy and fullfallback; live flags and disabled path remain unchanged',()=>{
 const c=new Colliders(),record=c.addBox(new Vector3(0,1,0),new Vector3(.5,1,.5),0,{walkable:true});c.groundHeightAt(0,0,5);const old=c._spatial;
 assert.ok(old.groundBoxes instanceof GroundColliderHierarchy);assert.equal(old.groundBoxes.usingFallback,false);assert.equal(old.boxes.cellSize,16);assert.equal(old.groundBoxes.fallback.cellSize,2);
 record.walkable=false;assert.equal(c.groundHeightAt(0,0,5),-Infinity);assert.equal(c._spatial,old);record.walkable=true;record.center.x=-4;c.invalidateSpatialQueries();assert.equal(c.groundHeightAt(-4,0,5),2);assert.notEqual(c._spatial.groundBoxes,old.groundBoxes);assert.notEqual(c._spatial.groundBoxes.fallback,old.groundBoxes.fallback);
 c.boxes=c.boxes.slice();c.groundHeightAt(-4,0,5);assert.equal(c._spatial.groundBoxes.records,c.boxes);assert.equal(c._spatial.groundBoxes.fallback.records,c.boxes);
 const disabled=new Colliders();disabled.optimizeSpatialQueries=false;disabled.addBox(new Vector3(),new Vector3(1,1,1),0,{walkable:true});disabled.groundHeightAt(0,0,5);assert.equal(disabled._spatial,null);
});


test('lastWork truthfully reports every delegated fallback and resets for a normal hierarchy query',()=>{
 const records=Array.from({length:17},(_,i)=>box(i-8,0)),grid=new ColliderGrid(records,'box',2),tree=new GroundColliderHierarchy(records,grid);
 assert.equal(tree.cellSize,2);assert.equal(tree.usingFallback,false);equal(tree,grid,[-1,-1,1,1]);assert.equal(tree.lastWork.fallback,false);assert.ok(tree.lastWork.nodes>0);
 for(const args of [[NaN,0,1,1],[-Infinity,0,1,1],[-1e6,-1e6,1e6,1e6],[1,1,-1,-1]]){
  equal(tree,grid,args);assert.deepEqual(tree.lastWork,{nodes:null,entries:null,overflow:null,fallback:true});assert.equal(tree.usingFallback,false,'query-only fallback does not disable hierarchy');
  equal(tree,grid,[-1,-1,1,1]);assert.equal(tree.lastWork.fallback,false);
 }
 class FailedConstruction extends GroundColliderHierarchy{_build(){throw Error('fixture');}}
 class FailedQuery extends GroundColliderHierarchy{_query(){throw Error('fixture');}}
 for(const C of [FailedConstruction,FailedQuery]){const failed=new C(records,grid);equal(failed,grid,[-1,-1,1,1]);assert.equal(failed.usingFallback,true);assert.deepEqual(failed.lastWork,{nodes:null,entries:null,overflow:null,fallback:true});equal(failed,grid,[-1,-1,1,1,4]);assert.equal(failed.lastWork.fallback,true);}
});
