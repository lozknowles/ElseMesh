import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import * as Plants from '../src/world/vegetation/PlantGeometry.js';
import {buildWebGLNativeIsland,convertNativePlantGeometry,nativePlantPoseMatrix} from '../src/world-runtime/WebGLNativeIsland.js';

const normalized=s=>s.replace(/\s+/g,' ').trim();
const sha=s=>createHash('sha256').update(s).digest('hex');
// Reference PLANT_VERTEX before the draw-order change (whitespace normalized).
const GENERAL_VERTEX_SHA='206e4fe30b2ab0148f21842546927088ff970a95bf9712f734707484ebf82525';
const factories={palms:Plants.buildPalmNear,youngPalms:Plants.buildYoungPalm,ferns:Plants.buildFern,bananas:Plants.buildBanana,monsteras:Plants.buildMonstera,elephantEars:Plants.buildElephantEar,heliconias:Plants.buildHeliconia,strelitzias:Plants.buildStrelitzia,trees:Plants.buildTreeNear,shrubs:Plants.buildShrubNear};

test('original native ordering is preserved by the structural depth prepass with unchanged plant geometry, records and shaders',async()=>{
 const n=8,root=new T.Group(),camera=new T.PerspectiveCamera(75,1,.05,3000);camera.position.set(0,3,10);camera.lookAt(0,3,-100);camera.updateMatrixWorld();
 const records=Object.fromEntries(Object.keys(factories).map(species=>[species,[]]));
 for(const species of Object.keys(records)){
  const seeds=species==='trees'?[.01,.06,.11]:species==='shrubs'?[.01,.08]:species==='bananas'?[.2,.8]:[.2];
  for(const seed of seeds)for(const z of [-5,-180])records[species].push({x:0,y:0,z,s:1.25,sy:.7,yaw:.3,seed,H:12.5,la:.2,l:.1});
 }
 const normal=new Uint8Array(n*n*4),splat=new Uint8Array(n*n*4);for(let i=0;i<n*n;i++){normal.set([128,128,0,255],i*4);splat.set([255,0,0,0],i*4);}
 const source={domain:{res:n,size:8,origin:-4},coarse:{res:n,heights:new Float32Array(n*n),normal,splat},grassMask:{res:n,data:new Uint8Array(n*n*4)},shore:{res:n,data:new Float32Array(n*n*4)},records,appearance:{swellDir:{x:0,y:-1}},ocean:{level:0,fft:{local:{windDirection:25}},shore:{period:9,amplitude:.34}},tiles:[],readTile:async()=>({fields:{heights:new Float32Array(n*n),normal,splat}})};
 const texture=new T.DataTexture(new Uint8Array([128,128,255,255]),1,1),bark={map:texture,normalMap:texture,orm:texture};
 const native=await buildWebGLNativeIsland({project:{environment:{windSpeed:7}},root,camera,options:{readNativeIsland:async()=>source,prepareVegetationAssets:async()=>({palm:bark,tree:bark,dispose(){texture.dispose();}})}});
 try{
  native.bindView(camera);const meshes=[];root.traverse(node=>{if(node.userData.nativePlantSpecies)meshes.push(node);});
  assert.equal(native.stats().plants.records,Object.values(records).reduce((sum,a)=>sum+a.length,0));
  assert.equal(meshes.length,20,'near/far and source variant batch counts remain unchanged');
  const programs=new Map();
  for(const mesh of meshes){
   if(!programs.has(mesh.material)){const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};mesh.material.onBeforeCompile(shader);programs.set(mesh.material,shader);}
  }
  assert.equal(programs.size,2);
  const shaders=[...programs.values()].map(s=>s.vertexShader.slice(0,s.vertexShader.indexOf('#define STANDARD')));
  for(const shader of shaders)assert.equal(sha(normalized(shader)),GENERAL_VERTEX_SHA,'every plant keeps the original deformation source');
  const sky=root.getObjectByName('native-island-webgl-sky');assert.ok(sky);assert.equal(sky.renderOrder,-1000,'sky continues to render before plant geometry');
  root.traverse(node=>{if(node.userData.nativeBase)assert.equal(node.renderOrder,0,'coarse base retains original order');});
  for(const [species,factory]of Object.entries(factories)){
   const batches=meshes.filter(m=>m.userData.nativePlantSpecies===species),isCanopy=species==='trees'||species==='shrubs',hasFar=isCanopy||species==='palms';
   const variants=species==='trees'?3:species==='shrubs'||species==='bananas'?2:1;
   assert.equal(batches.length,variants*(hasFar?2:1),species);
   assert.equal(batches.reduce((sum,m)=>sum+m.count,0),hasFar?records[species].length:records[species].length/2,species+' visible records');
   for(let i=0;i<batches.length;i++){
    const mesh=batches[i],variant=Math.floor(i/(hasFar?2:1)),distant=hasFar&&i%2===1;
    assert.equal(mesh.renderOrder,0,species+' original near/far colour order');
    const material=mesh.material;
    assert.equal(material.alphaTest,.35);assert.equal(material.transparent,false);
    assert.equal(material.depthTest,true);assert.equal(material.depthWrite,true);
    assert.equal(material.side,T.DoubleSide);assert.equal(material.roughness,.86);
    assert.equal(material.customProgramCacheKey(),'native-source-plants-webgl/1:'+(isCanopy?'tree':'palm'));
    assert.equal(mesh.material,meshes.find(m=>isCanopy?m.userData.nativePlantSpecies==='trees':m.userData.nativePlantSpecies==='palms').material,species+' material invariant');
    const original=species==='bananas'?factory(variant?23:9):factory();
    const sourceGeometry=isCanopy?Plants.lobeVariantGeometry(original.geometry,Plants.LOBE_TABLE,(variant+(species==='shrubs'?Plants.TREE_VARIANTS:0))*8):species==='palms'&&distant?Plants.buildPalmFar().geometry:original.geometry;
    const expected=convertNativePlantGeometry(sourceGeometry,{leafStride:distant&&isCanopy?8:1});
    assert.deepEqual(mesh.geometry.index.array,expected.index.array,species+' exact source indices');
    for(const name of ['position','normal','uv','aVeg','aMat'])assert.deepEqual(mesh.geometry.getAttribute(name).array,expected.getAttribute(name).array,species+' exact '+name);
    for(let j=0;j<mesh.count;j++){
     const attr=mesh.geometry.getAttribute('iRecord');assert.equal(attr.getZ(j),isCanopy?1:0,species+' canopy discriminator');
     const seed=mesh.geometry.getAttribute('iPlant').getW(j),record=records[species].find(r=>Math.abs(r.seed-seed)<1e-6&&((Math.abs(r.z-camera.position.z)>120)===distant||!hasFar));assert.ok(record);
     const matrix=new T.Matrix4();mesh.getMatrixAt(j,matrix);const wanted=nativePlantPoseMatrix(record,new T.Matrix4(),isCanopy);matrix.elements.forEach((v,k)=>assert.ok(Math.abs(v-wanted.elements[k])<1e-6,species+' captured pose'));
     assert.ok(Math.abs(attr.getX(j)-record.yaw)<1e-6);assert.equal(attr.getY(j),record.s);assert.equal(attr.getW(j),0);
     const p=mesh.geometry.getAttribute('iPlant');assert.ok(Math.abs(p.getX(j)-(record.la-record.yaw))<1e-6);assert.ok(Math.abs(p.getY(j)-record.l)<1e-6);assert.ok(Math.abs(p.getZ(j)-(species==='bananas'?.02:record.H)/record.s)<1e-6);
    }
    expected.dispose();if(sourceGeometry!==original.geometry)sourceGeometry.dispose();original.geometry.dispose();
   }
  }
 }finally{native.dispose();}
 assert.equal(root.children.length,0);
});

