import {MICRODUCK_ASSET_VERSION,MICRODUCK_BYTES} from './MicroduckSpec.js';
import * as N from '../engine/index.js';
import {Material} from '../engine/render/Material.js';
import {parseGLB} from '../engine/loaders/GLTF.js';
import {T} from '../world-runtime/vendor/world-engine-contract.js';

const installedSources=new Map();
export const microduckUrl=()=>(import.meta.env?.BASE_URL||'/')+'models/microduck/microduck-realtime.glb';
export function loadPinnedMicroduck(url=microduckUrl(),{fetcher=fetch,timeoutMs=10000}={}){
 if(installedSources.has(url))return installedSources.get(url);
 const pending=(async()=>{
  const controller=new AbortController(),limit=Math.min(10000,Math.max(1,Number(timeoutMs)||10000));let reader;
  const timer=setTimeout(()=>controller.abort(Error('Microduck asset deadline exceeded')),limit);
  try{
   const response=await fetcher(url,{cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('Microduck asset unavailable');
   // Fetch exposes decoded bytes; compressed transfer Content-Length is not the model size.
   if(!response.body?.getReader)throw Error('Microduck asset stream unavailable');reader=response.body.getReader();const chunks=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MICRODUCK_BYTES)throw Error('Microduck asset exceeds byte limit');chunks.push(value);}
   if(size!==MICRODUCK_BYTES)throw Error('Microduck asset byte count mismatch');
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if('sha256:'+sha!==MICRODUCK_ASSET_VERSION)throw Error('Microduck asset integrity mismatch');return parseGLB(bytes.buffer);
  }finally{clearTimeout(timer);controller.abort();void reader?.cancel().catch(()=>{});}
 })();
 installedSources.set(url,pending);pending.catch(()=>{if(installedSources.get(url)===pending)installedSources.delete(url);});return pending;
}
const REQUIRED=['Idle','Walk','Turn','Stop','Look','EnterPortal','ExitPortal'];
/** Installed articulated robot, not an expansion of untrusted world GLB admission. */
export class RigidCharacterVisual {
 constructor({native=false,url=(import.meta.env?.BASE_URL||'/')+'models/microduck/microduck-realtime.glb',load=loadPinnedMicroduck}={}){
  this.api=native?N:T;this.native=native;this.root=new this.api.Group();this.root.name='Microduck';this.root.visible=false;this.disposed=false;
  this.ready=load(url).then(data=>{if(this.disposed)return false;this.build(data);return true;});this.ready.catch(()=>{});
 }
 build(data){
  for(const name of REQUIRED)if(!data.animations.some(a=>a.name===name))throw Error('Microduck missing clip '+name);
  if(data.skins.length||data.images.length)throw Error('Installed Microduck expects rigid untextured MJCF parts');
  this.data=data;this.geometries=[];this.materials=[];
  const A=this.api;
  this.nodes=data.nodes.map(n=>{const g=new A.Group();g.name=n.name;g.position.fromArray(n.t);g.quaternion.fromArray(n.r);g.scale.fromArray(n.s);return g;});
  this.materials=data.materials.map(m=>{const p=m.pbrMetallicRoughness??{},c=p.baseColorFactor??[.6,.6,.6,1],color=new A.Color().setRGB(...c.slice(0,3));return this.native?new Material({name:m.name,color,roughness:p.roughnessFactor??.6,metalness:p.metallicFactor??0,side:'double'}):new T.MeshStandardMaterial({name:m.name,color,roughness:p.roughnessFactor??.6,metalness:p.metallicFactor??0,side:T.DoubleSide});});
  this.fallback=this.native?new Material({color:'#888888'}):new T.MeshStandardMaterial({color:'#888888'});this.materials.push(this.fallback);
  const geometries=data.meshes.map(parts=>parts.map(part=>{
   if(part.mode!==4)throw Error('Microduck requires triangle primitives');
   const g=new A.BufferGeometry();for(const [key,name,size]of [['POSITION','position',3],['NORMAL','normal',3]])if(part.attributes[key])g.setAttribute(name,new A.BufferAttribute(part.attributes[key].array,size));
   if(part.indices)g.setIndex(new A.BufferAttribute(part.indices,1));if(!part.attributes.NORMAL)g.computeVertexNormals();g.computeBoundingSphere();this.geometries.push(g);return g;
  }));
  data.nodes.forEach((n,i)=>{if(n.mesh!==undefined)data.meshes[n.mesh].forEach((part,k)=>{const mesh=new A.Mesh(geometries[n.mesh][k],this.materials[part.material]??this.fallback);mesh.castShadow=true;mesh.receiveShadow=true;this.nodes[i].add(mesh);});for(const child of n.children)this.nodes[i].add(this.nodes[child]);});
  this.orientation=new A.Group();this.orientation.rotation.y=-Math.PI/2;this.root.add(this.orientation);for(const i of data.roots)this.orientation.add(this.nodes[i]);this.sample('Idle',0);this.root.visible=true;
 }
 sample(name,time){
  if(!this.data||this.disposed)return;const clip=this.data.animations.find(a=>a.name===name)??this.data.animations.find(a=>a.name==='Idle');
  const t=clip.duration>0?(['Walk','Turn'].includes(clip.name)?Math.max(0,time)%clip.duration:Math.min(clip.duration,Math.max(0,time))):0;
  this.data.nodes.forEach((n,i)=>{this.nodes[i].position.fromArray(n.t);this.nodes[i].quaternion.fromArray(n.r);this.nodes[i].scale.fromArray(n.s);});
  for(const ch of clip.channels){const times=ch.times;if(!times.length)continue;let lo=0,hi=times.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=t)lo=mid;else hi=mid;}if(t>=times[hi])lo=hi;
   const end=Math.min(lo+1,times.length-1),f=times[end]>times[lo]?Math.max(0,Math.min(1,(t-times[lo])/(times[end]-times[lo]))):0,size=ch.path==='rotation'?4:3,node=this.nodes[ch.node];
   if(ch.path==='rotation'){const q=new this.api.Quaternion().fromArray(ch.values,end*4);node.quaternion.fromArray(ch.values,lo*4).slerp(q,f);}
   else {const target=ch.path==='translation'?node.position:node.scale;target.set(...Array.from({length:size},(_,j)=>ch.values[lo*size+j]*(1-f)+ch.values[end*size+j]*f));}
  }
  this.clip=name;this.clipTime=t;
 }
 update(snapshot,dt=0){if(!snapshot||this.disposed)return;this.root.position.fromArray(snapshot.position);this.root.rotation.y=snapshot.yaw;this.sample(snapshot.clip??'Idle',(snapshot.clipTime??0)+dt);}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();for(const g of this.geometries??[])g.dispose();for(const m of this.materials??[])m.dispose();this.root.clear();}
}
