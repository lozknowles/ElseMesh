import {T} from './vendor/world-engine-contract.js';
import {SHIFT_WORLD_ID,SHIFT_CONTENT_DIGEST} from './ShiftingWorldProfile.js';
import {SHIFT_TOWER_COUNT,neonShiftFrame,neonShiftLayout} from './NeonShiftLayout.js';

/** Original engine-owned procedural art. World data never supplies executable code.
 * Every changing solid stays outside the inaccessible perimeter; collision is fixed. */
export function installNeonShiftWorld(candidate,loaded){
 if(loaded?.identity?.worldId!==SHIFT_WORLD_ID)return null;
 if(loaded.identity.contentDigest!==SHIFT_CONTENT_DIGEST)throw Error('Neon Shift content pin mismatch');
 // The authored ten-metre collision boundary is a transparent forcefield here.
 // Its fixed colliders remain untouched, including during a jump or a shift.
 candidate.root.traverse(node=>{if(!node.userData.editorObjectId?.startsWith('neon-boundary-'))return;node.traverse(part=>{if(part.material){part.material.transparent=true;part.material.opacity=.09;part.material.depthWrite=false;part.material.emissive?.set('#18dfff');}});});
 const root=new T.Group();root.name='NeonShift_ProceduralCity';candidate.root.add(root);
 const box=new T.BoxGeometry(1,1,1),bodyMaterial=new T.MeshStandardMaterial({color:'#111a28',metalness:.75,roughness:.3}),glowMaterial=new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),floorMaterial=new T.MeshStandardMaterial({color:'#030714',metalness:.75,roughness:.24});
 const bodies=new T.InstancedMesh(box,bodyMaterial,SHIFT_TOWER_COUNT),edges=new T.InstancedMesh(box,glowMaterial,SHIFT_TOWER_COUNT*12),windows=new T.InstancedMesh(box,glowMaterial,SHIFT_TOWER_COUNT*8),grid=new T.InstancedMesh(box,glowMaterial,50),traffic=new T.InstancedMesh(box,glowMaterial,24),rain=new T.InstancedMesh(box,new T.MeshBasicMaterial({color:'#5ccaff',transparent:true,opacity:.32,depthWrite:false,toneMapped:false}),160);
 for(const mesh of [bodies,edges,windows,grid,traffic,rain]){mesh.frustumCulled=false;root.add(mesh);}
 const floor=new T.Mesh(new T.PlaneGeometry(220,220),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=.012;root.add(floor);
 const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion(),color=new T.Color();
 const set=(mesh,index,x,y,z,w,h,d,c)=>{position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,rotation,scale);mesh.setMatrixAt(index,matrix);if(c)mesh.setColorAt(index,color.set(c));};
 for(let i=0;i<25;i++){set(grid,i,i*2-24,.027,0,.025,.018,48,'#23eaff');set(grid,i+25,0,.027,i*2-24,48,.018,.025,'#23eaff');}
 const ringGeometry=new T.TorusGeometry(1,.025,5,64),rings=[];
 for(let i=0;i<6;i++){const ring=new T.Mesh(ringGeometry,glowMaterial);ring.position.set((i%2?1:-1)*(36+Math.floor(i/2)*18),22+i*4,-34);ring.scale.setScalar(5+i*1.4);root.add(ring);rings.push(ring);}
 const polyGeometry=new T.IcosahedronGeometry(1,0),polyMaterial=new T.MeshBasicMaterial({color:'#60ffff',wireframe:true,toneMapped:false}),relics=[];
 for(let i=0;i<8;i++){const mesh=new T.Mesh(polyGeometry,polyMaterial);mesh.position.set((i%2?1:-1)*12,9+i%3,(Math.floor(i/2)-1.5)*9);mesh.scale.setScalar(1.6);root.add(mesh);relics.push(mesh);}
 function sign(width,height,x,y,z,back=false){const canvas=typeof document==='undefined'?{width:1024,height:256,getContext:()=>null}:document.createElement('canvas');canvas.width=1024;canvas.height=256;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,toneMapped:false});const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.position.set(x,y,z);if(back)mesh.rotation.y=Math.PI;root.add(mesh);return{canvas,texture,mesh,context:canvas.getContext('2d')};}
 const board=sign(19,4.75,0,8,-23.6),returnSign=sign(8,2,0,5,18,true);
 const returnContext=returnSign.context;if(returnContext){returnContext.fillStyle='#06111f';returnContext.fillRect(0,0,1024,256);returnContext.textAlign='center';returnContext.fillStyle='#9affec';returnContext.font='bold 72px monospace';returnContext.fillText('WAREHOUSE',512,110);returnContext.font='38px monospace';returnContext.fillText('PERMANENT RETURN GATE',512,187);returnSign.texture.needsUpdate=true;}
 const oldUpdate=candidate.root.userData.updateWebGL;let current=null,previous=null,lastGeneration=-1,lastSecond=-1,lastBlend=-1;
 const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
 function update(time){
  const state=neonShiftFrame();if(state.generation!==lastGeneration){current=neonShiftLayout(state.generation);previous=neonShiftLayout(Math.max(0,state.generation-1));lastGeneration=state.generation;lastBlend=-1;}
  const t=smooth(state.blend),p=current.palette,colors=[p.accent,p.second,p.third];
  if(t!==lastBlend){
   bodyMaterial.color.set(p.body);let edge=0,window=0;
   for(let i=0;i<SHIFT_TOWER_COUNT;i++){
    const a=previous.towers[i],b=current.towers[i],x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t),w=lerp(a.width,b.width,t),d=lerp(a.depth,b.depth,t),h=lerp(a.height,b.height,t),c=colors[b.color];
    set(bodies,i,x,h/2,z,w,h,d);
    for(const dx of [-1,1])for(const dz of [-1,1])set(edges,edge++,x+dx*w/2,h/2,z+dz*d/2,.065,h,.065,c);
    for(const y of [.1,h]){for(const dz of [-1,1])set(edges,edge++,x,y,z+dz*d/2,w,.065,.065,c);for(const dx of [-1,1])set(edges,edge++,x+dx*w/2,y,z,.065,.065,d,c);}
    for(let j=0;j<8;j++){const y=(j+1)*h/9;set(windows,window++,x,y,z+d/2+.025,w*.74,.10,.035,colors[(b.color+j)%3]);}
   }
   for(let i=0;i<50;i++)grid.setColorAt(i,color.set(i%5===0?p.second:p.accent));
   for(const mesh of [bodies,edges,windows,grid]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
   lastBlend=t;
  }
  const seconds=Math.floor(state.timestamp/1000);if(seconds!==lastSecond){lastSecond=seconds;const ctx=board.context;if(ctx){ctx.clearRect(0,0,1024,256);ctx.fillStyle='#040c1fea';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle=p.accent;ctx.font='bold 74px monospace';ctx.fillText('NEON SHIFT',512,88);ctx.font='35px monospace';ctx.fillStyle=p.second;ctx.fillText(p.name+' // SECTOR '+(state.generation%10000).toString().padStart(4,'0'),512,150);ctx.fillStyle='#d5fbff';ctx.font='30px monospace';ctx.fillText('REALITY SHIFTS IN '+String(Math.floor(state.remaining/60)).padStart(2,'0')+':'+String(state.remaining%60).padStart(2,'0'),512,211);board.texture.needsUpdate=true;}}
  for(let i=0;i<24;i++){const angle=time*(.035+i%4*.007)+i*2.399,radius=38+i%5*8;set(traffic,i,Math.cos(angle)*radius,14+i%6*5,Math.sin(angle)*radius,2.6,.22,.5,colors[i%3]);}
  for(let i=0;i<160;i++){const angle=i*2.399,radius=29+i%13*6;set(rain,i,Math.cos(angle)*radius,2+((i*7.31-time*(8+i%4))%70+70)%70,Math.sin(angle)*radius,.025,.9+i%3*.4,.025);}
  for(const mesh of [traffic,rain]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  rings.forEach((ring,i)=>{ring.rotation.z=time*.08*(i%2?1:-1);ring.rotation.y=Math.sin(time*.12+i)*.4;});
  polyMaterial.color.set(p.second);relics.forEach((mesh,i)=>{mesh.rotation.set(time*.2+i,time*.13,i*.4);mesh.position.y=9+i%3+Math.sin(time*.7+i)*.4;});
  root.userData.shiftState={generation:state.generation,theme:p.name,remaining:state.remaining,blend:t,towers:SHIFT_TOWER_COUNT,protectedPlaza:24};
 }
 candidate.root.userData.updateWebGL=time=>{oldUpdate?.(time);update(time);};
 candidate.shiftingWorld={root,update,configureScene(scene){scene.background=new T.Color('#030817');scene.fog=new T.FogExp2('#030817',.006);const lights=scene.userData.repositoryLights;if(lights){lights.sky.intensity=.75;lights.sun.intensity=.8;}},diagnostics:()=>{const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of n.material?[n.material]:[]){materials.add(m);if(m.map)textures.add(m.map);}});return{...root.userData.shiftState,geometries:geometries.size,materials:materials.size,textures:textures.size,instances:80+960+640+50+24+160};}};
 update(0);root.updateMatrixWorld(true);return candidate.shiftingWorld;
}
