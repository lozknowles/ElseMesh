import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from '../src/engine/index.js';
import { Colliders } from '../src/world/Colliders.js';
import { Navigation, BASE_WALK_SPEED } from '../src/npc/Navigation.js';
import { AutonomousCharacter } from '../src/npc/AutonomousCharacter.js';
import { createWorld, describeRuntimeWorld, mapPortalPoint, mapPortalDirection, mapPortalYaw, portalWorldPoint, portalLocalPoint } from '../src/world-runtime/vendor/world-engine-contract.js';
const terrain={heightAt:()=>0};
const world=()=>({worldId:'a',terrain,colliders:new Colliders(),position:[0,0,0]});
const portal=(id,worldId,destId,position=[0,1,0],yaw=0)=>({id,position,yaw,width:1,height:2,enabled:true,traversal:{enabled:true},destination:{worldId,portalId:destId}});
function ticks(actor,n){for(let i=0;i<n;i++)actor.update(1/30);}
test('real collision world plans around solid box, bounded and collision-free along every edge',()=>{
 const colliders=new Colliders();colliders.addBox(new Vector3(.6,.4,0),new Vector3(.15,.4,.3));const nav=new Navigation({terrain,colliders});
 const start=new Vector3(0,0,0),goal=new Vector3(1.2,0,0),path=nav.findPath(start,goal);assert.ok(path?.length>1);assert.ok(nav.lastExpanded<=nav.config.maxNodes);let previous=start;
 for(const p of path){assert.ok(nav.segment(previous,p));previous=p;}assert.ok(previous.distanceTo(goal)<1e-8);
});
test('whole footprint rejects unsupported edge, steep slope, and excessive step/drop',()=>{
 const colliders=new Colliders();let nav=new Navigation({terrain:{heightAt:(x,z)=>x>.04?-Infinity:0},colliders});assert.equal(nav.surface(new Vector3()),null);
 nav=new Navigation({terrain:{heightAt:x=>x*2},colliders});assert.equal(nav.surface(new Vector3()),null);
 nav=new Navigation({terrain:{heightAt:x=>x>.1?.2:0},colliders});assert.equal(nav.segment(new Vector3(),new Vector3(.3,0,0)),null);
 nav=new Navigation({terrain:{heightAt:x=>x>.1?-.2:0},colliders});assert.equal(nav.segment(new Vector3(),new Vector3(.3,0,0)),null);
});
test('spawn safely grounded; missing ground stays stopped; spectator and inactive never advance',()=>{
 const a=new AutonomousCharacter({...world(),position:[0,4,0]});assert.equal(a.position.y,0);
 const bad=new AutonomousCharacter({...world(),terrain:{heightAt:()=>NaN}});ticks(bad,200);assert.equal(bad.state,'Recover');assert.deepEqual(bad.position.toArray(),[0,0,0]);
 const spectator=new AutonomousCharacter({...world(),authority:false});const before=spectator.snapshot();ticks(spectator,100);assert.deepEqual(spectator.snapshot(),before);spectator.setAuthority(true);spectator.setActive(false);ticks(spectator,100);assert.deepEqual(spectator.snapshot(),{...before,active:false});
});
test('seeded exploration deterministic, snapshot restores continuation and dt bounds motion',()=>{
 const a=new AutonomousCharacter({...world(),id:'d',seed:42}),b=new AutonomousCharacter({...world(),id:'d',seed:42});ticks(a,400);ticks(b,400);assert.deepEqual(a.snapshot(),b.snapshot());
 const c=new AutonomousCharacter({...world(),id:'d',restore:a.snapshot()});ticks(a,100);ticks(c,100);assert.deepEqual(a.snapshot(),c.snapshot());const p=a.position.clone();a.update(100);assert.ok(a.position.distanceTo(p)<=.25*.2+1e-7);
});
test('invalid/disabled portals never traverse; obstacles enter bounded recovery and resume',()=>{
 const a=new AutonomousCharacter({...world(),portals:[{id:'bad',enabled:true}],canTraverse:()=>true,transfer:()=>{throw Error('must not call');}});ticks(a,300);assert.equal(a.traversalCount,0);assert.equal(a.pending,false);
 a.transition('Navigate');a.path=[new Vector3(.5,0,0)];a.colliders.addBox(new Vector3(.1,.4,0),new Vector3(.03,.4,.3));ticks(a,30);assert.notEqual(a.state,'TraversePortal');assert.ok(a.position.x<.04);
});
test('physical front-side portal crossing transforms pose, validates ground before commit, cooldown prevents bounce',async()=>{
 const source=portal('p','b','q'),dest=portal('q','a','p',[10,1,3],Math.PI/2);let calls=0,commits=0;
 const a=new AutonomousCharacter({...world(),position:[0,0,.12],portals:[source],canTraverse:()=>({destinationPortal:dest}),transfer:async request=>{calls++;assert.ok(request.sourcePosition[2]<=0);return {worldId:'b',terrain,colliders:new Colliders(),portals:[dest],destinationPortal:dest,commit:async()=>{commits++;}};}});
 a.portal=source;a.path=[new Vector3(0,0,-.15)];a.transition('TraversePortal');ticks(a,100);await a.transferPromise;
 assert.equal(calls,1);assert.equal(commits,1);assert.equal(a.worldId,'b');assert.equal(a.traversalCount,1);assert.ok(a.cooldown>0);assert.equal(a.eligible(dest),false);assert.ok(portalLocalPoint(dest,a.position.toArray())[2]>=0);
 const expected=mapPortalPoint(source,dest,[0,0,-.01]);const back=mapPortalPoint(dest,source,expected);assert.ok(Math.abs(back[2]+.01)<1e-8);assert.ok(mapPortalDirection(source,dest,[0,0,-1]).every(Number.isFinite));assert.ok(Number.isFinite(mapPortalYaw(source,dest,0)));
});
test('unknown/pending transfer freezes owner, invalid destination cannot commit, remote receipt deactivates source',async()=>{
 const source=portal('p','b','q'),dest=portal('q','a','p');let committed=false;
 const a=new AutonomousCharacter({...world(),portals:[source],canTraverse:()=>true,transfer:async()=>({worldId:'b',terrain:{heightAt:()=>NaN},colliders:new Colliders(),destinationPortal:dest,commit:async()=>{committed=true;}})});
 a.portal=source;a.beginTransfer(source,a.position.clone());await a.transferPromise;assert.equal(committed,false);assert.equal(a.transferStatus,'unknown');assert.equal(a.pending,true);const before=a.snapshot();ticks(a,100);assert.deepEqual(a.snapshot(),before);
 await a.reconcileTransfer({remote:true,receipt:{state:'committed'}});assert.equal(a.active,false);assert.equal(a.traversalCount,1);
});

