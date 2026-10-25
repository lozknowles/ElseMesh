import {T,evaluateAmbientBehaviour,sampleTerrain} from './vendor/world-engine-contract.js';

/** Client-local decorative motion only; authored matrices and collisions stay immutable. */
export function createRepositoryAmbientBehaviour(project){
 const habitat={groundHeight:(x,z)=>sampleTerrain(project.terrain,x,z),waterLevel:project.water?.level,bounds:project.terrain};
 const entries=new Map(),batches=new Set(),delta=new T.Matrix4(),matrix=new T.Matrix4();
 let lastTime;
 return {
  register(mesh,objects,matrices){
   let dynamic=false;
   for(let index=0;index<objects.length;index++){
    const object=objects[index];if(!object.ambientBehaviour)continue;
    let entry=entries.get(object.id);
    if(!entry){
     const base=matrices.get(object.id).clone(),e=base.elements;
     entry={behavior:structuredClone(object.ambientBehaviour),base,anchor:[e[12],e[13],e[14]],baseYaw:Math.atan2(e[8],e[10]),bindings:[]};entries.set(object.id,entry);
    }
    entry.bindings.push({mesh,index});dynamic=true;
   }
   if(dynamic){
    // Moving instances leave their initial bounds; static-only batches retain culling.
    mesh.frustumCulled=false;batches.add(mesh);
   }
  },
  update(time){
   if(!Number.isFinite(time)||time===lastTime)return;lastTime=time;
   for(const entry of entries.values()){
    const pose=evaluateAmbientBehaviour(entry.behavior,entry.anchor,entry.baseYaw,time,habitat);
    const yaw=pose.yaw-entry.baseYaw,c=Math.cos(yaw),s=Math.sin(yaw),a=entry.anchor,p=pose.position;
    delta.set(c,0,s,p[0]-c*a[0]-s*a[2],0,1,0,p[1]-a[1],-s,0,c,p[2]+s*a[0]-c*a[2],0,0,0,1);
    matrix.multiplyMatrices(delta,entry.base);
    for(const {mesh,index} of entry.bindings)mesh.setMatrixAt(index,matrix);
   }
   for(const mesh of batches)mesh.instanceMatrix.needsUpdate=true;
  },
  get objectCount(){return entries.size;},
  get batchCount(){return batches.size;}
 };
}
