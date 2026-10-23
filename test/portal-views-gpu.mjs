// Native headless fixture: destination clipping + projective HDR aperture sampling.
import './headless.mjs';
import assert from 'node:assert/strict';
import * as N from '../src/engine/index.js';
import { GPU } from '../src/engine/gpu/GPU.js';
import { RenderTarget,Texture } from '../src/engine/gpu/Texture.js';
import { readTexture } from '../src/engine/gpu/Readback.js';
import { MeshRenderer } from '../src/engine/render/MeshRenderer.js';
import { Material } from '../src/engine/render/Material.js';
import { FrameUniforms,setFrameCamera } from '../src/engine/render/Frame.js';
import { setShadowMap } from '../src/engine/render/wgsl/lighting.js';
import { fromHalfFloat } from '../src/engine/math/DataUtils.js';
import {prepareNativeRepositoryResources} from '../src/world-runtime/NativeRepositoryReadiness.js';
import { PortalViews } from '../src/world-runtime/PortalViews.js';
const errors=[];
await GPU.init({headless:true});
if(process.argv.includes('--fallback'))GPU.features.delete('clip-distances');
GPU.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
setShadowMap(new Texture({width:1,height:1,depth:1,dimension:'2d-array',format:'depth32float',usage:['sample']}));
const mainCamera=new N.PerspectiveCamera(60,1,.05,100);mainCamera.position.set(0,0,3);mainCamera.lookAt(0,0,0);
const meshRenderer=new MeshRenderer(),views=new PortalViews({engine:{},meshRenderer,mainCamera}),root=new N.Group();
function panel(z,color) {const mesh=new N.Mesh(new N.PlaneGeometry(20,20),new Material({lit:false,color,side:'double'}));mesh.position.set(10,0,z);root.add(mesh);}
panel(1,'#ff0000');panel(-1,'#00ff00');
const source={position:[0,0,0],yaw:0,width:2,height:2},destination={position:[10,0,0],yaw:0};
const aperture=views.setDestination('fixture',{candidate:{root},authorizedView:true,state:'live',source,destination});
const scene=new N.Scene();scene.add(aperture);
await prepareNativeRepositoryResources({meshRenderer,camera:mainCamera,root});
await prepareNativeRepositoryResources({meshRenderer,camera:mainCamera,root:aperture});
const rt=new RenderTarget(128,128,{colors:['rgba16float'],depth:'depth32float'});
for(let i=0;i<3;i++) {
 GPU.beginFrame();setFrameCamera(mainCamera,128,128);
 views.render({width:128,height:128});
 meshRenderer.render(scene,{kind:'color',camera:mainCamera,frameBlock:FrameUniforms,colorViews:[rt.texture.view()],colorFormats:rt.formats,clearColors:[[0,0,0,1]],depthView:rt.depthTexture.view(),depthFormat:'depth32float',clearDepth:0});
 GPU.submit();await GPU.pipelinesReady();
}
const data=Float32Array.from(new Uint16Array((await readTexture(rt.texture)).data),fromHalfFloat);
const i=(64*128+64)*4;
assert.ok(data[i]>.9 && data[i+1]<.01,'destination red survives while near green wall is clipped');
assert.deepEqual(errors,[]);
// A foreground marker must move across the image as the source viewer translates.
const blue=new N.Mesh(new N.PlaneGeometry(.45,.45),new Material({lit:false,color:'#0000ff',side:'double'}));blue.position.set(10.6,0,.7);root.add(blue);
async function centroid(x) {
 mainCamera.position.x=x;
 for(let i=0;i<3;i++){GPU.beginFrame();setFrameCamera(mainCamera,128,128);views.render({width:128,height:128});GPU.submit();await GPU.pipelinesReady();}
 const target=views.entries.get('fixture').target.texture;
 const pixels=Float32Array.from(new Uint16Array((await readTexture(target)).data),fromHalfFloat);
 let sum=0,count=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++){const k=(y*128+x)*4;if(pixels[k+2]>.8&&pixels[k]<.1){sum+=x;count++;}}
 assert.ok(count>10,'foreground marker has rasterized samples');return sum/count;
}
const markerX=[await centroid(0),await centroid(.6)];
assert.ok(Math.abs(markerX[1]-markerX[0])>8,'destination changes parallax with viewer position');
// A retired candidate material must release its own renderer cache references
// while the remaining admitted destination continues to render correctly.
const cachedBefore=meshRenderer.pipelines.size,redMaterial=root.children[0].material;
blue.removeFromParent();blue.material.dispose();blue.geometry.dispose();
const cachedAfter=meshRenderer.pipelines.size;
assert.ok(cachedAfter<cachedBefore,'retired marker material cache was evicted');
assert.ok([...meshRenderer.pipelines.keys()].some(key=>key.startsWith(redMaterial.id+'.')),'remaining destination material remains cached');
for(let frame=0;frame<2;frame++){GPU.beginFrame();setFrameCamera(mainCamera,128,128);views.render({width:128,height:128});GPU.submit();await GPU.pipelinesReady();}
const remaining=Float32Array.from(new Uint16Array((await readTexture(views.entries.get('fixture').target.texture)).data),fromHalfFloat);
const center=(64*128+64)*4;assert.ok(remaining[center]>.9&&remaining[center+1]<.01&&remaining[center+2]<.01,'remaining candidate still renders red after peer material disposal');

assert.deepEqual(errors,[]);
console.log(JSON.stringify({cacheEviction:{cachedBefore,cachedAfter,remainingCandidateRed:true},markerX,fixture:'portal-native-hdr-clip',center:Array.from(data.slice(i,i+4)),clipFeature:GPU.features.has('clip-distances'),evidence:'synthetic native fixture only; not browser visual acceptance'}));
views.dispose();rt.texture.destroy();rt.depthTexture.destroy();GPU.device.destroy();
process.exit(0);
