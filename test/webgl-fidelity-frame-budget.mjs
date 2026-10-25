import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import {join,relative,extname} from 'node:path';
import {chromium} from 'playwright';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.bin':'application/octet-stream','.sog':'application/octet-stream','.wasm':'application/wasm'};
async function serve(root){root=await realpath(root);const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.includes('\\')||name.includes('\\0')||name.split('/').includes('..'))throw Error('path');const file=await realpath(join(root,name==='/'?'index.html':name)),rel=relative(root,file),info=await stat(file);if(!rel||rel.startsWith('..')||!info.isFile())throw Error('file');res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));return {url:'http://127.0.0.1:'+server.address().port+'/',close:()=>new Promise(done=>server.close(done))};}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=vulkan','--enable-features=Vulkan','--use-vulkan=native','--disable-vulkan-surface','--ignore-gpu-blocklist']});
const values=[];
try{
 for(const [name,root] of [['published',process.env.FIDELITY_BASELINE],['candidate',process.env.PUBLIC_SUNSET_PACKAGE]]){
  const server=await serve(root);
  try{
   const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(server.url+'?quality=capture');await page.waitForFunction(()=>window.__repositoryWorldApp?.portals?.enabled&&window.__repositoryWorldApp?.host?.active,null,{timeout:120000});
   await page.evaluate(()=>{const a=window.__repositoryWorldApp;document.querySelector('#opening-splash').hidden=true;document.querySelector('#panel').hidden=true;a.setFreeCam(true);a.camera.position.set(-4,18,-155);a.camera.lookAt(-4,10,-450);a.camera.updateMatrixWorld();});
   await page.waitForTimeout(6000);
   const sample=await page.evaluate(async()=>{const times=[];let last=performance.now();while(times.length<100){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-last);last=now;}times.sort((a,b)=>a-b);return {medianMs:times[50],p95Ms:times[95],frames:times.length,engineFrames:window.__repositoryWorldApp.engine.frame,plants:window.__repositoryWorldApp.diagnostics.nativeIsland?.plants};});
   values.push({name,...sample,errors});await page.close();
  }finally{await server.close();}
 }
 console.log(JSON.stringify(values));
}finally{await browser.close();}
