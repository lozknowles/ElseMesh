import {repositoryPeerFacing} from '../player/AvatarFacing.js';
import {ResidentRepositoryWorlds} from './ResidentRepositoryWorlds.js';
import {loadAppearance} from '../player/AvatarAppearance.js';
import {createRepositoryPortalTransition} from './RepositoryPortalTransition.js';
import * as N from '../engine/index.js';
import {Material} from '../engine/render/Material.js';
import {ReadiedRepositoryAvatar} from './NativeRepositoryReadiness.js';
import {PortalTransport} from './PortalTransport.js';
import {OwnerWorldTransport} from './OwnerWorldTransport.js';
import {PortalViews} from './PortalViews.js';
import {buildRepositoryScene,disposeRepositoryScene} from './RepositoryScene.js';
import {verifyRuntimeSignature} from './RepositorySession.js';
import {loadWorldSource,describeRuntimeWorld,canonical,repositoryDigest,admitFederatedRuntimeWorld,portalLocalPoint,portalWorldPoint,sweepPortalCapsule} from './vendor/world-engine-contract.js';
const encoder=new TextEncoder();

const boatStub=()=>({model:{wheelPivot:{position:new N.Vector3()},lines:{deckY:0},group:new N.Group()},getYaw:()=>0});
export class RepositoryPeerLayer{
 constructor(scene,ownNodeId,prepareResources,createAvatar=(scene)=>new ReadiedRepositoryAvatar(scene,boatStub(),{prepareResources})){Object.assign(this,{createAvatar,prepareResources,ownNodeId});this.group=new N.Group();scene.add(this.group);this.avatars=new Map();this.profileWarms=new Map();this.avatarLimit=32;this.packet={players:[]};this.at=0;this.disposed=false;}
 get pendingPrewarms(){return [...this.profileWarms.values()].filter(w=>!w.done).length;}
 accept(packet){if(!this.disposed){this.packet=packet;this.at=performance.now();}}
 ensureAvatar(pose){if(this.disposed||pose.nodeId===this.ownNodeId)return null;let a=this.avatars.get(pose.nodeId);if(!a){if(this.avatars.size>=this.avatarLimit){const dormant=[...this.avatars].filter(([id])=>!this.packet.players.some(p=>p.nodeId===id)).sort((a,b)=>(a[1].lastPresenceAt??0)-(b[1].lastPresenceAt??0))[0];if(!dormant)return null;dormant[1].dispose();this.avatars.delete(dormant[0]);this.profileWarms.delete(dormant[0]);}a=this.createAvatar(this.group);a.group.userData.remotePlayerId=pose.playerId;a.group.visible=false;this.avatars.set(pose.nodeId,a);}return a;}
 prewarmKnownProfiles(poses){return Promise.all(poses.filter(p=>p.nodeId!==this.ownNodeId).map(p=>{const key=JSON.stringify(p.appearance??{}),old=this.profileWarms.get(p.nodeId);if(old?.key===key)return old.promise;const a=this.ensureAvatar(p);if(!a)return false;const w={key,done:false};w.promise=Promise.resolve().then(()=>p.appearance?a.setAppearance(p.appearance):a.ready).then(()=>a.ready).then(()=>{if(!this.packet.players.some(q=>q.nodeId===p.nodeId))a.group.visible=false;return true;}).finally(()=>w.done=true);this.profileWarms.set(p.nodeId,w);return w.promise;}));}
 update(dt,player,camera){if(this.disposed)return;const keep=new Set();for(const pose of this.packet.players){if(pose.nodeId===this.ownNodeId)continue;keep.add(pose.nodeId);const a=this.ensureAvatar(pose);if(!a)continue;a.lastPresenceAt=performance.now();if(pose.appearance)a.setAppearance(pose.appearance)?.catch(error=>console.warn('Remote avatar:',error));a.cinematic={x:pose.position[0],y:pose.position[1],z:pose.position[2],yaw:repositoryPeerFacing(a,pose,this.packet.worldId),walk:Math.hypot(...(pose.velocity??[0,0,0]))>.1,mode:'walk'};a.update(dt,player,camera,true);a.group.visible=a.group.visible&&performance.now()-this.at<3000;}for(const [id,a]of this.avatars)if(!keep.has(id))a.group.visible=false;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const a of this.avatars.values())a.dispose();this.avatars.clear();this.profileWarms.clear();this.group.removeFromParent();}
}

