const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium-browser',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const base=process.env.PORTAL_TEST_URL??'http://127.0.0.1:5199/';const page=await browser.newPage();await page.route(base,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><link rel="icon" href="data:,"></head><body></body></html>'}));await page.goto(base);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const result=await page.evaluate(async()=>{
  const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js');
  const {WebGLPortalViews}=await import('/src/world-runtime/WebGLPortalViews.js');
  const {createPortalEffects}=await import('/src/world-runtime/RepositoryPortalEffects.js');
  const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(128,128);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  const camera=new T.PerspectiveCamera(60,1,.05,100);camera.position.z=3;camera.lookAt(0,0,0);
  const views=new WebGLPortalViews({renderer,mainCamera:camera}),root=new T.Group();
  const panel=(z,color)=>{const p=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshBasicMaterial({color,side:T.DoubleSide}));p.position.set(10,0,z);root.add(p);};
  panel(1,'red');panel(-1,'lime');
  const source={position:[0,0,0],yaw:0,width:2,height:2},destination={position:[10,0,0],yaw:0};
  const scene=new T.Scene();scene.add(views.setDestination('fixture',{candidate:{root},authorizedView:true,state:'live',source,destination}));
  const effects=createPortalEffects({engine:{canvas:renderer.domElement,backend:'webgl2'},isWebGL:true});
  effects.addFrame(scene,{...source,id:'effect',visual:{frameColor:'#33ddff'}});effects.transition('handoff-pending');effects.update(.1,1);
  const energy=document.querySelector('.repository-portal-transport-energy');
  if(!energy||energy.style.pointerEvents!=='none'||Number(energy.style.opacity)<=0)throw Error('transport energy overlay missing');
  const output=new T.WebGLRenderTarget(128,128),pixels=new Uint8Array(128*128*4);
  views.render({width:128,height:128});renderer.setRenderTarget(output);renderer.render(scene,camera);renderer.readRenderTargetPixels(output,0,0,128,128,pixels);
  const center=Array.from(pixels.slice((64*128+64)*4,(64*128+64)*4+4));
  const marker=new T.Mesh(new T.PlaneGeometry(.45,.45),new T.MeshBasicMaterial({color:'blue',side:T.DoubleSide}));marker.position.set(10.6,0,.7);root.add(marker);
  const positions=[];for(const x of [0,.6]){camera.position.x=x;views.render({width:128,height:128});const target=views.entries.get('fixture').target;const half=new Uint16Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,half);let total=0,count=0;for(let i=0;i<128*128;i++){if(half[i*4+2]>14000&&half[i*4]<100){total+=i%128;count++;}}positions.push({x:total/count,count});}
  const state=views.getAperture('fixture').userData.portalViewState;const effectDiagnostics=effects.diagnostics();effects.dispose();if(energy.isConnected)throw Error('energy overlay leaked');views.dispose();output.dispose();renderer.dispose();return {center,positions,state,effectDiagnostics};
 });
 assert.ok(result.center[0]>240&&result.center[1]<10,JSON.stringify(result));assert.ok(result.positions.every(p=>p.count>10));assert.ok(Math.abs(result.positions[1].x-result.positions[0].x)>8);assert.equal(result.state,'live');assert.deepEqual(errors,[]);console.log(JSON.stringify({fixture:'WebGL clipping projective aperture parallax',...result,errors}));
}finally{await browser.close();}
