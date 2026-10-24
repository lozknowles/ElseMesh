import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../src/player/Player.js';
import {Colliders} from '../src/world/Colliders.js';
import {Vector3,PerspectiveCamera} from '../src/engine/index.js';
function fixture({dt=.12,height=.28,stairs=1,grounded=true}={}){
 const c=new Colliders();c.addBox(new Vector3(0,-.15,0),new Vector3(20,.15,20),0,{walkable:true});
 for(let i=0;i<stairs;i++)c.addBox(new Vector3(0,height/2+i*.25,1+i*.65),new Vector3(2,height/2,.41),0,{walkable:true});
 if(stairs>1)c.addBox(new Vector3(0,height+(stairs-1)*.25-.1,12),new Vector3(2,.1,2.15),0,{walkable:true});
 const input={moveAxes:()=>({x:0,y:1,sprint:0}),hit:()=>false,down:()=>false};const player=new Player({camera:new PerspectiveCamera(),input,terrain:{heightAt:()=>0},colliders:c,query:{allocate:()=>0},boat:null});
 player.position.set(0,0,0);player.velocity.set(0,0,0);player.yaw=Math.PI;player.grounded=grounded;player.waterH=-1000;player.waterMean=-1000;
 return {player,run(n=30){for(let i=0;i<n;i++)player.updateWalk(dt);}};
}
test('walkable warehouse steps remain climbable at low frame rates',()=>{for(const dt of [1/60,1/15,.1,.12]){const f=fixture({dt,stairs:14});f.run(Math.ceil(4/dt));assert.ok(f.player.position.z>9,'stairs blocked at dt '+dt+' z '+f.player.position.z);assert.ok(f.player.position.y>=3.5,'stair height at dt '+dt);}});
test('step handling never lifts a walker through a tall wall',()=>{for(const dt of [1/60,.12]){const f=fixture({dt,height:.7});f.run(Math.ceil(2/dt));assert.ok(f.player.position.z<.3);assert.equal(f.player.position.y,0);}});
