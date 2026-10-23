import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,PerspectiveCamera} from '../src/engine/index.js';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {Colliders} from '../src/world/Colliders.js';
import {newRepositoryFollowCamera} from '../src/world-runtime/RepositoryFollowCamera.js';
const world=(x=0)=>({identity:{worldId:'world.'+x},player:{position:new Vector3(x,0,0),velocity:new Vector3(1,0,-2),yaw:0,pitch:.2,mode:'walk'},terrain:{heightAt:()=>0},colliders:new Colliders(),project:{portals:[]}});
const setup=camera=>{const follow=newRepositoryFollowCamera({camera:camera??new PerspectiveCamera(62,16/9,.06)});follow.setEnabled(true);return follow;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6, a+' != '+b);
test('disabled camera retains first person camera and tracking never mutates player movement',()=>{
 const a=world(),camera=new PerspectiveCamera(),follow=newRepositoryFollowCamera({camera}),before=JSON.stringify(a.player);camera.position.set(9,8,7);const position=camera.position.toArray(),quaternion=camera.quaternion.toArray();
 assert.equal(follow.update(.016,a),false);assert.deepEqual(camera.position.toArray(),position);assert.deepEqual(camera.quaternion.toArray(),quaternion);
 follow.setEnabled(true);follow.update(.016,a);assert.equal(JSON.stringify(a.player),before);assert.equal(follow.state.avatarClear,true);
 const fixed=camera.position.toArray();a.player.yaw=Math.PI;follow.update(.016,a);assert.deepEqual(camera.position.toArray(),fixed);
});
test('wall obstruction snaps inward and removing it eases outward without intersecting wall',()=>{
 const a=world(),follow=setup();follow.update(.016,a);const full=follow.state.distance;
 a.colliders.addBox(new Vector3(0,2,2),new Vector3(10,5,.1));follow.update(.016,a);
 assert.ok(follow.state.distance<full/2);assert.ok(follow.camera.position.z<1.9);const contracted=follow.state.distance;
 a.colliders.boxes=[];follow.update(.016,a);assert.ok(follow.state.distance>contracted);assert.ok(follow.state.distance<full);
});
test('terrain samples shorten camera path before a raised bank',()=>{
 const a=world(),follow=setup();a.terrain.heightAt=x=>x>1.5?8:0;follow.update(.016,a);assert.ok(follow.camera.position.x<1.5);assert.equal(follow.state.occluded,true);assert.ok(follow.camera.position.y>a.terrain.heightAt(follow.camera.position.x)+.22);
});
test('world and movement mode changes reset all interpolation before first new frame',()=>{
 const a=world(),b=world(1000),follow=setup();a.colliders.addBox(new Vector3(0,2,1),new Vector3(10,4,.1));follow.update(.016,a);const near=follow.state.distance;
 follow.update(.016,b);assert.ok(follow.camera.position.x>1000);assert.ok(follow.state.distance>near*2);
 b.colliders.addBox(new Vector3(1000,2,1),new Vector3(10,4,.1));follow.update(.016,b);b.colliders.boxes=[];b.player.mode='swim';follow.update(.016,b);close(follow.state.distance,Math.hypot(3.2,2.4,4.5));
});
for(const [kind,Camera]of [['native',PerspectiveCamera],['three',T.PerspectiveCamera]])test(kind+' approach and arrival keep camera and near-plane corners on portal front',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const a=world(),n=new Vector3(Math.sin(yaw),0,Math.cos(yaw)),portal={id:'door',position:[0,1.5,0],yaw,enabled:true};a.project.portals=[portal];a.player.position.copy(n.clone().multiplyScalar(.02));
  const camera=new Camera(62,16/9,.06),follow=setup(camera);follow.update(.016,a);assert.ok(camera.position.dot(n)>.22);
  for(const z of [1,.2,.01]){a.player.position.copy(n.clone().multiplyScalar(z));follow.update(.016,a);const half=camera.near*Math.tan(camera.fov*Math.PI/360);
   for(const x of [-half*camera.aspect,half*camera.aspect])for(const y of [-half,half]){const corner=new Vector3(x,y,-camera.near).applyMatrix4(camera.matrixWorld);assert.ok(corner.dot(n)>=0,'near plane crossed portal');}
  }
  const arrival=world(0);arrival.project.portals=[portal];arrival.player.position.copy(n.clone().multiplyScalar(.1));follow.update(.016,arrival,{arrivalPortal:portal});assert.ok(camera.position.dot(n)>0);assert.equal(follow.state.constrainedPortals[0],'door');
 }
});
test('suspension holds the current render camera until authority and activation are resolved',()=>{
 const a=world(),follow=setup();follow.update(.016,a);const position=follow.camera.position.toArray(),state=follow.state;a.player.position.x=100;assert.equal(follow.update(.016,a,{suspended:true}),false);assert.deepEqual(follow.camera.position.toArray(),position);assert.equal(follow.state,state);
});
