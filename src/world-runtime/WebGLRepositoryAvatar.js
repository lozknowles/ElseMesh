import {createAvatarTransportPresentation,createAvatarTransportMaterialAdapter,prepareWebGLAvatarTransportMaterial} from './AvatarTransportPresentation.js';
import {T,BuiltinCharacterGLTFLoader} from './vendor/world-engine-contract.js';
import {AVATAR_STYLES,DEFAULT_APPEARANCE,validateAppearance,appearanceKey} from '../player/AvatarAppearance.js';

// Built-in, installed character assets only. Authored world assets retain their
// separate static-only validation and cannot supply URLs, shaders or animation.
const BASE=(import.meta.env?.BASE_URL||'/');
const REQUIRED_CLIPS=['idle','walk','run','helm'];
const LUMA='vec3(0.2126,0.7152,0.0722)';
function disposeScene(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){if(!material)continue;materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures){texture.image?.close?.();texture.dispose();}
}
function customizeMaterial(material,appearance){
 if(!['body','head','opacity'].includes(material.name))return;
 const uniforms=Object.fromEntries(['shirt','trousers','skin','hair'].map(key=>['avatar_'+key,{value:new T.Color(appearance[key])}]));
 material.userData.avatarUniforms=uniforms;
 const opacity=material.name==='opacity',zoneTexture=material.roughnessMap??material.metalnessMap;
 if(!opacity&&!zoneTexture)throw Error('Built-in character is missing its original appearance zone map.');
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  if(zoneTexture)shader.uniforms.avatarZoneMap={value:zoneTexture};
  shader.fragmentShader='uniform vec3 avatar_shirt;uniform vec3 avatar_trousers;uniform vec3 avatar_skin;uniform vec3 avatar_hair;'+(zoneTexture?'uniform sampler2D avatarZoneMap;':'')+'\n'+shader.fragmentShader;
  const tint=opacity
   ?'diffuseColor.rgb=avatar_hair*clamp(dot(diffuseColor.rgb,'+LUMA+')*4.0,0.12,1.8);'
   :'float avatarZone=floor(texture2D(avatarZoneMap,vMapUv).r*5.0+0.5);float avatarLight=dot(diffuseColor.rgb,'+LUMA+');if(avatarZone==1.0)diffuseColor.rgb=avatar_shirt*clamp(avatarLight*3.0,0.12,1.7);else if(avatarZone==2.0)diffuseColor.rgb=avatar_trousers*clamp(avatarLight*12.0,0.1,1.8);else if(avatarZone==3.0)diffuseColor.rgb=avatar_skin*clamp(avatarLight*3.0,0.06,1.5);else if(avatarZone==4.0)diffuseColor.rgb=avatar_hair*clamp(avatarLight*5.0,0.08,1.8);';
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+tint);
 };
 material.customProgramCacheKey=()=>opacity?'elsemesh-avatar-hair-v1':'elsemesh-avatar-zones-v1';
 material.needsUpdate=true;
}
export class WebGLRepositoryAvatar{
 constructor(scene,{prepareResources}={}){
  this.prepareResources=prepareResources;
  this.scene=scene;this.group=new T.Group();this.group.name='ElseMesh_builtin_animated_explorer';scene.add(this.group);
  this.appearance={...DEFAULT_APPEARANCE};this.version=0;this.disposed=false;this.cinematic=null;this.currentClip=null;this.materials=[];
  this.transportPresentation=createAvatarTransportPresentation({root:this.group,isWebGL:true,materialAdapter:createAvatarTransportMaterialAdapter(()=>this.materials,{isWebGL:true})});
  this.ready=this.setAppearance(this.appearance);this.ready.catch(()=>{});
 }
 setAppearance(value=DEFAULT_APPEARANCE){
  validateAppearance(value);if(this.disposed)return Promise.resolve(false);
  const key=appearanceKey(value);if(key===this.appearanceId)return this.ready??Promise.resolve(true);
  // Every changed intent invalidates an outstanding style load, including
  // cancellation back to the already displayed asset with new colours.
  const version=++this.version;
  this.appearanceId=key;this.appearance={...value};const asset=AVATAR_STYLES[value.style].asset;
  if(this.model&&this.asset===asset){this.tint();this.error=null;return this.ready=Promise.resolve(true);}
  this.ready=this.load(asset,version).catch(error=>{if(version===this.version&&!this.disposed){this.error=error.message;this.appearanceId=null;}throw error;});
  this.ready.catch(()=>{});return this.ready;
 }
 async load(asset,version){
  if(!['stock-player','stock-female'].includes(asset))throw Error('Unknown installed character.');
  const gltf=await new BuiltinCharacterGLTFLoader().loadAsync(BASE+'models/characters/'+asset+'.glb');
  if(this.disposed||version!==this.version){disposeScene(gltf.scene);return false;}
  try{
   const clips=new Map(gltf.animations.map(clip=>[clip.name,clip]));for(const name of REQUIRED_CLIPS)if(!clips.has(name))throw Error('Built-in character clip missing: '+name);
   const materials=new Set();gltf.scene.traverse(object=>{if(!object.isMesh)return;object.castShadow=true;object.frustumCulled=false;for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
   for(const material of materials){customizeMaterial(material,this.appearance);prepareWebGLAvatarTransportMaterial(material);}
   // Prepare the candidate and the already-owned FX material variants without
   // exposing it or replacing the current original avatar before readiness.
   if(this.prepareResources){const preparation=new T.Group();preparation.add(gltf.scene,this.transportPresentation.group.clone(true));try{await this.prepareResources(preparation);}finally{preparation.clear();}}
   if(this.disposed||version!==this.version){disposeScene(gltf.scene);return false;}
   this.mixer?.stopAllAction();if(this.model){this.group.remove(this.model);this.mixer?.uncacheRoot(this.model);disposeScene(this.model);}
   this.model=gltf.scene;this.asset=asset;this.materials=[...materials];this.group.add(this.model);this.mixer=new T.AnimationMixer(this.model);
   this.actions=new Map([...clips].map(([name,clip])=>[name,this.mixer.clipAction(clip)]));this.currentClip=null;this.play('idle');this.mixer.update(0);this.error=null;return true;
  }catch(error){disposeScene(gltf.scene);throw error;}
 }
 observeVerifiedTransfer(record,worldId){return this.transportPresentation.observeVerifiedTransfer(record,worldId);}
 async prepareTransportResources(prepareResources=this.prepareResources){await this.ready;return prepareResources?.(this.group);}
 tint(){for(const material of this.materials)for(const [key,uniform]of Object.entries(material.userData.avatarUniforms??{}))uniform.value.set(this.appearance[key.slice(7)]);}
 play(name){
  if(!this.actions||name===this.currentClip)return;const next=this.actions.get(name);if(!next)return;
  const previous=this.actions.get(this.currentClip);next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(.2).play();previous?.fadeOut(.2);this.currentClip=name;
 }
 update(dt,player,camera,freeCam=false){
  if(this.disposed)return;
  const c=this.cinematic;
  if(c){this.group.position.set(c.x,c.y,c.z);this.group.rotation.y=c.yaw??0;}
  else if(player){this.group.position.copy(player.position);this.group.rotation.y=(player.yaw??0)+Math.PI;}
  this.transportPresentation.update();
  const velocity=player?.velocity,speed=c?(c.speed??(c.walk?3.4:0)):Math.hypot(velocity?.x??0,velocity?.z??0);
  const mode=c?.mode??player?.mode,helm=mode==='helm'||mode==='boat'||c?.seated;
  this.play(helm?'helm':speed>.1?(speed>4.3?'run':'walk'):'idle');this.mixer?.update(Math.max(0,Math.min(.1,dt)));
  const localFirstPerson=!c&&!freeCam;this.group.visible=!localFirstPerson;
  if(this.group.visible&&camera?.position&&!freeCam){this.group.updateMatrixWorld(true);this.group.visible=camera.position.distanceTo(this.group.localToWorld(new T.Vector3(0,1.58,0)))>=.45;}
 }
 dispose(){
  if(this.disposed)return;this.transportPresentation.dispose();this.disposed=true;++this.version;this.mixer?.stopAllAction();if(this.model){this.mixer?.uncacheRoot(this.model);disposeScene(this.model);}this.group.removeFromParent();this.group.clear();this.materials=[];this.actions?.clear();
 }
}
