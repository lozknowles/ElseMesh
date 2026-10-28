import test from 'node:test';import assert from 'node:assert/strict';
import {graphicsSceneEligible} from '../src/world-runtime/GraphicsRuntimeState.js';
const context=(entries=[])=>({active:{},portals:{views:{entries:new Map(entries.map((e,i)=>[i,e]))}}});
test('unconnected loading doorway never prevents FPS measurement',()=>assert.equal(graphicsSceneEligible(context([{authorizedView:false,state:'loading'}])),true));
test('real authorized loading, splat preparation and transitions pause adaptation',()=>{
 assert.equal(graphicsSceneEligible(context([{authorizedView:true,state:'loading'}])),false);
 assert.equal(graphicsSceneEligible(context([{authorizedView:true,state:'live',candidate:{splatScene:{state:{status:'decoded-awaiting-warmup'}}}}])),false);
 const c=context();for(const key of ['pending','authorityOffline']){c.portals[key]=true;assert.equal(graphicsSceneEligible(c),false);c.portals[key]=false;}
 assert.equal(graphicsSceneEligible({...c,openingLoading:true}),false);assert.equal(graphicsSceneEligible({...c,eyeActive:true}),false);assert.equal(graphicsSceneEligible({...c,active:null}),false);
});
test('ready authorized portal permits normal scene timing',()=>assert.equal(graphicsSceneEligible(context([{authorizedView:true,state:'live',candidate:{splatScene:{state:{status:'ready'}}}}])),true));
