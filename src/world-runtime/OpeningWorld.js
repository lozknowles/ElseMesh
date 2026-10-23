import {parseGitHubWorldLocation,resolveGitHubWorldSource,repositoryDigest} from './vendor/world-engine-contract.js';

// Deployment metadata selects content; the reusable engine contains no opening world.
export function validateOpeningWorld(config){
 if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(k=>!['schema','repository','worldId','contentDigest'].includes(k))||config.schema!=='elsemesh.opening-world/1')throw Error('Unsupported opening-world configuration.');
 const source=parseGitHubWorldLocation(config.repository);
 if(!/^[a-f0-9]{40}$/.test(source.ref??''))throw Error('Opening world must use an immutable full Git commit.');
 if(typeof config.worldId!=='string'||!/^elsemesh\.world:[A-Za-z0-9._:-]{1,120}$/.test(config.worldId)||!/^[a-f0-9]{64}$/.test(config.contentDigest??''))throw Error('Opening world identity or digest is invalid.');
 return {config,source};
}
export async function readOpeningWorld({fetcher=fetch,baseURL=location.href}={}){
 const url=new URL('./opening-world.json',baseURL),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let reader;
 try{
  const response=await fetcher(url,{credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
  if(response.status===404)return null;
  if(!response.ok||response.redirected)throw Error('Opening-world configuration is unavailable ('+response.status+').');
  const length=response.headers.get('content-length');if(length!==null&&!/^\d+$/.test(length))throw Error('Opening-world configuration length is invalid.');
  if(!response.body)throw Error('Opening-world configuration has no body.');reader=response.body.getReader();const chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8192)throw Error('Opening-world configuration exceeds 8 KB.');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const {config}=validateOpeningWorld(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));return config;
 }finally{clearTimeout(timer);if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
}
export async function loadOpeningWorld(app,config){
 const generation=app.host.generation;
 const {source}=validateOpeningWorld(config);
 const pinned=await resolveGitHubWorldSource(source),url=`https://raw.githubusercontent.com/${pinned.owner}/${pinned.repository}/${pinned.commit}/${pinned.path?pinned.path+'/':''}world.json`;
 // Check exact manifest bytes before the shared loader hydrates any referenced content.
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let reader,bytes;
 try{
  const response=await fetch(url,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!response.ok||response.redirected||(response.url&&response.url!==url))throw Error('Published world manifest is unavailable.');
  const length=response.headers.get('content-length');if(length!==null&&!/^\d+$/.test(length))throw Error('World manifest length is invalid.');
  if(!response.body)throw Error('World manifest has no body.');reader=response.body.getReader();const chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1048576)throw Error('World manifest exceeds 1 MB.');chunks.push(part.value);}
  bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 }finally{clearTimeout(timer);if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
 if(await repositoryDigest(bytes)!==config.contentDigest)throw Error('World manifest does not match the deployment pin.');
 const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(manifest.world?.worldId!==config.worldId)throw Error('World identity does not match the deployment pin.');
 if(app.host.generation!==generation)return null;
 const activated=await app.load(pinned,{expectedWorldId:config.worldId,expectedContentDigest:config.contentDigest,fetch:(request,options)=>request===url?Promise.resolve(new Response(bytes)):fetch(request,options)});
 const active=app.host.active;
 if(!activated||!active||active.identity.worldId!==config.worldId||active.identity.contentDigest!==config.contentDigest||active.identity.resolvedCommit!==pinned.commit)return null;
 if(!await app.portals.activateOffline(active)||app.host.active!==active)return null;
 return active;
}