test('canonical procedural project CPU terrain supports autonomous exploration with bounded planner work',t=>{
 const project=createWorld('Microduck native terrain qualification'),descriptor=describeRuntimeWorld(project),colliders=new Colliders();
 for(const box of descriptor.boxes)colliders.addBox(new Vector3(...box.center),new Vector3(...box.half),0,box);
 const actor=new AutonomousCharacter({worldId:descriptor.worldId,terrain:descriptor.terrain,colliders,position:descriptor.spawn.position});const start=actor.position.clone();let peakMs=0,expanded=0;
 for(let i=0;i<900;i++){const before=performance.now();actor.update(1/30);peakMs=Math.max(peakMs,performance.now()-before);expanded=Math.max(expanded,actor.nav.lastExpanded);assert.ok(actor.nav.surface(actor.position));}
 assert.ok(actor.position.distanceTo(start)>.2);assert.ok(expanded<=actor.nav.config.maxNodes);t.diagnostic(`canonical CPU terrain: 900 updates peak=${peakMs.toFixed(3)}ms expanded=${expanded} distance=${actor.position.distanceTo(start).toFixed(3)}m`);
});

test('walk displacement matches measured asset gait speed and configured speed scales walk clock',()=>{
 for(const scale of [1,2]){const actor=new AutonomousCharacter({...world(),config:{speed:BASE_WALK_SPEED*scale}});actor.path=[new Vector3(0,0,1)];actor.transition('Navigate');ticks(actor,30);assert.ok(Math.abs(actor.position.z-BASE_WALK_SPEED*scale)<1e-9);assert.ok(Math.abs(actor.clipTime-scale)<1e-9);assert.equal(actor.clip,'Walk');}
});

