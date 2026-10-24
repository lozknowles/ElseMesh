import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {loadWorldSource,inspectGlbJson,sampleTerrain,resolveWorldMatrices,describeRuntimeWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {buildRepositoryScene,disposeRepositoryScene} from '../src/world-runtime/RepositoryScene.js';
import {PerspectiveCamera} from '../src/engine/index.js';
import {LOST_WORLD_ID,LOST_REGION_ID} from '../tools/worlds/export-lost-island.mjs';
const root=process.env.ELSEMESH_LOST_ISLAND_ROOT,evidence=resolve(process.env.ELSEMESH_LOST_EVIDENCE_ROOT??'.local-evidence/lost-island-20261024'),hash=b=>createHash('sha256').update(b).digest('hex');
if(!root||!process.env.ELSEMESH_SOURCE_ROOT||!process.env.ELSEMESH_COMPARISON_WORLD_ROOTS)throw Error('Lost Island fixture requires ELSEMESH_LOST_ISLAND_ROOT, ELSEMESH_SOURCE_ROOT and ELSEMESH_COMPARISON_WORLD_ROOTS (JSON array of at least three world directories).');
const comparisonRoots=JSON.parse(process.env.ELSEMESH_COMPARISON_WORLD_ROOTS);
assert.ok(Array.isArray(comparisonRoots)&&comparisonRoots.length>=3&&comparisonRoots.every(p=>typeof p==='string'&&p.length),'ELSEMESH_COMPARISON_WORLD_ROOTS must contain at least three world directories');
const report=JSON.parse(await readFile(join(evidence,'provenance.json'),'utf8').catch(error=>{throw Error('Missing Lost Island provenance fixture; configure ELSEMESH_LOST_EVIDENCE_ROOT: '+error.message);})),manifest=JSON.parse(await readFile(join(root,'world.json'),'utf8'));
const source={kind:'local',label:'Lost Island test',read:async(path,limit)=>{assert.ok(!path.startsWith('/')&&!path.split('/').includes('..'));const bytes=await readFile(join(root,path));assert.ok(bytes.length<=limit);return bytes;}},loaded=await loadWorldSource(source),p=loaded.project;
test('independent Lost Island identity and literal authored welcome survive ordinary repository loading',async()=>{
 assert.equal(p.metadata.worldId,LOST_WORLD_ID);assert.equal(p.metadata.regionId,LOST_REGION_ID);assert.equal(p.metadata.name,'Lost Island');
 for(const directory of comparisonRoots){const other=JSON.parse(await readFile(join(directory,'world.json'),'utf8'));assert.notEqual(other.world.worldId,p.metadata.worldId);}
 assert.equal(p.welcome.schema,'elsemesh.world-welcome/1');assert.equal(p.welcome.audio,true);assert.match(p.welcome.text,/Lost Island/);assert.deepEqual(p.objectAccess.rules,[]);
 assert.ok(manifest.engine.requires.includes('welcome/1'));assert.ok(manifest.engine.requires.includes('collision-volumes/1'));assert.ok(manifest.attribution.authors.includes('DRG Software Solutions LLC'));
});
test('original terrain source arrays and generator dependency closure match recorded SHA256',async()=>{
 assert.equal(report.sourceTerrain.resolution,2048);assert.equal(report.sourceTerrain.texel,1);assert.deepEqual(report.sourceTerrain.disabledMethods,['carveCaveApproach','addThirdIsland','addFourthIsland','addFifthIsland','addPortIsland']);assert.equal(report.sourceTerrain.retainedPadCount,0);
 for(const r of report.rawEvidence){const bytes=await readFile(join(evidence,r.file));assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);}
 assert.ok(report.sources.length>=20);for(const r of report.sources){const bytes=await readFile(join(process.env.ELSEMESH_SOURCE_ROOT,r.path));assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);}
});
test('crop preserves original XYZ origin and all positive source land plus at least 64m water',()=>{
 assert.equal(p.terrain.width,1920);assert.equal(p.terrain.depth,1920);assert.equal(p.terrain.resolution,257);assert.equal(report.exportedTerrain.spacing,7.5);
 const b=report.sourceTerrain.landBounds,half=p.terrain.width/2;assert.ok(Math.min(half-b.maxX,half+b.minX,half-b.maxZ,half+b.minZ)>=64);
 assert.equal(b.minX,-626.5);assert.equal(b.maxX,613.5);assert.equal(b.minZ,-887.5);assert.equal(b.maxZ,279.5);assert.equal(p.water.level,0);
});
test('sampled editable terrain matches original float32 source at every export grid point',async()=>{
 const bytes=await readFile(join(evidence,'original-heights.f32'));const heights=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
 const originalAt=(x,z)=>{const fx=x+1024-.5,fz=z+1024-.5,i=Math.floor(fx),j=Math.floor(fz),tx=fx-i,tz=fz-j,k=j*2048+i;return (heights[k]*(1-tx)+heights[k+1]*tx)*(1-tz)+(heights[k+2048]*(1-tx)+heights[k+2049]*tx)*tz;};
 for(let j=0;j<257;j++)for(let i=0;i<257;i++){const x=-960+i*7.5,z=-960+j*7.5;assert.ok(Math.abs(p.terrain.heights[j*257+i]-originalAt(x,z))<1e-8);}
 for(const c of report.checks){assert.ok(Math.abs(c.originalHeight-originalAt(c.x,c.z))<1e-8);assert.ok(Math.abs(c.exportedHeight-sampleTerrain(p.terrain,c.x,c.z))<1e-8);}
 assert.ok(report.heightError.max>10,'fine terrain loss is disclosed');assert.ok(report.heightError.shorelineSignDisagreements>0,'shoreline loss is disclosed');
});
test('S1 S2 S3 are separately editable stable hut groups at exact original poses',()=>{
 const expected=[['S1',[67.8,3,-64.6],.05],['S2',[79.8,3.05,-70.4],-.12],['S3',[37.2,3.15,-72.4],.18]];
 assert.equal(p.assets.length,3);assert.equal(p.objects.filter(o=>o.kind==='group').length,3);
 for(const [name,pose,yaw]of expected){const id='lost-island-hut-'+name.toLowerCase(),group=p.objects.find(o=>o.id===id);assert.equal(group.kind,'group');assert.deepEqual(group.position,pose);assert.deepEqual(group.rotation,[0,yaw,0]);const mesh=p.objects.find(o=>o.parentId===id&&o.kind==='glb');assert.ok(mesh);assert.equal(mesh.collision,'none');assert.deepEqual(mesh.position,[0,0,0]);assert.ok(p.objects.some(o=>o.parentId===id&&o.collisionOnly));}
});
test('original hut collision centers, yaw and half extents remain attached to each editable group',()=>{
 const matrices=resolveWorldMatrices(p.objects);let count=0;
 for(const item of report.inventory){assert.ok(item.sourceBoxes.length>0);for(const [index,b]of item.sourceBoxes.entries()){const object=p.objects.find(o=>o.id===item.objectId+'-collider-'+index);assert.ok(object);assert.equal(object.parentId,item.objectId);assert.equal(object.collisionOnly,true);assert.equal(object.collision,b.walkable?'walkable':'solid');const m=matrices.get(object.id).elements;for(let axis=0;axis<3;axis++){assert.ok(Math.abs(m[12+axis]-b.position[axis])<1e-7);assert.ok(Math.abs(object.scale[axis]*.8-b.half[axis])<1e-7);}count++;}}
 assert.equal(count,42);assert.equal(describeRuntimeWorld(p).boxes.length,42);
});
test('GLBs have self-contained geometry and vertex tint with no game code or exclusive removed asset references',async()=>{
 for(const item of report.inventory){const asset=p.assets.find(a=>a.id===item.assetId),binary=Buffer.from(asset.dataUrl.split(',')[1],'base64');assert.equal(hash(binary),item.sha256);const inspection=inspectGlbJson(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.length));assert.equal(inspection.triangleCount,item.triangles);assert.ok(inspection.json.meshes[0].primitives.every(q=>q.attributes.COLOR_0!==undefined));assert.ok((inspection.json.buffers??[]).every(b=>!b.uri));assert.equal(inspection.json.images,undefined);assert.doesNotMatch(JSON.stringify(inspection.json),/Joe|cafe|shop|fish.seller|monorail|station|cave/i);}
 assert.equal(p.traffic,undefined);assert.equal(p.terminals,undefined);assert.equal(p.portals,undefined);assert.deepEqual(p.features,[]);assert.ok(p.objects.every(o=>o.kind==='group'||o.kind==='glb'||o.collisionOnly));assert.equal(p.objects.length,48);
});
test('world file closure is hash valid and contains only ordinary portable data plus attribution',async()=>{
 const expected=new Set(['world.json','README.md','.gitattributes','.gitignore','ATTRIBUTION.md']);
 for(const c of Object.values(manifest.components)){const bytes=await readFile(join(root,c.path));assert.equal(hash(bytes),c.sha256);assert.equal(bytes.length,c.bytes);expected.add(c.path);}
 const assetComp=JSON.parse(await readFile(join(root,manifest.components.assets.path),'utf8'));for(const asset of assetComp){const bytes=await readFile(join(root,asset.file.path));assert.equal(hash(bytes),asset.file.sha256);assert.equal(bytes.length,asset.file.bytes);expected.add(asset.file.path);}
 const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){assert.equal(e.isSymbolicLink(),false);const path=join(dir,e.name);if(e.isDirectory())await walk(path);else files.push(relative(root,path));}}await walk(root);assert.deepEqual(files.sort(),[...expected].sort());assert.ok(files.every(f=>!f.endsWith('.js')&&!f.endsWith('.mjs')&&!f.endsWith('.f32')&&!f.endsWith('.u8')));
 assert.match(await readFile(join(root,'ATTRIBUTION.md'),'utf8'),/Copyright \(c\) 2026 DRG Software Solutions LLC/);
});
test('ordinary native repository scene builds all prepared huts and collision volumes without legacy world initialization',async()=>{
 const scene=await buildRepositoryScene(describeRuntimeWorld(p),new PerspectiveCamera());try{assert.equal(scene.colliders.boxes.length,42);assert.ok(scene.assets.length>=3);assert.equal(scene.traffic,null);}finally{disposeRepositoryScene(scene);}
});

