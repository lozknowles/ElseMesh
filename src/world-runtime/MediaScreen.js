import {SkinBounds} from '../engine/render/SkinBounds.js';
// Renderer-owned identity registration: mesh names/userData cannot grant exclusion.
const rendererMediaSkies=new WeakMap();
export function registerRendererMediaSky(owner,mesh,containsSightCone){
 if(!owner||owner.mesh!==mesh||typeof containsSightCone!=='function'||rendererMediaSkies.has(owner))throw Error('Invalid renderer sky proof registration');
 const proof={mesh,containsSightCone};rendererMediaSkies.set(owner,proof);
 return ()=>{if(rendererMediaSkies.get(owner)===proof)rendererMediaSkies.delete(owner);};
}
function rendererSkyExcluded(native,node,camera,projection,stats,reasons){
 const owner=native?.sky,proof=rendererMediaSkies.get(owner);if(!proof||proof.mesh!==node||owner.mesh!==node)return false;
 const e=node.matrixWorld?.elements,determinant=e&&e.length===16&&e.every(Number.isFinite)?e[0]*(e[5]*e[10]-e[9]*e[6])-e[4]*(e[1]*e[10]-e[9]*e[2])+e[8]*(e[1]*e[6]-e[5]*e[2]):NaN;
 if(!Number.isFinite(determinant)||determinant===0||e[3]!==0||e[7]!==0||e[11]!==0||e[15]!==1){reasons.push('Renderer sky has an invalid or singular world transform');return false;}
 try{if(proof.containsSightCone(camera,projection.world)!==true)return false;}catch{return false;}
 stats.skyInteriorExclusions++;return true;
}

const ID=/^[A-Za-z0-9_-]{11}$/;
export function mediaLayout(config){
 if(!config||config.schema!=='elsemesh.media-screen/1'||config.provider!=='youtube'||typeof config.videoId!=='string'||!ID.test(config.videoId??'')||!Number.isFinite(config.width)||config.width<.5||config.width>12||Object.keys(config).some(k=>!['schema','provider','videoId','width'].includes(k)))throw Error('Invalid media screen configuration');
 const width=config.width,height=width*9/16;return {width,height,bezel:.09,depth:.2,frontZ:.119};
}
/** Installed geometry works with either the native engine API or the WebGL Three API. */
export function buildMediaScreenHousing(config,{api,material}){
 const s=mediaLayout(config),root=new api.Group(),parts=[['TV housing',s.width+.18,s.height+.18,.2,0,0,0,'#11151b'],['TV screen',s.width,s.height,.012,0,0,.112,'#05090d'],['TV wall mount',s.width*.26,s.height*.35,.12,0,0,-.15,'#252a30']];
 for(const [name,w,h,d,x,y,z,color]of parts){const mesh=new api.Mesh(new api.BoxGeometry(w,h,d),material({color,roughness:.45,metalness:.25}));mesh.name=name;mesh.position.set(x,y,z);root.add(mesh);}root.userData.mediaScreenHousing=true;return root;
}
const transform=(m,p)=>{const e=m.elements??m,[x,y,z]=p,w=e[3]*x+e[7]*y+e[11]*z+e[15];return [(e[0]*x+e[4]*y+e[8]*z+e[12])/w,(e[1]*x+e[5]*y+e[9]*z+e[13])/w,(e[2]*x+e[6]*y+e[10]*z+e[14])/w];};
function project(camera,p,v){
 const view=transform(camera.matrixWorldInverse,p),e=camera.projectionMatrix.elements??camera.projectionMatrix,[x,y,z]=view,w=e[3]*x+e[7]*y+e[11]*z+e[15];
 if(!Number.isFinite(w)||w<=0||-z<(camera.near??.1))return null;
 const px=(e[0]*x+e[4]*y+e[8]*z+e[12])/w,py=(e[1]*x+e[5]*y+e[9]*z+e[13])/w,pz=(e[2]*x+e[6]*y+e[10]*z+e[14])/w;
 if(![px,py,pz,-z].every(Number.isFinite)||pz>1||pz< -1)return null;return {x:v.left+(px+1)*v.width/2,y:v.top+(1-py)*v.height/2,depth:-z,w};
}
const polygonArea=points=>Math.abs(points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0))/2;
function validViewport(v){return v&&[v.left,v.top,v.width,v.height].every(Number.isFinite)&&v.width>2&&v.height>2;}
/** Clip only the DOM exposure. Original world corners remain the occlusion proof.
 * Interpolate u/w,v/w,1/w in projected space, then divide: the inverse projective
 * mapping places the clip polygon in the iframe's untransformed coordinates.
 */
