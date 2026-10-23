import test from 'node:test';
import assert from 'node:assert/strict';
import {PortalTransport} from '../src/world-runtime/PortalTransport.js';
import {createRepositoryPortalTransition} from '../src/world-runtime/RepositoryPortalTransition.js';
const profile={style:'female',shirt:'#33785b',trousers:'#294e70',skin:'#805136',hair:'#171512'};
for(const committed of [true,false])test('closed socket recovery reauthenticates original identity and '+(committed?'activates committed destination':'proves cancellation before source resumption'),async()=>{
 const previousSocket=globalThis.WebSocket,previousLocation=globalThis.location,identity={nodeId:'elsemesh-node:'+'a'.repeat(64)},authority='elsemesh-node:'+'b'.repeat(64),transport=new PortalTransport();
 const source={worldId:'alpha',regionId:'r.alpha',contentDigest:'source',epoch:1,published:{descriptor:{authority:{nodeId:authority}}}},destination={...source,worldId:'beta',regionId:'r.beta',contentDigest:'dest'};
 const originalWelcome={worldId:'alpha',nodeId:identity.nodeId,sessionId:'session:source',generation:3,nextSequence:5000,world:source};
 transport.identity=identity;transport.membership=originalWelcome;transport.worldId='alpha';transport.generation=3;transport.closed=false;transport.socket={readyState:1,close(){}};
 let r={id:'r',nodeId:identity.nodeId,state:'prepared',sourceWorldId:'alpha',destinationWorldId:'beta',sourceGeneration:3,destinationSessionId:'session:dest',contentDigest:'dest',epoch:1,position:[0,0,10],velocity:[0,0,2],yaw:Math.PI,handoff:{handoffId:'h',sessionId:'session:source',destinationAuthority:authority}},activated=0,acceptedAppearance;
 transport.sendAcceptedState=async p=>{acceptedAppearance=p.appearance;return {portalCrossings:['door']};};
 transport.request=async(type)=>{
  if(transport.closed)throw Error('socket closed');
  if(type==='prepare'||type==='handoff')return structuredClone(r);
  if(type==='describe')return destination;
  if(type==='ready')return r;
  if(type==='commit'){if(committed)r={...r,state:'committed',generation:4};transport.closed=true;throw Error('commit acknowledgement lost when socket closed');}
  if(type==='status')return structuredClone(r);
  if(type==='cancel'){r={...r,state:'cancelled'};return structuredClone(r);}
 };
 const sourceActive={player:{position:{toArray:()=>[0,0,-.2]},velocity:{toArray:()=>[0,0,-2]},yaw:0,pitch:0,avatarAppearance:profile}},loaded={identity:{contentDigest:'dest'}},host={active:sourceActive,prepare:async()=>({}),discardPrepared(){},activatePrepared:async()=>{activated++;return true;}};
 const api=createRepositoryPortalTransition({transport,host,portal:{id:'door',destination:{regionId:'r.beta'}},sourceActive,load:async()=>loaded});
 await assert.rejects(api.travel(),/outcome unknown/);assert.equal(api.frozen,true);assert.equal(transport.frozen,true);assert.equal(activated,0);assert.deepEqual(acceptedAppearance,profile);
 globalThis.location={href:'http://localhost/worlds.html',protocol:'http:'};
 const welcome=committed?{...originalWelcome,worldId:'beta',sessionId:'session:dest',generation:4,nextSequence:0,world:destination}:originalWelcome;
 globalThis.WebSocket=class{constructor(){this.readyState=1;queueMicrotask(()=>this.onmessage({data:JSON.stringify({type:'welcome',...welcome})}));}close(){this.readyState=3;}};
 try{
  await transport.reconnectForRecovery();assert.equal(transport.identity,identity);assert.equal(api.frozen,true);assert.equal(transport.frozen,true);assert.equal(transport.sequence,welcome.nextSequence);assert.equal(transport.sendState({position:[0,0,0]}),false);assert.equal(activated,0);
  await api.recover();assert.equal(api.frozen,false);assert.equal(transport.frozen,false);assert.equal(activated,committed?1:0);assert.equal(api.transition.state,committed?'active':'idle');
 }finally{transport.disconnect();globalThis.WebSocket=previousSocket;globalThis.location=previousLocation;}
});
test('stale committed reservation cannot replace newly reauthenticated membership',()=>{
 const t=new PortalTransport();t.identity={nodeId:'node'};const r={id:'r',nodeId:'node',sourceWorldId:'alpha',destinationWorldId:'beta',sourceGeneration:3,destinationSessionId:'dest',handoff:{sessionId:'source'}};
 t.recoveryContext={reservation:r};t.recoveryWelcome={worldId:'alpha',sessionId:'NEW_SESSION',generation:0};
 // Even if adopting an old commit has changed the mutable membership fields,
 // recovery validation uses the independent authenticated welcome fence.
 t.membership={worldId:'beta',sessionId:'dest',generation:4};
 assert.throws(()=>t.validateRecoveryStatus({...r,state:'committed',generation:4}),/expired or membership changed/);
});
