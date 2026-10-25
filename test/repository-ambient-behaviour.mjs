import {localRepositorySource} from '../src/world-runtime/LocalRepositoryFiles.js';
import {RepositoryWorldHost} from '../src/world-runtime/RepositoryWorldHost.js';
import {NativeWeather} from '../src/world-runtime/NativeWeather.js';
import {configureWebGLRepositoryScene,updateWebGLRepositoryEnvironment} from '../src/world-runtime/WebGLRepositoryBackend.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {T,createWorld,describeRuntimeWorld,inspectGlbJson,packWorldRepository,evaluateAmbientBehaviour,sampleTerrain} from '../src/world-runtime/vendor/world-engine-contract.js';
import * as N from '../src/engine/index.js';
import {createRepositoryAmbientBehaviour} from '../src/world-runtime/RepositoryAmbientBehaviour.js';
import {buildWebGLRepositoryScene,disposeWebGLRepositoryScene} from '../src/world-runtime/WebGLRepositoryScene.js';
import {buildRepositoryScene,disposeRepositoryScene} from '../src/world-runtime/RepositoryScene.js';

const behaviour=kind=>({schema:'elsemesh.ambient-behaviour/1',kind,speed:1,radius:3,seed:7319});
const close=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<1e-5,`component ${i}: ${a[i]} != ${b[i]}`);};
for(const [backend,E]of [['webgl',T],['webgpu',N]])test(backend+' moving indices share primitive batches, preserve affine transforms and replay deterministically',()=>{
 const p=createWorld('ambient');p.terrain.heights.fill(-4);p.water={level:0};
 const base=new T.Matrix4().compose(new T.Vector3(4,3,5),new T.Quaternion().setFromEuler(new T.Euler(.2,.7,.3)),new T.Vector3(2,3,4));
 base.multiply(new T.Matrix4().set(1,.15,0,0,0,1,.2,0,0,0,1,0,0,0,0,1));
 const original=base.elements.slice(),staticBase=new T.Matrix4().makeTranslation(-5,2,-3),matrices=new Map([['moving',base],['static',staticBase]]);
 const objects=[{id:'moving',ambientBehaviour:behaviour('bird-flight')},{id:'static'}],a=new E.InstancedMesh(new E.BoxGeometry(),null,2),b=new E.InstancedMesh(new E.BoxGeometry(),null,2),staticBatch=new E.InstancedMesh(new E.BoxGeometry(),null,1);
 for(const mesh of [a,b]){mesh.setMatrixAt(0,base);mesh.setMatrixAt(1,staticBase);}
 staticBatch.setMatrixAt(0,staticBase);
 const controller=createRepositoryAmbientBehaviour(p);controller.register(a,objects,matrices);controller.register(b,objects,matrices);controller.register(staticBatch,[objects[1]],matrices);
 assert.equal(controller.objectCount,1);assert.equal(controller.batchCount,2);assert.equal(a.frustumCulled,false);assert.notEqual(staticBatch.frustumCulled,false);
 controller.update(5);const moved=new T.Matrix4();a.getMatrixAt(0,moved);const pose=evaluateAmbientBehaviour(objects[0].ambientBehaviour,[4,3,5],Math.atan2(base.elements[8],base.elements[10]),5,{groundHeight:(x,z)=>sampleTerrain(p.terrain,x,z),waterLevel:0,bounds:p.terrain});
 close(moved.elements.slice(12,15),pose.position);assert.notDeepEqual(moved.elements,original);
 // Left multiplication by a yaw preserves the full authored affine Gram matrix.
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){const dot=m=>[0,1,2].reduce((sum,k)=>sum+m[i*4+k]*m[j*4+k],0);assert.ok(Math.abs(dot(moved.elements)-dot(original))<1e-4);}
 const second=new T.Matrix4();b.getMatrixAt(0,second);close(second.elements,moved.elements);
 a.getMatrixAt(1,second);close(second.elements,staticBase.elements);assert.deepEqual(base.elements,original);
 const replay=moved.elements.slice();controller.update(10);controller.update(5);a.getMatrixAt(0,second);close(second.elements,replay);
 const version=a.instanceMatrix.version;controller.update(5);controller.update(NaN);assert.equal(a.instanceMatrix.version,version);
 for(const mesh of [a,b,staticBatch])mesh.geometry.dispose();
});
for(const nativeIslandSea of [false,true])test('terrain and '+(nativeIslandSea?'native island sea':'repository water')+' habitat gate crab and fish movement',()=>{
 const p=createWorld('habitat');p.terrain.heights.fill(-2);if(nativeIslandSea)p.nativeIsland={sea:{level:0}};else p.water={level:0};
 const objects=[{id:'crab',ambientBehaviour:behaviour('crab-walk')},{id:'fish',ambientBehaviour:behaviour('fish-swim')}],matrices=new Map([['crab',new T.Matrix4().makeTranslation(0,-2,0)],['fish',new T.Matrix4().makeTranslation(5,-1,5)]]);
 const mesh=new T.InstancedMesh(new T.BoxGeometry(),null,2),controller=createRepositoryAmbientBehaviour(p);controller.register(mesh,objects,matrices);controller.update(4);
 const matrix=new T.Matrix4();mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[13],-2);mesh.getMatrixAt(1,matrix);assert.ok(matrix.elements[13]<=-.35&&matrix.elements[13]>=-1.8);mesh.geometry.dispose();
});
function asset(){
 const positions=new Float32Array([-1,0,0,1,0,0,0,2,0]),json={asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-1,0,0],max:[1,2,0]}],materials:[{doubleSided:true}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 let text=JSON.stringify(json);while(text.length%4)text+=' ';const bytes=Buffer.alloc(12+8+text.length+8+36);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(text.length,12);bytes.writeUInt32LE(0x4e4f534a,16);bytes.write(text,20);bytes.writeUInt32LE(36,20+text.length);bytes.writeUInt32LE(0x004e4942,24+text.length);bytes.set(new Uint8Array(positions.buffer),28+text.length);
 return {id:'triangle',name:'Owned triangle',mediaType:'model/gltf-binary',bytes:bytes.length,dataUrl:'data:application/octet-stream;base64,'+bytes.toString('base64'),bounds:inspectGlbJson(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).bounds};
}
for(const [backend,build,dispose]of [['webgl',buildWebGLRepositoryScene,disposeWebGLRepositoryScene],['webgpu',buildRepositoryScene,disposeRepositoryScene]])test(backend+' scene frame hook updates admitted GLB instances without increasing batches',async()=>{
 const p=createWorld('ambient integration');p.objects=[];p.assets=[asset()];p.features=[];delete p.water;
 for(const [id,x]of [['bird',0],['static',8]])p.objects.push({id,kind:'glb',name:id,assetId:'triangle',position:[x,4,0],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff',visible:true,collision:'none',...(id==='bird'?{ambientBehaviour:behaviour('bird-flight')}:{})});
 const d=describeRuntimeWorld(p),candidate=await build(d,new N.PerspectiveCamera());
 try{
  assert.equal(candidate.assetBatchCount,1);assert.equal(candidate.ambient.objectCount,1);
  const meshes=[];candidate.root.traverse(n=>{if(n.userData.editorObjectIds?.includes('bird'))meshes.push(n);});assert.equal(meshes.length,1);const mesh=meshes[0],matrix=new T.Matrix4();
  if(backend==='webgl')candidate.root.userData.updateWebGL(3);else candidate.query.setTime(3);
  mesh.getMatrixAt(0,matrix);assert.notDeepEqual(matrix.elements.slice(12,15),[0,4,0]);mesh.getMatrixAt(1,matrix);close(matrix.elements.slice(12,15),[8,4,0]);assert.deepEqual(d.project.objects[0].position,[0,4,0]);
 }finally{dispose(candidate);}
});

for(const [backend,E,build,dispose]of [['webgl',T,buildWebGLRepositoryScene,disposeWebGLRepositoryScene],['webgpu',N,buildRepositoryScene,disposeRepositoryScene]])test(backend+' exact exported repositories reload wildlife and replace storm/zero weather across A-B-A',async()=>{
 const clear={weather:'clear',cloudCoverage:0,mistDensity:0,mistSpeed:0,windSpeed:0,rainIntensity:0,timeOfDay:14,weatherSeed:17};
 const storm={weather:'storm',cloudCoverage:.95,mistDensity:.02,mistSpeed:7,windSpeed:22,rainIntensity:1,timeOfDay:17,weatherSeed:31};
 async function exported(name,weather){
  const p=createWorld(name);p.assets=[asset()];p.objects=[{id:'bird',kind:'glb',name:'bird',assetId:'triangle',position:[0,4,0],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff',visible:true,collision:'none',ambientBehaviour:behaviour('bird-flight')}];p.environment={...p.environment,...weather};
  const files=await packWorldRepository(p),original=new Map([...files].map(([path,bytes])=>[path,bytes.slice()]));
  const source=localRepositorySource([...files].map(([path,bytes])=>({webkitRelativePath:name+'/'+path,size:bytes.byteLength,arrayBuffer:async()=>bytes.slice().buffer})));
  return {source,files,original};
 }
 const a=await exported('Clear A',clear),b=await exported('Storm B',storm),engine={scene:new E.Scene(),camera:new E.PerspectiveCamera()},input={pressed:new Set(),_clearTransientInput(){},consumeLook:()=>({x:0,y:0}),moveAxes:()=>({x:0,y:0,sprint:0}),down:()=>false,hit:()=>false};
 const host=new RepositoryWorldHost({engine,input,buildCandidate:build,disposeCandidate:dispose}),weather=new NativeWeather();
 try{
  for(const [exported,expected,time]of [[a,clear,1],[b,storm,20],[a,clear,40]]){
   assert.equal(await host.load(exported.source),true);
   const active=host.active,env=host.environment();
   for(const [key,value]of Object.entries(expected))assert.equal(env[key],value,key+' must come from active exported world');
   assert.deepEqual(active.project.objects[0].ambientBehaviour,behaviour('bird-flight'));assert.equal(active.ambient.objectCount,1);
   let mesh;active.root.traverse(n=>{if(n.userData.editorObjectIds?.includes('bird'))mesh=n;});assert.ok(mesh);
   const before=new T.Matrix4(),after=new T.Matrix4();mesh.getMatrixAt(0,before);
   if(backend==='webgl')active.root.userData.updateWebGL(time);else active.query.setTime(time);
   mesh.getMatrixAt(0,after);assert.notDeepEqual(after.elements,before.elements);
   const state=weather.update(time,engine.camera,0,env,()=>{});
   assert.equal(weather.lastWeather,expected.weather);assert.equal(weather.rain.visible,expected.weather==='storm');assert.equal(state.particles>0,expected.weather==='storm');
   if(expected.weather==='clear'){assert.equal(state.flash,0);assert.equal(weather.bolt.visible,false);assert.equal(state.particles,0);}
   // Verify the actual compatibility weather consumer also clears prior fog/storm state.
   if(backend==='webgl'){
    if(!engine.scene.fog)configureWebGLRepositoryScene(engine.scene,active);
    updateWebGLRepositoryEnvironment(engine,active,time);
    assert.equal(engine.scene.fog.density===0,expected.mistDensity===0);
   }
   for(const [path,bytes]of exported.files)assert.deepEqual(bytes,exported.original.get(path),'exported repository remains byte-identical: '+path);
  }
  assert.equal(host.active.project.metadata.name,'Clear A');assert.equal(host.environment().cloudCoverage,0);assert.equal(host.environment().windSpeed,0);assert.equal(host.environment().mistDensity,0);
 }finally{
  host.dispose();for(const mesh of weather.group.children){mesh.geometry.dispose();mesh.material.dispose();}
 }
});

test('loader rejects unknown requirements and object-access downgrade before scene build or activation',async()=>{
 const project=createWorld('Restricted export');project.objectAccess={schema:'elsemesh.object-access/1',rules:[]};
 const files=await packWorldRepository(project),asSource=values=>localRepositorySource([...values].map(([path,bytes])=>({webkitRelativePath:'Restricted/'+path,size:bytes.byteLength,arrayBuffer:async()=>bytes.slice().buffer})));
 const engine={scene:new N.Scene(),camera:new N.PerspectiveCamera()},input={pressed:new Set(),_clearTransientInput(){},consumeLook:()=>({x:0,y:0}),moveAxes:()=>({x:0,y:0,sprint:0}),down:()=>false,hit:()=>false};
 let builds=0;const host=new RepositoryWorldHost({engine,input,buildCandidate:async(...args)=>{builds++;return buildRepositoryScene(...args);}});
 try{
  await host.load(asSource(files));assert.deepEqual(host.active.project.objectAccess,project.objectAccess);const active=host.active,baseline=builds;
  for(const kind of ['unknown','omitted-access']){
   const altered=new Map(files),manifest=JSON.parse(new TextDecoder().decode(files.get('world.json')));
   if(kind==='unknown')manifest.engine.requires.push('unknown-executable-capability/99');
   else manifest.engine.requires=manifest.engine.requires.filter(c=>c!=='object-access/1');
   altered.set('world.json',new TextEncoder().encode(JSON.stringify(manifest)));
   await assert.rejects(host.load(asSource(altered)),/capability|engine contract/i);assert.equal(builds,baseline);assert.equal(host.active,active);assert.equal(active.root.parent,engine.scene);
  }
 }finally{host.dispose();}
});

test('native habitat uses installed exact surface rather than authored coarse proxy',()=>{
 const p=createWorld('native habitat');p.terrain.heights.fill(50);p.nativeIsland={sea:{level:0}};
 const objects=[{id:'crab',ambientBehaviour:behaviour('crab-walk')},{id:'fish',ambientBehaviour:behaviour('fish-swim')}],matrices=new Map([['crab',new T.Matrix4().makeTranslation(0,-2,0)],['fish',new T.Matrix4().makeTranslation(5,-1,5)]]);
 let samples=0;const controller=createRepositoryAmbientBehaviour(p,{terrain:{heightAt(){samples++;return -2;}}}),mesh=new T.InstancedMesh(new T.BoxGeometry(),null,2);
 controller.register(mesh,objects,matrices);controller.update(4);
 const matrix=new T.Matrix4();mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[13],-2);assert.notDeepEqual(matrix.elements.slice(12,15),[0,-2,0]);mesh.getMatrixAt(1,matrix);assert.ok(matrix.elements[13]<0);assert.notDeepEqual(matrix.elements.slice(12,15),[5,-1,5]);assert.equal(samples,2);mesh.geometry.dispose();
});
