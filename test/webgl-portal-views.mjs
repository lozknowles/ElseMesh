import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {WebGLPortalViews,portalTargetSize,portalDestinationPlane,webGLPortalInView,portalApertureIntersectsFrustum} from '../src/world-runtime/WebGLPortalViews.js';
const pose=(position=[0,0,0],yaw=0)=>({position,yaw,width:2,height:3});
test('a nearby return aperture entirely behind the camera does not draw its destination',()=>{
 const {views,renderer,mainCamera}=setup();let draws=0;renderer.render=()=>draws++;
 const source=pose();views.setDestination('return',{candidate:{root:new T.Group()},authorizedView:true,source,destination:pose([10,0,0]),state:'live'});
 mainCamera.position.set(0,0,.3);mainCamera.lookAt(0,0,1);mainCamera.updateMatrixWorld();
 const f=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(mainCamera.projectionMatrix,mainCamera.matrixWorldInverse));
 assert.equal(f.intersectsSphere(new T.Sphere(new T.Vector3(),Math.hypot(2,3)/2)),true,'old sphere admitted this invisible door');
 assert.equal(webGLPortalInView(mainCamera,source),false);views.render();assert.equal(draws,0);
 mainCamera.lookAt(0,0,0);assert.equal(webGLPortalInView(mainCamera,source),true);views.render();assert.equal(draws,1);assert.equal(views.getAperture('return').userData.portalViewState,'live');views.dispose();
});
test('aperture plane rejection retains partial, grazing, rotated and large enclosing portals',()=>{
 const plane=new T.Plane(new T.Vector3(1,0,0),0),frustum={planes:[plane]};
 assert.equal(portalApertureIntersectsFrustum(frustum,pose([-2,0,0])),false);
 for(const x of [-1-1e-8,-1,-.5,0,2])assert.equal(portalApertureIntersectsFrustum(frustum,pose([x,0,0])),true);
 assert.equal(portalApertureIntersectsFrustum(frustum,pose([-.5,0,0],Math.PI/2)),false);
 assert.equal(portalApertureIntersectsFrustum(frustum,{...pose([-20,0,0]),width:100}),true);
 // Plane support equals the greatest signed distance of the actual four corners.
 for(let i=0;i<120;i++){
  const source={position:[Math.sin(i)*3,Math.cos(i)*2,i/30-2],yaw:i*.13,width:.3+i%7,height:.2+i%5};
  const n=new T.Vector3(Math.sin(i*.31),Math.cos(i*.43),Math.cos(i*.17)).normalize(),p=new T.Plane(n,Math.sin(i*.71));
  const corners=[-1,1].flatMap(sx=>[-1,1].map(sy=>new T.Vector3(source.position[0]+sx*source.width/2*Math.cos(source.yaw),source.position[1]+sy*source.height/2,source.position[2]-sx*source.width/2*Math.sin(source.yaw))));
  const max=Math.max(...corners.map(c=>p.distanceToPoint(c)));
  if(Math.abs(max)>1e-5)assert.equal(portalApertureIntersectsFrustum({planes:[p]},source),max>=0);
 }
});
test('near-plane crossings retain the aperture when even one side remains visible',()=>{
 const camera=new T.PerspectiveCamera(65,1,.1,100);camera.updateMatrixWorld();
 const f=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 assert.equal(portalApertureIntersectsFrustum(f,{...pose([0,0,-.1]),width:1,height:1}),true,'on near plane');
 assert.equal(portalApertureIntersectsFrustum(f,{...pose([0,0,-.04]),width:1,height:1}),false,'wholly before near plane');
 assert.equal(portalApertureIntersectsFrustum(f,{...pose([0,0,0],Math.PI/4),width:2,height:2}),true,'crosses eye and near planes');
 assert.equal(portalApertureIntersectsFrustum(f,{...pose([0,0,-2],-Math.PI/4),width:8,height:8}),true,'opposite yaw and enclosing aperture');
});
function setup(options={}){
 const renderer={clippingPlanes:[],localClippingEnabled:false,autoClear:false,target:{main:true},viewport:new T.Vector4(4,5,600,400),scissor:new T.Vector4(6,7,300,200),scissorTest:true,color:new T.Color('red'),alpha:.4,
 getRenderTarget(){return this.target;},getViewport(v){return v.copy(this.viewport);},getScissor(v){return v.copy(this.scissor);},getScissorTest(){return this.scissorTest;},getClearColor(c){return c.copy(this.color);},getClearAlpha(){return this.alpha;},
 setRenderTarget(t){this.target=t;},setViewport(...a){a.length===1?this.viewport.copy(a[0]):this.viewport.set(...a);},setScissor(v){this.scissor.copy(v);},setScissorTest(v){this.scissorTest=v;},setClearColor(c,a){this.color.copy(c);this.alpha=a;},render(){}};
 const mainCamera=new T.PerspectiveCamera(65,1.6,.1,100);mainCamera.position.set(.3,1,3);mainCamera.lookAt(0,1,0);
 const views=new WebGLPortalViews({renderer,mainCamera,...options});return {views,renderer,mainCamera};
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

test('ordinary portal targets use physical dimensions divided by pixel ratio and restore live state',()=>{const {views,renderer:r}=setup();r.getPixelRatio=()=>2;const before=r.viewport.clone();views.setDestination('dpr2',{candidate:{root:new T.Group()},authorizedView:true,source:pose(),destination:pose([10,0,0]),state:'live'});let viewport; r.render=()=>{viewport=r.viewport.clone();};views.render({width:1600,height:900});assert.deepEqual(viewport.toArray(),[0,0,256,144]);assert.deepEqual(r.viewport,before);views.dispose();});

test('published opt-in keeps three independent preview apertures and preserves its cap in forks',()=>{
 const {views,renderer}=setup({maxViews:3});let draws=0;renderer.render=()=>draws++;const resources=[];
 for(let i=0;i<3;i++){
  views.setDestination('public-'+i,{candidate:{root:new T.Group()},ownsCandidate:false,authorizedView:true,source:pose(),destination:pose([10+i*10,0,0]),state:'live'});
  const entry=views.entries.get('public-'+i);for(const resource of [entry.target,entry.material,entry.aperture.geometry]){const record={resource,disposed:0};resource.addEventListener('dispose',()=>record.disposed++);resources.push(record);}
 }
 assert.equal(views.maxViews,3);assert.equal(views.entries.size,3);views.render();assert.equal(draws,3);for(let i=0;i<3;i++)assert.equal(views.getAperture('public-'+i).userData.portalViewState,'live');
 assert.equal(new Set([...views.entries.values()].map(e=>e.target)).size,3);assert.ok(resources.every(r=>r.disposed===0));
 const fork=views.fork();assert.equal(fork.maxViews,3);for(let i=0;i<3;i++)fork.setDestination('parked-'+i,{source:pose()});assert.equal(fork.entries.size,3);assert.ok(fork.getAperture('parked-0'));
 const parked=fork.park();fork.restore({identity:{worldId:'public-world'}},parked);assert.equal(fork.entries.size,3);fork.dispose();
 views.setDestination('public-3',{source:pose()});assert.equal(views.entries.size,3);assert.equal(views.getAperture('public-0'),null);assert.ok(resources.slice(0,3).every(r=>r.disposed===1));assert.ok(resources.slice(3).every(r=>r.disposed===0));
 views.dispose();views.dispose();assert.ok(resources.every(r=>r.disposed===1));
});

test('ordinary portal views and their forks keep two slots, invalid cap overrides fail closed',()=>{
 const {views}=setup();assert.equal(views.maxViews,2);const fork=views.fork();assert.equal(fork.maxViews,2);for(let i=0;i<3;i++)fork.setDestination('owner-'+i,{source:pose()});assert.equal(fork.entries.size,2);assert.equal(fork.getAperture('owner-0'),null);views.dispose();fork.dispose();
 for(const maxViews of [0,1,4,3.5,Infinity,'3',null])assert.throws(()=>setup({maxViews}),/slots/);
});