function addFrame(root,portal){const group=new N.Group(),material=new Material({name:'portal-frame',color:portal.visual.frameColor,emissive:portal.visual.frameColor,roughness:.25});group.position.fromArray(portal.position);group.rotation.y=portal.yaw;for(const [w,h,x,y]of [[.12,portal.height+.24,-portal.width/2-.06,0],[.12,portal.height+.24,portal.width/2+.06,0],[portal.width,.12,0,portal.height/2+.06],[portal.width,.12,0,-portal.height/2-.06]]){const mesh=new N.Mesh(new N.BoxGeometry(w,h,.15),material);mesh.position.set(x,y,0);group.add(mesh);}root.add(group);}
/** One authenticated membership with independent authorized preview subscriptions. */
export class RepositoryPortalRuntime{
 constructor({engine,host,input,onStatus=()=>{},onChange=()=>{},onPresence=()=>{},onActivated=()=>{},portalEffects,getAppearance=loadAppearance,views,background,buildScene=buildRepositoryScene,disposeCandidate=disposeRepositoryScene,createPeerLayer=(scene,id)=>new RepositoryPeerLayer(scene,id,engine.prepareRepositoryResources),addPortalFrame=addFrame}){this.engine=engine;this.host=host;this.input=input;this.onStatus=onStatus;this.onChange=onChange;this.onPresence=onPresence;this.onActivated=onActivated;this.portalEffects=portalEffects;this.getAppearance=getAppearance;this.buildScene=buildScene;this.disposeCandidate=disposeCandidate;this.createPeerLayer=createPeerLayer;this.addPortalFrame=addPortalFrame;this.views=views??new PortalViews({engine,meshRenderer:engine.meshRenderer,mainCamera:engine.camera,prepareResources:engine.prepareRepositoryResources,background});this.transportEvents={status:s=>{this.onStatus(s);if(s==='Disconnected')for(const id of this.views.entries.keys())this.views.setState(id,'unavailable');},presence:p=>this.receivePresence(p),membership:m=>{this.membership=m;},error:e=>this.onStatus(e),worldStatus:s=>this.destinationStatus(s),stateCorrection:c=>this.applyMotionCorrection(c)};this.motionCorrections=0;this.authorityOffline=false;this.offlineWorlds=new Set();this.transport=new PortalTransport(this.transportEvents);this.loaded=new Map();this.descriptors=new Map();this.presence=new Map();this.previewLayers=new Map();this.previewRecords=new Map();this.epoch=0;this.pending=false;this.rearm=null;this.lastPosition=null;this.activeLayer=null;this.connected=false;this.portalErrors=new Map();
 this.residents=new ResidentRepositoryWorlds({renderer:engine.backend??'native:1',dispose:candidate=>this.disposeGraphics(candidate),readinessFingerprint:engine.repositoryReadinessSignature});
 this.host.acquireResources=loaded=>{if(!this.connected)return null;const descriptor=this.descriptors.get(loaded.identity.worldId);return descriptor?this.residents.borrow(loaded,descriptor,{allowActive:!!this.connecting}):null;};
 this.host.registerResources=async prepared=>{if(!this.connected)return null;const descriptor=this.descriptors.get(prepared.identity.worldId);if(!descriptor)return null;await this.finishCandidate(prepared);this.residents.register(prepared.loaded,descriptor,prepared);return this.residents.borrow(prepared.loaded,descriptor);};
 this.host.retainResources=active=>!!active&&[...this.residents.records.values()].some(r=>r.candidate.root===active.root);
 }
 disposeGraphics(candidate){if(candidate?.root)this.portalEffects?.removeRoot(candidate.root);this.disposeCandidate(candidate);}
 async connect(config){if(this.connectionPending||this.sourceLoading)throw Error('Wait for the current world connection or source operation to finish.');this.connectionPending=true;try{if(this.pending)throw Error('A world transfer is in progress.');this.input.suspend();this.config=config;this.connected=false;if(config.protocol==='elsemesh.owner-runtime/1'&&!(this.transport instanceof OwnerWorldTransport)){this.transport.disconnect();this.transport=new OwnerWorldTransport({config,...this.transportEvents});}else if(config.protocol!=='elsemesh.owner-runtime/1'&&this.transport instanceof OwnerWorldTransport){this.transport.disconnect();this.transport=new PortalTransport(this.transportEvents);}const welcome=await this.transport.connect();this.membership=welcome;this.connected=true;this.descriptors.set(welcome.worldId,welcome.world);this.onStatus('Loading pinned opening world…');const loaded=await this.load(welcome.world),pose={position:welcome.position,velocity:welcome.velocity,yaw:welcome.yaw??loaded.project.spawn.yaw};this.connecting=true;let prepared;try{prepared=await this.host.prepare(loaded,{pose});}finally{this.connecting=false;}if(!prepared)throw Error('Opening world selection changed.');await this.host.activatePrepared(prepared);await this.activateLocal();this.authorityOffline=!!this.transport.frozen;if(!this.authorityOffline)this.input.resume();this.onStatus(welcome.label+' · '+loaded.project.metadata.name);return welcome;}finally{this.connectionPending=false;}}
 async verify(loaded,descriptor){const trust=new Set(this.config.trustedOwners),[binding,region]=await Promise.all([verifyRuntimeSignature(descriptor.binding,trust),verifyRuntimeSignature(descriptor.published,trust)]);if(!binding||!region)throw Error('Untrusted destination owner signature.');const raw=descriptor.published.descriptor;const digest=await repositoryDigest(encoder.encode(canonical(raw)));if(descriptor.published.manifestHash!=='sha256:'+digest)throw Error('Destination region hash mismatch.');admitFederatedRuntimeWorld(loaded.project,loaded.identity.contentDigest,descriptor.binding,descriptor.published,{verifyBinding:()=>binding,verifyRegion:()=>raw});if(descriptor.worldId!==loaded.identity.worldId||descriptor.regionId!==loaded.project.metadata.regionId||descriptor.contentDigest!==loaded.identity.contentDigest)throw Error('Destination content identity mismatch.');}
 async load(descriptor){let loaded=this.loaded.get(descriptor.worldId);if(!loaded||loaded.identity.contentDigest!==descriptor.contentDigest){loaded=await loadWorldSource(this.transport.source(descriptor.worldId));await this.verify(loaded,descriptor);this.loaded.set(descriptor.worldId,loaded);}else await this.verify(loaded,descriptor);this.descriptors.set(descriptor.worldId,descriptor);return loaded;}
 applyMotionCorrection(correction){
  const active=this.host.active,t=this.transport;
  if(!this.connected||this.pending||this.authorityOffline||t.closed||t.frozen||!active||
     correction.authoredWorldId!==active.identity.worldId||correction.authoredWorldId!==t.worldId||
     correction.playerNodeId!==t.identity?.nodeId||correction.sessionId!==t.membership?.sessionId||correction.generation!==t.generation)return false;
  if(!this.host.correctPosition(correction.position))return false;
  this.lastPosition=active.player.position.toArray();this.motionCorrections++;this.onStatus('Movement blocked; position corrected.');return true;
 }
 destinationStatus({worldId,status}){
  if(!this.connected||typeof worldId!=='string')return;
  if(status==='offline'){
   this.offlineWorlds.add(worldId);this.presence.delete(worldId);
   for(const [id,record]of this.previewRecords)if(record.worldId===worldId){this.views.setState(id,'unavailable');this.previewLayers.get(id)?.accept({worldId,players:[]});}
   if(worldId===this.transport.worldId){this.authorityOffline=true;this.input.suspend();this.onStatus('World owner unavailable; movement paused.');}
  }else if(status==='live'){
   const recovered=this.offlineWorlds.delete(worldId);
   if(recovered&&worldId!==this.transport.worldId&&!this.authorityOffline&&!this.pending&&!this.transport.frozen)this.onStatus('World connection restored.');
   for(const [id,record]of this.previewRecords)if(record.worldId===worldId){const entry=this.views.entries.get(id);if(record.loaded&&entry?.candidate&&!entry.preparing&&!entry.readinessError)this.views.setState(id,'live');else if(record.error)record.retryAt=Math.max(1,performance.now()-1);}
   if(worldId===this.transport.worldId&&this.authorityOffline){if(this.pending||this.transport.frozen){this.onStatus('World owner available. Reconnect to resume, or Recover transfer if one is unresolved.');return;}this.authorityOffline=false;this.input.resume();this.onStatus('World owner reconnected.');}
  }
 }
 receivePresence(packet){this.presence.set(packet.worldId,packet);if(packet.worldId===this.host.active?.identity.worldId)this.activeLayer?.accept(packet);for(const [id,record]of this.previewRecords)if(record.worldId===packet.worldId)this.previewLayers.get(id)?.accept(packet);this.onPresence(packet);}
 clearViews(){const active=this.residents.active;if(active){if(this.views.entries.size)active.viewEntries=this.views.park();if(this.activeLayer)active.peerLayer=this.activeLayer;active.peerLayer?.group?.removeFromParent();}else{this.views.clear();this.activeLayer?.dispose();}for(const layer of this.previewLayers.values())layer.group?.removeFromParent();this.previewLayers.clear();this.previewRecords.clear();this.activeLayer=null;}
 async finishCandidate(candidate){
  if(candidate.root.userData.repositoryPortalFramesReady)return;
  for(const portal of (candidate.descriptor.project.portals??[]).slice(0,2))this.addPortalFrame(candidate.root,portal);
  candidate.root.userData.repositoryPortalFramesReady=true;await this.engine.prepareRepositoryResources?.(candidate.root);
 }
 async preparePackageViews(record){
  if(record.viewEntries)return;const stage=this.views.fork?.();if(!stage)return;
  try{for(const portal of (record.candidate.descriptor.project.portals??[]).slice(0,2)){
   const aperture=stage.setDestination(portal.id,{source:portal,authorizedView:false,state:portal.enabled?'loading':'unavailable'});record.candidate.root.add(aperture);
  }await Promise.all([...stage.entries.keys()].map(id=>stage.whenReady?.(id)));record.viewEntries=stage.park();record.disposeViews=()=>stage.disposeEntries(record.viewEntries??new Map());this.residents.markReady(record);}
  catch(error){stage.dispose();throw error;}
 }
 async activateLocal(){
  const active=this.host.active,previous=this.views.active,oldRecord=[...this.residents.records.values()].find(r=>r.candidate.root===previous?.root);
  this.epoch++;
  if(oldRecord){oldRecord.viewEntries=this.views.park();oldRecord.peerLayer=this.activeLayer;oldRecord.peerLayer?.group?.removeFromParent();}
  else{this.views.clear();this.activeLayer?.dispose();}
  this.previewLayers.clear();this.previewRecords.clear();this.residents.unlinkPreviews();
  const destinations=new Set((active.project.portals??[]).slice(0,2).map(p=>p.destination.worldId));destinations.delete(active.identity.worldId);this.residents.prune(destinations);
  this.portalEffects?.clear({preserveRoot:active.root,preserveRoots:new Set(this.residents.roots())});
  const record=this.residents.active;
  if(record){await this.preparePackageViews(record);this.views.restore(active,record.viewEntries);record.viewEntries=null;this.activeLayer=record.peerLayer??this.createPeerLayer(this.engine.scene,this.transport.identity.nodeId);record.peerLayer=this.activeLayer;this.engine.scene.add(this.activeLayer.group);}
  else{this.views.setActive(active);this.activeLayer=this.createPeerLayer(this.engine.scene,this.transport.identity.nodeId);for(const portal of (active.project.portals??[]).slice(0,2)){if(!active.root.userData.repositoryPortalFramesReady)this.addPortalFrame(active.root,portal);const aperture=this.views.setDestination(portal.id,{source:portal,authorizedView:false,state:portal.enabled?'loading':'unavailable'});active.root.add(aperture);}}
  if(this.presence.has(active.identity.worldId))this.activeLayer.accept(this.presence.get(active.identity.worldId));
  this.lastPosition=active.player.position.toArray();await Promise.all([...this.views.entries.keys()].map(id=>this.views.whenReady?.(id)));
  if(this.host.active!==active)throw Error('World activation changed during native readiness');this.onChange(active);this.onActivated(active);
 }

