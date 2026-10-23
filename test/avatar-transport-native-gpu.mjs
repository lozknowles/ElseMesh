import './headless.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as N from '../src/engine/index.js';
import {GPU} from '../src/engine/gpu/GPU.js';
import {Texture,RenderTarget} from '../src/engine/gpu/Texture.js';
import {readTexture} from '../src/engine/gpu/Readback.js';
import {MeshRenderer} from '../src/engine/render/MeshRenderer.js';
import {FrameUniforms,setFrameCamera,G} from '../src/engine/render/Frame.js';
import {setShadowMap} from '../src/engine/render/wgsl/lighting.js';
import {fromHalfFloat} from '../src/engine/math/DataUtils.js';
import {SkinnedModel} from '../src/engine/render/Skinning.js';
import {parseGLB} from '../src/engine/loaders/GLTF.js';
import {avatarMaterialOptions,tintAvatar} from '../src/player/AvatarMaterials.js';
import {DEFAULT_APPEARANCE} from '../src/player/AvatarAppearance.js';
import {createPortalEffects} from '../src/world-runtime/RepositoryPortalEffects.js';
import {createAvatarTransportPresentation,createAvatarTransportMaterialAdapter} from '../src/world-runtime/AvatarTransportPresentation.js';
import {prepareNativeRepositoryResources} from '../src/world-runtime/NativeRepositoryReadiness.js';
globalThis.__assetImage=async bytes=>{const b=execFileSync('python3',['-c','from PIL import Image; import io,sys,struct; im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGBA"); sys.stdout.buffer.write(struct.pack("<II",*im.size)+im.tobytes())'],{input:bytes,maxBuffer:128*1024*1024});return {width:b.readUInt32LE(0),height:b.readUInt32LE(4),data:new Uint8Array(b.subarray(8))};};
await GPU.init({headless:true});const errors=[];GPU.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
const shadow=new Texture({width:1,height:1,depth:1,dimension:'2d-array',format:'depth32float',usage:['sample']});setShadowMap(shadow);
const target=new RenderTarget(256,256,{colors:['rgba16float'],depth:'depth32float'}),renderer=new MeshRenderer();
G.sunDir.value.set(.45,.75,.5).normalize();G.sunColor.value.setRGB(3,2.9,2.7);G.skyIrradiance.value.setRGB(.3,.36,.45);
const camera=new N.PerspectiveCamera(45,1,.05,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);
const scene=new N.Scene(),effects=createPortalEffects({isWebGL:false}),frame=effects.addFrame(scene,{id:'native',position:[0,0,0],width:2,height:3,visual:{frameColor:'#33ddff'}});
for(const child of [...frame.children])if(!child.userData.portalEffect)frame.remove(child);
async function raster(root,camera,{time=0,clip=false}={}){
 for(let n=0;n<2;n++){GPU.beginFrame();FrameUniforms.fields.time.value=time;setFrameCamera(camera,256,256);renderer.render(root,{kind:'color',camera,frameBlock:FrameUniforms,colorViews:[target.texture.view()],colorFormats:target.formats,clearColors:[[0,0,0,1]],depthView:target.depthTexture.view(),depthFormat:'depth32float',clearDepth:0,...clip?{defines:{PORTAL_CLIP:1}}:{}});GPU.submit();await GPU.pipelinesReady();}
 return Float32Array.from(new Uint16Array((await readTexture(target.texture)).data),fromHalfFloat);
}
const extent=5*Math.tan(Math.PI/8),region=(p,x,y,r=.17)=>{let n=0;for(let yy=0;yy<256;yy++)for(let xx=0;xx<256;xx++){if(Math.abs((xx/256*2-1)*extent-x)<r&&Math.abs((yy/256*2-1)*extent-y)<r&&p[(yy*256+xx)*4+2]>.05)n++;}return n;};
const coverage=[];for(const time of [0,.7,2.3]){effects.update(.05,time);const pixels=await raster(scene,camera,{time}),bins=[];for(let i=0;i<16;i++){const t=(i+.5)/16;bins.push(region(pixels,-1.13,-1.63+t*3.26),region(pixels,1.13,-1.63+t*3.26),region(pixels,-1.13+t*2.26,-1.63),region(pixels,-1.13+t*2.26,1.63));}for(const x of [-1.13,1.13])for(const y of [-1.63,1.63])bins.push(region(pixels,x,y,.2));assert.ok(bins.every(n=>n>2),'native perimeter edge/corner hole');assert.equal(region(pixels,0,0,.2),0);coverage.push(Math.min(...bins));}effects.dispose();
const bytes=readFileSync(new URL('../public/models/characters/stock-player.glb',import.meta.url)),gltf=parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),model=await SkinnedModel.create(gltf,{materials:avatarMaterialOptions});tintAvatar(model,DEFAULT_APPEARANCE);model.play('idle',{fade:.01});model.update(0);
// A cancelled textured model may be disposed before its recorded mipmaps submit.
// This reproduced the MSI startup 'Destroyed texture char6' validation error.
const cancelled=await SkinnedModel.create(gltf,{materials:avatarMaterialOptions});
assert.ok(GPU.encoder,'fixture must contain unsubmitted avatar mipmap commands');
cancelled.dispose();GPU.submit();await GPU.queue.onSubmittedWorkDone();
await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(errors,[],'cancelled avatar destroyed a texture before queued mipmaps submitted');
const avatarScene=new N.Scene(),avatarRoot=new N.Group();avatarRoot.add(model.group);avatarScene.add(avatarRoot);camera.position.set(0,1,3.4);camera.lookAt(0,1,0);let clock=1000;
const presentation=createAvatarTransportPresentation({root:avatarRoot,now:()=>clock,materialAdapter:createAvatarTransportMaterialAdapter(()=>model.materials)});
GPU.beginFrame();setFrameCamera(camera,256,256);await prepareNativeRepositoryResources({meshRenderer:renderer,camera,root:avatarRoot});
await raster(avatarScene,camera,{clip:true});await raster(avatarScene,camera);
const before=renderer.pipelines.size,syncBefore=GPU.syncCompiles?.length??0,count=p=>{let n=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>.1)n++;return n;};
presentation.update();const full=count(await raster(avatarScene,camera));assert.ok(full>500,'actual original model did not render');
const record={protocol:'elsemesh.portal-presentation/1',type:'portal-arrival',transferId:'native:fixture',playerNodeId:'node:fixture',sourceWorldId:'A',destinationWorldId:'B',destinationGeneration:1,committedAt:1000,expiresAt:4000};assert.equal(presentation.observeVerifiedTransfer(record,'B'),true);
const energy=count(await raster(avatarScene,camera));presentation.group.visible=false;const empty=count(await raster(avatarScene,camera));clock=1750;presentation.update();const half=count(await raster(avatarScene,camera));presentation.group.visible=true;clock=2500;presentation.update();const complete=count(await raster(avatarScene,camera));
assert.equal(empty,0,'original native skin not dissolved');assert.ok(half>0&&half<full,'native skin did not reconstruct');assert.equal(complete,full);assert.ok(energy>20,'native scene energy missing');assert.equal(renderer.pipelines.size,before,'new pipeline on native arrival');assert.equal(GPU.syncCompiles?.length??0,syncBefore,'synchronous native arrival compile');assert.deepEqual(errors,[]);
console.log(JSON.stringify({fixture:'Native original textured skin materialisation and closed rim',minimumEdgeCornerPixels:coverage,full,empty,half,complete,energy,pipelines:before,newArrivalPipelines:0,newArrivalSyncCompiles:0,errors}));
presentation.dispose();model.dispose();shadow.destroy();target.texture.destroy();target.depthTexture.destroy();GPU.device.destroy();process.exit(0);
