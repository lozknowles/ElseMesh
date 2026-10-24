import { T, resolveWorldMatrices } from './vendor/world-engine-contract.js';

// Bounded runtime interpretation of the authored warehouse collision roof. Its
// visual visibility is deliberately independent of its solid weather cover.
// This is not generic roof inference: furniture, walls and arbitrary colliders
// never become shelter. No repository content or water exclusions are changed.
export const MAX_WEATHER_SHELTERS=4;
const cache=new WeakMap();
export function repositoryWeatherShelters(project){
 if(!project)return [];if(cache.has(project))return cache.get(project);
 const objects=project.objects??[],roof=objects.find(o=>o.id==='warehouse:object:0329'&&o.name==='weathered roof'&&o.assetId==='warehouse:box-steel'&&o.collision==='solid'),floor=objects.find(o=>o.id==='warehouse:object:0000'&&o.name==='polished tiled warehouse floor');
 let result=[];
 if(roof&&floor){
  const matrices=resolveWorldMatrices(objects),matrix=matrices.get(roof.id),floorMatrix=matrices.get(floor.id);
  if(matrix&&floorMatrix&&Math.abs(matrix.determinant())>1e-9){
   const inverse=matrix.clone().invert(),base=new T.Vector3(0,.5,0).applyMatrix4(floorMatrix).applyMatrix4(inverse);
   // Unit-box asset bounds, roof underside, authored floor top. Follow parent
   // transforms exactly; do not expand a rotated roof into a world-axis box.
   if(base.y<-.5)result=[{id:roof.id,inverse:Array.from(inverse.elements),min:[-.5,base.y,-.5],max:[.5,-.5,.5],logicalCollisionRoof:true}];
  }
 }
 cache.set(project,result);return result;
}
export function shelterPoint(volume,p){const e=volume.inverse;return [0,1,2].map(i=>e[i]*p[0]+e[i+4]*p[1]+e[i+8]*p[2]+e[i+12]);}
export function shelterInterval(volume,start,end){
 const a=shelterPoint(volume,start),b=shelterPoint(volume,end);let lo=0,hi=1;
 for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-10){if(a[i]<volume.min[i]||a[i]>volume.max[i])return null;}else{let x=(volume.min[i]-a[i])/d,y=(volume.max[i]-a[i])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(hi<lo)return null;}}
 return [lo,hi];
}
export function exteriorSegmentLength(start,end,volumes){
 const ranges=volumes.map(v=>shelterInterval(v,start,end)).filter(Boolean).sort((a,b)=>a[0]-b[0]);let covered=0,hi=0;
 for(const [a,b]of ranges){covered+=Math.max(0,b-Math.max(a,hi));hi=Math.max(hi,b);}
 return Math.hypot(...start.map((v,i)=>end[i]-v))*(1-covered);
}
export function excludeShelteredRain(positions,count,volumes){
 if(!volumes.length)return count;let written=0;
 for(let i=0;i<count;i++){
  const k=i*12;let hit=false;
  // Both streak edges and cross diagonal cover finite-width boundary crossings.
  for(const [a,b]of [[0,6],[3,9],[0,9],[3,6]])if(volumes.some(v=>shelterInterval(v,Array.from(positions.subarray(k+a,k+a+3)),Array.from(positions.subarray(k+b,k+b+3))))){hit=true;break;}
  if(!hit){if(written!==i)positions.copyWithin(written*12,k,k+12);written++;}
 }return written;
}
export function setMistShelters(uniforms,volumes){
 const selected=volumes.slice(0,MAX_WEATHER_SHELTERS);uniforms.fields.shelterCount.value=selected.length;
 selected.forEach((v,i)=>{uniforms.fields['shelterInverse'+i].value=v.inverse;uniforms.fields['shelterMin'+i].value=v.min;uniforms.fields['shelterMax'+i].value=v.max;});
}
export const shelterUniformFields=()=>Object.assign({shelterCount:['f32',0]},...Array.from({length:MAX_WEATHER_SHELTERS},(_,i)=>({['shelterInverse'+i]:['mat4x4f',new T.Matrix4().elements],['shelterMin'+i]:['vec3f',[0,0,0]],['shelterMax'+i]:['vec3f',[0,0,0]]})));
export const mistShelterWGSL=`fn bmSheltered(p:vec3f)->bool {
${Array.from({length:MAX_WEATHER_SHELTERS},(_,i)=>`if(builderMist.shelterCount>${i}.0){let q=(builderMist.shelterInverse${i}*vec4f(p,1.0)).xyz;if(all(q>=builderMist.shelterMin${i})&&all(q<=builderMist.shelterMax${i})){return true;}}`).join('\n')}
return false;}`;
