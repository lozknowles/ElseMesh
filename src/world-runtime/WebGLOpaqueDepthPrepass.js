import {T} from './vendor/world-engine-contract.js';

// Qualification covers only these authored Warehouse bytes. A different world
// or content digest requires fresh visual and performance qualification.
const QUALIFIED_WAREHOUSE_WORLD_ID='elsemesh.world:2842c4f2-93a0-4492-b942-e53e524de319';
const QUALIFIED_WAREHOUSE_CONTENT_DIGEST='fcba18b28ac9b8bf7ef52a1fc8ba0d3dc489d0bd4c94c651cdc559a7617a0e5d';

export function getQualifiedWarehouseDepthOccluders(active){
 if(!active||active.disposed||active.identity?.worldId!==QUALIFIED_WAREHOUSE_WORLD_ID||
  active.identity.contentDigest!==QUALIFIED_WAREHOUSE_CONTENT_DIGEST)return [];
 return active.depthOccluders??[];
}

function supportedCompileChain(mesh,m){
 const original=T.Material.prototype.onBeforeCompile,originalKey=T.Material.prototype.customProgramCacheKey;
 if(m.onBeforeCompile===original&&m.customProgramCacheKey===originalKey)return true;
 // The audited shelter installer records the material and captures its PRIOR
 // key. Exact default-key suffix excludes chains built over custom plant/depth hooks.
 let scene=mesh;while(scene.parent)scene=scene.parent;
 if(!scene.isScene||!scene.userData.weatherShelter?.installed?.has(m)||
  typeof m.onBeforeCompile!=='function'||typeof m.customProgramCacheKey!=='function')return false;
 const hook=m.onBeforeCompile.toString();
 // GLSL markers survive bundler minification and reject replacement hooks after installation.
 if(!['vWeatherWorld','weatherExteriorDistance','#include <fog_vertex>','#include <fog_fragment>'].every(s=>hook.includes(s))||/gl_FragDepth|gl_Position/.test(hook))return false;
 try{return m.customProgramCacheKey()===original.toString()+'|weather-shelter-v1';}catch{return false;}
}

/** Conservative draw-time guard; selection of authored structures belongs to the caller. */
export function isEligibleWebGLDepthOccluder(mesh){
 const m=mesh?.material;
 return !!(mesh?.isMesh&&!mesh.isSkinnedMesh&&!mesh.isBatchedMesh&&mesh.visible&&mesh.geometry&&
  !mesh.morphTargetInfluences?.length&&!Object.keys(mesh.geometry.morphAttributes??{}).length&&
  mesh.onBeforeRender===T.Object3D.prototype.onBeforeRender&&mesh.onAfterRender===T.Object3D.prototype.onAfterRender&&
  m&&!Array.isArray(m)&&(m.isMeshStandardMaterial||m.isMeshBasicMaterial)&&m.visible&&supportedCompileChain(mesh,m)&&
  m.onBeforeRender===T.Material.prototype.onBeforeRender&&m.opacity===1&&!m.transparent&&
  !m.transmission&&!m.alphaTest&&!m.alphaHash&&!m.alphaToCoverage&&!m.alphaMap&&
  m.depthTest&&m.depthWrite&&m.depthFunc===T.LessEqualDepth&&m.colorWrite&&
  !m.stencilWrite&&!m.polygonOffset&&!m.displacementMap&&!m.clippingPlanes?.length&&
  (m.blending===T.NormalBlending||m.blending===T.NoBlending));
}

/** Synchronous main-frame depth fill followed by the unchanged original colour draw.
 * Borrows admitted meshes/materials; creates no resources and never advances simulation.
 */
