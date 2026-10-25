import { Vector3 } from '../engine/index.js';

export const BASE_WALK_SPEED = .05788079143247788;
export const NAV_DEFAULTS = Object.freeze({radius:.1,height:.275,stepHeight:.035,maxDrop:.045,maxSlope:.65,cellSize:.18,exploreRadius:2,maxNodes:900,maxDt:.2,substep:1/30,speed:BASE_WALK_SPEED});
export function vector(value) { return value?.clone ? value.clone() : new Vector3().fromArray(value ?? [0,0,0]); }
export function finiteVector(value) { return value && [value.x,value.y,value.z].every(Number.isFinite); }
/** Bounded local planner. Every edge samples the capsule footprint and actual collision world. */
export class Navigation {
 constructor({terrain,colliders,config={},admitSegment=null}={}) { this.terrain=terrain;this.colliders=colliders;this.admitSegment=admitSegment;this.config={...NAV_DEFAULTS,...config};for(const key of Object.keys(NAV_DEFAULTS))if(!Number.isFinite(this.config[key])||this.config[key]<=0)this.config[key]=NAV_DEFAULTS[key];this.config.maxNodes=Math.min(1600,Math.floor(this.config.maxNodes));this.config.exploreRadius=Math.min(4,this.config.exploreRadius);this.config.cellSize=Math.max(.12,this.config.cellSize);this.config.maxDt=Math.min(.2,this.config.maxDt);this.config.substep=Math.min(1/30,this.config.substep);this.lastExpanded=0; }
 ground(x,z,maxY) { const a=this.terrain?.heightAt?.(x,z);const b=this.colliders?.groundHeightAt?.(x,z,maxY,0);return Math.max(Number.isFinite(a)?a:-Infinity,Number.isFinite(b)?b:-Infinity); }
 surface(point,referenceY=point.y) {
  if(!finiteVector(point)||!Number.isFinite(referenceY)||this.terrain?.supportsFootprint&&!this.terrain.supportsFootprint(point.x,point.z,this.config.radius))return null;
  const c=this.config,y=this.ground(point.x,point.z,referenceY+c.stepHeight+1e-6);if(!Number.isFinite(y)||y-referenceY>c.stepHeight+1e-5||referenceY-y>c.maxDrop+1e-5)return null;
  let low=y,high=y;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,h=this.ground(point.x+Math.cos(a)*c.radius,point.z+Math.sin(a)*c.radius,y+c.stepHeight+1e-6);if(!Number.isFinite(h))return null;low=Math.min(low,h);high=Math.max(high,h);}
  if(high-low>Math.min(c.maxDrop+c.stepHeight,c.radius*2*c.maxSlope))return null;
  const result=new Vector3(point.x,y,point.z),probe=result.clone();this.colliders?.resolveCapsule?.(probe,c.radius,c.height,c.stepHeight);
  return finiteVector(probe)&&probe.distanceToSquared(result)<1e-10?result:null;
 }
 segment(from,to) { if(!finiteVector(from)||!finiteVector(to)||this.admitSegment&&!this.admitSegment(from,to))return null;const count=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/(this.config.radius*.5)));if(count>512)return null;let previous=from;for(let i=1;i<=count;i++){const p=new Vector3(from.x+(to.x-from.x)*i/count,previous.y,from.z+(to.z-from.z)*i/count);const next=this.surface(p,previous.y);if(!next)return null;previous=next;}return previous; }
 findPath(start,goal) {
  this.lastExpanded=0;const c=this.config;if(!finiteVector(start)||!finiteVector(goal)||Math.hypot(goal.x-start.x,goal.z-start.z)>c.exploreRadius)return null;
  const origin=this.surface(start);if(!origin)return null;const direct=this.segment(origin,goal);if(direct)return [direct];
  const key=(x,z)=>`${x},${z}`,open=[{x:0,z:0,p:origin,g:0,f:0,parent:null}],seen=new Map([[key(0,0),open[0]]]),closed=new Set();const limit=Math.ceil(c.exploreRadius/c.cellSize);
  while(open.length&&this.lastExpanded<c.maxNodes){open.sort((a,b)=>a.f-b.f||a.g-b.g||a.x-b.x||a.z-b.z);const n=open.shift(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);this.lastExpanded++;
   if(Math.hypot(n.p.x-goal.x,n.p.z-goal.z)<=c.cellSize*1.5){const end=this.segment(n.p,goal);if(end){const path=[end];for(let p=n;p.parent;p=p.parent)path.push(p.p);return path.reverse();}}
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k2=key(x,z);if(Math.abs(x)>limit||Math.abs(z)>limit||Math.hypot(x,z)*c.cellSize>c.exploreRadius||closed.has(k2))continue;const p=this.segment(n.p,new Vector3(origin.x+x*c.cellSize,n.p.y,origin.z+z*c.cellSize));if(!p)continue;const g=n.g+Math.hypot(dx,dz)*c.cellSize;if(seen.has(k2)&&seen.get(k2).g<=g)continue;const node={x,z,p,g,f:g+Math.hypot(p.x-goal.x,p.z-goal.z),parent:n};seen.set(k2,node);open.push(node);}
  }return null;
 }
}
