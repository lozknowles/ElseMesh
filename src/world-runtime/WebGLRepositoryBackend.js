import {T} from './vendor/world-engine-contract.js';
import {WebGLRepositoryAvatar} from './WebGLRepositoryAvatar.js';

// Established ElseMesh compatibility renderer, with repository content injected
// through the validated host. Movement always uses the installed native Player.
export function createWebGLRepositoryEngine(container){
 const canvas=document.createElement('canvas');canvas.tabIndex=0;container.append(canvas);
 const context=canvas.getContext('webgl2',{alpha:false,antialias:true});
 if(!context){canvas.remove();throw Error('Neither WebGPU nor WebGL2 is available on this device.');}
 const renderer=new T.WebGLRenderer({canvas,context,antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 const camera=new T.PerspectiveCamera(62,1,.06,6000),scene=new T.Scene();
 const engine={canvas,domElement:canvas,camera,scene,renderer,backend:'webgl2',maxOutputPixels:1000000,frame:0,running:false,get width(){return canvas.width;},get height(){return canvas.height;},onResize:[]};
 const resize=()=>{const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(engine.maxOutputPixels/(w*h)));renderer.setPixelRatio(dpr);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();for(const fn of engine.onResize)fn(w,h);};
 engine.resize=resize;window.addEventListener('resize',resize);resize();
 engine.start=update=>{engine.stop();engine.running=true;let previous=0,start=0;const loop=now=>{if(!engine.running)return;start ||= now;const dt=previous?Math.max(0,Math.min(.05,(now-previous)/1000)):0;previous=now;if(!document.hidden){engine.frame++;update(dt,(now-start)/1000);}engine.raf=requestAnimationFrame(loop);};engine.raf=requestAnimationFrame(loop);};
 engine.stop=()=>{engine.running=false;cancelAnimationFrame(engine.raf);};
 engine.dispose=()=>{engine.stop();window.removeEventListener('resize',resize);renderer.dispose();canvas.remove();};
 return engine;
}
export function configureWebGLRepositoryScene(scene,candidate){
 const env=candidate?.project?.environment??candidate?.descriptor?.project?.environment??{};
 scene.background=new T.Color('#9bc4d5');scene.fog=new T.FogExp2('#9bc4d5',Math.min(.004,(env.mistDensity??.004)*.08));
 const sky=new T.HemisphereLight('#d7f4ff','#627853',2.2),sun=new T.DirectionalLight('#ffedcc',2.5);sun.position.set(-180,300,140);scene.add(sky,sun);scene.userData.repositoryLights={sky,sun};
}
export function createWebGLRepositoryPeerLayer(scene,ownNodeId){
 const root=new T.Group();root.name='ElseMesh_animated_repository_peers';scene.add(root);const avatars=new Map();let at=0,packet={players:[]},disposed=false;
 return {avatars,accept(next){if(disposed)return;at=performance.now();packet=next;},update(dt,player,camera){
  if(disposed)return;const keep=new Set();
  for(const pose of packet.players){if(pose.nodeId===ownNodeId)continue;keep.add(pose.nodeId);let avatar=avatars.get(pose.nodeId);
   if(!avatar){avatar=new WebGLRepositoryAvatar(root);avatar.group.userData.remotePlayerId=pose.playerId;avatar.ready.catch(error=>console.warn('Remote built-in character:',error));avatars.set(pose.nodeId,avatar);}
   if(pose.appearance){try{avatar.setAppearance(pose.appearance)?.catch(error=>console.warn('Remote avatar appearance:',error));}catch(error){console.warn('Rejected remote avatar appearance:',error);}}
   avatar.cinematic={x:pose.position[0],y:pose.position[1],z:pose.position[2],yaw:pose.yaw+Math.PI,speed:Math.hypot(...(pose.velocity??[0,0,0])),mode:'walk'};
   avatar.update(dt,player,camera,true);avatar.group.visible=performance.now()-at<3000;
  }
  for(const [node,avatar]of avatars)if(!keep.has(node)){avatar.dispose();avatars.delete(node);}
 },dispose(){if(disposed)return;disposed=true;for(const avatar of avatars.values())avatar.dispose();avatars.clear();root.removeFromParent();}};

}
export function addWebGLPortalFrame(root,portal){
 const group=new T.Group(),material=new T.MeshStandardMaterial({color:portal.visual.frameColor,emissive:portal.visual.frameColor,emissiveIntensity:.65,roughness:.25});group.position.fromArray(portal.position);group.rotation.y=portal.yaw;
 for(const [w,h,x,y]of [[.12,portal.height+.24,-portal.width/2-.06,0],[.12,portal.height+.24,portal.width/2+.06,0],[portal.width,.12,0,portal.height/2+.06],[portal.width,.12,0,-portal.height/2-.06]]){const mesh=new T.Mesh(new T.BoxGeometry(w,h,.15),material);mesh.position.set(x,y,0);group.add(mesh);}root.add(group);
}
export function updateWebGLRepositoryEnvironment(engine,active,time){
 const env=active?.project.environment??{},hour=env.timeOfDay??14,day=Math.max(.03,Math.sin((hour-6)*Math.PI/12));
 const lights=engine.scene.userData.repositoryLights;
 const storm=env.weather==='storm',phase=time%11,flash=storm&&phase>10.1&&phase<10.28?Math.pow(Math.sin((phase-10.1)/.18*Math.PI),2):0;
 if(lights){lights.sky.intensity=.3+day*1.9;lights.sun.intensity=(.1+day*2.4)*(storm?.55:1)+flash*5;lights.sun.position.set(Math.cos(hour*Math.PI/12)*300,Math.max(15,day*300),140);}
 const color=new T.Color().setRGB(.04+day*.46,.06+day*.60,.11+day*.64);engine.scene.background.copy(color);
 const water=active?.project.water,underwater=water&&engine.camera.position.y<water.level+water.waveAmplitude*Math.sin(engine.camera.position.x*.04+engine.camera.position.z*.03+time*water.waveSpeed)&&Math.max(Math.abs(engine.camera.position.x),Math.abs(engine.camera.position.z))<water.extent/2;
 engine.scene.fog.color.copy(underwater?new T.Color('#1b6a77'):color);engine.scene.fog.density=underwater?.045:Math.min(.008,(env.mistDensity??.004)*.08)*(1+.12*Math.sin(time*(env.mistSpeed??2)*.07));
 active?.root.userData.updateWebGL?.(time);return {flash,backend:'webgl2',underwater:!!underwater};
}
