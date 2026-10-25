import {updateWebGLWeatherShelter} from './WebGLWeatherShelter.js';
import {repositoryPeerFacing} from '../player/AvatarFacing.js';
import {repositoryProjectWaterHeight} from './RepositoryWater.js';
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
export function createWebGLRepositoryPeerLayer(scene,ownNodeId,prepareResources){
 const group=new T.Group();group.name='ElseMesh_animated_repository_peers';scene.add(group);const avatars=new Map(),warms=new Map();let at=0,packet={players:[]},disposed=false;
 const ensure=pose=>{if(disposed||pose.nodeId===ownNodeId)return null;let a=avatars.get(pose.nodeId);if(!a){if(avatars.size>=32){const old=[...avatars].filter(([id])=>!packet.players.some(p=>p.nodeId===id)).sort((a,b)=>(a[1].lastPresenceAt??0)-(b[1].lastPresenceAt??0))[0];if(!old)return null;old[1].dispose();avatars.delete(old[0]);warms.delete(old[0]);}a=new WebGLRepositoryAvatar(group,{prepareResources});a.group.userData.remotePlayerId=pose.playerId;a.group.visible=false;avatars.set(pose.nodeId,a);}return a;};
 return {group,avatars,get packet(){return packet;},get pendingPrewarms(){return [...warms.values()].filter(w=>!w.done).length;},accept(next){if(disposed)return;at=performance.now();packet=next;},
 prewarmKnownProfiles(poses){return Promise.all(poses.filter(p=>p.nodeId!==ownNodeId).map(p=>{const key=JSON.stringify(p.appearance??{}),old=warms.get(p.nodeId);if(old?.key===key)return old.promise;const a=ensure(p);if(!a)return false;const w={key,done:false};w.promise=Promise.resolve().then(()=>p.appearance?a.setAppearance(p.appearance):a.ready).then(()=>a.ready).then(()=>{if(!packet.players.some(q=>q.nodeId===p.nodeId))a.group.visible=false;return true;}).finally(()=>w.done=true);warms.set(p.nodeId,w);return w.promise;}));},
 update(dt,player,camera){if(disposed)return;const keep=new Set();for(const pose of packet.players){if(pose.nodeId===ownNodeId)continue;keep.add(pose.nodeId);const a=ensure(pose);if(!a)continue;a.lastPresenceAt=performance.now();if(pose.appearance)a.setAppearance(pose.appearance)?.catch(error=>console.warn('Remote avatar appearance:',error));a.cinematic={x:pose.position[0],y:pose.position[1],z:pose.position[2],yaw:repositoryPeerFacing(a,pose,packet.worldId),speed:Math.hypot(...(pose.velocity??[0,0,0])),mode:'walk'};a.update(dt,player,camera,true);a.group.visible=a.group.visible&&performance.now()-at<3000;}for(const [node,a]of avatars)if(!keep.has(node))a.group.visible=false;},
 dispose(){if(disposed)return;disposed=true;for(const a of avatars.values())a.dispose();avatars.clear();warms.clear();group.removeFromParent();}};
}

export function addWebGLPortalFrame(root,portal){
 const group=new T.Group(),material=new T.MeshStandardMaterial({color:portal.visual.frameColor,emissive:portal.visual.frameColor,emissiveIntensity:.65,roughness:.25});group.position.fromArray(portal.position);group.rotation.y=portal.yaw;
 for(const [w,h,x,y]of [[.12,portal.height+.24,-portal.width/2-.06,0],[.12,portal.height+.24,portal.width/2+.06,0],[portal.width,.12,0,portal.height/2+.06],[portal.width,.12,0,-portal.height/2-.06]]){const mesh=new T.Mesh(new T.BoxGeometry(w,h,.15),material);mesh.position.set(x,y,0);group.add(mesh);}root.add(group);
}
export function updateWebGLRepositoryEnvironment(engine,active,time,environment){
 const env=environment??active?.project.environment??{},hour=env.timeOfDay??14,day=Math.max(.03,Math.sin((hour-6)*Math.PI/12));
 const lights=engine.scene.userData.repositoryLights;
 const storm=env.weather==='storm',phase=time%11,flash=storm&&phase>10.1&&phase<10.28?Math.pow(Math.sin((phase-10.1)/.18*Math.PI),2):0;
 if(lights){lights.sky.intensity=.3+day*1.9;lights.sun.intensity=(.1+day*2.4)*(storm?.55:1)+flash*5;lights.sun.position.set(Math.cos(hour*Math.PI/12)*300,Math.max(15,day*300),140);}
 const color=new T.Color().setRGB(.04+day*.46,.06+day*.60,.11+day*.64);engine.scene.background.copy(color);
 const underwater=engine.camera.position.y<repositoryProjectWaterHeight(active?.project,engine.camera.position.x,engine.camera.position.z,time);
 engine.scene.fog.color.copy(underwater?new T.Color('#1b6a77'):color);engine.scene.fog.density=underwater?.045:Math.min(.008,(env.mistDensity??.004)*.08)*(1+.12*Math.sin(time*(env.mistSpeed??2)*.07));
 const shelter=updateWebGLWeatherShelter(engine,active,time,underwater);active?.nativeIsland?.setEnvironment(env);active?.root.userData.updateWebGL?.(time);return {flash,backend:'webgl2',underwater:!!underwater,...shelter};
}
