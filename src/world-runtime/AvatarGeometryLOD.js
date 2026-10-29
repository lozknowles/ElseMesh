import {loadGLB} from '../engine/loaders/GLTF.js';
import {Matrix4,Quaternion,Vector3} from '../engine/math/index.js';
import {registerGeometryLOD} from '../engine/render/PresentationLOD.js';

const sources=new Map(),BASE=import.meta.env?.BASE_URL||'/';
const INSTALLED=new Set(['stock-player','stock-female']);
const MATRIX_TOLERANCE=.002;
// Trusted installed-avatar presentation envelope. Male running poses extend
// beyond 1.21m from the torso centre; leave margin above the sampled asset poses.
export const AVATAR_LOD_RADIUS=1.35;
const fields={POSITION:['position',3],NORMAL:['normal',3],TEXCOORD_0:['uv',2],JOINTS_0:['skinIndex',4],WEIGHTS_0:['skinWeight',4]};
const extraFields={color:'COLOR_0',color_1:'COLOR_1',tangent:'TANGENT',uv1:'TEXCOORD_1',uv2:'TEXCOORD_2',uv3:'TEXCOORD_3'};
export function avatarLODSource(asset,level='',load=loadGLB){
 if(!INSTALLED.has(asset)||!['','medium','low'].includes(level))return Promise.reject(Error('Unknown installed avatar LOD'));
 const key=asset+(level?'-'+level:'');
 if(!sources.has(key)){
  const pending=Promise.resolve().then(()=>load(BASE+'models/characters/'+key+'.glb'));
  sources.set(key,pending);pending.catch(()=>{if(sources.get(key)===pending)sources.delete(key);});
 }
 return sources.get(key);
}
function close(a,b,label){
 if(a.length!==b.length||a.some((v,i)=>!Number.isFinite(v)||!Number.isFinite(b[i])||Math.abs(v-b[i])>MATRIX_TOLERANCE))throw Error('Incompatible avatar LOD '+label);
}
function localMatrix(node){return new Matrix4().compose(new Vector3(...node.t),new Quaternion(...node.r),new Vector3(...node.s)).elements;}
function meshPrimitives(source){
 const meshNodes=source.nodes.filter(n=>n.mesh!==undefined&&n.skin!==undefined);
 if(source.skins.length!==1||meshNodes.length!==1||meshNodes[0].skin!==0)throw Error('Incompatible avatar LOD skin layout');
 return {node:meshNodes[0],primitives:source.meshes[meshNodes[0].mesh]};
}
/** Only checked installed stock assets can supply geometry; no metadata is executed. */
export function validateAvatarGeometryLOD(full,reduced){
 const canonical=meshPrimitives(full),lod=meshPrimitives(reduced);
 const names=source=>source.skins[0].joints.map(i=>source.nodes[i].name);
 if(JSON.stringify(names(full))!==JSON.stringify(names(reduced)))throw Error('Incompatible avatar LOD joint order');
 close(full.skins[0].inverseBindMatrices,reduced.skins[0].inverseBindMatrices,'bind space');
 const parents=source=>{const out=source.nodes.map(()=>null);source.nodes.forEach(n=>n.children.forEach(i=>out[i]=n.name));return out;};
 const fullParents=parents(full),lodParents=parents(reduced),byName=new Map(reduced.nodes.map((n,i)=>[n.name,i]));
 if(full.nodes.length!==reduced.nodes.length||byName.size!==reduced.nodes.length)throw Error('Incompatible avatar LOD hierarchy');
 full.nodes.forEach((n,i)=>{const j=byName.get(n.name);if(j===undefined||fullParents[i]!==lodParents[j])throw Error('Incompatible avatar LOD hierarchy');close(localMatrix(n),localMatrix(reduced.nodes[j]),'rest transform');});
 close(localMatrix(canonical.node),localMatrix(lod.node),'mesh transform');
 if(canonical.primitives.length!==lod.primitives.length)throw Error('Incompatible avatar LOD primitive count');
 const materialNames=new Set();
 lod.primitives.forEach((p,i)=>{
  const name=reduced.materials[p.material]?.name;
  if(!name||name!==full.materials[canonical.primitives[i].material]?.name||materialNames.has(name)||p.mode!==4)throw Error('Incompatible avatar LOD material layout');
  materialNames.add(name);
  const count=p.attributes.POSITION?.array.length/3;
  for(const [field,[,size]]of Object.entries(fields)){
   const attr=p.attributes[field];
   if(!attr||attr.itemSize!==size||attr.array.length!==count*size||!attr.array.every(Number.isFinite))throw Error('Incompatible avatar LOD attributes');
  }
  for(const [field,original]of Object.entries(canonical.primitives[i].attributes)){
   if(fields[field])continue;
   const attr=p.attributes[field],color=field==='COLOR_0'||field==='COLOR_1';
   if(!attr||attr.array.length!==count*attr.itemSize||!attr.array.every(Number.isFinite)||
      (color?![3,4].includes(attr.itemSize):attr.itemSize!==original.itemSize))throw Error('Incompatible avatar LOD extra attributes');
  }
  if(!p.indices||p.indices.length%3||!p.indices.every(i=>Number.isInteger(i)&&i>=0&&i<count))throw Error('Incompatible avatar LOD indices');
  if(!p.attributes.JOINTS_0.array.every(j=>Number.isInteger(j)&&j>=0&&j<full.skins[0].joints.length))throw Error('Incompatible avatar LOD joint indices');
  const weights=attributeFloats(p.attributes.WEIGHTS_0);
  for(let i=0;i<weights.length;i+=4)if(weights.slice(i,i+4).some(w=>w<0)||Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1)>.001)throw Error('Incompatible avatar LOD weights');
 });
 return lod.primitives;
}
function attributeFloats(attribute){
 const scale=attribute.normalized?(attribute.array instanceof Uint8Array?1/255:attribute.array instanceof Uint16Array?1/65535:1):1;
 return Float32Array.from(attribute.array,v=>v*scale);
}
export function createAvatarLODGeometry(primitive,canonical,{BufferGeometry,BufferAttribute}){
 const geometry=new BufferGeometry();
 for(const [field,[name,size]]of Object.entries(fields)){
  const attribute=primitive.attributes[field];
  // Three's GLSL skinIndex is floating-point input; keep the original glTF's
  // Uint16 storage. Native shaders instead require their canonical Uint32 input.
  const IndexArray=canonical.getAttribute?.('skinIndex')?.array.constructor??Uint32Array;
  let array=name==='skinIndex'?IndexArray.from(attribute.array):attributeFloats(attribute);
  if(name==='skinWeight')for(let i=0;i<array.length;i+=4){const total=array[i]+array[i+1]+array[i+2]+array[i+3];for(let j=0;j<4;j++)array[i+j]/=total;}
  geometry.setAttribute(name,new BufferAttribute(array,size));
 }
 const builtNames=new Set(Object.values(fields).map(([name])=>name));
 for(const [name,original]of Object.entries(canonical.attributes??{})){
  if(builtNames.has(name))continue;
  const field=extraFields[name],source=primitive.attributes[field];
  if(!field||!source)throw Error('Incompatible avatar LOD required attribute '+name);
  const color=name==='color'||name==='color_1',values=attributeFloats(source),ArrayType=original.array.constructor;
  if(source.itemSize!==original.itemSize&&!(color&&source.itemSize===3&&original.itemSize===4))throw Error('Incompatible avatar LOD attribute size '+name);
  if(source.itemSize===3&&original.itemSize===4){
   const max=original.normalized?(ArrayType===Uint8Array?255:ArrayType===Uint16Array?65535:NaN):1;
   for(let i=3;i<original.array.length;i+=4)if(original.array[i]!==max)throw Error('Incompatible avatar LOD missing vertex alpha');
  }
  const scale=original.normalized?(ArrayType===Uint8Array?255:ArrayType===Uint16Array?65535:NaN):1;
  if(!Number.isFinite(scale))throw Error('Incompatible avatar LOD normalized attribute '+name);
  const array=new ArrayType(values.length/source.itemSize*original.itemSize);
  for(let v=0;v<values.length/source.itemSize;v++)for(let c=0;c<original.itemSize;c++){
   const value=c<source.itemSize?values[v*source.itemSize+c]:1;
   if(color&&(value<0||value>1))throw Error('Incompatible avatar LOD vertex color');
   array[v*original.itemSize+c]=original.normalized?Math.round(value*scale):value;
  }
  const attribute=new BufferAttribute(array,original.itemSize,original.normalized);
  if(original.gpuType!==undefined)attribute.gpuType=original.gpuType;
  geometry.setAttribute(name,attribute);
 }
 geometry.setIndex(new BufferAttribute(primitive.indices.slice(),1));
 // Preserve the canonical full-detail bounds, including the native animated sphere.
 geometry.boundingSphere=canonical.boundingSphere;geometry.boundingBox=canonical.boundingBox;
 return geometry;
}
/** Builds only geometry. The owner controls freshness, prewarming and GPU retirement. */
export async function installAvatarGeometryLOD({asset,full,root,meshes,engine,prepareResources,isCurrent=()=>true,retire=fn=>fn(),loadSource=avatarLODSource}){
 if(!INSTALLED.has(asset)||!full||!isCurrent())return null;
 const variants=await Promise.all(['medium','low'].map(level=>loadSource(asset,level)));
 if(!isCurrent())return null;
 const primitives=variants.map(source=>validateAvatarGeometryLOD(full,source));
 const canonical=meshPrimitives(full).primitives,owned=[],bindings=[];
 let controller;
 const release=()=>{controller?.dispose();for(const binding of bindings)binding.mesh.geometry=binding.geometries[0];retire(()=>owned.forEach(g=>g.dispose()));};
 try{
  if(meshes.length!==canonical.length)throw Error('Incompatible avatar LOD runtime mesh count');
  canonical.forEach((p,i)=>{
   const name=full.materials[p.material].name;
   const candidates=meshes.filter(mesh=>!Array.isArray(mesh.material)&&mesh.material?.name.replace(/^skinned-/,'')===name);
   if(candidates.length!==1)throw Error('Incompatible avatar LOD runtime materials');
   const mesh=candidates[0],geometries=[mesh.geometry];
   for(const level of primitives){const geometry=createAvatarLODGeometry(level[i],mesh.geometry,engine);owned.push(geometry);geometries.push(geometry);}
   bindings.push({mesh,geometries});
  });
  // Detached proxy meshes share existing skeletons/materials. No texture, mixer or
  // skeleton is created, and no live geometry changes during asynchronous preparation.
  if(prepareResources)for(let level=1;level<=2;level++){
   if(!isCurrent()){release();return null;}
   const preparation=new engine.Group();
   for(const binding of bindings){const proxy=binding.mesh.clone(false);proxy.geometry=binding.geometries[level];preparation.add(proxy);}
   try{await prepareResources(preparation);}finally{preparation.clear();}
  }
  if(!isCurrent()){release();return null;}
  controller=registerGeometryLOD(root,{bindings,center:[0,.9,0],radius:AVATAR_LOD_RADIUS,thresholds:[48,24]});
  let disposed=false;
  return {controller,bindings,dispose(){if(disposed)return;disposed=true;release();}};
 }catch(error){release();throw error;}
}
