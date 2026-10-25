import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,relative,extname} from 'node:path';
import {chromium} from 'playwright';
const root=await realpath(process.env.PUBLIC_SUNSET_PACKAGE),out=process.env.FIDELITY_EVIDENCE;
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.bin':'application/octet-stream','.sog':'application/octet-stream','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.includes('\\')||name.includes('\\0')||name.split('/').includes('..'))throw Error('path');const file=await realpath(join(root,name==='/'?'index.html':name)),rel=relative(root,file),info=await stat(file);if(!rel||rel.startsWith('..')||!info.isFile())throw Error('file');res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=vulkan','--enable-features=Vulkan','--use-vulkan=native','--disable-vulkan-surface','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?quality=capture');
 await page.waitForFunction(()=>window.__repositoryWorldApp?.portals?.enabled&&window.__repositoryWorldApp?.host?.active,null,{timeout:120000});
 await page.evaluate(()=>{document.querySelector('#opening-splash').hidden=true;document.querySelector('#panel').hidden=true;document.querySelector('#world-welcome')?.remove();const a=window.__repositoryWorldApp;a.setFreeCam(true);});
 const poses=[
  {name:'warehouse-hill',eye:[-4,18,-155],target:[-4,10,-450]},
  {name:'beach-sea',eye:[-4,12,-420],target:[-4,3,-650]},
  {name:'shore-hills',eye:[0,24,-550],target:[0,30,-360]},
  {name:'island-overview',eye:[-70,180,-600],target:[-10,0,-90]},
  {name:'sky-seaward',eye:[-4,20,-420],target:[-4,110,-800]}
 ];
 for(const pose of poses){await page.evaluate(p=>{const a=window.__repositoryWorldApp;a.camera.position.set(...p.eye);a.camera.lookAt(...p.target);a.camera.updateMatrixWorld();},pose);await page.waitForTimeout(4500);await page.screenshot({path:join(out,pose.name+'.png')});}
 const diagnostic=await page.evaluate(()=>window.__repositoryWorldApp.diagnostics);await writeFile(join(out,'diagnostics.json'),JSON.stringify({diagnostic,errors},null,2));
 console.log(JSON.stringify({out,errors,backend:diagnostic.backend,nativeIsland:diagnostic.nativeIsland}));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
