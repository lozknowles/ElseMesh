import {Colliders} from '../world/Colliders.js';
import {Vector3} from '../engine/index.js';
import {validateSplatScene,MAX_SPLAT_PHYSICS_BYTES} from './vendor/world-engine-contract.js';

export const SPLAT_PHYSICS_SCHEMA='elsemesh.splat-physics/1';
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,required,optional=[])=>record(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min,max)=>number(v,min,max)&&Number.isSafeInteger(v);
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>number(n,-1e4,1e4));
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const text=v=>typeof v==='string'&&v.length>0&&v.length<=12000;
const key=(x,z)=>x+','+z;
const fail=message=>{throw Error('Invalid splat physics: '+message);};
const assert=(condition,message)=>{if(!condition)fail(message);};
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
const sameVector=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
async function digest(bytes){const h=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(h),v=>v.toString(16).padStart(2,'0')).join('');}
/** Canonical nested-geometry digest; this is NOT a claim about original raw-file bytes. */
export async function splatGeometrySha256(collisions){return digest(new TextEncoder().encode(JSON.stringify(collisions)+'\n'));}

function validateDocument(doc,scene){
 assert(exact(doc,['schema','assetSha256','transform','scaleStatus','coordinateSpace','bounds','plane','supportMask','collisions','qualification']),'schema fields');
 assert(doc.schema===SPLAT_PHYSICS_SCHEMA&&doc.coordinateSpace==='game-world','schema or coordinate space');
 assert(hash(doc.assetSha256)&&doc.assetSha256===scene.asset.sha256,'asset SHA mismatch');
 assert(exact(doc.transform,['position','rotation','scale'])&&vector(doc.transform.position)&&vector(doc.transform.rotation)&&number(doc.transform.scale,1e-6,1e3),'transform');
 assert(sameVector(doc.transform.position,scene.transform.position)&&sameVector(doc.transform.rotation,scene.transform.rotation)&&doc.transform.scale===scene.transform.scale,'transform mismatch; collisions must not be transformed twice');
 assert(doc.scaleStatus==='assumed-gameplay'&&doc.scaleStatus===scene.scaleStatus,'scale status');
 const b=doc.bounds;assert(exact(b,['min','max'])&&vector(b.min)&&vector(b.max)&&b.min.every((n,i)=>n<b.max[i]),'bounds');
 const p=doc.plane;assert(exact(p,['normal','offset'])&&vector(p.normal)&&number(p.offset,-1e4,1e4)&&p.normal[1]>=.5&&Math.abs(Math.hypot(...p.normal)-1)<1e-6,'near-horizontal normalized plane');
 const m=doc.supportMask;assert(exact(m,['origin','cellSize','shape','accepted'])&&Array.isArray(m.origin)&&m.origin.length===2&&m.origin.every(n=>number(n,-1e4,1e4))&&number(m.cellSize,.025,5)&&Array.isArray(m.shape)&&m.shape.length===2&&m.shape.every(n=>integer(n,1,256))&&m.shape[0]*m.shape[1]<=65536,'support mask grid');
 assert(Array.isArray(m.accepted)&&m.accepted.length>0&&m.accepted.length<=65536,'support mask count');const accepted=new Set();
 for(const cell of m.accepted){assert(Array.isArray(cell)&&cell.length===2&&cell.every((v,i)=>integer(v,0,m.shape[i]-1)),'support cell index');const k=key(...cell);assert(!accepted.has(k),'duplicate support cell');accepted.add(k);}
 assert(b.min[0]>=m.origin[0]-1e-10&&b.min[2]>=m.origin[1]-1e-10&&b.max[0]<=m.origin[0]+m.shape[0]*m.cellSize+1e-10&&b.max[2]<=m.origin[1]+m.shape[1]*m.cellSize+1e-10,'bounds outside mask grid');
 const c=doc.collisions;assert(exact(c,['coordinateSpace','provenance','boxes','cylinders'])&&c.coordinateSpace==='world'&&text(c.provenance)&&Array.isArray(c.boxes)&&Array.isArray(c.cylinders)&&c.boxes.length+c.cylinders.length>0&&c.boxes.length+c.cylinders.length<=30000,'native collision records');
 const boxOptional=['kind','physicsKind','sourceRawBoxIndex','sourceCellId','sourceSupportCount','planeApproximationMaximumError','obstacleId','sourceBoundary'];
 for(const box of c.boxes){
  assert(exact(box,['center','half','yaw','walkable','provenance'],boxOptional)&&vector(box.center)&&vector(box.half)&&box.half.every(v=>v>0)&&number(box.yaw,-Math.PI*2,Math.PI*2)&&typeof box.walkable==='boolean'&&text(box.provenance),'native box');
  if(Object.hasOwn(box,'kind'))assert(box.kind==='safety-boundary','box kind');
  if(Object.hasOwn(box,'physicsKind'))assert(['rawvoxel','fittedground','localauthoredobstacle','safetybounds'].includes(box.physicsKind),'box physics kind');
  if(Object.hasOwn(box,'sourceRawBoxIndex'))assert(integer(box.sourceRawBoxIndex,0,1e7),'source box index');
  if(Object.hasOwn(box,'sourceCellId'))assert(typeof box.sourceCellId==='string'&&/^\d+,\d+$/.test(box.sourceCellId)&&accepted.has(box.sourceCellId),'unreviewed fitted source cell');
  if(Object.hasOwn(box,'sourceSupportCount'))assert(integer(box.sourceSupportCount,1,1e7),'source support count');
  if(Object.hasOwn(box,'planeApproximationMaximumError'))assert(number(box.planeApproximationMaximumError,0,.01),'plane approximation');
  if(Object.hasOwn(box,'obstacleId'))assert(text(box.obstacleId)&&box.obstacleId.length<=128,'obstacle ID');
  if(Object.hasOwn(box,'sourceBoundary')){const s=box.sourceBoundary;assert(exact(s,['axis','normal','plane','low','high'])&&[0,2].includes(s.axis)&&[-1,1].includes(s.normal)&&[s.plane,s.low,s.high].every(v=>number(v,-1e4,1e4))&&s.low<s.high,'source boundary');}
 }
 for(const cylinder of c.cylinders){
  assert(exact(cylinder,['x','z','radius','yMin','yMax','provenance'],['kind','physicsKind'])&&[cylinder.x,cylinder.z,cylinder.yMin,cylinder.yMax].every(v=>number(v,-1e4,1e4))&&number(cylinder.radius,1e-6,1e3)&&cylinder.yMin<cylinder.yMax&&text(cylinder.provenance),'native cylinder');
  if(Object.hasOwn(cylinder,'kind'))assert(cylinder.kind==='safety-boundary','cylinder kind');
  if(Object.hasOwn(cylinder,'physicsKind'))assert(['rawvoxel','localauthoredobstacle','safetybounds'].includes(cylinder.physicsKind),'cylinder physics kind');
 }
 const q=doc.qualification;assert(exact(q,['status','human','spawn','exitDoor','reviewedRoutes','reviewSha256','geometrySha256','sourceGeometrySha256','sourceProjectionEvidenceSha256']),'qualification fields');
 assert(q.status==='qualified-corridor','qualification must explicitly be qualified-corridor');
 assert(exact(q.human,['radius','height','footRadius'])&&q.human.radius===.3&&q.human.height===1.8&&q.human.footRadius===.35,'qualified human capsule');
 assert(exact(q.spawn,['position','yaw','pitch'])&&vector(q.spawn.position)&&number(q.spawn.yaw,-Math.PI*2,Math.PI*2)&&number(q.spawn.pitch,-Math.PI/2,Math.PI/2),'qualified spawn');
 assert(exact(q.exitDoor,['position','yaw','width','height'])&&vector(q.exitDoor.position)&&number(q.exitDoor.yaw,-Math.PI*2,Math.PI*2)&&number(q.exitDoor.width,.62,10)&&number(q.exitDoor.height,1.82,10),'qualified exit door');
 assert([q.reviewSha256,q.geometrySha256,q.sourceGeometrySha256,q.sourceProjectionEvidenceSha256].every(hash)&&q.reviewSha256===scene.provenance.reviewSha256,'qualification provenance');
 assert(Array.isArray(q.reviewedRoutes)&&q.reviewedRoutes.length>=3&&q.reviewedRoutes.length<=8,'reviewed route count');let total=0,steps=0;
 for(const route of q.reviewedRoutes){assert(Array.isArray(route)&&route.length>=2&&route.length<=2048,'reviewed route point count');total+=route.length;for(const point of route)assert(vector(point),'reviewed route coordinate');for(let i=1;i<route.length;i++)steps+=Math.max(1,Math.ceil(Math.hypot(route[i][0]-route[i-1][0],route[i][2]-route[i-1][2])/.02));}
 assert(total<=4096&&steps<=10000,'reviewed route sampling budget');return accepted;
}
function capsuleOptions(options={},runtime=false){
 if(!exact(options,[],['radius','height','footRadius','stepHeight','supportTolerance','maxStep','sampling','maxLength','allowAirborne']))return null;
 const c={radius:.3,height:1.8,footRadius:.35,stepHeight:runtime ? .4 : .001,supportTolerance:.08,maxStep:.35,sampling:.02,maxLength:4,allowAirborne:false,...options};
 return typeof c.allowAirborne==='boolean'&&number(c.radius,.01,1)&&number(c.height,.05,4)&&number(c.footRadius,c.radius,2)&&number(c.stepHeight,.001,.4)&&number(c.supportTolerance,0,.08)&&number(c.maxStep,.001,.35)&&number(c.sampling,.01,.05)&&number(c.maxLength,.01,4)?c:null;
}
/**
 * Compile once after the verified bounded physics-byte reader. No renderer/fetch.
 * Native collision records remain unchanged, including geometry beneath unknown
 * cells: movement MUST use this bundle's mask/clearance/segment predicates.
 * allowAirborne is an internal movement capability, never an arrival default;
 * qualification route checks always remain grounded and strictly supported.
 */
