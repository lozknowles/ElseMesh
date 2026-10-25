import {loadAppearance} from '../player/AvatarAppearance.js';
import {FederatedWorldTransition} from '../network/FederatedWorldTransition.js';
const poseOf=r=>({position:[...r.position],velocity:[...r.velocity],yaw:r.yaw,...(r.pitch!==undefined?{pitch:r.pitch}:{})});
/**
 * Adapter around the recovered client transition and authenticated authority ledgers.
 * load(descriptor) must verify the destination owner/content admission.
 * onFrozen(true) suspends input and the runtime loop; unknown outcomes stay frozen.
 */
export function createRepositoryPortalTransition({transport,host,portal,sourceActive,load,descriptor,getAppearance=()=>sourceActive?.player?.avatarAppearance??loadAppearance(),getPitch=()=>undefined,onFrozen=()=>{},onStatus=()=>{}}={}){
 if(!transport||!host||!portal||!sourceActive||typeof load!=='function')throw Error('Repository portal transition dependencies are incomplete');
 let reservation,prepared,candidate,frozen=false,commitAttempted=false,busy=false;
 const freeze=value=>{frozen=value;transport.setFrozen?.(value);onFrozen(value);};
 const listeners=new Set();
 const sourceRuntime={
  suspend:async()=>{freeze(true);},
  resume:async()=>{if(commitAttempted)throw Error('Commit outcome requires authoritative reconciliation');if(reservation){const result=await transport.cancel(reservation.id);if(!['cancelled','expired'].includes(result.state))throw Error('Source reservation cancellation is not definitive');reservation=result;}freeze(false);},
 };
 const destinationClient={ready:Promise.resolve(),mode:'visit',grant:{permissions:['visit']},manifest:{descriptor:{regionId:portal.destination.regionId}},onMessage:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
  travel:async()=>{commitAttempted=true;let result;try{result=await transport.commit(reservation.id);}catch(error){try{result=await transport.status(reservation.id);}catch{throw new AggregateError([error], 'Commit and status failed; transfer outcome unknown');}}
   reservation=result;if(result.state!=='committed')throw Error('Destination did not commit: '+result.state);
   for(const fn of listeners)fn({type:'travel-admitted',arrival:{...result,handoffId:result.handoff.handoffId,spawn:poseOf(result)}});
  }};
 const sourceClient={ready:Promise.resolve(),requestHandoff:async()=>{if(transport.ownerHandoffCommits)commitAttempted=true;reservation=await transport.handoff(reservation.id);return reservation.handoff;}};
 const runtimeRegistry={prepare:async({signal})=>{
  try{freeze(true);const p=sourceActive.player,pitch=getPitch();
  const receipt=await transport.sendAcceptedState({position:p.position.toArray(),velocity:p.velocity.toArray(),yaw:p.yaw,...(pitch!==undefined?{pitch}:{}),appearance:getAppearance()});
  if(!receipt.portalCrossings?.includes(portal.id))throw Error('Authority did not accept this portal crossing');
  if(signal?.aborted)throw Error('World transition cancelled before reservation');
  if(transport.ownerHandoffCommits)commitAttempted=true;
  reservation=await transport.prepare(portal.id);
  if(transport.ownerHandoffCommits)commitAttempted=false;
  if(reservation.state==='cancelled')throw Error(reservation.ownerTombstone?.reason??'Destination rejected entry');
  descriptor=descriptor??await transport.describe(reservation.destinationWorldId);
  if(descriptor.worldId!==reservation.destinationWorldId||descriptor.contentDigest!==reservation.contentDigest||descriptor.epoch!==reservation.epoch)throw Error('Destination descriptor does not match reservation');
  const loaded=await load(descriptor);
  transport.setRecoveryContext?.({reservation,descriptor});
  if(host.active!==sourceActive)throw Error('Source world changed before transfer');
  prepared=await host.prepare(loaded,{pose:poseOf(reservation)});
  if(!prepared)throw Error('Destination preparation was superseded');
  await transport.ready(reservation.id,loaded.identity.contentDigest,descriptor.epoch);
  candidate={loaded,activate:async(spawn)=>{
   if(!reservation||reservation.state!=='committed'||JSON.stringify(poseOf(reservation))!==JSON.stringify(spawn))throw Error('Activation requires authoritative committed pose');
   if(!prepared)prepared=await host.prepare(loaded,{pose:spawn});
   if(!prepared||!await host.activatePrepared(prepared))throw Error('Committed destination activation failed; reconcile membership');
   prepared=null;freeze(false);
  },dispose:async()=>{if(commitAttempted)return;if(prepared)host.discardPrepared(prepared);prepared=null;}};
  return candidate;
 }catch(error){if(!reservation&&transport.pendingReservation)reservation=transport.pendingReservation;if(prepared)host.discardPrepared(prepared);prepared=null;throw error;}
 }};
 const transition=new FederatedWorldTransition({sourceClient,destinationClient,runtimeRegistry,sourceRuntime,portal:{portalId:portal.id,destinationRegion:portal.destination.regionId},onState:onStatus});
 return {transition,get frozen(){return frozen;},get reservation(){return reservation;},
  async travel({signal}={}){if(busy)throw Error('A world transition is already active');busy=true;try{return await transition.travel({signal});}finally{busy=false;}},
  async recover(){if(busy)throw Error('A world transition is already active');if(transition.state!=='outcome-unknown'||!reservation)throw Error('No unresolved reservation');busy=true;
   try{reservation=await transport.status(reservation.id);transport.validateRecoveryStatus?.(reservation);if(reservation.state==='committed'){if(!candidate)throw Error('Destination candidate unavailable');return await transition.reconcile({runtime:candidate,arrival:{...reservation,spawn:poseOf(reservation)}});}
    if(reservation.state==='prepared'){reservation=await transport.cancel(reservation.id);transport.validateRecoveryStatus?.(reservation);}
    if(!['cancelled','expired'].includes(reservation.state))throw Error('Transfer remains unresolved');
    commitAttempted=false;await transition.proveCancelled({proof:reservation});return reservation;
   }finally{busy=false;}},
  cancel(){transition.cancel();}
 };
}
