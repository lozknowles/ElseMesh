// Authored membership is revision-scoped. Keep only interaction candidates on
// the frame path; visibility and matrices remain live authority-owned inputs.
const indexes=new WeakMap();
export function repositoryInteractionIndex(objects){
 let index=indexes.get(objects);
 if(!index||index.size!==objects.length){
  index={size:objects.length,byId:new Map(objects.map(object=>[object.id,object])),
   computers:Object.freeze(objects.filter(object=>object.kind==='computer')),
   media:Object.freeze(objects.filter(object=>object.kind==='media-screen'))};
  indexes.set(objects,index);
 }
 return index;
}
function visible(object,index){
 const seen=new Set();
 while(object&&!seen.has(object.id)){
  if(!object.visible)return false;
  seen.add(object.id);object=object.parentId?index.byId.get(object.parentId):null;
 }
 return true;
}
export function nearestRepositoryComputer(active,cameraPosition){
 if(!active)return null;
 const index=repositoryInteractionIndex(active.project.objects);let found=null,best=3;
 for(const object of index.computers){
  if(!visible(object,index))continue;
  const matrix=active.matrices.get(object.id);if(!matrix)continue;
  const e=matrix.elements,dx=e[12]-cameraPosition.x,dy=e[13]+.5-cameraPosition.y,dz=e[14]-cameraPosition.z;
  const distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
  if(distance<best){best=distance;found=object;}
 }
 return found;
}
export function nearestRepositoryMedia(active){
 if(!active)return null;
 const index=repositoryInteractionIndex(active.project.objects),feet=active.player.position;let found=null,best=Infinity;
 for(const object of index.media){
  if(!visible(object,index))continue;
  const matrix=active.matrices.get(object.id);if(!matrix)continue;
  const e=matrix.elements,distance=Math.hypot(e[12]-feet.x,e[13]-(feet.y+1.65),e[14]-feet.z);
  if(distance<Math.min(8,Math.max(3,object.mediaScreen.width))&&distance<best){best=distance;found=object;}
 }
 return found;
}