function clipScreenQuad(quad,viewport){
 if(!validViewport(viewport)||quad.length!==4||quad.some(p=>!p||![p.x,p.y,p.w].every(Number.isFinite)||p.w<=0))return null;
 const uv=[[0,0],[1,0],[1,1],[0,1]],planes=[['x',viewport.left+1,1],['x',viewport.left+viewport.width-1,-1],['y',viewport.top+1,1],['y',viewport.top+viewport.height-1,-1]];
 let points=quad.map((p,i)=>({x:p.x,y:p.y,u:uv[i][0]/p.w,v:uv[i][1]/p.w,q:1/p.w}));
 const partial=points.some(p=>planes.some(([axis,edge,sign])=>sign*(p[axis]-edge)<0));
 for(const [axis,edge,sign]of planes){
  const input=points;points=[];
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],insideA=sign*(a[axis]-edge)>=0,insideB=sign*(b[axis]-edge)>=0;
   if(insideA)points.push(a);
   if(insideA!==insideB){const t=(edge-a[axis])/(b[axis]-a[axis]),p={};for(const key of ['x','y','u','v','q'])p[key]=a[key]+t*(b[key]-a[key]);points.push(p);}
  }
  if(points.length<3)return null;
 }
 if(points.some(p=>!Object.values(p).every(Number.isFinite)||p.q<=0))return null;
 const area=polygonArea(points);if(!Number.isFinite(area)||area<=1e-7)return null;
 const polygon=points.map(p=>({x:p.x,y:p.y,u:p.u/p.q,v:p.v/p.q}));
 if(polygon.some(p=>!Object.values(p).every(Number.isFinite)||p.u< -1e-7||p.u>1+1e-7||p.v< -1e-7||p.v>1+1e-7))return null;
 const percent=n=>Math.min(1,Math.max(0,n))*100;
 return {area,polygon,partial,clipPath:partial?'polygon('+polygon.map(p=>percent(p.u)+'% '+percent(p.v)+'%').join(',')+')':null};
}
export function projectMediaScreen(camera,worldMatrix,config,viewport){
 if(!validViewport(viewport))return null;
 const s=mediaLayout(config);camera.updateMatrixWorld?.();if(camera.matrixWorldInverse?.copy&&camera.matrixWorld)camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
 const world=[[-s.width/2,s.height/2,s.frontZ],[s.width/2,s.height/2,s.frontZ],[s.width/2,-s.height/2,s.frontZ],[-s.width/2,-s.height/2,s.frontZ]].map(p=>transform(worldMatrix,p));
 const a=world[0],b=world[1],d=world[3],u=b.map((n,i)=>n-a[i]),v=d.map((n,i)=>n-a[i]),normal=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]],position=camera.position.toArray?.()??[camera.position.x,camera.position.y,camera.position.z];
 if(normal.reduce((n,c,i)=>n+c*(position[i]-a[i]),0)<=0)return null;
 const quad=world.map(p=>project(camera,p,viewport)),clipped=clipScreenQuad(quad,viewport);
 if(!clipped||clipped.area<64||!screenQuadTransform(quad))return null;
 return {quad,world,viewport,depth:Math.max(...quad.map(p=>p.depth)),clipPath:clipped.clipPath,viewportPartial:clipped.partial,visiblePolygon:clipped.polygon,visibleArea:clipped.area};
}
/** CSS homography maps the iframe rectangle to the real perspective-projected screen quad. */
export function screenQuadTransform(quad,width=1280,height=720){
 if(!Array.isArray(quad)||quad.length!==4||quad.some(p=>!p||![p.x,p.y].every(Number.isFinite))||![width,height].every(n=>Number.isFinite(n)&&n>0)||polygonArea(quad)<1e-7)return null;
 const [p0,p1,p2,p3]=quad,dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x,dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y,den=dx1*dy2-dx2*dy1;
 let g=0,h=0;if(Math.abs(dx3)+Math.abs(dy3)>1e-7){if(Math.abs(den)<1e-9)return null;g=(dx3*dy2-dx2*dy3)/den;h=(dx1*dy3-dx3*dy1)/den;}
 const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+h*p3.x,d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+h*p3.y;
 const values=[a/width,d/width,0,g/width,b/height,e/height,0,h/height,0,0,1,0,p0.x,p0.y,0,1];
 return values.every(Number.isFinite)?'matrix3d('+values.join(',')+')':null;
}
const sightSubtract=(a,b)=>a.map((n,i)=>n-b[i]);
const sightCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sightDot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
/** Convex truncated sight volume versus complete finite world AABBs. Touching blocks. */
export function mediaScreenUnobstructed(projection,camera,bounds,{complete=false,onBlocked}={}){
 const deny=(reason,boundIndex)=>{onBlocked?.({reason,boundIndex});return false;};
 if(!complete||!projection||!Array.isArray(bounds))return deny('Incomplete visibility proof');
 const far=projection.world,near=camera?.near??.1;
 if(!Array.isArray(far)||far.length!==4||!far.every(finitePoint)||!Number.isFinite(near)||near<=0||!camera?.matrixWorld||!camera?.matrixWorldInverse)return deny('Invalid TV sight volume');
 const eye=transform(camera.matrixWorld,[0,0,0]);if(!finitePoint(eye))return deny('Invalid camera position');
 const vertices=far.map(p=>p.slice());
 for(const point of far){
  const depth=-transform(camera.matrixWorldInverse,point)[2];
  if(!Number.isFinite(depth)||depth<=near)return deny('TV intersects camera near plane');
  vertices.push(point.map((n,i)=>eye[i]+(n-eye[i])*near/depth));
 }
 if(!vertices.every(finitePoint))return deny('Invalid TV sight vertices');
 const boxAxes=[[1,0,0],[0,1,0],[0,0,1]],axes=[...boxAxes];
 const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
 for(const face of faces){
  const normal=sightCross(sightSubtract(vertices[face[1]],vertices[face[0]]),sightSubtract(vertices[face[2]],vertices[face[0]])),length=Math.hypot(...normal);
  if(!Number.isFinite(length)||length<1e-12)return deny('Degenerate TV sight face');
  axes.push(normal.map(n=>n/length));
 }
 const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
 for(const [a,b]of edges)for(const boxAxis of boxAxes){
  const axis=sightCross(sightSubtract(vertices[b],vertices[a]),boxAxis),length=Math.hypot(...axis);
  if(!Number.isFinite(length))return deny('Invalid TV sight edge');
  if(length>1e-12)axes.push(axis.map(n=>n/length));
 }
 const intervals=axes.map(axis=>{const values=vertices.map(p=>sightDot(p,axis));return [Math.min(...values),Math.max(...values)];});
 if(!intervals.flat().every(Number.isFinite))return deny('Invalid TV sight interval');
 for(let index=0;index<bounds.length;index++){
  const bound=bounds[index];
  if(!finitePoint(bound?.min)||!finitePoint(bound?.max)||bound.min.some((n,i)=>n>bound.max[i]))return deny('Unknown or invalid occluder bounds',index);
  let separated=false;
  for(let k=0;k<axes.length;k++){
   const axis=axes[k],minimum=axis.reduce((sum,n,i)=>sum+n*(n>=0?bound.min[i]:bound.max[i]),0),maximum=axis.reduce((sum,n,i)=>sum+n*(n>=0?bound.max[i]:bound.min[i]),0),[lo,hi]=intervals[k];
   if(!Number.isFinite(minimum)||!Number.isFinite(maximum))return deny('Invalid occluder interval',index);
   // Require a real gap: tangency and numerical uncertainty remain blocked.
   if(maximum<lo-1e-7||minimum>hi+1e-7){separated=true;break;}
  }
  if(!separated)return deny('Scene bound intersects the complete TV sight volume',index);
 }
 return true;
}
/** Reveal only TV cells whose entire camera sight volume is proven clear. */
export function mediaScreenCellVisibility(projection,camera,bounds,{complete=false,columns=6,rows=4}={}){
 const hidden={visible:false,partial:false,mask:null,clearCells:0,totalCells:columns*rows};
 if(!complete||!projection||!validViewport(projection.viewport)||!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||columns*rows>48)return hidden;
 if(mediaScreenUnobstructed(projection,camera,bounds,{complete:true}))return {visible:true,partial:false,mask:null,clearCells:columns*rows,totalCells:columns*rows};
 const point=(u,v)=>{const [a,b,c,d]=projection.world;return a.map((n,i)=>n*(1-u)*(1-v)+b[i]*u*(1-v)+c[i]*u*v+d[i]*(1-u)*v);};
 const clear=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const u0=x/columns,u1=(x+1)/columns,v0=y/rows,v1=(y+1)/rows;
  const cell={world:[point(u0,v0),point(u1,v0),point(u1,v1),point(u0,v1)]};
  if(mediaScreenUnobstructed(cell,camera,bounds,{complete:true})){
   const clipped=clipScreenQuad(cell.world.map(p=>project(camera,p,projection.viewport)),projection.viewport);
   if(clipped)clear.push({x,y});
  }
 }
 if(!clear.length)return hidden;
 const rectangles=clear.map(({x,y})=>'<rect x="'+(1280*x/columns)+'" y="'+(720*y/rows)+'" width="'+(1280/columns)+'" height="'+(720/rows)+'" fill="white"/>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">'+rectangles+'</svg>';
 return {visible:true,partial:true,mask:'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")',clearCells:clear.length,totalCells:columns*rows};
}
export function mediaScreenSurfaceExcluded(nativeIsland,projection,camera,{margin=.025}={}){
 const water=nativeIsland?.water;if(water?.surfaceExclusionsEnforced!==true||!projection?.world||!Number.isFinite(margin)||margin<0)return false;
 const volumes=water.getSurfaceExclusions?.()??water.surfaceExclusions;if(!Array.isArray(volumes)||volumes.length>16)return false;
 const ids=new Set();for(const v of volumes){if(!v||typeof v.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(v.id)||ids.has(v.id)||!Array.isArray(v.min)||!Array.isArray(v.max)||v.min.length!==3||v.max.length!==3||![...v.min,...v.max].every(n=>Number.isFinite(n)&&Math.abs(n)<=100000)||v.min.some((n,i)=>n>=v.max[i]))return false;ids.add(v.id);}
 const points=[camera.position.toArray(),...projection.world];return volumes.some(v=>points.every(p=>p.every((n,i)=>n>v.min[i]+margin&&n<v.max[i]-margin)));
}
const geometryBoundsCache=new WeakMap(),nativePlantCache=new WeakMap(),instanceBoundsCache=new WeakMap();
function geometryBounds(geometry){
 let result=geometryBoundsCache.get(geometry);if(result)return result;const position=geometry?.attributes?.position??geometry?.getAttribute?.('position');if(!position?.count)return null;
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<position.count;i++)for(let k=0;k<3;k++){const n=position.getComponent?position.getComponent(i,k):position.array[i*position.itemSize+k];if(!Number.isFinite(n))return null;min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n);}
 result={min,max,radius:Math.hypot(...min.map((n,i)=>Math.max(Math.abs(n),Math.abs(max[i]))))};geometryBoundsCache.set(geometry,result);return result;
}
function transformedBounds(local,matrix,pad=0){const points=[];for(const x of [local.min[0],local.max[0]])for(const y of [local.min[1],local.max[1]])for(const z of [local.min[2],local.max[2]])points.push(transform(matrix,[x,y,z]));return{min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))-pad),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))+pad)};}
/** Bound the installed non-canopy WebGL plant shader without adding height below its base. */
export function webGLPalmOcclusionBounds(local,matrix,{height,lean,windStrength,windLength}){
 if(!local||![height,lean,windStrength,windLength].every(Number.isFinite)||height<0||lean<0||windLength<0)return null;
 const w=Math.abs(windStrength),sway=Math.hypot(.0168*w*w+.009425*w,.0028*w)*windLength;
 const radius=local.radius??Math.hypot(...local.min.map((n,i)=>Math.max(Math.abs(n),Math.abs(local.max[i]))));
 if(!Number.isFinite(radius))return null;
 const horizontal=radius+height*(lean+sway);
 return transformedBounds({min:[-horizontal,-radius,-horizontal],max:[horizontal,height+radius,horizontal]},matrix);
}
/** Conservative per-triangle bounds for the installed non-canopy palm vertex shader. */
export function webGLPalmTriangleBounds(geometry,matrix,{height,lean,angle,windStrength,windLength}){
 const position=geometry?.attributes?.position,veg=geometry?.attributes?.aVeg,part=geometry?.attributes?.aMat,index=geometry?.index;
 if(!position?.count||!veg||!part||!index?.count||index.count>15000||![height,lean,angle,windStrength,windLength].every(Number.isFinite))return null;
 const w=Math.abs(windStrength),sway=Math.hypot(.0168*w*w+.009425*w,.0028*w)*windLength,leanX=Math.cos(angle)*lean,leanZ=Math.sin(angle)*lean;
 const boxes=[];
 for(let i=0;i<position.count;i++){
  const P=[0,1,2].map(k=>position.getComponent(i,k)),u=veg.getX(i),leaf=veg.getY(i),isStem=part.getX(i)<.5;
  if(!P.every(Number.isFinite)||!Number.isFinite(u)||!Number.isFinite(leaf))return null;
  let local;
  if(isStem){
   const fc0=u,fc1=u*(2-u),lo=Math.min(fc0,fc1),hi=Math.max(fc0,fc1),mid=(lo+hi)/2;
   const r=Math.hypot(P[0],P[2])+Math.abs(lean)*height*(hi-lo)/2+sway*u*u*height;
   local={min:[leanX*mid*height-r,u*height-r,leanZ*mid*height-r],max:[leanX*mid*height+r,u*height+r,leanZ*mid*height+r]};
  }else{
   const magnitude=Math.hypot(...P),tilt=magnitude*.5*Math.atan(Math.abs(lean)+2*sway);
   const bend=leaf*leaf*(.828*w*w+.43875*w),disp=Math.hypot(bend*windLength,.3*bend+.1*w*leaf*leaf);
   const pad=sway*height+tilt+2*disp+.02,centre=[P[0]+leanX*height,P[1]+height,P[2]+leanZ*height];
   local={min:centre.map(n=>n-pad),max:centre.map(n=>n+pad)};
  }
  boxes.push(transformedBounds(local,matrix));
 }
 const triangles=[];
 for(let k=0;k<index.count;k+=3){
  const vertices=[0,1,2].map(n=>boxes[index.getX(k+n)]);if(vertices.some(v=>!v))return null;
  triangles.push({min:[0,1,2].map(axis=>Math.min(...vertices.map(v=>v.min[axis]))),max:[0,1,2].map(axis=>Math.max(...vertices.map(v=>v.max[axis])))});
 }
 return triangles;
}
function boxIntersects(a,b){return [0,1,2].every(k=>a.min[k]<=b.max[k]&&a.max[k]>=b.min[k]);}
function multiply(a,b){const ae=a.elements??a,be=b.elements??b,out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=ae[k*4+r]*be[c*4+k];return out;}
/** Fine cell extrema bound every bilinear terrain height over the complete camera/screen cone. */
export function nativeMediaGroundProof(active,projection,camera){
 const data=active.nativeIsland?.data;if(!data?.isNativeIsland)return {clear:true};const all=[camera.position.toArray(),...projection.world],{min,max,i0,i1,j0,j1}=mediaSightCellRange(all,data);
 if(min[0]<data.origin||min[2]<data.origin||max[0]>=data.origin+data.size||max[2]>=data.origin+data.size)return {clear:false,reason:'TV sight cone is outside captured terrain'};
 let highest=-Infinity,cells=0;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=data.origin+(i+.5)*data.texel,z=data.origin+(j+.5)*data.texel;if(!data.cache?.readyAt(x,z))return {clear:false,reason:'Fine terrain visibility cells unavailable'};const h=data.heights[j*data.res+i];if(!Number.isFinite(h))return {clear:false,reason:'Invalid terrain visibility height'};highest=Math.max(highest,h);cells++;}
 if(highest+.15>=min[1])return {clear:false,reason:'Terrain may intersect the complete TV sight cone',highest,cells};
 const grass=active.nativeIsland.vegetation?.grass,mask=active.nativeIsland.mediaOcclusion?.grassMask;if(grass&&mask?.data&&Number.isInteger(mask.res)){
  const radius=Math.max(...grass.meshes.map(m=>geometryBounds(m.geometry)?.radius??Infinity))*3+1;if(!Number.isFinite(radius))return {clear:false,reason:'Native grass geometry envelope unavailable'};
  const x0=Math.max(0,Math.floor((min[0]-radius-data.origin)/data.size*mask.res)-1),x1=Math.min(mask.res-1,Math.ceil((max[0]+radius-data.origin)/data.size*mask.res)+1),z0=Math.max(0,Math.floor((min[2]-radius-data.origin)/data.size*mask.res)-1),z1=Math.min(mask.res-1,Math.ceil((max[2]+radius-data.origin)/data.size*mask.res)+1);
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)for(let k=0;k<4;k++)if(mask.data[(z*mask.res+x)*4+k]!==0)return {clear:false,reason:'Native grass density near the TV sight cone',highest,cells};
  return {clear:true,highest,cells,grassZeroMaskProof:true,grassEnvelope:radius};
 }
 if(grass){const side=grass.cellsPerSide,c0=Math.max(0,Math.floor((min[0]-data.origin-2)/8)),c1=Math.min(side-1,Math.floor((max[0]-data.origin+2)/8)),z0=Math.max(0,Math.floor((min[2]-data.origin-2)/8)),z1=Math.min(side-1,Math.floor((max[2]-data.origin+2)/8));for(let z=z0;z<=z1;z++)for(let x=c0;x<=c1;x++)if(grass.cellFlags[z*side+x])return {clear:false,reason:'Native grass may intersect TV sight cone',highest,cells};}
 return {clear:true,highest,cells};
}
function nativePlantIndex(type,wind){
 const inst=type.inst;let cached=nativePlantCache.get(inst);if(cached?.wind===wind)return cached;
 const geometries=type.near?.meshes?.map(m=>geometryBounds(m.geometry)).filter(Boolean)??[];if(!geometries.length)return null;
 const radius=Math.max(...geometries.map(b=>b.radius)),entries=[],grid=new Map(),cell=32,w=Math.max(wind*.1,.03),sway=.017*w*w+.013*w;
 for(let i=0;i<inst.count;i++){const scale=Math.abs(inst.iPos[i*4+3]),height=Math.abs(inst.iDat[i*4+2]),lean=Math.abs(inst.iDat[i*4+1]),r=radius*scale+height*(lean+sway)+.2,y=inst.py[i],entry={min:[inst.px[i]-r,y-r,inst.pz[i]-r],max:[inst.px[i]+r,y+height+r,inst.pz[i]+r]};entries.push(entry);
  const key=Math.floor(inst.px[i]/cell)+':'+Math.floor(inst.pz[i]/cell);let bucket=grid.get(key);if(!bucket)grid.set(key,bucket=[]);bucket.push(i);}
 const maxRadius=entries.reduce((n,b,i)=>Math.max(n,b.max[0]-inst.px[i]),0);cached={wind,entries,grid,cell,maxRadius};nativePlantCache.set(inst,cached);return cached;
}
/** Collects physical meshes including noncolliding props/avatars; forest records stay flat and indexed. */
export function collectMediaScreenOccluders(active,{camera,projection,screenObjectId,avatarRoots=[]}={}){
 const bounds=[],reasons=[],stats={meshes:0,instances:0,nativeCandidates:0,skyInteriorExclusions:0};if(!active?.root||!projection)return {bounds,complete:false,reasons:['No active screen projection'],stats};
 const conePoints=[camera.position.toArray(),...projection.world],cone={min:[0,1,2].map(i=>Math.min(...conePoints.map(p=>p[i]))-.25),max:[0,1,2].map(i=>Math.max(...conePoints.map(p=>p[i]))+.25)},native=active.nativeIsland;
 const ground=nativeMediaGroundProof(active,projection,camera);if(!ground.clear)reasons.push(ground.reason);
 const waterExcluded=mediaScreenSurfaceExcluded(native,projection,camera);
 if(native&&!waterExcluded)reasons.push('Native ocean needs a complete sight-cone exclusion proof');
 const vegetation=native?.vegetation;
 if(vegetation){for(const type of vegetation.types??[]){const index=nativePlantIndex(type,active.project?.environment.windSpeed??6);if(!index){reasons.push('Native plant bounds unavailable');continue;}const {cell,maxRadius}=index;
  for(let z=Math.floor((cone.min[2]-maxRadius)/cell);z<=Math.floor((cone.max[2]+maxRadius)/cell);z++)for(let x=Math.floor((cone.min[0]-maxRadius)/cell);x<=Math.floor((cone.max[0]+maxRadius)/cell);x++)for(const i of index.grid.get(x+':'+z)??[]){stats.nativeCandidates++;const entry=index.entries[i];if(boxIntersects(entry,cone))bounds.push(entry);}}
 }
 const visit=(node,own=false)=>{if(node.visible===false)return;own=own||node.userData?.editorObjectId===screenObjectId;if(own||node===vegetation?.group)return;
  if(node.geometry&&!rendererSkyExcluded(native,node,camera,projection,stats,reasons)){
   const key=node.material?.customProgramCacheKey?.()??'',isNativeGround=node===native?.terrain?.mesh||node.userData?.nativeBase||node.userData?.nativeTextures,isNativeWater=node===native?.water?.mesh||/native.*(?:sea|ocean)/i.test(key);
   if((isNativeGround&&native)||(isNativeWater&&native)){/* Proven by installed fine-cell/dry-volume adapters above. */}
   else if(node.geometry.attributes?.iCell){reasons.push('Unknown displaced grass mesh');}
   else{
    const attributes=node.geometry.attributes??{},materials=Array.isArray(node.material)?node.material:[node.material],nativeSkinned=!node.isSkinnedMesh&&(attributes.skinIndex||attributes.skinWeight||materials.some(m=>m?.bindings?.skinJoints));
    const local=nativeSkinned?null:geometryBounds(node.geometry);
    if(nativeSkinned){
     const posed=node.skinBounds,sphere=posed?.sphere;
     if(!(posed instanceof SkinBounds)||posed.valid!==true||!sphere||!Number.isFinite(sphere.radius)||sphere.radius<0||![sphere.center.x,sphere.center.y,sphere.center.z].every(Number.isFinite))reasons.push('Native skinned mesh lacks trusted finite posed bounds');
     else{const center=sphere.center.toArray(),radius=sphere.radius,b=transformedBounds({min:center.map(n=>n-radius),max:center.map(n=>n+radius)},node.matrixWorld);stats.meshes++;if(boxIntersects(b,cone))bounds.push(b);}
    }
    else if(!local)reasons.push('Rendered geometry bounds unavailable');
    else if(node.isSkinnedMesh){if(typeof node.computeBoundingBox!=='function')reasons.push('Animated mesh bounds unavailable');else{node.computeBoundingBox();const b=node.boundingBox;if(!b)reasons.push('Animated mesh bounds unavailable');else bounds.push(transformedBounds({min:b.min.toArray(),max:b.max.toArray()},node.matrixWorld));}}
    else if(node.isInstancedMesh||node.instanceMatrix){const count=node.count??0,matrices=node.instanceMatrix?.array;if(!matrices)reasons.push('Instance transforms unavailable');else{
     const plant=node.geometry.attributes?.iPlant,record=node.geometry.attributes?.iRecord,windMeta=node.material?.userData,windVector=windMeta?.nativeWindVector;
     const stamp=[node.instanceMatrix.version,plant?.version,record?.version,count,windMeta?.nativeWindStrength,windVector?.x,windVector?.y,...node.matrixWorld.elements].join(',');let cached=instanceBoundsCache.get(node);
     if(cached?.stamp!==stamp){const entries=[],grid=new Map(),cell=32,w=Math.max((active.project?.environment.windSpeed??6)*.1,.03);let radius=0;
      for(let i=0;i<count;i++){
       const matrix=multiply(node.matrixWorld,matrices.subarray(i*16,i*16+16)),scale=Math.max(Math.hypot(...matrix.slice(0,3)),Math.hypot(...matrix.slice(4,7)),Math.hypot(...matrix.slice(8,11)));
       const palm=node.userData?.mediaOcclusionPlant==='native-palm-v1'&&record?.getZ(i)<=.5&&/native-source-plants-webgl\/1:palm/.test(key);
       const tight=palm?webGLPalmOcclusionBounds(local,matrix,{height:Math.abs(plant.getZ(i)),lean:Math.abs(plant.getY(i)),windStrength:windMeta?.nativeWindStrength,windLength:Math.hypot(windVector?.x??NaN,windVector?.y??NaN)}):null;
       const pad=plant?Math.abs(plant.getZ(i))*scale*(1+Math.abs(plant.getY(i))+.017*w*w+.013*w)+.2:0,b=tight??transformedBounds(local,matrix,pad);
       const x=(b.min[0]+b.max[0])/2,z=(b.min[2]+b.max[2])/2;radius=Math.max(radius,(b.max[0]-b.min[0])/2,(b.max[2]-b.min[2])/2);entries.push(b);
       const cellKey=Math.floor(x/cell)+':'+Math.floor(z/cell);let bucket=grid.get(cellKey);if(!bucket)grid.set(cellKey,bucket=[]);bucket.push(i);
      }
      cached={stamp,entries,grid,cell,radius,details:new Map()};instanceBoundsCache.set(node,cached);}
     for(let z=Math.floor((cone.min[2]-cached.radius)/cached.cell);z<=Math.floor((cone.max[2]+cached.radius)/cached.cell);z++)for(let x=Math.floor((cone.min[0]-cached.radius)/cached.cell);x<=Math.floor((cone.max[0]+cached.radius)/cached.cell);x++)for(const i of cached.grid.get(x+':'+z)??[]){stats.instances++;const b=cached.entries[i];if(boxIntersects(b,cone)){
       const palm=node.userData?.mediaOcclusionPlant==='native-palm-v1'&&record?.getZ(i)<=.5&&/native-source-plants-webgl\/1:palm/.test(key);
       if(palm){
        let details=cached.details.get(i);
        if(!details){const matrix=multiply(node.matrixWorld,matrices.subarray(i*16,i*16+16));details=webGLPalmTriangleBounds(node.geometry,matrix,{height:Math.abs(plant.getZ(i)),lean:plant.getY(i),angle:plant.getX(i),windStrength:windMeta?.nativeWindStrength,windLength:Math.hypot(windVector?.x??NaN,windVector?.y??NaN)});if(details){details.forEach((piece,triangle)=>piece.source={kind:'palm-triangle',species:node.userData?.nativePlantSpecies,index:i,triangle});cached.details.set(i,details);}}
        if(details){for(const piece of details)if(boxIntersects(piece,cone))bounds.push(piece);continue;}
       }
       bounds.push(b);b.source??={kind:'instance',mesh:node.name||node.userData?.nativePlantSpecies||'unnamed',program:node.material?.customProgramCacheKey?.()??'',index:i,canopy:record?.getZ(i),height:plant?.getZ(i),lean:plant?.getY(i)};
      }}
    }}
    else{const b=transformedBounds(local,node.matrixWorld);stats.meshes++;if(boxIntersects(b,cone))bounds.push(b);}
   }
  }
  for(const child of node.children??[])visit(child,own);
 };
 active.root.updateMatrixWorld?.(true);visit(active.root);for(const root of avatarRoots){root.updateMatrixWorld?.(true);visit(root);}
 return {bounds,complete:reasons.length===0,reasons,stats,ground,waterExcluded};
}
export function youtubeEmbedURL(config,origin,start=0){
 mediaLayout(config);const url=new URL(origin);if(!['https:','http:'].includes(url.protocol)||url.origin!==origin)throw Error('Invalid player origin');
 const params=new URLSearchParams({enablejsapi:'1',origin,playsinline:'1',rel:'0',autoplay:'1',start:String(Math.max(0,Math.floor(start)))});
 return 'https://www.youtube-nocookie.com/embed/'+config.videoId+'?'+params;
}
const errors={2:'YouTube rejected this video ID.',5:'YouTube playback is unavailable in this browser.',100:'This YouTube video is unavailable or private.',101:'The video owner does not allow embedding.',150:'The video owner does not allow embedding.',153:'YouTube did not receive the required client identification.'};
/** Local playback only. An active-world lease and conservative visibility proof are injected by the runtime. */
function mediaSightCellRange(points,{origin,res,texel}){
 const min=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));
 return {min,max,i0:Math.max(0,Math.floor((min[0]-origin)/texel)-2),i1:Math.min(res-1,Math.ceil((max[0]-origin)/texel)+2),j0:Math.max(0,Math.floor((min[2]-origin)/texel)-2),j1:Math.min(res-1,Math.ceil((max[2]-origin)/texel)+2)};
}
export function mediaSightTiles(projection,camera,cache,{maxTiles=16}={}){
 if(!cache?.tiles||!projection?.world||!camera?.position)return null;
 const points=[camera.position.toArray(),...projection.world];if(!points.every(finitePoint))return null;
 const origin=projection.terrainOrigin,res=projection.terrainResolution,texel=projection.terrainTexel;
 if(!Number.isFinite(origin)||!Number.isInteger(res)||res<1||!Number.isFinite(texel)||texel<=0)return null;
 const {i0,i1,j0,j1}=mediaSightCellRange(points,{origin,res,texel});
 const x0=origin+(i0+.5)*texel,x1=origin+(i1+.5)*texel,z0=origin+(j0+.5)*texel,z1=origin+(j1+.5)*texel;
 const tiles=cache.tiles.filter(t=>t.bounds[0]<=x1&&t.bounds[2]>x0&&t.bounds[1]<=z1&&t.bounds[3]>z0);
 return tiles.length&&tiles.length<=maxTiles?tiles:null;
}
/** The same verified fine terrain bytes used by the renderer remain resident for the TV sightline. */
export class MediaScreen {
 constructor({getContext,isAuthorized,isUnobstructed=()=>false,describeObstruction=()=>null,onEnter=()=>{},onExit=()=>{},document:doc=globalThis.document,window:win=globalThis.window}){
  Object.assign(this,{getContext,isAuthorized,isUnobstructed,describeObstruction,onEnter,onExit,doc,win});
  this.active=null;this.iframe=null;this.controlsOpen=false;this.screenVisible=false;this.screenPartial=false;this.sightToken=0;this.sightKey=null;this.sightRelease=null;this.sightPending=false;this.sightError=null;
  this.status={state:'closed',playerState:null,currentTime:null,advancedSeconds:0,error:null};
  this.message=e=>this.receive(e);win.addEventListener('message',this.message);
  this.visibility=()=>{if(doc.visibilityState==='hidden'){this.destroyPlayer();this.releaseSightTiles();this.status.state='hidden-stopped';}};
  doc.addEventListener('visibilitychange',this.visibility);
 }
 releaseSightTiles(){
  ++this.sightToken;this.sightRelease?.();this.sightRelease=null;this.sightKey=null;this.sightPending=false;this.sightError=null;
 }
 ensureSightTiles(projection,active){
  const cache=active.nativeIsland?.data?.cache;
  if(!cache)return true;
  if(!projection){this.releaseSightTiles();return false;}
  const data=active.nativeIsland.data,tiles=mediaSightTiles({...projection,terrainTexel:data.texel,terrainOrigin:data.origin,terrainResolution:data.res},this.getContext().camera,cache);
  if(!tiles){this.releaseSightTiles();this.sightError='TV visibility area is outside the verified terrain tile limit.';return false;}
  const key=tiles.map(t=>t.id).sort().join('|');
  if(this.sightKey===key&&this.sightCache===cache)return !!this.sightRelease;
  this.releaseSightTiles();this.sightKey=key;this.sightCache=cache;this.sightPending=true;
  const token=this.sightToken;
  cache.retain(tiles).then(release=>{
   if(this.sightToken!==token||this.active?.active!==active){release();return;}
   this.sightRelease=release;this.sightPending=false;
  }).catch(error=>{if(this.sightToken!==token)return;this.sightPending=false;this.sightError='TV visibility resources unavailable: '+error.message;});
  return false;
 }
 enter(object,active){
  mediaLayout(object.mediaScreen);
  if(this.active?.object.id===object.id&&this.active.active===active){this.openControls();return true;}
  this.exit();
  const c=this.getContext();
  if(!c?.ready||c.active!==active||!this.isAuthorized(object.id,'media.play'))throw Error('Access restricted');
  this.active={object,active,key:c.key};
  this.status={state:'awaiting-user-play',playerState:null,currentTime:null,advancedSeconds:0,error:null};
  this.openControls();
  return true;
 }
 openControls(){
  if(!this.active||this.controlsOpen)return;
  this.controlsOpen=true;
  this.controls=this.doc.createElement('div');
  this.controls.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10000;background:#14212bee;color:white;padding:12px;border-radius:10px;display:flex;gap:12px;align-items:center';
  this.play=this.doc.createElement('button');
  this.play.textContent=this.iframe?'Restart TV':this.sightError?'Retry TV':'Play on TV';
  this.play.onclick=()=>this.startPlayback();
  this.note=this.doc.createElement('span');
  this.note.textContent=this.iframe?(this.status.state==='playing'?'Playing on TV. Return to the game to keep watching while you walk.':'TV player is starting. Use the player controls if needed.'):'Playback uses YouTube. Click Play to turn on the TV.';
  const back=this.doc.createElement('button');back.textContent='Return to game';back.onclick=()=>this.closeControls();
  const stop=this.doc.createElement('button');stop.textContent='Stop TV';stop.onclick=()=>this.exit();
  this.controls.append(this.play,this.note,back,stop);
  this.doc.body.append(this.controls);
  if(this.iframe)this.iframe.style.pointerEvents=this.screenVisible&&!this.screenPartial?'auto':'none';
  this.doc.exitPointerLock?.();
  this.onEnter();
 }
 closeControls(){
  if(!this.controlsOpen)return;
  this.controls?.remove();this.controls=null;this.controlsOpen=false;
  if(this.iframe)this.iframe.style.pointerEvents='none';
  this.onExit();
  if(!this.iframe){this.releaseSightTiles();this.active=null;this.status.state='closed';}
 }
 current(){
  const c=this.getContext(),a=this.active;
  if(!a||!c?.ready||c.active!==a.active||c.key!==a.key||!this.isAuthorized(a.object.id,'media.play'))return null;
  const matrix=c.objectMatrix?.(a.object.id)??a.active.matrices?.get(a.object.id);
  if(!matrix)return null;
  const projection=projectMediaScreen(c.camera,matrix,a.object.mediaScreen,c.viewport);
  const ready=this.ensureSightTiles(projection,a.active);
  const result=projection&&ready?this.isUnobstructed(projection,c,a.object):false;
  const visibility=result===true?{visible:true,partial:false,mask:null}:result&&typeof result==='object'?result:{visible:false,partial:false,mask:null};
  return {c,projection,...visibility};
 }
 startPlayback(){
  if(this.sightError)this.releaseSightTiles();
  const current=this.current();
  if(!current){this.exit();return false;}
  this.destroyPlayer();
  const frame=this.doc.createElement('iframe');
  frame.title='YouTube video on physical TV';frame.width='1280';frame.height='720';
  frame.allow='autoplay; encrypted-media; picture-in-picture';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.style.cssText='position:fixed;top:0;left:0;width:1280px;height:720px;border:0;transform-origin:0 0;z-index:25;background:#000';
  frame.style.transform=current.projection?screenQuadTransform(current.projection.quad):'translate(-2000px,-2000px)';
  frame.style.opacity=current.visible?'1':'0';
  frame.style.maskImage=current.mask??'none';frame.style.webkitMaskImage=current.mask??'none';
  frame.style.clipPath=current.projection?.clipPath??'none';
  frame.style.pointerEvents=current.visible&&!current.partial&&this.controlsOpen?'auto':'none';
  frame.src=youtubeEmbedURL(this.active.object.mediaScreen,this.win.location.origin,this.status.currentTime??0);
  this.iframe=frame;this.doc.body.append(frame);this.screenVisible=current.visible;this.screenPartial=!!current.partial;
  this.status.state='player-requested';this.status.error=null;this.status.playerState=null;this.status.advancedSeconds=0;
  if(this.note)this.note.textContent=current.visible?'TV player is starting. Use the player controls if autoplay is blocked.':'TV player is starting behind an obstruction; the picture will reappear when visible.';
  this.poll=setInterval(()=>{this.update();this.send({event:'listening',id:'elsemesh-tv',channel:'elsemesh-tv'});this.send({event:'command',func:'addEventListener',args:['onStateChange']});this.send({event:'command',func:'addEventListener',args:['onError']});},500);
  this.update();
  return true;
 }
 send(value){this.iframe?.contentWindow?.postMessage(JSON.stringify(value),'https://www.youtube-nocookie.com');}
 receive(event){
  if(this.iframe&&!this.current()){this.exit();return;}
  if(!this.iframe||event.source!==this.iframe.contentWindow||event.origin!=='https://www.youtube-nocookie.com')return;
  let data;try{if(typeof event.data==='string'&&event.data.length>100000)return;data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
  if(!data||typeof data!=='object')return;
  if(data.event==='onError'){this.status.error=data.info;this.status.state='playback-error';if(this.note)this.note.textContent=errors[data.info]??'YouTube playback failed.';return;}
  if(data.event==='onReady'){this.status.state='ready';this.send({event:'command',func:'playVideo',args:[]});}
  const state=data.event==='onStateChange'?data.info:data.info?.playerState;
  if(Number.isInteger(state)){
   this.status.playerState=state;
   this.status.state=({'-1':'awaiting-player-gesture','0':'ended','1':'playing','2':'paused','3':'buffering','5':'cued'})[state]??'unknown-player-state';
   if(this.note)this.note.textContent=({'-1':'Use the TV play control to begin.','0':'Video ended.','1':'Playing on TV','2':'Paused on TV','3':'YouTube is buffering.','5':'Video is ready.'})[state]??'YouTube player state unavailable.';
  }
  const time=data.info?.currentTime;
  if(Number.isFinite(time)&&time>=0){if(this.status.currentTime!==null&&this.status.playerState===1&&time>this.status.currentTime)this.status.advancedSeconds+=time-this.status.currentTime;this.status.currentTime=time;}
 }
 update(){
  if(!this.active)return;
  if(this.doc.visibilityState==='hidden'){this.destroyPlayer();this.releaseSightTiles();this.status.state='hidden-stopped';return;}
  const current=this.current();
  if(!current){this.exit();return;}
  if(!this.iframe)return;
  if(this.sightError){if(this.note)this.note.textContent=this.sightError+' Use the TV play control to retry.';if(this.play)this.play.textContent=this.iframe?'Restart TV':'Retry TV';}
  this.screenVisible=current.visible;this.screenPartial=!!current.partial;
  this.iframe.style.opacity=current.visible?'1':'0';
  this.iframe.style.maskImage=current.mask??'none';this.iframe.style.webkitMaskImage=current.mask??'none';
  this.iframe.style.clipPath=current.projection?.clipPath??'none';
  this.iframe.style.pointerEvents=current.visible&&!current.partial&&this.controlsOpen?'auto':'none';
  if(current.projection)this.iframe.style.transform=screenQuadTransform(current.projection.quad);
 }
 destroyPlayer(){
  clearInterval(this.poll);this.poll=null;this.screenVisible=false;this.screenPartial=false;
  if(this.iframe){this.send({event:'command',func:'pauseVideo',args:[]});this.iframe.src='about:blank';this.iframe.remove();this.iframe=null;}
 }
 exit(){
  this.destroyPlayer();
  this.releaseSightTiles();
  this.closeControls();
  this.active=null;this.status.state='closed';
 }
 diagnostics(){return {...this.status,activeObjectId:this.active?.object.id??null,iframePresent:!!this.iframe,controlsOpen:this.controlsOpen,screenVisible:this.screenVisible,screenPartial:this.screenPartial,visibilityLoading:this.sightPending,visibilityError:this.sightError,playbackScope:'local active world only',occlusion:'proven clear TV cells shown; playback continues behind obstructions',audioHeard:false};}
 dispose(){this.exit();this.win.removeEventListener('message',this.message);this.doc.removeEventListener('visibilitychange',this.visibility);}
}
