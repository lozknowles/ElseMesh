const FENCE_KEYS=['world','authority','epoch','content','node','session','gen','consent'];
const text=value=>typeof value==='string'&&value.length>0&&value.length<=512;
const counter=value=>Number.isSafeInteger(value)&&value>=0;
const vector=value=>Array.isArray(value)&&value.length===3&&value.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
const sameFence=(a,b)=>FENCE_KEYS.every(key=>a?.[key]===b?.[key]);
const poseKey=pose=>JSON.stringify([pose.position,pose.yaw,pose.pitch,pose.gen,pose.seq,pose.eyeSession]);

/** Read-only Stage 1 view. The resolver owns authorization and network validation.
 * No content loads, transfer operations, controls or remote state writes occur here.
 * Eye position is an approximation of the interpolated avatar, not a device camera.
 */
export class PlayerEyeView {
 constructor({resolveTarget,listTargets=()=>[],eyeCamera,onActivate=()=>{},onExit=()=>{},now=()=>performance.now(),timeoutMs=1500,maxTargets=32,allowCrossWorld=false}={}){
  if(typeof resolveTarget!=='function'||typeof listTargets!=='function'||!eyeCamera?.clone||!eyeCamera?.position?.clone||!eyeCamera?.rotation?.set||!Number.isFinite(timeoutMs)||timeoutMs<100||timeoutMs>10000||!Number.isSafeInteger(maxTargets)||maxTargets<1||maxTargets>64)throw Error('Invalid player-eye view dependencies.');
  Object.assign(this,{resolveTarget,listTargets,onActivate,onExit,now,timeoutMs,maxTargets,allowCrossWorld});this.eyeCamera=eyeCamera.clone();this.selection=null;this.disposed=false;this.reason='Own view';this.listeners=new Set();
 }
 subscribe(listener){if(this.disposed)return ()=>{};this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 notify(){for(const listener of this.listeners)listener(this.status());}
 status(){const s=this.selection;return {active:!!s,key:s?.key??null,label:s?.label??null,worldId:s?.worldId??null,worldName:s?.worldName??null,reason:this.reason,approximate:true};}
 inspect(key){
  let target;try{target=this.resolveTarget(key);}catch{return {reason:'Player unavailable'};}
  if(!target||typeof target.then==='function'||target.key!==key||target.remotePlayer!==true||(target.currentWorld!==true&&!this.allowCrossWorld)||target.authorized!==true||target.validated!==true)return {reason:'Player unavailable'};
  if(target.fresh===false)return {reason:'Player view is stale'};
  if(target.ready!==true||!target.avatar?.group?.localToWorld||!target.scene)return {reason:'Avatar not ready'};
  const pose=target.pose,fence=target.fence,age=this.now()-target.updatedAt;
  if(!Number.isFinite(age)||age<0||age>this.timeoutMs)return {reason:'Player view is stale'};
  if(!pose||!Number.isFinite(pose.pitch))return {reason:'Published gaze unavailable'};
  if(!vector(pose.position)||!Number.isFinite(pose.yaw)||Math.abs(pose.yaw)>1e6||Math.abs(pose.pitch)>1.5||!counter(pose.gen)||!counter(pose.seq)||!text(pose.eyeSession))return {reason:'Player gaze invalid'};
  if(typeof fence?.consent!=='string'||!fence.consent.length||fence.consent.length>16384)return {reason:'Vision sharing unavailable'};
  if(!fence||!['world','authority','content','node','session'].every(key=>text(fence[key]))||!counter(fence.epoch)||!counter(fence.gen)||fence.gen!==pose.gen||fence.world!==target.worldId||fence.node!==target.nodeId)return {reason:'Player context invalid'};
  return {target,fence:Object.fromEntries(FENCE_KEYS.map(key=>[key,fence[key]])),poseKey:poseKey(pose)};
 }
 targets(){
  if(this.disposed)return [];let listed;try{listed=this.listTargets();}catch{return [];}
  if(!Array.isArray(listed))return [];const seen=new Set(),result=[];
  for(const item of listed.slice(0,this.maxTargets)){if(!text(item?.key)||seen.has(item.key))continue;seen.add(item.key);const check=this.inspect(item.key),t=check.target??item;result.push({key:item.key,label:String(t.label??'Player').slice(0,160),worldId:t.worldId??null,worldName:String(t.worldName??'Current world').slice(0,160),available:!!check.target,reason:check.reason??'Approximate avatar eyes'});}
  return result;
 }
 select(key){
  if(this.disposed||!text(key))return false;const checked=this.inspect(key);
  if(!checked.target){this.ownView(checked.reason);return false;}
  if(this.selection)this.ownView('Changing player view');const t=checked.target;
  this.selection={key,fence:checked.fence,eyeSession:t.pose.eyeSession,sequence:t.pose.seq,poseKey:checked.poseKey,label:String(t.label??'Player').slice(0,160),worldId:t.worldId,worldName:String(t.worldName??'Current world').slice(0,160)};
  this.reason='Approximate avatar eyes';
  try{this.onActivate(this.status());}catch(error){this.ownView('Player view activation failed');throw error;}
  this.notify();return !!this.update();
 }
 update(){
  if(this.disposed||!this.selection)return null;const s=this.selection,checked=this.inspect(s.key),t=checked.target;
  if(!t){this.ownView(checked.reason);return null;}
  if(!sameFence(s.fence,checked.fence)||s.eyeSession!==t.pose.eyeSession){this.ownView('Player context changed');return null;}
  if(t.pose.seq<s.sequence||t.pose.seq===s.sequence&&checked.poseKey!==s.poseKey){this.ownView('Player gaze sequence changed');return null;}
  try{
   const group=t.avatar.group,origin=this.eyeCamera.position.clone().set(0,1.6,0);group.updateWorldMatrix?.(true,false);group.localToWorld(origin);
   if(![origin.x,origin.y,origin.z].every(Number.isFinite))throw Error('Invalid avatar eye origin');
   this.eyeCamera.position.copy(origin);this.eyeCamera.rotation.set(t.pose.pitch,t.pose.yaw,0,'YXZ');this.eyeCamera.updateMatrixWorld?.(true);
  }catch{this.ownView('Avatar eyes unavailable');return null;}
  s.sequence=t.pose.seq;s.poseKey=checked.poseKey;
  return {camera:this.eyeCamera,scene:t.scene,candidate:t.candidate??null,avatar:t.avatar,target:{key:s.key,nodeId:t.nodeId,label:s.label,worldId:s.worldId,worldName:s.worldName,fence:{...s.fence},approximate:true}};
 }
 ownView(reason='Own view'){
  const was=this.selection;this.selection=null;this.reason=reason;
  try{if(was)this.onExit({key:was.key,reason});}finally{if(was)this.notify();}
 }
 dispose(){if(this.disposed)return;try{this.ownView('Player eyes closed');}finally{this.disposed=true;this.listeners.clear();}}
}
