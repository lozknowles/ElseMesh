import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/index.js';
import {Navigation} from '../src/npc/Navigation.js';
import {AutonomousCharacter} from '../src/npc/AutonomousCharacter.js';
import {compileSplatScenePhysics} from '../src/world-runtime/SplatScenePhysics.js';

// Optional captured-world qualification: normal CPU tests have no external fixture dependency.
// Supply ELSEMESH_COLLIDER_CAPTURE and ELSEMESH_COLLIDER_PROJECT explicitly.
const capturePath=process.env.ELSEMESH_COLLIDER_CAPTURE;
const decode=n=>n&&typeof n==='object'&&'number'in n?n.number==='-0'?-0:Number(n.number):n;
const values=point=>point.map(decode);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const view=new DataView(new ArrayBuffer(8));
const bits=n=>{view.setFloat64(0,n,false);return view.getUint32(0,false).toString(16).padStart(8,'0')+view.getUint32(4,false).toString(16).padStart(8,'0');};

test('actual implementation reproduces the captured failed233-expansion search and every exact ground result',
 {skip:!capturePath,timeout:120000},async()=>{
 assert.ok(process.env.ELSEMESH_COLLIDER_PROJECT,'Explicit pinned scene descriptor required');
 const captureBytes=fs.readFileSync(capturePath);assert.ok(captureBytes.length<=80000000);
 assert.equal(sha(captureBytes),'976ffa5a9ae0b77cd1091dd46870348c9dd92970519ec2fb1341541c3374a696');
 const raw=JSON.parse(captureBytes),profile=raw.diagnostics.find(d=>d.kind==='native-moving').queryCapture,c=profile.captured;
 assert.equal(raw.captureValid,true);assert.equal(profile.observerErrors,0);assert.equal(c.truncated,false);
 assert.equal(c.immutableRecordsEqual,true);assert.equal(c.groundResultsConsistent,true);
 assert.equal(c.lastExpanded,233);assert.equal(c.result,null);assert.equal(c.groundOrder.length,38826);
 const colliders=new Colliders();
 colliders.boxes=c.before.boxes.map(b=>({...b,center:new Vector3(...values(b.center)),half:new Vector3(...values(b.half)),
  rotY:decode(b.rotY),cos:decode(b.cos),sin:decode(b.sin),radius:decode(b.radius),top:decode(b.top),bottom:decode(b.bottom)}));
 colliders.cylinders=c.before.cylinders.map(b=>Object.fromEntries(Object.entries(b).map(([k,v])=>[k,k==='tag'?v:decode(v)])));
 const index=colliders._spatialIndex(null);assert.equal(index.groundBoxes.cellSize,2);assert.equal(index.boxes.cellSize,16);assert.equal(index.cylinders.cellSize,16);
 assert.equal(index.groundBoxes.usingFallback,false,'captured world must actually use the hierarchy');
 assert.equal(index.groundBoxes.fallback.records,colliders.boxes,'complete fallback shares current records');
 for(const query of c.grids.boxes.queries){const args=query.args.map(decode),baseline=index.boxes.query(...args).slice(),ground=index.groundBoxes.query(...args);
  assert.equal(baseline.length,query.returned);assert.deepEqual(ground,baseline,'exact original ordered candidate list');}
 const tuples=c.ground.map(g=>g.args.map(decode));
 for(const id of c.groundOrder){const result=colliders.groundHeightAt(...tuples[id]);assert.equal(bits(result),c.ground[id].resultBits);}
 const project=JSON.parse(fs.readFileSync(process.env.ELSEMESH_COLLIDER_PROJECT)),physicsBytes=fs.readFileSync(raw.replayPhysics.path);
 assert.equal(sha(physicsBytes),raw.replayPhysics.sha256);assert.equal(sha(physicsBytes),project.splatScene.physics.sha256);
 const physics=await compileSplatScenePhysics(project,physicsBytes),actor={...c.actor};
 const nav=new Navigation({terrain:physics.terrain,colliders,config:c.config,
  admitSegment:(a,b)=>AutonomousCharacter.prototype.admitMovement.call(actor,a,b)});actor.nav=nav;
 let calls=0;const original=colliders.groundHeightAt;
 colliders.groundHeightAt=function(...args){const expected=c.ground[c.groundOrder[calls++]];assert.ok(expected,'no extra ground calls');
  assert.equal(args.map(bits).join(':'),expected.bits,'bit-exact ordered ground arguments');
  const result=original.apply(this,args);assert.equal(bits(result),expected.resultBits,'bit-exact ordered ground result');return result;};
 const start=performance.now();let result;
 try{result=nav.findPath(new Vector3(...values(c.start)),new Vector3(...values(c.goal)));}
 finally{colliders.groundHeightAt=original;}
 const wallMs=performance.now()-start;
 assert.equal(result,null);assert.equal(nav.lastExpanded,233);assert.equal(calls,38826);
 if(process.env.ELSEMESH_COLLIDER_RECEIPT){const path=process.env.ELSEMESH_COLLIDER_RECEIPT;assert.equal(fs.existsSync(path),false,'Preserve prior receipt');
  fs.writeFileSync(path,JSON.stringify({passed:true,at:new Date().toISOString(),captureSha256:sha(captureBytes),groundCellSize:2,capsuleCellSize:16,rayCellSize:16,
   candidateLists:c.grids.boxes.queries.length,groundCalls:calls,lastExpanded:nav.lastExpanded,path:result,diagnosticInstrumentedSearchWallMs:wallMs,
   note:'Actual imported Colliders/Navigation implementation; no grid derivative, cache or quantization. Instrumented CPU replay is not gameplay timing.',
   sourceHashes:Object.fromEntries(['../src/world/ColliderGrid.js','../src/world/GroundColliderHierarchy.js','../src/world/Colliders.js','../src/npc/Navigation.js'].map(p=>[p,sha(fs.readFileSync(new URL(p,import.meta.url)))]))},null,2)+'\n');}
});
