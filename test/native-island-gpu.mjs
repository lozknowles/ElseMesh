import './headless.mjs';
import assert from 'node:assert/strict';
import {GPU} from '../src/engine/gpu/GPU.js';
import {Scene,PerspectiveCamera} from '../src/engine/index.js';
import {Sky} from '../src/sky/Sky.js';
import {Atmosphere} from '../src/sky/Atmosphere.js';
import {MeshRenderer} from '../src/engine/render/MeshRenderer.js';
import {createViewUniforms,setFrameCamera} from '../src/engine/render/Frame.js';
import {Texture,RenderTarget} from '../src/engine/gpu/Texture.js';
import {ShaderModule,collectModules} from '../src/engine/gpu/Shader.js';
import {setShadowMap} from '../src/engine/render/wgsl/lighting.js';
import {buildNativeIsland} from '../src/world-runtime/NativeIsland.js';
await GPU.init({headless:true});
const shadow=new Texture({width:1,height:1,depth:4,dimension:'2d-array',format:'depth32float',usage:['sample','render']});setShadowMap(shadow);
const camera=new PerspectiveCamera(60,1,.1,2000);camera.position.set(0,3,0);camera.updateMatrixWorld();
const species=['bananas','elephantEars','ferns','heliconias','monsteras','palms','shrubs','strelitzias','trees','youngPalms'];
const n=8,normal=new Uint8Array(n*n*4),splat=new Uint8Array(n*n*4);for(let i=0;i<n*n;i++){normal.set([128,128,0,255],i*4);splat.set([255,0,0,0],i*4);}
const color=new Texture({width:4,height:4,format:'rgba16float',usage:['sample','render','copyDst']}),depth=new Texture({width:4,height:4,format:'depth32float',usage:['sample','render']});
const atmosphere=new Atmosphere(),sky=new Sky(atmosphere);
const context={sky,sceneCopy:{texture:color,depthTexture:depth}};
const source=()=>({domain:{res:n,size:8,origin:-4},coarse:{res:n,heights:new Float32Array(n*n),normal,splat},shore:{res:4,data:Float32Array.from({length:64},(_,i)=>i%4===0?10000:i%4===1?1:0)},records:Object.fromEntries(species.map(s=>[s,s==='trees'?[{x:0,y:0,z:0,s:1,sy:1,yaw:0,la:0,l:1,H:12.5,seed:.5}]:[]])),grassMask:{res:n,data:new Uint8Array(n*n*4)},appearance:{swellDir:{x:1,y:0},reef:{center:{x:0,z:0},radius:2}},ocean:{fft:{cascades:1},sim:{center:[0,0],size:8,res:8}},tiles:[{id:'all',x:0,z:0,width:n,height:n,bounds:[-4,-4,4,4]}],readTile:async()=>({fields:{heights:new Float32Array(n*n),normal,splat}})});
const rootA=new Scene(),rootB=new Scene();
const a=await buildNativeIsland({project:{nativeIsland:{}},root:rootA,camera,options:{readNativeIsland:source,water:context,prepareVegetationAssets:async()=>{}}});
const b=await buildNativeIsland({project:{nativeIsland:{}},root:rootB,camera,options:{readNativeIsland:source,water:context,prepareVegetationAssets:async()=>{}}});
// Deliberate 1px bark fixture: this validates shader integration, not scanned bark fidelity.
const bark=new Texture({width:1,height:1,format:'rgba8unorm',data:new Uint8Array([128,128,255,255])});
for(const island of [a,b])for(const material of island.vegetation.materials)for(const key of ['barkDiffuse','barknor_gl','barkarm'])material.bindings[key]={texture:bark};
assert.notEqual(a.vegetation.viewParams,b.vegetation.viewParams);assert.ok(Number.isNaN(a.data.heightAt(0,0)));
await a.ensureArrival([0,0,0]);assert.equal(a.data.heightAt(0,0),0);
a.bindView(camera);const old=b.vegetation.viewParams.fields.camPos.value.clone();camera.position.x=1;a.bindView(camera);assert.deepEqual(b.vegetation.viewParams.fields.camPos.value,old);
for(const mat of a.vegetation.materials){const modules=collectModules(mat.modules);assert.ok(modules.some(m=>Object.values(m.bindings).some(binding=>binding.uniform===a.vegetation.viewParams)));}
const errors=[];GPU.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
const renderer=new MeshRenderer(),target=new RenderTarget(16,16,{colors:['rgba16float','rgba16float','rgba8unorm'],depth:'depth32float'}),block=createViewUniforms('native-smoke');camera.position.set(0,3,3);camera.lookAt(0,0,0);camera.updateMatrixWorld();a.bindView(camera);a.update(.016,camera);atmosphere.update(.016,3);
const pass={camera,frameBlock:block,kind:'main',cull:false,colorViews:target.textures.map(t=>t.view()),colorFormats:['rgba16float','rgba16float','rgba8unorm'],clearColors:[[0,0,0,0],[0,0,0,0],[0,0,0,0]],depthView:target.depthTexture.view(),depthFormat:'depth32float',clearDepth:0,depthCompare:'greater-equal'};
renderer.precompiling=true;setFrameCamera(camera,16,16,{block});renderer.render(rootA,pass);GPU.submit();await GPU.pipelinesReady();renderer.precompiling=false;GPU.beginFrame();setFrameCamera(camera,16,16,{block});renderer.render(rootA,pass);GPU.submit();await GPU.device.queue.onSubmittedWorkDone();assert.deepEqual(errors,[]);assert.ok(renderer.stats.draws>0);const shared=b.water.surface.shoreSim.lace;a.dispose();assert.equal(shared.gpu!==null,true);assert.ok(rootB.children.length>0);b.dispose();color.destroy();depth.destroy();GPU.device.destroy();console.log('Native island GPU construction, verified arrival, isolated vegetation uniforms, and shared lace lifetime passed.');
