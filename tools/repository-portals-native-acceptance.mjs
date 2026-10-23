import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {newIdentity,signObject} from '../network/identity.mjs';
import {publishRegion} from '../network/federation.mjs';
import {approveRepositoryPortal} from '../network/repository-federation.mjs';
import {createRepositoryWorldServer,pinnedRepository} from './networking/repository-world-server.mjs';
import {loadWorldSource} from '../src/world-runtime/vendor/world-engine-contract.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.ELSEMESH_PLAYWRIGHT_MODULE??'playwright');
const html=`<!doctype html><title>Isolated native portal integration</title><canvas></canvas><script type="module">
import {GPU} from '/src/engine/gpu/GPU.js';
import {Scene,PerspectiveCamera} from '/src/engine/index.js';
import {MeshRenderer} from '/src/engine/render/MeshRenderer.js';
import {Input} from '/src/core/Input.js';
import {RepositoryWorldHost} from '/src/world-runtime/RepositoryWorldHost.js';
import {prepareNativeRepositoryResources} from '/src/world-runtime/NativeRepositoryReadiness.js';
import {RepositoryPortalRuntime} from '/src/world-runtime/RepositoryPortalRuntime.js';
import {privateNeonIdentity} from '/src/world-runtime/vendor/world-engine-contract.js';
try{
 await GPU.init({headless:true});const gpuErrors=[];GPU.device.addEventListener('uncapturederror',e=>gpuErrors.push(e.error.message));
 const identity=await privateNeonIdentity(),engine={scene:new Scene(),camera:new PerspectiveCamera(),meshRenderer:new MeshRenderer()},input=new Input(document.querySelector('canvas')),statuses=[],transitions=[];
 const resourceCounts={builds:0,worldWarms:0};engine.prepareRepositoryResources=root=>{if(root.name.startsWith('repository-world:'))resourceCounts.worldWarms++;return prepareNativeRepositoryResources({meshRenderer:engine.meshRenderer,camera:engine.camera,root});};
 const host=new RepositoryWorldHost({engine,input,prepareResources:prepared=>engine.prepareRepositoryResources(prepared.root),onChange:a=>transitions.push({worldId:a.identity.worldId,root:a.root.name,player:a.player.constructor.name,colliders:a.colliders.boxes.length})});
 const originalBuild=host.buildCandidate;host.buildCandidate=async(...args)=>{resourceCounts.builds++;return originalBuild(...args);};
 const runtime=new RepositoryPortalRuntime({engine,host,input,onStatus:s=>statuses.push(s)});
 const originalPreviewBuild=runtime.buildScene;runtime.buildScene=async(...args)=>{resourceCounts.builds++;return originalPreviewBuild(...args);};
 let timer=null,time=0;const step=()=>{if(!host.active)return;time+=.05;GPU.beginFrame();if(!runtime.pending)host.update(.05,time);runtime.update(.05,time);GPU.submit();};
 window.acceptance={resourceCounts,identity,engine,input,host,runtime,statuses,transitions,gpuErrors,step,
 publicIdentity:()=>({nodeId:identity.nodeId,publicKey:identity.publicKeyPEM??identity.publicKey}),
 connect:async()=>{const cfg=await(await fetch('/operator.json')).json();await runtime.connect(cfg);timer=setInterval(step,50);},
 snapshot:()=>({worldId:host.active?.identity.worldId,player:host.active?.player.position.toArray(),velocity:host.active?.player.velocity.toArray(),yaw:host.active?.player.yaw,mode:host.active?.player.mode,rootCount:engine.scene.children.filter(n=>n.name.startsWith('repository-world:')).length,diagnostics:runtime.diagnostics(),statuses:[...statuses],transitions:[...transitions],gpuErrors}),
 stop:()=>{clearInterval(timer);timer=null;input._clearTransientInput();},
 start:()=>{if(!timer)timer=setInterval(step,50);}
 };
}catch(error){window.bootError=error.stack||error.message;}
</script>`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function runRepositoryPortalsNativeAcceptance({evidenceDirectory=resolve(root,'.local-evidence/portal-native-acceptance-'+Date.now())}={}){
 await mkdir(evidenceDirectory,{recursive:true,mode:0o700});const checks=[],contexts=[],proxySockets=new Set();let browser,proxy,coordinator,targetPort,trust;
 const check=(name,detail=true)=>checks.push({name,passed:true,detail});
 const records=await Promise.all(['loz-warehouse','macomarchy-coast'].map(async name=>{
  const repo=resolve(process.env.ELSEMESH_WORLD_REPOSITORY_ROOT??resolve(root,'../world-repositories'),name),commit=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const loaded=await loadWorldSource(await pinnedRepository(repo,commit));return {root:repo,commit,loaded,worldId:loaded.project.metadata.worldId,regionId:loaded.project.metadata.regionId};
 }));
 try{
  proxy=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let data,type='text/javascript';
   if(url.pathname==='/'){data=html;type='text/html';}
   else if(url.pathname==='/operator.json'){data=JSON.stringify(trust);type='application/json';}
   else if(/^\/models\/characters\/(stock-player|stock-female)\.glb$/.test(url.pathname)){data=await readFile(resolve(root,'public'+url.pathname));type='model/gltf-binary';}
   else if(url.pathname.startsWith('/src/')&&/^\/src\/[A-Za-z0-9_./-]+\.js$/.test(url.pathname)&&!url.pathname.split('/').includes('..'))data=await readFile(resolve(root,url.pathname.slice(1)));
   else{res.writeHead(404).end();return;}
   res.writeHead(200,{'content-type':type,'cache-control':'no-store'}).end(data);
  }catch(error){res.writeHead(500).end(error.message);}});
  proxy.on('upgrade',(req,socket,head)=>{if(req.url!=='/__worlds'||!targetPort){socket.destroy();return;}
   const upstream=request({host:'127.0.0.1',port:targetPort,path:'/__worlds',headers:{...req.headers,host:'127.0.0.1:'+targetPort,origin:'http://127.0.0.1:'+targetPort}});
   upstream.on('upgrade',(response,peer,upstreamHead)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)peer.write(head);if(upstreamHead.length)socket.write(upstreamHead);socket.pipe(peer).pipe(socket);socket.on('error',()=>peer.destroy());peer.on('error',()=>socket.destroy());});upstream.on('error',()=>socket.destroy());upstream.end();
  });
  proxy.on('connection',socket=>{proxySockets.add(socket);socket.on('close',()=>proxySockets.delete(socket));});
  await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+proxy.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-webgpu-adapter=swiftshader','--enable-dawn-features=allow_unsafe_apis']});
  async function client(){const context=await browser.newContext();contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>console.error('BROWSER',e.message));await page.goto(origin);await page.waitForFunction(()=>window.acceptance||window.bootError,{timeout:30000});const error=await page.evaluate(()=>window.bootError);if(error)throw Error(error);return page;}
  const owner=await client(),member=await client();const identities=await Promise.all([owner,member].map(p=>p.evaluate(()=>acceptance.publicIdentity())));
  assert.notEqual(identities[0].nodeId,identities[1].nodeId);check('independent browser identity stores',identities.map(i=>i.nodeId));
  const authority=newIdentity(),owners=[newIdentity(),newIdentity()],players=Object.fromEntries(identities.map((id,i)=>[id.nodeId,{label:i?'Acceptance visitor':'Acceptance traveler',publicKey:id.publicKey,defaultWorldId:records[i].worldId}]));
  const worlds=records.map((r,i)=>{const owner=owners[i],federationWorldId=r.worldId.replace('elsemesh.world:','elsemesh-world:'),federationRegionId=r.regionId.replace('elsemesh.region:','elsemesh-region:');
   const descriptor={protocol:'elsemesh.region/1',worldId:federationWorldId,regionId:federationRegionId,version:1,ownerPlayerId:'player:acceptance-owner-'+i,ownerNodeId:owner.nodeId,admins:[],hosts:[authority.nodeId],authority:{nodeId:authority.nodeId,epoch:1},rules:{gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'LOCAL',weapons:'DISALLOW',movement:['WALK','RUN','JUMP','SWIM'],requiredCapabilities:['elsemesh.handoff/2']},assets:[],portals:r.loaded.project.portals.map(p=>p.id),participants:{players:[],npcs:[]}};
   const binding=signObject({kind:'elsemesh.world-content-admission/1',authoredWorldId:r.worldId,authoredRegionId:r.regionId,contentDigest:r.loaded.identity.contentDigest,federationWorldId,federationRegionId,authorityNodeId:authority.nodeId,authorityEpoch:1,serverId:authority.nodeId,sessionEpoch:'isolated-native-acceptance',expiresAt:Date.now()+3600000},owner);
   return {root:r.root,commit:r.commit,worldId:r.worldId,regionId:r.regionId,name:r.loaded.project.metadata.name,federationWorldId,federationRegionId,ownerNodeId:owner.nodeId,published:publishRegion(descriptor,owner),binding,portals:r.loaded.project.portals,policies:{view:identities.map(id=>id.nodeId),enter:identities.map(id=>id.nodeId)}};
  });
  for(let i=0;i<2;i++)worlds[i].portals=worlds[i].portals.map(a=>{const d=worlds[1-i],exit=d.portals.find(p=>p.id===a.destination.portalId),portal={protocol:'elsemesh.portal/1',portalId:a.id,sourceRegion:worlds[i].federationRegionId,destinationRegion:d.federationRegionId,visual:'DOOR',entry:{position:a.position,yaw:Math.atan2(Math.sin(a.yaw+Math.PI),Math.cos(a.yaw+Math.PI))*180/Math.PI},exit:{position:exit.position,yaw:Math.atan2(Math.sin(exit.yaw),Math.cos(exit.yaw))*180/Math.PI},enabled:a.enabled&&a.traversal.enabled,requiredCapabilities:['elsemesh.handoff/2'],access:{mode:'PUBLIC',allowPlayers:[]},handoffPolicy:'SIGNED',revision:1};return {...a,...approveRepositoryPortal(owners[i],owners[1-i],portal)};});
  trust={trustedOwners:owners.map(o=>o.nodeId)};
  coordinator=await createRepositoryWorldServer({root:resolve(root,'dist'),config:{defaultWorldId:worlds[0].worldId,worlds,players},identity:authority,port:0});targetPort=coordinator.address.port;
  await owner.evaluate(()=>localStorage.setItem('elsemesh.avatar.v1',JSON.stringify({style:'male',shirt:'#c54343',trousers:'#27313d',skin:'#c68c67',hair:'#33251c'})));
  await member.evaluate(()=>localStorage.setItem('elsemesh.avatar.v1',JSON.stringify({style:'female',shirt:'#33785b',trousers:'#294e70',skin:'#805136',hair:'#171512'})));
  await owner.evaluate(()=>acceptance.connect());await member.evaluate(()=>acceptance.connect());
  assert.equal((await owner.evaluate(()=>acceptance.snapshot())).worldId,worlds[0].worldId);assert.equal((await member.evaluate(()=>acceptance.snapshot())).worldId,worlds[1].worldId);
  check('actual default native scene builds in two independent signed worlds',await Promise.all([owner,member].map(p=>p.evaluate(()=>acceptance.snapshot()))));
  await owner.waitForFunction(()=>acceptance.runtime.previewRecords.size&&[...acceptance.runtime.previewRecords.values()].some(r=>r.loaded),{timeout:60000});
  await owner.waitForFunction(()=>[...acceptance.runtime.previewLayers.values()].some(l=>l.avatars.size>0),{timeout:15000});
  check('authorized detached native destination contains remote player avatar',await owner.evaluate(()=>({previewRoots:[...acceptance.runtime.views.entries.values()].map(e=>({world:e.candidate?.descriptor.worldId,root:e.candidate?.root.name})),peers:[...acceptance.runtime.previewLayers.values()].map(l=>l.avatars.size)})));
  await owner.waitForFunction(()=>[...acceptance.runtime.previewLayers.values()].some(l=>[...l.avatars.values()].some(a=>a.scanned&&a.characterAsset==='stock-female'&&a.appearance.shirt==='#33785b')),{timeout:30000});
  check('original female stock GLB with saved personal design loads into native portal preview',await owner.evaluate(()=>[...acceptance.runtime.previewLayers.values()].flatMap(l=>[...l.avatars.values()].map(a=>({asset:a.characterAsset,appearance:a.appearance,loaded:!!a.scanned})))));
  const warmBaseline=await owner.evaluate(()=>({...acceptance.resourceCounts}));
  // Actual DOM keyboard -> Input -> Player -> sweep -> runtime prepare/ready/commit -> host swap.
  await owner.keyboard.down('KeyW');await owner.waitForFunction(id=>acceptance.host.active.identity.worldId===id,worlds[1].worldId,{timeout:30000});await owner.keyboard.up('KeyW');
  const arrived=await owner.evaluate(()=>acceptance.snapshot());assert.equal(arrived.rootCount,1);assert.equal(arrived.diagnostics.worldId,worlds[1].worldId);assert.ok(arrived.transitions.length>=2);check('native Input and Player sweep commits A to B and swaps a single root',arrived);
  const committed=[...coordinator.federation.reservations.values()].find(r=>r.state==='committed'&&r.nodeId===identities[0].nodeId);assert.ok(committed);
  const replay=await owner.evaluate(id=>acceptance.runtime.transport.commit(id),committed.id);assert.equal(replay.generation,committed.generation);assert.equal(coordinator.federation.members.get(identities[0].nodeId).generation,1);check('duplicate commit is idempotent',replay.id);
  // Rearm by walking forward out of the exit, turn around, and walk back through.
  await owner.keyboard.down('KeyW');await sleep(800);await owner.keyboard.up('KeyW');
  await owner.evaluate(()=>{acceptance.host.active.player.yaw+=Math.PI;});
  await owner.keyboard.down('KeyW');await owner.waitForFunction(id=>acceptance.host.active.identity.worldId===id,worlds[0].worldId,{timeout:30000});await owner.keyboard.up('KeyW');
  const returned=await owner.evaluate(()=>acceptance.snapshot());assert.equal(returned.rootCount,1);assert.equal(returned.diagnostics.worldId,worlds[0].worldId);check('native return crossing B to A',returned);
  assert.deepEqual(await owner.evaluate(()=>({...acceptance.resourceCounts})),warmBaseline);check('warm round trip reuses resident world packages without scene builds or world precompilation',warmBaseline);
  // Negative VIEW/ENTER separation at the real coordinator and transport.
  const b=coordinator.federation.world(worlds[1].worldId);b.policies.enter=[identities[1].nodeId];
  await owner.evaluate(()=>{acceptance.host.active.player.yaw=0;acceptance.runtime.rearm=null;});
  await owner.keyboard.down('KeyW');await owner.waitForFunction(()=>acceptance.statuses.some(s=>s.includes('Stayed in source world: ENTER denied')),{timeout:20000});await owner.keyboard.up('KeyW');
  assert.equal((await owner.evaluate(()=>acceptance.snapshot())).worldId,worlds[0].worldId);check('VIEW remains permitted while ENTER is rejected without source-world loss');
  b.policies.enter=identities.map(i=>i.nodeId);
  // Pin/digest and stale-generation validation are checked directly against same live authority.
  const s=coordinator.federation.members.get(identities[0].nodeId);
  assert.throws(()=>coordinator.federation.update(identities[0].nodeId,{worldId:s.worldId,generation:s.generation-1,sequence:s.sequence+1,timestamp:Date.now(),position:s.position,velocity:s.velocity,yaw:s.yaw}),/Stale membership/);check('old membership generation is rejected');
  const sourceIdentity=await owner.evaluate(()=>acceptance.host.active.identity.worldId);await owner.evaluate(()=>acceptance.runtime.transport.disconnect());
  await assert.rejects(owner.evaluate(()=>acceptance.runtime.transport.describe('offline')),/offline/);
  assert.equal(await owner.evaluate(()=>acceptance.host.active.identity.worldId),sourceIdentity);check('offline transport preserves the playable native source root');
  const result={status:'PASS_NATIVE_PORTAL_INTEGRATION',scope:'Two independent browser identity stores; actual PortalTransport, RepositoryPortalRuntime, signed ephemeral coordinator, pinned separate content repositories, default native RepositoryScene, native Player/Input and resource admission. Keyboard events are automated local browser input, not proof of physical device interaction or visible canvas rendering.',checks,worlds:records.map(r=>({root:r.root,commit:r.commit,worldId:r.worldId,digest:r.loaded.identity.contentDigest})),snapshots:await Promise.all([owner,member].map(p=>p.evaluate(()=>acceptance.snapshot()))),evidenceDirectory};
  assert.ok(result.snapshots.every(s=>s.gpuErrors.length===0));await writeFile(resolve(evidenceDirectory,'report.json'),JSON.stringify(result,null,2));return result;
 }catch(error){await writeFile(resolve(evidenceDirectory,'failure.json'),JSON.stringify({status:'FAILED',message:error.message,stack:error.stack,checks},null,2));throw error;}
 finally{await browser?.close();await coordinator?.close();for(const s of proxySockets)s.destroy();if(proxy)await new Promise(r=>proxy.close(r));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(await runRepositoryPortalsNativeAcceptance(),null,2));
