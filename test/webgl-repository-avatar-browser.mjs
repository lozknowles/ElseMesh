import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;let bytes,type;
 if(pathname==='/'){bytes='<!doctype html><link rel="icon" href="data:,"><body></body>';type='text/html';}
 else if(pathname.startsWith('/src/')&&!pathname.split('/').includes('..')){bytes=await readFile(resolve(root,'.'+pathname));type='text/javascript';}
 else if(/^\/models\/characters\/(stock-player|stock-female)\.glb$/.test(pathname)){bytes=await readFile(resolve(root,'public'+pathname));type='model/gltf-binary';}
 else{res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':type});res.end(bytes);
 }catch(error){res.writeHead(500);res.end(error.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium-browser',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{
  const {T,BuiltinCharacterGLTFLoader}=await import('/src/world-runtime/vendor/world-engine-contract.js');
  const {WebGLRepositoryAvatar}=await import('/src/world-runtime/WebGLRepositoryAvatar.js');
  const {createWebGLRepositoryPeerLayer}=await import('/src/world-runtime/WebGLRepositoryBackend.js');
  const {DEFAULT_APPEARANCE}=await import('/src/player/AvatarAppearance.js');
  const check=(v,m)=>{if(!v)throw Error(m);};
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,50);camera.position.set(0,1,3.4);camera.lookAt(0,1,0);
  scene.add(new T.HemisphereLight('white','#777777',3));const sun=new T.DirectionalLight('white',3);sun.position.set(2,3,4);scene.add(sun);
  const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(256,256);renderer.toneMapping=T.NoToneMapping;
  const target=new T.WebGLRenderTarget(256,256),avatar=new WebGLRepositoryAvatar(scene);await avatar.ready;
  check(avatar.asset==='stock-player','default original character asset missing');
  const height=new T.Box3().setFromObject(avatar.model).getSize(new T.Vector3()).y;check(height>.8&&height<3,'original character scale changed: '+height);
  avatar.cinematic={x:0,y:0,z:0,yaw:0,speed:0,mode:'walk'};avatar.update(0,null,camera,true);
  const pixelRead=()=>{renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);return pixels;};
  await avatar.setAppearance({...DEFAULT_APPEARANCE,shirt:'#ff0000'});const red=pixelRead();
  await avatar.setAppearance({...DEFAULT_APPEARANCE,shirt:'#0000ff'});const blue=pixelRead();let tinted=0;for(let i=0;i<red.length;i+=4)if(Math.abs(red[i]-blue[i])+Math.abs(red[i+2]-blue[i+2])>20)tinted++;
  check(tinted>100,'original shirt zone did not tint rendered pixels: '+tinted);
  const bones=()=>{const out=[];avatar.model.traverse(o=>{if(o.isBone)out.push(o.quaternion.toArray());});return JSON.stringify(out);};
  const idle=bones();avatar.cinematic.speed=3.4;avatar.update(.1,null,camera,true);avatar.update(.1,null,camera,true);check(avatar.currentClip==='walk'&&bones()!==idle,'walk animation did not move skeleton');
  avatar.cinematic.speed=5;avatar.update(.1,null,camera,true);check(avatar.currentClip==='run','run clip missing');
  avatar.cinematic.mode='helm';avatar.update(.1,null,camera,true);check(avatar.currentClip==='helm','helm clip missing');
  avatar.cinematic=null;avatar.update(0,{position:new T.Vector3(),velocity:new T.Vector3(),yaw:0,mode:'walk'},camera,false);check(!avatar.group.visible,'local first person avatar obstructs camera');
  await avatar.setAppearance({...DEFAULT_APPEARANCE,style:'female'});check(avatar.asset==='stock-female','female original character missing');
  avatar.cinematic={x:0,y:0,z:0,yaw:0,speed:0,mode:'walk'};avatar.update(0,null,camera,true);pixelRead();
  // Deferred style loads must lose to a later cancellation intent, even when
  // cancellation reuses the currently loaded model and only changes colours.
  const loaderPrototype=BuiltinCharacterGLTFLoader.prototype,realLoad=loaderPrototype.loadAsync;
  const staleModel=()=>{let geometryDisposed=false,materialDisposed=false;const geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();geometry.addEventListener('dispose',()=>geometryDisposed=true);material.addEventListener('dispose',()=>materialDisposed=true);const scene=new T.Group();scene.add(new T.Mesh(geometry,material));return {gltf:{scene,animations:[]},disposed:()=>geometryDisposed&&materialDisposed};};
  const race=async(currentStyle,pendingStyle,shirt)=>{
   const visibleModel=avatar.model;let release;loaderPrototype.loadAsync=()=>new Promise(resolve=>release=resolve);
   try{
    const pendingProfile={...DEFAULT_APPEARANCE,style:pendingStyle},selected={...DEFAULT_APPEARANCE,style:currentStyle,shirt};
    const pending=avatar.setAppearance(pendingProfile);check(avatar.setAppearance(pendingProfile)===pending,'identical pending intent did not reuse its promise');
    await avatar.setAppearance(selected);const stale=staleModel();release(stale.gltf);check(await pending===false,'cancelled style load was activated');
    check(stale.disposed(),'cancelled style resources leaked');check(avatar.model===visibleModel&&avatar.asset===(currentStyle==='male'?'stock-player':'stock-female'),'late style replaced cancelled selection');
    check(avatar.appearance.style===currentStyle&&avatar.appearance.shirt===shirt,'cancelled profile or colour replaced');
    const body=avatar.materials.find(m=>m.name==='body');check(body.userData.avatarUniforms.avatar_shirt.value.equals(new T.Color(shirt)),'cancelled selection colour was not applied');
    await avatar.setAppearance(selected);check(avatar.model===visibleModel,'repeated selected intent changed model after stale load');
    avatar.cinematic={x:0,y:0,z:0,yaw:0,speed:0,mode:'walk'};avatar.update(0,null,camera,true);pixelRead();
   }finally{loaderPrototype.loadAsync=realLoad;}
  };
  await race('female','male','#ff00ff');await avatar.setAppearance({...DEFAULT_APPEARANCE,style:'male'});await race('male','female','#33aa77');
  let invalid=false;try{await avatar.setAppearance({...DEFAULT_APPEARANCE,style:'https://invalid/'})}catch{invalid=true;}check(invalid,'arbitrary character URL accepted');
  const peers=createWebGLRepositoryPeerLayer(scene,'self');peers.accept({players:[{nodeId:'self',position:[0,0,0],yaw:0,velocity:[0,0,0]},{nodeId:'other',playerId:'remote',position:[1,0,0],yaw:0,velocity:[1,0,0],appearance:DEFAULT_APPEARANCE}]});peers.update(.1,null,camera);check(peers.avatars.size===1&&!peers.avatars.has('self'),'peer self exclusion failed');const peer=peers.avatars.get('other');await peer.ready;peers.update(.1,null,camera);check(peer.currentClip==='walk','remote walk animation missing');peers.accept({players:[]});peers.update(.1,null,camera);check(peer.disposed&&peers.avatars.size===0,'removed peer resources leaked');peers.dispose();
  const original=BuiltinCharacterGLTFLoader.prototype.loadAsync;let release;BuiltinCharacterGLTFLoader.prototype.loadAsync=()=>new Promise(r=>release=r);
  const pending=new WebGLRepositoryAvatar(scene);pending.dispose();let geometryDisposed=false,materialDisposed=false;
  const geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();geometry.addEventListener('dispose',()=>geometryDisposed=true);material.addEventListener('dispose',()=>materialDisposed=true);const group=new T.Group();group.add(new T.Mesh(geometry,material));release({scene:group,animations:[]});check(await pending.ready===false&&geometryDisposed&&materialDisposed,'late load after dispose leaked resources');BuiltinCharacterGLTFLoader.prototype.loadAsync=original;
  avatar.dispose();target.dispose();renderer.dispose();return {originalHeight:height,tintedPixels:tinted,originalMaleAndFemale:true,animatedClips:['idle','walk','run','helm'],peerExclusionAndRemoval:true,lateLoadDisposal:true,cancelledStyleRacesBothDirections:true,pendingIntentPromiseReuse:true};
 });
 assert.deepEqual(errors,[]);console.log(JSON.stringify({fixture:'Installed WebGL animated avatar, actual shader pixels and lifecycle',...result,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
