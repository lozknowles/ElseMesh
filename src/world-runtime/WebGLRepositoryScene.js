import { T, resolveWorldMatrices,effectiveObjectState,buildComputerGeometry,disposeComputerGeometry,inspectAndLoadAsset,disposeAssetScene,acquireNeonGeometry,sampleNeonEffect,createTreeGeometry,buildFeatureGeometry } from './vendor/world-engine-contract.js';
import { Vector3 } from '../engine/index.js';
import { Colliders } from '../world/Colliders.js';
import { repositoryWaterQuery } from './RepositoryWater.js';
import { assetPrimitiveGroups } from './NativeAssets.js';
import { makeRetroScreenMaterial } from '../world/PortalRetroScreens.js';
import { buildRecipe } from '../world/PortalInteriorRecipe.js';

const standard=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,side:T.DoubleSide,...extra});
const screens=new Map(buildRecipe().screens.map(s=>[s.id,s]));
/** Reuses the installed game's original canvas artwork; no native GPU is initialized. */
export function buildWebGLRetroMaterial(kind){
 const spec=screens.get(kind);if(!spec)throw Error('Unsupported repository terminal '+kind);
 const native=makeRetroScreenMaterial(spec),source=native.bindings.retroDisplay.texture;
 try{
  if(!source.pendingData)throw Error('Installed retro artwork has no CPU pixels.');
  const texture=new T.DataTexture(new Uint8Array(source.pendingData),source.width,source.height,T.RGBAFormat,T.UnsignedByteType);
  texture.flipY=true;texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
  const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});material.name='repository-retro:'+kind;return material;
 }finally{native.dispose();source.destroy();}
}
export function buildWebGLNeon(config){
 const acquired=acquireNeonGeometry(config),source=acquired.value,group=new T.Group(),letters=[];
 const add=(geometry,material)=>{const mesh=new T.Mesh(geometry.clone(),material);group.add(mesh);return mesh;};
 try{
  for(const glyph of config.effect.mode==='sequence'?source.glyphs:[{geometry:source.geometry,index:-1}]){
   const material=standard(config.color,{emissive:config.color,roughness:.35}),item=add(glyph.geometry,material);letters.push({item,material,index:glyph.index});
  }
  if(source.backingGeometry)add(source.backingGeometry,standard(config.backingColor));
  if(source.mountingGeometry)add(source.mountingGeometry,standard('#555b61',{metalness:.7}));
  if(source.frameGeometry)add(source.frameGeometry,standard('#343b40',{metalness:.65}));
 }finally{acquired.release();}
 group.userData.updateNeon=(time,hour,powered=config.powered)=>{
  const state=sampleNeonEffect({...config,powered},time,hour);
  for(const letter of letters){const amount=(state.litGlyphs===undefined||letter.index<state.litGlyphs)?state.brightness:0;letter.material.color.set(state.color).multiplyScalar(amount>0?.6:.055);letter.material.emissive.set(state.color).multiplyScalar(amount*(1+config.glow*2));}
  group.userData.neonState={text:config.text,powered,brightness:state.brightness,color:state.color,glyphs:source.glyphs.length};
 };
 group.userData.updateNeon(0,14);return group;
}
export function disposeWebGLRepositoryScene(candidate){
 if(!candidate||candidate.disposed)return;candidate.disposed=true;
 candidate.root?.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();
 candidate.root?.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
 for(const loaded of candidate.loadedAssets??[])disposeAssetScene(loaded.scene);
 candidate.loadedAssets?.clear();
}
function terrainGeometry(project){
 const {width,depth,resolution,heights,materials}=project.terrain,positions=[],colors=[],indices=[],palette=[[.38,.49,.32],[.54,.39,.27],[.48,.5,.48],[.7,.63,.43]];
 for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){const i=z*resolution+x,h=heights[i];positions.push(x*width/(resolution-1)-width/2,h,z*depth/(resolution-1)-depth/2);colors.push(...palette[materials[i]].map(v=>v*Math.max(.68,Math.min(1.22,.88+h/55))));if(x<resolution-1&&z<resolution-1)indices.push(i,i+resolution,i+1,i+1,i+resolution,i+resolution+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
async function terrainMaterial(project,geometry){
 const material=standard('#ffffff',{vertexColors:true,roughness:.92});
 if(!project.terrainImagery)return material;
 const image=project.terrainImagery,geo=project.geography;
 if(!geo||image.crs!=='EPSG:27700'||geo.crs!=='EPSG:27700')throw Error('Imagery and terrain must use EPSG:27700.');
 const response=await fetch(image.dataUrl);if(!response.ok)throw Error('Terrain imagery failed');
 const bitmap=await createImageBitmap(await response.blob());if(bitmap.width>8192||bitmap.height>8192||bitmap.width*bitmap.height>32000000){bitmap.close();throw Error('Terrain imagery decoded budget exceeded.');}
 const texture=new T.Texture(bitmap);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
 const west=image.bounds.west-geo.center.easting,northZ=geo.center.northing-image.bounds.north,width=image.bounds.east-image.bounds.west,depth=image.bounds.north-image.bounds.south;
 const pos=geometry.getAttribute('position'),uv=[];
 for(let i=0;i<pos.count;i++)uv.push((pos.getX(i)-west)/width,1-(pos.getZ(i)-northZ)/depth);
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));material.map=texture;
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 if(all(greaterThanEqual(vMapUv,vec2(0.0)))&&all(lessThanEqual(vMapUv,vec2(1.0)))){vec4 sampledDiffuseColor=texture2D(map,vMapUv);diffuseColor*=sampledDiffuseColor;}
#endif`);};material.customProgramCacheKey=()=> 'repository-geographic-imagery/1';
 texture.addEventListener('dispose',()=>bitmap.close());return material;
}
function forest(project,matrices,time){
 const root=new T.Group(),groups=new Map();
 for(const o of project.objects.filter(o=>o.kind==='tree'&&effectiveObjectState(project.objects,o.id).visible)){
  const key=(o.treeSpecies??'broadleaf')+':'+((o.treeSeed??7319)>>>0)%4;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 }
 for(const [key,objects]of groups){
  const [species,seed]=key.split(':'),data=createTreeGeometry(species,7319+Number(seed)*113);
  for(const part of ['bark','foliage']){
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data[part].positions,3));geometry.setIndex(data[part].indices);geometry.computeVertexNormals();
   const material=standard(part==='bark'?'#594633':'#ffffff');
   material.onBeforeCompile=shader=>{shader.uniforms.repositoryTime=time;shader.vertexShader='uniform float repositoryTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(repositoryTime*0.85+position.y*.17)*pow(max(position.y/7.0,0.0),2.0)*.09;');};
   material.customProgramCacheKey=()=> 'repository-tree-wind/1';
   const mesh=new T.InstancedMesh(geometry,material,objects.length);mesh.userData.editorObjectIds=objects.map(o=>o.id);
   for(let i=0;i<objects.length;i++){mesh.setMatrixAt(i,matrices.get(objects[i].id));if(part==='foliage')mesh.setColorAt(i,new T.Color(objects[i].color));}mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;root.add(mesh);
  }
 }
 root.userData.updateTreeLOD=()=>{};root.userData.treePreviewStats=()=>({sourceTrees:[...groups.values()].reduce((n,a)=>n+a.length,0),batches:root.children.length,policy:'four shared variants per species'});return root;
}
function sea(project,time){
 const water=project.water;if(!water)return null;
 const geometry=new T.PlaneGeometry(water.extent,water.extent,128,128);geometry.rotateX(-Math.PI/2);
 const material=standard('#13627c',{roughness:.16,metalness:.12,transparent:true,opacity:.94});
 material.onBeforeCompile=shader=>{shader.uniforms.repositoryTime=time;shader.vertexShader='uniform float repositoryTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.y = ${water.level.toFixed(8)} + ${water.waveAmplitude.toFixed(8)} * sin(position.x*.04+position.z*.03+repositoryTime*${water.waveSpeed.toFixed(8)});`);};
 material.customProgramCacheKey=()=> 'repository-sea:'+JSON.stringify(water);const mesh=new T.Mesh(geometry,material);mesh.userData.repositoryWater=true;return mesh;
}
/** Same admitted descriptor, terrain and native collision controller as WebGPU.
 * Source glTF materials/textures remain owned until candidate disposal; static primitives are
 * batched by asset+override+terminal kind, preserving saved world matrices and object IDs.
 */
export async function buildWebGLRepositoryScene(descriptor,camera){
 const project=descriptor.project,root=new T.Group(),candidate={root,descriptor,terrain:descriptor.terrain,colliders:new Colliders(),query:repositoryWaterQuery(project.water),assets:[],loadedAssets:new Set()};
 candidate.project=project;root.name='repository-world:'+descriptor.worldId;const time={value:0};root.userData.updateWebGL=t=>{time.value=t;};
 try{
  for(const b of descriptor.boxes)candidate.colliders.addBox(new Vector3(...b.center),new Vector3(...b.half),0,{walkable:b.walkable,solid:b.solid,tag:b.id});
  const ground=terrainGeometry(project);root.add(new T.Mesh(ground,await terrainMaterial(project,ground)));
  const matrices=resolveWorldMatrices(project.objects);candidate.matrices=matrices;
  const add=(parent,geometry,color)=>parent.add(new T.Mesh(geometry,standard(color)));
  for(const object of project.objects){
   if(['group','tree','glb'].includes(object.kind)||!effectiveObjectState(project.objects,object.id).visible)continue;
   const item=new T.Group();item.userData.editorObjectId=object.id;item.matrixAutoUpdate=false;item.matrix.copy(matrices.get(object.id));root.add(item);
   if(object.kind==='computer'){const computer=buildComputerGeometry();try{for(const p of computer.parts){const color=p.emissive?object.computer.screenColor:p.color;item.add(new T.Mesh(p.geometry.clone(),p.emissive?new T.MeshBasicMaterial({color,side:T.DoubleSide}):standard(color)));}}finally{disposeComputerGeometry(computer);}}
   else if(object.kind==='neon-sign'){const neon=buildWebGLNeon(object.neon);neon.userData.neonObjectId=object.id;item.add(neon);}
   else if(object.kind==='building'){add(item,new T.BoxGeometry(3.6,2.2,3).translate(0,1.1,0),object.color);add(item,new T.ConeGeometry(2.7,1.1,4).rotateY(Math.PI/4).translate(0,2.55,0),'#574e42');}
   else if(['box','sphere','cylinder','cone'].includes(object.kind))add(item,object.kind==='sphere'?new T.SphereGeometry(.8,24,16):object.kind==='cylinder'?new T.CylinderGeometry(.65,.65,1.6,24):object.kind==='cone'?new T.ConeGeometry(.8,1.6,24):new T.BoxGeometry(1.6,1.6,1.6),object.color);
   else throw Error('Unsupported WebGL repository object '+object.kind);
  }
  const groups=new Map(),cache=new Map(),screensByObject=new Map((project.terminals??[]).filter(t=>t.screenObjectId).map(t=>[t.screenObjectId,t.kind]));
  for(const object of project.objects.filter(o=>o.kind==='glb'&&effectiveObjectState(project.objects,o.id).visible)){const kind=screensByObject.get(object.id),key=object.assetId+JSON.stringify(object.materialOverrides??[])+(kind??'');if(!groups.has(key))groups.set(key,{objects:[],kind});groups.get(key).objects.push(object);}
  for(const {objects,kind}of groups.values()){
   const first=objects[0],asset=project.assets.find(a=>a.id===first.assetId);if(!asset)throw Error('Missing asset '+first.assetId);
   let loaded=cache.get(asset.id);if(!loaded){const response=await fetch(asset.dataUrl);if(!response.ok)throw Error('Asset read failed');loaded=await inspectAndLoadAsset(await response.arrayBuffer());cache.set(asset.id,loaded);candidate.loadedAssets.add(loaded);}
   loaded.scene.updateMatrixWorld(true);const materialCache=new Map(),retro=kind?buildWebGLRetroMaterial(kind):null;let primitives=0;
   loaded.scene.traverse(child=>{
    if(!child.isMesh||!child.visible)return;
    if(child.isSkinnedMesh||child.morphTargetInfluences?.length)throw Error('Animated GLB repository meshes are unsupported.');
    for(const part of assetPrimitiveGroups(child)){
     const slot=loaded.materialIndices.get(part.material)??-1;let material=retro??materialCache.get(part.material);
     if(!material){material=part.material.clone();const override=first.materialOverrides?.find(o=>o.materialIndex===slot);if(override?.color!==undefined)material.color.set(override.color);if(override?.roughness!==undefined)material.roughness=override.roughness;if(override?.metalness!==undefined)material.metalness=override.metalness;materialCache.set(part.material,material);}
     const mesh=new T.InstancedMesh(part.geometry,material,objects.length);mesh.userData.editorObjectIds=objects.map(o=>o.id);
     for(let i=0;i<objects.length;i++)mesh.setMatrixAt(i,matrices.get(objects[i].id));mesh.instanceMatrix.needsUpdate=true;root.add(mesh);primitives++;
    }
   });for(const object of objects)candidate.assets.push({objectId:object.id,primitives,kind,backend:'webgl2'});
  }
  candidate.assetBatchCount=groups.size;candidate.forest=forest(project,matrices,time);root.add(candidate.forest);
  const water=sea(project,time);if(water)root.add(water);
  for(const feature of project.features??[]){if(feature.visible===false)continue;for(const part of buildFeatureGeometry(feature,project)){const wet=['water','foam'].includes(part.semantic);root.add(new T.Mesh(part.geometry,standard(part.color,wet?{roughness:.22,transparent:true,opacity:.9,metalness:.1}:{})));}}
  root.updateMatrixWorld(true);return candidate;
 }catch(error){disposeWebGLRepositoryScene(candidate);throw error;}
}
