import {readFile,writeFile,mkdir,readdir,realpath} from 'node:fs/promises';
import {resolve,dirname,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createWorld,packWorldRepository,loadWorldSource,inspectGlbJson,sampleTerrain,describeRuntimeWorld} from '../../src/world-runtime/vendor/world-engine-contract.js';
const check=(v,m)=>{if(!v)throw Error(m);},hash=b=>createHash('sha256').update(b).digest('hex');
export const LOST_WORLD_ID='elsemesh.world:0ad7db0c-04a6-4d48-9564-2aee87743a01';
export const LOST_REGION_ID='elsemesh.region:20fb854c-8bad-4613-8980-fc3c6b30cf23';
const retained=new Set(['S1','S2','S3']);
const blankObject=(id,name,kind,position=[0,0,0],rotation=[0,0,0],parentId)=>({id,name,kind,position,rotation,scale:[1,1,1],visible:true,collision:'none',color:'#b5b5ad',...(parentId?{parentId}:{})});
function localPoint(v,s){const x=v[0]-s.x,z=v[2]-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);return [c*x-n*z,v[1]-s.floorY,n*x+c*z];}
function localNormal(v,s){const c=Math.cos(s.yaw),n=Math.sin(s.yaw);return [c*v[0]-n*v[2],v[1],n*v[0]+c*v[2]];}
export function hutGlb(batches,s){
 const gltf={asset:{version:'2.0',generator:'Lost Island trusted original Village hut capture'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Beach hut '+s.name,mesh:0}],meshes:[{primitives:[]}],materials:[],accessors:[],bufferViews:[],buffers:[]},chunks=[];let length=0;
 const add=(array,type,componentType)=>{const raw=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:length,byteLength:raw.length});chunks.push(raw);length+=raw.length;const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const item={bufferView:view,componentType,count:array.length/({SCALAR:1,VEC2:2,VEC3:3}[type]),type};gltf.accessors.push(item);return gltf.accessors.length-1;};
 for(const [name,b]of Object.entries(batches)){if(!b.idx.length)continue;const p=new Float32Array(b.pos.length),normal=new Float32Array(b.nrm.length);
 for(let i=0;i<p.length;i+=3){p.set(localPoint(b.pos.slice(i,i+3),s),i);normal.set(localNormal(b.nrm.slice(i,i+3),s),i);}
 const position=add(p,'VEC3',5126),a=gltf.accessors[position];a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const k=i%3;a.min[k]=Math.min(a.min[k],p[i]);a.max[k]=Math.max(a.max[k],p[i]);}
 const mi=gltf.materials.length;gltf.materials.push({name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],roughnessFactor:name==='glass'?.28:name==='roofMetal'?.65:.88,metallicFactor:name==='roofMetal'?.12:0},doubleSided:true,...name==='glass'?{alphaMode:'BLEND'}:{}});
 gltf.meshes[0].primitives.push({attributes:{POSITION:position,NORMAL:add(normal,'VEC3',5126),TEXCOORD_0:add(new Float32Array(b.uv),'VEC2',5126),COLOR_0:add(new Float32Array(b.tint.map(v=>Math.max(0,Math.min(1,v)))),'VEC3',5126)},indices:add(new Uint32Array(b.idx),'SCALAR',5125),material:mi,mode:4});
 }
 gltf.buffers=[{byteLength:length}];const raw=Buffer.from(JSON.stringify(gltf)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),bin=Buffer.concat(chunks),out=Buffer.alloc(28+json.length+bin.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);out.writeUInt32LE(bin.length,20+json.length);out.writeUInt32LE(0x004e4942,24+json.length);bin.copy(out,28+json.length);return out;
}
async function sourceClosure(root,paths){
 const seen=new Map();async function visit(path){if(seen.has(path))return;const text=await readFile(join(root,path),'utf8');seen.set(path,{path,sha256:hash(text),bytes:Buffer.byteLength(text)});for(const m of text.matchAll(/(?:import|export)\s+(?:[^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)){if(m[1].startsWith('.')){const next=relative(root,resolve(root,dirname(path),m[1]));if(!next.startsWith('..')&&next.endsWith('.js'))await visit(next);}}}for(const p of paths)await visit(p);return [...seen.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
export async function exportLostIsland({sourceRoot=process.env.ELSEMESH_SOURCE_ROOT,outputRoot=process.env.ELSEMESH_OUTPUT_ROOT,evidenceRoot=resolve(process.env.ELSEMESH_LOST_EVIDENCE_ROOT??'.local-evidence/lost-island-20261024')}={}){
 if(!sourceRoot||!outputRoot)throw Error('Lost Island export requires sourceRoot and outputRoot arguments or ELSEMESH_SOURCE_ROOT and ELSEMESH_OUTPUT_ROOT.');
 sourceRoot=await realpath(sourceRoot);await mkdir(evidenceRoot,{recursive:true});
 const imported=path=>import(pathToFileURL(join(sourceRoot,path)).href),{TerrainData}=await imported('src/world/TerrainData.js'),{Group}=await imported('src/engine/index.js');
 const disabled=['carveCaveApproach','addThirdIsland','addFourthIsland','addFifthIsland','addPortIsland'],saved=new Map(disabled.map(k=>[k,TerrainData.prototype[k]]));
 for(const k of disabled)TerrainData.prototype[k]=function(){};
 let terrain;try{terrain=new TerrainData(7);}finally{for(const [k,fn]of saved)TerrainData.prototype[k]=fn;}
 // All original scalar arrays stay private as evidence, never installed as runtime callbacks.
 const rawEvidence=[];for(const name of ['heights','rock','sand','path','gully','seagrass','rubble','scarp']){const bytes=Buffer.from(terrain[name].buffer);const file='original-'+name+(terrain[name] instanceof Float32Array?'.f32':'.u8');await writeFile(join(evidenceRoot,file),bytes);rawEvidence.push({name,file,bytes:bytes.length,sha256:hash(bytes)});}
 const captures=[],captureByName=new Map();let current=null;
 globalThis.__lostIslandCapture=(ctx,s,build)=>{
 const wanted=retained.has(s.name),before=wanted?Object.fromEntries(Object.entries(ctx.B.batches).map(([k,b])=>[k,{v:b.vcount,pos:b.pos.length,nrm:b.nrm.length,uv:b.uv.length,tint:b.tint.length,data:b.data.length,idx:b.idx.length}])):null;current=wanted?s.name:null;
 const result=build(ctx,s);if(wanted){const batches={};for(const [k,b]of Object.entries(ctx.B.batches)){const start=before[k]??{v:0,pos:0,nrm:0,uv:0,tint:0,data:0,idx:0};if(b.vcount>start.v)batches[k]={pos:b.pos.slice(start.pos),nrm:b.nrm.slice(start.nrm),uv:b.uv.slice(start.uv),tint:b.tint.slice(start.tint),data:b.data.slice(start.data),idx:b.idx.slice(start.idx).map(i=>i-start.v)};}const entry={spec:structuredClone(s),result,batches,boxes:[]};captureByName.set(s.name,entry);captures.push(entry);}current=null;return result;};
 const boxes=[];
 const colliders={addBox(position,half,yaw=0,options={}){if(current)boxes.push({hut:current,position:position.toArray(),half:half.toArray(),yaw,...options});return {};},addCylinder(){return {};}};
 let villageSource=await readFile(join(sourceRoot,'src/world/Village.js'),'utf8');
 villageSource=villageSource.replace('import { buildHouse,','import { buildHouse as sourceBuildHouse,').replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,quote,path)=>'from '+quote+pathToFileURL(resolve(sourceRoot,'src/world',path)).href+quote);
 villageSource+='\nfunction buildHouse(ctx,s){return globalThis.__lostIslandCapture(ctx,s,sourceBuildHouse);}\n';
 const modulePath=join(evidenceRoot,'Village-capture.mjs');await writeFile(modulePath,villageSource);
 const {Village}=await import(pathToFileURL(resolve(modulePath)).href+'?capture='+Date.now());
 // Only retained pads are permitted. All retained huts use stilts, so none are flattened.
 Village.prototype._flattenPads=function(specs){check(specs.houses.filter(s=>retained.has(s.name)).every(s=>s.foundation==='stilts'),'Unexpected retained hut pad');this.retainedPads=[];};
 // Preserve the complete original layout/pier/boardwalk/plaza/house/prop RNG order.
 // Assembly only merges outputs after generation and is unnecessary for CPU capture.
 Village.prototype._assemble=function(){};Village.prototype._buildSign=function(){};Village.prototype._buildLanterns=function(){};
 new Village({scene:new Group(),terrain,colliders});delete globalThis.__lostIslandCapture;
 for(const b of boxes)captureByName.get(b.hut).boxes.push(b);
 check(captures.map(c=>c.spec.name).join(',')==='S1,S2,S3','Original retained hut sequence differs');
 const land={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,count:0};
 for(let j=0;j<terrain.res;j++)for(let i=0;i<terrain.res;i++)if(terrain.heights[j*terrain.res+i]>=0){const x=terrain.origin+(i+.5)*terrain.texel,z=terrain.origin+(j+.5)*terrain.texel;land.minX=Math.min(land.minX,x);land.maxX=Math.max(land.maxX,x);land.minZ=Math.min(land.minZ,z);land.maxZ=Math.max(land.maxZ,z);land.count++;}
 const half=Math.ceil((Math.max(...['minX','maxX','minZ','maxZ'].map(k=>Math.abs(land[k])))+64)/16)*16,width=half*2;
 check(width<=2048,'Land plus water padding exceeds supported domain');
 const project=createWorld('Lost Island');project.metadata={name:'Lost Island',description:'Original first island beaches and volcanic mountains, with three separately editable stilt beach huts. Independent scenery world; no shop, cafe, fish seller, cave or monorail.',worldId:LOST_WORLD_ID,regionId:LOST_REGION_ID};
 const resolution=257,heights=[],materials=[],maskSamples=[];
 const maskAt=(name,x,z)=>{const i=Math.max(0,Math.min(terrain.res-1,Math.round((x-terrain.origin)/terrain.texel-.5))),j=Math.max(0,Math.min(terrain.res-1,Math.round((z-terrain.origin)/terrain.texel-.5)));return terrain[name][j*terrain.res+i];};
 for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){const x=i*width/256-half,z=j*width/256-half;heights.push(terrain.heightAt(x,z));const sand=maskAt('sand',x,z),rock=maskAt('rock',x,z),path=maskAt('path',x,z);materials.push(sand>120?3:rock>.45?2:path>100?1:0);maskSamples.push({sand,rock,path});}
 project.terrain={width,depth:width,resolution,seed:7,heights,materials};
 project.spawn={position:[53.6,sampleTerrain(project.terrain,53.6,-77)+.03,-77],yaw:Math.PI};
 project.environment={...project.environment,timeOfDay:14,weather:'clear',cloudCoverage:.3,windSpeed:4,rainIntensity:0,fog:.0012};
 project.water={level:0,waveAmplitude:.22,waveSpeed:1.2,extent:width};
 project.objectAccess={schema:'elsemesh.object-access/1',rules:[]};
 project.welcome={schema:'elsemesh.world-welcome/1',text:'Welcome to Lost Island. Explore the beaches and volcanic mountains, and discover the three stilt huts above the bay.',audio:true};
 const inventory=[];
 for(const c of captures){
 const s=c.spec,id='lost-island-hut-'+s.name.toLowerCase(),group=blankObject(id,'Beach hut '+s.name,'group',[s.x,s.floorY,s.z],[0,s.yaw,0]);project.objects.push(group);
 const bytes=hutGlb(c.batches,s),array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),inspected=inspectGlbJson(array),assetId='lost-island-asset-'+s.name.toLowerCase();
 project.assets.push({id:assetId,name:'Original beach hut '+s.name,source:'Trusted CPU extraction from original ElseMesh Village/buildHouse; source closure hashes in provenance',license:'MIT; copyright (c) 2026 DRG Software Solutions LLC; ElseMesh contributors',prepared:true,mediaType:'model/gltf-binary',bytes:bytes.length,dataUrl:'data:application/octet-stream;base64,'+bytes.toString('base64'),bounds:inspected.bounds,materialCount:inspected.materialCount});
 project.objects.push({...blankObject(id+'-mesh','Original hut '+s.name+' mesh','glb',[0,0,0],[0,0,0],id),assetId});
 c.boxes.forEach((b,index)=>{const o=blankObject(id+'-collider-'+index,'Hut '+s.name+' '+(b.tag||'solid'),'box',localPoint(b.position,s),[0,b.yaw-s.yaw,0],id);o.scale=b.half.map(h=>h*2/1.6);o.collisionOnly=true;o.collision=b.walkable?'walkable':b.solid===false?'none':'solid';if(o.collision==='none')return;project.objects.push(o);});
 inventory.push({sourceBoxes:c.boxes,objectId:id,sourceName:s.name,pose:group.position,yaw:s.yaw,assetId,sha256:hash(bytes),bytes:bytes.length,triangles:inspected.triangleCount,vertices:inspected.vertexCount,colliders:c.boxes.length,materialBatches:Object.keys(c.batches)});
 }
 const checks=[];let sum=0,sumSq=0,max=0,shorelineDisagreements=0,shorelineCount=0;const errors=[];
 for(let z=-half+2;z<half;z+=7)for(let x=-half+2;x<half;x+=7){const original=terrain.heightAt(x,z),sampled=sampleTerrain(project.terrain,x,z),error=Math.abs(original-sampled);sum+=error;sumSq+=error*error;max=Math.max(max,error);errors.push(error);if(Math.abs(original)<2){shorelineCount++;if((original>=0)!==(sampled>=0))shorelineDisagreements++;}}
 for(const [name,x,z]of [['beach',0,-60],['bay',55,-40],['summit',-42,-505],['western-ridge',-238,-458],['eastern-ridge',152,-466],...captures.map(c=>[c.spec.name,c.spec.x,c.spec.z])])checks.push({name,x,z,originalHeight:terrain.heightAt(x,z),exportedHeight:sampleTerrain(project.terrain,x,z)});
 errors.sort((a,b)=>a-b);

 const sources=await sourceClosure(sourceRoot,['src/world/TerrainData.js','src/world/Village.js','LICENSE']);
 const differences=['Editable terrain is sampled from original 1 m source to 257x257 grid; fine cliffs, gullies and shore edges differ.','Original continuous rock/sand/path/gully/seagrass/rubble/scarp masks remain private source evidence. Runtime terrain maps sand/rock/path to four material classes; custom original terrain shader and small surface relief are not reproduced.','Hut vertex colors and geometry are retained; original GPU-baked wood grain, rust, thatch, net transparency and light animation are not baked into GLBs.','Original OBB hut volumes are authored under hut transforms; installed repository collision pipeline derives axis-aligned world boxes, broadening rotated collision bounds.','Original pier, village cottages, boathouse, market, props, vegetation scatter and original ocean shader are not retained. Only the requested three beach huts are exported.'];
 const report={schema:'elsemesh.lost-island-export/1',sourceRoot,outputRoot,worldId:LOST_WORLD_ID,regionId:LOST_REGION_ID,coordinateSystem:'Original XYZ metres; origin unchanged; sea level zero',sourceTerrain:{resolution:terrain.res,size:terrain.size,texel:terrain.texel,disabledMethods:disabled,retainedPadCount:terrain.pads.length,landBounds:land},exportedTerrain:{width,depth:width,resolution,spacing:width/256,minimumWaterPadding:Math.min(half-land.maxX,half+land.minX,half-land.maxZ,half+land.minZ)},heightError:{samples:errors.length,mean:sum/errors.length,rms:Math.sqrt(sumSq/errors.length),p95:errors[Math.floor(errors.length*.95)],max,shorelineSamplesWithin2m:shorelineCount,shorelineSignDisagreements:shorelineDisagreements},checks,rawEvidence,inventory,sources,materialDifferences:differences,excluded:['Joe cafe','shop','fish-selling NPC','cave approach','monorail','stations','routes','third island','fourth island','fifth island','port island'],proof:'Prepared data export and loader validation only; editor import/save/reopen and native visual/audible acceptance pending'};
 const packed=await packWorldRepository(project,{attribution:{authors:['ElseMesh project contributors','DRG Software Solutions LLC'],license:'MIT',source:'Original TerrainData and Village generators; independent Lost Island scenery extraction'},provenance:{sourceLocation:'Trusted offline capture of original ElseMesh first island generator sources'}});
 // Reserve a new independent world folder; never overwrite any existing world.
 await mkdir(outputRoot).catch(async error=>{if(error.code!=='EEXIST'||process.env.ELSEMESH_RESUME_EMPTY_LOST_EXPORT!=='1'||(await readdir(outputRoot)).length)throw error;});
 for(const [path,bytes]of packed){await mkdir(dirname(join(outputRoot,path)),{recursive:true});await writeFile(join(outputRoot,path),bytes,{flag:'wx'});}
 await writeFile(join(outputRoot,'ATTRIBUTION.md'),'# Lost Island attribution\n\nOriginal ElseMesh procedural TerrainData and Village/buildHouse generators.\n\n'+await readFile(join(sourceRoot,'LICENSE'),'utf8')+'\n\nThis independent world contains only prepared terrain and three captured beach hut GLBs. Source hash inventory is retained in the private export evidence.\n',{flag:'wx'});
 await writeFile(join(evidenceRoot,'provenance.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(join(evidenceRoot,'project.json'),JSON.stringify(project));
 const source={kind:'local',label:'Lost Island',read:async(path,limit)=>{const bytes=await readFile(join(outputRoot,path));check(bytes.length<=limit,'Read budget exceeded');return bytes;}};
 const loaded=await loadWorldSource(source),descriptor=describeRuntimeWorld(loaded.project);report.validation={loadedWorldId:loaded.identity.worldId,contentDigest:loaded.identity.contentDigest,objects:loaded.project.objects.length,assets:loaded.project.assets.length,collisionVolumes:descriptor.boxes.length};
 await writeFile(join(evidenceRoot,'provenance.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({worldId:LOST_WORLD_ID,outputRoot,terrain:report.exportedTerrain,heightError:report.heightError,inventory:inventory.map(({sourceBoxes,...entry})=>entry),validation:report.validation},null,2));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)exportLostIsland({sourceRoot:process.argv[2],outputRoot:process.argv[3],evidenceRoot:process.argv[4]}).catch(e=>{console.error(e);process.exitCode=1;});

