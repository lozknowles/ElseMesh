import * as N from '../engine/index.js';
import {Material} from '../engine/render/Material.js';
import {T} from './vendor/world-engine-contract.js';
import {nativeGeometry} from './RepositoryScene.js';

export const AVATAR_TRANSPORT_DURATION_MS=1500;
export function nativeAvatarTransportUniforms(){return {avatarTransportActive:['f32',0],avatarTransportProgress:['f32',1],avatarTransportOrigin:['vec3f',new N.Vector3()],avatarTransportHeight:['f32',1.9]};}
export const NATIVE_AVATAR_TRANSPORT_SURFACE=`
 if(mat.avatarTransportActive>0.5){
  let transportP=in.P-mat.avatarTransportOrigin;
  let transportNoise=fract(sin(dot(floor(transportP*65.0),vec3f(12.9898,78.233,37.719)))*43758.5453);
  let transportHeight=clamp(transportP.y/mat.avatarTransportHeight,0.0,1.1);
  let transportCut=mat.avatarTransportProgress*1.24-0.12;
  if(transportHeight+transportNoise*0.12>transportCut){discard;}
  let transportEdge=1.0-smoothstep(0.015,0.10,abs(transportHeight-transportCut));
  s.emissive+=vec3f(0.15,0.75,1.0)*transportEdge*6.0;
 }`;
