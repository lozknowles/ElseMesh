import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {loadWorldSource,describeRuntimeWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {compileSplatScenePhysics} from '../src/world-runtime/SplatScenePhysics.js';
import {prepareNativeIslandPhysics} from '../network/repository-native-physics.mjs';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/index.js';
import {makeFixture} from './public-microduck.mjs';
const bundle=process.env.PUBLIC_MICRODUCK_BUNDLE;
test('actual pinned public Warehouse and Sunset physics permit autonomous roundtrip inside reviewed support',{skip:!bundle},async()=>{
 const catalog=JSON.parse(await readFile(bundle+'/published-worlds.json','utf8')),candidates=[];
 for(const entry of catalog.worlds){const base=bundle+'/'+entry.bundlePath,read=async p=>new Uint8Array(await readFile(base+p)),loaded=await loadWorldSource({kind:'local',label:entry.worldId,read},{expectedWorldId:entry.worldId,expectedContentDigest:entry.contentDigest}),project=loaded.project,native=await prepareNativeIslandPhysics(project,read),descriptor=describeRuntimeWorld(project),colliders=new Colliders();for(const b of descriptor.boxes)colliders.addBox(new Vector3(...b.center),new Vector3(...b.half),b.rotY??b.yaw??0,{walkable:b.walkable,solid:b.solid,tag:b.id});
  let physics=null,terrain=native?{heightAt:native.heightAt}:descriptor.terrain;if(project.splatScene){physics=await compileSplatScenePhysics(project,await read(project.splatScene.physics.path));terrain=physics.terrain;for(const box of colliders.boxes??[])physics.colliders.boxes.push(box);}
  const {T}=await import('../src/world-runtime/vendor/world-engine-contract.js');candidates.push({descriptor,project,root:new T.Group(),terrain,colliders:physics?.colliders??colliders,splatScene:physics?{physics}:undefined});
 }
 const f=makeFixture({candidates}),duck=f.duck;f.runtime.catalog.routes=catalog.routes;await Promise.all(candidates.map(c=>duck.install(c)));const transitions=[],started=performance.now();let peak=0,last=0;
 for(let n=0;n<180*30;n++){const begin=performance.now();duck.update(1/30);peak=Math.max(peak,performance.now()-begin);if(duck.actor?.pending)await duck.actor.transferPromise;const a=duck.actor;assert.ok(a,JSON.stringify(duck.diagnostics()));const context=duck.context(a.worldId);assert.ok(a.nav.surface(a.position),'Every committed sample supports the actual capsule');if(context.candidate.splatScene)assert.ok(context.candidate.splatScene.physics.clearance(a.position.toArray(),{radius:.1,height:.275,footRadius:.1,stepHeight:.001}));if(a.traversalCount!==last){last=a.traversalCount;transitions.push({time:(n+1)/30,...a.snapshot()});}if(last>=2&&a.egressStatus==='complete')break;}
 const report={passed:last>=2,transitions,elapsedCPUms:performance.now()-started,peakUpdateMs:peak,diagnostics:duck.diagnostics(),physicsSha:candidates[1].project.splatScene.physics.sha256};if(process.env.PUBLIC_MICRODUCK_EVIDENCE)await writeFile(process.env.PUBLIC_MICRODUCK_EVIDENCE,JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.ok(last>=2,'Actual roundtrip within180s');assert.equal(duck.actor.worldId,catalog.openingWorldId);duck.dispose();
});
