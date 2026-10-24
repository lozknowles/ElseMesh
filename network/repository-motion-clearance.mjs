import {Colliders} from '../src/world/Colliders.js';
import {Vector3} from '../src/engine/math/Vector3.js';
export const REPOSITORY_CAPSULE=Object.freeze({radius:.3,height:1.8,step:.4,supportTolerance:.08,maxStepPath:4,pathSpacing:.1});
const contains=(b,x,z)=>x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z;
/** Shared native Colliders ground semantics; repository colliders are already world AABBs. */
export function createRepositoryGeometrySupport(colliders,heightAt){
 const ground=new Colliders();for(const c of colliders){const b=c.bounds;ground.addBox(new Vector3((b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2),new Vector3((b.max.x-b.min.x)/2,(b.max.y-b.min.y)/2,(b.max.z-b.min.z)/2),0,{walkable:c.object.collision==='walkable',solid:true});}
 return (x,z,maxY)=>Math.max(heightAt(x,z),ground.groundHeightAt(x,z,maxY));
}
/** Boolean and synchronous. Only the authenticated authority supplies movement context. */
export function createRepositoryMotionClearance({colliders,heightAt,width,depth}){
 const C=REPOSITORY_CAPSULE,supportAt=createRepositoryGeometrySupport(colliders,heightAt);
 const valid=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.abs(p[0])<=width/2-C.radius&&Math.abs(p[2])<=depth/2-C.radius&&p[1]>=heightAt(p[0],p[2])-.08;
 const overlaps=(b,p)=>p[0]+C.radius>b.min.x&&p[0]-C.radius<b.max.x&&p[2]+C.radius>b.min.z&&p[2]-C.radius<b.max.z&&p[1]+C.height>b.min.y+.02&&p[1]+.05<b.max.y;
 const strict=p=>valid(p)&&!colliders.some(c=>overlaps(c.bounds,p));
 // Check every solid with the same capsule overlap as strict admission. The sole exception
 // is an authored walkable leading edge within this derived support's step bound.
 function supportedPose(p,support,currentFeet=p[1]){
  if(!valid(p)||Math.abs(p[1]-support)>C.supportTolerance)return false;
  for(const c of colliders){const b=c.bounds;if(!overlaps(b,p))continue;
   if(c.object.collision!=='walkable'||b.max.y>support+C.step+1e-7||b.max.y>currentFeet+C.step+1e-7||contains(b,p[0],p[2])&&Math.abs(p[1]-b.max.y)>C.supportTolerance)return false;
   // Raising onto this ledge must leave a full capsule below every solid ceiling.
   const raised=[p[0],b.max.y,p[2]];
   if(colliders.some(other=>other!==c&&overlaps(other.bounds,raised)&&!(other.object.collision==='walkable'&&other.bounds.max.y<=b.max.y+C.step+1e-7)))return false;
  }
  return true;
 }
 function movement(p,previous){
  const q=previous?.position;if(!valid(q))return false;
  let support=supportAt(q[0],q[2],q[1]+C.supportTolerance);
  if(!Number.isFinite(support)||Math.abs(q[1]-support)>C.supportTolerance)return false;
  const distance=Math.hypot(p[0]-q[0],p[2]-q[2]);if(distance>C.maxStepPath)return false;
  const segments=Math.max(1,Math.ceil(distance/C.pathSpacing));
  for(let i=1;i<=segments;i++){
   const t=i/segments,x=q[0]+(p[0]-q[0])*t,z=q[2]+(p[2]-q[2])*t,next=supportAt(x,z,support+C.step+1e-7);
   if(!Number.isFinite(next)||Math.abs(next-support)>C.step+1e-7||!supportedPose([x,next,z],next))return false;
   support=next;
  }
  return supportedPose(p,support,p[1]);
 }
 return (position,context)=>strict(position)||(valid(position)&&context?.purpose==='movement'&&movement(position,context.previousMotion));
}
