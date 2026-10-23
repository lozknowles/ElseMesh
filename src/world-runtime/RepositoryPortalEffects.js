import * as N from '../engine/index.js';
import {Material} from '../engine/render/Material.js';
import {T} from './vendor/world-engine-contract.js';
import {nativeGeometry} from './RepositoryScene.js';

// Restored from origin/experiment/bidirectional-portal:src/world/PortalView.js.
// The original radial jitter, pulse, flicker and eight counter-moving segments
// are retained. Segment centres follow the admitted rectangular aperture rim.
export const PORTAL_STORM_SOURCE='origin/experiment/bidirectional-portal:src/world/PortalView.js';
const stormVertex=`let tick = floor(frame.time * 12.0);
 let noise = fract(sin(v.uv.x * 173.3 + tick * 7.13) * 43758.5453);
 let radial = normalize(v.position.xy);
 v.position.x += radial.x * (noise - 0.5) * 0.14;
 v.position.y += radial.y * (noise - 0.5) * 0.14;`;
const stormSurface=`let pulse = pow(max(0.0, sin(frame.time * 17.0 + in.uv.x * 27.0)), 8.0);
 let flicker = 0.55 + 0.45 * sin(frame.time * 4.7 + in.uv.x * 8.0);
 s.albedo = vec3f(0.08, 0.34, 0.62) * flicker + vec3f(0.5, 0.9, 1.0) * pulse;
 s.emissive = s.albedo * 4.0 * (1.0 + mat.portalSurge);`;
