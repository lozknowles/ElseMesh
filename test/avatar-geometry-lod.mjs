import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as N from '../src/engine/index.js';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {parseGLB} from '../src/engine/loaders/GLTF.js';
import {avatarLODSource,createAvatarLODGeometry,installAvatarGeometryLOD,validateAvatarGeometryLOD} from '../src/world-runtime/AvatarGeometryLOD.js';
import {presentationGeometryForView} from '../src/engine/render/PresentationLOD.js';
import {PlayerAvatar} from '../src/player/PlayerAvatar.js';
import {ReadiedRepositoryAvatar} from '../src/world-runtime/NativeRepositoryReadiness.js';
import {WebGLRepositoryAvatar} from '../src/world-runtime/WebGLRepositoryAvatar.js';
import {BuiltinCharacterGLTFLoader} from '../src/world-runtime/vendor/world-engine-contract.js';
import {GPU} from '../src/engine/gpu/GPU.js';

const source=name=>parseGLB(readFileSync(new URL(`../public/models/characters/${name}.glb`,import.meta.url)));
const full=source('stock-player'),medium=source('stock-player-medium'),low=source('stock-player-low');
function runtime(engine){
 const root=new engine.Group(),meshes=[];
 for(const p of full.meshes[0]){
  const geometry=createAvatarLODGeometry(p,{boundingSphere:new engine.Sphere(new engine.Vector3(0,.9,0),1.1)},engine);
  if(engine===T)geometry.setAttribute('skinIndex',new engine.BufferAttribute(Uint16Array.from(p.attributes.JOINTS_0.array),4));
  const material={name:full.materials[p.material].name,userData:{avatarUniforms:{shirt:{value:'preserved'}}}};
  const mesh=new engine.Mesh(geometry,material);mesh.skinBounds={sphere:geometry.boundingSphere};meshes.push(mesh);root.add(mesh);
 }
 return {root,meshes};
}
const loadSource=async(asset,level)=>level==='medium'?medium:low;
for(const [name,engine]of [['native',N],['WebGL',T]])test(`${name}: geometry-only install prewarms detached variants and preserves canonical ownership`,async()=>{
 const {root,meshes}=runtime(engine),canonical=meshes.map(m=>m.geometry),materials=meshes.map(m=>m.material),skinBounds=meshes.map(m=>m.skinBounds),prepared=[],retired=[];
 const result=await installAvatarGeometryLOD({asset:'stock-player',full,root,meshes,engine,loadSource,retire:fn=>retired.push(fn),prepareResources:async preparation=>{
  assert.equal(root.userData.presentationLOD,undefined);assert.deepEqual(meshes.map(m=>m.geometry),canonical);
  assert.equal(preparation.children.length,3);preparation.children.forEach((proxy,i)=>{assert.notEqual(proxy.geometry,canonical[i]);assert.equal(proxy.material,materials[i]);});prepared.push(preparation);
 }});
 assert.equal(prepared.length,2);assert.equal(root.userData.presentationLOD,result.controller);
 const camera=new engine.PerspectiveCamera(60,1,.1,1000);camera.position.set(0,.9,200);camera.updateMatrixWorld();root.updateMatrixWorld(true);
 for(let i=0;i<meshes.length;i++){
  assert.equal(presentationGeometryForView(meshes[i],camera,128),result.bindings[i].geometries[2]);
  assert.equal(meshes[i].geometry,canonical[i]);assert.equal(meshes[i].material,materials[i]);assert.equal(meshes[i].skinBounds,skinBounds[i]);
  for(const geometry of result.bindings[i].geometries){assert.equal(geometry.boundingSphere,canonical[i].boundingSphere);assert.equal(geometry.getAttribute('skinIndex').array.constructor,canonical[i].getAttribute('skinIndex').array.constructor);}
 }
 let extraDisposed=0,fullDisposed=0;
 result.bindings.forEach(b=>{b.geometries[0].addEventListener('dispose',()=>fullDisposed++);b.geometries.slice(1).forEach(g=>g.addEventListener('dispose',()=>extraDisposed++));});
 result.dispose();result.dispose();assert.equal(root.userData.presentationLOD,undefined);assert.equal(extraDisposed,0);assert.equal(retired.length,1);retired[0]();assert.equal(extraDisposed,6);assert.equal(fullDisposed,0);
});

