import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {updateWebGLWeatherShelter} from '../src/world-runtime/WebGLWeatherShelter.js';

const project={environment:{weather:'clear'},objects:[
 {id:'warehouse:object:0329',name:'weathered roof',assetId:'warehouse:box-steel',collision:'solid',position:[0,15,-77],rotation:[0,.3,0],scale:[32,.32,30]},
 {id:'warehouse:object:0000',name:'polished tiled warehouse floor',position:[0,2.85,-77],rotation:[0,0,0],scale:[32,.3,30]}
]};
function shader(material){const s={uniforms:{},vertexShader:'#include <fog_vertex>',fragmentShader:'#include <fog_fragment>'};material.onBeforeCompile(s,{});return s;}

test('zero/one shelter fast paths preserve installation, late materials and underwater uniforms',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),material=new T.MeshBasicMaterial();
 let priorCalls=0;material.onBeforeCompile=s=>{priorCalls++;s.uniforms.prior={value:7};};
 scene.add(new T.Mesh(new T.BoxGeometry(),material));
 const engine={scene,camera};updateWebGLWeatherShelter(engine,{project},1,false);
 const firstHook=material.onBeforeCompile,s=shader(material),state=scene.userData.weatherShelter;
 assert.equal(priorCalls,1);assert.equal(s.uniforms.prior.value,7);assert.equal(s.uniforms.weatherShelterCount.value,1);
 assert.ok(s.fragmentShader.includes('if(weatherShelterCount==0)return distance(start,end);'));
 assert.ok(s.fragmentShader.includes('if(weatherShelterCount==1)return distance(start,end)*(1.0-max(0.0,hi-max(lo,0.0)));'));
 assert.ok(s.fragmentShader.includes('for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)'),'multi-volume overlap fallback remains');
 const late=new T.MeshBasicMaterial(),excluded=new T.MeshBasicMaterial({fog:false});scene.add(new T.Mesh(new T.BoxGeometry(),[late,excluded]));
 updateWebGLWeatherShelter(engine,{project},2,true);
 assert.equal(material.onBeforeCompile,firstHook);assert.ok(state.installed.has(late));assert.equal(state.installed.has(excluded),false);
 assert.equal(shader(late).uniforms.weatherShelterCount,s.uniforms.weatherShelterCount);assert.equal(s.uniforms.weatherShelterCount.value,0);
 updateWebGLWeatherShelter(engine,{project},3,false);assert.equal(s.uniforms.weatherShelterCount.value,1);
 updateWebGLWeatherShelter(engine,null,4,false);assert.equal(s.uniforms.weatherShelterCount.value,0);
});

// Interval bounds are already clipped to [0,1] by the untouched slab test.
// Check its complete Float32 output domain, including the invalid [1,1] sentinel.
test('one interval gives bit-identical Float32 covered length to four-slot sort/merge',()=>{
 const f=Math.fround;let seed=712324;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return f(seed/4294967296);};
 for(let i=0;i<100000;i++){
  let lo=random(),hi=random();if(hi<=lo){lo=1;hi=1;}
  const ranges=[[lo,hi],[1,1],[1,1],[1,1]].sort((a,b)=>a[0]-b[0]);let covered=0,last=0;
  for(const [a,b]of ranges){covered=f(covered+Math.max(0,f(b-Math.max(a,last))));last=Math.max(last,b);}
  const fast=Math.max(0,f(hi-Math.max(lo,0)));
  assert.equal(fast,covered);
  const distance=f(random()*1e5);assert.equal(f(distance*f(1-fast)),f(distance*f(1-covered)));
 }
});
