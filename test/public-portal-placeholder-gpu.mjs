import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="icon" href="data:,">');return;}const file=path.resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}res.setHeader('Content-Type',file.endsWith('.json')?'application/json':'text/javascript');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:false,channel:process.env.PORTAL_BROWSER_CHANNEL??'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(!r.ok())console.error('Fixture HTTP',r.status(),r.url());});page.on('console',m=>{if(m.type()==='error')console.error(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async()=>{
  const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js');const {WebGLPortalViews}=await import('/src/world-runtime/WebGLPortalViews.js');const {createPortalEffects}=await import('/src/world-runtime/RepositoryPortalEffects.js');
  const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(128,128);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;document.body.append(renderer.domElement);
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),adapter=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';if(!adapter||/swiftshader|llvmpipe|software|microsoft basic render/i.test(adapter))throw Error('Hardware renderer required: '+adapter);
  const camera=new T.PerspectiveCamera(60,1,.05,100);camera.position.z=3;camera.lookAt(0,0,0);
  const views=new WebGLPortalViews({renderer,mainCamera:camera}).setTransparentPlaceholders(),source={position:[0,0,0],yaw:0,width:2,height:2},scene=new T.Scene();
  const aperture=views.setDestination('public',{source,state:'loading'});scene.add(aperture);
  // Render behind the aperture later: a placeholder depth write would block it.
  const behind=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshBasicMaterial({color:'lime'}));behind.position.z=-1;behind.renderOrder=10;scene.add(behind);
  const effects=createPortalEffects({engine:{canvas:renderer.domElement,backend:'webgl2'},isWebGL:true});effects.addFrame(scene,{...source,id:'frame',visual:{frameColor:'#33ddff'}});
  const target=new T.WebGLRenderTarget(128,128),pixels=new Uint8Array(128*128*4),snapshots=[];
  const sample=label=>{renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);const center=Array.from(pixels.slice((64*128+64)*4,(64*128+64)*4+4));let framePixels=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+2]>80&&pixels[i+1]>60)framePixels++;snapshots.push({label,center,framePixels});};
  sample('loading');for(const state of ['unavailable','restricted','cached']){views.setState('public',state);sample(state);}
  const root=new T.Group(),red=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshBasicMaterial({color:'red',side:T.DoubleSide}));red.position.set(10,0,1);root.add(red);
  const candidate={root},live=()=>{views.setDestination('public',{candidate,ownsCandidate:false,authorizedView:true,state:'live',destination:{position:[10,0,0],yaw:0}});views.render({width:128,height:128});};
  live();sample('live');views.setState('public','cached');sample('cached-after-live');live();sample('live-again');views.setDestination('public',{authorizedView:false});sample('revoked');
  live();const parked=views.park();sample('parked');views.restore({},parked);sample('return-before-ready');
  views.dispose();effects.dispose();target.dispose();renderer.dispose();return {adapter,snapshots};
 });
 for(const {label,center,framePixels}of result.snapshots){if(label==='live'||label==='live-again')assert.ok(center[0]>240&&center[1]<10,JSON.stringify({label,center}));else assert.ok(center[1]>240&&center[0]<10,JSON.stringify({label,center}));assert.ok(framePixels>100,JSON.stringify({label,framePixels}));}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({fixture:'Public aperture skips placeholder color and depth; frame stays visible',...result,errors}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
