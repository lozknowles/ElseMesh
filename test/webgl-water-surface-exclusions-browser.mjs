import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {chromium} from 'playwright';
const root=resolve(new URL('..',import.meta.url).pathname),server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><link rel="icon" href="data:,">');return;}if(!path.startsWith('/src/')||path.split('/').includes('..'))throw Error('Path');res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(resolve(root,'.'+path)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;try{browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:'+server.address().port);const result=await page.evaluate(async()=>{
 const {T}=await import('/src/world-runtime/vendor/world-engine-contract.js'),{buildWebGLNativeSea}=await import('/src/world-runtime/WebGLNativeIsland.js');
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');if(!gl)return{available:false};
 const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:false});renderer.setSize(64,64);renderer.setClearColor(0,0);
 const camera=new T.PerspectiveCamera(60,1,.1,100);camera.position.set(5,20,0);camera.up.set(0,0,-1);camera.lookAt(5,0,0);camera.updateMatrixWorld();
 const source={appearance:{swellDir:{x:1,y:0}},ocean:{level:0,shore:{period:9,amplitude:4},surfaceExclusions:[{id:'world-left',min:[-100,-100,-100],max:[5,100,100]}]}};
 const shore=new T.DataTexture(new Float32Array(16),2,2,T.RGBAFormat,T.FloatType);shore.needsUpdate=true;
 const water=buildWebGLNativeSea(source,{origin:-1024,size:2048},{value:1.25},shore);water.mesh.position.x=5;
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x445544,3));scene.add(water.mesh);
 const target=new T.WebGLRenderTarget(64,64,{depthBuffer:true});target.depthTexture=new T.DepthTexture(64,64,T.UnsignedIntType);
 const read=new T.WebGLRenderTarget(64,64,{depthBuffer:false}),full=new T.Scene(),cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const inspect=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{src:{value:target.depthTexture},invProj:{value:camera.projectionMatrixInverse},world:{value:camera.matrixWorld}},vertexShader:'varying vec2 texUv;void main(){texUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'precision highp float;varying vec2 texUv;uniform sampler2D src;uniform mat4 invProj,world;void main(){float d=texture2D(src,texUv).r;if(d>=1.){gl_FragColor=vec4(0.);return;}vec4 q=invProj*vec4(texUv*2.-1.,d*2.-1.,1.);vec3 p=(world*(q/q.w)).xyz;bool inside=p.x<4.999&&p.x> -100.&&p.y> -100.&&p.y<100.&&p.z> -100.&&p.z<100.;gl_FragColor=inside?vec4(1.,0.,0.,1.):vec4(0.,1.,0.,1.);}'});
 full.add(new T.Mesh(new T.PlaneGeometry(2,2),inspect));const results=[];
 for(const mode of ['main','portal','depth']){
  water.mesh.material=mode==='depth'?water.mesh.customDepthMaterial:water.mesh.material;
  renderer.clippingPlanes=mode==='portal'?[new T.Plane(new T.Vector3(0,0,1),30)]:[];
  renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(read);renderer.clear();renderer.render(full,cam);
  const pixels=new Uint8Array(64*64*4);renderer.readRenderTargetPixels(read,0,0,64,64,pixels);let inside=0,outside=0,clear=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>0)inside++;if(pixels[i+1]>0)outside++;if(pixels[i+3]===0)clear++;}
  results.push({mode,inside,outside,clear});
 }
 const error=gl.getError(),enforced=water.surfaceExclusionsEnforced,immutable=Object.isFrozen(water.getSurfaceExclusions()[0].min);water.dispose();renderer.dispose();return{available:true,error,enforced,immutable,results};
});assert.deepEqual(errors,[]);assert.equal(result.available,true,'WebGL2 unavailable: exclusion readback qualification did not run');if(result.available){assert.equal(result.error,0);assert.equal(result.enforced,true);assert.equal(result.immutable,true);for(const mode of result.results){assert.equal(mode.inside,0);assert.ok(mode.outside>0);assert.ok(mode.clear>0);}}console.log(JSON.stringify({fixture:'WebGL final displaced-world surface exclusions; color/portal/depth readback; exaggerated analytic waves',...result,errors}));}finally{await browser?.close();await new Promise(r=>server.close(r));}
