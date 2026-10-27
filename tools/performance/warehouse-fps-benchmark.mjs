// Actual local published Warehouse application: WebGL regression evidence only.
// node tools/performance/warehouse-fps-benchmark.mjs --label baseline-A1 --output work/warehouse-A1.json
// Primary owns source selection between ABBA runs; this tool never changes source/world files.
import {build} from 'vite';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile,readdir,realpath,stat} from 'node:fs/promises';
import {writeFileSync,createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {installWarehouseWebGLInstrumentation} from './warehouse-webgl-instrumentation.mjs';
import {installWarehouseReadbackDiagnostics} from './warehouse-readback-diagnostics.mjs';
import {installWarehouseFrameBudgetDiagnostics} from './warehouse-frame-budget-diagnostics.mjs';
import {installWarehouseLifecycleDiagnostics} from './warehouse-lifecycle-diagnostics.mjs';
import {installCanonicalGenerationPrototype} from './canonical-generation-prototype.mjs';
import {runCanonicalQualification} from './warehouse-generation-camera-oracle.mjs';
import {runWarehouseRotationOracle} from './warehouse-rotation-oracle.mjs';
import {runWarehouseSplatKeyOracle} from './warehouse-splat-key-oracle.mjs';
import {createWebGLMergeSorter} from './webgl-merge-sort-prototype.mjs';
import {createWebGLGatherSorter} from './webgl-gather-sort-prototype.mjs';
import {runWarehouseGpuSortOracle} from './warehouse-gpu-sort-oracle.mjs';
import {profileWebGLMergeStages} from './webgl-sort-stage-diagnostics.mjs';
import {validateWarehousePlantOrder} from './warehouse-plant-order-visuals.mjs';

const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const profile=option('--profile','off'),scenarioSelection=option('--scenario','all');
if(args.includes('--depth-visuals')&&args.includes('--plant-order-visuals'))throw Error('Choose one visual comparison strategy');
const visualStrategy=args.includes('--plant-order-visuals')?'historical-plant-order':'wall-depth-prepass';
const visualValidator=visualStrategy==='wall-depth-prepass'?(await import('./warehouse-depth-prepass-visuals.mjs')).validateWarehouseDepthPrepass:validateWarehousePlantOrder;
if(!['off','accounting','gpu','gpu-objects','gpu-scissor','trace'].includes(profile))throw Error('--profile must be accounting, gpu, gpu-objects, gpu-scissor, trace, or off');
if(!['all','portal-motion','portal-stationary'].includes(scenarioSelection))throw Error('--scenario must be all, portal-motion, or portal-stationary');
const root=fileURLToPath(new URL('../../',import.meta.url)),output=resolve(option('--output','work/warehouse-fps.json'));
await mkdir(dirname(output),{recursive:true});
const report={schema:1,label:option('--label','unlabelled'),startedAt:new Date().toISOString(),fixture:'actual published Warehouse app, original pinned Warehouse and Sunset assets',viewport:{width:1280,height:720},deviceScaleFactor:1,quality:'standard',warmFrames:180,sampledFrames:180,simulationStartFrame:6000,launch:{channel:option('--channel','msedge'),headless:!args.includes('--headed'),args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']},errors:[],assetErrors:[],externalRequests:[],progress:[],sourceHashes:{},
 caveats:['Published Warehouse uses WebGL2: native portal transform optimisation has zero direct execution here.','Full frame CPU measures the actual app update callback, excluding rAF observer and camera preparation; submission time is not GPU duration.','No GPU completion/readback waits occur inside timed frames. Cadence is browser/vsync limited.','Math.random seeded; app callback receives fixed dt=1/60 and frame time. Each scenario starts at common logical frame6000+scenarioIndex*(180+sampledFrames) after readiness. Asset-loading completion and premeasurement Microduck state may still vary between boots. Microduck and ambient workloads remain active.','Camera route uses free camera around authored positions; it is a rendering regression route, not player collision/traversal acceptance. Screenshots are visual checkpoints, not identical-frame pixel comparisons.']};
report.sampledFrames=Number(option('--sample-frames','180'));if(!Number.isInteger(report.sampledFrames)||report.sampledFrames<180||report.sampledFrames>1800||report.sampledFrames%180)throw Error('Sample count must be a multiple of180 between180and1800');
report.observeLongTasks=args.includes('--observe-longtasks');
report.lifecycleObserve=args.includes('--lifecycle-observe');
report.frameClockControlRequested=args.includes('--frame-clock-control');
report.rotationOracleRequested=args.includes('--rotation-oracle');
report.generationCameraOracleRequested=args.includes('--generation-camera-oracle');
if(report.rotationOracleRequested||report.generationCameraOracleRequested){report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.caveats.push('Explicit post-timing generation-camera experiment. The candidate is never enabled during timing or in production; exact settled outputs do not qualify unsynchronised moving publication or FPS.');}
if(report.lifecycleObserve)report.lifecycleObserverSha256=createHash('sha256').update(await readFile(new URL('./warehouse-lifecycle-diagnostics.mjs',import.meta.url))).digest('hex');
if(report.lifecycleObserve){report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.caveats.push('Lifecycle observer records existing Spark generation/sort inputs and work counts. Diagnostic overhead is present; inferred reasons are not authoritative GPU execution causes.');}
report.splatKeyOracleRequested=args.includes('--splat-key-oracle');
if(report.splatKeyOracleRequested){report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.splatKeyOraclePhase='post-timing';report.caveats.push('Splat key oracle is an explicit post-timing diagnostic: temporarily pauses frame delivery, captures existing GPU keys and compares CPU candidates through the installed sorter on copies. No candidate ordering is installed; rejected exact ordering is a valid diagnostic result.');}
report.gpuSortOracleRequested=args.includes('--gpu-sort-oracle');
const gpuSortMethod=option('--gpu-sort-method','point-scatter'),gpuSortStages=args.includes('--gpu-sort-stages');
if(!['point-scatter','fragment-gather'].includes(gpuSortMethod))throw Error('--gpu-sort-method must be point-scatter or fragment-gather');
if((args.includes('--gpu-sort-method')||gpuSortStages)&&!report.gpuSortOracleRequested)throw Error('GPU sort method/stages require --gpu-sort-oracle');
if(gpuSortStages&&gpuSortMethod!=='point-scatter')throw Error('--gpu-sort-stages requires point-scatter');
if(report.gpuSortOracleRequested&&report.splatKeyOracleRequested)throw Error('CPU and GPU sort oracles require separate browser sessions');
if([report.gpuSortOracleRequested,report.splatKeyOracleRequested,report.rotationOracleRequested,report.generationCameraOracleRequested].filter(Boolean).length>1)throw Error('Choose one post-timing oracle per browser session');
if(report.gpuSortOracleRequested){report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.gpuSortOraclePhase='post-timing';report.gpuSortMethod=gpuSortMethod;report.gpuSortStages=gpuSortStages;report.caveats.push('GPU sorting prototype is an explicit post-timing diagnostic with bounded synthetic/captured-key comparisons; rendered pixel equality is not tested. No prototype result is published or admitted as an optimisation.');}
report.readbackDiagnostic=args.includes('--readback-observe')?{usage:option('--readback-usage','original'),restorePack:args.includes('--readback-restore-pack'),drainQueue:args.includes('--readback-drain-queue')}:null;
if(report.readbackDiagnostic){report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.caveats.push('Readback lifecycle/copy diagnostic only; wrappers and selected controlled allocation/binding experiment change behaviour/overhead. Cadence is not acceptance evidence.');}
report.frameBudget=Number(option('--frame-budget','0'));if(![0,2,3,64].includes(report.frameBudget))throw Error('Frame budget must be0,2,3,64');if(report.frameBudget){if(report.readbackDiagnostic?.drainQueue)throw Error('Frame budget and drain are separate experiments');report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.caveats.push('GPU frame budget diagnostic: app submissions are deferred until budget is available; FPS includes deferred rAF intervals. No logical route frames omitted.');}
report.comparisonBlocks=option('--comparison-blocks',null);
if(report.comparisonBlocks!==null&&report.comparisonBlocks!=='BCCB')throw Error('Only the predeclared BCCB block diagnostic is supported');
if(report.comparisonBlocks&&(profile!=='off'||scenarioSelection!=='portal-motion'))throw Error('BCCB requires unprofiled portal-motion mode');
if(report.comparisonBlocks){report.sameBootDiagnostic=true;report.caveats.push('Same-boot B/C/C/B blocks: toggle exact prior distant-tree renderOrder and wall prepass only.180 settlingframes before eachblock. Continuous simulation, identical camera cycles; animation state differs between blocks. Separate from independent-boot evidence.');}
report.visualStrategy=visualStrategy;
report.profileMode=profile;report.scenarioSelection=scenarioSelection;
report.depthPrepassMode=option('--depth-prepass','on');
if(profile==='gpu-scissor'){report.diagnosticOnly=true;report.acceptedOptimizationTiming=false;report.caveats.push('ONE-PIXEL MAIN SCISSOR DIAGNOSTIC: resulting cadence and images are deliberately altered diagnostic evidence and cannot qualify visual fidelity or optimisation acceptance. Portal rendering remains ordinary; all original main draws are submitted.');}
report.revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const changedProductionFiles=execFileSync('git',['diff','--name-only','HEAD','--','src','public'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
for(const path of new Set(['src/world-runtime/main.js','src/world-runtime/PortalViews.js','src/world-runtime/WebGLPortalViews.js','src/world-runtime/SplatSceneAdapter.js','src/world-runtime/WebGLNativeIsland.js','src/world-runtime/SplatPortalProjection.js','src/engine/render/SceneRenderer.js','src/engine/render/MeshRenderer.js','src/engine/scene/Object3D.js','public/published-worlds.json','public/opening-world.json','tools/performance/warehouse-fps-benchmark.mjs','tools/performance/warehouse-webgl-instrumentation.mjs',...changedProductionFiles]))report.sourceHashes[path]=await readFile(resolve(root,path)).then(bytes=>createHash('sha256').update(bytes).digest('hex'),error=>error.code==='ENOENT'?'deleted':Promise.reject(error));
report.catalog=JSON.parse(await readFile(resolve(root,'public/published-worlds.json'),'utf8'));
for(const path of ['src/world-runtime/WebGLOpaqueDepthPrepass.js','tools/performance/warehouse-depth-prepass-visuals.mjs','tools/performance/warehouse-plant-order-visuals.mjs','tools/performance/warehouse-plant-order-diagnostics.mjs','tools/performance/warehouse-readback-diagnostics.mjs','tools/performance/warehouse-frame-budget-diagnostics.mjs'])report.sourceHashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
if(report.splatKeyOracleRequested){const path='tools/performance/warehouse-splat-key-oracle.mjs';report.splatKeyOracleSourceSha256=report.sourceHashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');}
if(report.gpuSortOracleRequested){report.gpuSortSources={};for(const name of ['webgl-merge-sort-prototype.mjs','webgl-gather-sort-prototype.mjs','warehouse-gpu-sort-oracle.mjs','webgl-sort-stage-diagnostics.mjs']){const path='tools/performance/'+name;report.gpuSortSources[name]=report.sourceHashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');}}
for(const world of report.catalog.worlds){const bytes=await readFile(resolve(root,'public',world.bundlePath,'world.json'));if(createHash('sha256').update(bytes).digest('hex')!==world.contentDigest)throw Error('Local bundle manifest differs from catalog: '+world.worldId);}
const progress=(stage,details={})=>{const item={at:new Date().toISOString(),stage,...details};report.progress.push(item);process.stderr.write(JSON.stringify({progress:item})+'\n');};
let server,browser,page,closing=false,traceSession=null,traceStartPromise=null,traceStopPromise=null,traceCompletePromise=null,traceStopTimer=null,traceStarted=false;
const deadline=setTimeout(()=>{report.status='wall-deadline-exceeded';report.errors.push('Actual-world benchmark exceeded 240 second wall deadline');writeFileSync(output,JSON.stringify(report,null,2)+'\n');process.stderr.write(JSON.stringify({status:report.status,output,lastProgress:report.progress.at(-1)})+'\n');void browser?.close();setTimeout(()=>process.exit(1),5000);},report.comparisonBlocks?360000:240000);
const finishTrace=async reason=>{
 if(!traceStartPromise)return;if(traceStopPromise)return traceStopPromise;
 traceStopPromise=(async()=>{try{
  await traceStartPromise;if(!traceStarted)return;if(traceStopTimer)clearTimeout(traceStopTimer);report.trace.stopReason=reason;report.trace.stopRequestedAt=Date.now();
  const syncId='warehouse-stop-'+report.trace.startRequestedAt;report.trace.clockSyncIds.push(syncId);await traceSession.send('Tracing.recordClockSyncMarker',{syncId}).catch(error=>report.trace.clockSyncErrors.push(String(error)));
  await traceSession.send('Tracing.end');let completionTimer,complete;try{complete=await Promise.race([traceCompletePromise,new Promise((_,reject)=>{completionTimer=setTimeout(()=>reject(Error('Trace completion exceeded15s')),15000);})]);}finally{clearTimeout(completionTimer);}traceStarted=false;report.trace.dataLossOccurred=complete.dataLossOccurred;
  if(!complete.stream)throw Error('Trace completed without a readable stream');
  const chunks=[];let bytes=0;try{for(;;){const part=await traceSession.send('IO.read',{handle:complete.stream,size:512*1024}),chunk=Buffer.from(part.data,part.base64Encoded?'base64':'utf8');bytes+=chunk.length;chunks.push(chunk);if(bytes>64*1024*1024){report.trace.truncated=true;break;}if(part.eof)break;}}finally{await traceSession.send('IO.close',{handle:complete.stream}).catch(()=>{});}
  const raw=Buffer.concat(chunks);report.trace.rawPath=resolve(root,'work','warehouse-trace-'+report.trace.startRequestedAt+'.json');await writeFile(report.trace.rawPath,raw);report.trace.rawBytes=raw.length;
  if(!report.trace.truncated){const parsed=JSON.parse(raw.toString('utf8')),events=Array.isArray(parsed)?parsed:parsed.traceEvents??[],threads=events.filter(event=>event.ph==='M'&&event.name==='thread_name').map(event=>({pid:event.pid,tid:event.tid,name:event.args?.name})),processes=events.filter(event=>event.ph==='M'&&event.name==='process_name').map(event=>({pid:event.pid,name:event.args?.name})),workerThreads=threads.filter(thread=>/DedicatedWorker|WebWorker|WorkerThread/i.test(thread.name??'')),workerIds=new Set(workerThreads.map(thread=>thread.pid+':'+thread.tid)),workerEvents=events.filter(event=>event.ph!=='M'&&workerIds.has(event.pid+':'+event.tid));
   report.trace.evidence={eventCount:events.length,processes,threads,dedicatedWorkerThreads:workerThreads,dedicatedWorkerEventCount:workerEvents.length,workerEventsVerified:workerEvents.length>0,workerEventNameCounts:Object.fromEntries([...new Set(workerEvents.map(event=>event.name))].map(name=>[name,workerEvents.filter(event=>event.name===name).length])),gpuEventCandidates:events.filter(event=>/gpu/i.test(event.cat??'')).length,compositorEventCandidates:events.filter(event=>/compositor|\bcc\b|\bviz\b/i.test((event.cat??'')+' '+event.name)).length,readbackEventNameCounts:Object.fromEntries([...new Set(events.filter(event=>/ReadPixels|Readback|GetBufferSubData|ClientWaitSync|FenceSync/i.test(event.name??'')).map(event=>event.name))].map(name=>[name,events.filter(event=>event.name===name).length])),frameClockMarkers:events.filter(event=>event.name?.startsWith('warehouse-frame:')).map(event=>({name:event.name,pid:event.pid,tid:event.tid,ts:event.ts})).slice(0,360)};
   report.trace.coverageGaps=[];if(!workerEvents.length)report.trace.coverageGaps.push('No dedicated-worker events verified in captured interval');if(!report.trace.evidence.gpuEventCandidates)report.trace.coverageGaps.push('No GPU-category events observed');if(complete.dataLossOccurred)report.trace.coverageGaps.push('Chrome reports trace buffer data loss');
  }
  report.trace.status=report.trace.truncated?'truncated':'saved';
 }catch(error){report.trace.status='unavailable-or-failed';report.trace.error=String(error);report.errors.push('Trace collection: '+String(error));}finally{if(traceSession)await traceSession.detach().catch(()=>{});}})();return traceStopPromise;
};
try{
 progress('production-build');const buildRoot=resolve(root,'work','warehouse-fps-build-'+Date.now()),ownedWorkRoot=resolve(root,'work');
 if(!buildRoot.startsWith(ownedWorkRoot+sep)||relative(ownedWorkRoot,buildRoot).includes('..'))throw Error('Build output must remain inside owned work directory');
 await mkdir(buildRoot,{recursive:false});
 // Normal repository production configuration; fresh uniquely owned directory only.
 await build({root,build:{outDir:buildRoot,emptyOutDir:true},clearScreen:false,logLevel:'error'});
 report.productionBuild={root:buildRoot,chunks:{},resourceURLs:[]};
 const hashChunks=async directory=>{for(const entry of await readdir(directory,{withFileTypes:true})){const full=resolve(directory,entry.name);if(entry.isDirectory())await hashChunks(full);else if(/\.(?:js|css|html)$/.test(entry.name)){const bytes=await readFile(full);report.productionBuild.chunks[relative(buildRoot,full).split(sep).join('/')]=createHash('sha256').update(bytes).digest('hex');}}};await hashChunks(buildRoot);
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.glb':'model/gltf-binary','.wasm':'application/wasm'};
 server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').includes('..'))throw Error('Invalid path');const file=await realpath(resolve(buildRoot,'.'+(pathname==='/'?'/index.html':pathname))),info=await stat(file);if(!file.startsWith(buildRoot+sep)||!info.isFile())throw Error('Outside static build');res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store'});createReadStream(file).pipe(res);}catch{res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address(),origin='http://127.0.0.1:'+address.port;
 progress('browser-start');browser=await chromium.launch(report.launch);report.browserVersion=browser.version();
 page=await browser.newPage({viewport:report.viewport,deviceScaleFactor:report.deviceScaleFactor});page.setDefaultTimeout(20000);
 if(report.frameClockControlRequested){
  progress('empty-page-frame-clock-control');await page.bringToFront();
  report.frameClockControl=await page.evaluate(()=>new Promise((resolve,reject)=>{const intervals=[];let previous=null,warm=30,frameId;const timer=setTimeout(()=>{cancelAnimationFrame(frameId);reject(Error('Empty-page frame clock exceeded ten seconds'));},10000);function frame(at){if(previous!==null&&warm--<=0)intervals.push(at-previous);previous=at;if(intervals.length===120){clearTimeout(timer);resolve({intervals,frames:intervals.length,cadenceFps:1000*intervals.length/intervals.reduce((sum,value)=>sum+value,0),visibility:document.visibilityState,devicePixelRatio,scope:'Empty page before game loading, not a GPU throughput measurement or proof of a particular OS/session cause.'});}else frameId=requestAnimationFrame(frame);}frameId=requestAnimationFrame(frame);}));
 }
 if(profile==='trace'){
  report.trace={status:'waiting-for-selected-sampling',maximumDurationMs:10000,bufferSizeKiB:16384,clockSyncIds:[],clockSyncErrors:[],bufferUsage:[],note:'One short diagnostic interval in the selected gold-door sample only. Trace timing has observer overhead; event categories are evidence candidates, not automatic GPU/worker bottleneck attribution.'};
  await page.exposeFunction('__warehouseProfileStage',event=>{if(traceStartPromise||!event.stage.startsWith('gold-sunset-'))return;traceStartPromise=(async()=>{report.trace.startRequestedAt=Date.now();report.trace.browserClockAtRequest=event;traceSession=await browser.newBrowserCDPSession();traceCompletePromise=new Promise(resolve=>traceSession.once('Tracing.tracingComplete',resolve));traceSession.on('Tracing.bufferUsage',usage=>report.trace.bufferUsage.push({at:Date.now(),...usage}));report.trace.categories=['toplevel','devtools.timeline','v8','v8.execute','blink.user_timing','gpu','cc','viz','disabled-by-default-devtools.timeline','disabled-by-default-devtools.timeline.frame','disabled-by-default-gpu.service'];await traceSession.send('Tracing.start',{transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'none',bufferUsageReportingInterval:1000,traceConfig:{recordMode:'recordContinuously',traceBufferSizeInKb:16384,includedCategories:report.trace.categories}});traceStarted=true;report.trace.status='collecting';report.trace.startConfirmedAt=Date.now();const syncId='warehouse-start-'+report.trace.startRequestedAt;report.trace.clockSyncIds.push(syncId);await traceSession.send('Tracing.recordClockSyncMarker',{syncId}).catch(error=>report.trace.clockSyncErrors.push(String(error)));traceStopTimer=setTimeout(()=>void finishTrace('ten-second-cap'),10000);})().catch(error=>{report.trace.status='unavailable-or-failed';report.trace.error=String(error);report.errors.push('Trace start: '+String(error));});return traceStartPromise;});
 }
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&!/\/runtime-config(?:\?|$)/.test(message.location().url))report.errors.push(message.text());});
 report.networkEvents=[];report.requestFailures=[];const requestIds=new WeakMap();let requestSequence=0;
 const networkEvent=(event,request,extra={})=>{const item={event,requestId:requestIds.get(request),url:request.url(),resourceType:request.resourceType(),asset:request.resourceType()!=='document'&&!/\/(runtime-config|favicon.ico)(\?|$)/.test(request.url()),at:Date.now(),hostStage:report.progress.at(-1)?.stage,...extra};report.networkEvents.push(item);return item;};
 page.on('response',response=>{if(closing)return;const event=networkEvent('response-headers',response.request(),{status:response.status()});if(response.status()>=400&&event.asset)report.assetErrors.push(event);});
 page.on('requestfinished',request=>{if(!closing)networkEvent('request-completed',request);});
 page.on('requestfailed',request=>{if(closing)return;const event=networkEvent('request-failed',request,{error:request.failure()?.errorText});report.requestFailures.push(event);if(event.asset)report.assetErrors.push(event);});
 page.on('request',request=>{if(closing)return;requestIds.set(request,++requestSequence);networkEvent('request-started',request);if(request.resourceType()==='script'||request.resourceType()==='stylesheet'){report.productionBuild.resourceURLs.push(request.url());if(/\/(?:@vite|@id|@fs)\/|node_modules\/\.vite/.test(request.url()))report.errors.push('Development module URL in production benchmark: '+request.url());}});
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.externalRequests.push(url);return route.abort('blockedbyclient');});
 await page.addInitScript(({observe,splatKeyOracle})=>{
  let seed=1052025;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const b=window.__warehouseBenchmark={simulationFrame:0,scenario:null,stage:'boot',rows:[],done:false,error:null,portalCpu:0,portalDraws:0,lastFrameAt:performance.now(),originalUpdates:[],consumedResponses:[],fetchEvents:[]};let app;
  // Observe successful consumption without changing requests, source readers, or aborts.
  const nativeFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const requestedURL=args[0] instanceof Request?args[0].url:new URL(String(args[0]),location.href).href;b.fetchEvents.push({event:'fetch-started',url:requestedURL,at:Date.now(),stage:b.stage});let response;try{response=await nativeFetch(...args);}catch(error){b.fetchEvents.push({event:'fetch-rejected',url:requestedURL,at:Date.now(),stage:b.stage,error:String(error)});throw error;}const url=response.url,expected=response.headers.get('content-length');b.fetchEvents.push({event:'fetch-response',url,at:Date.now(),stage:b.stage,status:response.status});
   const complete=(kind,bytes)=>b.consumedResponses.push({url,kind,bytes,expectedBytes:expected===null?null:Number(expected),completedAt:Date.now(),simulationFrame:b.simulationFrame,stage:b.stage});
   const arrayBuffer=response.arrayBuffer.bind(response);response.arrayBuffer=async()=>{const bytes=await arrayBuffer();complete('arrayBuffer fulfilled',bytes.byteLength);return bytes;};
   if(response.body){const getReader=response.body.getReader.bind(response.body);response.body.getReader=(...readerArgs)=>{const reader=getReader(...readerArgs),read=reader.read.bind(reader);let bytes=0,finished=false;reader.read=async(...readArgs)=>{const part=await read(...readArgs);bytes+=part.value?.byteLength??0;if(part.done&&!finished){finished=true;complete('stream reader done:true',bytes);}return part;};return reader;};}
   return response;
  };
  b.browserObservations={enabled:observe,timeOrigin:performance.timeOrigin,longTasks:[],events:[]};
  if(observe){
   const record=type=>b.browserObservations.events.push({type,at:Date.now(),timestamp:performance.now(),visibility:document.visibilityState,focus:document.hasFocus()});
   for(const type of ['visibilitychange','focus','blur','webglcontextlost','webglcontextrestored'])window.addEventListener(type,()=>record(type),true);
   record('observation-start');
   try{b.longTaskObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())b.browserObservations.longTasks.push({startTime:entry.startTime,at:performance.timeOrigin+entry.startTime,duration:entry.duration,name:entry.name});});b.longTaskObserver.observe({type:'longtask',buffered:true});}catch(error){b.browserObservations.error=String(error);}
  }
  const requestFrame=window.requestAnimationFrame.bind(window);
  if(splatKeyOracle){b.splatOracleGateAvailable=true;window.requestAnimationFrame=callback=>{const deliver=timestamp=>{if(b.splatOraclePaused||b.readbackDrain?.active){if(b.readbackDrain?.active)b.readbackDrain.deferredCallbacks=(b.readbackDrain.deferredCallbacks??0)+1;requestFrame(deliver);return;}b.activeRafTimestamp=timestamp;callback(timestamp);};return requestFrame(deliver);};}
  else window.requestAnimationFrame=callback=>{const deliver=timestamp=>{if(b.readbackDrain?.active){if(b.readbackDrain?.active)b.readbackDrain.deferredCallbacks=(b.readbackDrain.deferredCallbacks??0)+1;requestFrame(deliver);return;}b.activeRafTimestamp=timestamp;callback(timestamp);};return requestFrame(deliver);};
  Object.defineProperty(window,'__repositoryWorldApp',{configurable:true,get:()=>app,set:value=>{
   app=value;const start=app.engine.start.bind(app.engine);app.engine.start=update=>start((_dt,_time)=>{
    if(b.frameBudget&&!b.frameBudget.shouldSubmit())return;
    b.lastFrameAt=performance.now();const config=b.scenario,index=config?b.index++:0;
    if(config){
     if(index===180){b.stage=config.name+':sampling';b.sampleWindow={startAt:Date.now(),endAt:null};}
     if(document.visibilityState!=='visible'){b.error='Actual game page became hidden';b.done=true;b.scenario=null;return;}
     const phase=(index%180)/179,offset=Math.sin(phase*Math.PI*2)*(config.lateral??0),position=config.position.map((v,i)=>v+(config.tangent?.[i]??0)*offset),target=config.target;
     const yaw=target?Math.atan2(position[0]-target[0],position[2]-target[2]):config.yaw,pitch=target?Math.atan2(target[1]-position[1],Math.hypot(target[0]-position[0],target[2]-position[2])):config.pitch??0;
     app.fly.setPose(app.camera.position.clone().fromArray(position),yaw,pitch);
    }
    b.profile?.frameStart();b.portalCpu=0;b.portalDraws=0;const before=performance.now(),time=b.simulationFrame++/60;
    // main.js intentionally skips host simulation in free camera; retain that real
    // native-island/water/traffic/neon/ambient/LOD work exactly once, inside CPU timing.
    if(app.freeCam)app.host.update(1/60,time,{move:false,interact:false,viewCamera:app.camera});
    update(1/60,time);const cpu=performance.now()-before;b.profile?.frameEnd();b.frameBudget?.afterFrame();
    if(config){const now=b.activeRafTimestamp,interval=b.previousAt===null?null:now-b.previousAt;b.previousAt=now;
     if(index>=180)b.rows.push({index:index-180,rafTimestamp:now,frameCpuMs:cpu,portalCpuMs:b.portalCpu,frameIntervalMs:interval,portalDraws:b.portalDraws,camera:app.camera.position.toArray(),simulationFrame:b.simulationFrame,depthPrepassResult:app.opaqueDepthPrepass?.lastResult??null});
     if(index>=179+(config.sampleFrames??180)){b.sampleWindow.endAt=Date.now();b.scenarioEndAt=Date.now();b.stage=config.name+':post-sample';b.done=true;b.scenario=null;}
    }
   });
  }});
  setInterval(()=>{if(b.scenario&&performance.now()-b.lastFrameAt>5000){b.error='Actual game frame loop stalled for more than 5 seconds';b.done=true;b.scenario=null;}},1000);
 },{observe:report.observeLongTasks,splatKeyOracle:report.splatKeyOracleRequested||report.gpuSortOracleRequested||report.rotationOracleRequested||report.generationCameraOracleRequested});
 progress('app-load');await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.bringToFront();
 await page.waitForFunction(()=>window.__repositoryWorldApp?.host.active&&window.__repositoryWorldApp.portals.mode==='published'&&window.__repositoryWorldApp.portals.enabled,null,{timeout:120000});
 const dismiss=page.getByRole('button',{name:'Dismiss',exact:true});if(await dismiss.isVisible())await dismiss.click();const panel=page.locator('#panel-toggle');if(await panel.isVisible())await panel.click();await page.locator('canvas').focus();
 await page.evaluate(enabled=>{const a=window.__repositoryWorldApp;if(!a.opaqueDepthPrepass)throw Error('Main-pass controller missing');a.opaqueDepthPrepass.enabled=enabled;},report.depthPrepassMode!=='off');
 progress('hardware-and-hooks');report.environment=await page.evaluate(async()=>{
  const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;b.stage='readiness';
  if(a.backend!=='webgl2'||a.gpu!==null||a.engine.meshRenderer||!a.engine.renderer.isWebGLRenderer||![...a.portals.views.entries.values()].every(e=>e.material.isShaderMaterial&&!e.block))throw Error('Actual published WebGL2 backend required');
  const gl=a.engine.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info'),renderer=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,vendor=extension?gl.getParameter(extension.UNMASKED_VENDOR_WEBGL):null;
  if(!renderer||/swiftshader|llvmpipe|software|basic render|\bwarp\b/i.test(renderer))throw Error('Hardware WebGL renderer unavailable or unverified: '+renderer);
  // Shared observation only: active rendering is not a request to renew its
  // admission fingerprint. The inactive package retains its admission check.
  b.observeReadiness=({requireLive=true,diagnostic=false}={})=>{
   const runtime=a.portals,cache=runtime.cache,active=a.host.active,catalog=runtime.catalog,records=[...cache.records.values()],opening=catalog.worlds.find(world=>world.worldId===catalog.openingWorldId),sunset=catalog.worlds.find(world=>world.worldId!==catalog.openingWorldId),activeRecord=records.find(record=>record.loaded.identity.worldId===opening?.worldId),inactiveRecord=records.find(record=>record.loaded.identity.worldId===sunset?.worldId),duck=a.publicDuck.diagnostics();
   let parent=active?.root,belongsToMainScene=false;while(parent){if(parent===a.engine.scene){belongsToMainScene=true;break;}parent=parent.parent;}
   const preview=inactiveRecord?[...runtime.views.entries.values()].find(entry=>entry.candidate?.root===inactiveRecord.candidate.root):null,presented=preview?.aperture.userData.portalViewState;
   let inactiveAdmissionReady=false,inactiveAdmissionError=null;try{inactiveAdmissionReady=!!inactiveRecord&&cache.isReady(inactiveRecord);}catch(error){inactiveAdmissionError=String(error);}
   const conditions={exactlyTwoPackages:records.length===2,cacheNotDisposed:!cache.disposed,activeExpectedWorld:active?.identity.worldId===opening?.worldId,activeExpectedDigest:active?.identity.contentDigest===opening?.contentDigest,activeRecordExpectedDigest:activeRecord?.loaded.identity.contentDigest===opening?.contentDigest,activeRecordIsCacheActive:!!activeRecord&&activeRecord===cache.active,activeRecordFlag:activeRecord?.active===true,activeRecordRootMatches:!!activeRecord&&activeRecord.candidate.root===active?.root,activeRootBelongsToMainScene:belongsToMainScene,activeRecordNotDisposed:!!activeRecord&&!activeRecord.disposed,inactiveExpectedDigest:inactiveRecord?.loaded.identity.contentDigest===sunset?.contentDigest,inactiveRecordNotDisposed:!!inactiveRecord&&!inactiveRecord.disposed,inactiveAdmissionReady,previewUsesInactiveRoot:!!preview&&preview.candidate.root===inactiveRecord?.candidate.root,previewAuthorized:preview?.authorizedView===true,previewHasImage:preview?.hasImage===true,previewState:requireLive?presented==='live':['live','cached'].includes(presented),twoDuckVisuals:duck.visualCount===2,twoBoundDuckContexts:duck.worlds.length===2&&duck.worlds.every(world=>world.bound),duckActorPresent:!!duck.actor,noDuckError:!duck.error,noRuntimeErrors:!a.error&&runtime.errors.size===0,noBenchmarkError:!b.error};
   let activeAdmissionFingerprintMatches=null,activeAdmissionError=null;if(diagnostic&&activeRecord)try{activeAdmissionFingerprintMatches=cache.isReady(activeRecord);}catch(error){activeAdmissionError=String(error);}
   return {passed:Object.values(conditions).every(Boolean),conditions,failedConditions:Object.keys(conditions).filter(key=>!conditions[key]),requireLive,activeState:'active and rendering',activeAdmissionFingerprintMatches,activeAdmissionError,inactiveAdmissionError,cache:{disposed:cache.disposed,activeWorldId:cache.active?.loaded.identity.worldId,records:records.map(record=>({worldId:record.loaded.identity.worldId,digest:record.loaded.identity.contentDigest,active:record.active,isCacheActive:record===cache.active,isHostRoot:record.candidate.root===active?.root,disposed:record.disposed,pinned:!!record.pin,root:record.candidate.root.uuid}))},preview:{id:preview?.id,presentedState:presented,candidateRoot:preview?.candidate.root.uuid},duck,portals:runtime.diagnostics()};
  };
  const views=a.portals.views,portalRender=views.render;views.render=function(...args){const before=performance.now();try{return portalRender.apply(this,args);}finally{b.portalCpu+=performance.now()-before;}};
  const render=a.engine.renderer.render;a.engine.renderer.render=function(scene,camera){if([...views.entries.values()].some(entry=>entry.scene===scene&&this.getRenderTarget()===entry.target))b.portalDraws++;return render.call(this,scene,camera);};
  a.setFreeCam(true);
  const door=a.host.active.project.portals.find(portal=>/sunset/i.test(portal.name));if(!door)throw Error('Authored gold Sunset doorway missing');
  const normal=[Math.sin(door.yaw||0),0,Math.cos(door.yaw||0)],tangent=[Math.cos(door.yaw||0),0,-Math.sin(door.yaw||0)],front=door.position.map((value,i)=>value+normal[i]*3);
  a.fly.setPose(a.camera.position.clone().fromArray(front),Math.atan2(normal[0],normal[2]),0);
  const spawn=a.host.active.project.spawn,interior=[spawn.position[0],spawn.position[1]+1.62,spawn.position[2]];
  interior[0]-=4;interior[2]+=4;
  b.route=[{name:'warehouse-interior-away',position:interior,yaw:Math.PI,pitch:0,lateral:.25,tangent},{name:'gold-sunset-parallax',position:front,target:door.position,lateral:.65,tangent},{name:'gold-turn-away',position:front,yaw:Math.atan2(-normal[0],-normal[2]),pitch:0,lateral:.3,tangent}];
  return {backend:a.backend,viewClass:views.constructor.name,nativeScopeEvidence:'Structurally excluded: app.backend=webgl2, app.gpu=null, no engine.meshRenderer, WebGLRenderer and ShaderMaterial portal entries; zero is inferred from selected branch, not a native prototype instrumentation counter.',renderer,vendor,webglVersion:gl.getParameter(gl.VERSION),viewport:{width:innerWidth,height:innerHeight},devicePixelRatio,rendererPixelRatio:a.engine.renderer.getPixelRatio(),renderResolution:{width:a.engine.width,height:a.engine.height},maxOutputPixels:a.engine.maxOutputPixels,quality:document.querySelector('#render-quality')?.value,world:a.host.active.identity,door,route:b.route,simulation:'fixed callback dt=1/60, time=incrementing frame/60; seeded Math.random=1052025'};
 });
 progress('actual-portal-readiness');const readinessTimer=setTimeout(async()=>{try{report.readinessAfter5s=await page.evaluate(()=>{const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;return {frame:a.engine.frame,simulationFrame:b.simulationFrame,lastFrameAgeMs:performance.now()-b.lastFrameAt,freeCam:a.freeCam,camera:a.camera.position.toArray(),player:a.player.position.toArray(),readiness:b.observeReadiness({requireLive:true,diagnostic:true})};});progress('actual-portal-readiness:5s',report.readinessAfter5s);}catch(error){progress('actual-portal-readiness:5s-read-failed',{error:error.message});}},5000);
 try{await page.waitForFunction(()=>{const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark,observation=b.observeReadiness({requireLive:true});if(b.error||a.error||observation.duck.error||a.portals.errors.size)throw Error(JSON.stringify(observation));return observation.passed;},null,{timeout:90000});}finally{clearTimeout(readinessTimer);}
 report.before=await page.evaluate(()=>{const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;return {at:Date.now(),readiness:b.observeReadiness({requireLive:true,diagnostic:true}),duck:a.publicDuck.diagnostics(),portals:a.portals.diagnostics(),mediaActive:!!a.media?.active,simulationFrame:b.simulationFrame};});
 if(profile!=='off'){report.profileInstallation=await page.evaluate(installWarehouseWebGLInstrumentation,{mode:profile});report.caveats.push('Diagnostic '+profile+' observer overhead is enabled; use a separate adjacent unprofiled run for reference.');}
 if(report.readbackDiagnostic)report.readbackInstallation=await page.evaluate(installWarehouseReadbackDiagnostics,report.readbackDiagnostic);
 if(report.lifecycleObserve)report.lifecycleInstallation=await page.evaluate(installWarehouseLifecycleDiagnostics,{});
 if(report.frameBudget)report.frameBudgetInstallation=await page.evaluate(installWarehouseFrameBudgetDiagnostics,{budget:report.frameBudget});
 report.measurementStartAt=Date.now();
 report.scenarios=[];
 const goldRoute=report.environment.route.find(route=>route.name==='gold-sunset-parallax'),selectedRoutes=scenarioSelection==='portal-motion'?[goldRoute]:scenarioSelection==='portal-stationary'?[{...goldRoute,name:'gold-sunset-stationary',lateral:0}]:report.environment.route;
 if(report.comparisonBlocks)selectedRoutes.splice(0,selectedRoutes.length,...[...'BCCB'].map((variant,i)=>({...goldRoute,name:goldRoute.name+'-block'+(i+1)+'-'+variant,comparisonVariant:variant})));
 report.selectedRoutes=selectedRoutes;
 if(report.gpuSortOracleRequested&&!selectedRoutes.some(route=>route.name==='gold-sunset-parallax'))throw Error('--gpu-sort-oracle requires an ordinary gold-sunset-parallax route; use --scenario portal-motion or all without comparison blocks');
 const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b),rank=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)],sum=values.reduce((a,b)=>a+b,0);return {count:values.length,total:sum,mean:sum/values.length,median:rank(.5),p95:rank(.95),p99:rank(.99),min:sorted[0],max:sorted.at(-1)};};
 for(const [scenarioIndex,route] of selectedRoutes.entries()){
  let blockState=null;
  if(report.comparisonBlocks)blockState=await page.evaluate(variant=>{
   const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark,plants=[];a.host.active.root.traverse(o=>{if(o.userData.nativePlantSpecies)plants.push(o);});
   const far=[];for(let i=0;i<plants.length-1;i++){const near=plants[i],next=plants[i+1];if(near.userData.nativePlantSpecies==='trees'&&next.userData.nativePlantSpecies==='trees'&&near.geometry.index.count>next.geometry.index.count&&near.instanceMatrix.count===next.instanceMatrix.count)far.push(next);}
   if(far.length!==3||plants.some(o=>![0,1].includes(o.renderOrder)))throw Error('Prior far-tree batch mapping differs');
   for(const o of plants)o.renderOrder=variant==='B'&&far.includes(o)?1:0;
   a.opaqueDepthPrepass.enabled=variant==='C';
   const state={variant,simulationFrame:b.simulationFrame,prepassEnabled:a.opaqueDepthPrepass.enabled,qualifiedWallIds:a.opaqueDepthPrepass.occluders().map(o=>o.id),plants:plants.map(o=>({id:o.id,species:o.userData.nativePlantSpecies,order:o.renderOrder,indexCount:o.geometry.index.count,capacity:o.instanceMatrix.count,farTree:far.includes(o)}))};
   if(state.qualifiedWallIds.length!==2)throw Error('Qualified wall list differs');return state;
  },route.comparisonVariant);
  progress(route.name+':warmup-and-sampling');await page.evaluate(({route,simulationFrame})=>{const b=window.__warehouseBenchmark;b.rows=[];b.index=0;if(simulationFrame!==null)b.simulationFrame=simulationFrame;b.previousAt=null;b.error=null;b.done=false;b.stage=route.name+':warmup';b.scenarioStartAt=Date.now();b.sampleWindow=null;b.scenario=route;},{route:{...route,sampleFrames:report.sampledFrames},simulationFrame:report.comparisonBlocks&&scenarioIndex>0?null:report.simulationStartFrame+scenarioIndex*(180+report.sampledFrames)});
  await page.waitForFunction(()=>window.__warehouseBenchmark.done,null,{timeout:Math.max(45000,report.sampledFrames*150+30000)});
  const result=await page.evaluate(expectedCount=>{const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;if(b.error)throw Error(b.error);if(b.rows.length!==expectedCount)throw Error('Sample count differs');if(a.portals.errors.size||a.error||a.publicDuck.diagnostics().error)throw Error('Actual game runtime error');return {raw:b.rows,simulationFrame:b.simulationFrame,scenarioStartAt:b.scenarioStartAt,scenarioEndAt:b.scenarioEndAt,samplingWindow:b.sampleWindow,nativeScopedPathExecutions:0,nativeExecutionEvidence:'Structural backend exclusion; no dynamic native counter',portals:a.portals.diagnostics(),duck:a.publicDuck.diagnostics(),mediaActive:!!a.media?.active,renderResolution:{width:a.engine.width,height:a.engine.height}};},report.sampledFrames);
  if(profile==='trace'&&route.name.startsWith('gold-sunset-'))await finishTrace('selected-scenario-sampling-complete');
  if(blockState){result.blockState=blockState;if(result.raw.some(row=>row.depthPrepassResult?.used!==(blockState.variant==='C')))throw Error('Block render path mismatch');}
  result.name=route.name;for(const key of ['frameCpuMs','portalCpuMs','frameIntervalMs'])result[key]=summarize(result.raw.map(row=>row[key]));result.cadenceFps=1000*result.frameIntervalMs.count/result.frameIntervalMs.total;result.portalDraws=result.raw.reduce((sum,row)=>sum+row.portalDraws,0);
  if(route.name.startsWith('gold-sunset-')&&(result.portalDraws!==report.sampledFrames||result.raw.some(row=>row.portalDraws!==1)))throw Error('Gold doorway must render the actual Sunset destination in every sampled frame');if(result.nativeScopedPathExecutions!==0)throw Error('Unexpected native PortalViews execution in published WebGL game');if(result.mediaActive)throw Error('Default inactive media changed during benchmark');
  progress(route.name+':diagnostic');result.diagnostic=await page.evaluate(async()=>{const a=window.__repositoryWorldApp;let updates=0;const originals=[];for(const root of [a.host.active.root,...[...a.portals.views.entries.values()].filter(e=>e.candidate).map(e=>e.candidate.root)])root.traverse(node=>{const original=node.updateMatrixWorld;originals.push([node,original]);node.updateMatrixWorld=function(...args){updates++;return original.apply(this,args);};});try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}finally{for(const[node,original]of originals)node.updateMatrixWorld=original;}return {matrixUpdateCallsAcrossTwoRAF:updates,nativeScopedPathExecutions:0,nativeExecutionEvidence:'Structural backend exclusion; no dynamic native counter',portalEntries:[...a.portals.views.entries.values()].map(e=>({id:e.id,state:e.aperture.userData.portalViewState,hasImage:e.hasImage,authorized:e.authorizedView,target:[e.target.width,e.target.height],candidateSplats:e.candidate?.splatScene?.diagnostics?.()?.numSplats??null})),visibility:document.visibilityState};});
  const screenshot=output.replace(/\.json$/i,'')+'-'+route.name+'.png';await page.screenshot({path:screenshot});result.screenshot=screenshot;report.scenarios.push(result);await writeFile(output,JSON.stringify(report,null,2)+'\n');
 }
 if(report.comparisonBlocks)await page.evaluate(()=>{const a=window.__repositoryWorldApp;a.host.active.root.traverse(o=>{if(o.userData.nativePlantSpecies)o.renderOrder=0;});a.opaqueDepthPrepass.enabled=true;});
 if(args.includes('--evolving-visuals')){
  report.evolvingVisuals=[];
  for(const advanceFrames of [60,180,300]){
   progress('post-timing-evolving-visuals-'+advanceFrames);
   await page.evaluate(async count=>{const b=window.__warehouseBenchmark;if(b.scenario)throw Error('Evolving visual check inside timing');for(let i=0;i<count;i++)await new Promise(resolve=>requestAnimationFrame(resolve));},advanceFrames);
   const visual=await page.evaluate(visualValidator,{includeUnchangedImages:false});
   for(const checkpoint of visual.checkpoints){for(const [kind,dataURL]of Object.entries(checkpoint.images)){const path=output.replace(/\.json$/i,'')+'-evolving-'+advanceFrames+'-'+checkpoint.name+'-'+kind+'.png';await writeFile(path,Buffer.from(dataURL.split(',')[1],'base64'));checkpoint.images[kind]=path;}if(!checkpoint.pixelIdentity||checkpoint.baselineRepeatNoise.changedPixels)report.errors.push('Evolving plant-order difference after '+advanceFrames+' frames: '+checkpoint.name);}
   report.evolvingVisuals.push({advanceFrames,visual});
  }
 }
 report.nativePlantWorkloadAfterTiming=await page.evaluate(()=>{const a=window.__repositoryWorldApp,batches=[];a.host.active.root.traverse(node=>{if(!node.userData?.nativePlantSpecies&&!node.userData?.mediaOcclusionPlant)return;const materials=(Array.isArray(node.material)?node.material:[node.material]).filter(Boolean);batches.push({objectId:node.id,species:node.userData.nativePlantSpecies??null,instances:node.count??1,indexCount:node.geometry?.index?.count??null,positionCount:node.geometry?.attributes?.position?.count??null,groups:node.geometry?.groups?.map(group=>({start:group.start,count:group.count,materialIndex:group.materialIndex}))??[],materials:materials.map(material=>({id:material.id,type:material.type,key:material.customProgramCacheKey?.()??null,defines:material.defines??null}))});});return {batches,stats:a.host.active.nativeIsland?.stats?.()??null};});
 if(report.frameBudget)report.frameBudgetProfile=await page.evaluate(()=>{const p=window.__warehouseBenchmark.frameBudget,s=p.snapshot();p.dispose();window.__warehouseBenchmark.frameBudget=null;return s;});
 if(report.lifecycleObserve)report.lifecycleProfile=await page.evaluate(()=>{const p=window.__warehouseBenchmark.lifecycleProfile,s=p.snapshot();p.dispose();return s;});
 if(report.readbackDiagnostic)report.readbackProfile=await page.evaluate(()=>{const p=window.__warehouseBenchmark.readbackProfile,s=p.snapshot();p.dispose();return s;});
 if(profile!=='off')report.profile=await page.evaluate(()=>{const profile=window.__warehouseBenchmark.profile,snapshot=profile.snapshot();profile.dispose();return snapshot;});
 if(report.rotationOracleRequested||report.generationCameraOracleRequested){
  const name=report.generationCameraOracleRequested?'generationCameraOracle':'rotationOracle';progress('post-timing-'+name);
  if(report.generationCameraOracleRequested)await page.addScriptTag({content:'window.__installCanonicalGenerationPrototype = '+installCanonicalGenerationPrototype.toString()+';'});
  try{report[name]=await page.evaluate(report.generationCameraOracleRequested?runCanonicalQualification:runWarehouseRotationOracle,{timeoutMs:report.generationCameraOracleRequested?90000:45000});}
  catch(error){report[name]={status:'unavailable-or-failed',sessionInvalidated:true,error:String(error?.stack??error)};}
  const persistImages=async(value,parts=[])=>{if(!value||typeof value!=='object')return;for(const[key,item]of Object.entries(value)){if(typeof item==='string'&&item.startsWith('data:image/png;base64,')){const suffix=[name,...parts,key].join('-').replace(/[^a-zA-Z0-9_-]/g,'_'),file=output.replace(/\.json$/i,'')+'-'+suffix+'.png';await writeFile(file,Buffer.from(item.split(',')[1],'base64'));value[key]=file;}else await persistImages(item,[...parts,key]);}};await persistImages(report[name]);
  progress('post-timing-'+name+':complete',{status:report[name].status});
  if(report[name].sessionInvalidated||(report.generationCameraOracleRequested&&!report[name].passed))throw Error(name+' failed or rejected; discard session before subsequent checks');
 }
 if(report.splatKeyOracleRequested){
  progress('post-timing-splat-key-oracle');
  try{report.splatKeyOracle=await page.evaluate(runWarehouseSplatKeyOracle,{timeoutMs:20000,maxExamples:8,sortVariants:2});}
  catch(error){report.splatKeyOracle={diagnosticOnly:true,acceptanceEvidence:false,status:'unavailable-or-failed',error:String(error.stack??error)};}
  progress('post-timing-splat-key-oracle:complete',{status:report.splatKeyOracle.status,exactOrderingPromising:report.splatKeyOracle.exactOrderingPromising??false});
  if(report.splatKeyOracle.status==='unavailable-or-failed'){report.splatKeyOracle.sessionInvalidated=true;throw Error('Splat key oracle failed; discard this browser session before any further visual checks: '+report.splatKeyOracle.error);}
 }
 if(report.gpuSortOracleRequested){
  await page.addScriptTag({content:'window.__createWebGLMergeSorter = '+(gpuSortMethod==='fragment-gather'?createWebGLGatherSorter:createWebGLMergeSorter).toString()+';'});
  if(gpuSortStages)await page.addScriptTag({content:'window.__profileWebGLMergeStages = '+profileWebGLMergeStages.toString()+';'});
  progress('post-timing-gpu-sort-oracle');
  try{report.gpuSortOracle=await page.evaluate(runWarehouseGpuSortOracle,{route:selectedRoutes.find(route=>route.name==='gold-sunset-parallax'),timeoutMs:90000,profileStages:gpuSortStages,method:gpuSortMethod});}
  catch(error){report.gpuSortOracle={diagnosticOnly:true,status:'unavailable-or-failed',error:String(error.stack??error)};}
  progress('post-timing-gpu-sort-oracle:complete',{status:report.gpuSortOracle.status,synthetics:report.gpuSortOracle.synthetics?.length??0,captures:report.gpuSortOracle.captures?.length??0});
  if(report.gpuSortOracle.status==='unavailable-or-failed'){report.gpuSortOracle.sessionInvalidated=true;throw Error('GPU sort oracle failed; discard this browser session before any further visual checks: '+report.gpuSortOracle.error);}
 }
 if(args.includes('--visual-checks')){
  progress('post-timing-plant-order-visuals');
  report.plantOrderVisuals=await page.evaluate(visualValidator,{includeUnchangedImages:true,extended:args.includes('--extended-visuals')});
  for(const checkpoint of report.plantOrderVisuals.checkpoints){
   const paths={};for(const [kind,dataURL]of Object.entries(checkpoint.images)){
    const path=output.replace(/\.json$/i,'')+'-visual-'+checkpoint.name+'-'+kind+'.png';
    await writeFile(path,Buffer.from(dataURL.split(',')[1],'base64'));paths[kind]=path;
   }checkpoint.images=paths;
   if(checkpoint.baselineRepeatNoise.changedPixels!==0||!checkpoint.pixelIdentity)report.errors.push('Plant-order visual difference at '+checkpoint.name+'; inspect retained matched images');
  }
 }
 if(args.includes('--foliage-diagnostics')){
  progress('post-timing-foliage-diagnostics');
  const {diagnoseWarehousePlantOrder}=await import('./warehouse-plant-order-diagnostics.mjs');
  report.foliageDiagnostics=await page.evaluate(diagnoseWarehousePlantOrder,{maxPixelCoordinates:4});
  const persistImages=async(value,parts=[])=>{
   if(!value||typeof value!=='object')return;
   for(const [key,item]of Object.entries(value)){
    if(typeof item==='string'&&item.startsWith('data:image/png;base64,')){
     const suffix=[...parts,key].join('-').replace(/[^a-zA-Z0-9_-]/g,'_');
     const path=output.replace(/\.json$/i,'')+'-diagnostic-'+suffix+'.png';
     await writeFile(path,Buffer.from(item.split(',')[1],'base64'));value[key]=path;
    }else await persistImages(item,[...parts,key]);
   }
  };await persistImages(report.foliageDiagnostics);
 }
 report.browserObservations=await page.evaluate(()=>window.__warehouseBenchmark.browserObservations);
 report.assetConsumptions=await page.evaluate(()=>window.__warehouseBenchmark.consumedResponses);report.browserFetchEvents=await page.evaluate(()=>window.__warehouseBenchmark.fetchEvents);
 report.finalReadiness=await page.evaluate(()=>window.__warehouseBenchmark.observeReadiness({requireLive:false,diagnostic:true}));report.assetConsumptionRuntimeReady=report.finalReadiness.passed;
 report.rawAssetErrors=[...report.assetErrors];report.abortedRequestsWithMatchingCompletedResourceAndRuntimeReadinessEvidence=[];
 report.assetErrors=report.rawAssetErrors.filter(failure=>{if(!report.assetConsumptionRuntimeReady||failure.error!=='net::ERR_ABORTED')return true;const completed=report.assetConsumptions.filter(read=>read.url===failure.url&&Number.isFinite(read.expectedBytes)&&read.expectedBytes>0&&read.bytes===read.expectedBytes);if(!completed.length)return true;report.abortedRequestsWithMatchingCompletedResourceAndRuntimeReadinessEvidence.push({...failure,consumptionEvidence:completed,classification:'Aborted requests with matching completed-resource and runtime-readiness evidence. URL-level evidence only; not request-instance identity, not a claim about abort cause or zero network failures.'});return false;});
 const assetURL=url=>! /\/(runtime-config|favicon.ico)(\?|$)/.test(url),activity=[...report.networkEvents.filter(event=>event.asset),...report.browserFetchEvents.filter(event=>assetURL(event.url)),...report.assetConsumptions.filter(read=>assetURL(read.url)).map(read=>({...read,event:'response-consumed',at:read.completedAt}))];
 for(const scenario of report.scenarios){scenario.assetActivityDuringSampling=activity.filter(event=>event.at>=scenario.samplingWindow.startAt&&event.at<=scenario.samplingWindow.endAt);scenario.warmedSamplingEligible=scenario.assetActivityDuringSampling.length===0;}
 report.warmedAbbaEligible=report.scenarios.every(scenario=>scenario.warmedSamplingEligible);if(!report.warmedAbbaEligible)report.errors.push('Asset activity occurred during sampling; retained results are excluded from warmed ABBA comparison');
 if(!report.assetConsumptionRuntimeReady)report.errors.push('Final coupled Warehouse/Sunset/Microduck resources not fully ready');
 report.status=report.errors.length||report.assetErrors.length||report.externalRequests.length?'measured-with-errors':'measured';
}catch(error){if(report.status!=='wall-deadline-exceeded')report.status='unavailable-or-failed';report.errors.push(error.stack??String(error));if(page&&!page.isClosed())report.failureState=await Promise.race([page.evaluate(()=>{const a=window.__repositoryWorldApp,b=window.__warehouseBenchmark;return {status:document.querySelector('#status')?.textContent,loading:document.querySelector('#opening-splash-status')?.textContent,appError:a?.error??null,backend:a?.backend,world:a?.host.active?.identity,readiness:b?.observeReadiness?.({requireLive:true,diagnostic:true}),portals:a?.portals.diagnostics(),duck:a?.publicDuck?.diagnostics(),benchmarkError:b?.error,visibility:document.visibilityState};}).catch(e=>({error:e.message})),new Promise(resolve=>setTimeout(()=>resolve({error:'Failure-state read exceeded2s'}),2000))]);}
finally{if(profile==='trace')await finishTrace('benchmark-finally');closing=true;progress('closing');await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));report.finishedAt=new Date().toISOString();await writeFile(output,JSON.stringify(report,null,2)+'\n');clearTimeout(deadline);}
console.log(JSON.stringify({status:report.status,output,backend:report.environment?.backend,renderer:report.environment?.renderer,scenarios:report.scenarios?.map(({name,cadenceFps,frameCpuMs,portalCpuMs,portalDraws,nativeScopedPathExecutions})=>({name,cadenceFps,frameCpuMs,portalCpuMs,portalDraws,nativeScopedPathExecutions})),errors:report.errors,assetErrors:report.assetErrors}));
if(report.status!=='measured')process.exitCode=1;
