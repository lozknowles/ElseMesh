import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as N from '../src/engine/index.js';
import {RepositoryPortalSky} from '../src/world-runtime/RepositoryPortalSky.js';
import {PortalViews} from '../src/world-runtime/PortalViews.js';
import {DEPTH_FORMAT} from '../src/engine/render/SceneRenderer.js';
import {FrameUniforms} from '../src/engine/render/Frame.js';
const pose=(position=[0,0,0],yaw=0)=>({position,yaw,width:2,height:3});
function fixture({failed=false,pipeline={}}={}){
 const module={name:'existing-sky-with-cloud-panorama'},draws=[],passes=[];
 class Pass{constructor(options){this.options=options;this.handle={pipeline,failed};passes.push(this);}draw(...args){draws.push(args);}}
 const background=new RepositoryPortalSky({sky:{module},Pass,gpu:{pipelinesReady:async()=>{}}});
 return{background,draws,passes,module};
}
test('portal sky composes existing panoramic HDR sky with mapped frame and reversed depth only',async()=>{
 const f=fixture(),pass=f.passes[0],opts=pass.options;
 assert.deepEqual(opts.modules,[f.module]);assert.deepEqual(opts.colorFormats,['rgba16float']);assert.equal(opts.depthFormat,DEPTH_FORMAT);
 assert.equal(opts.depthCompare,'equal');assert.equal(opts.depthWrite,false);assert.equal(opts.depth,0);assert.equal(opts.blend,'none');
 assert.match(opts.code,/skyRadianceWithClouds\( viewRay\( uv \), true \)/);assert.match(opts.code,/in.pos.xy \* frame.invResolution/);assert.doesNotMatch(opts.code,/skyViewRadiance|cloudsSampleView/);
 assert.throws(()=>f.background.draw({}, {}, {reversedDepth:true}),/unavailable/);
 await f.background.readyPromise;assert.equal(f.background.isReady(),true);
 const rp={},block={name:'mapped view'};f.background.draw(rp,block,{reversedDepth:true});assert.deepEqual(f.draws,[[rp,block]]);
 assert.throws(()=>f.background.draw(rp,block,{reversedDepth:false}),/reversed/);
});
test('pipeline readiness waits async compilation and rejects failed or absent handles',async()=>{
 let release;const completion=new Promise(resolve=>{release=resolve;});
 class Pass{constructor(){this.handle={pipeline:null,failed:false};}draw(){throw Error('must not draw');}}
 const bg=new RepositoryPortalSky({sky:{module:{}},Pass,gpu:{pipelinesReady:()=>completion}});
 let ready=false;bg.readyPromise.then(()=>{ready=true;});await Promise.resolve();assert.equal(ready,false);assert.equal(bg.isReady(),false);
 bg.pass.handle.pipeline={};release();await bg.readyPromise;assert.equal(bg.isReady(),true);
 for(const state of [{failed:true,pipeline:{}},{failed:false,pipeline:null}]){
  const f=fixture(state);await assert.rejects(f.background.readyPromise,/pipeline is unavailable/);assert.equal(f.background.isReady(),false);assert.equal(f.draws.length,0);
 }
});
test('shared sky draws between portal opaque and transparent lists using the detached mapped camera block',async()=>{
 const f=fixture();let calls=0;const order=[],main=new N.PerspectiveCamera();main.position.set(.3,1,3);main.lookAt(0,1,0);
 const views=new PortalViews({engine:{},mainCamera:main,background:f.background,meshRenderer:{render(scene,pass){calls++;order.push('opaque');pass.betweenLists('render-pass');order.push('sky','transparent');assert.equal(pass.defines.PORTAL_CLIP,1);const nested=new N.Group();nested.userData.portalAperture=true;assert.equal(pass.filter(nested),false);}}});
 const root=new N.Group();views.setDestination('sky',{candidate:{root,residentReady:true},source:pose(),destination:pose([10,0,0]),authorizedView:true,state:'live'});
 const entry=views.entries.get('sky');entry.target.texture.view=()=>({});entry.target.depthTexture.view=()=>({});entry.target.setSize=()=>{};
 views.render({width:1280,height:720});assert.equal(calls,0);assert.equal(entry.aperture.userData.portalViewState,'loading');assert.equal(entry.aperture.visible,false);
 await views.whenReady('sky');views.render({width:1280,height:720});
 assert.equal(calls,1);assert.deepEqual(order,['opaque','sky','transparent']);assert.equal(f.draws[0][0],'render-pass');assert.equal(f.draws[0][1],entry.block);assert.notEqual(f.draws[0][1],FrameUniforms);
 assert.ok(Math.abs(entry.block.fields.cameraPos.value.x-9.7)<1e-8);assert.equal(entry.hasImage,true);assert.equal(entry.aperture.userData.portalViewState,'live');
 const fork=views.fork();assert.equal(fork.background,f.background);assert.equal(f.passes.length,1);fork.dispose();views.remove('sky');assert.equal(f.background.isReady(),true);assert.equal(f.passes.length,1);
 views.dispose();
});
test('failed background compilation keeps aperture unavailable and never publishes destination pixels',async()=>{
 const f=fixture({failed:true}),main=new N.PerspectiveCamera();main.position.set(0,1,3);main.lookAt(0,1,0);let draws=0;
 const views=new PortalViews({engine:{},meshRenderer:{render(){draws++;}},mainCamera:main,background:f.background});
 views.setDestination('failed',{candidate:{root:new N.Group(),residentReady:true},source:pose(),destination:pose([10,0,0]),authorizedView:true,state:'live'});
 await assert.rejects(views.whenReady('failed'),/pipeline is unavailable/);views.render({width:640,height:480});
 const e=views.entries.get('failed');assert.equal(e.state,'unavailable');assert.equal(e.hasImage,false);assert.equal(e.aperture.userData.portalViewState,'unavailable');assert.equal(draws,0);views.dispose();
});
test('background configuration rejects conventional depth and does not bypass VIEW authorization',async()=>{
 const f=fixture();await f.background.readyPromise;const main=new N.PerspectiveCamera();main.reversedDepth=false;
 assert.throws(()=>new PortalViews({engine:{},meshRenderer:{},mainCamera:main,background:f.background}),/reversed/);
 main.reversedDepth=true;const views=new PortalViews({engine:{},meshRenderer:{render(){throw Error('Unauthorized scene drawn');}},mainCamera:main,background:f.background});
 assert.throws(()=>views.setDestination('denied',{candidate:{root:new N.Group()}}),/authorizedView/);views.dispose();
});
test('betweenLists renderer hook remains between the existing opaque and transparent submissions',()=>{
 const source=readFileSync(new URL('../src/engine/render/MeshRenderer.js',import.meta.url),'utf8');
 const opaque=source.indexOf('this.drawItems( rp, lists.opaque, pass )'),sky=source.indexOf('pass.betweenLists( rp )',opaque),transparent=source.indexOf('this.drawItems( rp, lists.transparent, pass )',opaque);
 assert.ok(opaque>=0&&sky>opaque&&transparent>sky);
});
