export function isGameMenuShortcut(event,activeElement){
 const editing=node=>!!node?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
 return event.code==='KeyM'&&!event.defaultPrevented&&!event.repeat&&!event.isComposing&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!editing(event.target)&&!editing(activeElement);
}
export function gameMenuEnvironment(environment,hour){
 return [0,6,9,12,15,18,21].includes(hour)?{...environment,timeOfDay:hour}:environment;
}
/** An unavailable/unconnected doorway is not a loading workload. */
export function graphicsSceneEligible({active,openingLoading=false,portals,eyeActive=false}={}){
 if(!active||openingLoading||!portals||portals.pending||portals.authorityOffline||eyeActive)return false;
 for(const entry of portals.views?.entries?.values()??[]){
  if(!entry.authorizedView)continue;
  if(entry.state==='loading'||entry.candidate?.splatScene&&entry.candidate.splatScene.state.status!=='ready')return false;
 }
 return true;
}
