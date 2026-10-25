import test from 'node:test';
import assert from 'node:assert/strict';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/index.js';
const add=(c,center,half,yaw=0,walkable=true)=>c.addBox(new Vector3(...center),new Vector3(...half),yaw,{walkable});
const both=check=>{for(const indexed of [false,true]){const c=new Colliders();c.optimizeSpatialQueries=indexed;check(c,indexed);}};
const worldPoint=(b,x,z)=>[b.center.x+x*b.cos+z*b.sin,b.center.z-x*b.sin+z*b.cos];

test('real Sunset fitted-cell lower/shared edges remain inclusively supported in both query paths',()=>both(c=>{
 // Exact candidate records and grid point from the 217 pre-fix failures.
 const a=add(c,[-2.6999999999999997,-.02407315984093484,1.0000000000000004],[.10000000000000009,.025,.09999999999999998]);
 const b=add(c,[-2.5,-.023991254937331983,1.0000000000000004],[.10000000000000009,.025,.09999999999999998]);
 const x=-2.6,z=.9000000000000004;
 assert.ok(Math.abs(z-a.center.z)>a.half.z,'fixture must reproduce the observed 1e-16 bound miss');
 assert.equal(c.groundHeightAt(x,z,.35),Math.max(a.top,b.top));
 assert.equal(c.groundHeightAt(x,z-1e-5,.35),-Infinity,'a real gap/outside footprint is not manufactured into support');
}));
test('rotated footprint edges and corners are inclusive without borrowing nearby ground',()=>both(c=>{
 for(const [center,yaw]of [[[17.3,.7,-9.2],.73],[[-123.4,.7,35.1],-1.17]]){
  const b=add(c,center,[.3,.2,.2],yaw),[x,z]=worldPoint(b,.3,.2);
  assert.equal(c.groundHeightAt(x,z,2),b.top);
  const [outsideX,outsideZ]=worldPoint(b,.3+1e-5,.2);
  assert.equal(c.groundHeightAt(outsideX,outsideZ,2),-Infinity);
 }
}));
test('a genuine 1e-5 unsupported gap remains unsupported',()=>both(c=>{
 add(c,[-.500005,-.1,0],[.5,.1,.5]);add(c,[.500005,-.1,0],[.5,.1,.5]);
 assert.equal(c.groundHeightAt(0,0,1),-Infinity);
 assert.equal(c.groundHeightAt(-.00001,0,1),0);assert.equal(c.groundHeightAt(.00001,0,1),0);
}));
test('isolated footprints do not gain meaningful outside support or a higher neighbor surface',()=>both(c=>{
 add(c,[0,-.1,0],[.5,.1,.5]);add(c,[1.00001,.9,0],[.5,.1,.5]);
 assert.equal(c.groundHeightAt(.5,0,2),0,'higher neighbor starts 1e-5 beyond this point');
 assert.equal(c.groundHeightAt(-.5-1e-10,0,2),-Infinity);
 assert.equal(c.groundHeightAt(.500005,0,2),-Infinity);
}));
test('large-coordinate tolerance is capped instead of widening a local footprint',()=>both(c=>{
 const b=add(c,[1e9,-.1,-1e9],[.1,.1,.1]);
 assert.equal(c.groundHeightAt(b.center.x,b.center.z,1),0);
 // Uncapped 32*EPS*1e9 is about 7e-6; this representable ~1e-6
 // outside point MUST fail. Far-world roundoff is not silently repaired.
 assert.equal(c.groundHeightAt(b.center.x+.100001,b.center.z,1),-Infinity);
 assert.equal(c.groundHeightAt(b.center.x,b.center.z+.100001,1),-Infinity);
}));
test('maxY and walkability remain exact, while explicit pad retains its existing meaning',()=>both(c=>{
 const b=add(c,[0,.2,0],[.1,.1,.1]);add(c,[0,1,0],[.1,.1,.1],0,false);
 assert.equal(c.groundHeightAt(0,0,b.top-1e-12),-Infinity);
 assert.equal(c.groundHeightAt(0,0,5),b.top);
 assert.equal(c.groundHeightAt(.149,0,5,.05),b.top);
 assert.equal(c.groundHeightAt(.08+1e-10,0,5,-.02),-Infinity);
}));
test('ground-edge rounding allowance does not change capsule collision resolution',()=>both(c=>{
 add(c,[0,-.05,0],[2,.05,2]);add(c,[0,1,0],[.5,1,.5],0,false);
 const p=new Vector3(.6,0,0);assert.equal(c.resolveCapsule(p,.3,1.8,.001),true);
 assert.ok(Math.abs(p.x-.8)<1e-12);assert.equal(p.y,0);assert.equal(p.z,0);
}));
