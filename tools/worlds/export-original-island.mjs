import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadWorldSource, packWorldRepository, inspectGlbJson, describeRuntimeWorld} from '../../src/world-runtime/vendor/world-engine-contract.js';
import {hutGlb} from './export-lost-island.mjs';

export const ORIGINAL_WORLD_ID='elsemesh.world:470d2706-d459-4cb6-92d8-d4074289bea5';
export const ORIGINAL_REGION_ID='elsemesh.region:4ed24cbc-4d3d-4e78-bcb4-bbd42451dd86';
const check=(value,message)=>{if(!value)throw Error(message);};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const readRoot=root=>async(path,limit)=>{const bytes=await readFile(join(root,path));if(bytes.length>limit)throw Error('World resource exceeds read budget.');return bytes;};
const object=(id,name,kind,position=[0,0,0],rotation=[0,0,0],parentId)=>({
 id,name,kind,position,rotation,scale:[1,1,1],visible:true,collision:'none',color:'#b5b5ad',
 ...(parentId?{parentId}:{})
});
const snapshot=batches=>Object.fromEntries(Object.entries(batches).filter(([,b])=>b.vcount>0).map(([key,b])=>[key,{pos:[...b.pos],nrm:[...b.nrm],uv:[...b.uv],tint:[...b.tint],idx:[...b.idx]}]));
const counts=batches=>Object.fromEntries(Object.entries(batches).map(([key,b])=>[key,{v:b.vcount,pos:b.pos.length,nrm:b.nrm.length,uv:b.uv.length,tint:b.tint.length,idx:b.idx.length}]));
const delta=(batches,before)=>Object.fromEntries(Object.entries(batches).filter(([key,b])=>b.vcount>(before[key]?.v??0)).map(([key,b])=>{
 const start=before[key]??{v:0,pos:0,nrm:0,uv:0,tint:0,idx:0};
 return [key,{pos:b.pos.slice(start.pos),nrm:b.nrm.slice(start.nrm),uv:b.uv.slice(start.uv),tint:b.tint.slice(start.tint),idx:b.idx.slice(start.idx).map(i=>i-start.v)}];
}));
function mergeBatches(left,right){const out=structuredClone(left);for(const [key,b]of Object.entries(right)){if(!out[key]){out[key]=structuredClone(b);continue;}const a=out[key],v=a.pos.length/3;a.pos.push(...b.pos);a.nrm.push(...b.nrm);a.uv.push(...b.uv);a.tint.push(...b.tint);a.idx.push(...b.idx.map(i=>i+v));}return out;}
function localPoint(v,pivot){return [v[0]-pivot[0],v[1]-pivot[1],v[2]-pivot[2]];}
function addCollider(project,parentId,entry,index,pivot,prefix){
 const {position,half,yaw,options}=entry;
 if(options.solid===false&&!options.walkable)return;
 const item=object(prefix+'-collider-'+index,(options.tag||prefix)+' '+index,'box',localPoint(position,pivot),[0,yaw,0],parentId);
 item.scale=half.map(h=>h*2/1.6);
 item.collisionOnly=true;
 item.collision=options.walkable?'walkable':'solid';
 item.tags=[options.tag||'original-island-collider'];
 project.objects.push(item);
}
function addAsset(project,id,name,bytes,source){
 const array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),info=inspectGlbJson(array);
 check(info.triangleCount>0&&info.vertexCount>0,'Empty '+name+' geometry.');
 project.assets.push({id,name,source,license:'MIT; copyright (c) 2026 DRG Software Solutions LLC; ElseMesh contributors',prepared:true,mediaType:'model/gltf-binary',bytes:bytes.length,dataUrl:'data:application/octet-stream;base64,'+bytes.toString('base64'),bounds:info.bounds,materialCount:info.materialCount});
 return {id,name,sha256:digest(bytes),bytes:bytes.length,triangles:info.triangleCount,vertices:info.vertexCount};
}
async function capturePierAndBoardwalk(sourceRoot,evidenceRoot){
 const imported=path=>import(pathToFileURL(join(sourceRoot,path)).href);
 const {TerrainData}=await imported('src/world/TerrainData.js'),{Group}=await imported('src/engine/index.js');
 const disabled=['carveCaveApproach','addThirdIsland','addFourthIsland','addFifthIsland','addPortIsland'];
 const saved=new Map(disabled.map(k=>[k,TerrainData.prototype[k]]));
 for(const key of disabled)TerrainData.prototype[key]=function(){};
 let terrain;
 try{terrain=new TerrainData(7);}finally{for(const [key,fn] of saved)TerrainData.prototype[key]=fn;}
 let part=null,pier=null,boardwalk=null;
 const boxes={pier:[],boardwalk:[]};
 globalThis.__originalIslandPierCapture=(args,build)=>{
  part='pier';const result=build(args);part=null;
  pier={batches:mergeBatches(snapshot(args.B.batches),snapshot(args.signB.batches)),info:{stepFoot:result.stepFoot.toArray(),signPivot:result.signPivot.toArray()}};
  return result;
 };
 globalThis.__originalIslandBoardwalkCapture=(ctx,points,options,build)=>{
  if(boardwalk)return build(ctx,points,options);
  const before=counts(ctx.B.batches);part='boardwalk';const result=build(ctx,points,options);part=null;
  boardwalk={batches:delta(ctx.B.batches,before),points,options};return result;
 };
 const colliders={addBox(position,half,yaw=0,options={}){if(part)boxes[part].push({position:position.toArray(),half:half.toArray(),yaw,options});return{};},addCylinder(){return{};}};
 let source=await readFile(join(sourceRoot,'src/world/Village.js'),'utf8');
 source=source.replace('import { buildPier, PIER }','import { buildPier as sourceBuildPier, PIER }').replace('import { buildBoardwalk }','import { buildBoardwalk as sourceBuildBoardwalk }');
 source=source.replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,quote,path)=>'from '+quote+pathToFileURL(resolve(sourceRoot,'src/world',path)).href+quote);
 source+='\nfunction buildPier(args){return globalThis.__originalIslandPierCapture(args,sourceBuildPier);}\nfunction buildBoardwalk(ctx,points,options){return globalThis.__originalIslandBoardwalkCapture(ctx,points,options,sourceBuildBoardwalk);}\n';
 await mkdir(evidenceRoot,{recursive:true});
 const modulePath=join(evidenceRoot,'Village-original-capture.mjs');await writeFile(modulePath,source);
 const {Village}=await import(pathToFileURL(modulePath).href+'?capture='+Date.now());
 const suppressed=['_flattenPads','_assemble','_buildSign','_buildLanterns'];
 const originalMethods=new Map(suppressed.map(key=>[key,Village.prototype[key]]));
 for(const key of suppressed)Village.prototype[key]=function(){};
 try{new Village({scene:new Group(),terrain,colliders});}finally{
  for(const [key,method] of originalMethods)Village.prototype[key]=method;
  delete globalThis.__originalIslandPierCapture;delete globalThis.__originalIslandBoardwalkCapture;
 }
 check(pier&&boardwalk&&boxes.pier.length>50,'Original pier or boardwalk capture failed.');
 return {pier,boardwalk,boxes,sourceHash:digest(await readFile(join(sourceRoot,'src/world/Village.js')))};
}
function boatBatches(model){
 model.group.updateMatrixWorld(true);
 const result={};
 for(const [name,mesh] of Object.entries(model.meshes)){
  const geometry=mesh.geometry,p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv'),color=geometry.getAttribute('color');
  if(!p||!n||!geometry.index)continue;
  const normalMatrix=new mesh.matrixWorld.constructor().copy(mesh.matrixWorld).invert().transpose();
  const positions=[],normals=[],uvs=[],colors=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),m=mesh.matrixWorld.elements;
   positions.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]);
   const q=normalMatrix.elements,nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
   const ax=q[0]*nx+q[4]*ny+q[8]*nz,ay=q[1]*nx+q[5]*ny+q[9]*nz,az=q[2]*nx+q[6]*ny+q[10]*nz,len=Math.hypot(ax,ay,az)||1;
   normals.push(ax/len,ay/len,az/len);
   uvs.push(uv?.getX(i)??0,uv?.getY(i)??0);
   colors.push(color?.getX(i)??1,color?.getY(i)??1,color?.getZ(i)??1);
  }
  result[name]={pos:positions,nrm:normals,uv:uvs,tint:colors,idx:Array.from(geometry.index.array)};
 }
 return result;
}
export async function exportOriginalIsland({sourceRoot=process.env.ELSEMESH_SOURCE_ROOT,baseRoot=process.env.ELSEMESH_LOST_NATIVE_ROOT,outputRoot=process.env.ELSEMESH_OUTPUT_ROOT,evidenceRoot=process.env.ELSEMESH_ORIGINAL_EVIDENCE_ROOT}={}){
 check(sourceRoot&&baseRoot&&outputRoot&&evidenceRoot,'Supply sourceRoot, baseRoot, outputRoot and evidenceRoot.');sourceRoot=resolve(sourceRoot);baseRoot=resolve(baseRoot);outputRoot=resolve(outputRoot);evidenceRoot=resolve(evidenceRoot);
 const loaded=await loadWorldSource({kind:'local',label:'Lost native source',read:readRoot(baseRoot)});
 check(loaded.project.nativeIsland?.schema==='elsemesh.native-island/1','Source must contain native first-island resources.');
 const project=structuredClone(loaded.project);
 project.metadata={name:'Original Island',description:'The original first-island beach and mountains with its timber pier, boardwalk, three beach huts and moored lobster boat. Café, shop, cave and monorail are excluded.',worldId:ORIGINAL_WORLD_ID,regionId:ORIGINAL_REGION_ID};
 project.welcome={schema:'elsemesh.world-welcome/1',text:'Welcome to Original Island. Follow the boardwalk to the pier and explore the boat and beaches.',audio:true};
 project.portals=[];project.terminals=[];
 const capture=await capturePierAndBoardwalk(sourceRoot,evidenceRoot),inventory=[];
 for(const [part,pivot]of [['pier',[55,0,-12]],['boardwalk',[50,0,-85]]]){
  const group=object('original-'+part,part==='pier'?'Original timber pier':'Boardwalk to pier','group',pivot);
  project.objects.push(group);
  const timber={wood:[.62,.43,.27,1],hard:[.45,.43,.39,1],rope:[.64,.57,.43,1],net:[.28,.34,.32,1]};
  const bytes=hutGlb(capture[part].batches,{name:part,x:pivot[0],floorY:pivot[1],z:pivot[2],yaw:0},timber),assetId='original-'+part+'-glb';
  inventory.push({...addAsset(project,assetId,group.name,bytes,'Trusted original Village generator capture'),part,colliders:capture.boxes[part].length});
  project.objects.push({...object('original-'+part+'-mesh',group.name+' mesh','glb',[0,0,0],[0,0,0],group.id),assetId});
  capture.boxes[part].forEach((entry,index)=>addCollider(project,group.id,entry,index,pivot,'original-'+part));
 }
 const {BoatModel}=await import(pathToFileURL(join(sourceRoot,'src/world/BoatModel.js')).href);
 const boat=new BoatModel(),boatPose=[64.5,0,36.5],boatGroup=object('original-lobster-boat','Moored lobster boat','group',boatPose);
 boatGroup.tags=['boat','moored','original-island'];project.objects.push(boatGroup);
 const boatBytes=hutGlb(boatBatches(boat),{name:'lobster-boat',x:0,floorY:0,z:0,yaw:0}),boatId='original-lobster-boat-glb';
 inventory.push({...addAsset(project,boatId,'Original lobster boat',boatBytes,'Trusted original BoatModel geometry capture; procedural shader details approximated in GLB'),part:'boat',colliders:boat.colliders.length});
 project.objects.push({...object('original-lobster-boat-mesh','Lobster boat mesh','glb',[0,0,0],[0,0,0],boatGroup.id),assetId:boatId});
 boat.colliders.forEach((entry,index)=>addCollider(project,boatGroup.id,{position:entry.center.toArray(),half:entry.half.toArray(),yaw:0,options:{tag:entry.tag||'boat',walkable:entry.walkable,solid:entry.solid}},index,[0,0,0],'original-boat'));
 check(project.objects.some(o=>o.id==='original-pier')&&project.objects.some(o=>o.id==='original-lobster-boat'),'Missing core objects.');
 const files=await packWorldRepository(project,{nativeIslandRead:readRoot(baseRoot),attribution:{authors:['ElseMesh contributors','DRG Software Solutions LLC'],license:'MIT; CC0 bark assets as credited in native resources',source:'Original first-island TerrainData, Village/Pier/Boardwalk and BoatModel geometry; independent authored repository'},provenance:{sourceLocation:'Trusted offline capture of original ElseMesh generators',sourceCommit:execFileSync('git',['-C',sourceRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceWorldId:loaded.identity.worldId,sourceDigest:loaded.identity.contentDigest}});
 await mkdir(outputRoot);for(const [path,bytes]of files){await mkdir(dirname(join(outputRoot,path)),{recursive:true});await writeFile(join(outputRoot,path),bytes,{flag:'wx'});}
 const reopened=await loadWorldSource({kind:'local',label:'Original Island',read:readRoot(outputRoot)}),descriptor=describeRuntimeWorld(reopened.project);
 check(reopened.identity.worldId===ORIGINAL_WORLD_ID&&reopened.project.nativeIsland.resources.length===project.nativeIsland.resources.length,'World identity or native resource closure changed.');
 const report={schema:'elsemesh.original-island-export/1',worldId:ORIGINAL_WORLD_ID,regionId:ORIGINAL_REGION_ID,sourceRoot,baseRoot,outputRoot,contentDigest:reopened.identity.contentDigest,objects:project.objects.length,assets:project.assets.length,collisionVolumes:descriptor.boxes.length,nativeResources:project.nativeIsland.resources.length,inventory,sourceVillageHash:capture.sourceHash,limitations:['The boat is an editable, collidable moored object. Driving and shared owner-authorised boat state are not yet installed in repository-world runtime.','The builder preserves native terrain and vegetation, but edits to its coarse terrain proxy do not rebake played native terrain.','Original procedural material shaders and animated pier sign/lanterns are approximated by static GLB vertex colours.']};
 await writeFile(join(outputRoot,'ORIGINAL-ISLAND.md'),'# Original Island\n\nIndependent ElseMesh world with the original first-island mountains, beaches, vegetation, pier, boardwalk, three beach huts and moored lobster boat.\n\nOpen this repository folder in ElseMesh Worlds or enter its public GitHub repository URL in the game and builder. Save repository snapshots to retain edits. The pier, boardwalk, huts and boat are separate object groups. Native terrain and vegetation resources are preserved on save, while the builder terrain grid is a coarse proxy.\n\nThe boat is currently a static, collidable scenery object. Driving requires a separate repository-world boat capability with owner permissions and shared authority. The café, shop, fish seller, cave and monorail are excluded.\n\nSource geometry and material attribution are recorded in world.json and ATTRIBUTION.md.\n',{flag:'wx'});
 await writeFile(join(outputRoot,'ATTRIBUTION.md'),'# Attribution\n\nOriginal ElseMesh TerrainData, Village, Pier, Boardwalk and BoatModel generator geometry. Copyright (c) 2026 DRG Software Solutions LLC and ElseMesh contributors. Engine source is not included. CC0 bark textures retain credits in the native resource closure. The GLB conversion preserves geometry and vertex colours but not the original procedural shader effects.\n',{flag:'wx'});
 await writeFile(join(evidenceRoot,'export-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)exportOriginalIsland({sourceRoot:process.argv[2],baseRoot:process.argv[3],outputRoot:process.argv[4],evidenceRoot:process.argv[5]}).catch(error=>{console.error(error);process.exitCode=1;});

