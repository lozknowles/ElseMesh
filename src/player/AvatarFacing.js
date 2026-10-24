// Presentation only: installed explorers face +Z. Never change control/network yaw.
// Accepted position deltas account for collision sliding; attempted velocity may not.
export function avatarMotionFacing(state, {velocity, position, fallbackYaw = 0, context, mode = 'walk', dt, minimumDistance = .0001}) {
 const vx=velocity?.x??velocity?.[0]??0, vz=velocity?.z??velocity?.[2]??0;
 const px=position?.x??position?.[0], pz=position?.z??position?.[2];
 const positioned=Number.isFinite(px)&&Number.isFinite(pz), previous=Number.isFinite(state.x)&&Number.isFinite(state.z);
 const dx=px-state.x,dz=pz-state.z,distance=Math.hypot(dx,dz);
 const reset=state.context!==context||state.mode!==mode||(positioned&&previous&&distance>8);
 if(reset)state.yaw=undefined;
 state.context=context;state.mode=mode;state.x=px;state.z=pz;
 const fallback=Number.isFinite(fallbackYaw)?fallbackYaw:0;
 if(mode!=='walk'){state.yaw=undefined;return fallback;}
 if(positioned&&previous&&!reset){
  // Repeated sparse peer samples and blocked local movement preserve body yaw.
  const threshold=Math.max(minimumDistance,Number.isFinite(dt)&&dt>0?.1*dt:0);
  if(distance>threshold)state.yaw=Math.atan2(dx,dz);
 }else if(Number.isFinite(vx)&&Number.isFinite(vz)&&Math.hypot(vx,vz)>.1){
  // Bootstrap only: no accepted displacement exists yet after creation/transfer.
  state.yaw=Math.atan2(vx,vz);
 }
 return state.yaw??fallback;
}

export function repositoryPeerFacing(avatar, pose, worldId) {
 return avatarMotionFacing(avatar.remoteFacingState??={}, {
  velocity:pose.velocity, position:pose.position, fallbackYaw:(pose.yaw??0)+Math.PI,
  context:JSON.stringify([worldId,pose.worldId,pose.generation]), mode:pose.mode??'walk',
  // Presence packets can repeat for several render frames; ignore tiny jitter.
  minimumDistance:.005,
 });
}


// When V reveals the local avatar, start from the player's current gaze.
// Once they move, accepted displacement again determines the body heading.
export function alignAvatarToPlayerView(avatar,player){
 if(!avatar||!player||!Number.isFinite(player.yaw))return false;
 avatar.facingState={context:player,mode:player.mode,x:player.position.x,z:player.position.z,yaw:player.yaw+Math.PI};
 return true;
}