test('stale or failed optional preparation keeps high geometry and disposes only extras',async()=>{
 for(const fail of [false,true]){
  const {root,meshes}=runtime(N),canonical=meshes.map(m=>m.geometry);let current=true,disposed=0;
  const work=installAvatarGeometryLOD({asset:'stock-player',full,root,meshes,engine:N,loadSource,isCurrent:()=>current,prepareResources:async preparation=>{
   preparation.children.forEach(mesh=>mesh.geometry.addEventListener('dispose',()=>disposed++));
   if(fail)throw Error('optional preparation failed');current=false;
  }});
  if(fail)await assert.rejects(work,/optional preparation failed/);else assert.equal(await work,null);
  assert.deepEqual(meshes.map(m=>m.geometry),canonical);assert.equal(root.userData.presentationLOD,undefined);assert.equal(disposed,3);
 }
});

test('stale fetch does not allocate or install geometry',async()=>{
 const {root,meshes}=runtime(N);let current=true;
 const result=await installAvatarGeometryLOD({asset:'stock-player',full,root,meshes,engine:N,isCurrent:()=>current,loadSource:async()=>{current=false;return low;}});
 assert.equal(result,null);assert.equal(root.userData.presentationLOD,undefined);
});

test('joint reorder, changed bind space, hierarchy, attributes and indices fail closed',()=>{
 const malformed=change=>{const value=structuredClone(low);change(value);assert.throws(()=>validateAvatarGeometryLOD(full,value),/Incompatible avatar LOD/);};
 malformed(g=>g.skins[0].joints.reverse());malformed(g=>g.skins[0].inverseBindMatrices[12]+=.1);
 malformed(g=>g.nodes[0].t[0]+=.1);malformed(g=>g.nodes.find(n=>n.children.length).children=[]);
 malformed(g=>delete g.meshes[0][0].attributes.JOINTS_0);malformed(g=>g.meshes[0][0].indices[0]=65535);
 malformed(g=>g.meshes[0][0].attributes.WEIGHTS_0.array[0]=-1);
});

test('only installed stock assets are admitted and failed cached fetches can retry',async()=>{
 await assert.rejects(avatarLODSource('../arbitrary'),/Unknown installed/);await assert.rejects(avatarLODSource('stock-player','../low'),/Unknown installed/);
 let requests=0;
 await assert.rejects(avatarLODSource('stock-female','low',async()=>{requests++;throw Error('fetch failed');}),/fetch failed/);
 assert.equal(await avatarLODSource('stock-female','low',async()=>{requests++;return low;}),low);assert.equal(requests,2);
});

test('native adapter shows the prepared original before optional LOD and retires extras after submission',async t=>{
 t.mock.method(PlayerAvatar.prototype,'loadCharacter',async function(){
  ++this.loadVersion;const built=runtime(N);
  this.scanned={gltf:full,group:built.root,meshes:built.meshes,materials:[],dispose(){built.meshes.forEach(mesh=>mesh.geometry.dispose());}};this.group.add(built.root);
 });
 t.mock.method(GPU,'onSubmit',(before,after)=>{GPU._testRetire=after;});
 const oldHook=globalThis.__assetFile,oldEncoder=GPU.encoder,oldQueue=GPU.queue;
 globalThis.__assetFile=async url=>readFileSync(new URL('../public'+url,import.meta.url));
 let avatar,release,prepared=0;
 const optionalGate=new Promise(resolve=>release=resolve);
 try{
  avatar=new ReadiedRepositoryAvatar(new N.Group(),{model:{wheelPivot:{position:new N.Vector3()},lines:{deckY:0},group:new N.Group()}},{prepareResources:async()=>{if(++prepared===2)await optionalGate;}});
  await avatar.ready;const model=avatar.scanned;assert.equal(model.group.visible,true);assert.equal(model.group.userData.presentationLOD,undefined);
  release();assert.equal(await model.lodReady,true);assert.equal(prepared,3);
  let disposed=0;model.group.userData.presentationLOD.bindings.forEach(b=>b.geometries.slice(1).forEach(g=>g.addEventListener('dispose',()=>disposed++)));
  GPU.encoder={};GPU.queue={onSubmittedWorkDone:async()=>{}};
  avatar.dispose();assert.equal(disposed,0);assert.equal(model.group.userData.presentationLOD,undefined);GPU._testRetire();await Promise.resolve();await Promise.resolve();assert.equal(disposed,6);
 }finally{release();avatar?.dispose();GPU.encoder=oldEncoder;GPU.queue=oldQueue;delete GPU._testRetire;if(oldHook===undefined)delete globalThis.__assetFile;else globalThis.__assetFile=oldHook;}
});

