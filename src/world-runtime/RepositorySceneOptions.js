import {nativeIslandSceneOptions} from './NativeIslandIntegration.js';
export function repositorySceneOptions(project,loaded,{renderer,backend,water}={}){
 if(project.splatScene){
  if(backend!=='webgl2'||!renderer)throw Error('This experimental splat world requires the WebGL graphics mode.');
  if(typeof loaded?.splatSceneRead!=='function')throw Error('Splat scene requires its verified repository resource reader.');
  return {splatScene:{read:loaded.splatSceneRead,renderer}};
 }
 return nativeIslandSceneOptions(project,loaded,water);
}
