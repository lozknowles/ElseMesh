import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {buildWebGLNativeSky} from '../src/world-runtime/WebGLNativeIsland.js';
import {configureWebGLRepositoryScene,updateWebGLRepositoryEnvironment} from '../src/world-runtime/WebGLRepositoryBackend.js';

test('active authored environment updates the same native WebGL sky without rebuilding',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),engine={scene,camera};
 const sky=buildWebGLNativeSky({timeOfDay:14,cloudCoverage:.35,weather:'clear',windSpeed:4});
 const active={project:{environment:{timeOfDay:14,cloudCoverage:.35,weather:'clear',windSpeed:4},objects:[]},root:new T.Group(),nativeIsland:{setEnvironment:value=>sky.setEnvironment(value)}};
 configureWebGLRepositoryScene(scene,active);
 const uniforms=sky.mesh.material.uniforms;
 try{
  for(const environment of [
   {timeOfDay:14,cloudCoverage:0,weather:'clear',windSpeed:2},
   {timeOfDay:23,cloudCoverage:1,weather:'storm',windSpeed:17}
  ]){
   updateWebGLRepositoryEnvironment(engine,active,5,environment);
   assert.equal(uniforms.nativeHour.value,environment.timeOfDay);
   assert.equal(uniforms.nativeCoverage.value,environment.cloudCoverage);
   assert.equal(uniforms.nativeStorm.value,environment.weather==='storm'?1:0);
   assert.equal(uniforms.nativeWind.value,environment.windSpeed);
  }
 }finally{sky.dispose();const shelter=scene.userData.weatherShelter;shelter?.rain.geometry.dispose();shelter?.rain.material.dispose();}
});