 // A public authored snapshot grants no VIEW/ENTER authority to other worlds.
 async activateOffline(expectedActive=this.host.active){
  if(this.pending||this.connected)throw Error('Disconnect the world session before opening an offline snapshot.');
  const active=this.host.active,epoch=this.epoch;if(!active)throw Error('Open a world first.');if(active!==expectedActive)return false;
  this.views.setActive(active);
  for(const portal of (active.project.portals??[]).slice(0,2)){
   if(!active.root.userData.repositoryPortalFramesReady)this.addPortalFrame(active.root,portal);
   const aperture=this.views.setDestination(portal.id,{source:portal,authorizedView:false,state:'unavailable'});active.root.add(aperture);
  }
  active.root.userData.repositoryPortalFramesReady=true;
  await Promise.all([...this.views.entries.keys()].map(id=>this.views.whenReady?.(id)));
  if(this.epoch!==epoch||this.host.active!==active||this.connected)return false;
  this.onStatus('Single-player snapshot · portals offline. An authorised world session is required to travel.');return true;
 }

 async preview(portal){
  const token=this.epoch,owner=this.host.active.identity.worldId+':'+portal.id;this.previewRecords.set(portal.id,{worldId:portal.destination.worldId,loading:true});
  let candidate,record;
  try{
   if(portal.destination.worldId===this.host.active.identity.worldId)throw Error('Same-world portal preview and travel are unsupported');
   if([...this.previewRecords].some(([id,r])=>id!==portal.id&&r.worldId===portal.destination.worldId))throw Error('Duplicate destination preview is unsupported');
   const descriptor=await this.transport.subscribe(portal.destination.worldId,portal.id);this.descriptors.set(descriptor.worldId,descriptor);const loaded=await this.load(descriptor),destination=loaded.project.portals?.find(p=>p.id===portal.destination.portalId);if(!destination)throw Error('Destination portal reference is broken');
   record=this.residents.get(loaded,descriptor);
   if(!record){
    candidate=await this.buildScene(describeRuntimeWorld(loaded.project),this.engine.camera.clone(),{loaded});
    if(token!==this.epoch){this.disposeGraphics(candidate);return;}
    await this.host.prepareResources({...candidate,loaded,identity:loaded.identity,project:candidate.descriptor.project});
    if(token!==this.epoch){this.disposeGraphics(candidate);return;}
    await this.finishCandidate(candidate);candidate.residentReady=true;record=this.residents.register(loaded,descriptor,candidate);await this.preparePackageViews(record);
   }
   if(record&&!this.residents.isReady(record)){await this.engine.prepareRepositoryResources?.(record.candidate.root);this.residents.markReady(record);}
   if(token!==this.epoch){this.residents.prune(new Set((this.host.active?.project.portals??[]).slice(0,2).map(p=>p.destination.worldId)));return;}this.residents.linkPreview(record,owner);
   if(record.candidate.root.parent&&record.candidate.root.parent!==this.views.getScene(portal.id))record.candidate.root.removeFromParent();
   if(this.offlineWorlds.has(descriptor.worldId))throw Error('Destination owner is offline');
   this.views.setDestination(portal.id,{source:portal,destination,candidate:record.candidate,ownsCandidate:false,authorizedView:true,state:'live'});
   const layer=record.peerLayer??this.createPeerLayer(this.views.getScene(portal.id),this.transport.identity.nodeId);record.peerLayer=layer;this.views.getScene(portal.id).add(layer.group);this.previewLayers.set(portal.id,layer);
   if(this.presence.has(descriptor.worldId))layer.accept(this.presence.get(descriptor.worldId));await this.views.whenReady?.(portal.id);
   if(token!==this.epoch)return;this.previewRecords.set(portal.id,{worldId:descriptor.worldId,loaded,destination,descriptor,record});this.portalErrors.delete(portal.id);
  }catch(error){if(candidate&&!record)this.disposeGraphics(candidate);if(token!==this.epoch)return;this.views.setState(portal.id,/denied|permission/i.test(error.message)?'restricted':'unavailable');this.portalErrors.set(portal.id,error.message);this.previewRecords.set(portal.id,{worldId:portal.destination.worldId,error:error.message,retryAt:performance.now()+5000});this.onStatus(portal.name+': '+error.message);}
 }

