import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,PlaneGeometry,PerspectiveCamera,Scene} from '../src/engine/index.js';
import {Material} from '../src/engine/render/Material.js';
import {MeshRenderer} from '../src/engine/render/MeshRenderer.js';
import {GPU} from '../src/engine/gpu/GPU.js';
import {PortalViews} from '../src/world-runtime/PortalViews.js';

// Exercise actual portal camera mapping and MeshRenderer collection without a GPU.
// The multipass stand-in isolates transform ownership; browser evidence uses SceneRenderer.
test('two animated portal destinations reuse transforms within a view, refresh each frame, and retain submit fences',()=>{
 const mr=new MeshRenderer(),camera=new PerspectiveCamera(60,1,.05,100);
 camera.position.set(0,0,3);camera.lookAt(0,0,0);
 const views=new PortalViews({engine:{},meshRenderer:mr,mainCamera:camera});
 const previousSubmit=GPU.submit,previousFrame=GPU.frame,events=[],fixtures=[];
 GPU.submit=()=>events.push('submit');
 try{
  for(let i=0;i<2;i++){
   const root=new Group(),parent=new Group(),mesh=new Mesh(new PlaneGeometry(),new Material({lit:false}));
   parent.add(mesh);root.add(parent);
   root.userData.updateAmbientBehaviour=time=>{parent.position.x=time+i;};
   views.setDestination('p'+i,{candidate:{root},ownsCandidate:false,authorizedView:true,state:'live',source:{position:[i*.5,0,0],yaw:0,width:2,height:2},destination:{position:[10,0,0],yaw:0}});
   const e=views.entries.get('p'+i);e.target.setSize=()=>{};
   let updates=0;const original=e.scene.updateMatrixWorld;
   e.scene.updateMatrixWorld=function(...args){updates++;return original.apply(this,args);};
   e.viewRenderer={setSize(){},dispose(){},render(){
    events.push('render'+i);
    const matrices=[];
    for(let pass=0;pass<3;pass++){
     mr.collect(e.scene,{camera:e.camera,cull:false});
     matrices.push(mesh.matrixWorld.elements[12]);
    }
    assert.deepEqual(matrices,[parent.position.x,parent.position.x,parent.position.x]);
   }};
   fixtures.push({e,parent,mesh,updates:()=>updates});
  }
  views.render({width:1280,height:720,time:2});
  assert.deepEqual(events,['render0','submit','render1','submit']);
  assert.deepEqual(fixtures.map(f=>f.updates()),[1,1],'one hierarchy update for three destination passes');
  GPU.frame++;
  views.render({width:1280,height:720,time:7});
  assert.deepEqual(fixtures.map(f=>f.updates()),[2,2],'new animation is refreshed on each frame');
  const mainScene=new Scene(),mainRoot=new Group();mainRoot.position.x=19;mainScene.add(mainRoot);
  mr.collect(mainScene,{camera,cull:false});assert.equal(mainRoot.matrixWorld.elements[12],19);
  fixtures[0].parent.position.x=23;
  mr.collect(fixtures[0].e.scene,{camera,cull:false});
  assert.equal(fixtures[0].mesh.matrixWorld.elements[12],23,'scope does not leak into later main/view work');
 }finally{views.dispose();GPU.submit=previousSubmit;GPU.frame=previousFrame;}
});

test('failed portal multipass render clears transform scope and does not publish a live image',()=>{
 const mr=new MeshRenderer(),camera=new PerspectiveCamera(60,1,.05,100);camera.position.z=3;
 const views=new PortalViews({engine:{},meshRenderer:mr,mainCamera:camera}),root=new Group();
 views.setDestination('p',{candidate:{root},ownsCandidate:false,authorizedView:true,state:'live',source:{position:[0,0,0],yaw:0,width:2,height:2},destination:{position:[10,0,0],yaw:0}});
 const e=views.entries.get('p');e.target.setSize=()=>{};
 e.viewRenderer={setSize(){},dispose(){},render(){mr.collect(e.scene,{camera:e.camera,cull:false});throw Error('fixture failure');}};
 try{
  assert.throws(()=>views.render({width:1280,height:720}),/fixture failure/);
  assert.equal(e.hasImage,false);
  root.position.x=12;mr.collect(e.scene,{camera,cull:false});assert.equal(root.matrixWorld.elements[12],12);
 }finally{views.dispose();}
});
