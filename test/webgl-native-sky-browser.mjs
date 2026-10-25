import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(new URL('..',import.meta.url).pathname);
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><link rel="icon" href="data:,">');return;}
 if(!path.startsWith('/src/')||path.split('/').includes('..'))throw Error('Path');
 res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(resolve(root,'.'+path)));
}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{
  const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js');
  const {buildWebGLNativeSky}=await import('/src/world-runtime/WebGLNativeIsland.js');
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');
  if(!gl)return{available:false};
  const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:false});
  renderer.setSize(256,256);renderer.toneMapping=T.ACESFilmicToneMapping;
  const camera=new T.PerspectiveCamera(65,1,.1,6000);
  camera.position.set(2,3,5);camera.lookAt(0,350,-500);camera.updateMatrixWorld();
  const scene=new T.Scene(),sky=buildWebGLNativeSky({timeOfDay:14,cloudCoverage:.75,windSpeed:8});
  scene.add(sky.mesh);
  const sample=(time,coverage,hour=14,weather='clear')=>{sky.setEnvironment({timeOfDay:hour,cloudCoverage:coverage,weather,windSpeed:8});sky.update(time,camera);renderer.render(scene,camera);const pixels=new Uint8Array(256*256*4);gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let sum=0,different=0;for(let i=0;i<pixels.length;i+=4){sum+=pixels[i]+pixels[i+1]+pixels[i+2];if(pixels[i]!==pixels[i+2])different++;}return{sum,different,pixels:Array.from(pixels.filter((_,i)=>i%64===0)).slice(0,512)};};
  const clear=sample(0,0),clouded=sample(0,.75),drifted=sample(300,.75),night=sample(0,.75,23),storm=sample(0,.75,14,'storm'),error=gl.getError();
  const output={available:true,error,clear:clear.sum,clouded:clouded.sum,drifted:drifted.sum,changedPixels:clouded.pixels.filter((v,i)=>v!==drifted.pixels[i]).length,night:night.sum,storm:storm.sum};
  sky.dispose();renderer.dispose();return output;
 });
 assert.deepEqual(errors,[]);assert.equal(result.available,true);
 assert.equal(result.error,0);assert.notEqual(result.clear,result.clouded);
 assert.ok(result.changedPixels>0,'cloud pattern must drift with time');assert.notEqual(result.night,result.clouded);assert.notEqual(result.storm,result.clouded);
 console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
