import {createHash} from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Guarded build/dev derivative. Tracked vendor bytes and their upstream
// provenance remain untouched; emitted provenance identifies this transform separately.
export const inputSha256='633a828536b774c71c2f0feae31f262fef387233afad1c2fa2e90b624288d42a';
const sha=text=>createHash('sha256').update(text).digest('hex');
export function patchOutputSurface(input){
 const original=input.replaceAll('\r\n','\n');
 if(sha(original)!==inputSha256)throw Error('Output-surface experiment requires exact pinned vendor source');
 return applyOutputSurfaceAnchors(original);
}
// Structural guard is exported for focused anchor tests; production plugin always
// enters through patchOutputSurface, including its pinned normalized-source hash.
export function applyOutputSurfaceAnchors(original){
 let text=original;const edits=[];
 const replace=(name,before,after)=>{if(text.split(before).length!==2)throw Error('Expected one '+name+' patch site');text=text.replace(before,after);edits.push(name);};
 replace('renderer-owned registration','    this.isWebGLRenderer = true;',`    this.isWebGLRenderer = true;
    // ElseMesh diagnostic derivative: an explicitly registered output surface
    // uses the default framebuffer's color policy, independently of storage.
    const outputSurfacePolicies = new WeakMap();
    this.getOutputSurfacePolicy = (target) => target ? outputSurfacePolicies.get(target) ?? null : null;
    this.setOutputSurfacePolicy = (target, policy) => {
      if (!target?.isWebGLRenderTarget || target.isXRRenderTarget === true ||
          !policy || ![SRGBColorSpace, LinearSRGBColorSpace].includes(policy.colorSpace) ||
          typeof policy.toneMapping !== "boolean" || outputSurfacePolicies.has(target)) {
        throw new Error("Invalid or already registered output surface");
      }
      const value = Object.freeze({ colorSpace: policy.colorSpace, toneMapping: policy.toneMapping });
      outputSurfacePolicies.set(target, value);
      return () => { if (outputSurfacePolicies.get(target) === value) outputSurfacePolicies.delete(target); };
    };`);
 replace('unlit colors',`function getUnlitUniformColorSpace(renderer) {
  const currentRenderTarget = renderer.getRenderTarget();`, `function getUnlitUniformColorSpace(renderer) {
  const currentRenderTarget = renderer.getRenderTarget();
  const outputPolicy = renderer.getOutputSurfacePolicy?.(currentRenderTarget);
  if (outputPolicy) return outputPolicy.colorSpace;`);
 replace('program tone mapping','if (currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true) {','if (currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true || renderer.getOutputSurfacePolicy?.(currentRenderTarget)?.toneMapping === true) {');
 replace('program output color','outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace,','outputColorSpace: renderer.getOutputSurfacePolicy?.(currentRenderTarget)?.colorSpace ?? (currentRenderTarget === null ? renderer.outputColorSpace : currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace),');
 replace('draw output color','const colorSpace = _currentRenderTarget === null ? _this.outputColorSpace : _currentRenderTarget.isXRRenderTarget === true ? _currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace;','const colorSpace = _this.getOutputSurfacePolicy?.(_currentRenderTarget)?.colorSpace ?? (_currentRenderTarget === null ? _this.outputColorSpace : _currentRenderTarget.isXRRenderTarget === true ? _currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace);');
 replace('draw tone mapping','if (_currentRenderTarget === null || _currentRenderTarget.isXRRenderTarget === true) {','if (_currentRenderTarget === null || _currentRenderTarget.isXRRenderTarget === true || _this.getOutputSurfacePolicy?.(_currentRenderTarget)?.toneMapping === true) {');
 return {code:text,manifest:{integration:'bounded-opt-in',upstreamSourceUnmodified:true,inputSha256,outputSha256:sha(text),normalization:'UTF-8 LF',edits,limitations:['Only explicitly registered ordinary render targets use this output policy; default, XR and unregistered offscreen targets retain their existing behavior.','WebGLSunsetOutput owns Spark final-output handling after its normal object callback. Registration alone changes neither scene detail nor rendering resolution.']}};
}

export const outputSurfaceTransformVersion='1.0.0';
export const outputSurfaceManifestName='output-surface-derivative.json';
const vendorRelative='src/world-runtime/vendor/world-engine-contract.js';
const transformRelative='tools/output-surface-transform.mjs';
const moduleRoot=fileURLToPath(new URL('..',import.meta.url));
const normalizedId=id=>id.replaceAll('\\','/');
const transformHash=()=>sha(fs.readFileSync(fileURLToPath(import.meta.url)));

