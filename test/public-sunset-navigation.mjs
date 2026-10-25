export const shortestAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
export function coarseTurnKey(current,wanted){const delta=shortestAngle(wanted-current);return delta>0?'ArrowLeft':delta<0?'ArrowRight':null;}
export function yawTowardsXZ(from,to){return Math.atan2(from[0]-to[0],from[2]-to[2]);}
export function nativeForward(yaw){return [-Math.sin(yaw),-Math.cos(yaw)];}
export function predictPortalApproach({feet,yaw,portal,radius=.3,margin=.1,direction='inward',targetLocalZ=0}){
 if(!Array.isArray(feet)||feet.length!==3||!feet.every(Number.isFinite)||!Number.isFinite(yaw)||!portal||!portal.position.every(Number.isFinite)||!Number.isFinite(portal.yaw)||!Number.isFinite(portal.width))return {valid:false,reason:'non-finite'};
 const c=Math.cos(portal.yaw),s=Math.sin(portal.yaw),dx=feet[0]-portal.position[0],dz=feet[2]-portal.position[2],x=c*dx-s*dz,z=s*dx+c*dz,fx=-Math.sin(yaw),fz=-Math.cos(yaw),vx=c*fx-s*fz,vz=s*fx+c*fz,usableHalf=portal.width/2-radius-margin;
 if(direction!=='inward'&&direction!=='outward')return {valid:false,reason:'invalid-direction'};
 if(!Number.isFinite(targetLocalZ))return {valid:false,reason:'non-finite-target-plane'};
 if(direction==='inward'?! (z>targetLocalZ):! (z<targetLocalZ))return {valid:false,reason:'not-before-target-plane',local:{x,z},usableHalf};
 if(direction==='inward'?! (vz<0):! (vz>0))return {valid:false,reason:'facing-away-or-parallel',local:{x,z},direction:{x:vx,z:vz},usableHalf};
 const distance=(targetLocalZ-z)/vz,localX=x+vx*distance,hit=[feet[0]+fx*distance,feet[1],feet[2]+fz*distance];
 if(!Number.isFinite(distance)||!(distance>0)||!hit.every(Number.isFinite))return {valid:false,reason:'invalid-intersection'};
 if(Math.abs(localX)>usableHalf)return {valid:false,reason:'outside-usable-aperture',distance,localX,hit,usableHalf};
 return {valid:true,reason:'inside-usable-aperture',distance,localX,hit,usableHalf,local:{x,z},direction:{x:vx,z:vz}};
}

export function acceptValidatedApproach(geometry,physical){if(!geometry.valid)return geometry;if(!physical?.valid)return {...geometry,valid:false,reason:physical?.reason??'unsupported-or-blocked',physical};return {...geometry,physical};}