 async cross(portal,sourceActive){
  if(this.pending)return;this.pending=true;this.input.suspend();
  const attempt=createRepositoryPortalTransition({transport:this.transport,host:this.host,portal,sourceActive,getAppearance:this.getAppearance,load:descriptor=>this.load(descriptor),onFrozen:value=>{this.pending=value;if(value)this.input.suspend();else this.input.resume();},onStatus:s=>{this.portalEffects?.transition(s);this.onStatus('Portal transfer: '+s);}});this.transitionAttempt=attempt;
  try{const result=await attempt.travel();this.rearm={worldId:result.runtime.loaded.identity.worldId,portalId:portal.destination.portalId};await this.activateLocal();this.portalEffects?.transition('active');this.onStatus('Arrived in '+this.host.active.project.metadata.name);}
  catch(error){
   if(!attempt.frozen&&this.host.active===sourceActive){const p=portalLocalPoint(portal,sourceActive.player.position.toArray());p[2]=.65;sourceActive.player.position.fromArray(portalWorldPoint(portal,p));sourceActive.player.velocity.set(0,0,0);sourceActive.player.update(0);this.lastPosition=sourceActive.player.position.toArray();}
   this.portalEffects?.transition(attempt.frozen?'outcome-unknown':'failed');this.onStatus((attempt.frozen?'Transfer outcome unresolved; movement paused. Use Recover transfer: ':'Stayed in source world: ')+error.message);this.portalErrors.set(portal.id,error.message);
  }finally{this.pending=attempt.frozen;if(!attempt.frozen)this.input.resume();}
 }
 async recover(){const attempt=this.transitionAttempt;if(!attempt?.frozen)throw Error('No unresolved transfer');const source=this.host.active;await this.transport.reconnectForRecovery();await attempt.recover();this.pending=attempt.frozen;if(!this.pending){if(this.host.active!==source)await this.activateLocal();this.input.resume();this.onStatus('Transfer reconciled with authority.');}}