test('missing restored RNG preserves initialized seed and explicit zero remains zero',()=>{const actor=new AutonomousCharacter({...world(),id:'npc:seed',seed:123});const initial=actor.snapshot();const partial={...initial};delete partial.rng;actor.restore(partial);assert.equal(actor.rng,123);actor.restore({...initial,rng:0});assert.equal(actor.rng,0);const saved=actor.snapshot();const restored=new AutonomousCharacter({...world(),id:'npc:seed',seed:999,restore:saved});assert.equal(restored.rng,0);assert.deepEqual(restored.snapshot().position,saved.position);});

function arrivalActor(yaw=Math.PI/2,config={}){
 const p=portal('arrival','a','source',[4,1,-3],yaw),position=portalWorldPoint(p,[0,-1,.001]),egressTarget=portalWorldPoint(p,[0,-1,.4]);
 const actor=new AutonomousCharacter({...world(),worldId:'b',position,portals:[p],config:{portalProbability:0,...config}});
 actor.restore({...actor.snapshot(),state:'EgressPortal',clip:'ExitPortal',clipTime:0,timer:.65,arrivalPortalId:p.id,egressTarget,egressPending:true,egressStatus:'pending',cooldown:8,traversalCount:1});return {actor,portal:p};
}
test('rotated restored arrival exits forward before consuming RNG or wandering, retains checkpoint',()=>{
 const {actor,portal:p}=arrivalActor(),rng=actor.rng,start=actor.position.clone();ticks(actor,18);assert.equal(actor.clip,'ExitPortal');assert.ok(actor.position.distanceTo(start)<1e-10);assert.equal(actor.rng,rng);
 ticks(actor,3);assert.equal(actor.state,'EgressPortal');assert.equal(actor.clip,'Walk');assert.ok(portalLocalPoint(p,actor.position.toArray())[2]>.001);assert.equal(actor.rng,rng);
 const checkpoint=actor.snapshot(),restored=new AutonomousCharacter({...world(),worldId:'b',id:actor.id,portals:[p],config:{portalProbability:0},restore:checkpoint});
 for(let i=0;i<260&&actor.egressPending;i++){const before=portalLocalPoint(p,actor.position.toArray())[2];actor.update(1/30);restored.update(1/30);assert.ok(portalLocalPoint(p,actor.position.toArray())[2]>=before-1e-8);assert.deepEqual(actor.snapshot(),restored.snapshot());}
 assert.equal(actor.egressPending,false);assert.equal(actor.egressStatus,'complete');assert.ok(portalLocalPoint(p,actor.position.toArray())[2]>=.39);assert.equal(actor.rng,rng);actor.update(1/30);assert.notEqual(actor.rng,rng);assert.equal(actor.config.portalProbability,0);
});
test('cooldown guard blocks aperture strip and both crossing directions but allows finite sides and outward near-plane egress',()=>{
 const {actor,portal:p}=arrivalActor(1.1),at=(x,z,y=-1)=>new Vector3(...portalWorldPoint(p,[x,y,z]));
 assert.ok(actor.nav.segment(at(0,.001),at(0,.04)),'arrival can leave initially intersected plane');
 assert.equal(actor.nav.segment(at(0,.04),at(0,-.1)),null,'arrival cannot move backwards');
 actor.egressPending=false;assert.equal(actor.nav.segment(at(0,.4),at(0,-.4)),null);assert.equal(actor.nav.segment(at(0,-.4),at(0,.4)),null);assert.equal(actor.nav.segment(at(0,.4),at(0,.05)),null,'capsule cannot reenter before feet cross');
 assert.ok(actor.nav.segment(at(1,.4),at(1,-.4)),'finite portal is not infinite halfworld wall');
 actor.cooldown=0;assert.ok(actor.nav.segment(at(0,.4),at(0,-.4)));
});
test('blocked restored egress freezes without RNG advance and resumes only after actual route becomes clear',()=>{
 const {actor,portal:p}=arrivalActor(0),block=actor.colliders.addBox(new Vector3(4,.4,-2.8),new Vector3(.2,.4,.03));const start=actor.position.clone(),rng=actor.rng;ticks(actor,80);assert.equal(actor.egressStatus,'blocked');assert.equal(actor.state,'EgressPortal');assert.equal(actor.clip,'Stop');assert.ok(actor.position.distanceTo(start)<1e-10);assert.equal(actor.rng,rng);
 block.solid=false;ticks(actor,240);assert.equal(actor.egressPending,false);assert.ok(portalLocalPoint(p,actor.position.toArray())[2]>=actor.nav.config.radius+.02);
});
test('destination blocked egress rejects local commit and freezes pending; signed cancellation can recover source',async()=>{
 const source=portal('p','b','q'),dest=portal('q','a','p',[3,1,0],0),colliders=new Colliders();colliders.addBox(new Vector3(3,.4,.2),new Vector3(.2,.4,.03));let committed=0;
 const actor=new AutonomousCharacter({...world(),portals:[source],canTraverse:()=>({destinationPortal:dest}),transfer:async()=>({worldId:'b',terrain,colliders,portals:[dest],destinationPortal:dest,commit:async()=>{committed++;}})});actor.portal=source;actor.position.z=-.001;actor.beginTransfer(source,new Vector3(0,0,.001));await actor.transferPromise;assert.equal(committed,0);assert.equal(actor.worldId,'a');assert.equal(actor.transferStatus,'unknown');assert.equal(actor.pending,true);await actor.reconcileTransfer({cancelled:true});assert.equal(actor.pending,false);assert.equal(actor.transferStatus,'cancelled');assert.equal(actor.worldId,'a');
});
test('local transfer derives rotated destination egress and stale completion cannot replace a restored checkpoint',async()=>{
 const source=portal('p','b','q'),dest=portal('q','a','p',[4,1,-3],-.7);let release,commitData;
 const actor=new AutonomousCharacter({...world(),portals:[source],canTraverse:()=>({destinationPortal:dest}),transfer:async()=>({worldId:'b',terrain,colliders:new Colliders(),portals:[dest],destinationPortal:dest,commit:async data=>{commitData=data;await new Promise(resolve=>{release=resolve;});}})});actor.portal=source;actor.position.z=-.001;actor.beginTransfer(source,new Vector3(0,0,.001));await new Promise(resolve=>setImmediate(resolve));assert.ok(commitData);assert.equal(commitData.arrivalPortalId,dest.id);assert.ok(Math.abs(portalLocalPoint(dest,commitData.egressTarget)[2]-.4)<1e-8);
 const checkpoint=actor.snapshot();actor.restore({...checkpoint,pending:false,state:'Idle',portalId:null});release();await actor.transferPromise;assert.equal(actor.worldId,'a');assert.equal(actor.state,'Idle');assert.equal(actor.egressPending,false);
});

