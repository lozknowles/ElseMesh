import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Synthetic WebGL baseline; intentionally does not claim published-world FPS.
// Run: node tools/performance/webgl-portal-baseline.mjs [evidence-directory]
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const out=path.resolve(process.argv[2]??'outputs/webgl-portal-baseline');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Synthetic WebGL portal baseline</title><style>body{margin:0;background:#102030}canvas{display:block}</style><link rel="icon" href="data:,">');return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:false,channel:process.env.PORTAL_BROWSER_CHANNEL??'msedge'});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const metadata=await page.evaluate(async()=>{
  const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js');
  const {WebGLPortalViews}=await import('/src/world-runtime/WebGLPortalViews.js');
  const renderer=new T.WebGLRenderer({antialias:false});renderer.setPixelRatio(1);renderer.setSize(1280,720);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.info.autoReset=false;document.body.append(renderer.domElement);
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const adapter={vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,version:gl.getParameter(gl.VERSION)};
  if(!ext||/swiftshader|llvmpipe|software|microsoft basic render/i.test(adapter.renderer))throw Error('Hardware renderer required: '+JSON.stringify(adapter));
  const camera=new T.PerspectiveCamera(60,1280/720,.05,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);
  const scene=new T.Scene();scene.background=new T.Color('#102030');
  const views=new WebGLPortalViews({renderer,mainCamera:camera});
  const nr=(v,p)=>{const sorted=[...v].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)];};
  const stats=v=>({count:v.length,mean:v.reduce((a,b)=>a+b,0)/v.length,median:nr(v,.5),p95:nr(v,.95),p99:nr(v,.99),min:Math.min(...v),max:Math.max(...v)});
  function configure(name){
   views.clear();camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const count=name==='zero'?0:name==='two-visible'?2:1;
   for(let n=0;n<count;n++){
    const root=new T.Group();
    for(let i=0;i<120;i++){
     const mesh=new T.Mesh(new T.BoxGeometry(.3,.3,.3),new T.MeshBasicMaterial({color:new T.Color().setHSL((i*.071+n*.23)%1,.65,.55)}));
     mesh.position.set(10+(i%12-5.5)*.35,(Math.floor(i/12)-4.5)*.35,.5+(i%3)*.25);root.add(mesh);
    }
    const backing=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshBasicMaterial({color:n?'#392851':'#1b5960',side:T.DoubleSide}));backing.position.set(10,0,2);root.add(backing);
    const source={position:[name==='out-of-frustum'?100:count===2?(n?1.4:-1.4):0,0,0],yaw:name==='backface'?Math.PI:0,width:2,height:3};
    scene.add(views.setDestination('fixture-'+n,{candidate:{root},authorizedView:true,state:'live',source,destination:{position:[10,0,0],yaw:0}}));
   }
  }
  window.fixture={renderer,camera,scene,views,configure,stats};
  window.runScenario=async name=>{
   configure(name);const portal=[],frame=[],draws=[],portalDraws=[],submit=[];let previous;
   for(let i=0;i<240;i++){
    const timestamp=await new Promise(requestAnimationFrame);renderer.info.reset();
    const start=performance.now();views.render({width:1280,height:720,time:i/60});const end=performance.now();const pc=renderer.info.render.calls;
    renderer.render(scene,camera);const done=performance.now();
    if(i>=60){portal.push(end-start);submit.push(done-start);frame.push(timestamp-previous);draws.push(renderer.info.render.calls);portalDraws.push(pc);}
    previous=timestamp;
   }
   return {name,warmupFrames:60,sampleFrames:180,portalCpuMs:stats(portal),frameIntervalMs:stats(frame),fullFrameCpuSubmitMs:stats(submit),fpsFromMeanInterval:1000/stats(frame).mean,drawCalls:stats(draws),portalDrawCalls:stats(portalDraws),raw:{portalCpuMs:portal,frameIntervalMs:frame,fullFrameCpuSubmitMs:submit,drawCalls:draws,portalDrawCalls:portalDraws}};
  };
  return {adapter,viewport:{width:1280,height:720,pixelRatio:renderer.getPixelRatio()},userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,targetLongEdge:512,fixture:{destinationMeshesPerPortal:121,deterministic:true},percentileMethod:'nearest-rank ceil(p*N)',timing:'rAF intervals include pacing and scheduling; portal CPU and full frame CPU submission do not measure GPU completion'};
 });
 const results=[];
 for(const name of ['zero','one-visible','two-visible','backface','out-of-frustum']){
  const result=await page.evaluate(name=>window.runScenario(name),name);results.push(result);
  await page.screenshot({path:path.join(out,`webgl-${name}.png`)});
  console.log(JSON.stringify({scenario:name,portalCpuMs:result.portalCpuMs,frameIntervalMs:result.frameIntervalMs,drawCalls:result.drawCalls,portalDrawCalls:result.portalDrawCalls}));
 }
 const validation=await page.evaluate(async()=>{
  // Same clipping and projective parallax fixture as test/webgl-portal-views-browser.mjs.
  const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js');const {WebGLPortalViews}=await import('/src/world-runtime/WebGLPortalViews.js');
  const {renderer}=window.fixture;window.fixture.views.dispose();renderer.setSize(128,128);
  const camera=new T.PerspectiveCamera(60,1,.05,100);camera.position.z=3;camera.lookAt(0,0,0);
  const root=new T.Group(),views=new WebGLPortalViews({renderer,mainCamera:camera});
  for(const [z,color] of [[1,'red'],[-1,'lime']]){const p=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshBasicMaterial({color,side:T.DoubleSide}));p.position.set(10,0,z);root.add(p);}
  const scene=new T.Scene();scene.add(views.setDestination('validation',{candidate:{root},authorizedView:true,state:'live',source:{position:[0,0,0],yaw:0,width:2,height:2},destination:{position:[10,0,0],yaw:0}}));
  const output=new T.WebGLRenderTarget(128,128),pixels=new Uint8Array(128*128*4);views.render({width:128,height:128});renderer.setRenderTarget(output);renderer.render(scene,camera);renderer.readRenderTargetPixels(output,0,0,128,128,pixels);renderer.setRenderTarget(null);
  const center=Array.from(pixels.slice((64*128+64)*4,(64*128+64)*4+4));
  const marker=new T.Mesh(new T.PlaneGeometry(.45,.45),new T.MeshBasicMaterial({color:'blue',side:T.DoubleSide}));marker.position.set(10.6,0,.7);root.add(marker);
  const positions=[];for(const x of [0,.6]){camera.position.x=x;views.render({width:128,height:128});const half=new Uint16Array(128*128*4);renderer.readRenderTargetPixels(views.entries.get('validation').target,0,0,128,128,half);let sum=0,count=0;for(let i=0;i<128*128;i++)if(half[i*4+2]>14000&&half[i*4]<100){sum+=i%128;count++;}positions.push({x:sum/count,count});}
  renderer.render(scene,camera);return {center,positions,state:views.getAperture('validation').userData.portalViewState,reference:'test/webgl-portal-views-browser.mjs'};
 });
 await page.screenshot({path:path.join(out,'webgl-validation.png')});
 assert.ok(validation.center[0]>240&&validation.center[1]<10,JSON.stringify(validation));assert.ok(validation.positions.every(p=>p.count>10));assert.ok(Math.abs(validation.positions[1].x-validation.positions[0].x)>8);assert.equal(validation.state,'live');assert.deepEqual(errors,[]);
 for(const result of results){assert.equal(result.portalDrawCalls.max,['zero','backface','out-of-frustum'].includes(result.name)?0:result.name==='two-visible'?242:121);}
 const report={recordedAt:new Date().toISOString(),scope:'Synthetic local hardware WebGLPortalViews baseline, not published-world FPS or qualification',browserVersion:browser.version(),metadata,results,validation,errors};
 await writeFile(path.join(out,'webgl-baseline.json'),JSON.stringify(report,null,2));
 console.log('Hardware WebGL baseline saved: '+path.join(out,'webgl-baseline.json'));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
