import test from 'node:test';
import assert from 'node:assert/strict';
import {PortalTransport} from '../src/world-runtime/PortalTransport.js';
import {newIdentity,signObject} from '../network/identity.mjs';
function fixture(change={}){
 const authority=newIdentity(),player=newIdentity(),transport=new PortalTransport();transport.identity=player;transport.worldId='world.alpha';transport.membership={sessionId:'elsemesh-session:source',world:{published:{descriptor:{authority:{nodeId:authority.nodeId}}}}};
 transport.request=async(type,{state})=>signObject({type:'pose-accepted',protocol:'elsemesh.world-wss/2',authoredWorldId:state.worldId,sessionId:transport.membership.sessionId,generation:state.generation,sequence:state.sequence,playerNodeId:player.nodeId,position:state.position,velocity:state.velocity,yaw:state.yaw,appearance:state.appearance,portalCrossings:['door'],...change},authority);
 return transport;
}
const state={position:[0,0,-.2],velocity:[0,0,-2],yaw:0};
test('accepted crossing receipt verifies signature and exact player/session/pose binding',async()=>{const t=fixture();const result=await t.sendAcceptedState(state);assert.deepEqual(result.portalCrossings,['door']);assert.equal(t.lastAcceptedPose,result);});
for(const change of [{playerNodeId:newIdentity().nodeId},{sessionId:'elsemesh-session:wrong'},{position:[0,0,0]},{sequence:999},{appearance:{style:'female'}}])test('rejects signed crossing receipt mismatch '+Object.keys(change)[0],async()=>{const t=fixture(change);await assert.rejects(t.sendAcceptedState(state),/Invalid authoritative/);assert.equal(t.lastAcceptedPose,undefined);});
test('normal outgoing pose packets remain suppressed while transfer is frozen',()=>{const t=fixture();let sent=0;t.closed=false;t.socket={readyState:1,bufferedAmount:0,send:()=>sent++};t.setFrozen(true);assert.equal(t.sendState(state),false);assert.equal(sent,0);t.setFrozen(false);assert.equal(t.sendState(state),true);assert.equal(sent,1);});

test('warm welcome adopts authoritative next sequence before first signed pose',async()=>{
 const previousSocket=globalThis.WebSocket,previousLocation=globalThis.location,t=fixture(),world=t.membership.world;
 globalThis.location={href:'http://localhost/worlds.html',protocol:'http:'};
 globalThis.WebSocket=class{constructor(){this.readyState=1;queueMicrotask(()=>this.onmessage({data:JSON.stringify({type:'welcome',worldId:'world.alpha',generation:7,sessionId:'elsemesh-session:source',nextSequence:1401,world})}));}close(){this.readyState=3;}};
 try{await t.connect({identity:t.identity});assert.equal(t.sequence,1401);const receipt=await t.sendAcceptedState(state);assert.equal(receipt.sequence,1401);assert.equal(receipt.generation,7);assert.equal(t.sequence,1402);}finally{t.disconnect();globalThis.WebSocket=previousSocket;globalThis.location=previousLocation;}
});
