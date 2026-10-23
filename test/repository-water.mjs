import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera } from '../src/engine/index.js';
import { Player } from '../src/player/Player.js';
import { Colliders } from '../src/world/Colliders.js';
import { repositoryWaterHeight,repositoryWaterQuery } from '../src/world-runtime/RepositoryWater.js';
import { createDryWorldMedium } from '../src/world-runtime/DriftingMist.js';
const water={level:0,waveAmplitude:.35,waveSpeed:1.2,extent:100};
test('rendered and queried water share finite analytic height and extent',()=>{
 const q=repositoryWaterQuery(water);q.setTime(2.3);q.setPoint(0,12,-9);
 assert.ok(Math.abs(q.cpu[0]-repositoryWaterHeight(water,12,-9,2.3))<1e-7);
 assert.equal(repositoryWaterHeight(water,51,0),-100000);
 q.setPoint(0,51,0);assert.equal(q.cpu[0],-100000);
 const source=readFileSync(new URL('../src/world-runtime/RepositoryWater.js',import.meta.url),'utf8');
 assert.match(source,/sin\(v.position.x\*\.04 \+ v.position.z\*\.03 \+ frame.time\*mat.waveSpeed\)/);
});
test('existing Player walks ashore, swims and dives in repository sea, then walks back',()=>{
 let axis=0,dive=false,time=0;
 const input={consumeLook:()=>({x:0,y:0}),moveAxes:()=>({x:axis,y:0,sprint:0}),down:key=>key==='KeyC'&&dive,hit:()=>false};
 const terrain={heightAt:x=>x<0?2:-4},query=repositoryWaterQuery({...water,waveAmplitude:0}),camera=new PerspectiveCamera();
 const player=new Player({camera,input,terrain,colliders:new Colliders(),query,boat:null});
 player.position.set(-3,2,0);player.yaw=0;
 const tick=()=>{time+=.05;query.setTime(time);player.update(.05);};
 tick();assert.equal(player.mode,'walk');
 axis=1;for(let i=0;i<240&&player.mode!=='swim';i++)tick();
 assert.equal(player.mode,'swim');assert.ok(player.position.x>0);
 axis=0;dive=true;for(let i=0;i<60;i++)tick();dive=false;
 assert.ok(camera.position.y<repositoryWaterHeight(water,player.position.x,player.position.z,time),'diving puts actual camera underwater');
 axis=-1;for(let i=0;i<300&&(player.mode!=='walk'||player.position.x>=0);i++)tick();
 assert.equal(player.mode,'walk');assert.ok(player.position.x<0);axis=0;for(let i=0;i<60;i++)tick();assert.ok(camera.position.y>0);
});
test('medium water defaults disabled and carries matching analytic surface and extent',()=>{
 const medium=createDryWorldMedium({});assert.equal(medium.uniforms.fields.waterEnabled.value,0);
 for(const name of ['waterLevel','waveAmplitude','waveSpeed','waterExtent'])assert.ok(name in medium.uniforms.fields);
 assert.match(medium.module.code,/sin\(p.x\*0.04 \+ p.y\*0.03 \+ frame.time\*builderMist.waveSpeed\)/);
 assert.match(medium.module.code,/waterExtent\*0.5/);
 assert.match(medium.compositeModule.code,/bmCameraUnderwater\(\)/);
});
