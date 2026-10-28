/** Session-only experiments. Never mutates geometry, shaders or world content. */
export class GraphicsExperiments {
 constructor(app){this.app=app;this.farTrees=false;this.orders=new Map();this.roots=[];this.disposed=false;this.count=0;}
 rootsNow(){return [...new Set([this.app.host.active?.root,...[...(this.app.portals.views?.entries?.values()??[])].map(entry=>entry.candidate?.root)].filter(Boolean))];}
 restoreOrders(){for(const [mesh,order]of this.orders)if(mesh.renderOrder===1)mesh.renderOrder=order;this.orders.clear();this.count=0;}
 refresh(){
  if(this.disposed)return;
  const roots=this.rootsNow();if(roots.length===this.roots.length&&roots.every((root,i)=>root===this.roots[i]))return;
  this.restoreOrders();this.roots=roots;if(this.farTrees)this.applyOrders();
 }
 applyOrders(){
  if(this.app.backend!=='webgl2')return;
  for(const root of this.roots)root.traverse(mesh=>{
   if(mesh.userData?.nativePlantSpecies!=='trees'||mesh.userData.nativePlantDistant!==true)return;
   if(!this.orders.has(mesh))this.orders.set(mesh,mesh.renderOrder);
   mesh.renderOrder=1;this.count++;
  });
 }
 setFarTrees(enabled){
  if(this.disposed)throw Error('Graphics experiments disposed');
  this.restoreOrders();this.roots=this.rootsNow();this.farTrees=enabled===true&&this.app.backend==='webgl2';
  if(this.farTrees)this.applyOrders();return this.snapshot();
 }
 setPrepass(enabled){if(this.app.backend==='webgl2'&&this.app.opaqueDepthPrepass)this.app.opaqueDepthPrepass.enabled=enabled===true;return this.snapshot();}
 setSunsetOutput(enabled){if(this.disposed)throw Error('Graphics experiments disposed');this.app.sunsetOutput?.setEnabled(enabled===true&&this.app.backend==='webgl2');return this.snapshot();}
 reset({keepSunset=false}={}){const enabled=keepSunset&&this.app.sunsetOutput?.snapshot().enabled;this.setFarTrees(false);this.setPrepass(true);this.app.sunsetOutput?.reset('world-or-settings-reset');if(enabled)this.setSunsetOutput(true);}
 snapshot(){const prepass=this.app.opaqueDepthPrepass;return{supported:this.app.backend==='webgl2',farTrees:this.farTrees,changedTreeBatches:this.count,prepass:prepass?.enabled??false,prepassUsed:prepass?.lastResult?.used??null,prepassReason:prepass?.lastResult?.reason??null,sunsetOutput:this.app.sunsetOutput?.snapshot()??{enabled:false,active:false,reason:'unavailable'}};}
 dispose(){if(this.disposed)return;this.restoreOrders();this.roots=[];this.farTrees=false;this.setPrepass(true);this.app.sunsetOutput?.reset('graphics-disposed');this.disposed=true;}
}
