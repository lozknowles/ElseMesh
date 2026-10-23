import {T} from './vendor/world-engine-contract.js';
/** Real tiny offscreen draws initialize both global-clipping program variants.
 * Renderer flags and root ownership are restored synchronously before any await.
 */
export async function prepareWebGLRepositoryResources({renderer,camera,root,targetScene}={}){
 if(!root||!renderer)throw Error('WebGL preparation dependencies required');
 const scene=new T.Scene();for(const n of targetScene?.children??[])if(n.isLight)scene.add(n.clone());
 const parent=root.parent,index=parent?.children.indexOf(root),visibility=[];root.traverse(n=>{visibility.push([n,n.visible,n.frustumCulled]);n.visible=true;if(n.isMesh)n.frustumCulled=false;});
 const target=new T.WebGLRenderTarget(1,1),oldTarget=renderer.getRenderTarget(),oldPlanes=renderer.clippingPlanes,oldAuto=renderer.autoClear;let wait;
 try{scene.add(root);renderer.setRenderTarget(target);renderer.autoClear=true;
  renderer.clippingPlanes=[];renderer.render(scene,camera);
  renderer.clippingPlanes=[new T.Plane(new T.Vector3(0,0,1),0)];renderer.render(scene,camera);
  wait=renderer.compileAsync(scene,camera,targetScene);
 }finally{
  root.removeFromParent();if(parent){parent.add(root);const at=parent.children.indexOf(root);parent.children.splice(at,1);parent.children.splice(index,0,root);}
  for(const [n,visible,cull]of visibility){n.visible=visible;n.frustumCulled=cull;}
  renderer.clippingPlanes=oldPlanes;renderer.autoClear=oldAuto;renderer.setRenderTarget(oldTarget);
 }
 try{await wait;return {ready:true};}finally{target.dispose();scene.clear();}
}

const functionIds=new WeakMap();let nextFunction=0;
const functionIdentity=fn=>{if(typeof fn!=='function')return null;if(!functionIds.has(fn))functionIds.set(fn,++nextFunction);return functionIds.get(fn);};
const supportedMaterialTypes=new Set(['MeshStandardMaterial','MeshPhysicalMaterial','MeshBasicMaterial','ShaderMaterial']);
const programFlags=['side','transparent','forceSinglePass','alphaTest','alphaHash','alphaToCoverage','premultipliedAlpha','vertexColors','flatShading','wireframe','fog','lights','toneMapped','dithering','normalMapType','glslVersion','sizeAttenuation','depthTest','depthWrite','blending'];
const textureIdentity=t=>t?.isTexture?[t.id,t.mapping,t.channel,t.colorSpace,t.format,t.type,t.flipY,t.minFilter,t.magFilter,t.wrapS,t.wrapT]:null;
/** Three mutates material.version for every double-sided transparent draw. This
 * signature records supported shader/resource structure, outside render callbacks.
 * Per-frame transforms, ordinary uniforms and renderer-owned versions are excluded.
 */
export function webGLRepositoryReadinessSignature(candidate){
 const nodes=[];candidate.root.traverse(node=>{
  if(!node.material)return;const geometry=node.geometry;
  const features={instanced:!!node.isInstancedMesh,skinned:!!node.isSkinnedMesh,batched:!!node.isBatchedMesh,attributes:Object.entries(geometry?.attributes??{}).map(([key,a])=>[key,a.itemSize,a.normalized,a.array?.constructor.name]).sort(),morph:Object.entries(geometry?.morphAttributes??{}).map(([key,a])=>[key,a.length,a[0]?.itemSize]).sort(),relative:geometry?.morphTargetsRelative};
  const materials=(Array.isArray(node.material)?node.material:[node.material]).map(m=>{
   if(!supportedMaterialTypes.has(m.type))throw Error('WebGL material requires explicit preparation support: '+m.type);
   const flags=Object.fromEntries(programFlags.map(k=>[k,m[k]])),textures=Object.entries(m).filter(([k,v])=>k==='map'||k.endsWith('Map')&&v?.isTexture).map(([k,v])=>[k,textureIdentity(v)]).sort();
   const uniformTextures=Object.entries(m.uniforms??{}).filter(([,u])=>u?.value?.isTexture).map(([k,u])=>[k,textureIdentity(u.value)]).sort();
   return {id:m.id,type:m.type,flags,textures,uniformTextures,defines:Object.entries(m.defines??{}).sort(),vertexShader:m.vertexShader,fragmentShader:m.fragmentShader,cacheKey:m.customProgramCacheKey?.(),compileHook:functionIdentity(m.onBeforeCompile)};
  });nodes.push({features,materials});
 });return JSON.stringify({contract:'repository-webgl/main+global-clip+double-side/1',nodes});
}
