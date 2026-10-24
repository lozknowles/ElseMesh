
import {writePNG} from './headless.mjs';
import {FullscreenPass} from '../src/engine/render/FullscreenPass.js';
import {RenderTarget} from '../src/engine/gpu/Texture.js';
import {FrameUniforms} from '../src/engine/render/Frame.js';
import {mkdir} from 'node:fs/promises';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {GPU} from '../src/engine/gpu/GPU.js';
import {Scene,PerspectiveCamera} from '../src/engine/index.js';
import {Texture} from '../src/engine/gpu/Texture.js';
import {MeshRenderer} from '../src/engine/render/MeshRenderer.js';
import {SceneRenderer} from '../src/engine/render/SceneRenderer.js';
import {createViewUniforms,setFrameCamera} from '../src/engine/render/Frame.js';
import {setShadowMap} from '../src/engine/render/wgsl/lighting.js';
import {Atmosphere} from '../src/sky/Atmosphere.js';
import {Sky} from '../src/sky/Sky.js';
import {RefractionPass} from '../src/ocean/RefractionPass.js';
import {Terrain} from '../src/world/Terrain.js';
import {buildNativeIsland} from '../src/world-runtime/NativeIsland.js';
import {readNativeIslandSource} from '../src/world-runtime/NativeIslandSource.js';
const started=performance.now(),mark=(phase,data={})=>console.log(JSON.stringify({phase,ms:Math.round(performance.now()-started),...data}));
const directory=process.argv[2]??process.env.ELSEMESH_NATIVE_WORLD_ROOT;
if(!directory)throw Error('Native startup fixture requires a world directory argument or ELSEMESH_NATIVE_WORLD_ROOT; see tools/worlds/NATIVE-ISLAND-EXPORT.md.');
await readFile(join(directory,'world.json')).catch(error=>{throw Error('Missing native startup world fixture: '+error.message);});
mark('start');await GPU.init({headless:true});mark('gpu-init');
const errors=[];GPU.device.addEventListener('uncapturederror',e=>{errors.push(e.error.message);mark('GPU-error',{message:e.error.message});});

