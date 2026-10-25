import {parseGitHubWorldLocation,resolveGitHubWorldSource,repositoryDigest} from './vendor/world-engine-contract.js';
import {hostedRepositorySource} from './HostedRepository.js';

const MAX_CONFIG_BYTES=8192;
const MAX_MANIFEST_BYTES=1048576;

export function validateOpeningWorld(config){
 if(!config||typeof config!=='object'||Array.isArray(config))throw Error('Unsupported opening-world configuration.');
 const bundled=config.schema==='elsemesh.opening-world/2';
 if(!bundled&&config.schema!=='elsemesh.opening-world/1')throw Error('Unsupported opening-world configuration.');
 const allowed=bundled?['schema','repository','worldId','contentDigest','bundlePath']:['schema','repository','worldId','contentDigest'];
 if(Object.keys(config).some(key=>!allowed.includes(key)))throw Error('Unknown opening-world configuration field.');
 const source=parseGitHubWorldLocation(config.repository);
 if(!/^[a-f0-9]{40}$/.test(source.ref??''))throw Error('Opening world must use an immutable full Git commit.');
 if(typeof config.worldId!=='string'||!/^elsemesh\.world:[A-Za-z0-9._:-]{1,120}$/.test(config.worldId)||!/^[a-f0-9]{64}$/.test(config.contentDigest??''))throw Error('World identity or digest is invalid.');
 if(bundled&&(!/^worlds\/[a-z0-9][a-z0-9-]{0,63}\/$/.test(config.bundlePath??'')))throw Error('Opening bundle path is invalid.');
 return {config,source,bundled};
}
async function boundedBytes(url,maxBytes,fetcher,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeoutMs??15000);let reader;
 try{
  const response=await fetcher(url,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:options.cache??'default',signal:controller.signal});
  if(!response.ok||response.redirected||(response.url&&response.url!==String(url))){const error=Error(options.error??'Opening world request failed.');error.status=response.status;throw error;}
  const length=response.headers.get('content-length');
  if(length!==null&&!/^\d+$/.test(length))throw Error('Opening world response length is invalid.');
  if(!response.body)throw Error('Opening world response has no body.');
  reader=response.body.getReader();const chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maxBytes)throw Error('Opening world response exceeds its byte limit.');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
 }finally{clearTimeout(timer);if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
}
export async function readOpeningWorld({fetcher=fetch,baseURL=location.href}={}){
 const url=new URL('./opening-world.json',baseURL);
 try{
  const bytes=await boundedBytes(url,MAX_CONFIG_BYTES,fetcher,{cache:'no-store',timeoutMs:10000,error:'Opening-world configuration is unavailable.'});
  return validateOpeningWorld(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))).config;
 }catch(error){
  // A missing optional configuration is the sole case that opens the generic selector.
  if(error?.status===404)return null;
  throw error;
 }
}
export async function loadOpeningWorld(app,config,{fetcher=fetch,baseURL=location.href,onProgress=()=>{},publishedCatalog=null}={}){
 const progress=stage=>{try{onProgress(stage);}catch(error){console.warn('Opening progress callback failed',error);}};
 const generation=app.host.generation;
 const {source,bundled:configuredBundle}=validateOpeningWorld(config),entry=publishedCatalog?.worlds.find(w=>w.worldId===config.worldId);
 if(publishedCatalog&&(publishedCatalog.openingWorldId!==config.worldId||entry?.contentDigest!==config.contentDigest))throw Error('Opening world and published catalog disagree.');
 const bundled=!!entry||configuredBundle;
 const pinned=bundled?hostedRepositorySource(entry?.bundlePath??config.bundlePath,{baseURL,origin:new URL(baseURL).origin,fetch:fetcher}):await resolveGitHubWorldSource(source);
 const manifestURL=bundled?null:`https://raw.githubusercontent.com/${pinned.owner}/${pinned.repository}/${pinned.commit}/${pinned.path?pinned.path+'/':''}world.json`;
 const bytes=bundled?await pinned.read('world.json',MAX_MANIFEST_BYTES):await boundedBytes(manifestURL,MAX_MANIFEST_BYTES,fetcher,{error:'Published world manifest is unavailable.'});
 if(await repositoryDigest(bytes)!==config.contentDigest)throw Error('World manifest does not match the deployment pin.');
 const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(manifest.world?.worldId!==config.worldId)throw Error('World identity does not match the deployment pin.');
 progress('manifest-verified');
 if(app.host.generation!==generation)return null;
 const options={expectedWorldId:config.worldId,expectedContentDigest:config.contentDigest,onProgress:progress};
 if(!bundled)options.fetch=(request,requestOptions)=>request===manifestURL?Promise.resolve(new Response(bytes)):fetcher(request,requestOptions);
 const activated=await app.load(pinned,options),active=app.host.active;
 if(!activated||!active||active.identity.worldId!==config.worldId||active.identity.contentDigest!==config.contentDigest||!bundled&&active.identity.resolvedCommit!==pinned.commit)return null;
 if(!await app.portals.activateOffline(active)||app.host.active!==active)return null;
 progress('world-ready');
 return active;
}
