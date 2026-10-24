import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {captureNativeIsland,CHANNELS,tileField,downsample} from '../tools/worlds/export-native-island.mjs';
const root=join(resolve(process.env.ELSEMESH_NATIVE_EVIDENCE_ROOT??'.local-evidence/native-island-20261024'),'loz'),raw=process.env.ELSEMESH_RAW_EVIDENCE_ROOT;
if(!raw||!process.env.ELSEMESH_SOURCE_ROOT)throw Error('Native export fixture requires ELSEMESH_RAW_EVIDENCE_ROOT and ELSEMESH_SOURCE_ROOT; see tools/worlds/NATIVE-ISLAND-EXPORT.md.');
const manifest=JSON.parse(await readFile(join(root,'native-island.json')).catch(error=>{throw Error('Missing native export fixture; configure ELSEMESH_NATIVE_EVIDENCE_ROOT: '+error.message);})),evidence=JSON.parse(await readFile(join(root,'evidence.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
assert.deepEqual(manifest.grid,{resolution:2048,size:2048,origin:[-1024,-1024],sampleConvention:'cell-centred',tileSize:128,halo:0});
let checkedBytes=0;for(const [name,[Type,channels]]of Object.entries(CHANNELS)){
 const out=new Type(2048*2048*channels),refs=manifest.resources.filter(r=>r.channel===name&&r.level===0);assert.equal(refs.length,256);
 for(const ref of refs){const b=await readFile(join(root,ref.path));assert.equal(hash(b),ref.sha256);assert.equal(b.length,ref.bytes);const a=new Type(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));let min=Infinity,max=-Infinity;for(const n of a){min=Math.min(min,n);max=Math.max(max,n);}assert.equal(min,ref.min);assert.equal(max,ref.max);for(let z=0;z<ref.height;z++)out.set(a.subarray(z*ref.width*channels,(z+1)*ref.width*channels),((ref.z+z)*2048+ref.x)*channels);checkedBytes+=b.length;}
 if(!['normal','splat'].includes(name)){const file='original-'+(name==='height'?'heights':name)+(Type===Float32Array?'.f32':'.u8');assert.equal(hash(Buffer.from(out.buffer)),hash(await readFile(join(raw,file))),'Every exact cell '+name);}
}
const vegRef=manifest.resources.find(r=>r.channel==='vegetation'),veg=JSON.parse(await readFile(join(root,vegRef.path)));let count=0;for(const [species,records]of Object.entries(veg.records)){assert.equal(records.length,evidence.counts[species]);for(const r of records){assert(r.seed>=0&&r.seed<=1);assert(!evidence.clearance.some(c=>Math.hypot(r.x-c.x,r.z-c.z)<c.r+2));}count+=records.length;}assert.equal(count,vegRef.width);assert.deepEqual(evidence.recordKeys,['H','l','la','s','seed','sy','x','y','yaw','z']);
assert.equal(manifest.assets.length,7);for(const asset of manifest.assets){const b=await readFile(join(root,asset.path));assert.equal(hash(b),asset.sha256);assert.equal(b.length,asset.bytes);if(asset.mediaType==='image/jpeg'){assert.equal(b.readUInt16BE(0),0xffd8);assert(asset.width>0&&asset.height>0);}}
assert.equal(manifest.vegetationRecipe,'elsemesh.native-vegetation/1');for(const binding of Object.values(manifest.vegetationTextures))for(const id of Object.values(binding))assert(manifest.assets.some(a=>a.id===id&&a.mediaType==='image/jpeg'));
const repeat=await captureNativeIsland({kind:'loz',evidenceRoot:resolve('.local-evidence/native-island-20261024/repeat')});assert.deepEqual(repeat.native,manifest,'Independent exact CPU bake/scatter/shore repeat hashes and metadata');
const report={result:'PASS',checkedFineFieldBytes:checkedBytes,exactRawChannels:8,fieldResources:manifest.resources.length,plants:count,repeat:'All resource hashes and native metadata identical after independent original CPU bake, shore solve and deterministic scatter',nativeVisualAcceptance:'PENDING'};await writeFileSafe(join(root,'tests.json'),report);console.log(JSON.stringify(report));
async function writeFileSafe(path,value){const {writeFile}=await import('node:fs/promises');await writeFile(path,JSON.stringify(value,null,2)+'\n');}