const manifest=JSON.parse(await readFile(join(directory,'world.json'),'utf8'));
const {nativeIsland}=JSON.parse(await readFile(join(directory,manifest.components.connections.path),'utf8'));
const refs=new Map([...nativeIsland.resources,...nativeIsland.assets].map(r=>[r.id,r]));
const source=await readNativeIslandSource({nativeIsland},async id=>{const ref=refs.get(id),bytes=await readFile(join(directory,ref.path));if(createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw Error('hash');return{ref,data:ref.format==='vegetation-json'?JSON.parse(bytes.toString()):ref.format==='f32le'?new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)):new Uint8Array(bytes)};});
mark('verified-source',{records:Object.values(source.records).filter(Array.isArray).reduce((n,a)=>n+a.length,0),domain:source.domain,...source.sourceStats()});
const prepareVegetationAssets=async source=>{
 const maps={palm:{},tree:{}};for(const set of ['palm','tree'])for(const [slot,name]of [['albedo','Diffuse'],['normal','nor_gl'],['orm','arm']]){
  const ref=refs.get(source.vegetationTextures[set][slot]);const decoded=spawnSync('python3',['-c','from PIL import Image;import sys;im=Image.open(sys.argv[1]).convert("RGBA");sys.stdout.buffer.write(im.tobytes())',join(directory,ref.path)],{maxBuffer:32*1024*1024});if(decoded.status)throw Error(decoded.stderr.toString());
  maps[set]['bark'+name]=new Texture({label:ref.id,width:ref.width,height:ref.height,format:name==='Diffuse'?'rgba8unorm-srgb':'rgba8unorm',data:new Uint8Array(decoded.stdout)});
  mark('bark-decoded',{id:ref.id,bytes:decoded.stdout.length});
 }
 maps.dispose=()=>{for(const set of ['palm','tree'])for(const texture of Object.values(maps[set]))texture.destroy();};return maps;
};
const shadow=new Texture({width:1,height:1,depth:4,dimension:'2d-array',format:'depth32float',usage:['sample','render']});setShadowMap(shadow);
const camera=new PerspectiveCamera(60,1,.1,60000);camera.position.set(-4,5,-75);camera.lookAt(0,20,0);
const root=new Scene(),mr=new MeshRenderer(),sr=new SceneRenderer(mr,root,camera);sr.setSize(128,128);
const atmosphere=new Atmosphere(),sky=new Sky(atmosphere);
mark('native-build-start');
const island=await buildNativeIsland({project:{nativeIsland},root,camera,options:{readNativeIsland:async()=>source,prepareVegetationAssets,water:{sky,sceneCopy:sr.opaqueCopy,sceneDepthHalf:sr.opaqueDepthHalf.texture}}});
mark('native-build-end',{vegetation:island.vegetation.stats()});
mark('arrival-start');await island.ensureArrival([-4,5,-75]);mark('arrival-end');
GPU.beginFrame();mark('bind-view-start');island.bindView(camera);mark('bind-view-end');
mark('native-update-start');island.update(.016,camera);mark('native-update-end');
GPU.submit();mark('initial-submit');await GPU.queue.onSubmittedWorkDone();mark('initial-GPU-done');
const block=createViewUniforms('real-startup');setFrameCamera(camera,128,128,{block});
mr.precompiling=true;mark('pipeline-prepare-start');sr.render({prepare:true,frameBlock:block});mr.precompiling=false;GPU.submit();mark('pipeline-prepare-recorded');await GPU.pipelinesReady();mark('pipeline-prepare-ready',{pipelines:mr.pipelines.size});
GPU.beginFrame();mark('first-frame-start');island.update(.016,camera);sr.render({frameBlock:block});GPU.submit();mark('first-frame-submitted');await GPU.queue.onSubmittedWorkDone();mark('usable-frame',{draws:mr.stats.draws,triangles:mr.stats.triangles,errors:errors.length,stats:island.stats(),syncCompiles:GPU.syncCompiles});

