import {applyNeonAtmosphere} from './NeonAtmosphere.js';
import {NEON_SHIFT_LOTS,NEON_FOUNDATION_HEIGHT,NEON_STREET_LIMIT,NEON_TOWER_BASE_Y,assertNeonShiftFoundations} from './NeonShiftLots.js';
import {createNeonStreetBoundary,installNeonStreetClearance} from './NeonStreetBoundary.js';
import {T} from './vendor/world-engine-contract.js';
import {SHIFT_WORLD_ID,SHIFT_CONTENT_DIGEST} from './ShiftingWorldProfile.js';
import {createNeonTowerBatches,installNeonArchitecture} from './NeonShiftArchitecture.js';
import {installNeonStreetSurface} from './NeonStreetSurface.js';
import {SHIFT_TOWER_COUNT,neonShiftFrame,neonShiftLayout} from './NeonShiftLayout.js';

/** Engine-owned procedural presentation and attributed open asset derivatives. World data never supplies executable code.
 * Fixed closed ground floors define explorable streets; towers morph only inside their lots. */
export function installNeonShiftWorld(candidate,loaded){
 if(loaded?.identity?.worldId!==SHIFT_WORLD_ID)return null;
 if(loaded.identity.contentDigest!==SHIFT_CONTENT_DIGEST)throw Error('Neon Shift content pin mismatch');
 const project=candidate.project??candidate.descriptor?.project;assertNeonShiftFoundations(project);
 candidate.terrain=createNeonStreetBoundary(candidate.terrain);installNeonStreetClearance(candidate.colliders);
 // Replace only the verified source foundation visuals. Preserve colliders and
 // resources shared with surviving nodes; retire old LOD variants before preparation.
 const ids=new Set(NEON_SHIFT_LOTS.map(lot=>lot.id)),oldNodes=[];candidate.root.traverse(n=>{if(ids.has(n.userData.editorObjectId))oldNodes.push(n);});
 if(oldNodes.length!==NEON_SHIFT_LOTS.length)throw Error('Neon source foundation visuals differ from fixed lots');
 const retiredGeometries=new Set(),retiredMaterials=new Set();for(const node of oldNodes){node.removeFromParent();node.traverse(n=>{n.userData.disposePresentationLOD?.();if(n.geometry)retiredGeometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)retiredMaterials.add(m);});}
 candidate.root.traverse(n=>{retiredGeometries.delete(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])retiredMaterials.delete(m);});for(const g of retiredGeometries)g.dispose();for(const m of retiredMaterials)m.dispose();
 // The authored ten-metre collision boundary is a transparent forcefield here.
 // Its fixed colliders remain untouched, including during a jump or a shift.
 candidate.root.traverse(node=>{if(!node.userData.editorObjectId?.startsWith('neon-boundary-'))return;node.traverse(part=>{if(part.material){part.material.transparent=true;part.material.opacity=.09;part.material.depthWrite=false;part.material.emissive?.set('#18dfff');}});});
 const root=new T.Group();root.name='NeonShift_ProceduralCity';candidate.root.add(root);
 // Three releases per-instance GPU buffers on the mesh's dispose event,
 // independently of the later shared geometry/material cleanup. Register the
 // owner before building the batches so a partial installation is covered too.
 candidate.disposeNeonInstances=()=>root.traverse(node=>{if(node.isInstancedMesh)node.dispose();});
 const box=new T.BoxGeometry(1,1,1),glowMaterial=new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),floorMaterial=new T.MeshStandardMaterial({color:'#030714',metalness:.75,roughness:.24});
 const towerBatches=createNeonTowerBatches(),grid=new T.InstancedMesh(box,glowMaterial,194),traffic=new T.InstancedMesh(box,glowMaterial,24),rain=new T.InstancedMesh(box,new T.MeshBasicMaterial({color:'#5ccaff',transparent:true,opacity:.32,depthWrite:false,toneMapped:false}),160);
 // Original authored geometry supplies the facade structure; retire the old cage.
 const foundations=new T.InstancedMesh(box,new T.MeshStandardMaterial({color:'#61727b',emissive:'#2c414d',emissiveIntensity:.25,metalness:.25,roughness:.7}),NEON_SHIFT_LOTS.length),streetWindows=new T.InstancedMesh(box,new T.MeshStandardMaterial({color:'#9fb9bf',emissive:'#a9e7ed',emissiveIntensity:.7,roughness:.32,metalness:.35}),NEON_SHIFT_LOTS.length*4);foundations.name='NeonShift_Foundations';streetWindows.name='NeonShift_StreetWindows';foundations.userData.editorObjectIds=NEON_SHIFT_LOTS.map(lot=>lot.id);streetWindows.userData.editorObjectIds=NEON_SHIFT_LOTS.flatMap(lot=>Array(4).fill(lot.id));
 for(const mesh of [...towerBatches,grid,traffic,rain,foundations,streetWindows]){mesh.frustumCulled=false;root.add(mesh);}
 const floor=new T.Mesh(new T.PlaneGeometry(NEON_STREET_LIMIT*2,NEON_STREET_LIMIT*2),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=.012;root.add(floor);installNeonStreetSurface(floor,grid);
 const architecture=installNeonArchitecture(root,box);
 const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion(),color=new T.Color();
 const set=(mesh,index,x,y,z,w,h,d,c)=>{position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,rotation,scale);mesh.setMatrixAt(index,matrix);if(c)mesh.setColorAt(index,color.set(c));};
 for(let i=0;i<97;i++){set(grid,i,i*2-96,.027,0,.025,.018,192,'#23eaff');set(grid,i+97,0,.027,i*2-96,192,.018,.025,'#23eaff');}
 for(const [i,lot]of NEON_SHIFT_LOTS.entries()){
  set(foundations,i,lot.x,NEON_FOUNDATION_HEIGHT/2,lot.z,lot.half*2-.1,NEON_FOUNDATION_HEIGHT,lot.half*2-.1);
  for(const side of [-1,1]){const j=side===-1?0:1;set(streetWindows,i*4+j,lot.x,1.7,lot.z+side*(lot.half-.025),8,1.15,.035,'#bd8f66');set(streetWindows,i*4+j+2,lot.x+side*(lot.half-.025),1.7,lot.z,.035,1.15,8,'#6d9baf');}
 }
 for(const mesh of [foundations,streetWindows]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 function sign(width,height,x,y,z,back=false){const canvas=typeof document==='undefined'?{width:1024,height:256,getContext:()=>null}:document.createElement('canvas');canvas.width=1024;canvas.height=256;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,toneMapped:false});const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.position.set(x,y,z);if(back)mesh.rotation.y=Math.PI;root.add(mesh);return{canvas,texture,mesh,context:canvas.getContext('2d')};}
 const board=sign(19,4.75,0,8,-23.6),returnSign=sign(8,2,0,5,18,true);
 const returnContext=returnSign.context;if(returnContext){returnContext.fillStyle='#06111f';returnContext.fillRect(0,0,1024,256);returnContext.textAlign='center';returnContext.fillStyle='#9affec';returnContext.font='bold 72px monospace';returnContext.fillText('WAREHOUSE',512,110);returnContext.font='38px monospace';returnContext.fillText('PERMANENT RETURN GATE',512,187);returnSign.texture.needsUpdate=true;}
 const oldUpdate=candidate.root.userData.updateWebGL;let current=null,previous=null,lastGeneration=-1,lastSecond=-1,lastBlend=-1;
 const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
 function update(time){
  const state=neonShiftFrame();if(state.generation!==lastGeneration){current=neonShiftLayout(state.generation);previous=neonShiftLayout(Math.max(0,state.generation-1));lastGeneration=state.generation;lastBlend=-1;}
  const t=smooth(state.blend),p=current.palette,colors=[p.accent,p.second,p.third],morphed=t!==lastBlend?[]:null;
  if(morphed)for(let i=0;i<SHIFT_TOWER_COUNT;i++){const a=previous.towers[i],b=current.towers[i];morphed.push({...b,x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),width:lerp(a.width,b.width,t),depth:lerp(a.depth,b.depth,t),height:lerp(a.height,b.height,t)});}
  architecture.update(morphed,time);
  if(t!==lastBlend){
   let edge=0,window=0;
   for(let i=0;i<SHIFT_TOWER_COUNT;i++){
    const a=previous.towers[i],b=current.towers[i],x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t),w=lerp(a.width,b.width,t),d=lerp(a.depth,b.depth,t),h=lerp(a.height,b.height,t),c=colors[b.color];
    const batch=towerBatches[i%towerBatches.length];set(batch,Math.floor(i/towerBatches.length),x,NEON_TOWER_BASE_Y+h/2,z,w,h,d);
   }
   // Road markings retain their muted material palette through theme shifts.
   for(const mesh of [...towerBatches,grid]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
   lastBlend=t;
  }
  const seconds=Math.floor(state.timestamp/1000);if(seconds!==lastSecond){lastSecond=seconds;const ctx=board.context;if(ctx){ctx.clearRect(0,0,1024,256);ctx.fillStyle='#040c1fea';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle=p.accent;ctx.font='bold 74px monospace';ctx.fillText('NEON SHIFT',512,88);ctx.font='35px monospace';ctx.fillStyle=p.second;ctx.fillText(p.name+' // SECTOR '+(state.generation%10000).toString().padStart(4,'0'),512,150);ctx.fillStyle='#d5fbff';ctx.font='30px monospace';ctx.fillText('REALITY SHIFTS IN '+String(Math.floor(state.remaining/60)).padStart(2,'0')+':'+String(state.remaining%60).padStart(2,'0'),512,211);board.texture.needsUpdate=true;}}
  for(let i=0;i<24;i++){const angle=time*(.035+i%4*.007)+i*2.399,radius=38+i%5*8;set(traffic,i,Math.cos(angle)*radius,14+i%6*5,Math.sin(angle)*radius,2.6,.22,.5,colors[i%3]);}
  for(let i=0;i<160;i++){const angle=i*2.399,radius=29+i%13*6;set(rain,i,Math.cos(angle)*radius,2+((i*7.31-time*(8+i%4))%70+70)%70,Math.sin(angle)*radius,.025,.9+i%3*.4,.025);}
  for(const mesh of [traffic,rain]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  root.userData.shiftState={generation:state.generation,theme:p.name,remaining:state.remaining,blend:t,towers:SHIFT_TOWER_COUNT,streetLimit:NEON_STREET_LIMIT,fixedLots:NEON_SHIFT_LOTS.length,towerBaseY:NEON_TOWER_BASE_Y};
 }
 candidate.root.userData.updateWebGL=time=>{oldUpdate?.(time);update(time);};
 candidate.shiftingWorld={root,update,configureScene(scene){applyNeonAtmosphere(scene,project.environment?.timeOfDay??21);},diagnostics:()=>{const geometries=new Set(),materials=new Set(),textures=new Set();let instances=0,triangles=0;root.traverse(n=>{if(n.geometry){geometries.add(n.geometry);const count=n.isInstancedMesh?n.count:1;triangles+=(n.geometry.index?.count??n.geometry.attributes.position?.count??0)/3*count;if(n.isInstancedMesh)instances+=n.count;}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});return{...root.userData.shiftState,...architecture.diagnostics(),geometries:geometries.size,materials:materials.size,textures:textures.size,instances,triangles};}};
 update(0);root.updateMatrixWorld(true);return candidate.shiftingWorld;
}
