import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Terrain } from '../src/world/Terrain.js';
import { Scene, OrthographicCamera } from '../src/engine/index.js';
import { ShaderModule } from '../src/engine/gpu/Shader.js';
import { GPU } from '../src/engine/gpu/GPU.js';
import { Texture } from '../src/engine/gpu/Texture.js';
import { SIMPLE_TERRAIN_SURFACE } from '../src/world/terrain/SimpleTerrainSurface.js';
import { RenderTarget } from '../src/engine/gpu/Texture.js';
import { readTexture } from '../src/engine/gpu/Readback.js';
import { MeshRenderer } from '../src/engine/render/MeshRenderer.js';
import { FrameUniforms, createViewUniforms, setFrameCamera } from '../src/engine/render/Frame.js';
import { setShadowMap } from '../src/engine/render/wgsl/lighting.js';
import { fromHalfFloat } from '../src/engine/math/DataUtils.js';

const gpuMode=process.argv.includes('--gpu');
if(gpuMode) { await import('./headless.mjs'); await GPU.init({headless:true}); }
const fakeModule=new ShaderModule({name:'qualityFixtureTerrain',code:`
fn terrainHeightAt(xz:vec2f)->f32 { return 2.0; }
fn terrainNormalRock(xz:vec2f)->vec4f { return vec4f(0.0,0.0,0.6,0.9); }
fn terrainSplat(xz:vec2f)->vec4f { return vec4f(0.4,0.2,0.3,0.1); }
fn terrainSunShadowAt(p:vec3f)->f32 { return 1.0; }
`});
const scene=new Scene();
let terrain;
if(gpuMode) terrain=new Terrain({scene,terrainData:{size:1024,boundsFor:()=>[2,2]},terrainGPU:{module:fakeModule,updateSunShadow(){}},gridSize:8});
else {
  // Exercise the real constructor/finalization and SceneMaterial while skipping
  // only procedural texture GPU upload/mip passes. CPU detail data still exists.
  const upload=Texture.prototype.getGPU,encoder=GPU.getEncoder;
  try {
    Texture.prototype.getGPU=function(){this.mipsOption=false;return {};};
    GPU.getEncoder=()=>({});
    terrain=new Terrain({scene,terrainData:{size:1024,boundsFor:()=>[2,2]},terrainGPU:{module:fakeModule,updateSunShadow(){}},gridSize:8});
  } finally {Texture.prototype.getGPU=upload;GPU.getEncoder=encoder;}
}
const material=terrain.material,full=material._surface,prelude=material._prelude();

