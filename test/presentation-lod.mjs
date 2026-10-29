import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../src/engine/index.js';
import {Material} from '../src/engine/render/Material.js';
import {MeshRenderer} from '../src/engine/render/MeshRenderer.js';
import {registerGeometryLOD, presentationLODLevel, projectedLODPixels, withPresentationLOD, installWebGLPresentationLOD} from '../src/engine/render/PresentationLOD.js';
import {installRepositoryPrimitiveLOD} from '../src/world-runtime/RepositoryPrimitiveLOD.js';
import {T,createWorld,describeRuntimeWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {buildRepositoryScene,disposeRepositoryScene} from '../src/world-runtime/RepositoryScene.js';
import {buildWebGLRepositoryScene,disposeWebGLRepositoryScene} from '../src/world-runtime/WebGLRepositoryScene.js';

function fixture(E=N) {
 const scene=new E.Scene(),mesh=new E.Mesh(new E.SphereGeometry(.8,24,16),E===N?new Material():new E.MeshStandardMaterial());scene.add(mesh);
 mesh.castShadow=true;const full=mesh.geometry,c=installRepositoryPrimitiveLOD(mesh,'sphere',{api:E}),camera=new E.PerspectiveCamera(60,1,.05,1000);camera.position.z=100;camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 return {scene,mesh,full,c,camera,low:c.bindings[0].geometries[1]};
}

test('native draw records select real reduced geometry per camera/viewport without mutating canonical physics/picking geometry',()=>{
 const {scene,mesh,full,camera,low}=fixture(),mr=new MeshRenderer(),near=camera.clone();near.position.z=2;
 const collect=(camera,height,kind='main')=>mr.collect(scene,{camera,cull:false,kind,frameBlock:{fields:{resolution:{value:{y:height}}}}}).opaque[0].geometry;
 assert.equal(collect(camera,512),low);assert.equal(collect(near,512),full);assert.equal(collect(camera,8192),full);assert.equal(collect(camera,512,'depth'),full);
 mr.precompiling=true;assert.equal(collect(camera,512),full);mr.precompiling=false;
 assert.equal(mesh.geometry,full);assert.equal(low.boundingSphere,full.boundingSphere);assert.ok(low.index.count < full.index.count*.3);
});

test('WebGL nested main/portal views and exceptional draw restore exact original geometry',()=>{
 const {scene,mesh,full,camera,low}=fixture(T),near=camera.clone();near.position.z=2;
 assert.throws(()=>withPresentationLOD(scene,camera,512,()=>{assert.equal(mesh.geometry,low);withPresentationLOD(scene,near,512,()=>assert.equal(mesh.geometry,full));assert.equal(mesh.geometry,low);throw Error('injected draw');}),/injected draw/);
 assert.equal(mesh.geometry,full);
});

test('independent view hysteresis and near-plane/invalid projection conservatively retain full detail',()=>{
 const {c,camera}=fixture(),near=camera.clone();near.position.z=2;near.updateMatrixWorld();
 assert.equal(presentationLODLevel(c,camera,512),1);assert.equal(presentationLODLevel(c,near,512),0);
 const pixels=projectedLODPixels(c,camera,512);assert.equal(presentationLODLevel(c,camera,512*30/pixels),1,'hysteresis holds low');
 assert.equal(presentationLODLevel(c,near,512*30/projectedLODPixels(c,near,512)),0,'other view holds full');
 near.position.z=.1;near.updateMatrixWorld();assert.equal(presentationLODLevel(c,near,512),0);assert.equal(presentationLODLevel(c,camera,NaN),0);
});

test('orthographic viewport scale, parent transforms and shear are included in conservative projected bounds',()=>{
 const {scene,mesh,c}=fixture(T),camera=new T.OrthographicCamera(-100,100,100,-100,.1,1000);camera.position.z=100;camera.updateMatrixWorld();
 assert.equal(presentationLODLevel(c,camera,512),1);mesh.scale.set(20,20,20);scene.updateMatrixWorld(true);assert.equal(presentationLODLevel(c,camera,512),0);
 mesh.matrixAutoUpdate=false;mesh.matrix.set(1,8,0,0,0,1,0,0,0,0,1,0,0,0,0,1);scene.updateMatrixWorld(true);assert.ok(projectedLODPixels(c,camera,512)>15);
});

test('visible off-axis spheres retain conservative pixel size near a frustum edge',()=>{
 const {scene,mesh,c,camera}=fixture(T);camera.position.set(0,0,0);camera.lookAt(0,0,-1);mesh.position.set(0,10,-20);scene.updateMatrixWorld(true);camera.updateMatrixWorld();
 const onAxis=380*.8*Math.abs(camera.projectionMatrix.elements[5])/Math.sqrt(400-.64);
 assert.ok(projectedLODPixels(c,camera,380)>onAxis*1.11);assert.equal(presentationLODLevel(c,camera,380),0,'off-axis full detail cannot use the smaller on-axis threshold');
});

test('WebGL renderer uses actual target height and bypasses internal shadows and resource preparation',()=>{
 const {scene,mesh,full,camera,low}=fixture(T),seen=[];
 const r={shadowMap:{enabled:false},getRenderTarget:()=>({height:512}),render(){seen.push(mesh.geometry);}};installWebGLPresentationLOD(r);
 r.render(scene,camera);r.shadowMap.enabled=true;r.render(scene,camera);r.shadowMap.enabled=false;r.presentationLODPreparing=true;r.render(scene,camera);
 assert.deepEqual(seen,[low,full,full]);assert.equal(mesh.geometry,full);
});

test('disposal removes policy and retires owned reduced geometry once',()=>{
 const {scene,mesh,full,camera,low,c}=fixture(T);let retired=0;low.addEventListener('dispose',()=>retired++);mesh.userData.disposePresentationLOD();mesh.userData.disposePresentationLOD();
 withPresentationLOD(scene,camera,512,()=>assert.equal(mesh.geometry,full));assert.equal(c.disposed,true);assert.equal(retired,1);
});

test('internal LOD ownership never enters serializable metadata or breaks canonical cloning',()=>{
 for(const E of [N,T]){const {mesh,full,c}=fixture(E);assert.doesNotThrow(()=>JSON.stringify(mesh.userData));const clone=mesh.clone();assert.equal(clone.geometry,full);assert.equal(clone.userData.presentationLOD,undefined);assert.equal(mesh.userData.presentationLOD,c);mesh.userData.disposePresentationLOD();}
});

for(const native of [true,false])test(`${native?'native':'WebGL'} repository primitives preserve authored descriptor, transforms, material and exact collider records`,async()=>{
 const p=createWorld('LOD');p.terrain.heights.fill(0);p.objects.push({id:'curved',kind:'sphere',name:'sphere',position:[2,1,0],rotation:[0,.2,0],scale:[1,2,1],color:'#ff0000',visible:true,collision:'solid'});
 const d=describeRuntimeWorld(p),before=JSON.stringify(d.project),camera=native?new N.PerspectiveCamera():new T.PerspectiveCamera(),candidate=await(native?buildRepositoryScene:buildWebGLRepositoryScene)(d,camera);
 try{const root=candidate.root.children.find(n=>n.userData.editorObjectId==='curved'),mesh=root.children[0],full=mesh.geometry,material=mesh.material,boxes=JSON.stringify(candidate.colliders.boxes);
  camera.position.z=200;withPresentationLOD(candidate.root,camera,512,()=>{assert.notEqual(mesh.geometry,full);assert.equal(mesh.material,material);assert.equal(JSON.stringify(candidate.colliders.boxes),boxes);});
  assert.equal(JSON.stringify(d.project),before);assert.equal(mesh.geometry,full);assert.deepEqual(root.matrix.elements.slice(12,15),[2,1,0]);
 }finally{(native?disposeRepositoryScene:disposeWebGLRepositoryScene)(candidate);}
});
