import { Player } from '../player/Player.js';
import { Vector3 } from '../engine/index.js';
import { loadWorldSource, describeRuntimeWorld, validateNeonSign, checkWorldSourceUpdate, effectiveObjectState } from './vendor/world-engine-contract.js';
import { buildNativeNeon } from './NativeNeon.js';
import { nativeGeometry } from './RepositoryScene.js';
import { buildRepositoryScene, disposeRepositoryScene } from './RepositoryScene.js';

// Installed runtime software supplies dry-world water semantics. Content cannot
// provide callbacks or alter the controller, physics, session authority or renderer.
const dryQuery=()=>({cpuValid:true,cpu:new Float32Array([-100000,0,0,0]),allocate:()=>0,setPoint:()=>{}});
export class RepositoryWorldHost {
 constructor({engine,input,buildCandidate=buildRepositoryScene,checkSourceUpdate=checkWorldSourceUpdate,beforeActivate=async()=>{},onChange=()=>{},onInteract=()=>{}}){
  Object.assign(this,{engine,input,buildCandidate,checkSourceUpdate,beforeActivate,onChange,onInteract});this.generation=0;this.active=null;this.overlay=null;this.disposed=false;
 }
 async load(source,options){this.pendingUpdate=null;const token=++this.generation;const loaded=await loadWorldSource(source,options);return this.activate(loaded,token);}
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
 async activate(loaded,token=++this.generation){
  this.pendingUpdate=null;
  if(this.disposed)throw Error('World host is disposed.');
  const descriptor=describeRuntimeWorld(loaded.project);let candidate;
  try{
   candidate=await this.buildCandidate(descriptor,this.engine.camera);
   if(token!==this.generation||this.disposed){disposeRepositoryScene(candidate);return false;}
   // Player construction/spawn checks occur before any live-world mutation.
   const player=new Player({camera:this.engine.camera,input:this.input,terrain:candidate.terrain,colliders:candidate.colliders,query:dryQuery(),boat:null});
   player.position.fromArray(descriptor.spawn.position);player.position.y=Math.max(player.position.y,player.groundAt(player.position.x,player.position.z,player.position.y+.45));
   player.yaw=descriptor.spawn.yaw;player.pitch=-.05;player.velocity.set(0,0,0);player.grounded=true;
   if(!player.position.toArray().every(Number.isFinite))throw Error('World spawn is not finite.');
   const probe=player.position.clone();candidate.colliders.resolveCapsule(probe,.3,1.75,.4);
   if(probe.distanceTo(player.position)>.05)throw Error('World spawn intersects solid geometry.');
   await this.beforeActivate({previous:this.active,next:loaded,descriptor});
   if(token!==this.generation||this.disposed){disposeRepositoryScene(candidate);return false;}
   const previous=this.active;
   this.input._clearTransientInput();this.overlay=null;
   this.engine.scene.add(candidate.root);
   this.active={...candidate,loaded,identity:loaded.identity,player,project:descriptor.project};
   previous?.root.removeFromParent();
   player.update(0);try{this.onChange(this.active);}catch(error){console.error(error);}
   disposeRepositoryScene(previous);return true;
  }catch(error){disposeRepositoryScene(candidate);throw error;}
 }
 getAuthoredProject(){return this.active?structuredClone(this.active.project):null;}
 setRuntimeOverlay(snapshot){
  this.overlay=snapshot?structuredClone(snapshot):null;if(!this.active)return;
  const signs=new Map((snapshot?.signs??[]).map(s=>[s.id,s.config]));
  for(const object of this.active.project.objects){if(object.kind!=='neon-sign')continue;const config=signs.get(object.id)??object.neon;
   let neon;this.active.root.traverse(node=>{if(node.userData.neonObjectId===object.id)neon=node;});
   if(!neon||JSON.stringify(neon.userData.runtimeConfig)===JSON.stringify(config))continue;
   const replacement=buildNativeNeon(config,nativeGeometry);replacement.userData.neonObjectId=object.id;replacement.userData.runtimeConfig=structuredClone(config);
   neon.parent.add(replacement);disposeRepositoryScene({root:neon});
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
 update(dt,time){
  if(!this.active)return;const {player,root,forest}=this.active;player.update(dt);forest?.userData.updateTreeLOD(time,this.engine.camera.position);
  const configs=new Map((this.overlay?.signs??[]).map(s=>[s.id,s]));
  root.traverse(node=>{if(!node.userData.updateNeon)return;const state=configs.get(node.userData.neonObjectId);const elapsed=Number.isFinite(state?.effectStartMs)?Math.max(0,(Date.now()+(this.overlay?.offsetMs??0)-state.effectStartMs)/1000):time;node.userData.updateNeon(elapsed,this.environment().timeOfDay??14,state?.powered??state?.config?.powered);});
  if(this.input.pressed.has('KeyE')){const computer=this.nearestComputer();if(computer)this.onInteract(computer,this.active);}
 }
 disconnect(){this.pendingUpdate=null;++this.generation;this.setRuntimeOverlay(null);this.input._clearTransientInput();}
 dispose(){this.disconnect();this.disposed=true;disposeRepositoryScene(this.active);this.active=null;}
}
