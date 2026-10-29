import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const out=resolve(process.env.ELSEMESH_LOD_EVIDENCE??'.local-evidence/presentation-lod');await mkdir(out,{recursive:true});
const server=await createServer({appType:'custom',server:{host:'127.0.0.1',port:0},logLevel:'error'});
server.middlewares.use('/lod-browser-fixture',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0;background:#17232b"></body></html>');});
await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'msedge'})});
 const page=await browser.newPage({viewport:{width:768,height:512}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/lod-browser-fixture');
 const result=await page.evaluate(async()=>{
  const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js');
  const {WebGLRepositoryAvatar}=await import('/src/world-runtime/WebGLRepositoryAvatar.js');
  const {installWebGLPresentationLOD,withGeometryLODLevel}=await import('/src/engine/render/PresentationLOD.js');
  const {prepareWebGLRepositoryResources}=await import('/src/world-runtime/WebGLRepositoryReadiness.js');
  const {installRepositoryPrimitiveLOD}=await import('/src/world-runtime/RepositoryPrimitiveLOD.js');
  const {drawWebGLPortal}=await import('/src/world-runtime/WebGLPortalViews.js');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(768,512);document.body.append(renderer.domElement);
  const ordinary=renderer.render.bind(renderer);installWebGLPresentationLOD(renderer);
  const scene=new T.Scene();scene.background=new T.Color('#17232b');scene.add(new T.HemisphereLight('#ffffff','#667788',3));
  const sun=new T.DirectionalLight('#ffffff',2);sun.position.set(3,5,6);scene.add(sun);
  const camera=new T.PerspectiveCamera(50,768/512,.05,1000);camera.position.set(0,1,4);camera.lookAt(0,.9,0);
  const prepareResources=root=>prepareWebGLRepositoryResources({renderer,camera,root,targetScene:scene});
  const avatar=new WebGLRepositoryAvatar(scene,{prepareResources});await avatar.ready;
  if(!await avatar.lodReady)throw Error('Avatar detail unavailable: '+avatar.lodError);
  const snapshots=[],target=new T.WebGLRenderTarget(256,256),materials=[...avatar.materials],mixer=avatar.mixer,model=avatar.model;
  const draw=(name,z,height=512)=>{
   camera.position.set(0,.9,z);camera.lookAt(0,.9,0);camera.updateMatrixWorld();renderer.setRenderTarget(height===256?target:null);renderer.info.reset();renderer.render(scene,camera);
   return {name,triangles:renderer.info.render.triangles,error:renderer.getContext().getError(),height};
  };
  for(const style of ['male','female']){
   await avatar.setAppearance({...avatar.appearance,style,shirt:'#cc3344',hair:'#553311'});if(!await avatar.lodReady)throw Error(avatar.lodError);
   avatar.cinematic={x:0,y:0,z:0,yaw:0,speed:3.4,mode:'walk'};for(let i=0;i<20;i++)avatar.update(.025,null,camera,true);
   const original=avatar.model,animation=avatar.mixer,geometries=[];original.traverse(n=>{if(n.isMesh)geometries.push([n,n.geometry]);});
   const near=draw(style+' near',4),medium=draw(style+' medium',42),far=draw(style+' far',90),portal=draw(style+' small target',42,256),nearAgain=draw(style+' near restored',4);
   if(!(far.triangles<medium.triangles&&medium.triangles<near.triangles))throw Error('No measured avatar detail reduction '+JSON.stringify({near,medium,far}));
   if(nearAgain.triangles!==near.triangles||avatar.model!==original||avatar.mixer!==animation||geometries.some(([n,g])=>n.geometry!==g))throw Error('Avatar canonical state changed');
   renderer.info.reset();const portalCamera=new T.PerspectiveCamera();
   drawWebGLPortal({renderer,sourceCamera:camera,camera:portalCamera,source:{position:[0,.9,0],yaw:0},destination:{position:[0,.9,-80],yaw:0},scene,candidate:{root:avatar.group,descriptor:{project:{environment:{timeOfDay:14}}}},target,width:256,height:256,time:1,ordinaryToneMapping:renderer.toneMapping});
   const mappedPortal={triangles:renderer.info.render.triangles,error:renderer.getContext().getError(),cameraPosition:portalCamera.position.toArray()};
   if(mappedPortal.triangles>=near.triangles||portalCamera===camera)throw Error('Mapped portal did not independently select reduced geometry');
   const afterPortal=draw(style+' after mapped portal',4);if(afterPortal.triangles!==near.triangles)throw Error('Mapped portal changed main detail');
   snapshots.push({style,near,medium,far,portal,mappedPortal,afterPortal,nearAgain,clip:avatar.currentClip});
   // Inspect matching animated geometry at one camera pose, independently of policy.
   renderer.setRenderTarget(null);camera.position.set(0,.9,4);camera.lookAt(0,.9,0);camera.updateMatrixWorld();
   const c=original.userData.presentationLOD;
   let fullRed;
   for(const level of [0,1,2]){
    withGeometryLODLevel(c,level,()=>ordinary(scene,camera));const image=renderer.domElement.toDataURL('image/png');
    const cv=new OffscreenCanvas(768,512),ctx=cv.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,768,512).data;let red=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]>pixels[i+1]*1.25&&pixels[i]>pixels[i+2]*1.25&&pixels[i]>45)red++;
    if(level===0)fullRed=red;if(red<fullRed*.5||red<100)throw Error('Avatar detail lost its shirt color '+style+'/'+level+': '+red+'/'+fullRed);
    snapshots.push({style,level,redPixels:red,image});
   }
  }
  avatar.dispose();
  const sphere=new T.Mesh(new T.SphereGeometry(.8,24,16),new T.MeshStandardMaterial({color:'#db7444'}));scene.add(sphere);installRepositoryPrimitiveLOD(sphere,'sphere',{api:T});
  const primitiveNear=draw('sphere near',4),primitiveFar=draw('sphere far',90);if(!(primitiveFar.triangles<primitiveNear.triangles*.3))throw Error('No primitive reduction');
  sphere.userData.disposePresentationLOD();sphere.geometry.dispose();sphere.material.dispose();target.dispose();renderer.dispose();
  return {snapshots,primitiveNear,primitiveFar,sharedOriginalState:!!materials.length&&!!mixer&&!!model};
 });
 for(const snapshot of result.snapshots){if(snapshot.image){await writeFile(resolve(out,snapshot.style+'-'+snapshot.level+'.png'),Buffer.from(snapshot.image.split(',')[1],'base64'));delete snapshot.image;}else for(const key of ['near','medium','far','portal','mappedPortal','afterPortal','nearAgain'])assert.equal(snapshot[key].error,0);}
 assert.equal(result.primitiveNear.error,0);assert.equal(result.primitiveFar.error,0);assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'browser-results.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));
}finally{await browser?.close();await server.close();}
