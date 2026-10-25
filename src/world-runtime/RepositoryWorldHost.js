import { Player } from '../player/Player.js';
import { Vector3, Euler } from '../engine/index.js';
import { loadWorldSource, describeRuntimeWorld, validateNeonSign, checkWorldSourceUpdate, effectiveObjectState } from './vendor/world-engine-contract.js';
import { buildNativeNeon } from './NativeNeon.js';
import { nativeGeometry } from './RepositoryScene.js';
import { buildRepositoryScene, disposeRepositoryScene } from './RepositoryScene.js';

// Installed runtime software supplies dry-world water semantics. Content cannot
// provide callbacks or alter the controller, physics, session authority or renderer.
const dryQuery=()=>({cpuValid:true,cpu:new Float32Array([-100000,0,0,0]),allocate:()=>0,setPoint:()=>{}});
export class RepositoryWorldHost {
 constructor({engine,input,buildCandidate=buildRepositoryScene,checkSourceUpdate=checkWorldSourceUpdate,disposeCandidate=disposeRepositoryScene,buildNeon=buildNativeNeon,convertGeometry=nativeGeometry,prepareResources=async()=>{},acquireResources=async()=>null,registerResources=async()=>null,retainResources=()=>false,beforeActivate=async()=>{},onChange=()=>{},onInteract=()=>{}}){
  Object.assign(this,{engine,input,buildCandidate,checkSourceUpdate,disposeCandidate,buildNeon,convertGeometry,prepareResources,acquireResources,registerResources,retainResources,beforeActivate,onChange,onInteract});this.generation=0;this.active=null;this.overlay=null;this.disposed=false;this.prepared=new Set();
 }
 async load(source,options={}){this.pendingUpdate=null;const token=++this.generation;const loaded=await loadWorldSource(source,options);
  try{options.onProgress?.('world-validated');}catch(error){console.warn('Opening progress callback failed',error);}
  if(options.expectedWorldId!==undefined&&loaded.identity.worldId!==options.expectedWorldId)throw Error('World identity does not match the deployment pin.');
  if(options.expectedContentDigest!==undefined&&loaded.identity.contentDigest!==options.expectedContentDigest)throw Error('World content does not match the deployment pin.');
  return this.activate(loaded,token,options);
 }
 async checkUpdate(options){
  if(!this.active)throw Error('Open a world first.');
  this.pendingUpdate=null;
  const current=this.active,token=++this.generation,candidate=await this.checkSourceUpdate(current.loaded,options);
  if(token!==this.generation||current!==this.active||this.disposed||!candidate)return false;
  this.pendingUpdate={current,candidate,token};
  return {worldId:current.identity.worldId,fromCommit:current.identity.resolvedCommit,toCommit:candidate.identity.resolvedCommit,fromDigest:current.identity.contentDigest,toDigest:candidate.identity.contentDigest};
 }
 async applyUpdate(){
  const pending=this.pendingUpdate;this.pendingUpdate=null;
  if(!pending||pending.current!==this.active||pending.token!==this.generation||this.disposed)throw Error('Check for an update again before applying it.');
  return this.activate(pending.candidate,pending.token);
 }
 async prepare(loaded,{pose,onProgress}={}){
  if(this.disposed)throw Error('World host is disposed.');
  const generation=this.generation;let descriptor=null;let candidate,resourceLease;
  try{
   // Asset builders and the player receive an isolated camera until the swap.
   const camera=this.engine.camera.clone();
   resourceLease=await this.acquireResources(loaded);
   descriptor=resourceLease?.candidate.descriptor??describeRuntimeWorld(loaded.project);
   candidate=resourceLease?.candidate??await this.buildCandidate(descriptor,camera,{loaded});
   if(generation!==this.generation||this.disposed){if(resourceLease)resourceLease.release();else this.disposeCandidate(candidate);return false;}
   if(!candidate?.root?.isObject3D||candidate.root.parent&&!resourceLease)throw Error('Prepared world root must be detached.');
   try{onProgress?.('scene-built');}catch(error){console.warn('Opening progress callback failed',error);}
   if(candidate.nativeIsland)await candidate.nativeIsland.ensureArrival(pose?.position??descriptor.spawn.position);
   const player=new Player({camera,input:this.input,terrain:candidate.terrain,colliders:candidate.colliders,query:candidate.query??dryQuery(),boat:null});
   if(pose){
    if(!Array.isArray(pose.position)||pose.position.length!==3||!pose.position.every(Number.isFinite)||
       !Array.isArray(pose.velocity)||pose.velocity.length!==3||!pose.velocity.every(Number.isFinite)||
       !Number.isFinite(pose.yaw)||(pose.pitch!==undefined&&!Number.isFinite(pose.pitch)))throw Error('World arrival pose is not finite.');
    player.position.fromArray(pose.position);player.velocity.fromArray(pose.velocity);player.yaw=pose.yaw;player.pitch=pose.pitch??-.05;
    const floor=player.groundAt(player.position.x,player.position.z,player.position.y+.001);
    if(!Number.isFinite(floor)||player.position.y<floor-.001)throw Error('World arrival intersects terrain.');
    player.grounded=Math.abs(player.position.y-floor)<.06;
   }else{
    player.position.fromArray(descriptor.spawn.position);player.position.y=Math.max(player.position.y,player.groundAt(player.position.x,player.position.z,player.position.y+.45));
    player.yaw=descriptor.spawn.yaw;player.pitch=-.05;player.velocity.set(0,0,0);player.grounded=true;
   }
   if(!player.position.toArray().every(Number.isFinite))throw Error('World spawn is not finite.');
   const probe=player.position.clone();candidate.colliders.resolveCapsule(probe,.3,1.75,pose ? .001 : .4);
   if(!probe.toArray().every(Number.isFinite)||probe.distanceTo(player.position)>(pose ? .001 : .05))throw Error(pose?'World arrival intersects solid geometry.':'World spawn intersects solid geometry.');
   candidate.terrain.assertPlayerPose?.(player.position,{mode:player.mode,arrival:true});
   // Prepare view state directly: Player.update would consume live input and may adjust an arrival.
   camera.position.copy(player.position);camera.position.y+=1.62;
   camera.quaternion.setFromEuler(new Euler(player.pitch,player.yaw,0,'YXZ'));camera.updateMatrixWorld();
   const prepared={...candidate,loaded,identity:loaded.identity,descriptor,player,project:descriptor.project,generation,resourceLease,preparedState:'preparing'};
   if(!resourceLease){await this.prepareResources(prepared);prepared.resourceLease=resourceLease=await this.registerResources(prepared);}
   if(generation!==this.generation||this.disposed){if(resourceLease)resourceLease.release();else this.disposeCandidate(candidate);return false;}
   try{onProgress?.('resources-ready');}catch(error){console.warn('Opening progress callback failed',error);}
   prepared.preparedState='ready';
   this.prepared.add(prepared);return prepared;
  }catch(error){if(resourceLease)resourceLease.release();else this.disposeCandidate(candidate);throw error;}
 }
 discardPrepared(prepared){
  if(!prepared||!this.prepared.has(prepared))return false;
  this.prepared.delete(prepared);prepared.preparedState='discarded';if(prepared.resourceLease)prepared.resourceLease.release();else this.disposeCandidate(prepared);return true;
 }
 async activatePrepared(prepared,token){
  if(!prepared)return false;
  if(!this.prepared.has(prepared))throw Error('Prepared world has already been consumed or discarded.');
  if(token===undefined){
   if(prepared.generation!==this.generation||this.disposed){this.discardPrepared(prepared);return false;}
   token=++this.generation;
  }
  if(token!==this.generation||this.disposed){this.discardPrepared(prepared);return false;}
  this.pendingUpdate=null;
  try{
   await this.beforeActivate({previous:this.active,next:prepared.loaded,descriptor:prepared.descriptor});
   if(token!==this.generation||this.disposed){this.discardPrepared(prepared);return false;}
   const previous=this.active,player=prepared.player,camera=player.camera;
   this.input._clearTransientInput();this.overlay=null;
   prepared.resourceLease?.commit();
   this.engine.scene.add(prepared.root);
   this.prepared.delete(prepared);prepared.preparedState='active';
   player.camera=this.engine.camera;
   this.engine.camera.position.copy(camera.position);this.engine.camera.quaternion.copy(camera.quaternion);this.engine.camera.updateMatrixWorld();
   this.active=prepared;if(previous?.root!==prepared.root)previous?.root.removeFromParent();
   try{this.onChange(this.active);}catch(error){console.error(error);}
   try{if(!this.retainResources(previous))this.disposeCandidate(previous);}catch(error){console.error(error);}return true;
  }catch(error){if(prepared.resourceLease&&this.prepared.has(prepared)){prepared.generation=this.generation;prepared.preparedState='ready';}else this.discardPrepared(prepared);throw error;}
 }
 async activate(loaded,token=++this.generation,options={}){
  this.pendingUpdate=null;
  const prepared=await this.prepare(loaded,options);
  if(!prepared)return false;
  if(token!==this.generation||this.disposed){this.discardPrepared(prepared);return false;}
  return this.activatePrepared(prepared,token);
 }
 // Reconcile a validated authority pose without consuming input or rewinding look.
 correctPosition(position){
  const active=this.active;if(!active||this.disposed)return false;
  if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw Error('Invalid motion correction position');
  const player=active.player,floor=player.groundAt(position[0],position[2],position[1]+.001);
  if(!Number.isFinite(floor)||position[1]<floor-.001)throw Error('Motion correction intersects terrain');
  player.position.fromArray(position);player.velocity.set(0,0,0);player.grounded=Math.abs(position[1]-floor)<.06;
  player.camOff=0;player.camOffV=0;player._camY=null;player.camInit=false;player.bob=0;player.stepDist=0;player.waterMean=null;
  player.query.setPoint(player.slot,position[0],position[2]);return true;
 }
 getAuthoredProject(){return this.active?structuredClone(this.active.project):null;}
 setRuntimeOverlay(snapshot){
  this.overlay=snapshot?structuredClone(snapshot):null;if(!this.active)return;
  const signs=new Map((snapshot?.signs??[]).map(s=>[s.id,s.config]));
  for(const object of this.active.project.objects){if(object.kind!=='neon-sign')continue;const config=signs.get(object.id)??object.neon;
   let neon;this.active.root.traverse(node=>{if(node.userData.neonObjectId===object.id)neon=node;});
   if(!neon||JSON.stringify(neon.userData.runtimeConfig)===JSON.stringify(config))continue;
   const replacement=this.buildNeon(config,this.convertGeometry);replacement.userData.neonObjectId=object.id;replacement.userData.runtimeConfig=structuredClone(config);
   neon.parent.add(replacement);this.disposeCandidate({root:neon});
  }
 }
 setLocalConfig(id,config){const errors=validateNeonSign(config);if(errors.length)throw Error(errors.join(' '));const signs=this.active.project.objects.filter(o=>o.kind==='neon-sign').map(o=>({id:o.id,config:structuredClone(this.overlay?.signs?.find(s=>s.id===o.id)?.config??o.neon)}));const sign=signs.find(s=>s.id===id);if(!sign)throw Error('Computer target sign is missing.');sign.config=structuredClone(config);this.setRuntimeOverlay({worldHour:this.environment().timeOfDay,signs});}
 setLocalPower(id,powered){const signs=this.active.project.objects.filter(o=>o.kind==='neon-sign').map(o=>({id:o.id,config:structuredClone(this.overlay?.signs?.find(s=>s.id===o.id)?.config??o.neon)}));const sign=signs.find(s=>s.id===id);if(!sign)throw Error('Computer target sign is missing.');sign.config.powered=!!powered;this.setRuntimeOverlay({worldHour:this.environment().timeOfDay,signs});}
 environment(){const env=this.active?.project.environment;if(!env)return null;return this.overlay?{...env,timeOfDay:this.overlay.worldHour??env.timeOfDay}:env;}
 nearestComputer(){
  if(!this.active)return null;let found=null,best=3;
  for(const object of this.active.project.objects){if(object.kind!=='computer'||!effectiveObjectState(this.active.project.objects,object.id).visible)continue;
   const matrix=this.active.matrices.get(object.id);const point=new Vector3().setFromMatrixPosition(matrix);point.y+=.5;
   const distance=point.distanceTo(this.engine.camera.position);if(distance<best){best=distance;found=object;}
  }return found;
 }
 update(dt,time,{move=true}={}){
  if(!this.active)return;const {player,root,forest}=this.active;this.active.query?.setTime(time);
  const nativeIsland=this.active.nativeIsland;
  if(move&&(!nativeIsland||nativeIsland.canOccupy(player.position.x,player.position.z,Math.max(3,player.velocity.length()*dt+2))))player.update(dt);
  nativeIsland?.update(dt,this.engine.camera);this.active.traffic?.update(dt,{x:player.position.x,z:player.position.z,yaw:player.yaw,kind:'pedestrian'});forest?.userData.updateTreeLOD(time,this.engine.camera.position);
  const configs=new Map((this.overlay?.signs??[]).map(s=>[s.id,s]));
  root.traverse(node=>{if(!node.userData.updateNeon)return;const state=configs.get(node.userData.neonObjectId);const elapsed=Number.isFinite(state?.effectStartMs)?Math.max(0,(Date.now()+(this.overlay?.offsetMs??0)-state.effectStartMs)/1000):time;node.userData.updateNeon(elapsed,this.environment().timeOfDay??14,state?.powered??state?.config?.powered);});
  if(move&&this.input.pressed.has('KeyE')){const computer=this.nearestComputer();if(computer)this.onInteract(computer,this.active);}
 }
 disconnect(){this.pendingUpdate=null;++this.generation;this.setRuntimeOverlay(null);this.input._clearTransientInput();}
 dispose(){this.disconnect();this.disposed=true;for(const prepared of [...this.prepared])this.discardPrepared(prepared);if(!this.retainResources(this.active))this.disposeCandidate(this.active);this.active=null;}
}
