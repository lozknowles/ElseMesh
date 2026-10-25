import { Vector3 } from '../engine/index.js';
import { Navigation, BASE_WALK_SPEED, vector, finiteVector } from './Navigation.js';
import { mapPortalPoint, mapPortalDirection, mapPortalYaw, portalWorldPoint, portalLocalPoint, sweepPortalCapsule } from '../world-runtime/vendor/world-engine-contract.js';

export const CHARACTER_STATES=Object.freeze(['Idle','SelectDestination','Navigate','AvoidObstacle','InspectObject','ApproachPortal','TraversePortal','Recover','ResumeExploration','EgressPortal','VisionTrack']);
const CLIPS={Idle:'Idle',SelectDestination:'Look',Navigate:'Walk',AvoidObstacle:'Turn',InspectObject:'Look',ApproachPortal:'Walk',TraversePortal:'EnterPortal',Recover:'Stop',ResumeExploration:'Look',EgressPortal:'ExitPortal',VisionTrack:'Look'};
const portalValid=p=>p&&typeof p.id==='string'&&Array.isArray(p.position)&&p.position.length===3&&p.position.every(Number.isFinite)&&Number.isFinite(p.yaw)&&Number.isFinite(p.width)&&Number.isFinite(p.height)&&p.enabled===true&&p.traversal?.enabled===true;
/** Renderer-neutral owner simulation. transfer is an NPC adapter, never a player host transition. */
export class AutonomousCharacter {
 constructor({id='microduck',seed=1097,worldId,terrain,colliders,portals=[],position=[0,0,0],authority=true,active=true,canTraverse=()=>false,transfer,config={},restore}={}) {
  this.id=id;this.rng=seed>>>0;this.authority=!!authority;this.active=!!active;this.canTraverse=canTraverse;this.transfer=transfer;this.config={portalCooldown:8,portalProbability:.25,idleMin:.7,idleMax:2.5,...config};
  this.position=vector(position);this.velocity=new Vector3();this.yaw=0;this.state='Idle';this.clip='Idle';this.clipTime=0;this.elapsed=0;this.timer=.2;this.cooldown=0;this.traversalCount=0;this.path=[];this.target=null;this.portal=null;this.pending=false;this.transferStatus=null;this.lastError=null;this._epoch=0;this._visionClock=()=>performance.now();this._visionEpoch=0;this.visionGoal=null;this.visionStatus='disabled';this.arrivalPortalId=null;this.egressTarget=null;this.egressPending=false;this.egressStatus=null;
  this.setContext({worldId,terrain,colliders,portals});
  const ground=this.nav.ground(this.position.x,this.position.z,this.position.y+this.nav.config.height);if(Number.isFinite(ground)){const p=this.position.clone();p.y=ground;const safe=this.nav.surface(p);if(safe)this.position.copy(safe);else this.state='Recover';}else this.state='Recover';
  if(restore)this.restore(restore);
 }
 random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
 setContext({worldId,terrain,colliders,portals=[]}){this._visionEpoch++;this.visionGoal=null;this.worldId=worldId;this.terrain=terrain;this.colliders=colliders;this.portals=portals;this.nav=new Navigation({terrain,colliders,config:this.config,admitSegment:(a,b)=>this.admitMovement(a,b)});}
 setAuthority(value){if(this.authority!==!!value)this._visionEpoch++;this.authority=!!value;if(!this.authority&&this.visionGoal)this.clearVision('fenced');}
 setActive(value){if(this.active!==!!value)this._visionEpoch++;this.active=!!value;if(!this.active&&this.visionGoal)this.clearVision('inactive');}
 transition(state){this.state=state;const next=CLIPS[state]??'Idle';if(next!==this.clip){this.clip=next;this.clipTime=0;}this.timer=(state==='ResumeExploration'||state==='EgressPortal')?.65:state==='AvoidObstacle'?.25:0;}
 // Arrival protection is restricted to this finite aperture, including the capsule radius.
 // An actor initially straddling the plane may leave it in the mapped forward direction.
 admitMovement(from,to){
  if(this.cooldown<=0)return true;const portal=this.portals.find(p=>p.id===this.arrivalPortalId);if(!portalValid(portal))return true;
  const a=portalLocalPoint(portal,from.toArray()),b=portalLocalPoint(portal,to.toArray()),r=this.nav.config.radius,h=this.nav.config.height,depth=r+.02;
  if(this.egressPending&&b[2]>=a[2]-1e-9&&b[2]>=-1e-7)return true;
  const forward=sweepPortalCapsule({portal,previousFeet:from.toArray(),nextFeet:to.toArray(),radius:r,bodyHeight:h}),backward=sweepPortalCapsule({portal,previousFeet:to.toArray(),nextFeet:from.toArray(),radius:r,bodyHeight:h});
  if(forward||backward)return false;
  const samples=Math.max(1,Math.ceil(from.distanceTo(to)/Math.max(.01,r*.5)));if(samples>512)return false;
  for(let i=1;i<=samples;i++){const t=i/samples,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;if(Math.abs(z)<depth&&Math.abs(x)<portal.width/2+r&&y<portal.height/2&&y+h>-portal.height/2)return false;}
  return true;
 }
 validateEgress(nav,position,portal,target){
  if(!portalValid(portal)||!finiteVector(target)||portalLocalPoint(portal,position.toArray())[2]<-1e-7)return null;const local=portalLocalPoint(portal,target.toArray());if(local[2]<Math.max(.4,nav.config.radius+.15)-1e-6||Math.abs(local[0])+nav.config.radius>portal.width/2)return null;
  // Use the unguarded destination physics before any authoritative commit.
  return nav.segment(position,target);
 }
 beginEgress(portalId,target){this.velocity.set(0,0,0);this.arrivalPortalId=portalId;this.egressTarget=vector(target);this.egressPending=true;this.egressStatus='pending';this.portal=null;this.path=[this.egressTarget.clone()];this.target=this.egressTarget.clone();this.transition('EgressPortal');}
 tickEgress(){
  const portal=this.portals.find(p=>p.id===this.arrivalPortalId),raw=new Navigation({terrain:this.terrain,colliders:this.colliders,config:this.config});
  const safe=this.egressTarget&&this.validateEgress(raw,this.position,portal,this.egressTarget);
  if(!safe){this.egressStatus='blocked';this.clip='Stop';this.clipTime=0;this.path=[];return false;}
  if(this.egressStatus==='blocked'){this.path=[safe];this.target=safe.clone();this.timer=.65;this.clip='ExitPortal';this.clipTime=0;this.egressStatus='pending';}
  if(this.timer>0)return false;
  if(this.clip!=='Walk'){this.clip='Walk';this.clipTime=0;}this.egressStatus='walking';if(!this.path.length)this.path=[safe];return true;
 }
 finishEgress(){const portal=this.portals.find(p=>p.id===this.arrivalPortalId);if(!portal||portalLocalPoint(portal,this.position.toArray())[2]<this.nav.config.radius+.02-1e-6){this.egressStatus='blocked';this.clip='Stop';this.velocity.set(0,0,0);return;}this.egressPending=false;this.egressStatus='complete';this.egressTarget=null;this.target=null;this.path=[];this.transition('ResumeExploration');this.timer=0;}
 eligible(portal){if(!portalValid(portal)||portal.width<2*this.nav.config.radius||portal.height<this.nav.config.height||this.cooldown>0||typeof this.transfer!=='function')return false;try{return this.canTraverse(portal)||false;}catch{return false;}}
 chooseDestination(){
  this.path=[];this.portal=null;this.target=null;
  const portalDue=!Number.isFinite(this.config.portalInterval)||this.elapsed>=(this.nextPortalVisit??this.config.portalInterval);
  for(const p of (portalDue&&this.random()<Math.max(0,Math.min(1,this.config.portalProbability))?this.portals.slice(0,16):[])){if(!this.eligible(p))continue;const point=vector(portalWorldPoint(p,[0,-p.height/2,.3]));point.y=this.position.y;if(point.distanceTo(this.position)>this.nav.config.exploreRadius)continue;const path=this.nav.findPath(this.position,point);if(path){this.portal=p;this.path=path;this.target=point;this.transition('ApproachPortal');return;}}
  for(let i=0;i<10;i++){const a=this.random()*Math.PI*2,r=.3+this.random()*(this.nav.config.exploreRadius-.3),goal=this.position.clone().add(new Vector3(Math.sin(a)*r,0,Math.cos(a)*r));if(this.explorationOrigin&&Math.hypot(goal.x-this.explorationOrigin.x,goal.z-this.explorationOrigin.z)>(this.config.wanderRadius??1))continue;const path=this.nav.findPath(this.position,goal);if(path){this.path=path;this.target=path.at(-1).clone();this.transition('Navigate');return;}}
  this.transition('Recover');this.timer=.6;
 }
 update(dt){
  if(!this.active||!this.authority||this.pending||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(dt,this.nav.config.maxDt);while(remaining>1e-8&&!this.pending&&this.active){const step=Math.min(remaining,this.nav.config.substep);remaining-=step;this.tick(step);}
 }
 // Only the owner-local validated pixel pipeline may provide these short-lived bearings.
 observeVision({yaw,radius,width,ttl=.6}={}){
  if(!this.authority||!this.active||this.pending||!Number.isFinite(yaw)||!Number.isFinite(radius)||!Number.isFinite(width)||width<=0||radius<=0||radius>width||!Number.isFinite(ttl))return false;
  this.visionGoal={yaw,radius,width,until:this.elapsed+Math.min(.75,Math.max(.001,ttl)),expiresAt:this._visionClock()+Math.min(.75,Math.max(.001,ttl))*1000};this.visionStatus='detected';return true;
 }
 clearVision(reason='lost'){this.visionGoal=null;this.visionStatus=reason;if(this.state==='VisionTrack'||(this.config.visionHoldOnLoss===true&&!this.pending&&['Idle','SelectDestination','Navigate','InspectObject','ResumeExploration'].includes(this.state))){this.path=[];this.target=null;this.portal=null;this.transition('Idle');this.timer=this.config.visionHoldOnLoss===true?3600:.5;}}
 tickVision(dt){
  if(this.visionGoal&&(this.visionGoal.until<this.elapsed||this._visionClock()>this.visionGoal.expiresAt))this.clearVision('stale');
  const g=this.visionGoal;if(!g)return false;
  if(!['Idle','SelectDestination','Navigate','InspectObject','ResumeExploration','VisionTrack'].includes(this.state))return false;
  if(this.state!=='VisionTrack'){this.path=[];this.target=null;this.portal=null;this.transition('VisionTrack');}
  const delta=Math.atan2(Math.sin(g.yaw-this.yaw),Math.cos(g.yaw-this.yaw));
  this.yaw+=Math.max(-dt*.8,Math.min(dt*.8,delta));this.yaw=Math.atan2(Math.sin(this.yaw),Math.cos(this.yaw));
  if(Math.abs(delta)>.12){this.clip='Turn';return true;}
  // Apparent image size is a stop cue, not a measurement of depth.
  if(g.radius/g.width>=.12){this.clip='Look';this.visionStatus='near';return true;}
  const goal=this.position.clone();goal.x+=Math.sin(this.yaw)*.08;goal.z+=Math.cos(this.yaw)*.08;
  const safe=this.nav.segment(this.position,goal);
  const crossing=this.portals.some(portal=>portalValid(portal)&&(sweepPortalCapsule({portal,previousFeet:this.position.toArray(),nextFeet:goal.toArray(),radius:this.nav.config.radius,bodyHeight:this.nav.config.height})||sweepPortalCapsule({portal,previousFeet:goal.toArray(),nextFeet:this.position.toArray(),radius:this.nav.config.radius,bodyHeight:this.nav.config.height})));
  if(!safe||crossing){this.clip='Stop';this.visionStatus='blocked';return true;}
  this.path=[safe];this.target=safe.clone();this.clip='Walk';this.move(dt);return true;
 }
 tick(dt){
  this.elapsed+=dt;this.clipTime+=dt*(this.clip==='Walk'?Math.max(.01,Math.min(.25,this.nav.config.speed))/BASE_WALK_SPEED:1);this.cooldown=Math.max(0,this.cooldown-dt);this.timer-=dt;this.velocity.set(0,0,0);
  if(this.state==='EgressPortal'){if(this.tickEgress())this.move(dt);return;}
  if(this.tickVision(dt))return;
  if(this.state==='Idle'){if(this.timer<=0)this.transition('SelectDestination');return;}
  if(this.state==='SelectDestination'||this.state==='ResumeExploration'){if(this.timer<=0)this.chooseDestination();return;}
  if(this.state==='AvoidObstacle'){if(this.timer>0)return;this.path=[];this.portal=null;this.transition('Recover');this.timer=.4;return;}
  if(this.state==='Recover'){if(this.timer<=0&&this.nav.surface(this.position)){this.transition('ResumeExploration');}return;}
  if(this.state==='InspectObject'){if(this.timer<=0){this.transition('Idle');this.timer=this.config.idleMin+this.random()*(this.config.idleMax-this.config.idleMin);}return;}
  if(this.state==='Navigate'||this.state==='ApproachPortal'||this.state==='TraversePortal')this.move(dt);
 }
 move(dt){
  const goal=this.path[0];if(!goal){if(this.egressPending){this.finishEgress();return;}if(this.portal&&this.state==='ApproachPortal'){if(!this.eligible(this.portal)){this.portal=null;this.transition('ResumeExploration');return;}const cross=vector(portalWorldPoint(this.portal,[0,-this.portal.height/2,-.15]));cross.y=this.position.y;const safe=this.nav.segment(this.position,cross);if(!safe){this.transition('AvoidObstacle');return;}this.path=[safe];this.transition('TraversePortal');return;}this.transition('InspectObject');this.timer=.8+this.random()*1.8;return;}
  const dx=goal.x-this.position.x,dz=goal.z-this.position.z,distance=Math.hypot(dx,dz);if(distance<.006){this.path.shift();if(this.egressPending&&!this.path.length)this.finishEgress();return;}
  const desiredYaw=Math.atan2(dx,dz),turnRate=this.config.turnRate;
  if(Number.isFinite(turnRate)&&turnRate>0){const delta=Math.atan2(Math.sin(desiredYaw-this.yaw),Math.cos(desiredYaw-this.yaw));this.yaw+=Math.max(-turnRate*dt,Math.min(turnRate*dt,delta));if(Math.abs(delta)>.15){if(this.clip!=='Turn'){this.clip='Turn';this.clipTime=0;}return;}if(this.clip!=='Walk'){this.clip='Walk';this.clipTime=0;}}
  const speed=Math.max(.01,Math.min(.25,this.nav.config.speed)),length=Math.min(distance,speed*dt),previous=this.position.clone(),candidate=this.position.clone();candidate.x+=dx/distance*length;candidate.z+=dz/distance*length;
  const next=this.nav.segment(previous,candidate);if(!next){if(this.egressPending){this.egressStatus='blocked';this.clip='Stop';this.clipTime=0;this.path=[];this.velocity.set(0,0,0);}else this.transition('AvoidObstacle');return;}
  this.position.copy(next);this.velocity.copy(next).sub(previous).multiplyScalar(1/dt);if(!Number.isFinite(turnRate)||turnRate<=0)this.yaw=desiredYaw;
  if(this.portal&&this.state==='TraversePortal'&&sweepPortalCapsule({portal:this.portal,previousFeet:previous.toArray(),nextFeet:next.toArray(),radius:this.nav.config.radius,bodyHeight:this.nav.config.height})){this.beginTransfer(this.portal,previous);return;}
  if(length>=distance-1e-8){this.path.shift();if(this.egressPending&&!this.path.length)this.finishEgress();}
 }
 beginTransfer(portal,previous){
  const eligibility=this.eligible(portal);if(!eligibility){this.position.copy(previous);this.transition('Recover');return;}
  this.pending=true;this.transferStatus='pending';this.transition('TraversePortal');const epoch=++this._epoch,destination=eligibility.destinationPortal;
  const request={previousPosition:previous.toArray(),actorId:this.id,sourceWorldId:this.worldId,portal,sourcePosition:this.position.toArray(),sourceVelocity:this.velocity.toArray(),sourceYaw:this.yaw,snapshot:this.snapshot()};
  if(portalValid(destination)){request.mappedPosition=mapPortalPoint(portal,destination,request.sourcePosition);request.mappedVelocity=mapPortalDirection(portal,destination,request.sourceVelocity);request.mappedYaw=mapPortalYaw(portal,destination,this.yaw);}
  this.transferRequest=request;this.transferPromise=Promise.resolve().then(()=>this.transfer(request)).then(result=>{if(epoch===this._epoch)return this.applyTransfer(result,request,epoch);}).catch(error=>{if(epoch===this._epoch){this.lastError=error.message;this.transferStatus='unknown';this.velocity.set(0,0,0);}});
 }
 async applyTransfer(result,request,epoch=this._epoch){
  if(epoch!==this._epoch)return false;
  if(result?.status==='pending'||result?.status==='unknown'){this.transferStatus=result.status;return false;}
  if(result?.remote===true){if(!result.receipt)throw Error('Remote transfer requires committed receipt');this.active=false;this.pending=false;this.transferStatus='committed';this.traversalCount++;this.cooldown=this.config.portalCooldown;return true;}
  if(result?.status==='cancelled'||result?.cancelled===true){if(request.previousPosition)this.position.fromArray(request.previousPosition);this.pending=false;this.transferStatus='cancelled';this.portal=null;this.path=[];this.cooldown=this.config.portalCooldown;this.transition('Recover');this.timer=.5;return false;}
  const dest=result?.destinationPortal;if(!result?.worldId||!result.terrain||!result.colliders||!portalValid(dest)||dest.id!==request.portal.destination?.portalId||result.worldId!==request.portal.destination?.worldId)throw Error('Invalid NPC destination context');
  const mapped=mapPortalPoint(request.portal,dest,request.sourcePosition),mappedVelocity=mapPortalDirection(request.portal,dest,request.sourceVelocity),mappedYaw=mapPortalYaw(request.portal,dest,request.sourceYaw);
  const arrival=vector(mapped),nav=new Navigation({...result,config:this.config}),safe=nav.surface(arrival);if(!safe)throw Error('NPC destination ground/capsule unavailable');
  const localFeet=portalLocalPoint(dest,safe.toArray()),requested=vector(portalWorldPoint(dest,[localFeet[0],localFeet[1],Math.max(.4,nav.config.radius+.15)])),egress=this.validateEgress(nav,safe,dest,requested);if(!egress)throw Error('NPC destination egress ground/capsule unavailable');
  // The adapter may defer authoritative commit until collision admission succeeds.
  if(result.commit)await result.commit({actorId:this.id,worldId:result.worldId,position:safe.toArray(),velocity:mappedVelocity,yaw:mappedYaw,arrivalPortalId:dest.id,egressTarget:egress.toArray()});
  if(epoch!==this._epoch)return false;
  this.setContext(result);if(result.explorationOrigin)this.explorationOrigin=vector(result.explorationOrigin);this.nextPortalVisit=this.elapsed+(this.config.portalInterval??0);this.position.copy(safe);this.velocity.fromArray(mappedVelocity);this.yaw=mappedYaw;this.traversalCount++;this.cooldown=this.config.portalCooldown;this.pending=false;this.transferStatus='committed';this.portal=null;this.path=[];this.target=null;this.beginEgress(dest.id,egress);return true;
 }
 reconcileTransfer(result){if(!this.pending)return Promise.resolve(false);const epoch=++this._epoch,request=this.transferRequest??{actorId:this.id,sourceWorldId:this.worldId,portal:this.portal,sourcePosition:this.position.toArray(),sourceVelocity:this.velocity.toArray(),sourceYaw:this.yaw};return this.applyTransfer(result,request,epoch).catch(error=>{if(epoch===this._epoch){this.lastError=error.message;this.transferStatus='unknown';}return false;});}
 snapshot(){return {visionStatus:this.visionStatus,id:this.id,worldId:this.worldId,position:this.position.toArray(),velocity:this.velocity.toArray(),yaw:this.yaw,behavior:this.state,state:this.state,clip:this.clip,clipTime:this.clipTime,elapsed:this.elapsed,timer:this.timer,rng:this.rng,cooldown:this.cooldown,traversalCount:this.traversalCount,target:this.target?.toArray()??null,path:this.path.map(p=>p.toArray()),portalId:this.portal?.id??null,nearestPortal:this.portals.filter(p=>this.eligible(p)).sort((a,b)=>vector(a.position).distanceToSquared(this.position)-vector(b.position).distanceToSquared(this.position))[0]?.id??null,pending:this.pending,transferStatus:this.transferStatus,active:this.active,arrivalPortalId:this.arrivalPortalId,egressTarget:this.egressTarget?.toArray()??null,egressPending:this.egressPending,egressStatus:this.egressStatus};}
 restore(s){if(this.terrain?.supportsFootprint&&!this.terrain.supportsFootprint(s.position?.[0],s.position?.[2],this.nav.config.radius))throw Error('NPC restore outside reviewed splat support');this._visionEpoch++;this.visionGoal=null;this.visionStatus=s.visionStatus==='disabled'?'disabled':'awaiting-frame';if(s.id!==this.id||s.worldId!==this.worldId||!finiteVector(vector(s.position)))throw Error('NPC snapshot identity or pose mismatch');this._epoch++;this.transferRequest=null;this.position.fromArray(s.position);this.velocity.copy(vector(s.velocity));this.yaw=Number.isFinite(s.yaw)?s.yaw:0;this.rng=Number.isSafeInteger(s.rng)?s.rng>>>0:this.rng;this.state=CHARACTER_STATES.includes(s.state)&&s.state!=='VisionTrack'?s.state:'Recover';this.clip=this.state==='EgressPortal'&&['ExitPortal','Walk','Stop'].includes(s.clip)?s.clip:CLIPS[this.state];this.clipTime=Math.max(0,s.clipTime||0);this.elapsed=Math.max(0,s.elapsed||0);this.timer=Number.isFinite(s.timer)?s.timer:0;this.cooldown=Math.max(0,s.cooldown||0);this.traversalCount=Math.max(0,s.traversalCount||0);this.target=s.target?vector(s.target):null;this.path=(s.path??[]).slice(0,900).map(vector);this.portal=this.portals.find(p=>p.id===s.portalId)??null;this.pending=!!s.pending;this.transferStatus=s.transferStatus??null;this.active=s.active!==false;this.arrivalPortalId=typeof s.arrivalPortalId==='string'?s.arrivalPortalId:null;this.egressTarget=s.egressTarget?vector(s.egressTarget):null;this.egressPending=s.egressPending===true||!!this.egressTarget;this.egressStatus=s.egressStatus??(this.egressPending?'pending':null);if(this.egressPending){this.state='EgressPortal';if(!['ExitPortal','Walk','Stop'].includes(this.clip))this.clip='ExitPortal';this.path=this.egressTarget?[this.egressTarget.clone()]:[];this.target=this.egressTarget?.clone()??null;}if(!this.pending&&!this.egressPending&&!this.nav.surface(this.position)){this.state='Recover';this.clip=CLIPS.Recover;this.path=[];this.target=null;}}
}