export function renderWebGLOpaqueDepthPrepass({renderer:r,scene,camera,occluders=[],enabled=true,onPhase=()=>{}}){
 const render=r.render.bind(r),initialCalls=r.info.render.calls,initialAutoReset=r.info.autoReset;
 const fallback=(reason,eligibleOccluders=0)=>{try{onPhase('color');render(scene,camera);const total=initialAutoReset?r.info.render.calls:r.info.render.calls-initialCalls;return {used:false,reason,eligibleOccluders,depthDrawCalls:0,colorDrawCalls:total,additionalDrawCalls:0,totalDrawCalls:total};}finally{onPhase('idle');}};
 if(!enabled||!occluders.length)return fallback(!enabled?'disabled':'no-eligible-occluders');
 const renderables=[],members=new Set();let hasTransmission=false,hasStencilWrite=false;
 scene.traverse(o=>{
  members.add(o);
  // Stencil is scene-wide state: even an unselected or array material can
  // depend on the original clear/draw order. Leave such scenes untouched.
  for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.stencilWrite)hasStencilWrite=true;
  if(o.isMesh||o.isLine||o.isPoints||o.isSprite){renderables.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.transmission>0)hasTransmission=true;}
 });
 const selected=[...new Set(occluders)].filter(o=>members.has(o)&&isEligibleWebGLDepthOccluder(o));
 let reason=!enabled?'disabled':!r.isWebGLRenderer?'renderer':!scene.isScene||!camera?.isPerspectiveCamera||camera.isArrayCamera?'scene-or-camera':
  r.getRenderTarget()!==null?'render-target':r.xr?.enabled||r.xr?.isPresenting?'xr':r.shadowMap?.enabled?'shadows':hasTransmission?'transmission':hasStencilWrite?'stencil':
  scene.onBeforeRender!==T.Object3D.prototype.onBeforeRender||scene.onAfterRender!==T.Object3D.prototype.onAfterRender?'scene-callback':
  scene.overrideMaterial?'override-material':r.clippingPlanes?.length||r.localClippingEnabled?'clipping':
  !r.autoClear||!r.autoClearColor||!r.autoClearDepth?'clear-policy':!selected.length?'no-eligible-occluders':null;
 if(reason)return fallback(reason,selected.length);
 const saved={background:scene.background,autoClear:r.autoClear,autoClearColor:r.autoClearColor,autoClearDepth:r.autoClearDepth,autoClearStencil:r.autoClearStencil};
 const selectedSet=new Set(selected),masks=renderables.map(o=>[o,o.layers.mask]),materials=new Map();
 for(const o of selected)if(!materials.has(o.material))materials.set(o.material,o.material.colorWrite);
 let depthDrawCalls=0,colorDrawCalls=0;
 try{
  // Groups and lights remain intact; masking a renderable does not mask its children.
  for(const o of renderables)if(!selectedSet.has(o))o.layers.mask=0;
  for(const m of materials.keys())m.colorWrite=false;
  scene.background=null;r.autoClear=true;r.autoClearColor=true;r.autoClearDepth=true;r.autoClearStencil=saved.autoClearStencil;
  r.info.autoReset=false;if(initialAutoReset)r.info.reset();
  let calls=r.info.render.calls;onPhase('depth');render(scene,camera);depthDrawCalls=r.info.render.calls-calls;
  for(const[o,mask]of masks)o.layers.mask=mask;for(const[m,colorWrite]of materials)m.colorWrite=colorWrite;
  scene.background=saved.background;r.autoClear=false;
  // A Color background forces WebGLBackground.clear even with autoClear=false.
  // Its colour clear is allowed, but depth/stencil must survive into the original draw.
  r.autoClearDepth=false;r.autoClearStencil=false;
  calls=r.info.render.calls;onPhase('color');render(scene,camera);colorDrawCalls=r.info.render.calls-calls;
  return {used:true,reason:null,eligibleOccluders:selected.length,depthDrawCalls,colorDrawCalls,additionalDrawCalls:depthDrawCalls,totalDrawCalls:depthDrawCalls+colorDrawCalls};
 }finally{
  for(const[o,mask]of masks)o.layers.mask=mask;for(const[m,colorWrite]of materials)m.colorWrite=colorWrite;
  scene.background=saved.background;r.autoClear=saved.autoClear;r.autoClearColor=saved.autoClearColor;r.autoClearDepth=saved.autoClearDepth;r.autoClearStencil=saved.autoClearStencil;r.info.autoReset=initialAutoReset;
  onPhase('idle');
 }
}
