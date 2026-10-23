import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from '../src/engine/index.js';
import {PlayerAvatar} from '../src/player/PlayerAvatar.js';
import {ReadiedRepositoryAvatar} from '../src/world-runtime/NativeRepositoryReadiness.js';
test('late cancelled native load never hides or prewarms the newer visible original avatar',async()=>{
 const original=PlayerAvatar.prototype.loadCharacter,gates=[],models=[],prepared=[];
 PlayerAvatar.prototype.loadCharacter=async function(){const version=++this.loadVersion,index=gates.length;let release;const gate=new Promise(r=>release=r);gates.push(release);const model={group:new Group(),materials:[],dispose(){}};models.push(model);await gate;if(this.disposed||version!==this.loadVersion)return;this.scanned=model;this.group.add(model.group);};
 let avatar;
 try{
  avatar=new ReadiedRepositoryAvatar(new Group(),{model:{wheelPivot:{position:new Vector3()},lines:{deckY:0},group:new Group()},getYaw:()=>0},{prepareResources:async root=>prepared.push(root)});
  const newer=avatar.loadCharacter();gates[1]();await newer;assert.equal(avatar.scanned,models[1]);assert.equal(models[1].group.visible,true);assert.equal(prepared.length,1);
  gates[0]();await avatar.ready;assert.equal(avatar.scanned,models[1]);assert.equal(models[1].group.visible,true);assert.equal(prepared.length,1,'stale load rewarmed a newer original model');
 }finally{avatar?.dispose();PlayerAvatar.prototype.loadCharacter=original;}
});
