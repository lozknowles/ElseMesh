import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const out=resolve(process.env.ELSEMESH_LOD_EVIDENCE??'.local-evidence/presentation-lod');await mkdir(out,{recursive:true});
const server=await createServer({appType:'custom',server:{host:'127.0.0.1',port:0},logLevel:'error'});
server.middlewares.use('/lod-native-fixture',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="icon" href="data:,">');});await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'msedge'})});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/lod-native-fixture');
 const result=await page.evaluate(async()=>{
  const {GPU}=await import('/src/engine/gpu/GPU.js');await GPU.init({headless:true});
  const N=await import('/src/engine/index.js');const {MeshRenderer}=await import('/src/engine/render/MeshRenderer.js');
  const {ReadiedRepositoryAvatar,prepareNativeRepositoryResources}=await import('/src/world-runtime/NativeRepositoryReadiness.js');
  const {RenderTarget}=await import('/src/engine/gpu/Texture.js');const {readTexture}=await import('/src/engine/gpu/Readback.js');
  const {G,setFrameCamera}=await import('/src/engine/render/Frame.js');const {SunShadows}=await import('/src/engine/render/Shadows.js');
  const {FullscreenPass}=await import('/src/engine/render/FullscreenPass.js');
  const scene=new N.Scene(),mr=new MeshRenderer(),camera=new N.PerspectiveCamera(50,1,.05,1000);camera.position.set(0,.9,4);camera.lookAt(0,.9,0);
  G.sunDir.value.set(.45,.75,.5).normalize();G.sunColor.value.setRGB(3,2.9,2.7);G.skyIrradiance.value.setRGB(.3,.36,.45);
  const shadows=new SunShadows({size:128});shadows.enabled=false;
  const rt=new RenderTarget(512,512,{colors:['rgba16float'],depth:'depth32float'}),ldr=new RenderTarget(512,512,{colors:['rgba8unorm']});
  const tonemap=new FullscreenPass({label:'LOD evidence tonemap',colorFormats:['rgba8unorm'],bindings:{hdr:{texture:()=>rt.texture}},code:`fn fragment(in:FSIn)->vec4f{let c=textureLoad(hdr,vec2i(in.pos.xy),0).rgb;let a=c*.8;let t=(a*(2.51*a+.03))/(a*(2.43*a+.59)+.14);return vec4f(linearToSrgb(sat3(t)),1.);}`});
  const avatar=new ReadiedRepositoryAvatar(scene,{model:{wheelPivot:{position:new N.Vector3()},lines:{deckY:0},group:new N.Group()},getYaw:()=>0},{prepareResources:root=>prepareNativeRepositoryResources({meshRenderer:mr,camera,root})});
  const snapshots=[];await avatar.ready;
  for(const style of ['male','female']){
   await avatar.setAppearance({...avatar.appearance,style,shirt:'#cc3344'});await avatar.ready;if(!await avatar.scanned.lodReady)throw Error('Native LOD unavailable '+avatar.scanned.lodError);
   const original=avatar.scanned,materials=original.materials,geometries=original.meshes.map(m=>m.geometry);avatar.cinematic={x:0,y:0,z:0,yaw:0,speed:3.4,walk:true,mode:'walk'};
   const draw=async(name,z)=>{
    camera.position.set(0,.9,z);camera.lookAt(0,.9,0);
    for(let i=0;i<3;i++){GPU.beginFrame();avatar.update(.025,{mode:'walk'},camera,true);setFrameCamera(camera,512,512);shadows.render(scene,mr,shadows.update(camera,G.sunDir.value));mr.render(scene,{camera,kind:'color',colorViews:[rt.texture.view()],colorFormats:rt.formats,clearColors:[[.055,.07,.09,1]],depthView:rt.depthTexture.view(),depthFormat:'depth32float',clearDepth:0});tonemap.render({colorViews:[ldr.texture]});GPU.submit();await GPU.pipelinesReady();}
    await GPU.queue.onSubmittedWorkDone();const image=await readTexture(ldr.texture);const cv=document.createElement('canvas');cv.width=512;cv.height=512;cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(image.data),512,512),0,0);
    return{name,triangles:mr.stats.triangles,image:cv.toDataURL('image/png')};
   };
   const near=await draw(style+' near',4),medium=await draw(style+' medium',42),far=await draw(style+' far',90),restored=await draw(style+' restored',4);
   if(!(far.triangles<medium.triangles&&medium.triangles<near.triangles&&restored.triangles===near.triangles))throw Error('Native triangle selection failed');
   if(avatar.scanned!==original||original.materials!==materials||original.meshes.some((m,i)=>m.geometry!==geometries[i]))throw Error('Native canonical avatar state changed');
   snapshots.push({style,near,medium,far,restored});
  }
  avatar.dispose();GPU.submit();await GPU.queue.onSubmittedWorkDone();return{snapshots};
 });
 for(const s of result.snapshots)for(const key of ['near','medium','far','restored']){await writeFile(resolve(out,'native-'+s.style+'-'+key+'.png'),Buffer.from(s[key].image.split(',')[1],'base64'));delete s[key].image;}
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'native-browser-results.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));
}finally{await browser?.close();await server.close();}