test('original fine terrain colour order survives first load, neighbor rebuild, eviction and reload',async()=>{
 const res=16,tileSize=8,root=new T.Group(),camera=new T.PerspectiveCamera();
 const records=Object.fromEntries(Object.keys(factories).map(name=>[name,[]]));
 const tiles=[{id:'a',x:0,z:0},{id:'b',x:8,z:0},{id:'c',x:0,z:8}].map(t=>({...t,width:tileSize,height:tileSize,bounds:[t.x,t.z,t.x+tileSize,t.z+tileSize],minHeight:0,maxHeight:8}));
 const normal=new Uint8Array(res*res*4),splat=new Uint8Array(res*res*4);for(let i=0;i<res*res;i++){normal.set([128,128,0,255],i*4);splat.set([255,0,0,0],i*4);}
 const reads=new Map(),source={domain:{res,size:res,origin:0},coarse:{res,heights:new Float32Array(res*res),normal,splat},grassMask:{res,data:new Uint8Array(res*res*4)},shore:{res,data:new Float32Array(res*res*4)},records,appearance:{swellDir:{x:0,y:-1}},ocean:{level:0,fft:{local:{windDirection:25}},shore:{period:9,amplitude:.34}},tiles,
  readTile:async tile=>{reads.set(tile.id,(reads.get(tile.id)??0)+1);return{fields:{heights:new Float32Array(tileSize*tileSize).fill(tile.id==='b'?4:tile.id==='c'?8:0),normal:normal.slice(0,tileSize*tileSize*4),splat:splat.slice(0,tileSize*tileSize*4)}};}};
 const texture=new T.DataTexture(new Uint8Array([128,128,255,255]),1,1),bark={map:texture,normalMap:texture,orm:texture};
 // Each decoded tile is 64*(4+4+4) bytes. Two fit; the third must evict the LRU.
 const native=await buildWebGLNativeIsland({project:{environment:{windSpeed:7}},root,camera,options:{readNativeIsland:async()=>source,prepareVegetationAssets:async()=>({palm:bark,tree:bark,dispose(){texture.dispose();}}),maxBytes:2*tileSize*tileSize*12,maxConcurrency:1}});
 const fineFor=tile=>{let result;root.traverse(node=>{if(!node.userData.nativeTextures)return;const p=node.geometry.getAttribute('position');if(p.getX(0)===tile.x+.5&&p.getZ(0)===tile.z+.5)result=node;});return result;};
 const checkFine=mesh=>{assert.ok(mesh);assert.equal(mesh.renderOrder,0);assert.equal(mesh.geometry.getAttribute('position').count,81);assert.equal(mesh.geometry.index.count,384);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthTest,true);assert.equal(mesh.material.depthWrite,true);assert.equal(mesh.material.customProgramCacheKey(),'native-field-terrain-webgl/1:false');};
 try{
  const cache=native.data.cache;let base;root.traverse(node=>{if(node.userData.nativeBase)base=node;});assert.ok(base);assert.equal(base.renderOrder,0);
  await cache.request('a');const firstA=fineFor(tiles[0]);checkFine(firstA);const firstGeometry=firstA.geometry;let firstGeometryDisposed=false;firstGeometry.addEventListener('dispose',()=>{firstGeometryDisposed=true;});
  const initialRightEdgeHeight=firstGeometry.getAttribute('position').getY(8);assert.equal(initialRightEdgeHeight,0);
  await cache.request('b');const firstB=fineFor(tiles[1]);checkFine(firstB);assert.equal(fineFor(tiles[0]),firstA,'neighbor refresh retains the same mesh');assert.notEqual(firstA.geometry,firstGeometry,'neighbor arrival rebuilds geometry');assert.equal(firstGeometryDisposed,true);assert.equal(firstA.geometry.getAttribute('position').getY(8),4,'neighbor captured heights reach the shared boundary');checkFine(firstA);
  let materialDisposed=false;firstA.material.addEventListener('dispose',()=>{materialDisposed=true;});const disposedTextures=new Set();firstA.userData.nativeTextures.forEach(t=>t.addEventListener('dispose',()=>disposedTextures.add(t)));
  await cache.request('c');assert.equal(fineFor(tiles[0]),undefined,'unretained oldest tile is actually evicted');assert.equal(firstA.parent,null);assert.equal(materialDisposed,true);assert.equal(disposedTextures.size,2);checkFine(fineFor(tiles[2]));assert.equal(cache.entries.has('a'),false);
  await cache.request('a');const recreated=fineFor(tiles[0]);checkFine(recreated);assert.notEqual(recreated,firstA,'reloading creates a fresh ordered fine mesh');assert.notEqual(recreated.material,firstA.material);assert.equal(reads.get('a'),2);assert.equal(native.stats().residentTiles,2);assert.deepEqual(native.stats().failures,[]);assert.equal(base.renderOrder,0);assert.equal(root.getObjectByName('native-island-webgl-sky').renderOrder,-1000);
 }finally{native.dispose();}
 assert.equal(root.children.length,0);
});
