import {createWebGLRepositoryPeerLayer} from '../src/world-runtime/WebGLRepositoryBackend.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarMotionFacing,repositoryPeerFacing} from '../src/player/AvatarFacing.js';
import {PlayerAvatar} from '../src/player/PlayerAvatar.js';
import {WebGLRepositoryAvatar} from '../src/world-runtime/WebGLRepositoryAvatar.js';
import {RepositoryPeerLayer} from '../src/world-runtime/RepositoryPortalRuntime.js';
import {Group,Vector3,PerspectiveCamera} from '../src/engine/index.js';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
const close=(a,b)=>assert.ok(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-9,`${a} != ${b}`);
const directions=[[0,1,0],[1,0,Math.PI/2],[0,-1,Math.PI],[-1,0,-Math.PI/2],[1,1,Math.PI/4],[1,-1,Math.PI*3/4],[-1,-1,-Math.PI*3/4],[-1,1,-Math.PI/4]];
const boat=()=>({model:{group:new Group(),wheelPivot:{position:new Vector3()},lines:{deckY:0}},getYaw:()=>0});
class TestAvatar extends PlayerAvatar{async loadCharacter(){}}
const camera=new PerspectiveCamera();camera.position.set(0,10,10);
function webglAvatar(){const a=Object.create(WebGLRepositoryAvatar.prototype);a.group=new T.Group();a.transportPresentation={update(){}};a.play=()=>{};return a;}
for(const [name,create]of [['native',()=>new TestAvatar(new Group(),boat())],['webgl',webglAvatar]]){
 test(name+' local avatar faces actual travel in all cardinal and diagonal directions; yaw and position remain authoritative',()=>{
  const a=create(),player={position:new Vector3(1,2,3),velocity:new Vector3(),yaw:.37,mode:'walk'};
  for(const [x,z,yaw]of directions){player.velocity.set(x,0,z);player.position.x+=x*.016;player.position.z+=z*.016;const before=JSON.stringify(player);a.update(.016,player,camera,true);close(a.group.rotation.y,yaw);assert.equal(JSON.stringify(player),before);assert.deepEqual(a.group.position.toArray(),player.position.toArray());}
  player.velocity.set(0,0,0);player.yaw=2;a.update(.016,player,camera,true);close(a.group.rotation.y,-Math.PI/4);
  player.velocity.set(.001,99,-.001);a.update(.016,player,camera,true);close(a.group.rotation.y,-Math.PI/4);
 });
 test(name+' scripted cinematic yaw remains literal and new player resets stationary facing',()=>{
  const a=create(),player={position:new Vector3(),velocity:new Vector3(1,0,0),yaw:0,mode:'walk'};
  a.update(.016,player,camera,true);a.cinematic={x:2,y:0,z:1,yaw:.42,mode:'walk'};a.update(.016,player,camera,true);close(a.group.rotation.y,.42);
  a.cinematic=null;const next={...player,velocity:new Vector3(),yaw:.3};a.update(.016,next,camera,true);close(a.group.rotation.y,.3+Math.PI);
 });
}
test('native boat/deck yaw remains local to boat and dismount resets walking orientation',()=>{
 const a=new TestAvatar(new Group(),boat()),player={position:new Vector3(),velocity:new Vector3(1,0,0),yaw:.2,mode:'walk',deckPos:new Vector3(1,0,2),deckVel:new Vector3(),deckYaw:.7};
 a.update(.016,player,camera,true);player.mode='deck';a.update(.016,player,camera,true);close(a.group.rotation.y,.7);assert.equal(a.group.parent,a.boat.model.group);
 player.mode='boat';a.update(.016,player,camera,true);close(a.group.rotation.y,0);
 player.mode='walk';player.velocity.set(0,0,0);a.update(.016,player,camera,true);close(a.group.rotation.y,.2+Math.PI);assert.equal(a.group.parent,a.scene);
});
test('negligible, vertical-only and nonfinite velocities do not invent a body heading',()=>{
 const state={},sample={fallbackYaw:.4,context:'a'};
 for(const velocity of [[0,5,0],[.01,0,.01],[NaN,0,1],[1,0,Infinity]])close(avatarMotionFacing(state,{...sample,velocity}),.4);
 close(avatarMotionFacing(state,{...sample,velocity:[1,0,0]}),Math.PI/2);
 close(avatarMotionFacing(state,{...sample,fallbackYaw:2,velocity:[0,0,0]}),Math.PI/2);
});
test('world, transfer generation, mode and large discontinuities reset stale stationary heading',()=>{
 const a={},pose={yaw:.2,position:[0,0,0],velocity:[1,0,0],generation:1};
 close(repositoryPeerFacing(a,pose,'one'),Math.PI/2);pose.velocity=[0,0,0];pose.yaw=.6;close(repositoryPeerFacing(a,pose,'one'),Math.PI/2);
 close(repositoryPeerFacing(a,pose,'two'),.6+Math.PI);
 pose.velocity=[0,0,1];repositoryPeerFacing(a,pose,'two');pose.velocity=[0,0,0];pose.generation=2;close(repositoryPeerFacing(a,pose,'two'),.6+Math.PI);
 pose.velocity=[1,0,0];repositoryPeerFacing(a,pose,'two');pose.velocity=[0,0,0];pose.position=[100,0,100];close(repositoryPeerFacing(a,pose,'two'),.6+Math.PI);
 pose.velocity=[1,0,0];repositoryPeerFacing(a,pose,'two');pose.mode='boat';close(repositoryPeerFacing(a,pose,'two'),.6+Math.PI);
});
test('native peer layer uses remote horizontal velocity and preserves stopped heading without mutating packets',()=>{
 const layer=new RepositoryPeerLayer(new Group(),'own',undefined,()=>({group:new Group(),update(){this.group.rotation.y=this.cinematic.yaw;this.group.visible=true;},dispose(){}}));
 const pose={nodeId:'peer',playerId:'p',position:[0,0,0],velocity:[1,8,0],yaw:2,generation:1},packet={worldId:'world',players:[pose]};layer.accept(packet);
 const before=JSON.stringify(packet);layer.update(.016,{},camera);close(layer.avatars.get('peer').group.rotation.y,Math.PI/2);assert.equal(JSON.stringify(packet),before);
 pose.velocity=[0,0,0];pose.yaw=0;layer.update(.016,{},camera);close(layer.avatars.get('peer').group.rotation.y,Math.PI/2);
 pose.generation=2;layer.update(.016,{},camera);close(layer.avatars.get('peer').group.rotation.y,Math.PI);layer.dispose();
});

