const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const vec=value=>Array.isArray(value)&&value.length===3&&value.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
const gaze=pose=>JSON.stringify([pose.position,pose.yaw,pose.pitch,pose.generation,pose.sequence,pose.eyeSession]);
/** Read-only bounded resident roster. Polling cannot renew the last accepted gaze. */
export class RepositoryPlayerEyes {
 constructor({runtime,host=runtime?.host,now=()=>performance.now(),timeoutMs=3000,allowCrossWorld=false,maxTargets=32}={}){if(!runtime||!host||typeof now!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<100||timeoutMs>10000||!Number.isSafeInteger(maxTargets)||maxTargets<1||maxTargets>64)throw Error('Invalid player-eye roster');Object.assign(this,{runtime,host,now,timeoutMs,allowCrossWorld,maxTargets});this.progress=new Map();this.assets=new WeakMap();this.disposed=false;}
 avatarReady(avatar){if(!avatar?.group||avatar.disposed||avatar.error)return false;const promise=avatar.ready;if(!promise?.then)return promise===true&&!!(avatar.model||avatar.scanned);let state=this.assets.get(avatar);if(state?.promise!==promise){state={promise,done:false,ok:false};this.assets.set(avatar,state);Promise.resolve(promise).then(ok=>{state.done=true;state.ok=ok!==false;},()=>{state.done=true;state.ok=false;});}return state.done&&state.ok&&!!(avatar.model||avatar.scanned);}
 resolve(key){
  if(this.disposed||typeof key!=='string')return null;let pair;try{pair=JSON.parse(key);}catch{return null;}if(!Array.isArray(pair)||pair.length!==2)return null;
  const [worldId,nodeId]=pair,r=this.runtime,currentWorld=worldId===this.host.active?.identity.worldId;
  if(!id(worldId)||!id(nodeId)||nodeId===r.transport?.identity?.nodeId||!currentWorld&&!this.allowCrossWorld)return null;
  const scene=r.resolveEyeScene(worldId);if(!scene?.authorized){this.progress.delete(key);return null;}
  const descriptor=scene.descriptor,packet={worldId,players:r.transport?.currentEyeRoster?.(worldId)??[]};
  if(packet?.worldId!==worldId||!Array.isArray(packet.players)){this.progress.delete(key);return null;}const pose=packet.players.find(p=>p.nodeId===nodeId);if(!pose||r.transport?.isEyeConsentValid?.(pose)!==true){this.progress.delete(key);return null;}
  const avatar=scene.peerLayer?.avatars?.get(nodeId),authority=descriptor?.published?.descriptor?.authority?.nodeId;
  const fence={world:worldId,authority,epoch:descriptor?.epoch,content:descriptor?.contentDigest,node:nodeId,session:pose.eyeSession,gen:pose.generation,consent:JSON.stringify(pose.eyesConsent)};
  const base={key,nodeId,label:String(pose.label??('Player '+nodeId.slice(-6))).slice(0,160),worldId,worldName:String(scene.project.metadata?.name??worldId).slice(0,160),pose:{position:Array.isArray(pose.position)?[...pose.position]:[],yaw:pose.yaw,pitch:pose.pitch,gen:pose.generation,seq:pose.sequence,eyeSession:pose.eyeSession},fence,avatar,scene:scene.scene,candidate:scene.candidate,currentWorld,remotePlayer:true,authorized:true,ready:this.avatarReady(avatar),validated:false,fresh:false,updatedAt:-Infinity};
  if(pose.worldId!==worldId||pose.authorityEpoch!==descriptor?.epoch||pose.contentDigest!==descriptor?.contentDigest||!id(authority)||!vec(pose.position)||!Number.isFinite(pose.yaw)||Math.abs(pose.yaw)>1e6||!Number.isFinite(pose.pitch)||Math.abs(pose.pitch)>1.5||!integer(pose.generation)||!integer(pose.sequence)||!/^sha256:[a-f0-9]{64}$/.test(pose.eyeSession??''))return base;
  const context=JSON.stringify([scene.connection,...Object.values(fence)]),fingerprint=gaze(pose),at=this.now();let progress=this.progress.get(key);
  if(!progress||progress.context!==context){progress={context,sequence:pose.sequence,fingerprint,updatedAt:at,valid:true,advanced:false};this.progress.set(key,progress);}else if(pose.sequence>progress.sequence){Object.assign(progress,{sequence:pose.sequence,fingerprint,updatedAt:at,valid:true,advanced:true});}else if(pose.sequence<progress.sequence||fingerprint!==progress.fingerprint)progress.valid=false;
  while(this.progress.size>this.maxTargets*2)this.progress.delete(this.progress.keys().next().value);
  const age=at-progress.updatedAt;return {...base,validated:progress.valid,fresh:progress.valid&&progress.advanced&&Number.isFinite(age)&&age>=0&&age<=this.timeoutMs,updatedAt:progress.updatedAt};
 }
 targets(){
  if(this.disposed)return [];const r=this.runtime;let scenes;try{scenes=r.listEyeScenes();}catch{this.clear();return [];}if(!Array.isArray(scenes)){this.clear();return [];}
  const worlds=new Set(scenes.map(s=>s.worldId));for(const key of this.progress.keys())if(!worlds.has(JSON.parse(key)[0]))this.progress.delete(key);
  const ownWorld=this.host.active?.identity.worldId,result=[];scenes=[...scenes].sort((a,b)=>Number(b.worldId===ownWorld)-Number(a.worldId===ownWorld));
  for(const scene of scenes){if(scene.worldId!==ownWorld&&!this.allowCrossWorld)continue;const packet={worldId:scene.worldId,players:r.transport?.currentEyeRoster?.(scene.worldId)??[]};if(packet?.worldId!==scene.worldId||!Array.isArray(packet.players))continue;
   for(const pose of (packet.players??[]).slice(0,this.maxTargets)){if(pose.nodeId===r.transport?.identity?.nodeId)continue;const target=this.resolve(JSON.stringify([scene.worldId,pose.nodeId]));if(target)result.push(target);if(result.length>=this.maxTargets)return result;}}
  return result;
 }
 listTargets(){return this.targets();}
 resolveTarget(key){return this.resolve(key);}
 clear(){this.progress.clear();this.assets=new WeakMap();}
 dispose(){this.clear();this.disposed=true;}
}
export const createRepositoryPlayerEyes=options=>new RepositoryPlayerEyes(options);
