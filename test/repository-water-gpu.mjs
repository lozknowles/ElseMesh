import './headless.mjs';
import assert from 'node:assert/strict';
import { GPU } from '../src/engine/gpu/GPU.js';
import { RenderTarget,Texture } from '../src/engine/gpu/Texture.js';
import { FullscreenPass } from '../src/engine/render/FullscreenPass.js';
import { readTexture } from '../src/engine/gpu/Readback.js';
import { PerspectiveCamera } from '../src/engine/index.js';
import { setFrameCamera,FrameUniforms } from '../src/engine/render/Frame.js';
import { fromHalfFloat } from '../src/engine/math/DataUtils.js';
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
 u.set('waterEnabled',enabled);u.set('storm',storm);camera.position.set(x,y,0);FrameUniforms.fields.time.value=time;
 for(let i=0;i<2;i++){GPU.beginFrame();setFrameCamera(camera,8,8);
 const clear=GPU.encoder.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:depth.view(),depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:0}});clear.end();
 composite.render({colorViews:[rt.texture],clear:[0,0,0,1]});mask.render({colorViews:[maskRT.texture],clear:[0,0,0,1]});GPU.submit();await GPU.pipelinesReady();}
 const color=Float32Array.from(new Uint16Array((await readTexture(rt.texture)).data),fromHalfFloat);
 const maskData=Float32Array.from(new Uint16Array((await readTexture(maskRT.texture)).data),fromHalfFloat);
 return {color:Array.from(color.slice(0,4)),mask:maskData[0]};
}
const dry=await render({y:-1,enabled:0});assert.equal(dry.mask,0);assert.equal(dry.color[0],1);
const above=await render({y:1});assert.equal(above.mask,0);assert.equal(above.color[0],1);
const wet=await render({y:-1});assert.equal(wet.mask,1);assert.ok(wet.color[0]<wet.color[2]);assert.ok(wet.color[0]<.1);
const outside=await render({x:51,y:-1});assert.equal(outside.mask,0);assert.equal(outside.color[0],1);
const storm=await render({y:1,storm:1});assert.ok(Math.abs(storm.color[0]-.34)<.001);
const waveBelow=await render({y:.2,time:Math.PI/2/1.2});assert.equal(waveBelow.mask,1);
const waveAbove=await render({y:.2,time:Math.PI*1.5/1.2});assert.equal(waveAbove.mask,0);
assert.deepEqual(errors,[]);console.log(JSON.stringify({fixture:'repository-water-medium',dry,wet,storm,waveMasks:[waveBelow.mask,waveAbove.mask],validationErrors:errors.length,evidence:'synthetic GPU fixture; not browser visual acceptance'}));
GPU.device.destroy();process.exit(0);