export function createOutputSurfaceTransform({root=moduleRoot}={}){
 const vendorId=normalizedId(path.resolve(root,vendorRelative));let derivative=null;
 return {
  name:'elsemesh-output-surface-derivative',enforce:'pre',
  buildStart(){derivative=null;},
  transform(source,id){
   const actual=normalizedId(id);
   if(actual.split('?')[0]!==vendorId)return null;
   if(actual!==vendorId)throw Error('Output-surface vendor module id must match exactly');
   const result=patchOutputSurface(source);derivative=result.manifest;
   return {code:result.code,map:null};
  },
  generateBundle:{order:'post',handler(_options,bundle){
   if(!derivative)throw Error('Output-surface derivative transform did not run');
   const finalChunks={},vendorChunks=[];
   for(const [name,item]of Object.entries(bundle).sort(([a],[b])=>a.localeCompare(b))){
    if(item.type!=='chunk')continue;
    finalChunks[name]=sha(item.code);
    if(Object.keys(item.modules??{}).some(id=>normalizedId(id)===vendorId))vendorChunks.push(name);
   }
   if(vendorChunks.length!==1)throw Error('Expected exactly one transformed vendor chunk and shared Three instance');
   const manifest={schema:'elsemesh.output-surface-derivative/1',version:outputSurfaceTransformVersion,integration:derivative.integration,limitations:derivative.limitations,
    source:{path:vendorRelative,normalization:'UTF-8 LF',sha256:inputSha256,upstreamBytesUnmodified:true},
    transform:{path:transformRelative,version:outputSurfaceTransformVersion,sha256:transformHash(),edits:derivative.edits},
    transformedModule:{sha256:derivative.outputSha256,chunks:vendorChunks},finalChunks,
    scope:'The source hash identifies normalized unchanged upstream bytes. Transform, derivative module and final chunk hashes identify distinct downstream artifacts.'};
   this.emitFile({type:'asset',fileName:outputSurfaceManifestName,source:JSON.stringify(manifest,null,2)+'\n'});
  }}
 };
}

async function regularBytes(file,maxBytes){const info=await fsp.lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>maxBytes)throw Error('Invalid output-surface provenance file');return fsp.readFile(file);}
export async function packageOutputSurfaceDerivative(build,output){
 const bytes=await regularBytes(path.join(build,outputSurfaceManifestName),128*1024),manifest=JSON.parse(bytes.toString('utf8'));
 const expected=patchOutputSurface(await fsp.readFile(path.join(moduleRoot,vendorRelative),'utf8')).manifest;
 if(manifest.schema!=='elsemesh.output-surface-derivative/1'||manifest.version!==outputSurfaceTransformVersion||manifest.source?.path!==vendorRelative||manifest.source.normalization!=='UTF-8 LF'||manifest.source.sha256!==inputSha256||manifest.source.upstreamBytesUnmodified!==true||manifest.transform?.path!==transformRelative||manifest.transform.version!==outputSurfaceTransformVersion||manifest.transform.sha256!==transformHash()||JSON.stringify(manifest.transform.edits)!==JSON.stringify(expected.edits)||manifest.transformedModule?.sha256!==expected.outputSha256)throw Error('Output-surface derivative source/transform provenance mismatch');
 const chunks=Object.entries(manifest.finalChunks??{});
 if(!chunks.length||chunks.length>256||!Array.isArray(manifest.transformedModule.chunks)||manifest.transformedModule.chunks.length!==1||!Object.hasOwn(manifest.finalChunks,manifest.transformedModule.chunks[0]))throw Error('Invalid output-surface final chunk manifest');
 for(const [name,digest]of chunks){
  if(!/^assets\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.js$/.test(name)||name.includes('..')||!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid output-surface chunk path/hash');
  for(const directory of [build,output])if(sha(await regularBytes(path.join(directory,name),8*1024*1024))!==digest)throw Error('Output-surface final chunk was not preserved: '+name);
 }
 const destination=path.join(output,outputSurfaceManifestName),existing=await fsp.lstat(destination).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(existing){if(!existing.isFile()||existing.isSymbolicLink()||!bytes.equals(await fsp.readFile(destination)))throw Error('Output-surface manifest changed during packaging');}
 else await fsp.copyFile(path.join(build,outputSurfaceManifestName),destination,fs.constants.COPYFILE_EXCL);
 if(!bytes.equals(await regularBytes(destination,128*1024)))throw Error('Output-surface manifest was not preserved');
 return {manifest:outputSurfaceManifestName,sha256:sha(bytes),version:manifest.version,upstreamSourceSha256:manifest.source.sha256,transformSha256:manifest.transform.sha256,transformedModuleSha256:manifest.transformedModule.sha256,finalChunks:manifest.finalChunks};
}
