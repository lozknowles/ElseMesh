/** Reviewed Sunset support constrains local walking; it never supplies a fake floor. */
export function withSplatMovementBoundary(physics){
 if(typeof physics?.terrain?.heightAt!=='function'||typeof physics.supportsFootprint!=='function'||typeof physics.segment!=='function'||typeof physics.clearance!=='function'||!Array.isArray(physics.bounds?.max))throw Error('Splat movement requires admitted footprint, segment and clearance guards.');
 const terrain=physics.terrain,finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite),options={radius:.3,height:1.8,footRadius:.35,allowAirborne:true};
 const assertMovementMode=mode=>{if(mode!=='walk')throw Error('This reviewed Sunset corridor supports walking and jumping only.');};
 const endpoint=p=>[p.x,Math.max(p.y,terrain.heightAt(p.x,p.z)),p.z];
 const segment=(start,end)=>physics.segment(start,end,options)?.valid===true;
 function constrainPlayer(old,next,{radius=.3,height=1.75,mode='walk'}={}){
  assertMovementMode(mode);const foot=Math.max(.35,radius),floor=terrain.heightAt(old.x,old.z);
  if(!finite(old)||!Number.isFinite(floor)||!physics.supportsFootprint(old.x,old.z,foot)||old.y<floor-.08||old.y+height>physics.bounds.max[1]+.08)throw Error('Player position is outside the reviewed Sunset corridor; validated arrival is required.');
  if(!finite(next))throw Error('Invalid Sunset movement.');
  const distance=Math.hypot(next.x-old.x,next.z-old.z),steps=Math.max(1,Math.ceil(distance/.02));let valid=distance<=.5&&steps<=25;
  for(let i=0;valid&&i<=steps;i++){const t=i/steps;if(!physics.supportsFootprint(old.x+(next.x-old.x)*t,old.z+(next.z-old.z)*t,foot))valid=false;}
  valid=valid&&segment([old.x,old.y,old.z],endpoint(next));
  if(!valid){next.x=old.x;next.z=old.z;if(!segment([old.x,old.y,old.z],endpoint(next)))next.y=old.y;}
  return valid;
 }
 function assertPlayerPose(position,{mode='walk',arrival=true}={}){assertMovementMode(mode);const p=Array.isArray(position)?position:[position.x,position.y,position.z];if(!physics.clearance(p,{radius:.3,height:1.8,footRadius:.35,stepHeight:arrival ? .001 : .4}))throw Error('Sunset arrival or restore is outside the reviewed corridor.');}
 return Object.freeze({...terrain,supportsFootprint:physics.supportsFootprint,assertMovementMode,constrainPlayer,assertPlayerPose});
}
