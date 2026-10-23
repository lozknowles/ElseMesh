import { isRepositoryContentPath } from './LocalRepositoryFiles.js';
/** Static repository deployments share the application's origin. The common
 * manifest loader verifies all bytes, schema, capability and content digests. */
export function hostedRepositorySource(input,options={}){
 const origin=options.origin??globalThis.location?.origin,baseURL=options.baseURL??globalThis.location?.href??origin;
 if(typeof input!=='string'||!input.trim()||input.length>2000||/[\\\s%?#]/.test(input)||input.split('/').some(part=>part==='.'||part==='..'))throw Error('Use a safe same-origin repository directory URL without credentials, query or fragment.');
 let root;try{root=new URL(input,baseURL);}catch{throw Error('Repository directory URL is invalid.');}
 if(!origin||root.origin!==origin||!['http:','https:'].includes(root.protocol)||root.username||root.password||root.search||root.hash)throw Error('Hosted repository must use this application origin without credentials.');
 if(root.pathname.includes('//')||root.pathname.split('/').some(part=>part&&(!/^[A-Za-z0-9._-]+$/.test(part)||part==='.git')))throw Error('Repository directory contains an unsafe path segment.');
 if(!root.pathname.endsWith('/'))root.pathname+='/';
 const timeoutMs=options.timeoutMs??15000;if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Repository timeout must be between 1 and 30000 ms.');
 const fetcher=options.fetch??globalThis.fetch;
 return {kind:'local',label:'hosted:'+root.pathname,read:async(path,maxBytes)=>{
  if(!isRepositoryContentPath(path))throw Error('Repository content path is not allowed.');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Repository byte limit is invalid.');
  const url=new URL(path,root).href,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let reader;
  try{
   const response=await fetcher(url,{signal:controller.signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok||response.redirected||(response.url&&response.url!==url))throw Error('Hosted repository request failed or redirected ('+response.status+').');
   const length=response.headers.get('content-length');// Transfer length may be compressed; enforce the decoded byte budget below.
   if(length!==null&&!/^\d+$/.test(length))throw Error('Hosted repository response length is invalid.');
   if(!response.body)throw Error('Hosted repository response has no readable body.');reader=response.body.getReader();const chunks=[];let total=0;
   for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>maxBytes)throw Error('Hosted repository stream exceeds its byte limit.');chunks.push(part.value);}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
  }finally{clearTimeout(timer);if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
 }};
}