if(process.env.DIAG_WATER){
 const out='.local-evidence/native-island-20261024/water-domain';await mkdir(out,{recursive:true});
 camera.position.set(0,1000,-1200);camera.lookAt(0,0,0);camera.updateMatrixWorld();sr.setSize(512,512);
 FrameUniforms.fields.sunColor.value.setRGB(100,95,85);FrameUniforms.fields.skyIrradiance.value.setRGB(1,.9,.8);
 atmosphere.update(.016,1000);
 const image=new RenderTarget(512,512,{colors:['rgba8unorm']});
 const display=new FullscreenPass({label:'diagnostic display',colorFormats:['rgba8unorm'],bindings:{src:{texture:sr.sceneRT.texture}},code:'fn fragment(in:FSIn)->vec4f{let c=max(textureLoad(src,vec2i(in.pos.xy),0).rgb,vec3f(0.0));return vec4f(pow(c/(c+vec3f(1.0)),vec3f(1.0/2.2)),1.0);}'});
 await GPU.pipelinesReady();
 // Drain all requested tiles before comparisons: same source fields, camera, sea state.
 island.bindView(camera);GPU.submit();await new Promise(resolve=>setTimeout(resolve,3000));GPU.submit();await GPU.queue.onSubmittedWorkDone();
 for(const [label,debug]of [['color',0],['opaque-source',7],['sampled-depth',8],['opaque-depth',9],['ssr-weight',10],['path',6],['color-no-ssr',0]]){
  GPU.beginFrame();setFrameCamera(camera,512,512,{block});island.bindView(camera);island.water.material.uniforms.debugMode.value=debug;if(label==='color-no-ssr')island.water.material.params.ssr.value=0;
  sr.render({frameBlock:block});display.render({colorViews:[image.texture]});
  const read=GPU.device.createBuffer({size:512*512*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  GPU.getEncoder().copyTextureToBuffer({texture:image.texture.getGPU()},{buffer:read,bytesPerRow:512*4},{width:512,height:512});GPU.submit();await read.mapAsync(GPUMapMode.READ);
  writePNG(out+'/'+label+'.png',512,512,new Uint8Array(read.getMappedRange()));read.unmap();read.destroy();mark('water-diagnostic-image',{label});
 }

 if(process.env.DIAG_SKIRT){
  // Diagnostic only: extend rendered deep floor around the admitted square, keeping all original samples.
  const floor=new Terrain({scene:root,terrainData:{size:source.domain.size*8,boundsFor:()=>[-92,source.domain.res]},terrainGPU:island.gpu,appearance:source.appearance,caveMouth:false});
  const lo=source.domain.origin,hi=lo+source.domain.size;
  floor.surfaceCode+='\nif(all(in.P.xz>vec2f('+lo+'.0)) && all(in.P.xz<vec2f('+hi+'.0))){discard;}';
  floor.finalizeMaterial();floor.update(camera,0);
  mr.precompiling=true;sr.render({prepare:true,frameBlock:block});mr.precompiling=false;GPU.submit();await GPU.pipelinesReady();
  for(const [label,debug]of [['color-skirt',0],['opaque-source-skirt',7]]){
   GPU.beginFrame();setFrameCamera(camera,512,512,{block});island.bindView(camera);floor.update(camera,0);island.water.material.uniforms.debugMode.value=debug;
   sr.render({frameBlock:block});display.render({colorViews:[image.texture]});
   const read=GPU.device.createBuffer({size:512*512*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
   GPU.getEncoder().copyTextureToBuffer({texture:image.texture.getGPU()},{buffer:read,bytesPerRow:512*4},{width:512,height:512});GPU.submit();await read.mapAsync(GPUMapMode.READ);
   writePNG(out+'/'+label+'.png',512,512,new Uint8Array(read.getMappedRange()));read.unmap();read.destroy();mark('water-diagnostic-image',{label});
  }
 }

 if(process.env.DIAG_REFRACTION){
  setFrameCamera(camera,512,512);
  const refr=new RefractionPass({meshRenderer:mr,scene:root,camera,sceneRenderer:sr,scale:.5});
  sr.onBeforeWater=()=>refr.render(island.water.seaLevel);
  island.water.material.refraction=refr;island.water.material._built=false;island.water.material.needsUpdate=true;
  mr.precompiling=true;refr.render(island.water.seaLevel);sr.render({prepare:true,frameBlock:block});mr.precompiling=false;GPU.submit();await GPU.pipelinesReady();
  for(const [label,debug]of [['color-refraction',0],['source-refraction',7],['coverage-refraction',13],['path-refraction',6]]){
   GPU.beginFrame();setFrameCamera(camera,512,512,{block});setFrameCamera(camera,512,512);island.bindView(camera);island.water.material.uniforms.debugMode.value=debug;
   sr.render({frameBlock:block});display.render({colorViews:[image.texture]});
   const read=GPU.device.createBuffer({size:512*512*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
   GPU.getEncoder().copyTextureToBuffer({texture:image.texture.getGPU()},{buffer:read,bytesPerRow:512*4},{width:512,height:512});GPU.submit();await read.mapAsync(GPUMapMode.READ);
   writePNG(out+'/'+label+'.png',512,512,new Uint8Array(read.getMappedRange()));read.unmap();read.destroy();mark('water-diagnostic-image',{label});
  }
 }
 mark('water-diagnostic-finished',{errors:errors.length,stats:island.stats().residentTiles});
}
island.dispose();sr.dispose();GPU.device.destroy();if(errors.length)process.exitCode=1;
