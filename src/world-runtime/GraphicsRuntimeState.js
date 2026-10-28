/** An unavailable/unconnected doorway is not a loading workload. */
export function graphicsSceneEligible({active,openingLoading=false,portals,eyeActive=false}={}){
 if(!active||openingLoading||!portals||portals.pending||portals.authorityOffline||eyeActive)return false;
 for(const entry of portals.views?.entries?.values()??[]){
  if(!entry.authorizedView)continue;
  if(entry.state==='loading'||entry.candidate?.splatScene&&entry.candidate.splatScene.state.status!=='ready')return false;
 }
 return true;
}
