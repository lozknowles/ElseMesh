import test from 'node:test';
import assert from 'node:assert/strict';
import {T,createWorld,describeRuntimeWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {buildWebGLRepositoryScene,disposeWebGLRepositoryScene} from '../src/world-runtime/WebGLRepositoryScene.js';
import {Colliders} from '../src/world/Colliders.js';
test('WebGL candidates retain admitted terrain, native colliders, saved hierarchy and independent ownership',async()=>{
 const project=createWorld('WebGL fixture');project.objects.push({id:'saved-box',kind:'box',name:'box',position:[3,4,5],rotation:[0,.2,0],scale:[1,2,1],color:'#ff0000',visible:true,collision:'solid'});
 const descriptor=describeRuntimeWorld(project),camera=new T.PerspectiveCamera();
 const first=await buildWebGLRepositoryScene(descriptor,camera),second=await buildWebGLRepositoryScene(descriptor,camera);
 assert.equal(first.project,descriptor.project);assert.equal(first.terrain,descriptor.terrain);assert.ok(first.colliders instanceof Colliders);assert.notEqual(first.root,second.root);assert.notEqual(first.colliders,second.colliders);assert.equal(first.root.parent,null);
 const box=first.root.children.find(c=>c.userData.editorObjectId==='saved-box');assert.deepEqual(box.matrix.elements.slice(12,15),[3,4,5]);assert.equal(first.root.children[0].geometry.getAttribute('position').count,project.terrain.resolution**2);
 first.root.userData.updateWebGL(3);disposeWebGLRepositoryScene(first);disposeWebGLRepositoryScene(first);assert.equal(first.disposed,true);assert.equal(second.disposed,undefined);disposeWebGLRepositoryScene(second);
});
