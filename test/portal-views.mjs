import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as N from '../src/engine/index.js';
import { PortalViews,portalTargetSize,portalMappingMatrix,portalDestinationPlane } from '../src/world-runtime/PortalViews.js';
import { FrameUniforms,createViewUniforms,setFrameCamera } from '../src/engine/render/Frame.js';
import { Material } from '../src/engine/render/Material.js';
import { buildMeshShader } from '../src/engine/render/MeshShader.js';
import { GPU } from '../src/engine/gpu/GPU.js';
const pose=(position=[0,0,0],yaw=0)=>({position,yaw,width:2,height:3});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
test('upright mapping transforms position and direction through a half turn',()=>{
 const source=pose([3,2,7],Math.PI/2),destination=pose([20,4,-8],-.3),m=portalMappingMatrix(source,destination);
 const centre=new N.Vector3(...source.position).applyMatrix4(m);centre.toArray().forEach((v,i)=>close(v,destination.position[i]));
 const local=new N.Vector3(0,0,2).applyMatrix4(new N.Matrix4().makeRotationY(source.yaw)).add(new N.Vector3(...source.position));
 const mapped=local.applyMatrix4(m).sub(new N.Vector3(...destination.position));
 close(mapped.x,-2*Math.sin(destination.yaw));close(mapped.z,-2*Math.cos(destination.yaw));close(mapped.y,0);
 const back=portalMappingMatrix(destination,source);const roundtrip=new N.Matrix4().multiplyMatrices(back,m);
 roundtrip.elements.forEach((v,i)=>close(v,i%5===0?1:0));
});
test('all viewport shapes respect 512 long edge and 262144 texel limit',()=>{
 for(const [w,h] of [[1920,1080],[1080,1920],[4096,4096],[1,8192],[320,240]]){
  const s=portalTargetSize(w,h);assert.ok(s.width<=512&&s.height<=512);assert.ok(s.width*s.height<=262144);assert.ok(s.width>=1&&s.height>=1);
 }
});
test('destination clip plane retains front halfspace and excludes the near wall',()=>{
 for(const yaw of [0,.4,Math.PI/2,-2]){
  const d=pose([12,4,-5],yaw),p=portalDestinationPlane(d),n=new N.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const dot=v=>p.x*v.x+p.y*v.y+p.z*v.z+p.w;
  assert.ok(dot(new N.Vector3(...d.position).add(n))>0);
  assert.ok(dot(new N.Vector3(...d.position).sub(n))<0);
 }
});
test('view uniforms own their camera and clip plane, preserving global reverse Z',()=>{
 const a=createViewUniforms('a'),b=createViewUniforms('b'),camera=new N.PerspectiveCamera();camera.position.set(9,2,3);
 a.fields.portalClipPlane.value=new N.Vector4(1,0,0,-4);
 setFrameCamera(camera,512,256,{block:a});a.onBeforePack();
 assert.notEqual(a.fields.cameraPos.value,FrameUniforms.fields.cameraPos.value);
 assert.equal(a.fields.cameraPos.value.x,9);assert.equal(a.fields.reversedDepth.value,1);
 assert.equal(a.fields.portalClipPlane.value.w,-4);assert.equal(b.fields.portalClipPlane.value.w,0);
});
test('clipping emits hardware distance and fragment fallback variants',()=>{
 const mat=new Material({lit:false}),layout=[{name:'position',wgsl:'vec3f',location:0}],old=GPU.features;
 try{
  GPU.features=new Set();const fallback=buildMeshShader(mat,layout,{kind:'color',defines:{PORTAL_CLIP:1}});
  assert.ok(JSON.stringify(fallback).includes('portalClipPlane'));
  GPU.features=new Set(['clip-distances']);const hardware=buildMeshShader(mat,layout,{kind:'color',defines:{PORTAL_CLIP:1}});
  assert.ok(JSON.stringify(hardware).includes('clipDistances'));
 } finally{GPU.features=old;}
});
const setup=()=>new PortalViews({engine:{},meshRenderer:{render(){}},mainCamera:new N.PerspectiveCamera()});
test('authorization is explicit and previews cannot steal an active root',()=>{
 const views=setup(),candidate={root:new N.Group()};
 assert.throws(()=>views.setDestination('a',{candidate}),/authorizedView/);
 const parent=new N.Group();parent.add(candidate.root);
 assert.throws(()=>views.setDestination('a',{candidate,authorizedView:true}),/detached/);
 views.dispose();
});
test('two cached destinations maximum; revocation clears candidate and live image',()=>{
 const views=setup();
 for(let i=0;i<3;i++)views.setDestination('p'+i,{candidate:{root:new N.Group()},source:pose(),destination:pose(),authorizedView:true,state:'live'});
 assert.equal(views.entries.size,2);assert.equal(views.getAperture('p0'),null);
 const e=views.entries.get('p2');e.hasImage=true;views.setDestination('p2',{authorizedView:false});
 assert.equal(e.candidate,null);assert.equal(e.hasImage,false);assert.equal(e.aperture.userData.portalViewState,'restricted');
 views.dispose();assert.equal(views.entries.size,0);
});
test('source guards ensure projective sampling, detached direct HDR pass, and hard recursion stop',()=>{
 const source=readFileSync(new URL('../src/world-runtime/PortalViews.js',import.meta.url),'utf8');
 assert.match(source,/in.pixel \* frame.invResolution/);assert.match(source,/rgba16float/);
 assert.match(source,/frameBlock:e.block/);assert.match(source,/!o.userData.portalAperture/);
 assert.doesNotMatch(source,/\.activate\(|PostFX|\.join\(/);
});

test('render maps the actual camera pose without changing global camera state',()=>{
 const views=setup(),main=views.mainCamera;main.position.set(.3,1,3);main.lookAt(0,1,0);
 const root=new N.Group(),otherPortal=new N.Mesh(new N.PlaneGeometry(),new Material());otherPortal.userData.portalAperture=true;root.add(otherPortal);
 views.setDestination('a',{candidate:{root},source:pose(),destination:pose([10,0,0]),authorizedView:true,state:'live'});
 const e=views.entries.get('a');e.target.texture.view=()=>({});e.target.depthTexture.view=()=>({});e.target.setSize=()=>{};
 let pass;views.meshRenderer.render=(scene,p)=>{pass=p;assert.equal(scene,e.scene);};
 const globalPos=FrameUniforms.fields.cameraPos.value.clone();views.render({width:1600,height:900});
 close(e.camera.matrixWorld.elements[12],9.7);close(e.camera.matrixWorld.elements[14],-3);
 assert.equal(pass.filter(otherPortal),false);assert.equal(pass.defines.PORTAL_CLIP,1);
 assert.equal(pass.frameBlock,e.block);assert.notEqual(pass.frameBlock,FrameUniforms);
 assert.equal(e.aperture.userData.portalViewState,'live');
 assert.deepEqual(FrameUniforms.fields.cameraPos.value.toArray(),globalPos.toArray());
 main.position.z=-3;views.render({width:1600,height:900});
 assert.equal(e.aperture.userData.portalViewState,'cached');views.dispose();
});

test('native preview remains loading until resources ready; superseded completion cannot revive disposed scene',async()=>{
 const releases=[],views=new PortalViews({engine:{},meshRenderer:{render(){}},mainCamera:new N.PerspectiveCamera(),prepareResources:()=>new Promise(r=>releases.push(r))});
 const root=new N.Group();views.setDestination('pending',{candidate:{root},source:pose(),destination:pose([10,0,0]),authorizedView:true,state:'live'});
 const e=views.entries.get('pending');assert.equal(e.aperture.visible,false);assert.equal(e.aperture.userData.portalViewState,'loading');
 views.remove('pending');for(const release of releases)release();assert.equal(await e.readyPromise,false);assert.equal(root.parent,null);assert.equal(views.entries.size,0);
});
test('native preview readiness failure never publishes a live image',async()=>{
 const views=new PortalViews({engine:{},meshRenderer:{render(){}},mainCamera:new N.PerspectiveCamera(),prepareResources:async()=>{throw Error('pipeline failed');}});
 views.setDestination('failed',{candidate:{root:new N.Group()},source:pose(),destination:pose([10,0,0]),authorizedView:true,state:'live'});
 await assert.rejects(views.whenReady('failed'),/pipeline failed/);const e=views.entries.get('failed');assert.equal(e.state,'unavailable');assert.equal(e.hasImage,false);views.dispose();
});