export function createNativePortalStormMaterial(){return new Material({name:'Portal electrical storm',lit:false,side:'double',transparent:true,depthWrite:false,uniforms:{portalSurge:['f32',0]},vertex:stormVertex,surface:stormSurface});}
export function createWebGLPortalStormMaterial(){
 return new T.ShaderMaterial({name:'Portal electrical storm',side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{portalTime:{value:0},portalSurge:{value:0}},
 vertexShader:`uniform float portalTime;varying vec2 stormUv;
 void main(){stormUv=uv;vec3 p=position;float tick=floor(portalTime*12.);float noise=fract(sin(uv.x*173.3+tick*7.13)*43758.5453);p.xy+=normalize(p.xy)*(noise-.5)*.14;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`uniform float portalTime;uniform float portalSurge;varying vec2 stormUv;
 void main(){float pulse=pow(max(0.,sin(portalTime*17.+stormUv.x*27.)),8.);float flicker=.55+.45*sin(portalTime*4.7+stormUv.x*8.);vec3 color=(vec3(.08,.34,.62)*flicker+vec3(.5,.9,1.)*pulse)*4.*(1.+portalSurge);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
function rimGeometry(width,height,start,sweep){
 const geometry=new T.TorusGeometry(1.35,.028,4,48,sweep),position=geometry.getAttribute('position'),original=Float32Array.from(position.array);
 const update=phase=>{
  for(let i=0;i<position.count;i++){
   const x=original[i*3],y=original[i*3+1],angle=Math.atan2(y,x)+start+phase,c=Math.cos(angle),s=Math.sin(angle);
   const rim=Math.min((width/2+.13)/Math.max(.00001,Math.abs(c)),(height/2+.13)/Math.max(.00001,Math.abs(s)));
   const radius=rim+Math.hypot(x,y)-1.35;position.setXYZ(i,c*radius,s*radius,original[i*3+2]);
  }
  position.needsUpdate=true;
 };
 update(0);return {geometry,update};
}
/** Existing scene renderer owns all draws; effects never render another scene.
 * transition() observes authority state and changes visuals only.
 * No original transporter crossing overlay was present in the recovered source.
 */
export function createPortalEffects({engine,isWebGL=engine?.backend==='webgl2'}={}){
 const E=isWebGL?T:N,frames=new Set();let state='idle',surge=0,disposed=false,beamAge=2,beamKind='depart';
 const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
 // New transport presentation; restored source had electricity but no crossing overlay.
 // Finite, translucent and pointer-transparent, so authority errors remain readable.
 let overlay=null;const particles=[];
 if(globalThis.document?.createElement){
  overlay=document.createElement('div');overlay.className='repository-portal-transport-energy';overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'30',pointerEvents:'none',overflow:'hidden',opacity:'0',background:'radial-gradient(ellipse at center,transparent 25%,rgba(30,150,220,.12) 100%)'});
  for(let i=0;i<48;i++){const p=document.createElement('i');Object.assign(p.style,{position:'absolute',left:((i*61.803398875)%100)+'%',top:((i*37.17)%100)+'%',width:(i%3===0?2:1)+'px',height:(28+i%7*13)+'px',background:'linear-gradient(transparent,rgba(130,235,255,.75),transparent)',boxShadow:'0 0 5px rgba(70,200,255,.55)'});overlay.append(p);particles.push(p);}
  (engine?.canvas?.parentElement??document.body)?.append(overlay);
 }
 const addFrame=(root,portal)=>{
  if(disposed)throw Error('Portal effects disposed');
  const group=new E.Group();group.name='Repository portal electrical frame';group.position.fromArray(portal.position);group.rotation.y=portal.yaw||0;group.userData.portalEffect=true;group.userData.portalId=portal.id;
  const frameMaterial=isWebGL?new T.MeshStandardMaterial({color:portal.visual.frameColor,emissive:portal.visual.frameColor,emissiveIntensity:.65,roughness:.25}):new Material({name:'portal-frame',color:portal.visual.frameColor,emissive:portal.visual.frameColor,roughness:.25});
  for(const[w,h,x,y]of [[.12,portal.height+.24,-portal.width/2-.06,0],[.12,portal.height+.24,portal.width/2+.06,0],[portal.width,.12,0,portal.height/2+.06],[portal.width,.12,0,-portal.height/2-.06]]){
   const mesh=new E.Mesh(new E.BoxGeometry(w,h,.15),frameMaterial);mesh.position.set(x,y,0);group.add(mesh);
  }
  const material=isWebGL?createWebGLPortalStormMaterial():createNativePortalStormMaterial(),arcs=[];
  for(let i=0;i<8;i++){
   const data=rimGeometry(portal.width,portal.height,i*Math.PI*.25,.68+.15*(i%2)),geometry=isWebGL?data.geometry:nativeGeometry(data.geometry);
   const mesh=new E.Mesh(geometry,material);mesh.name='Portal electrical storm arc';mesh.position.z=.16;mesh.frustumCulled=false;mesh.userData.portalEffect=true;group.add(mesh);
   arcs.push({mesh,data,phase:0,index:i});
  }
  root.add(group);frames.add({group,arcs,material,frameMaterial});return group;
 };
 const release=frame=>{frame.group.removeFromParent();for(const arc of frame.arcs){arc.mesh.geometry.dispose();if(!isWebGL)arc.data.geometry.dispose();}for(const child of frame.group.children)if(!child.userData.portalEffect)child.geometry?.dispose();frame.material.dispose();frame.frameMaterial.dispose();if(!isWebGL){frame.material.uniformBlock.buffer?.destroy();frame.frameMaterial.uniformBlock.buffer?.destroy();}frames.delete(frame);};
 return {
  addFrame,
  removeRoot(root){for(const frame of [...frames])if(frame.group.parent===root)release(frame);},
  clear({preserveRoot}={}){for(const frame of [...frames])if(frame.group.parent!==preserveRoot)release(frame);beamAge=2;surge=0;if(overlay)overlay.style.opacity='0';},
  transition(next){
   const value=typeof next==='string'?next:next?.state??'idle';if(value===state)return;state=value;
   if(['suspending','handoff-pending','travelling'].includes(state)){surge=1;beamAge=0;beamKind='depart';}
   else if(['active','arrived','committed','complete'].includes(state)){surge=1;beamAge=0;beamKind='arrive';}
   else if(['idle','failed','rejected','outcome-unknown','restoring','restored'].includes(state)){surge=0;beamAge=2;if(overlay)overlay.style.opacity='0';}
  },
  update(dt,time=0){
   if(disposed)return;dt=Math.max(0,Math.min(.1,dt));surge=Math.max(0,surge-dt*1.4);beamAge+=dt;
   if(overlay){
    const envelope=Math.max(0,Math.sin(Math.min(1,beamAge/1.15)*Math.PI));overlay.style.opacity=String(envelope*(reducedMotion?.12:.72));
    for(let i=0;i<particles.length;i++)particles[i].style.transform=reducedMotion?'none':'translateY('+((beamKind==='arrive'?1:-1)*beamAge*(140+i%5*31))+'px)';
   }
   for(const frame of [...frames]){
    if(isWebGL){frame.material.uniforms.portalTime.value=time;frame.material.uniforms.portalSurge.value=surge;}else frame.material.set('portalSurge',surge);
    for(const arc of frame.arcs){arc.phase+=dt*(arc.index%2?-.21:.17);arc.data.update(arc.phase);if(!isWebGL){const source=arc.data.geometry.getAttribute('position'),target=arc.mesh.geometry.getAttribute('position');target.array.set(source.array);target.needsUpdate=true;}}
   }
  },
  diagnostics(){return {source:PORTAL_STORM_SOURCE,state,surge,frames:frames.size,arcs:frames.size*8,beamVisible:beamAge<1.15,reducedMotion,transitionPresentation:'new electricity transport particles'};},
  dispose(){if(disposed)return;disposed=true;for(const frame of [...frames])release(frame);overlay?.remove();}
 };
}