test('Full remains the default and its original body is unchanged',()=>{
  // Verified against b765236 before fixing these hashes. No Git/history access is
  // required at test time, including in shallow CI or an exported source tree.
  const literalHash='4194194b9d2ac261d9ce003e92237947e25a8a2131dd557ad688274b38073b0b';
  const surfaceHash='49e1a52d2c8a6ecde3a3fcfdfae97685496ba405b6a5cfb466543024928d0b8e';
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const current=readFileSync(new URL('../src/world/Terrain.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const literal=file=>file.slice(file.indexOf('const TERRAIN_SURFACE = /* wgsl */`')+'const TERRAIN_SURFACE = /* wgsl */`'.length,file.lastIndexOf('`;'));
  assert.equal(hash(literal(current)),literalHash);assert.equal(hash(full),surfaceHash);
  assert.equal(terrain.simpleShading,false);assert.equal(material.surface,prelude+full);
});

test('Simple preserves cave/macro normal/AO, recognises cover and meets detail-fetch budget',()=>{
  assert.equal(SIMPLE_TERRAIN_SURFACE.slice(0,SIMPLE_TERRAIN_SURFACE.indexOf('let xz = p.xz;')),
    full.slice(0,full.indexOf('let xz = p.xz;')));
  assert.equal((SIMPLE_TERRAIN_SURFACE.match(/terDetail\(/g)||[]).length,1);
  assert.equal((SIMPLE_TERRAIN_SURFACE.match(/terrainNormalRock\(/g)||[]).length,1);
  assert.equal((SIMPLE_TERRAIN_SURFACE.match(/terrainSplat\(/g)||[]).length,1);
  assert.equal((SIMPLE_TERRAIN_SURFACE.match(/terWetFoam\(/g)||[]).length,1,'wetness keeps its separately accounted cost');
  assert.doesNotMatch(SIMPLE_TERRAIN_SURFACE,/terrainTriplanar|terrainRockSurface|terrainPerturbNormal|dpdx|dpdy|fwidth/);
  for(const term of ['sandW','pathW','rockW','jungleW','underW','terMeadowW','s.normal = N0','s.ao = sat( nr.w )'])assert.ok(SIMPLE_TERRAIN_SURFACE.includes(term));
});

test('switching preserves SceneMaterial/resources/order and reuses two pipeline keys',()=>{
  const unchanged=Object.fromEntries(Object.entries(material).filter(([key])=>!['_surface','__pkFrame','__pk'].includes(key)));
  const version=material.version,off=material.pipelineKey(),geometry=terrain.mesh.geometry;
  terrain.simpleShading=true;const on=material.pipelineKey();assert.notEqual(on,off);
  assert.equal(material.surface,prelude+SIMPLE_TERRAIN_SURFACE);
  assert.equal(material.surface.split(prelude).length-1,1);
  for(let i=0;i<12;i++) {
    material.__pkFrame=123;terrain.simpleShading=!terrain.simpleShading;
    assert.equal(material.__pkFrame,-1);assert.equal(material.pipelineKey(),terrain.simpleShading?on:off);
  }
  material.__pkFrame=123;terrain.simpleShading=terrain.simpleShading;assert.equal(material.__pkFrame,123);
  assert.equal(material.version,version);
  for(const [key,value] of Object.entries(unchanged)) {
    if(key==='defines')continue;
    assert.equal(material[key],value,key);
  }
  assert.equal(terrain.mesh.geometry,geometry);assert.equal(terrain.mesh.material,material);
  terrain.simpleShading=false;assert.equal(material.surface,prelude+full);
});

test('finalization preserves Simple through wetness attachment and keeps Full restorable',()=>{
  terrain.simpleShading=true;
  const originalWetness=terrain.wetness;
  terrain.wetness={code:'fn terrainWetness(xz:vec2f,h:f32)->vec2f { return vec2f(0.2,0.1); }'};
  material.defines.REFRACTION_CLIP=1;
  terrain.finalizeMaterial();
  assert.equal(terrain.simpleShading,true);assert.equal(material._surface,SIMPLE_TERRAIN_SURFACE);
  assert.equal(material.defines.HAS_WETNESS,1);assert.equal(material.defines.REFRACTION_CLIP,1);
  assert.equal(material.defines.TERRAIN_SIMPLE_SHADING,1);assert.equal(material.__pkFrame,-1);
  terrain.simpleShading=false;assert.equal(material.surface,prelude+full);
  terrain.wetness=originalWetness;delete material.defines.REFRACTION_CLIP;terrain.finalizeMaterial();
});

// App imports Vite-only browser assets. Execute its actual method bodies with
// bounded collaborators instead of duplicating their implementation in a test.
const appSource=readFileSync(new URL('../src/App.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const methodBody=pattern=>{const match=appSource.match(pattern);assert.ok(match,'actual App method found');return match[1];};
const setTerrainShading=Function('return function(value){'+methodBody(/\tsetTerrainShading\( value \) \{([\s\S]*?)\n\t\}/)+'};')();

test('actual App quality setter accepts exact Simple and resets temporal history only on change',()=>{
  let resets=0;
  const app={terrain,settings:{terrainShading:'full'},post:{taau:{resetHistory(){resets++;}}}};
  assert.equal(setTerrainShading.call(app,'full'),'full');assert.equal(resets,0);
  assert.equal(setTerrainShading.call(app,'simple'),'simple');assert.equal(terrain.simpleShading,true);
  assert.equal(material.defines.TERRAIN_SIMPLE_SHADING,1);assert.equal(resets,1);
  assert.equal(setTerrainShading.call(app,'simple'),'simple');assert.equal(resets,1);
  for(const value of [null,undefined,'Simple','SIMPLE',' simple','simple ','invalid',1,{}]) {
    setTerrainShading.call(app,'simple');const before=resets;
    assert.equal(setTerrainShading.call(app,value),'full');assert.equal(app.settings.terrainShading,'full');
    assert.equal(terrain.simpleShading,false);assert.equal(material.defines.TERRAIN_SIMPLE_SHADING,0);
    assert.equal(resets,before+1);
    setTerrainShading.call(app,value);assert.equal(resets,before+1,'repeated fallback Full keeps history');
  }
  assert.doesNotThrow(()=>setTerrainShading.call({terrain,settings:{terrainShading:'full'}},null),'post may be absent at startup');
});

test('actual App precompile warms both terrain modes and restores selected mode/refraction',async()=>{
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const gpu={pipelinesReady:async()=>{},queue:{onSubmittedWorkDone:async()=>{}}};
  const precompile=AsyncFunction('GPU','DEPTH_FORMAT',methodBody(/\tasync precompile\(\) \{([\s\S]*?)\n\t\}/));
  for(const selected of [false,true]) {
    terrain.simpleShading=selected;const calls=[];
    const app={terrain,engine:{meshRenderer:{precompiling:false}},refraction:{enabled:false},post:{_built:true},
      sceneRenderer:{hullMasks:[]},waterMaterial:{hullOverride:null},frame(){calls.push({simple:terrain.simpleShading,hull:this.waterMaterial.hullOverride,
        refraction:this.refraction.enabled,precompiling:this.engine.meshRenderer.precompiling});}};
    await precompile.call(app,gpu,'depth32float');
    assert.deepEqual(calls,[false,true].flatMap(simple=>[0,1].map(hull=>({simple,hull,refraction:true,precompiling:true}))));
    assert.equal(terrain.simpleShading,selected);assert.equal(app.refraction.enabled,false);
    assert.equal(app.engine.meshRenderer.precompiling,false);assert.equal(app.waterMaterial.hullOverride,null);
  }
  terrain.simpleShading=false;
});

// Opt-in, run separately from browser measurements:
// node test/terrain-shading-quality.mjs --gpu
test('real GPU main/refraction keeps depth and cave coverage through repeated quality switches', {skip:!gpuMode}, async()=>{
  const errors=[];GPU.device.addEventListener('uncapturederror',event=>errors.push(event.error.message));
  const W=96,H=96,renderer=new MeshRenderer(),camera=new OrthographicCamera(-16,16,16,-16,.1,100);
  FrameUniforms.fields.seaLevel.value=3;
  camera.position.set(-344,35,80);camera.up.set(0,0,-1);camera.lookAt(-344,2,80);
  terrain.lod.update(camera);
  assert.ok(terrain.lod.geometry.instanceCount>0,'fixture selects real CDLOD patches');
  setShadowMap(new Texture({width:1,height:1,depth:1,dimension:'2d-array',format:'depth32float',usage:['sample']}));
  const id=material.id,version=material.version;
  async function render(simple,refraction) {
    terrain.simpleShading=simple;
    const formats=refraction?['rgba16float']:['rgba16float','rgba16float','rgba8unorm'];
    const rt=new RenderTarget(W,H,{colors:formats,depth:'depth32float'}),block=createViewUniforms('terrain-quality-fixture');
    const pass={camera,frameBlock:block,kind:refraction?'color':'main',cull:false,colorViews:rt.textures.map(t=>t.view()),colorFormats:formats,
      clearColors:formats.map(()=>[0,0,0,0]),depthView:rt.depthTexture.view(),depthFormat:'depth32float',clearDepth:0,depthCompare:'greater-equal',
      ...(refraction?{defines:{REFRACTION_CLIP:1,REFRACTION_CLIP_MARGIN:.02}}:{})};
    renderer.precompiling=true;GPU.beginFrame();setFrameCamera(camera,W,H,{block});renderer.render(scene,pass);GPU.submit();
    await GPU.pipelinesReady();renderer.precompiling=false;
    GPU.beginFrame();setFrameCamera(camera,W,H,{block});renderer.render(scene,pass);GPU.submit();
    const depth=new Float32Array((await readTexture(rt.depthTexture)).data);
    const color=Float32Array.from(new Uint16Array((await readTexture(rt.textures[0])).data),fromHalfFloat);
    assert.ok(renderer.stats.draws>0,'terrain draws after pipeline warmup');
    assert.equal(material.id,id);assert.equal(material.version,version);
    rt.textures.forEach(t=>t.destroy());rt.depthTexture.destroy();return {depth,color};
  }
  try {
    for(const refraction of [false,true]) {
      const fullImage=await render(false,refraction),simpleImage=await render(true,refraction),restored=await render(false,refraction);
      let covered=0,changed=0;
      for(let i=0;i<W*H;i++) {
        assert.equal(simpleImage.depth[i],fullImage.depth[i],'depth/cave silhouette preserved');
        assert.equal(restored.depth[i],fullImage.depth[i],'Full survives repeated switch');
        if(fullImage.depth[i]>0) {
          covered++;
          for(let c=0;c<3;c++) {
            assert.ok(Number.isFinite(fullImage.color[i*4+c])&&Number.isFinite(simpleImage.color[i*4+c]));
            if(Math.abs(fullImage.color[i*4+c]-simpleImage.color[i*4+c])>.001)changed++;
          }
        }
      }
      assert.ok(covered>1000,'enough visible terrain');
      assert.equal(fullImage.depth[48*W+48],0,'cave centre remains a hole');
      assert.ok(changed>100,'Simple intentionally changes terrain appearance');
      console.log(JSON.stringify({refraction,covered,changedChannels:changed,materialId:id}));
    }
    assert.deepEqual(errors,[]);
  } finally {terrain.simpleShading=false;GPU.device.destroy();}
});
