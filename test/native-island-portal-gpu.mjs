import './headless.mjs';
import {PortalViews} from '../src/world-runtime/PortalViews.js';
import {RepositoryPortalSky} from '../src/world-runtime/RepositoryPortalSky.js';
import {BoxGeometry,Mesh,Vector3,Vector4} from '../src/engine/index.js';
import {Material} from '../src/engine/render/Material.js';
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
const a=await buildNativeIsland({project:{nativeIsland:{}},root:rootA,camera,options:{readNativeIsland:()=>{const s=source();s.ocean.surface={amplitude:8};s.ocean.surfaceExclusions=[{id:'left-half',min:[-100,-100,-100],max:[0,100,100]}];return s;},water:context,prepareVegetationAssets:async()=>{}}});
const b=await buildNativeIsland({project:{nativeIsland:{}},root:rootB,camera,options:{readNativeIsland:()=>{const s=source();s.ocean.level=9;return s;},water:context,prepareVegetationAssets:async()=>{}}});
// Deliberate 1px bark fixture: this validates shader integration, not scanned bark fidelity.
const bark=new Texture({width:1,height:1,format:'rgba8unorm',data:new Uint8Array([128,128,255,255])});
for(const island of [a,b])for(const material of island.vegetation.materials)for(const key of ['barkDiffuse','barknor_gl','barkarm'])material.bindings[key]={texture:bark};
assert.notEqual(a.vegetation.viewParams,b.vegetation.viewParams);assert.ok(Number.isNaN(a.data.heightAt(0,0)));
await a.ensureArrival([0,0,0]);assert.equal(a.data.heightAt(0,0),0);
a.bindView(camera);const old=b.vegetation.viewParams.fields.camPos.value.clone();camera.position.x=1;a.bindView(camera);assert.deepEqual(b.vegetation.viewParams.fields.camPos.value,old);
for(const mat of a.vegetation.materials){const modules=collectModules(mat.modules);assert.ok(modules.some(m=>Object.values(m.bindings).some(binding=>binding.uniform===a.vegetation.viewParams)));}
const errors=[];GPU.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
const createBuffer=GPU.device.createBuffer.bind(GPU.device);GPU.device.createBuffer=descriptor=>createBuffer(descriptor.label==='draws'?{...descriptor,usage:descriptor.usage|GPUBufferUsage.COPY_SRC}:descriptor);
const renderer=new MeshRenderer(),target=new RenderTarget(16,16,{colors:['rgba16float','rgba16float','rgba8unorm'],depth:'depth32float'}),block=createViewUniforms('native-smoke');camera.position.set(0,3,3);camera.lookAt(0,0,0);camera.updateMatrixWorld();a.bindView(camera);a.update(.016,camera);atmosphere.update(.016,3);
const pass={camera,frameBlock:block,kind:'main',cull:false,colorViews:target.textures.map(t=>t.view()),colorFormats:['rgba16float','rgba16float','rgba8unorm'],clearColors:[[0,0,0,0],[0,0,0,0],[0,0,0,0]],depthView:target.depthTexture.view(),depthFormat:'depth32float',clearDepth:0,depthCompare:'greater-equal'};
renderer.precompiling=true;setFrameCamera(camera,16,16,{block});renderer.render(rootA,pass);GPU.submit();await GPU.pipelinesReady();renderer.precompiling=false;GPU.beginFrame();setFrameCamera(camera,16,16,{block});renderer.render(rootA,pass);GPU.submit();await GPU.device.queue.onSubmittedWorkDone();assert.deepEqual(errors,[]);assert.ok(renderer.stats.draws>0);
// Exact native water MRT integration, two distinct mapped views and main in one GPU.frame.
rootA.removeFromParent();rootB.removeFromParent();
const mainCamera=new PerspectiveCamera(60,1,.1,2000);mainCamera.position.set(0,2,3);mainCamera.lookAt(0,2,0);
const views=new PortalViews({engine:{},meshRenderer:renderer,mainCamera,background:new RepositoryPortalSky({sky})});
const pose=(x)=>({position:[x,2,0],yaw:0,width:2,height:3});
views.setDestination('a',{candidate:{root:rootA,nativeIsland:a},ownsCandidate:false,source:pose(-.5),destination:pose(0),authorizedView:true,state:'live'});
views.setDestination('b',{candidate:{root:rootB,nativeIsland:b},ownsCandidate:false,source:pose(.5),destination:pose(0),authorizedView:true,state:'live'});
await views.whenReady('a');await views.whenReady('b');
assert.notEqual(views.entries.get('a').viewWater.material,views.entries.get('b').viewWater.material);
assert.equal(views.entries.get('a').viewWater.material.waterSurface,a.water.surface);
GPU.beginFrame();views.render({width:32,height:32,time:1});
assert.equal(views.entries.get('b').block.fields.seaLevel.value,9);assert.equal(views.entries.get('b').block.fields.cameraUnderwater.value,1);
const queryReadback=GPU.device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
GPU.getEncoder().copyBufferToBuffer(b.water.query.results.getGPU(),0,queryReadback,0,16);GPU.submit();
await queryReadback.mapAsync(GPUMapMode.READ);const nativeDestinationHeight=new Float32Array(queryReadback.getMappedRange())[0];assert.ok(nativeDestinationHeight>5&&nativeDestinationHeight<13,'GPU water query uses destination sea level 9, not main level 0');queryReadback.unmap();queryReadback.destroy();