test('repeated physical transfers preserve identity and start a fresh destination egress each time',async()=>{
 const a=portal('a-door','b','b-door'),b=portal('b-door','a','a-door',[6,1,2],Math.PI/2),id='duck:permanent';
 const actor=new AutonomousCharacter({...world(),id,portals:[a],position:[0,0,.001],config:{portalProbability:0,speed:.25},canTraverse:p=>({destinationPortal:p.id===a.id?b:a}),transfer:async request=>({worldId:request.sourceWorldId==='a'?'b':'a',terrain,colliders:new Colliders(),portals:request.sourceWorldId==='a'?[b]:[a],destinationPortal:request.sourceWorldId==='a'?b:a})});
 actor.portal=a;actor.path=[new Vector3(0,0,-.15)];actor.transition('TraversePortal');for(let i=0;i<100&&!actor.pending;i++)actor.update(1/30);await actor.transferPromise;assert.equal(actor.worldId,'b');assert.equal(actor.state,'EgressPortal');assert.equal(actor.traversalCount,1);
 for(let i=0;i<200&&actor.egressPending;i++)actor.update(1/30);assert.equal(actor.egressPending,false);assert.ok(portalLocalPoint(b,actor.position.toArray())[2]>=.39);
 actor.cooldown=0;actor.portal=b;actor.path=[new Vector3(...portalWorldPoint(b,[0,-1,.3]))];actor.transition('ApproachPortal');for(let i=0;i<200&&!actor.pending;i++)actor.update(1/30);await actor.transferPromise;assert.equal(actor.worldId,'a');assert.equal(actor.id,id);assert.equal(actor.traversalCount,2);assert.equal(actor.state,'EgressPortal');assert.equal(actor.arrivalPortalId,a.id);assert.equal(actor.egressPending,true);assert.equal(actor.config.portalProbability,0);assert.equal(actor.cooldown,8);
});
