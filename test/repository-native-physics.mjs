import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadWorldSource,sampleTerrain} from '../src/world-runtime/vendor/world-engine-contract.js';
import {prepareNativeIslandPhysics} from '../network/repository-native-physics.mjs';
import {sampleNativeField} from '../src/world-runtime/NativeIslandTerrain.js';
import {createRepositoryMotionClearance} from '../network/repository-motion-clearance.mjs';
const root=process.env.ELSEMESH_NATIVE_WORLD_ROOT,raw=process.env.ELSEMESH_RAW_EVIDENCE_ROOT;
if(!root||!raw)throw Error('Native physics fixture requires ELSEMESH_NATIVE_WORLD_ROOT and ELSEMESH_RAW_EVIDENCE_ROOT; see tools/worlds/NATIVE-ISLAND-EXPORT.md.');
const source={kind:'local',label:'actual native draft read only',read:async(p,n)=>{const b=await readFile(join(root,p));if(b.length>n)throw Error('Read bound');return b;}};
const {project}=await loadWorldSource(source);
test('authority loads only 16 MiB declared fine heights and uses the renderer exact cell-centred sampler',{timeout:30000},async()=>{
 const requested=[];const physics=await prepareNativeIslandPhysics(project,async(p,n)=>{requested.push(p);return source.read(p,n);});assert.equal(physics.bytes,16*1024*1024);assert.equal(physics.tiles,256);assert(Object.isFrozen(physics));const refs=project.nativeIsland.resources.filter(r=>r.channel==='height'&&r.level===0);assert.equal(requested.length,256);assert(requested.every(p=>refs.some(r=>r.path===p)));
 const bytes=await readFile(join(raw,'original-heights.f32'));
 const original=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));const points=[[-42,-505],[-238.3,-458.2],[152.25,-466.75],[-110.2,-420.7],[20.1,-360.6],[55,-40],[0,-60]];let coarseDiff=0;for(const [x,z]of points){const fine=physics.heightAt(x,z),renderer=sampleNativeField(original,2048,-1024,2048,x,z);assert.equal(fine,renderer);if(Math.abs(fine-sampleTerrain(project.terrain,x,z))>.05)coarseDiff++;const clear=createRepositoryMotionClearance({colliders:[],heightAt:physics.heightAt,width:2048,depth:2048});assert.equal(typeof clear([x,fine-.2,z]),'boolean');assert.equal(clear([x,fine-.2,z]),false);assert.equal(clear([x,fine+.1,z]),true);}assert(coarseDiff>=2,'Fine ridges/valleys must actually differ from the old coarse editable surface');assert.equal(physics.heightAt(-1024,0),-90);
});
test('missing, corrupt, non-finite or wrong-dimension declared fine terrain fails admission',{timeout:30000},async()=>{
 const first=project.nativeIsland.resources.find(r=>r.channel==='height'&&r.level===0);
 await assert.rejects(prepareNativeIslandPhysics(project,async(p,n)=>{if(p===first.path)throw Error('missing fine terrain');return source.read(p,n);}),/missing/);
 await assert.rejects(prepareNativeIslandPhysics(project,async(p,n)=>{const b=Buffer.from(await source.read(p,n));if(p===first.path)b[0]^=1;return b;}),/hash|size/i);
 const malformed=structuredClone(project);malformed.nativeIsland.resources.find(r=>r.id===first.id).width=127;await assert.rejects(prepareNativeIslandPhysics(malformed,source.read),/dimensions|coverage|reference|length/i);
 const bad=Buffer.from(await source.read(first.path,first.bytes));bad.writeFloatLE(NaN,0);const sha=createHash('sha256').update(bad).digest('hex'),nan=structuredClone(project);const ref=nan.nativeIsland.resources.find(r=>r.id===first.id);ref.path='native-island/'+sha+'.bin';ref.sha256=sha;await assert.rejects(prepareNativeIslandPhysics(nan,async(p,n)=>p===ref.path?bad:source.read(p,n)),/Non-finite/i);
});
test('legacy clearance stays a synchronous Boolean; native absence is not asynchronous fallback',async()=>{assert.equal(await prepareNativeIslandPhysics({nativeIsland:undefined},()=>{throw Error('unexpected read');}),null);const clear=createRepositoryMotionClearance({colliders:[],heightAt:()=>10,width:100,depth:100});const denied=clear([0,9,0]);assert.equal(denied,false);assert.equal(typeof denied,'boolean');assert.equal(denied?.then,undefined);});
