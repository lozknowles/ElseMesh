import {loadVerifiedPhysicsBytes,loadVerifiedSog} from '../src/world-runtime/SplatSceneSource.js';
import {compileSplatScenePhysics} from '../src/world-runtime/SplatScenePhysics.js';
import {describeRuntimeWorld,validateSplatScene} from '../src/world-runtime/vendor/world-engine-contract.js';
import {Vector3} from '../src/engine/math/Vector3.js';
import {assertQualifiedSplatProfile} from '../src/world-runtime/SplatSceneProfiles.js';
/** CPU-only owner admission. An authored Splat field never falls back to terrain. */
export async function prepareSplatWorldPhysics(project,read){
 if(!Object.hasOwn(project,'splatScene'))return null;
 const errors=validateSplatScene(project.splatScene);if(errors.length)throw Error('Invalid owner splat scene: '+errors[0]);
 assertQualifiedSplatProfile(project);
 // Verify both immutable resources; the owner does not decode or render SOG.
 await loadVerifiedSog(project,read);
 const physics=await compileSplatScenePhysics(project,await loadVerifiedPhysicsBytes(project,read));
 for(const b of describeRuntimeWorld(project).boxes)physics.colliders.addBox(new Vector3(...b.center),new Vector3(...b.half),b.rotY??b.yaw??0,{walkable:b.walkable,solid:b.solid,tag:b.id});
 return physics;
}
export function splatPlayerClearance(physics){
 if(typeof physics?.clearance!=='function'||typeof physics?.segment!=='function')throw Error('Owner splat physics requires exact clearance and segment guards.');
 const options=Object.freeze({radius:.3,height:1.8,footRadius:.35,stepHeight:.001});
 return (position,context={})=>{
  const movement=context.purpose==='movement',c={...options,allowAirborne:movement};
  if(!physics.clearance(position,c))return false;
  return !movement||physics.segment(context.previousMotion?.position,position,c)?.valid===true;
 };
}
