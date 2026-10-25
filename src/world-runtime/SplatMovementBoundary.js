/** Reviewed support is a movement restriction, never a replacement floor.
 * Owner mode additionally waits for signed accepted motion. This strict lab
 * fallback may pause horizontal movement for a network round trip.
 */
export function withSplatMovementBoundary(physics,{getConfirmedPose,requireOwnerConfirmation=()=>typeof getConfirmedPose==='function',now=()=>performance.now(),maxConfirmedAgeMs=2000,maxConfirmedDistance=.5}={}){
 if(typeof physics?.terrain?.heightAt!=='function'||typeof physics.supportsFootprint!=='function'||typeof physics.segment!=='function'||typeof physics.clearance!=='function'||!Array.isArray(physics.bounds?.max))throw Error('Splat movement requires admitted footprint, segment and clearance guards.');
 if(!Number.isFinite(maxConfirmedAgeMs)||maxConfirmedAgeMs<100||maxConfirmedAgeMs>5000||!Number.isFinite(maxConfirmedDistance)||maxConfirmedDistance<=0||maxConfirmedDistance>1)throw Error('Invalid confirmed motion bounds');
 const terrain=physics.terrain,finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite),options={radius:.3,height:1.8,footRadius:.35,allowAirborne:true};
 function assertMovementMode(mode){if(mode!=='walk')throw Error('This reviewed splat corridor supports walking and jumping only.');}
 function supportedOld(old,radius,height){const floor=terrain.heightAt(old.x,old.z);if(!finite(old)||!Number.isFinite(floor)||!physics.supportsFootprint(old.x,old.z,radius)||old.y<floor-.08||old.y+height>physics.bounds.max[1]+.08)throw Error('Player position is outside the reviewed splat corridor; validated arrival is required.');}
 // Player.updateWalk grounds after this restriction. Validate the exact grounded
 // endpoint when gravity has proposed feet below the fixed support plane.
 const endpoint=p=>[p.x,Math.max(p.y,terrain.heightAt(p.x,p.z)),p.z];
 const segment=(from,to,owner=false)=>physics.segment(from,to,owner?{...options,stepHeight:.001}:options)?.valid===true;
 function constrainPlayer(old,next,{radius=.3,height=1.75,mode='walk'}={}){
  assertMovementMode(mode);const foot=Math.max(.35,radius);supportedOld(old,foot,height);if(!finite(next))throw Error('Invalid splat movement.');
  const distance=Math.hypot(next.x-old.x,next.z-old.z),steps=Math.max(1,Math.ceil(distance/.02));let valid=distance<=.5&&steps<=25;
  for(let i=0;valid&&i<=steps;i++){const t=i/steps;if(!physics.supportsFootprint(old.x+(next.x-old.x)*t,old.z+(next.z-old.z)*t,foot))valid=false;}
  valid=valid&&segment([old.x,old.y,old.z],endpoint(next));
  const required=typeof requireOwnerConfirmation==='function'?requireOwnerConfirmation():!!requireOwnerConfirmation;let confirmed=null,usable=false;
  if(required){try{confirmed=getConfirmedPose?.();}catch{}const age=now()-(confirmed?.confirmedAt??-Infinity);usable=Array.isArray(confirmed?.position)&&confirmed.position.length===3&&confirmed.position.every(Number.isFinite)&&Number.isFinite(age)&&age>=0&&age<=maxConfirmedAgeMs&&typeof physics.segment==='function';
   const within=p=>usable&&Math.hypot(p[0]-confirmed.position[0],p[2]-confirmed.position[2])<=maxConfirmedDistance;
   valid=valid&&within(endpoint(next))&&confirmed.pending!==true&&segment(confirmed.position,endpoint(next),true);
   if(!valid){next.x=old.x;next.z=old.z;if(!within(endpoint(next))||!segment(confirmed.position,endpoint(next),true))next.y=old.y;return false;}
  }
  if(!valid){next.x=old.x;next.z=old.z;if(!segment([old.x,old.y,old.z],endpoint(next)))next.y=old.y;}
  return valid;
 }
 function assertPlayerPose(position,{mode='walk',arrival=true}={}){assertMovementMode(mode);const p=Array.isArray(position)?position:[position.x,position.y,position.z];if(!physics.clearance(p,{radius:.3,height:1.8,footRadius:.35,stepHeight:arrival ? .001 : .4}))throw Error('Splat arrival or restore is outside the reviewed corridor.');}
 return Object.freeze({...terrain,supportsFootprint:physics.supportsFootprint,assertMovementMode,constrainPlayer,assertPlayerPose});
}

/** Only a signed accepted/corrected pose in this exact current candidate may
 * release owner-mode walking. Authenticated bootstrap alone cannot release it. */
export function confirmedSplatPose(runtime,candidate,{contentDigest}={}){
 const transport=runtime?.transport,member=transport?.membership,world=member?.world,region=world?.published?.descriptor,active=runtime?.host?.active,id=candidate?.descriptor?.worldId,project=candidate?.project??candidate?.descriptor?.project;
 if(runtime?.config?.protocol!=='elsemesh.owner-runtime/1'||!runtime.connected||runtime.pending||runtime.authorityOffline||transport?.closed||transport?.frozen||transport?.socket?.readyState!==1||!id||!contentDigest||active?.root!==candidate.root||active.identity?.worldId!==id||active.identity?.contentDigest!==contentDigest||transport.worldId!==id||member?.worldId!==id||world?.worldId!==id||world.regionId!==project?.metadata?.regionId||world.contentDigest!==contentDigest)return null;
 const pose=transport.getConfirmedPose?.(id),context=pose?.context,expected={connection:transport.connectionEpoch,worldId:id,sessionId:member.sessionId,generation:transport.generation,playerNodeId:transport.identity?.nodeId,authorityNodeId:region?.authority?.nodeId,authorityEpoch:world.epoch,contentDigest,federationWorldId:region?.worldId,federationRegionId:region?.regionId};
 if(!['signed-receipt','correction'].includes(pose?.kind)||!context||Object.values(expected).some(v=>v===undefined||v===null)||Object.entries(expected).some(([key,value])=>context[key]!==value))return null;
 return pose;
}
