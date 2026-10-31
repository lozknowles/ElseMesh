import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inputSha256,patchOutputSurface,applyOutputSurfaceAnchors,createOutputSurfaceTransform,packageOutputSurfaceDerivative,outputSurfaceManifestName} from '../tools/output-surface-transform.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),vendor=path.join(root,'src/world-runtime/vendor/world-engine-contract.js');
const original=await fs.readFile(vendor,'utf8'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const qualifiedModuleSha='037f6dea42d7d076530362fed49dc96d222793e04e97c22c5cff176a3b8d0fd7';
const anchors=[
 ['renderer-owned registration','    this.isWebGLRenderer = true;'],
 ['unlit colors','function getUnlitUniformColorSpace(renderer) {\n  const currentRenderTarget = renderer.getRenderTarget();'],
 ['program tone mapping','if (currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true) {'],
 ['program output color','outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace,'],
 ['draw output color','const colorSpace = _currentRenderTarget === null ? _this.outputColorSpace : _currentRenderTarget.isXRRenderTarget === true ? _currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace;'],
 ['draw tone mapping','if (_currentRenderTarget === null || _currentRenderTarget.isXRRenderTarget === true) {']
];

test('exact qualified six-site derivative accepts normalized LF and preserves tracked source bytes',async()=>{
 const before=await fs.readFile(vendor),provenance=await fs.readFile(path.join(root,'src/world-runtime/vendor/world-engine-contract.provenance.json'));
 assert.equal(sha(original.replaceAll('\r\n','\n')),JSON.parse(provenance).bundleSha256);const result=patchOutputSurface(original);assert.equal(sha(original.replaceAll('\r\n','\n')),inputSha256);assert.equal(sha(result.code),qualifiedModuleSha);assert.deepEqual(result.manifest.edits,anchors.map(([name])=>name));
 assert.equal(patchOutputSurface(original.replaceAll('\r\n','\n').replaceAll('\n','\r\n')).code,result.code);
 assert.deepEqual(await fs.readFile(vendor),before);assert.deepEqual(await fs.readFile(path.join(root,'src/world-runtime/vendor/world-engine-contract.provenance.json')),provenance);
 assert.match(result.code,/this\.setOutputSurfacePolicy =/);assert.match(result.code,/this\.getOutputSurfacePolicy =/);
});

test('upstream byte/hash mismatch fails closed',()=>{
 assert.throws(()=>patchOutputSurface(original+'\n'),/exact pinned vendor source/);
 assert.throws(()=>patchOutputSurface(original.replace('this.isWebGLRenderer = true','this.isWebGLRenderer = false')),/exact pinned vendor source/);
});

test('each missing or duplicated exact anchor is rejected by the structural guard',()=>{
 const normalized=original.replaceAll('\r\n','\n');
 for(const [name,anchor]of anchors){assert.throws(()=>applyOutputSurfaceAnchors(normalized.replace(anchor,'')),error=>error.message==='Expected one '+name+' patch site');assert.throws(()=>applyOutputSurfaceAnchors(normalized.replace(anchor,anchor+'\n'+anchor)),error=>error.message==='Expected one '+name+' patch site');}
});

function emittedManifest(){
 const plugin=createOutputSurfaceTransform({root}),id=vendor.replaceAll('\\','/');plugin.buildStart();
 assert.equal(plugin.transform(original,path.join(root,'other/vendor/world-engine-contract.js')),null);
 assert.throws(()=>plugin.transform(original,id+'?raw'),/module id must match exactly/);
 assert.throws(()=>plugin.generateBundle.handler.call({emitFile(){}},{},{}),/did not run/);
 assert.equal(sha(plugin.transform(original,id).code),qualifiedModuleSha);
 let emitted;const bundle={'assets/contract-12345678.js':{type:'chunk',code:'export const policy=true;\n',modules:{[id]:{}}},'assets/main-12345678.js':{type:'chunk',code:'import "./contract-12345678.js";\n',modules:{}}};
 plugin.generateBundle.handler.call({emitFile:value=>{emitted=value;}},{},bundle);
 return {plugin,id,bundle,emitted,manifest:JSON.parse(emitted.source)};
}

test('plugin uses the exact module id and emits separate final chunk/module/transform provenance',()=>{
 const {plugin,id,bundle,emitted,manifest}=emittedManifest();assert.equal(emitted.fileName,outputSurfaceManifestName);assert.equal(manifest.source.sha256,inputSha256);assert.equal(manifest.transformedModule.sha256,qualifiedModuleSha);assert.match(manifest.transform.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(manifest.transformedModule.chunks,['assets/contract-12345678.js']);
 for(const [name,item]of Object.entries(bundle))assert.equal(manifest.finalChunks[name],sha(item.code));
 assert.throws(()=>plugin.generateBundle.handler.call({emitFile(){}},{},{only:{type:'chunk',code:'',modules:{}}}),/exactly one transformed vendor chunk/);
 assert.throws(()=>plugin.generateBundle.handler.call({emitFile(){}},{},{...bundle,other:{type:'chunk',code:'',modules:{[id]:{}}}}),/exactly one transformed vendor chunk/);
 assert.doesNotMatch(emitted.source,/[A-Z]:[\\/]|\\Users\\|\/home\//);
});

test('dev and build retain one aliased contract-backed Three instance',async()=>{
 const {default:config}=await import('../vite.config.js');assert.ok(config.resolve.dedupe.includes('three'));const alias=config.resolve.alias.find(row=>row.find instanceof RegExp&&row.find.test('three'));assert.equal(alias.replacement,path.join(root,'src/world-runtime/SplatThree.js'));assert.ok(config.optimizeDeps.exclude.includes('@sparkjsdev/spark'));assert.ok(config.plugins.some(p=>p.name==='elsemesh-output-surface-derivative'));
});

async function fixture(t){
 const base=path.join(root,'.local-evidence','output-surface-tests');await fs.mkdir(base,{recursive:true});const folder=await fs.mkdtemp(path.join(base,'case-'));assert.ok(folder.startsWith(base+path.sep));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
 const build=path.join(folder,'build'),output=path.join(folder,'output');await fs.mkdir(path.join(build,'assets'),{recursive:true});await fs.mkdir(path.join(output,'assets'),{recursive:true});const values=emittedManifest();
 for(const [name,item]of Object.entries(values.bundle)){await fs.writeFile(path.join(build,name),item.code);await fs.writeFile(path.join(output,name),item.code);}await fs.writeFile(path.join(build,outputSurfaceManifestName),values.emitted.source);return {build,output,...values};
}

test('publication packaging explicitly copies and byte-preserves derivative manifest and chunk closure',async t=>{
 const {build,output,emitted,manifest}=await fixture(t),metadata=await packageOutputSurfaceDerivative(build,output);assert.equal(metadata.manifest,outputSurfaceManifestName);assert.equal(metadata.sha256,sha(emitted.source));assert.equal(metadata.upstreamSourceSha256,inputSha256);assert.equal(metadata.transformedModuleSha256,qualifiedModuleSha);assert.deepEqual(metadata.finalChunks,manifest.finalChunks);assert.equal(await fs.readFile(path.join(output,outputSurfaceManifestName),'utf8'),emitted.source);assert.deepEqual(await packageOutputSurfaceDerivative(build,output),metadata);
 const script=await fs.readFile(path.join(root,'tools/package-published-worlds.mjs'),'utf8');assert.match(script,/await packageOutputSurfaceDerivative\(build,output\)/);assert.match(script,/schema:'elsemesh\.publication\/1',outputSurfaceDerivative,/);
});

test('packaging rejects changed or missing copied chunks',async t=>{
 const {build,output}=await fixture(t);await fs.writeFile(path.join(output,'assets/contract-12345678.js'),'changed');await assert.rejects(packageOutputSurfaceDerivative(build,output),/final chunk was not preserved/);await fs.unlink(path.join(output,'assets/contract-12345678.js'));await assert.rejects(packageOutputSurfaceDerivative(build,output),/ENOENT/);
});

test('packaging rejects transform provenance drift and an altered already-copied manifest',async t=>{
 const {build,output,manifest,emitted}=await fixture(t);await fs.writeFile(path.join(build,outputSurfaceManifestName),JSON.stringify({...manifest,transform:{...manifest.transform,sha256:'0'.repeat(64)}}));await assert.rejects(packageOutputSurfaceDerivative(build,output),/source\/transform provenance mismatch/);await fs.writeFile(path.join(build,outputSurfaceManifestName),emitted.source);await fs.writeFile(path.join(output,outputSurfaceManifestName),'{}');await assert.rejects(packageOutputSurfaceDerivative(build,output),/manifest changed during packaging/);
});
