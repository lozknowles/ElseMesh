// Local synthetic browser benchmark. No software-adapter flags and no deployment.
// node tools/performance/portal-fps-benchmark.mjs --label baseline --output work/portal-baseline.json
// Optional: --channel chrome|msedge, --headless, --nodes 4096. Headed is the default.
import {createServer} from 'node:http';
import {writeFileSync} from 'node:fs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=resolve(arg('--output','work/portal-fps.json'));
const nodes=Number(arg('--nodes','4096'));
if(!Number.isInteger(nodes)||nodes<1||nodes>100000)throw Error('--nodes must be an integer from 1 to 100000');
await mkdir(dirname(output),{recursive:true});
let revision='unknown';try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
const report={schema:1,label:arg('--label','unlabelled'),createdAt:new Date().toISOString(),revision,
 fixture:'synthetic detached destination, actual PortalViews + native SceneRenderer multipass',
 resolution:{width:1280,height:720},warmFrames:60,sampledFrames:180,nodes,
 caveat:'rAF cadence includes vsync/browser scheduling; CPU portal time is submission work, not GPU duration. Synthetic fixture is not a whole-world game FPS claim.',
 launch:{headless:args.includes('--headless'),channel:arg('--channel',null),executablePath:process.env.CHROMIUM_PATH??null},errors:[]};
