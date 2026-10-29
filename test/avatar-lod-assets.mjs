import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseGLB} from '../src/engine/loaders/GLTF.js';
import {AVATAR_LOD_RADIUS,validateAvatarGeometryLOD} from '../src/world-runtime/AvatarGeometryLOD.js';
import {SkinnedModel} from '../src/engine/render/Skinning.js';
import {StorageBuffer} from '../src/engine/gpu/Texture.js';
import {SkinBounds} from '../src/engine/render/SkinBounds.js';

const readAsset=name=>readFileSync(new URL(`../public/models/characters/${name}.glb`,import.meta.url));
const triangles=source=>source.meshes.flat().reduce((sum,p)=>sum+p.indices.length/3,0);
function vertex(p,v,matrices){
 const P=p.attributes.POSITION.array,I=p.attributes.JOINTS_0.array,W=p.attributes.WEIGHTS_0.array;
 const out=[0,0,0],x=P[v*3],y=P[v*3+1],z=P[v*3+2],total=W[v*4]+W[v*4+1]+W[v*4+2]+W[v*4+3];
 for(let k=0;k<4;k++){const o=I[v*4+k]*16,w=W[v*4+k]/total;for(let c=0;c<3;c++)out[c]+=w*(matrices[o+c]*x+matrices[o+4+c]*y+matrices[o+8+c]*z+matrices[o+12+c]);}
 return out;
}
for(const asset of ['stock-player','stock-female'])for(const [level,ratio]of [['medium',.5],['low',.25]])test(`${asset} ${level}: installed geometry, materials and posed skeleton compatibility`,t=>{
 t.mock.method(StorageBuffer.prototype,'write',()=>{});
 const fullBytes=readAsset(asset),reducedBytes=readAsset(asset+'-'+level);
 const full=parseGLB(fullBytes),lod=parseGLB(reducedBytes);
 const durationSnapshot=source=>Object.freeze(Object.fromEntries(source.animations.map(clip=>[clip.name,clip.duration])));
 const fullDurations=durationSnapshot(full),reducedDurations=durationSnapshot(lod);
 const primitives=validateAvatarGeometryLOD(full,lod);
 const durationContext=(name,fullDuration=fullDurations[name],reducedDuration=reducedDurations[name])=>{
  let commit=process.env.GITHUB_SHA;
  if(!commit)try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('..',import.meta.url),encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{commit='unavailable';}
  const precise=value=>typeof value==='number'?value.toPrecision(17):String(value);
  const identity=bytes=>({byteLength:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex')});
  return JSON.stringify({asset,level,clip:name,commit,node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,execArgv:process.execArgv,nodeOptions:process.env.NODE_OPTIONS??'',full:identity(fullBytes),reduced:identity(reducedBytes),fullDuration:precise(fullDuration),reducedDuration:precise(reducedDuration),absoluteDelta:precise(Math.abs(reducedDuration-fullDuration)),parsedFullDuration:precise(fullDurations[name]),parsedReducedDuration:precise(reducedDurations[name])});
 };
 const check=(condition,message,name,fullDuration,reducedDuration)=>assert.ok(condition,condition?undefined:message+' '+durationContext(name,fullDuration,reducedDuration));
 // Check exported metadata before any posing, and retain immutable numeric
 // snapshots so a later mutation cannot masquerade as an asset discrepancy.
 for(const clip of full.animations){
  const reduced=lod.animations.find(a=>a.name===clip.name);
  check(reduced,'Reduced clip missing',clip.name);
  check(Number.isFinite(clip.duration)&&Number.isFinite(reduced.duration),'Nonfinite duration',clip.name,clip.duration,reduced.duration);
  check(Math.abs(reduced.duration-clip.duration)<.00001,'Duration mismatch before posing',clip.name,clip.duration,reduced.duration);
  check(reduced.channels.length===clip.channels.length,'Channel count mismatch',clip.name);
  for(const [sourceName,animation]of [['full',clip],['reduced',reduced]])for(const [index,channel]of animation.channels.entries()){
   check(channel.times.length>0&&channel.times.every(Number.isFinite),`${sourceName} channel ${index} has invalid times`,clip.name);
   check(channel.values.every(Number.isFinite),`${sourceName} channel ${index} has invalid values`,clip.name);
  }
 }
 assert.ok(Math.abs(triangles(lod)/triangles(full)-ratio)<.02);
 assert.deepEqual(lod.animations.map(a=>a.name).sort(),['helm','idle','run','walk']);
 for(const material of full.materials){
  const reduced=lod.materials.find(m=>m.name===material.name);assert.ok(reduced);
  assert.ok(reduced.pbrMetallicRoughness.baseColorTexture);assert.equal(reduced.alphaMode,material.alphaMode);assert.equal(reduced.doubleSided,material.doubleSided);
  if(material.normalTexture)assert.ok(reduced.normalTexture);if(material.occlusionTexture)assert.ok(reduced.occlusionTexture);
 }
 const canonicalPose=new SkinnedModel(full),exportPose=new SkinnedModel(lod);
 const bounds=full.meshes[0].map(p=>new SkinBounds(p.attributes.POSITION.array,p.attributes.JOINTS_0.array,p.attributes.WEIGHTS_0.array,full.skins[0].joints.length));
 let worst=0,checked=0,maxFullExtent=0,maxReducedExtent=0;
 for(const clip of full.animations){
  const reduced=lod.animations.find(a=>a.name===clip.name);
  // Keep the original live duration comparison and tolerance; snapshots detect
  // mutation separately rather than replacing the values under examination.
  assert.ok(Math.abs(reduced.duration-clip.duration)<.00001,Math.abs(reduced.duration-clip.duration)<.00001?undefined:'Live duration mismatch before clip posing '+durationContext(clip.name,clip.duration,reduced.duration));
  check(clip.duration===fullDurations[clip.name],'Full duration changed before clip posing',clip.name,clip.duration,reduced.duration);
  check(reduced.duration===reducedDurations[clip.name],'Reduced duration changed before clip posing',clip.name,clip.duration,reduced.duration);
  for(const fraction of [...Array.from({length:21},(_,i)=>i/20),.99]){
   canonicalPose.layers=[];exportPose.layers=[];
   canonicalPose.play(clip.name,{from:clip.duration*fraction});exportPose.play(clip.name,{from:reduced.duration*fraction});canonicalPose.update(0);exportPose.update(0);
   bounds.forEach(bound=>assert.equal(bound.update(canonicalPose.jointData),true));
   for(const p of full.meshes[0])for(let v=0;v<p.attributes.POSITION.array.length/3;v++){
    const point=vertex(p,v,canonicalPose.jointData);maxFullExtent=Math.max(maxFullExtent,Math.hypot(point[0],point[1]-.9,point[2]));
   }
   for(const [index,p]of primitives.entries())for(let v=0;v<p.attributes.POSITION.array.length/3;v++){
    const a=vertex(p,v,canonicalPose.jointData),b=vertex(p,v,exportPose.jointData);
    const error=Math.hypot(...a.map((value,i)=>value-b[i]));assert.ok(Number.isFinite(error));worst=Math.max(worst,error);checked++;
    maxReducedExtent=Math.max(maxReducedExtent,Math.hypot(a[0],a[1]-.9,a[2]));
    const sphere=bounds[index].sphere;assert.ok(Math.hypot(a[0]-sphere.center.x,a[1]-sphere.center.y,a[2]-sphere.center.z)<=sphere.radius,'reduced posed vertex remains within canonical animated bounds');
   }
  }
 }
 for(const clip of full.animations){
  const reduced=lod.animations.find(a=>a.name===clip.name);
  check(clip.duration===fullDurations[clip.name],'Full duration changed during pose evaluation',clip.name,clip.duration,reduced.duration);
  check(reduced.duration===reducedDurations[clip.name],'Reduced duration changed during pose evaluation',clip.name,clip.duration,reduced.duration);
 }
 // In model metres, replacing the exported low skeleton with the original
 // skeleton must move every sampled reduced vertex by less than two millimetres.
 assert.ok(worst<.002,`shared original skeleton error ${worst}m`);
 t.diagnostic(`${triangles(lod)} triangles; ${checked} posed vertices checked; maximum shared-skeleton error ${worst}m; extents from [0,.9,0]: full ${maxFullExtent}m, reduced ${maxReducedExtent}m`);
 assert.ok(maxFullExtent<=AVATAR_LOD_RADIUS&&maxReducedExtent<=AVATAR_LOD_RADIUS,'fixed presentation sphere bounds full and reduced sampled poses');
});
