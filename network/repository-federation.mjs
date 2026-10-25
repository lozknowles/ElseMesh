import {PORTAL_PRESENTATION_PROTOCOL,PORTAL_PRESENTATION_LIFETIME_MS} from './portal-presentation.mjs';
import {DEFAULT_APPEARANCE,validateAppearance} from '../src/player/AvatarAppearance.js';
import { randomUUID } from 'node:crypto';
import { assetId, canonical, signObject } from './identity.mjs';
import { verifyRegionVersion, validatePortal, createPortalInvitation, acceptPortalInvitation, verifyPortalInvitation, createPortalHandoffV2, acceptPortalHandoffV2, FEDERATION_CAPABILITIES, negotiateRules } from './federation.mjs';
import { ReplayGuard } from './protocol.mjs';
import { portalLocalPoint, mapPortalPoint, mapPortalDirection, mapPortalYaw } from '../src/world-runtime/vendor/world-engine-contract.js';
const check=(ok,text)=>{if(!ok)throw Error(text);};
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<1e6);
const gaze=p=>{if(p.pitch===undefined)return {};check(Number.isFinite(p.pitch)&&Math.abs(p.pitch)<=1.5,'Invalid player pitch');return {pitch:p.pitch};};
const allow=(policy,nodeId)=>policy==='PUBLIC'||Array.isArray(policy)&&policy.includes(nodeId);
export const repositoryPlayerId=nodeId=>'player:'+nodeId.slice('elsemesh-node:'.length);
export const challengePayload=(nonce,expiresAt)=>({protocol:'elsemesh.repository-auth/1',nonce,expiresAt,path:'/__worlds'});
const signedDegrees=radians=>Math.atan2(Math.sin(radians),Math.cos(radians))*180/Math.PI;
export function repositoryFederationPortal(source,destination,authored,exit){return validatePortal({protocol:'elsemesh.portal/1',portalId:authored.id,sourceRegion:source.federationRegionId,destinationRegion:destination.federationRegionId,visual:'DOOR',entry:{position:authored.position,yaw:signedDegrees(authored.yaw+Math.PI)},exit:{position:exit.position,yaw:signedDegrees(exit.yaw)},enabled:authored.enabled&&authored.traversal?.enabled!==false,requiredCapabilities:['elsemesh.handoff/2'],access:{mode:'PUBLIC',allowPlayers:[]},handoffPolicy:'SIGNED',revision:source.region.version});}
export const portalLocal=(point,portal)=>portalLocalPoint(portal,point);
export const mapPortalMotion=(point,velocity,source,destination)=>({position:mapPortalPoint(source,destination,point),velocity:mapPortalDirection(source,destination,velocity)});
/** One bounded coordinator, not a distributed authority or failover service. */
export class RepositoryFederation {
 constructor({worlds,players={},defaultWorldId},identity,{now=Date.now}={}){
  this.identity=identity;this.now=now;this.players=players;this.defaultWorldId=defaultWorldId;this.worlds=new Map();this.members=new Map();this.reservations=new Map();this.portals=new Map();this.replay=new ReplayGuard();
  check(Array.isArray(worlds)&&worlds.length>=1&&worlds.length<=2,'Configure one or two worlds');
  for(const world of worlds){
   check(typeof world.worldId==='string'&&!this.worlds.has(world.worldId),'Duplicate world');
   const region=verifyRegionVersion(world.published,new Set([world.ownerNodeId]));
   check(region.worldId===world.federationWorldId&&region.regionId===world.federationRegionId&&region.ownerNodeId===world.ownerNodeId,'Published region binding mismatch');
   check(region.authority.nodeId===identity.nodeId,'Coordinator is not region authority');
   check(typeof world.contentDigest==='string'&&/^[a-f0-9]{64}$/.test(world.contentDigest.replace(/^sha256:/,'')),'Missing validated content digest');
   check(['PUBLIC'].includes(world.policies?.view)||Array.isArray(world.policies?.view),'Missing VIEW policy');check(['PUBLIC'].includes(world.policies?.enter)||Array.isArray(world.policies?.enter),'Missing ENTER policy');
   this.worlds.set(world.worldId,{...world,region,capacity:world.capacity??16});
  }
  for(const source of this.worlds.values())for(const authored of source.portals??[]){
   const destination=this.worlds.get(authored.destination?.worldId),exit=destination?.portals?.find(p=>p.id===authored.destination.portalId);
   check(destination&&destination.regionId===authored.destination.regionId&&exit,'Unresolved authored portal');
   check(vector(authored.position)&&Number.isFinite(authored.yaw)&&authored.width>0&&authored.height>0,'Invalid portal aperture');
   const portal=repositoryFederationPortal(source,destination,authored,exit);
   check(source.region.portals.includes(portal.portalId),'Portal absent from published region');
   check(authored.invitation&&authored.acceptance,'Both owner-approved portal invitation and acceptance required');
   const signedPortal=verifyPortalInvitation(authored.invitation,authored.acceptance,{sourceRegion:source.region,destinationRegion:destination.region,trustedOwners:new Set([source.ownerNodeId,destination.ownerNodeId]),now:this.now()});
   check(canonical(signedPortal)===canonical(portal),'Authored portal disagrees with owner approval');
   this.portals.set(source.worldId+':'+authored.id,{source,destination,authored,exit,portal});
  }
 }
 world(id){const w=this.worlds.get(id);check(w,'Unknown world');return w;}
 authorize(nodeId,worldId,action){const world=this.world(worldId);check(!world.binding||world.binding.expiresAt>this.now(),'Content admission expired');check(allow(world.policies[action],nodeId),action.toUpperCase()+' denied');return world;}
 attach(nodeId,capabilities=FEDERATION_CAPABILITIES){
  check(this.players[nodeId],'Identity pending operator enrolment');const existing=this.members.get(nodeId);if(existing){check(existing.disconnectedAt,'Identity already connected');delete existing.disconnectedAt;existing.at=this.now();return existing;}
  const worldId=this.players[nodeId]?.defaultWorldId??this.defaultWorldId,world=this.authorize(nodeId,worldId,'enter');this.authorize(nodeId,worldId,'view');check(negotiateRules(world.region.rules,capabilities).accepted,'Unsupported destination rules');
  check(this.count(worldId)<world.capacity,'World full');
  const state={nodeId,playerId:repositoryPlayerId(nodeId),label:this.players[nodeId]?.label??'Visitor',sessionId:'elsemesh-session:'+randomUUID(),worldId,generation:0,sequence:-1,position:[...(world.spawn??[0,2,0])],velocity:[0,0,0],yaw:0,at:this.now(),capabilities:[...capabilities],views:new Set([worldId]),appearance:{...DEFAULT_APPEARANCE},crossing:null};this.members.set(nodeId,state);return state;
 }
 detach(nodeId){const s=this.members.get(nodeId);if(s)s.disconnectedAt=this.now();}
 count(worldId){return [...this.members.values()].filter(s=>s.worldId===worldId).length;}
 subscribe(nodeId,worldId,portalId){const state=this.members.get(nodeId);check(state,'Not authenticated');this.authorize(nodeId,worldId,'view');
  if(worldId!==state.worldId){const edge=this.portals.get(state.worldId+':'+portalId);check(edge&&edge.destination.worldId===worldId&&edge.authored.enabled&&edge.authored.view?.enabled!==false,'Preview portal denied');check(Math.hypot(...portalLocal(state.position,edge.authored))<=(edge.authored.view?.maxDistance??30),'Preview out of range');}
  check(state.views.has(worldId)||state.views.size<4,'Too many views');state.views.add(worldId);return this.describe(worldId);
 }
 describe(worldId){const w=this.world(worldId);return {worldId,regionId:w.regionId,contentDigest:w.contentDigest,commit:w.commit,epoch:w.region.authority.epoch,published:w.published,binding:w.binding,portals:w.portals,capacity:w.capacity};}
 update(nodeId,packet){const s=this.members.get(nodeId),now=this.now();check(s&&packet.worldId===s.worldId&&packet.generation===s.generation,'Stale membership');check(Number.isSafeInteger(packet.sequence)&&packet.sequence>s.sequence&&Number.isFinite(packet.timestamp)&&Math.abs(now-packet.timestamp)<5000,'Stale state');check(vector(packet.position)&&vector(packet.velocity??[0,0,0])&&Number.isFinite(packet.yaw??0),'Invalid state');
  const acceptedGaze=gaze(packet);if(packet.appearance!==undefined)validateAppearance(packet.appearance);
  check(![...this.reservations.values()].some(r=>r.nodeId===nodeId&&r.state==='prepared'),'Transfer pending');
  const dt=Math.min(Math.max((now-s.at)/1000,0),.25);check(Math.hypot(...packet.position.map((v,i)=>v-s.position[i]))<=.35+12*dt,'Movement exceeds accepted speed');check(Math.hypot(...(packet.velocity??[0,0,0]))<=16,'Velocity exceeds limit');
  if(s.crossing&&now-s.crossing.at>=1200)s.crossing=null;
  for(const edge of this.portals.values())if(edge.source.worldId===s.worldId){const a=portalLocal(s.position,edge.authored),b=portalLocal(packet.position,edge.authored);if(a[2]>=0&&b[2]<0){const t=a[2]/(a[2]-b[2]),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;const radius=.3;if(Math.abs(x)<edge.authored.width/2-radius&&Math.abs(y+.9)<=edge.authored.height/2-.9+1e-5&&Math.abs(b[2])<1)s.crossing={portalId:edge.authored.id,at:now,sequence:packet.sequence};}}
  delete s.pitch;Object.assign(s,{...acceptedGaze,position:[...packet.position],velocity:[...(packet.velocity??[0,0,0])],yaw:packet.yaw??0,sequence:packet.sequence,at:now,...packet.appearance!==undefined?{appearance:{...packet.appearance}}:{}});return this.presence(s.worldId);
 }
 presence(worldId){const w=this.world(worldId);return [...this.members.values()].filter(s=>s.worldId===worldId&&!s.disconnectedAt).map(({nodeId,playerId,label,position,velocity,yaw,pitch,sessionId,sequence,at,generation,appearance,presentation})=>({nodeId,playerId,label,position,velocity,yaw,sequence,timestamp:at,generation,appearance:{...appearance},...(presentation&&presentation.expiresAt>this.now()?{presentation}:{})}));}
 prepare(nodeId,portalId){this.expire();check(this.reservations.size<1024,'Reservation capacity exhausted');const s=this.members.get(nodeId),edge=this.portals.get(s?.worldId+':'+portalId),now=this.now();check(s&&edge&&s.crossing?.portalId===portalId&&now-s.crossing.at<1200,'No validated front-to-back crossing');check(![...this.reservations.values()].some(r=>r.nodeId===nodeId&&r.state==='prepared'),'Transfer already pending');
  const d=this.authorize(nodeId,edge.destination.worldId,'enter');this.authorize(nodeId,d.worldId,'view');check(edge.portal.enabled&&edge.authored.invitation.expiresAt>now,'Portal disabled or owner approval expired');check(negotiateRules(d.region.rules,s.capabilities).accepted,'Unsupported destination rules');check(this.count(d.worldId)+[...this.reservations.values()].filter(r=>r.destinationWorldId===d.worldId&&r.state==='prepared').length<d.capacity,'Destination full');
  check(edge.exit.width>.6&&edge.exit.height>1.8,'Destination aperture has no avatar clearance');
  const motion=mapPortalMotion(s.position,s.velocity,edge.authored,edge.exit);check(!d.clearance||d.clearance(motion.position),'Destination collision clearance failed');const reservationId=randomUUID(),destinationSessionId='elsemesh-session:'+reservationId;const handoff=createPortalHandoffV2(this.identity,{portal:edge.portal,playerId:s.playerId,playerNodeId:s.nodeId,destinationAuthority:this.identity.nodeId,destinationSessionId,sessionId:s.sessionId,sequence:s.sequence,authorityEpoch:edge.source.region.authority.epoch,avatarAssetId:assetId(Buffer.from('repository-avatar/1')),inventoryHash:assetId(Buffer.from('empty')),position:s.position,velocity:s.velocity,yaw:signedDegrees(s.yaw),pitch:(s.pitch??0)*180/Math.PI,controlMode:'HUMAN'});
  acceptPortalHandoffV2(handoff,{portal:edge.portal,sourceAuthority:this.identity.nodeId,sourceEpoch:edge.source.region.authority.epoch,destinationAuthority:this.identity.nodeId,destinationSessionId,playerNodeId:s.nodeId,destinationAdmission:({handoff:h})=>({accepted:!!this.authorize(s.nodeId,d.worldId,'enter'),playerId:s.playerId,playerNodeId:s.nodeId,sessionId:s.sessionId,destinationSessionId,destinationRegion:d.federationRegionId}),destinationRules:d.region.rules,supportedCapabilities:s.capabilities,trustedAuthorities:new Set([this.identity.nodeId]),replay:this.replay,now});
  const r={id:reservationId,destinationSessionId,nodeId,state:'prepared',sourceWorldId:s.worldId,destinationWorldId:d.worldId,sourceGeneration:s.generation,contentDigest:d.contentDigest,epoch:d.region.authority.epoch,expiresAt:now+15000,position:motion.position,velocity:motion.velocity,yaw:mapPortalYaw(edge.authored,edge.exit,s.yaw),...gaze(s),handoff,ready:false,fenced:false};this.reservations.set(r.id,r);s.crossing=null;s.views.add(d.worldId);return structuredClone(r);
 }
 acceptedPose(nodeId,packet){this.update(nodeId,packet);const s=this.members.get(nodeId),w=this.world(s.worldId);return signObject({type:'pose-accepted',protocol:'elsemesh.world-wss/2',worldId:w.federationWorldId,regionId:w.federationRegionId,authoredWorldId:s.worldId,sessionId:s.sessionId,authorityEpoch:w.region.authority.epoch,sequence:s.sequence,generation:s.generation,playerNodeId:s.nodeId,position:[...s.position],velocity:[...s.velocity],yaw:s.yaw,...gaze(s),appearance:{...s.appearance},portalCrossings:s.crossing?[s.crossing.portalId]:[]},this.identity);}
 issue(nodeId,id){const r=this.status(nodeId,id);check(r.state==='prepared'&&r.ready,'Destination resources not ready');this.reservations.get(id).fenced=true;return this.status(nodeId,id);}
 expire(){const now=this.now();for(const [node,s] of this.members)if(s.disconnectedAt&&now-s.disconnectedAt>30000)this.members.delete(node);for(const [id,r] of this.reservations){if(r.state==='prepared'&&now>=r.expiresAt)r.state='expired';if(now>r.expiresAt+60000)this.reservations.delete(id);}}
 status(nodeId,id){this.expire();const r=this.reservations.get(id);check(r?.nodeId===nodeId,'Unknown reservation');return structuredClone(r);}
 ready(nodeId,id,digest,epoch){const r=this.status(nodeId,id);check(r.state==='prepared'&&r.contentDigest===digest&&r.epoch===epoch,'Resources incompatible or reservation expired');this.reservations.get(id).ready=true;return this.status(nodeId,id);}
 commit(nodeId,id){const r=this.status(nodeId,id);if(r.state==='committed')return r;const s=this.members.get(nodeId),d=this.authorize(nodeId,r.destinationWorldId,'enter');this.authorize(nodeId,d.worldId,'view');check(this.portals.get(r.sourceWorldId+':'+r.handoff.portalId)?.authored.invitation.expiresAt>this.now(),'Portal owner approval expired');check(r.state==='prepared'&&r.ready&&r.fenced&&s&&s.worldId===r.sourceWorldId&&s.generation===r.sourceGeneration,'Reservation is not committable');check(d.contentDigest===r.contentDigest&&d.region.authority.epoch===r.epoch&&this.count(d.worldId)<d.capacity,'Destination changed/full');
  const committedAt=this.now(),presentation=Object.freeze(signObject({protocol:PORTAL_PRESENTATION_PROTOCOL,type:'portal-arrival',transferId:r.id,playerNodeId:s.nodeId,playerId:s.playerId,sourceWorldId:r.sourceWorldId,destinationWorldId:d.worldId,destinationGeneration:s.generation+1,authorityEpoch:d.region.authority.epoch,committedAt,expiresAt:committedAt+PORTAL_PRESENTATION_LIFETIME_MS},this.identity));
  Object.assign(s,{worldId:d.worldId,sessionId:r.destinationSessionId,generation:s.generation+1,position:r.position,velocity:r.velocity,yaw:r.yaw,...gaze(r),sequence:-1,at:committedAt,crossing:null,views:new Set([d.worldId]),presentation});Object.assign(this.reservations.get(id),{state:'committed',generation:s.generation,presentation});return this.status(nodeId,id);
 }
}
export function approveRepositoryPortal(sourceOwner,destinationOwner,portal){const invitation=createPortalInvitation(sourceOwner,portal,Date.now()+86400000);return {invitation,acceptance:acceptPortalInvitation(destinationOwner,invitation,new Set([sourceOwner.nodeId]))};}
