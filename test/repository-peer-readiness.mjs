import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3,PerspectiveCamera} from '../src/engine/index.js';
import {ReadiedRepositoryAvatar} from '../src/world-runtime/NativeRepositoryReadiness.js';
import {RepositoryPeerLayer} from '../src/world-runtime/RepositoryPortalRuntime.js';
test('fresh presence cannot reveal pending original or proxy; readiness and staleness recover independently',()=>{
 class PendingOriginal extends ReadiedRepositoryAvatar{async loadCharacter(){}}
 const boat={model:{wheelPivot:{position:new Vector3()},lines:{deckY:0},group:new Group()},getYaw:()=>0},camera=new PerspectiveCamera();
 const layer=new RepositoryPeerLayer(new Group(),'own',undefined,scene=>new PendingOriginal(scene,boat));
 const packet={players:[{nodeId:'remote',playerId:'player:remote',position:[0,0,0],velocity:[0,0,0],yaw:0}]};
 layer.accept(packet);layer.update(.016,{},camera);const avatar=layer.avatars.get('remote');
 assert.equal(avatar.group.visible,false,'fresh presence cannot override pending-original visibility');
 const modelGroup=new Group();modelGroup.visible=false;avatar.scanned={group:modelGroup,current:'idle',play(){},update(){},dispose(){}};
 layer.update(.016,{},camera);assert.equal(avatar.group.visible,false,'fresh presence cannot override pending-pipeline visibility');
 modelGroup.visible=true;layer.update(.016,{},camera);assert.equal(avatar.group.visible,true,'ready original appears with fresh presence');assert.ok(avatar.proceduralParts.every(part=>!part.visible));
 layer.at=performance.now()-4000;layer.update(.016,{},camera);assert.equal(avatar.group.visible,false,'stale presence hides ready original');
 layer.accept(packet);layer.update(.016,{},camera);assert.equal(avatar.group.visible,true,'freshness recovery restores ready original rather than latching hidden');layer.accept({players:[]});layer.update(.016,{},camera);assert.equal(layer.avatars.get('remote'),avatar);assert.equal(avatar.group.visible,false);layer.accept(packet);layer.update(.016,{},camera);assert.equal(layer.avatars.get('remote'),avatar);assert.equal(avatar.group.visible,true);layer.dispose();
});

test('dormant peer model pool is bounded and evicts only inactive entries',()=>{
 let disposed=0;const layer=new RepositoryPeerLayer(new Group(),'own',undefined,()=>({group:new Group(),update(){this.group.visible=true;},dispose(){disposed++;this.group.removeFromParent();}})),camera=new PerspectiveCamera();
 for(let id=0;id<40;id++){layer.accept({players:[{nodeId:'p'+id,playerId:'player:p'+id,position:[0,0,0],velocity:[0,0,0],yaw:0}]});layer.update(.016,{},camera);assert.ok(layer.avatars.size<=32);assert.ok(layer.avatars.has('p'+id));}
 assert.equal(layer.avatars.size,32);assert.equal(disposed,8);layer.dispose();assert.equal(disposed,40);
});
