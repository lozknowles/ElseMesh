import {T} from './vendor/world-engine-contract.js';
import {NEON_SHIFT_LOTS,NEON_TOWER_BASE_Y} from './NeonShiftLots.js';
import {NEON_CITY_ASSETS} from './NeonCityAssets.js';

export function createNeonTowerBatches(){
 const material=new T.MeshStandardMaterial({color:'#aeb9bf',vertexColors:true,metalness:.32,roughness:.7,emissive:'#263844',emissiveIntensity:.3});
 return NEON_CITY_ASSETS.map((asset,variant)=>{
  const geometry=new T.BufferGeometry();for(const key of ['position','normal','color'])geometry.setAttribute(key,new T.Float32BufferAttribute(asset[key],3));geometry.setIndex(asset.index);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const lots=NEON_SHIFT_LOTS.map((_,i)=>i).filter(i=>i%NEON_CITY_ASSETS.length===variant),mesh=new T.InstancedMesh(geometry,material,lots.length);mesh.name=variant===0?'NeonShift_Towers':'NeonShift_Towers_'+variant;mesh.userData.neonLotIndices=lots;mesh.userData.assetSource=asset.name;mesh.userData.assetSourceSHA256=asset.sourceSHA256;return mesh;
 });
}

// All artwork is local, original canvas art. Geometry and texture pools are made
// once per candidate; a minute shift updates transforms, never allocates resources.
function canvasTexture(width,height,paint){
 const canvas=typeof document==='undefined'?{width,height,getContext:()=>null}:document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(ctx)paint(ctx,width,height);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
const SHOPS=[
 {name:'NIGHT SHIFT',sub:'RECORDS · TAPES · AFTER HOURS',color:'#f6ad82',icon:'record'},
 {name:'RAMEN 24',sub:'NOODLE BAR / OPEN ALL NIGHT',color:'#f4756e',icon:'bowl'},
 {name:'VESPER',sub:'HOTEL / ROOMS BY THE HOUR',color:'#b998e0',icon:'moon'},
 {name:'ATLAS',sub:'FREIGHT · CARGO · STORAGE',color:'#edcc81',icon:'crate'},
 {name:'RADIO REPAIR',sub:'ANALOGUE / SERVICE & PARTS',color:'#90d5c3',icon:'radio'},
 {name:'KINO 09',sub:'LATE PICTURES / EVERY NIGHT',color:'#e494b4',icon:'film'},
 {name:'ORBIT',sub:'COFFEE / TEA / TRANSMISSIONS',color:'#8ac6dc',icon:'orbit'},
 {name:'MOTH',sub:'NIGHT MARKET / SMALL WONDERS',color:'#d6d8a1',icon:'moth'}
];
export const NEON_SHOP_NAMES=Object.freeze(SHOPS.map(shop=>shop.name));
function paintShop(ctx,w,h,shop){
 ctx.fillStyle='#101c23';ctx.fillRect(0,0,w,h);ctx.strokeStyle=shop.color;ctx.lineWidth=5;ctx.strokeRect(10,10,w-20,h-20);ctx.strokeStyle='#46545b';ctx.lineWidth=2;ctx.strokeRect(20,20,w-40,h-40);
 ctx.save();ctx.translate(112,118);ctx.strokeStyle=shop.color;ctx.fillStyle=shop.color;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
 const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();},circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();};
 if(shop.icon==='record'){circle(0,0,63);circle(0,0,44);circle(0,0,21);circle(0,0,5);line(40,-54,70,-77);}
 if(shop.icon==='bowl'){ctx.beginPath();ctx.arc(0,0,63,0,Math.PI);ctx.closePath();ctx.stroke();line(-70,-8,70,-8);line(-22,68,22,68);for(const x of [-28,0,28]){ctx.beginPath();ctx.moveTo(x,-25);ctx.bezierCurveTo(x+25,-43,x-20,-53,x,-77);ctx.stroke();}}
 if(shop.icon==='moon'){circle(0,0,61);ctx.fillStyle='#101c23';ctx.beginPath();ctx.arc(26,-22,53,0,Math.PI*2);ctx.fill();line(25,53,38,75);line(36,63,12,66);circle(-69,-53,4);}
 if(shop.icon==='crate'){ctx.strokeRect(-55,-57,110,110);line(-55,-57,55,53);line(55,-57,-55,53);line(-75,-57,-75,53);line(-75,53,-55,53);}
 if(shop.icon==='radio'){ctx.strokeRect(-65,-30,130,90);circle(-27,13,26);circle(35,28,8);line(-45,-48,45,-48);line(0,-48,39,-77);for(let i=0;i<4;i++)line(16,-12+i*8,48,-12+i*8);}
 if(shop.icon==='film'){ctx.strokeRect(-66,-55,132,110);for(let i=0;i<4;i++){ctx.strokeRect(-59+i*32,-48,14,12);ctx.strokeRect(-59+i*32,36,14,12);}ctx.beginPath();ctx.moveTo(-13,-20);ctx.lineTo(28,0);ctx.lineTo(-13,22);ctx.closePath();ctx.stroke();}
 if(shop.icon==='orbit'){circle(0,0,40);ctx.save();ctx.rotate(-.5);ctx.beginPath();ctx.ellipse(0,0,78,21,0,0,Math.PI*2);ctx.stroke();ctx.restore();circle(61,-39,7);}
 if(shop.icon==='moth'){for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,35);ctx.bezierCurveTo(side*85,-65,side*63,-74,0,-20);ctx.bezierCurveTo(side*65,8,side*68,75,0,35);ctx.stroke();}line(0,-27,0,52);line(0,-27,-16,-50);line(0,-27,16,-50);}
 ctx.restore();ctx.textAlign='left';ctx.textBaseline='middle';ctx.shadowColor=shop.color;ctx.shadowBlur=6;ctx.fillStyle=shop.color;ctx.font='900 76px "Arial Narrow", Arial, sans-serif';ctx.fillText(shop.name,222,103,765);ctx.shadowBlur=0;ctx.fillStyle='#c3cec9';ctx.font='bold 24px Arial, sans-serif';ctx.fillText(shop.sub,226,167,750);
}
/** Independent supply circuits: isolated brief brownouts with smooth recovery. */
export function neonSignBrightness(time,circuit){
 const cycle=9.7+circuit*.619,epoch=Math.floor(time/cycle),phase=((time%cycle)+cycle)%cycle;
 const n=Math.sin((epoch+1)*127.1+circuit*311.7)*43758.5453,random=n-Math.floor(n),start=.5+random*(cycle-1.4),elapsed=phase-start;
 const smooth=x=>x*x*(3-2*x),dip=elapsed<0||elapsed>.48?0:elapsed<.09?smooth(elapsed/.09):1-smooth((elapsed-.09)/.39);
 return .945+.025*Math.sin(time*.48+circuit*2.3999632297)-(.23+random*.08)*dip;
}
export function installNeonArchitecture(root,box){
 const structure=new T.MeshStandardMaterial({color:'#657377',metalness:.65,roughness:.6}),concrete=new T.MeshStandardMaterial({color:'#3d494e',roughness:.9,metalness:.12}),glass=new T.MeshStandardMaterial({color:'#182c35',emissive:'#174553',emissiveIntensity:.35,metalness:.7,roughness:.25});
 const count=NEON_SHIFT_LOTS.length,beams=new T.InstancedMesh(box,structure,count*24),doors=new T.InstancedMesh(box,glass,count*4),awnings=new T.InstancedMesh(box,concrete,count*4),setbacks=new T.InstancedMesh(box,concrete,count*3),plant=new T.InstancedMesh(box,structure,count*5);
 const meshes=[beams,doors,awnings,setbacks,plant];for(const mesh of meshes){mesh.frustumCulled=false;root.add(mesh);}beams.name='NeonShift_FoundationFrames';doors.name='NeonShift_StorefrontDoors';awnings.name='NeonShift_Canopies';setbacks.name='NeonShift_Setbacks';plant.name='NeonShift_RoofPlant';
 const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),up=new T.Vector3(0,1,0);
 function place(mesh,index,x,y,z,w,h,d,angle=0){p.set(x,y,z);s.set(w,h,d);q.setFromAxisAngle(up,angle);matrix.compose(p,q,s);mesh.setMatrixAt(index,matrix);}
 const signs=SHOPS.map((shop,index)=>{const map=canvasTexture(1024,256,(ctx,w,h)=>paintShop(ctx,w,h,shop)),material=new T.MeshBasicMaterial({map,toneMapped:false}),mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),material,count/2);mesh.name='NeonShift_IllustratedSign_'+shop.name;mesh.frustumCulled=false;root.add(mesh);return{mesh,material,circuit:index,count:0,text:shop.name};});
 for(const [i,lot]of NEON_SHIFT_LOTS.entries()){
  for(let side=0;side<4;side++){
   const angle=side*Math.PI/2,nx=Math.sin(angle),nz=Math.cos(angle),tx=Math.cos(angle),tz=-Math.sin(angle),x=lot.x+nx*4.975,z=lot.z+nz*4.975;
   place(doors,i*4+side,x+tx*2.9,1.21,z+tz*2.9,1.08,2.32,.025,angle);
   place(awnings,i*4+side,x-nx*.20,2.93,z-nz*.20,9.8,.11,.43,angle);
   for(let k=0;k<4;k++)place(beams,i*24+side*6+k,x+tx*(k*2.6-3.9),1.5,z+tz*(k*2.6-3.9),.11,3,.04,angle);
   place(beams,i*24+side*6+4,x,.12,z,9.9,.24,.04,angle);place(beams,i*24+side*6+5,x,2.58,z,9.9,.12,.04,angle);
   const sign=signs[(i+side*3)%signs.length];place(sign.mesh,sign.count++,x+nx*.024-tx*.8,2.11,z+nz*.024-tz*.8,5.9,1.475,1,angle);
  }
 }
 for(const sign of signs){sign.mesh.count=sign.count;sign.mesh.instanceMatrix.needsUpdate=true;}
 for(const mesh of [beams,doors,awnings])mesh.instanceMatrix.needsUpdate=true;
 return{
  update(towers,time){
   if(towers)for(const [i,b]of towers.entries()){
    // Secondary masses taper inward so every moving vertex remains in its lot.
    for(let j=0;j<3;j++)place(setbacks,i*3+j,b.x,NEON_TOWER_BASE_Y+b.height*(.3+j*.26),b.z,b.width*(.99-j*.16),.3,b.depth*(.99-j*.16));
    for(let j=0;j<5;j++){const x=b.x+(j%2?1:-1)*b.width*.20,z=b.z+(j%3-1)*b.depth*.20;place(plant,i*5+j,x,NEON_TOWER_BASE_Y+b.height+(.22+j*.12)/2,z,b.width*.17,.22+j*.12,b.depth*.16);}
   }
   if(towers){setbacks.instanceMatrix.needsUpdate=true;plant.instanceMatrix.needsUpdate=true;}
   for(const sign of signs)sign.material.color.setScalar(neonSignBrightness(time,sign.circuit));
  },
  diagnostics:()=>({illustratedSigns:signs.reduce((n,s)=>n+s.count,0),signDesigns:signs.length,signArt:'original locally drawn pictograms and typography',flicker:'independent slow circuits, bounded brief brownouts with smooth recovery',movingDetails:'in-lot roof plant and setbacks',towerAssetVariants:NEON_CITY_ASSETS.length,towerAssetSource:'Kenney City Kit Commercial 2.1 / CC0'})
 };
}
