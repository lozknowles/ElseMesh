import assert from 'node:assert/strict';
import test from 'node:test';
import { Bench } from '../src/core/Bench.js';
import { GPU } from '../src/engine/gpu/GPU.js';

const bench = () => { const b = Object.create(Bench.prototype); b.frames=[]; b.captureDiagnostics={submitted:0,captured:0,invalidFrames:0,ringDrops:0,mapFailures:0}; b._captureId=0; return b; };

test('GPU occurrences preserve repeated labels, overlap, gaps, order and large clock precision', () => {
  const b = bench(), base = 100000000000000000n;
  b._frameResult(['repeat','repeat','gap'], BigInt64Array.from([base,base+4000000n,base+2000000n,base+3000000n,base+6000000n,base+7000000n]), {gpuFrame:42,captureId:9});
  const f = b.frames[0];
  assert.equal(f.gpu,7); assert.equal(f.gpuFrame,42); assert.equal(f.captureId,9);
  assert.deepEqual(f.occurrences.map(o=>[o.index,o.label,o.beginMs,o.endMs,o.durationMs]), [[0,'repeat',0,4,4],[1,'repeat',2,3,1],[2,'gap',6,7,1]]);
  assert.equal(f.passes.get('repeat'),2); assert.equal(f.passes.get('gap'),1);
  b._frameResult(['invalid'],new BigInt64Array([0n,0n]));
  assert.equal(b.frames.length,1); assert.equal(b.captureDiagnostics.invalidFrames,1);
});

test('readbacks completing out of order keep submission-bound frame/capture identities', async () => {
  const b = bench(), oldEncoder = GPU.encoder, oldFrame = GPU.frame, oldSubmit = GPU.onSubmit, oldMapMode = globalThis.GPUMapMode;
  const hooks=[], releases=[];
  const slot = value => ({busy:false,buffer:{mapAsync:()=>new Promise(resolve=>releases.push(resolve)),getMappedRange:()=>new BigInt64Array([1n,value]).buffer,unmap(){}}});
  b.ring=[slot(1000001n),slot(2000001n)]; b.resolve={}; b.querySet={};
  GPU.encoder={resolveQuerySet(){},copyBufferToBuffer(){}}; GPU.onSubmit=(_,after)=>hooks.push(after); globalThis.GPUMapMode={READ:1};
  try {
    GPU.frame=11; b._labels=['first']; b._resolveFrame();
    GPU.frame=12; b._labels=['second']; b._resolveFrame();
    hooks.forEach(h=>h()); GPU.frame=999;
    releases[1](); await Promise.resolve(); releases[0](); await Promise.resolve();
    assert.deepEqual(b.frames.map(f=>[f.gpuFrame,f.captureId,f.occurrences[0].label]),[[12,2,'second'],[11,1,'first']]);
    assert.equal(b.ring.every(s=>!s.busy),true);
  } finally { GPU.encoder=oldEncoder; GPU.frame=oldFrame; GPU.onSubmit=oldSubmit; globalThis.GPUMapMode=oldMapMode; }
});

test('ring exhaustion and failed readbacks retain diagnostics without inventing frames', async () => {
  const b = bench(), oldEncoder = GPU.encoder, oldSubmit = GPU.onSubmit, oldMapMode = globalThis.GPUMapMode;
  GPU.encoder={resolveQuerySet(){},copyBufferToBuffer(){}}; globalThis.GPUMapMode={READ:1};
  let after;
  GPU.onSubmit=(_,hook)=>{after=hook;};
  try {
    b.ring=[{busy:true}]; b._labels=['dropped']; b._resolveFrame();
    assert.equal(b.captureDiagnostics.ringDrops,1); assert.equal(b._labels.length,0);
    const slot={busy:false,buffer:{mapAsync:()=>Promise.reject(Error('map failed'))}};
    b.ring=[slot]; b._labels=['failed']; b._resolveFrame(); after();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(b.captureDiagnostics.mapFailures,1);
    assert.equal(b.captureDiagnostics.lastMapError,'map failed');
    assert.equal(slot.busy,false); assert.equal(b.frames.length,0);
    assert.equal(b.captureDiagnostics.submitted,2);
  } finally { GPU.encoder=oldEncoder; GPU.onSubmit=oldSubmit; globalThis.GPUMapMode=oldMapMode; }
});
