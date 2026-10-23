import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {WebGLPortalViews,portalTargetSize,portalDestinationPlane} from '../src/world-runtime/WebGLPortalViews.js';
const pose=(position=[0,0,0],yaw=0)=>({position,yaw,width:2,height:3});
function setup(){
 const renderer={clippingPlanes:[],localClippingEnabled:false,autoClear:false,target:{main:true},viewport:new T.Vector4(4,5,600,400),scissor:new T.Vector4(6,7,300,200),scissorTest:true,color:new T.Color('red'),alpha:.4,
 getRenderTarget(){return this.target;},getViewport(v){return v.copy(this.viewport);},getScissor(v){return v.copy(this.scissor);},getScissorTest(){return this.scissorTest;},getClearColor(c){return c.copy(this.color);},getClearAlpha(){return this.alpha;},
 setRenderTarget(t){this.target=t;},setViewport(...a){a.length===1?this.viewport.copy(a[0]):this.viewport.set(...a);},setScissor(v){this.scissor.copy(v);},setScissorTest(v){this.scissorTest=v;},setClearColor(c,a){this.color.copy(c);this.alpha=a;},render(){}};
 const mainCamera=new T.PerspectiveCamera(65,1.6,.1,100);mainCamera.position.set(.3,1,3);mainCamera.lookAt(0,1,0);
 const views=new WebGLPortalViews({renderer,mainCamera});return {views,renderer,mainCamera};
}
test('WebGL portal budgets, explicit authorization and detached ownership',()=>{
 const {views}=setup(),root=new T.Group();
 assert.throws(()=>views.setDestination('x',{candidate:{root}}),/authorizedView/);
 assert.equal(views.entries.size,0);
 new T.Group().add(root);assert.throws(()=>views.setDestination('x',{candidate:{root},authorizedView:true}),/detached/);
 for(let i=0;i<3;i++)views.setDestination('p'+i,{candidate:{root:new T.Group()},authorizedView:true,source:pose(),destination:pose([10,0,0]),state:'live'});
 assert.equal(views.entries.size,2);assert.equal(views.getAperture('p0'),null);
 for(const [w,h]of [[1920,1080],[1080,1920],[1,8192]]){const s=portalTargetSize(w,h);assert.ok(Math.max(s.width,s.height)<=512);}
 views.dispose();
});
test('mapped WebGL camera, destination clipping, recursion limit and state restoration on error',()=>{
 const {views,renderer:r}=setup(),root=new T.Group(),nested=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial());nested.userData.portalAperture=true;root.add(nested);
 views.setDestination('a',{candidate:{root},authorizedView:true,source:pose(),destination:pose([10,0,0]),state:'live'});
 const e=views.entries.get('a'),target=r.target,clip=r.clippingPlanes,viewport=r.viewport.clone(),scissor=r.scissor.clone();
 let fail=false;
 r.render=(scene,camera)=>{assert.equal(scene,e.scene);assert.equal(nested.visible,false);assert.ok(Math.abs(camera.position.x-9.7)<1e-8);assert.ok(Math.abs(camera.position.z+3)<1e-8);assert.ok(r.clippingPlanes[0].distanceToPoint(new T.Vector3(10,0,1))>0);if(fail)throw Error('draw failed');};
 views.render({width:1600,height:900});assert.equal(e.aperture.userData.portalViewState,'live');assert.equal(nested.visible,true);assert.equal(r.target,target);assert.equal(r.clippingPlanes,clip);assert.deepEqual(r.viewport,viewport);assert.deepEqual(r.scissor,scissor);assert.equal(r.scissorTest,true);assert.equal(r.autoClear,false);
 fail=true;assert.throws(()=>views.render({width:1600,height:900}),/draw failed/);assert.equal(r.target,target);assert.deepEqual(r.viewport,viewport);assert.equal(nested.visible,true);assert.equal(e.aperture.userData.portalViewState,'cached');
 views.setDestination('a',{authorizedView:false});assert.equal(e.candidate,null);assert.equal(e.hasImage,false);assert.equal(e.aperture.userData.portalViewState,'restricted');views.dispose();
});
test('back side never refreshes a cached view and destination plane retains front',()=>{
 const {views,mainCamera}=setup();views.setDestination('a',{candidate:{root:new T.Group()},authorizedView:true,source:pose(),destination:pose([10,0,0]),state:'live'});
 views.render({width:1600,height:900});mainCamera.position.z=-3;views.render({width:1600,height:900});assert.equal(views.getAperture('a').userData.portalViewState,'cached');
 const plane=portalDestinationPlane(pose([10,0,0]));assert.ok(plane.distanceToPoint(new T.Vector3(10,0,-1))<0);views.dispose();
});


test('return-trip restoration requires fresh VIEW and denied subscription cannot expose cached WebGL content',()=>{
 const {views,renderer}=setup(),root=new T.Group(),candidate={root,residentReady:true};let draws=0;renderer.render=()=>draws++;
 views.setDestination('return',{candidate,ownsCandidate:false,authorizedView:true,source:pose(),destination:pose([10,0,0]),state:'live'});views.render({width:640,height:480});assert.equal(draws,1);const e=views.entries.get('return'),target=e.target,entries=views.park();
 views.restore({identity:{worldId:'source'}},entries);assert.equal(e.authorizedView,false);assert.equal(e.hasImage,false);assert.equal(e.candidate,null);assert.equal(root.parent,null);assert.equal(e.target,target);
 views.render({width:640,height:480});assert.equal(draws,1);assert.equal(e.aperture.userData.portalViewState,'loading');views.setState('return','restricted');views.render({width:640,height:480});assert.equal(draws,1);assert.equal(e.aperture.userData.portalViewState,'restricted');views.dispose();
});