test('WebGL peer layer renders travel heading, stop retention and transfer reset without changing authoritative yaw',()=>{
 const layer=createWebGLRepositoryPeerLayer(new T.Group(),'own'),pose={nodeId:'peer',playerId:'p',position:[0,0,0],velocity:[-1,0,1],yaw:.7,generation:0},packet={worldId:'w',players:[pose]};
 layer.accept(packet);const before=JSON.stringify(packet);layer.update(.016,{},camera);const a=layer.avatars.get('peer');close(a.group.rotation.y,-Math.PI/4);assert.equal(JSON.stringify(packet),before);
 pose.velocity=[0,0,0];pose.yaw=1.2;layer.update(.016,{},camera);close(a.group.rotation.y,-Math.PI/4);
 pose.generation=1;layer.update(.016,{},camera);close(a.group.rotation.y,1.2+Math.PI);layer.dispose();
});

for(const [name,create]of [['native',()=>new TestAvatar(new Group(),boat())],['webgl',webglAvatar]])test(name+' accepted wall slide overrides attempted diagonal velocity; fully blocked movement holds heading',()=>{
 const a=create(),player={position:new Vector3(),velocity:new Vector3(1,0,1),yaw:.5,mode:'walk'};
 a.update(.016,player,camera,true);player.position.z+=.03;a.update(.016,player,camera,true);close(a.group.rotation.y,0);
 player.velocity.set(-1,0,0);player.yaw=2;a.update(.016,player,camera,true);close(a.group.rotation.y,0);
 player.position.x+=.03;a.update(.016,player,camera,true);close(a.group.rotation.y,Math.PI/2);
});
test('sparse peer packet deltas follow wall sliding; repeats and small jitter hold heading',()=>{
 const a={},pose={yaw:0,position:[0,0,0],velocity:[1,0,1],generation:1};
 close(repositoryPeerFacing(a,pose,'w'),Math.PI/4);pose.position=[0,0,.2];close(repositoryPeerFacing(a,pose,'w'),0);
 pose.velocity=[-1,0,0];for(let i=0;i<20;i++)close(repositoryPeerFacing(a,pose,'w'),0);
 pose.position=[.001,0,.199];close(repositoryPeerFacing(a,pose,'w'),0);
 pose.position=[.201,0,.199];close(repositoryPeerFacing(a,pose,'w'),Math.PI/2);
});