assert.equal(views.entries.get('b').viewWater.refraction.block.fields.seaLevel.value,9);
assert.equal(views.entries.get('b').viewWater.refraction.block.fields.cameraPos.value.y,views.entries.get('b').camera.position.y);
assert.notEqual(views.entries.get('a').viewWater.refraction,views.entries.get('b').viewWater.refraction);
assert.equal(views.entries.get('a').viewWater.material.refraction,views.entries.get('a').viewWater.refraction);
assert.equal(views.entries.get('a').hasImage,true);assert.equal(views.entries.get('b').hasImage,true);
// New object appears only after the portal submissions: upload hook must rearm without a new frame.
const fresh=new Mesh(new BoxGeometry(1,1,1),new Material({lit:false}));fresh.position.set(1.25,.5,-2);rootA.add(fresh);
a.bindView(camera);setFrameCamera(camera,16,16,{block});renderer.render(rootA,pass);GPU.submit();
assert.equal(fresh.__draw.frame,GPU.frame);assert.ok(fresh.__draw.slot>0);
const drawReadback=GPU.device.createBuffer({size:256,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
GPU.getEncoder().copyBufferToBuffer(renderer.drawBuffer,fresh.__draw.slot*256,drawReadback,0,256);GPU.submit();
await drawReadback.mapAsync(GPUMapMode.READ);const uploadedMatrix=new Float32Array(drawReadback.getMappedRange()).slice(0,16);
assert.deepEqual([...uploadedMatrix.slice(12,15)],[1.25,.5,-2],'new object transform is uploaded into GPU draw buffer after prior view submits');
drawReadback.unmap();drawReadback.destroy();GPU.device.createBuffer=createBuffer;

await GPU.queue.onSubmittedWorkDone();assert.deepEqual(errors,[]);
GPU.beginFrame();views.render({width:64,height:32,time:2});GPU.submit();await GPU.queue.onSubmittedWorkDone();
assert.equal(views.entries.get('a').viewRenderer.width,64);views.setDestination('a',{authorizedView:false});
assert.equal(a.water.mesh.parent,rootA);assert.equal(views.entries.get('a').candidate,null);
views.clear();a.bindView(camera);renderer.render(rootA,pass);GPU.submit();await GPU.queue.onSubmittedWorkDone();assert.deepEqual(errors,[]);

// Read the water MRT mask: the destination clip plane must discard the real native surface.
const clipView=new (await import('../src/engine/render/SceneRenderer.js')).SceneRenderer(renderer,rootA,camera);
const clipWater=a.water.createView(clipView);clipView.setSize(16,16);
const waterMask=async (plane,portal=true)=>{
 GPU.beginFrame();a.bindView(camera,clipWater);setFrameCamera(camera,16,16,{block});block.fields.portalClipPlane.value=plane;
 clipView.render({frameBlock:block,defines:portal?{PORTAL_CLIP:1,PORTAL_VIEW:1}:{},filter:o=>o===a.water.mesh});
 const read=GPU.device.createBuffer({size:256*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
 const depthRead=GPU.device.createBuffer({size:256*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});GPU.getEncoder().copyTextureToBuffer({texture:clipView.sceneRT.depthTexture.getGPU(),aspect:'depth-only'},{buffer:depthRead,bytesPerRow:256},{width:16,height:16});
 GPU.getEncoder().copyTextureToBuffer({texture:clipView.waterMaskTexture.getGPU()},{buffer:read,bytesPerRow:256},{width:16,height:16});GPU.submit();
 await read.mapAsync(GPUMapMode.READ);await depthRead.mapAsync(GPUMapMode.READ);const data=new Uint8Array(read.getMappedRange()),depthData=new Float32Array(depthRead.getMappedRange());let count=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(data[y*256+x*4+1]>0){count++;const P=new Vector3((x+.5)/8-1,1-(y+.5)/8,depthData[y*64+x]).applyMatrix4(block.fields.invViewProj.value);assert.ok(!(P.x<-.0001&&P.x>-100&&P.y>-100&&P.y<100&&P.z>-100&&P.z<100),'mask/depth cannot survive inside displaced-world exclusion');}
 read.unmap();read.destroy();depthRead.unmap();depthRead.destroy();return count;
};
assert.equal(a.water.surfaceExclusionsEnforced,true);assert.ok(Object.isFrozen(a.water.surfaceExclusions[0].min));
assert.ok(await waterMask(new Vector4(0,0,0,1),false)>0,'main water outside exclusion survives');
clipWater.material.uniforms.debugMode.value=8;assert.ok(await waterMask(new Vector4(0,0,0,1))>0,'diagnostic portal water outside exclusion survives');
clipWater.material.uniforms.debugMode.value=0;
assert.ok(await waterMask(new Vector4(0,0,0,1))>0,'unclipped native water writes its mask');
assert.equal(await waterMask(new Vector4(0,0,0,-1)),0,'destination clip rejects water');

// Cheap shading has a separate output body, but must retain the same final-world exclusion.
clipWater.material.cheap=true;clipWater.material._built=false;clipWater.material.needsUpdate=true;
assert.ok(await waterMask(new Vector4(0,0,0,1),false)>0,'cheap main keeps water outside exclusion');
assert.ok(await waterMask(new Vector4(0,0,0,1),true)>0,'cheap portal keeps water outside exclusion');
// Isolated depth-only render uses the material shadow hook, with no color/mask output.
for(const portal of [false,true]){
 GPU.beginFrame();a.bindView(camera,clipWater);setFrameCamera(camera,16,16,{block});
 block.fields.portalClipPlane.value=new Vector4(0,0,0,1);
 const previousCast=a.water.mesh.castShadow;a.water.mesh.castShadow=true;
 renderer.render(rootA,{camera,frameBlock:block,kind:'depth',cull:false,defines:portal?{PORTAL_CLIP:1,PORTAL_VIEW:1}:{},filter:o=>o===a.water.mesh,depthView:clipView.sceneRT.depthTexture.view(),depthFormat:'depth32float',clearDepth:0,depthCompare:'greater-equal'});
 a.water.mesh.castShadow=previousCast;
 const depthOnly=GPU.device.createBuffer({size:256*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
 GPU.getEncoder().copyTextureToBuffer({texture:clipView.sceneRT.depthTexture.getGPU(),aspect:'depth-only'},{buffer:depthOnly,bytesPerRow:256},{width:16,height:16});GPU.submit();await depthOnly.mapAsync(GPUMapMode.READ);
 const depths=new Float32Array(depthOnly.getMappedRange());let kept=0,cleared=0;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const depth=depths[y*64+x];if(depth===0){cleared++;continue;}kept++;
  const P=new Vector3((x+.5)/8-1,1-(y+.5)/8,depth).applyMatrix4(block.fields.invViewProj.value);
  assert.ok(!(P.x<-.0001&&P.x>-100&&P.y>-100&&P.y<100&&P.z>-100&&P.z<100),'depth-only displaced water cannot survive inside exclusion');
 }
 assert.ok(kept>0,'depth-only outside water remains');assert.ok(cleared>0,'depth-only excluded water leaves cleared depth');
 depthOnly.unmap();depthOnly.destroy();
}
clipWater.dispose();clipView.dispose();assert.deepEqual(errors,[]);
console.log('Native water exclusions: main, portal, diagnostic, cheap-main, cheap-portal, depth-only-main and depth-only-portal pixel/depth readbacks passed; amplitude 8; zero validation errors.');

const shared=b.water.surface.shoreSim.lace;a.dispose();assert.equal(shared.gpu!==null,true);b.dispose();color.destroy();depth.destroy();GPU.device.destroy();
console.log('Two native portal MRT views plus main, submission rearm, resize, revoke and shared resources passed with zero GPU validation errors.');