report.sourceHashes={};for(const path of ['src/world-runtime/PortalViews.js','src/engine/render/SceneRenderer.js','src/engine/render/MeshRenderer.js','src/engine/scene/Object3D.js','tools/performance/portal-fps-benchmark.mjs'])report.sourceHashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
const server=createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(path==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:0;background:#000}canvas{display:block}</style><canvas width="1280" height="720"></canvas>');return;}
 const file=resolve(root,'.'+path);if(!file.startsWith(root.endsWith(sep)?root:root+sep))throw Error('outside root');
 res.writeHead(200,{'content-type':extname(file)==='.js'?'text/javascript':'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
const progress=(stage,details={})=>{const event={at:new Date().toISOString(),stage,...details};(report.progress??=[]).push(event);process.stderr.write(JSON.stringify({progress:event})+'\n');};
// Host-side watchdog still fires if the page's event loop or GPU is stalled.
const deadline=setTimeout(()=>{report.status='wall-deadline-exceeded';report.errors.push('Benchmark exceeded 90 second wall deadline; see final progress stage');writeFileSync(output,JSON.stringify(report,null,2)+'\n');process.stderr.write(JSON.stringify({status:report.status,output,lastProgress:report.progress?.at(-1)})+'\n');void browser?.close();setTimeout(()=>process.exit(1),5000);},90000);
try{
 progress('browser-launch');
 browser=await chromium.launch({headless:report.launch.headless,...(report.launch.channel?{channel:report.launch.channel}:{}),...(report.launch.executablePath?{executablePath:report.launch.executablePath}:{}),args:['--enable-unsafe-webgpu','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 report.browserVersion=browser.version();
 const page=await browser.newPage({viewport:report.resolution,deviceScaleFactor:1});
 await page.exposeFunction('benchmarkProgress',(stage,details)=>progress(stage,details));
 const screenshot=output.replace(/\.json$/i,'')+'-visible.png';
 await page.exposeFunction('captureBenchmark',async()=>{await page.screenshot({path:screenshot});report.screenshot=screenshot;});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.bringToFront();
 report.result=await page.evaluate(async({nodes})=>{
  const stage=async name=>{await window.benchmarkProgress(name,{visibility:document.visibilityState});if(document.visibilityState!=='visible')throw Error('Benchmark page hidden at '+name);};
  await stage('imports');
  const N=await import('/src/engine/index.js'),{GPU}=await import('/src/engine/gpu/GPU.js'),{Texture,RenderTarget}=await import('/src/engine/gpu/Texture.js'),{MeshRenderer}=await import('/src/engine/render/MeshRenderer.js'),{SceneRenderer}=await import('/src/engine/render/SceneRenderer.js'),{Material}=await import('/src/engine/render/Material.js'),{FrameUniforms,setFrameCamera}=await import('/src/engine/render/Frame.js'),{setShadowMap}=await import('/src/engine/render/wgsl/lighting.js'),{readTexture}=await import('/src/engine/gpu/Readback.js'),{fromHalfFloat}=await import('/src/engine/math/DataUtils.js'),{PortalViews}=await import('/src/world-runtime/PortalViews.js');
  const check=(value,message)=>{if(!value)throw Error(message);};
  await stage('gpu-init');const canvas=document.querySelector('canvas');await GPU.init({canvas});
  const info=GPU.adapter.info??await GPU.adapter.requestAdapterInfo?.()??{};
  const adapter={vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,isFallbackAdapter:GPU.adapter.isFallbackAdapter??info.isFallbackAdapter??null,features:[...GPU.adapter.features]};
  const software=adapter.isFallbackAdapter===true||/swiftshader|llvmpipe|software|basic render|warp/i.test(JSON.stringify(adapter));
  if(software)return {status:'software-adapter-rejected',adapter,deviceBaseline:false};
  if(![adapter.vendor,adapter.architecture,adapter.device,adapter.description].some(Boolean)&&adapter.isFallbackAdapter!==false)return {status:'adapter-identity-unverified',adapter,deviceBaseline:false};
  const errors=[];GPU.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const shadow=new Texture({width:1,height:1,depth:1,dimension:'2d-array',format:'depth32float',usage:['sample']});setShadowMap(shadow);
  const camera=new N.PerspectiveCamera(60,1280/720,.05,100);camera.position.set(0,0,3);camera.lookAt(0,0,0);
  const mr=new MeshRenderer(),views=new PortalViews({engine:{},meshRenderer:mr,mainCamera:camera}),root=new N.Group(),scene=new N.Scene();
  const geometry=new N.PlaneGeometry(20,20),red=new Material({lit:false,color:'#ff0000',side:'double'}),green=new Material({lit:false,color:'#00ff00',side:'double'});
  for(const [z,material] of [[1,red],[-1,green]]){const mesh=new N.Mesh(geometry,material);mesh.position.set(10,0,z);root.add(mesh);}
  // Deterministic hierarchy, including a small number of real ambient callbacks.
  let parent=root;for(let i=0;i<nodes;i++){const group=new N.Group();group.position.set((i%7)*.001,0,0);parent.add(group);if(i%8===0)parent=root;else parent=group;if(i%64===0)group.userData.updateNeon=time=>{group.rotation.y=Math.sin(time)*.01;};}
  const water={createView:()=>({dispose(){}})},candidate={root,nativeIsland:{water,bindView(){}}};
  const aperture=views.setDestination('fixture',{candidate,ownsCandidate:false,authorizedView:true,state:'live',source:{position:[0,0,0],yaw:0,width:2,height:2},destination:{position:[10,0,0],yaw:0}});scene.add(aperture);
  const entry=views.entries.get('fixture');check(entry.viewRenderer instanceof SceneRenderer,'Actual multipass portal renderer missing');
  const root2=root.clone(true);root2.traverse(node=>{if(node.isGroup&&node.children.length===0)node.userData.updateNeon=time=>{node.rotation.y=Math.sin(time)*.01;};});
  const aperture2=views.setDestination('fixture2',{candidate:{root:root2,nativeIsland:{water,bindView(){}}},ownsCandidate:false,authorizedView:true,state:'live',source:{position:[1.5,0,0],yaw:0,width:2,height:2},destination:{position:[10,0,0],yaw:0}});scene.add(aperture2);const entry2=views.entries.get('fixture2');
  const mainRT=new RenderTarget(1280,720,{colors:['rgba16float'],depth:'depth32float'});
  // Display the genuine HDR render with a plain fullscreen texture blit.
  const {FullscreenPass}=await import('/src/engine/render/FullscreenPass.js');
  const display=new FullscreenPass({label:'benchmark display',colorFormats:[GPU.format],bindings:{image:{texture:mainRT.texture}},code:'fn fragment(in:FSIn)->vec4f{return vec4f(textureLoad(image,vec2i(in.pos.xy),0).rgb,1.0);}'});
  const draw=time=>{GPU.beginFrame();setFrameCamera(camera,1280,720);const start=performance.now();views.render({width:1280,height:720,time});const cpu=performance.now()-start;mr.render(scene,{kind:'color',camera,frameBlock:FrameUniforms,colorViews:[mainRT.texture.view()],colorFormats:mainRT.formats,clearColors:[[0,0,0,1]],depthView:mainRT.depthTexture.view(),depthFormat:'depth32float',clearDepth:0});display.render({colorViews:[GPU.context.getCurrentTexture().createView()],frameBlock:FrameUniforms});GPU.submit();return cpu;};
  const raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('requestAnimationFrame stalled for 5 seconds; visibility='+document.visibilityState)),5000);requestAnimationFrame(time=>{clearTimeout(timer);if(document.visibilityState!=='visible')reject(Error('Benchmark page hidden during rAF'));else resolve(time);});});
  await stage('pipeline-preparation');
  for(let i=0;i<4;i++){draw(i/60);await GPU.pipelinesReady();}await GPU.queue.onSubmittedWorkDone();
  const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b),percentile=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,median:percentile(.5),p95:percentile(.95),p99:percentile(.99),min:sorted[0],max:sorted.at(-1)};};
  const scenarios=[];
  for(const name of ['visible','visible2','backface','outfrustum','empty']){
   if(name==='visible2'){views.entries.set('fixture2',entry2);scene.add(aperture2);}else{views.entries.delete('fixture2');scene.remove(aperture2);}
   if(name==='empty'){views.entries.delete('fixture');scene.remove(aperture);}else{camera.position.set(0,0,name==='backface'?-3:3);camera.lookAt(name==='outfrustum'?100:0,0,name==='outfrustum'?3:0);}
   await stage(name+':warmup');for(let i=0;i<60;i++){const t=await raf();draw(t/1000);}await stage(name+':warmup-drain');await GPU.queue.onSubmittedWorkDone();
   await stage(name+':sampling');const cpu=[],intervals=[];let previous=await raf();for(let i=0;i<180;i++){const t=await raf();intervals.push(t-previous);previous=t;cpu.push(draw(t/1000));}await stage(name+':sample-drain');await GPU.queue.onSubmittedWorkDone();
   // Instrument only a separate diagnostic frame, never the timed sample frames.
   await stage(name+':readback');let matrixUpdates=0;const originals=[];for(const graph of [root,root2])graph.traverse(node=>{const original=node.updateMatrixWorld;originals.push([node,original]);node.updateMatrixWorld=function(...args){matrixUpdates++;return original.apply(this,args);};});draw(0);for(const [node,original]of originals)node.updateMatrixWorld=original;
   const pixels=Float32Array.from(new Uint16Array((await readTexture(mainRT.texture)).data),fromHalfFloat),center=(360*1280+640)*4,rgba=Array.from(pixels.slice(center,center+4));
   if(name==='visible'||name==='visible2')check(rgba[0]>.9&&rgba[1]<.01,'Visible destination must show red with near green wall clipped');
   if(name==='backface')check(rgba[0]<.1&&rgba[1]<.1,'Portal backface must remain closed');
   if(name==='empty'||name==='outfrustum')check(rgba[0]===0&&rgba[1]===0,'Empty/outfrustum portal scene must remain black');
   scenarios.push({name,portalCpuMs:summarize(cpu),frameIntervalMs:summarize(intervals),cadenceFps:1000/summarize(intervals).mean,diagnosticMatrixUpdates:matrixUpdates,centerRGBA:rgba,raw:{portalCpuMs:cpu,frameIntervalMs:intervals}});
   if(name==='visible'){await stage(name+':screenshot');await window.captureBenchmark();}await stage(name+':complete');
  }
  views.entries.set('fixture',entry);check(errors.length===0,'WebGPU validation errors: '+errors.join('; '));
  return {status:'measured',adapter,deviceBaseline:true,scenarios,errors,visibleState:entry.aperture.userData.portalViewState,visibility:document.visibilityState};
 },{nodes});
 report.status=report.result.status;
}catch(error){if(report.status!=='wall-deadline-exceeded')report.status='unavailable-or-failed';report.errors.push(error.stack??String(error));}
finally{progress('closing');await browser?.close();await new Promise(r=>server.close(r));await writeFile(output,JSON.stringify(report,null,2)+'\n');clearTimeout(deadline);}
console.log(JSON.stringify({status:report.status,output,adapter:report.result?.adapter,scenarios:report.result?.scenarios?.map(({raw,...rest})=>rest),errors:report.errors}));
if(report.status!=='measured'||report.errors.length)process.exitCode=1;
