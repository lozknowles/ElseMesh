import './headless.mjs';
import assert from 'node:assert/strict';
import { GPU } from '../src/engine/gpu/GPU.js';
import { RenderTarget,Texture } from '../src/engine/gpu/Texture.js';
import { FullscreenPass } from '../src/engine/render/FullscreenPass.js';
import { readTexture } from '../src/engine/gpu/Readback.js';
import { PerspectiveCamera } from '../src/engine/index.js';
import { setFrameCamera,FrameUniforms } from '../src/engine/render/Frame.js';
import { fromHalfFloat } from '../src/engine/math/DataUtils.js';
import { repositoryWeatherShelters,setMistShelters } from '../src/world-runtime/WeatherShelter.js';
import { createDryWorldMedium } from '../src/world-runtime/DriftingMist.js';
await GPU.init({headless:true});const errors=[];GPU.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
const depth=new Texture({width:8,height:8,format:'depth32float',usage:['sample','render']});
const medium=createDryWorldMedium(depth),u=medium.uniforms;
u.set('density',0);u.set('waterLevel',0);u.set('waveAmplitude',.4);u.set('waveSpeed',1.2);u.set('waterExtent',100);
const rt=new RenderTarget(8,8,{colors:['rgba16float']}),maskRT=new RenderTarget(8,8,{colors:['rgba16float']});
const composite=new FullscreenPass({modules:[medium.compositeModule],code:'fn postSceneSample(uv:vec2f)->vec3f{return vec3f(1.0);} fn fragment(in:FSIn)->vec4f{return underwaterComposite(in.uv,in.pos.xy);}'});
const mask=new FullscreenPass({modules:[medium.module],code:'fn fragment(in:FSIn)->vec4f{return vec4f(underwaterMedium(in.uv),0.0,0.0,1.0);}'});
const camera=new PerspectiveCamera(60,1,.1,100);
async function render({x=0,y=1,enabled=1,storm=0,time=0}) {
 u.set('waterEnabled',enabled);u.set('storm',storm);camera.position.set(x,y,-77);camera.lookAt(x,y,-100);camera.updateMatrixWorld();FrameUniforms.fields.time.value=time;
 for(let i=0;i<2;i++){GPU.beginFrame();setFrameCamera(camera,8,8);
 const clear=GPU.encoder.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:depth.view(),depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:.02}});clear.end();
 composite.render({colorViews:[rt.texture],clear:[0,0,0,1]});mask.render({colorViews:[maskRT.texture],clear:[0,0,0,1]});GPU.submit();await GPU.pipelinesReady();}
 const color=Float32Array.from(new Uint16Array((await readTexture(rt.texture)).data),fromHalfFloat);
 const maskData=Float32Array.from(new Uint16Array((await readTexture(maskRT.texture)).data),fromHalfFloat);
 return {color:Array.from(color.slice(0,4)),mask:maskData[0]};
}

const project={objects:[{id:'warehouse:object:0329',name:'weathered roof',kind:'glb',assetId:'warehouse:box-steel',collision:'solid',position:[0,15,-77],rotation:[0,0,0],scale:[32,.32,30],visible:false},{id:'warehouse:object:0000',name:'polished tiled warehouse floor',kind:'glb',position:[0,2.85,-77],rotation:[0,0,0],scale:[32,.3,30],visible:true}]};
u.set('density',.4);u.set('height',100);u.set('base',3);
const open=await render({y:5,enabled:0});
setMistShelters(u,repositoryWeatherShelters(project));
const sheltered=await render({y:5,enabled:0});
const exterior=await render({x:20,y:5,enabled:0});
assert.ok(open.color[0]<.95);assert.equal(sheltered.color[0],1);assert.ok(exterior.color[0]<.95);assert.deepEqual(errors,[]);
console.log(JSON.stringify({fixture:'native bounded shelter mist pixel readback',open,sheltered,exterior,validationErrors:errors.length,evidence:'synthetic GPU fixture; not full warehouse visual acceptance'}));GPU.device.destroy();process.exit(0);