test('WebGL adapter reuses the displayed skeleton, mixer and tint materials across optional installation',async t=>{
 let original,release,prepared=0;
 const optionalGate=new Promise(resolve=>release=resolve);
 t.mock.method(BuiltinCharacterGLTFLoader.prototype,'loadAsync',async()=>{
  original=runtime(T);
  for(const mesh of original.meshes){const material=new T.MeshStandardMaterial({name:mesh.material.name});material.roughnessMap=new T.Texture();mesh.material=material;}
  return {scene:original.root,animations:['idle','walk','run','helm'].map(name=>new T.AnimationClip(name,1,[]))};
 });
 const oldHook=globalThis.__assetFile;globalThis.__assetFile=async url=>readFileSync(new URL('../public'+url,import.meta.url));let avatar;
 try{
  avatar=new WebGLRepositoryAvatar(new T.Scene(),{prepareResources:async()=>{if(++prepared===2)await optionalGate;}});
  await avatar.ready;const mixer=avatar.mixer,materials=avatar.materials,model=avatar.model;
  assert.equal(model.userData.presentationLOD,undefined);release();assert.equal(await avatar.lodReady,true);
  assert.equal(avatar.mixer,mixer);assert.equal(avatar.materials,materials);assert.equal(avatar.model,model);assert.equal(prepared,3);
  let disposed=0;model.userData.presentationLOD.bindings.forEach(b=>b.geometries.slice(1).forEach(g=>g.addEventListener('dispose',()=>disposed++)));
  avatar.dispose();assert.equal(disposed,6);assert.equal(model.userData.presentationLOD,undefined);
 }finally{release();avatar?.dispose();if(oldHook===undefined)delete globalThis.__assetFile;else globalThis.__assetFile=oldHook;}
});

test('actual installed female WebGL geometry preserves vertex colors, alpha and canonical shader attribute layout',async()=>{
 const bytes=readFileSync(new URL('../public/models/characters/stock-female.glb',import.meta.url));
 const loader=new BuiltinCharacterGLTFLoader();
 // Keep the actual Three geometry/material loader; only image decoding is stubbed.
 loader.register(()=>({name:'TEST_NO_IMAGE_DECODE',loadTexture:async()=>new T.Texture()}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const parsed=source('stock-female'),medium=source('stock-female-medium'),low=source('stock-female-low'),meshes=[];
 gltf.scene.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
 const result=await installAvatarGeometryLOD({asset:'stock-female',full:parsed,root:gltf.scene,meshes,engine:T,loadSource:async(asset,level)=>level==='medium'?medium:low});
 assert.ok(result);
 for(const [index,binding]of result.bindings.entries()){
  const canonical=binding.geometries[0];assert.equal(binding.mesh.material.vertexColors,true);
  assert.deepEqual(Object.keys(canonical.attributes).sort(),['position','normal','uv','color','color_1','skinIndex','skinWeight'].sort());
  for(const [level,geometry]of binding.geometries.slice(1).entries()){
   assert.deepEqual(Object.keys(geometry.attributes).sort(),Object.keys(canonical.attributes).sort());
   for(const name of ['color','color_1','skinIndex']){
    const actual=geometry.getAttribute(name),original=canonical.getAttribute(name);
    assert.equal(actual.itemSize,original.itemSize);assert.equal(actual.normalized,original.normalized);assert.equal(actual.array.constructor,original.array.constructor);
   }
   const reduced=(level===0?medium:low).meshes[0][index],color=geometry.getAttribute('color'),input=reduced.attributes.COLOR_0;
   assert.equal(color.itemSize,4);assert.equal(color.normalized,true);assert.equal(color.array.constructor,Uint8Array);
   assert.ok(color.count>0);for(let v=0;v<color.count;v++){
    assert.equal(color.getW(v),1,'RGB decimation preserves original opaque vertex alpha');
    for(let c=0;c<3;c++)assert.ok(Math.abs(color.getComponent(v,c)-input.array[v*3+c])<=.5/255+1e-7,'reduced color survives canonical normalized encoding');
   }
   assert.deepEqual(geometry.getAttribute('color_1').array,reduced.attributes.COLOR_1.array);
  }
 }
 const canonical=result.bindings[0].geometries[0];
 const missing=structuredClone(low);delete missing.meshes[0][0].attributes.COLOR_0;
 assert.throws(()=>validateAvatarGeometryLOD(parsed,missing),/extra attributes/);
 canonical.setAttribute('unsupportedShaderData',new T.BufferAttribute(new Float32Array(canonical.getAttribute('position').count),1));
 assert.throws(()=>createAvatarLODGeometry(low.meshes[0][0],canonical,T),/required attribute unsupportedShaderData/);
 canonical.deleteAttribute('unsupportedShaderData');
 const alpha=canonical.getAttribute('color').array;const previous=alpha[3];alpha[3]=0;
 assert.throws(()=>createAvatarLODGeometry(low.meshes[0][0],canonical,T),/missing vertex alpha/);alpha[3]=previous;
 result.dispose();
 const materials=new Set(),textures=new Set();gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry.dispose();materials.add(mesh.material);for(const value of Object.values(mesh.material))if(value?.isTexture)textures.add(value);});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
});