export function prepareWebGLAvatarTransportMaterial(material){
 if(material.userData.avatarTransportUniforms)return;
 const uniforms={avatarTransportActive:{value:0},avatarTransportProgress:{value:1},avatarTransportOrigin:{value:new T.Vector3()},avatarTransportHeight:{value:1.9}};
 material.userData.avatarTransportUniforms=uniforms;const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 avatarTransportWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','avatarTransportWorld=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <project_vertex>');
  shader.fragmentShader='varying vec3 avatarTransportWorld;uniform float avatarTransportActive;uniform float avatarTransportProgress;uniform vec3 avatarTransportOrigin;uniform float avatarTransportHeight;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
  float avatarTransportEdge=0.0;
  if(avatarTransportActive>0.5){
   vec3 transportP=avatarTransportWorld-avatarTransportOrigin;
   float transportNoise=fract(sin(dot(floor(transportP*65.0),vec3(12.9898,78.233,37.719)))*43758.5453);
   float transportHeight=clamp(transportP.y/avatarTransportHeight,0.0,1.1);
   float transportCut=avatarTransportProgress*1.24-0.12;
   if(transportHeight+transportNoise*0.12>transportCut)discard;
   avatarTransportEdge=1.0-smoothstep(0.015,0.10,abs(transportHeight-transportCut));
  }
  #include <alphatest_fragment>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(0.15,0.75,1.0)*avatarTransportEdge*6.0;');
 };
 material.customProgramCacheKey=()=>previousKey+'|original-avatar-materialisation-v1';material.needsUpdate=true;
}
export function createAvatarTransportMaterialAdapter(getMaterials,{isWebGL=false}={}){
 return {setState({active,progress,origin,height}){for(const material of getMaterials()??[]){
  if(isWebGL){const u=material.userData.avatarTransportUniforms;if(!u)continue;u.avatarTransportActive.value=active?1:0;u.avatarTransportProgress.value=progress;u.avatarTransportOrigin.value.set(...origin);u.avatarTransportHeight.value=height;}
  else if(material.uniforms.avatarTransportActive){material.set('avatarTransportActive',active?1:0);material.set('avatarTransportProgress',progress);material.uniforms.avatarTransportOrigin.value.set(...origin);material.set('avatarTransportHeight',height);}
 }}};
}
function sparkGeometry(height){
 const positions=[],normals=[],uvs=[],indices=[];
 for(let i=0;i<80;i++){
  const angle=i*2.3999632297,r=.08+.38*((i*37%79)/79),x=Math.cos(angle)*r,z=Math.sin(angle)*r,y=height*((i*29%79)/79);
  for(const perpendicular of [false,true]){const base=positions.length/3,dx=perpendicular?0:.012,dz=perpendicular?.012:0;
   for(const [sx,sy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){positions.push(x+sx*dx,y+sy*.035,z+sx*dz);normals.push(0,0,1);uvs.push((sx+1)/2,(sy+1)/2);}
   indices.push(base,base+1,base+2,base+1,base+3,base+2);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}
/** Presentation only. Callers supply a verified authority record for this avatar.
 * No membership, player pose, appearance, animation or camera is changed here. */
export function createAvatarTransportPresentation({root,materialAdapter,isWebGL=false,height=1.9,now=()=>Date.now()}={}){
 if(!root)throw Error('Original avatar root required');
 const E=isWebGL?T:N,group=new E.Group();group.name='Original avatar transporter particles';group.userData.avatarTransportPresentation=true;root.add(group);
 const geometry=source=>{if(isWebGL)return source;const result=nativeGeometry(source);source.dispose();return result;};
 const material=isWebGL?new T.MeshBasicMaterial({name:'Avatar transporter energy',color:'#83efff',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,toneMapped:false}):new Material({name:'Avatar transporter energy',color:'#83efff',emissive:'#83efff',lit:false,transparent:true,opacity:0,depthWrite:false,side:'double'});
 const sparks=new E.Mesh(geometry(sparkGeometry(height)),material);sparks.frustumCulled=false;sparks.name='Avatar transporter three dimensional sparks';group.add(sparks);
 const ring=new E.Mesh(geometry(new T.TorusGeometry(.43,.014,5,64)),material);ring.rotation.x=Math.PI/2;ring.frustumCulled=false;ring.name='Avatar transporter materialisation scan';group.add(ring);
 let active=null,disposed=false,highestGeneration=-1,lastProgress=1;const seen=new Map();
 const apply=(enabled,progress,time)=>{
  const origin=root.localToWorld(new E.Vector3()).toArray();materialAdapter?.setState({active:enabled,progress,origin,height,time});
  const envelope=enabled?Math.max(.12,Math.sin(Math.PI*Math.min(.97,progress))):0;material.opacity=envelope*.9;
  ring.position.y=height*progress;sparks.rotation.y=time*1.9;sparks.position.y=enabled?Math.sin(time*19)*.025:0;lastProgress=progress;
 };
 const update=()=>{if(disposed)return;const time=now();if(active){const progress=Math.max(0,Math.min(1,(time-active.committedAt)/AVATAR_TRANSPORT_DURATION_MS));if(time>=active.endsAt){active=null;apply(false,1,time/1000);}else apply(true,progress,time/1000);}else apply(false,1,time/1000);};
 return {
  group,update,
  observeVerifiedTransfer(record,worldId){
   if(disposed||!record||record.protocol!=='elsemesh.portal-presentation/1'||record.type!=='portal-arrival'||typeof record.transferId!=='string'||!record.transferId||record.transferId.length>256||typeof record.playerNodeId!=='string'||record.destinationWorldId!==worldId||record.sourceWorldId===worldId||!Number.isSafeInteger(record.destinationGeneration)||record.destinationGeneration<0||!Number.isFinite(record.committedAt)||!Number.isFinite(record.expiresAt))return false;
   const time=now(),end=Math.min(record.expiresAt,record.committedAt+AVATAR_TRANSPORT_DURATION_MS),key=record.transferId+':'+record.destinationGeneration;
   if(time<record.committedAt-100||time>=end||record.expiresAt-record.committedAt>3000||record.expiresAt<=record.committedAt||record.destinationGeneration<highestGeneration||seen.has(key))return false;
   highestGeneration=record.destinationGeneration;seen.set(key,time);while(seen.size>64)seen.delete(seen.keys().next().value);
   active={...record,endsAt:end};update();return true;
  },
  diagnostics(){return {active:!!active,progress:lastProgress,transferId:active?.transferId,generation:active?.destinationGeneration,particles:80,sceneBased:true};},
  dispose(){if(disposed)return;apply(false,1,now()/1000);disposed=true;active=null;seen.clear();group.removeFromParent();sparks.geometry.dispose();ring.geometry.dispose();material.dispose();if(!isWebGL)material.uniformBlock.buffer?.destroy();}
 };
}