 update(dt,time){const active=this.host.active;if(!active||!this.connected||this.transport.closed)return;this.activeLayer?.update(dt,active.player,this.engine.camera);for(const [id,layer]of this.previewLayers){const entry=this.views.entries.get(id);layer.update(dt,active.player,entry?.camera??this.engine.camera);}
  if(this.pending||this.authorityOffline)return;const position=active.player.position.toArray();const sent=this.transport.sendState({position,velocity:active.player.velocity.toArray(),yaw:active.player.yaw,appearance:this.getAppearance()});
  for(const portal of (active.project.portals??[]).slice(0,2)){const local=portalLocalPoint(portal,position);if(this.rearm?.worldId===active.identity.worldId&&this.rearm.portalId===portal.id){if(local[2]>.9)this.rearm=null;}const record=this.previewRecords.get(portal.id);if(portal.enabled&&portal.view.enabled&&Math.hypot(...local)<portal.view.maxDistance&&(!record||record.retryAt&&record.retryAt<performance.now()))void this.preview(portal);
   if(!(this.rearm?.worldId===active.identity.worldId&&this.rearm.portalId===portal.id)&&this.lastPosition&&sweepPortalCapsule({portal,previousFeet:this.lastPosition,nextFeet:position,radius:.3,bodyHeight:1.8})){void this.cross(portal,active);break;}}
  this.lastPosition=position;}
 render({width,height,time}){this.views.render({width,height,time});}
 getPeerLayer(worldId){if(!this.connected||this.transport.closed)return null;const record=[...this.residents.records.values()].find(r=>r.loaded.identity.worldId===worldId&&(r.active||r.previewOwner));return record?.peerLayer??null;}
 avatarRepresentations(worldId){const layer=this.getPeerLayer(worldId);if(!layer)return [];const present=new Set((layer.packet?.players??[]).map(p=>p.nodeId));return [...(layer.avatars??new Map())].filter(([node])=>present.has(node)).map(([,avatar])=>avatar);}
 diagnostics(){return {motionCorrections:this.motionCorrections??0,residentPackages:[...this.residents.records.values()].map(r=>({worldId:r.loaded.identity.worldId,digest:r.loaded.identity.contentDigest,active:r.active,pinned:!!r.pin,preview:!!r.previewOwner})),connected:this.connected&&!this.transport.closed,authorityOffline:this.authorityOffline,offlineWorlds:[...this.offlineWorlds],nodeId:this.transport.identity?.nodeId,playerId:this.membership?.playerId,worldId:this.transport.worldId,generation:this.transport.generation,pending:this.pending,transition:this.transitionAttempt?.transition.state,peers:[...this.presence].map(([worldId,p])=>({worldId,players:p.players.map(x=>({playerId:x.playerId,position:x.position,sequence:x.sequence}))})),portals:[...this.views.entries].map(([id,e])=>({id,state:e.aperture.userData.portalViewState,target:[e.target.width,e.target.height],destination:this.previewRecords.get(id)?.worldId,error:this.portalErrors.get(id)}))};}
 releaseOfflineResources(){if(this.connected||this.pending||this.connectionPending)throw Error('Disconnect and finish transfers before releasing world resources.');if([...this.residents.records.values()].some(r=>r.pin))throw Error('Unresolved transfer pins resident resources');if([...this.residents.records.values()].some(r=>r.candidate.root===this.host.active?.root))throw Error('Active authenticated world must not be released as an offline preview');this.residents.dispose();this.residents=new ResidentRepositoryWorlds({renderer:this.engine.backend??'native:1',dispose:candidate=>this.disposeGraphics(candidate),readinessFingerprint:this.engine.repositoryReadinessSignature});}
 disconnect(){this.epoch++;this.connected=false;this.authorityOffline=false;this.offlineWorlds.clear();this.transport.disconnect();for(const id of this.views.entries.keys())this.views.setState(id,'unavailable');this.clearViews();}
 dispose(){this.disconnect();this.views.dispose();if(![...this.residents.records.values()].some(r=>r.pin))this.residents.dispose();}
}
