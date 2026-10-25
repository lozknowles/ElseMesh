import {loadVerifiedPhysicsBytes,loadVerifiedSog,assertPinnedSunsetPhysics} from '../src/world-runtime/SplatSceneSource.js';
import {compileSplatScenePhysics} from '../src/world-runtime/SplatScenePhysics.js';
import {describeRuntimeWorld,validateSplatScene} from '../src/world-runtime/vendor/world-engine-contract.js';
import {Vector3} from '../src/engine/math/Vector3.js';
const SOG=Object.freeze({sha256:'66334b9bcea5abb6b2a310c44c584fd7fdc8fb999db9c718c785473c41019298',bytes:12690032,count:719538});
/** CPU-only owner admission. An authored Splat field never falls back to terrain. */
export async function prepareSplatWorldPhysics(project,read){
 if(!Object.hasOwn(project,'splatScene'))return null;
 const errors=validateSplatScene(project.splatScene);if(errors.length)throw Error('Invalid owner splat scene: '+errors[0]);
 assertPinnedSunsetPhysics(project);const asset=project.splatScene.asset;
 if(project.nativeIsland||asset.sha256!==SOG.sha256||asset.bytes!==SOG.bytes||asset.count!==SOG.count)throw Error('Owner splat physics accepts only the exact qualified Sunset scene.');
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
