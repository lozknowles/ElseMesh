import test from 'node:test';
import assert from 'node:assert/strict';
import {Colliders} from '../src/world/Colliders.js';
import {ColliderGrid} from '../src/world/ColliderGrid.js';
import {Vector3} from '../src/engine/index.js';

const flatFor=world=>{const flat=new Colliders();flat.boxes=world.boxes;flat.cylinders=world.cylinders;flat.optimizeSpatialQueries=false;return flat;};
const compare=(world,x,z,maxY=10,pad=0)=>assert.ok(Object.is(world.groundHeightAt(x,z,maxY,pad),flatFor(world).groundHeightAt(x,z,maxY,pad)),`ground at ${x},${z},${maxY},${pad}`);

test('only ground uses2m cells; default grids and independent scratch remain16m',()=>{
 const world=new Colliders();world.addBox(new Vector3(-2,1,-2),new Vector3(.5,1,.5),0,{walkable:true});
 world.addBox(new Vector3(20,1,20),new Vector3(.5,1,.5));world.addCylinder(0,0,1,0,2);
 compare(world,-2,-2);const index=world._spatial;
 assert.equal(index.groundBoxes.cellSize,2);assert.equal(index.boxes.cellSize,16);assert.equal(index.cylinders.cellSize,16);
 assert.equal(index.groundBoxes.records,world.boxes);assert.equal(index.groundBoxes.length,2,'nonwalkable records are retained');
 const ordinary=index.boxes.query(19,19,21,21),before=ordinary.slice();world.groundHeightAt(-2,-2,4);assert.deepEqual(ordinary,before);
 const ground=index.groundBoxes.query(-3,-3,-1,-1),groundBefore=ground.slice();
 world.resolveCapsule(new Vector3(20,0,20),.3,1.8,.35);world.raycast(new Vector3(20,1,10),new Vector3(0,0,1),30);
 assert.deepEqual(ground,groundBefore);assert.notEqual(index.groundBoxes.candidates,index.boxes.candidates);
 assert.notEqual(index.groundBoxes.seen,index.boxes.seen);
});

test('all existing invalidation triggers rebuild ground together with capsule/ray indices',()=>{
 const world=new Colliders(),b=world.addBox(new Vector3(0,1,0),new Vector3(.5,1,.5),0,{walkable:true});
 world.addCylinder(10,0,.5,0,2);compare(world,0,0);let old=world._spatial;
 const rebuilt=(x,z)=>{compare(world,x,z);assert.notEqual(world._spatial,old);assert.notEqual(world._spatial.groundBoxes,old.groundBoxes);assert.notEqual(world._spatial.boxes,old.boxes);assert.notEqual(world._spatial.cylinders,old.cylinders);old=world._spatial;};
 b.walkable=false;assert.equal(world.groundHeightAt(0,0,10),-Infinity);b.walkable=true;b.solid=false;compare(world,0,0);assert.equal(world._spatial,old,'live flags require no rebuild');
 b.center.x=-4;b.half.x=1;b.rotY=.3;b.cos=Math.cos(.3);b.sin=Math.sin(.3);b.radius=Math.hypot(b.half.x,b.half.z);world.invalidateSpatialQueries();rebuilt(-4,0);
 world.boxes[0]={...b,center:new Vector3(6,1,0),half:b.half.clone()};world.invalidateSpatialQueries();rebuilt(6,0);
 world.boxes.reverse();world.invalidateSpatialQueries();rebuilt(6,0);
 world.boxes=world.boxes.slice();rebuilt(6,0);
 world.boxes.push({...world.boxes[0],center:new Vector3(12,1,0)});rebuilt(12,0);
 world.cylinders=world.cylinders.slice();rebuilt(12,0);
 world.cylinders.push({x:30,z:0,radius:1,yMin:0,yMax:2});rebuilt(12,0);
 world.optimizeSpatialQueries=false;world.boxes[0].center.x=-12;world.invalidateSpatialQueries();compare(world,-12,0);assert.equal(world._spatial,old);
 world.optimizeSpatialQueries=true;rebuilt(-12,0);
});

test('negative2m boundaries, rotated support, padding, flags and no-support preserve exact flat results',()=>{
 const world=new Colliders();
 for(const x of [-6,-4,-2,0,2,4,6])for(const z of [-4,-2,0,2,4])world.addBox(new Vector3(x,1,z),new Vector3(.4,1,.6),(x+z)*.17,{walkable:(x+z)%4===0});
 for(const x of [-6,-4,-2,0,2,4,6])for(const z of [-4,-2,0,2,4])for(const edge of [-1e-8,0,1e-8,.5])
  for(const pad of [-.2,0,.25,2,100])for(const y of [1,2,10])compare(world,x+edge,z-edge,y,pad);
 assert.equal(world.groundHeightAt(500,500,10),-Infinity);
 const b=world.boxes.find(box=>!box.walkable);b.walkable=true;compare(world,b.center.x,b.center.z);b.walkable=false;compare(world,b.center.x,b.center.z);
});

test('selected cell size controls entry/query limits; overflow remains complete and ordered',()=>{
 const world=new Colliders();world.addBox(new Vector3(),new Vector3(.25,1,.25),0,{walkable:true});
 world.addBox(new Vector3(),new Vector3(12,1,12),0,{walkable:true});
 world.addBox(new Vector3(80,1,80),new Vector3(1,1,1),0,{walkable:true});
 const malformed=world.addBox(new Vector3(100,1,100),new Vector3(1,1,1),0,{walkable:true});malformed.cos=NaN;
 compare(world,0,0);const {groundBoxes,boxes}=world._spatial;
 assert.ok(groundBoxes.overflow.includes(1));assert.equal(boxes.overflow.includes(1),false);
 assert.ok(groundBoxes.overflow.includes(3));assert.deepEqual(groundBoxes.query(-.1,-.1,.1,.1),[0,1,3]);
 assert.deepEqual(groundBoxes.query(-.1,-.1,.1,.1,0),[1,3]);
 assert.deepEqual(groundBoxes.query(-100,-100,100,100),[0,1,2,3],'2m query exceeds4096cells and falls back completely');
 for(const args of [[NaN,0,10,0],[Infinity,0,10,0],[0,0,NaN,0],[0,0,Infinity,0],[0,0,10,Infinity],[0,0,10,NaN],[0,0,10,-Infinity]])compare(world,...args);
 for(const args of [[NaN,0,1,1],[-Infinity,-Infinity,Infinity,Infinity],[1,1,-1,-1]])assert.deepEqual(groundBoxes.query(...args),[0,1,2,3]);
 for(const size of [0,-1,NaN,Infinity,'2'])assert.throws(()=>new ColliderGrid(world.boxes,'box',size),RangeError);
 const defaultGrid=new ColliderGrid(world.boxes,'box');assert.equal(defaultGrid.cellSize,16);
 assert.throws(()=>{defaultGrid.cellSize=2;},TypeError,'cell layout cannot silently change after construction');
});