export async function compileSplatScenePhysics(project,physicsBytes){
 const errors=validateSplatScene(project?.splatScene);assert(!errors.length&&project?.splatScene,errors[0]??'missing scene descriptor');
 assert(physicsBytes instanceof Uint8Array&&physicsBytes.byteLength>0&&physicsBytes.byteLength<=MAX_SPLAT_PHYSICS_BYTES,'bounded Uint8Array bytes');const bytes=Uint8Array.from(physicsBytes),scene=structuredClone(project.splatScene);
 assert(bytes.byteLength===scene.physics.bytes&&await digest(bytes)===scene.physics.sha256,'descriptor physics hash or byte size mismatch');
 let doc;try{doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('UTF-8 JSON');}const accepted=validateDocument(doc,scene);
 assert(await digest(new TextEncoder().encode(JSON.stringify(doc.qualification)+'\n'))===scene.provenance.qualificationSha256,'canonical qualification SHA mismatch');
 assert(await splatGeometrySha256(doc.collisions)===doc.qualification.geometrySha256,'canonical geometry SHA mismatch');
 const b=doc.bounds,m=doc.supportMask,p=doc.plane,colliders=new Colliders();
 for(const box of doc.collisions.boxes)colliders.addBox(new Vector3(...box.center),new Vector3(...box.half),box.yaw,{walkable:box.walkable,tag:box.kind==='safety-boundary'?'safety-boundary':box.physicsKind??'rawvoxel'});
 for(const c of doc.collisions.cylinders)colliders.addCylinder(c.x,c.z,c.radius,c.yMin,c.yMax,{tag:c.kind==='safety-boundary'?'safety-boundary':c.physicsKind??'rawvoxel'});
 const contains=(x,z,r=0)=>Number.isFinite(x)&&Number.isFinite(z)&&x-r>=b.min[0]&&x+r<=b.max[0]&&z-r>=b.min[2]&&z+r<=b.max[2];
 const heightAt=(x,z)=>{if(!contains(x,z))return -Infinity;const ix=Math.floor((x-m.origin[0])/m.cellSize),iz=Math.floor((z-m.origin[1])/m.cellSize);if(!accepted.has(key(ix,iz)))return -Infinity;const y=-(p.normal[0]*x+p.normal[2]*z+p.offset)/p.normal[1];return y>=b.min[1]&&y<=b.max[1]?(y===0?0:y):-Infinity;};
 const supportsFootprint=(x,z,radius=.35)=>{
  if(!number(radius,0,2)||!contains(x,z,radius))return false;const [ox,oz]=m.origin,size=m.cellSize;
  for(let ix=Math.floor((x-radius-ox)/size);ix<=Math.floor((x+radius-ox)/size);ix++)for(let iz=Math.floor((z-radius-oz)/size);iz<=Math.floor((z+radius-oz)/size);iz++){
   const dx=Math.max(ox+ix*size-x,0,x-(ox+(ix+1)*size)),dz=Math.max(oz+iz*size-z,0,z-(oz+(iz+1)*size));if(dx*dx+dz*dz<=radius*radius+1e-12&&!accepted.has(key(ix,iz)))return false;
  }return true;
 };
 const inspectPose=(position,options={})=>{
  const c=capsuleOptions(options),no=reason=>({valid:false,reason});if(!c||!vector(position))return no('invalid-capsule-or-position');const [x,y,z]=position;
  if(!contains(x,z,c.radius)||y<b.min[1]||y+c.height>b.max[1])return no('outside-physics-bounds');if(!supportsFootprint(x,z,c.footRadius))return no('whole-footprint-unsupported');
  const floor=heightAt(x,z);if(!Number.isFinite(floor)||(c.allowAirborne?y<floor-c.supportTolerance:Math.abs(y-floor)>c.supportTolerance))return no('unsupported-fixed-plane-height');const nativeGround=colliders.groundHeightAt(x,z,(c.allowAirborne?floor:y)+.45,0);
  if(!Number.isFinite(nativeGround)||Math.abs(nativeGround-floor)>c.supportTolerance)return no('missing-or-off-plane-native-support');
  // A rounded tangent can set native hit=true with zero linear penetration.
  // Conversely cylinder centres/opposing pushes can have zero NET displacement
  // while containing meaningful penetrations. Inspect every native contribution.
  let contactCount=0,meaningfulContact=false,maximumPenetration=0,maximumEpsilon=0;
  const resolved=new Vector3(...position),nativeContact=colliders.resolveCapsule(resolved,c.radius,c.height,c.stepHeight,contact=>{
   contactCount++;const b=contact.collider,extent=contact.type==='box'?Math.max(Math.abs(b.center.x),Math.abs(b.center.z),b.half.x,b.half.z):contact.type==='cylinder'?Math.max(Math.abs(b.x),Math.abs(b.z),b.radius):Infinity;
   const epsilon=Math.min(1e-8,32*Number.EPSILON*Math.max(1,Math.abs(contact.position[0]),Math.abs(contact.position[2]),extent,contact.radius));
   maximumEpsilon=Math.max(maximumEpsilon,epsilon);maximumPenetration=Math.max(maximumPenetration,Math.abs(contact.penetration));
   if(!Number.isFinite(contact.penetration)||!Number.isFinite(extent)||Math.abs(contact.penetration)>epsilon)meaningfulContact=true;
  });
  const displacement=resolved.distanceTo(new Vector3(...position)),netNoiseBudget=Math.min(1e-8,maximumEpsilon*Math.max(1,contactCount)),contactSummary={contactCount,meaningfulContact,maximumPenetration,maximumEpsilon,netNoiseBudget};
  const valid=!meaningfulContact&&(!nativeContact||contactCount>0)&&displacement<=netNoiseBudget;
  return valid?{valid:true,ground:floor,nativeGround,resolvedPosition:resolved.toArray(),displacement,contactSummary}:{valid:false,reason:'native-capsule-contact',ground:floor,nativeGround,resolvedPosition:resolved.toArray(),displacement,contactSummary};
 };
 const clearance=(position,options={})=>inspectPose(position,options).valid;
 const segment=(start,end,options={})=>{
  const c=capsuleOptions(options,true),no=(reason,at)=>({valid:false,reason,...(at?{at}:{})});if(!c||!vector(start)||!vector(end))return no('invalid-segment');
  if(!clearance(start,c)||!clearance(end,c))return no('unsupported-segment-endpoint');const distance=Math.hypot(end[0]-start[0],end[2]-start[2]);if(distance>c.maxLength)return no('segment-length-budget');
  // Vertical sampling also prevents zero-horizontal jumps tunnelling through ceilings.
  const steps=Math.max(1,Math.ceil(Math.max(distance,c.allowAirborne?Math.abs(end[1]-start[1]):0)/c.sampling));if(steps>500)return no('segment-sampling-budget');const points=[[...start]];let previous=start;
  for(let i=1;i<=steps;i++){const t=i/steps,x=start[0]+(end[0]-start[0])*t,z=start[2]+(end[2]-start[2])*t,y=c.allowAirborne?start[1]+(end[1]-start[1])*t:heightAt(x,z),point=[x,y,z];if(!Number.isFinite(y)||!c.allowAirborne&&Math.abs(y-previous[1])>c.maxStep)return no('unsupported-or-excessive-step',point);const check=inspectPose(point,c);if(!check.valid)return no(check.reason,point);points.push(point);previous=point;}
  return {valid:true,points};
 };
 const q=doc.qualification,exitFeet=[q.exitDoor.position[0],q.exitDoor.position[1]-q.exitDoor.height/2,q.exitDoor.position[2]],arrivalAt=amount=>{const x=exitFeet[0]+Math.sin(q.exitDoor.yaw)*amount,z=exitFeet[2]+Math.cos(q.exitDoor.yaw)*amount,y=colliders.groundHeightAt(x,z,exitFeet[1]+.45,0);return [x,y,z];},mappedArrival=arrivalAt(.15),egress=arrivalAt(.4);
 for(const [name,position]of [['spawn',q.spawn.position],['exit',exitFeet],['mapped arrival',mappedArrival],['egress',egress]])assert(clearance(position),'qualified '+name+' failed strict native/mask clearance');
 const endpoint=(a,c)=>Math.hypot(a[0]-c[0],a[2]-c[2])<=1e-6&&Math.abs(a[1]-c[1])<=.08;
 const routeExists=(a,c)=>q.reviewedRoutes.some(route=>endpoint(route[0],a)&&endpoint(route.at(-1),c));
 assert(routeExists(q.spawn.position,exitFeet)&&routeExists(exitFeet,q.spawn.position)&&routeExists(mappedArrival,egress),'missing forward/reverse/mapped-egress route evidence');
 for(const route of q.reviewedRoutes)for(let i=1;i<route.length;i++)assert(segment(route[i-1],route[i]).valid,'reviewed route leaves admitted support or hits native geometry');
 const qualification=freeze(structuredClone(q)),bounds=freeze(structuredClone(b)),transform=freeze(structuredClone(doc.transform));
 return Object.freeze({terrain:Object.freeze({heightAt,supportsFootprint,assertMovementMode:mode=>{if(mode!=='walk')throw Error('Splat scene physics permits walk movement only');return true;}}),colliders,supportsFootprint,clearance,inspectPose,segment,bounds,transform,scaleStatus:doc.scaleStatus,qualification,assetSha256:doc.assetSha256,physicsSha256:scene.physics.sha256,geometrySha256:q.geometrySha256,sourceGeometrySha256:q.sourceGeometrySha256,arrival:freeze({mappedPosition:mappedArrival,egressPosition:egress,exitFeet}),coordinateSpace:'game-world'});
}
