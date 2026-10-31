import test from 'node:test';import assert from 'node:assert/strict';
import {graphicsSceneEligible,isGameMenuShortcut,gameMenuEnvironment} from '../src/world-runtime/GraphicsRuntimeState.js';
test('M menu respects keyboard ownership, held keys and composition',()=>{
 const key={code:'KeyM'};assert.equal(isGameMenuShortcut(key),true);
 for(const flag of ['defaultPrevented','repeat','isComposing','ctrlKey','altKey','metaKey'])assert.equal(isGameMenuShortcut({...key,[flag]:true}),false,flag);
 const editing={closest:()=>({})};assert.equal(isGameMenuShortcut({...key,target:editing}),false);assert.equal(isGameMenuShortcut(key,editing),false);assert.equal(isGameMenuShortcut({code:'KeyK'}),false);
});
test('local world time never mutates authored or authoritative environment and default restores identity',()=>{
 const authored=Object.freeze({timeOfDay:14,weather:'storm'});assert.deepEqual(gameMenuEnvironment(authored,0),{timeOfDay:0,weather:'storm'});assert.equal(authored.timeOfDay,14);
 for(const value of [null,undefined,24,-1,'0',NaN])assert.equal(gameMenuEnvironment(authored,value),authored);
});
const context=(entries=[])=>({active:{},portals:{views:{entries:new Map(entries.map((e,i)=>[i,e]))}}});
test('unconnected loading doorway never prevents FPS measurement',()=>assert.equal(graphicsSceneEligible(context([{authorizedView:false,state:'loading'}])),true));
test('real authorized loading, splat preparation and transitions pause adaptation',()=>{
 assert.equal(graphicsSceneEligible(context([{authorizedView:true,state:'loading'}])),false);
 assert.equal(graphicsSceneEligible(context([{authorizedView:true,state:'live',candidate:{splatScene:{state:{status:'decoded-awaiting-warmup'}}}}])),false);
 const c=context();for(const key of ['pending','authorityOffline']){c.portals[key]=true;assert.equal(graphicsSceneEligible(c),false);c.portals[key]=false;}
 assert.equal(graphicsSceneEligible({...c,openingLoading:true}),false);assert.equal(graphicsSceneEligible({...c,eyeActive:true}),false);assert.equal(graphicsSceneEligible({...c,active:null}),false);
});
test('ready authorized portal permits normal scene timing',()=>assert.equal(graphicsSceneEligible(context([{authorizedView:true,state:'live',candidate:{splatScene:{state:{status:'ready'}}}}])),true));
