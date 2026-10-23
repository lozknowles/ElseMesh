import test from 'node:test';
import assert from 'node:assert/strict';
import {T,createWorld,createLandscapeLayer,updateLandscapeLayer,applyLandscapeArea,createLandscapePondBoundary,landscapeWaterHasCompleteCoverage,describeRuntimeWorld,sampleLandscapeWater,applyLandscapePond,sampleTerrain} from '../src/world-runtime/vendor/world-engine-contract.js';
import {buildRepositoryScene,disposeRepositoryScene} from '../src/world-runtime/RepositoryScene.js';
import {buildWebGLRepositoryScene,disposeWebGLRepositoryScene} from '../src/world-runtime/WebGLRepositoryScene.js';
test('rounded pond keeps exact shoreline and canonical water in native and fallback scenes',async()=>{
 let p=createWorld('Rounded pond runtime');
 p.terrain={width:64,depth:64,resolution:33,seed:123,heights:Array(1089).fill(0),materials:Array(1089).fill(0)};
 p.objects=[];p.features=[];delete p.water;
 p=createLandscapeLayer(p,{id:'pond',kind:'water'});
 p=updateLandscapeLayer(p,'pond',{water:{level:2,waveAmplitude:.25,waveSpeed:1,shoreFade:2}});
 const boundary=createLandscapePondBoundary([.17,0,-.23],12,.8);
 p=applyLandscapeArea(p,{layerId:'pond',boundary,mode:'paint'});
 assert.equal(landscapeWaterHasCompleteCoverage(p,p.landscape.layers[0]),true);
 const expected=Math.abs(boundary.reduce((sum,a,i)=>{const b=boundary[(i+1)%boundary.length];return sum+a[0]*b[2]-b[0]*a[2];},0)/2);
 const d=describeRuntimeWorld(p),a=await buildRepositoryScene(d,new T.PerspectiveCamera()),b=await buildWebGLRepositoryScene(d,new T.PerspectiveCamera());
 try{
  for(const c of [a,b]){
   let mesh;c.landscape.traverse(n=>{if(n.material?.name==='landscape-water'||n.material?.transparent)mesh=n;});assert.ok(mesh);
   const pos=mesh.geometry.getAttribute('position');let area=0;
   for(let i=0;i<pos.count;i+=3)area+=Math.abs((pos.getX(i+1)-pos.getX(i))*(pos.getZ(i+2)-pos.getZ(i))-(pos.getX(i+2)-pos.getX(i))*(pos.getZ(i+1)-pos.getZ(i)))/2;
   assert.ok(Math.abs(area-expected)<.001,'renderer introduced square-cell gaps: '+area+' / '+expected);
   for(const time of [0,1.7]){c.query.setTime(time);c.query.setPoint(0,.17,-.23);assert.ok(Math.abs(c.query.cpu[0]-sampleLandscapeWater(p,.17,-.23,time).height)<1e-6);c.query.setPoint(0,13,13);assert.equal(c.query.cpu[0],-100000);}
  }
 }finally{disposeRepositoryScene(a);disposeWebGLRepositoryScene(b);}
});

test('graded island pond reaches both renderers with a dry bank and submerged bed above legacy sea',async()=>{
 let p=createWorld('Island pond');p.terrain={width:64,depth:64,resolution:33,seed:123,heights:Array(1089).fill(10),materials:Array(1089).fill(0)};p.objects=[];p.features=[];p.water={level:0,waveAmplitude:.3,waveSpeed:1,extent:64};
 p=createLandscapeLayer(p,{id:'pond',kind:'water'});p=updateLandscapeLayer(p,'pond',{water:{level:8,waveAmplitude:.15,waveSpeed:1,shoreFade:2}});
 p=applyLandscapePond(p,{layerId:'pond',center:[0,0,0],radius:12,irregularity:0,bankWidth:6,bedDepth:2,mode:'paint'});
 const profile=[20,15,12,10,8,0].map(x=>sampleTerrain(p.terrain,x,0));
 for(let i=1;i<profile.length;i++)assert.ok(profile[i]<profile[i-1]);assert.equal(profile[0],10);assert.ok(profile[2]>8&&profile[3]<8);assert.equal(profile.at(-1),6);
 const d=describeRuntimeWorld(p),a=await buildRepositoryScene(d,new T.PerspectiveCamera()),b=await buildWebGLRepositoryScene(d,new T.PerspectiveCamera());
 try{for(const c of [a,b]){c.query.setTime(0);c.query.setPoint(0,0,0);assert.equal(c.query.cpu[0],8);c.query.setPoint(0,20,0);assert.ok(Math.abs(c.query.cpu[0])<=.3);assert.equal(d.terrain.heightAt(0,0),6);}}finally{disposeRepositoryScene(a);disposeWebGLRepositoryScene(b);}
});
