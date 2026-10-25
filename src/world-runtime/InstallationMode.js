import {readDeploymentJSON,readPublishedWorldCatalog} from './PublishedWorldCatalog.js';
/** Resolve ONCE before graphics initialization. Errors never downgrade to public mode. */
export async function resolveInstallationMode({fetcher=fetch,baseURL=location.href}={}){
 const value=await readDeploymentJSON(new URL('/runtime-config',baseURL),{fetcher,maxBytes:65536,optional:true});
 if(value!==null){
  if(!value||typeof value!=='object'||Array.isArray(value)||!['elsemesh.owner-runtime/1','elsemesh.repository-runtime/1'].includes(value.protocol)||value.endpoint!=='/__worlds'||!Array.isArray(value.trustedOwners)||value.trustedOwners.length<1||value.trustedOwners.length>16||!value.trustedOwners.every(x=>typeof x==='string'&&x.length>0))throw Error('Unsupported runtime installation configuration');
  return Object.freeze({kind:'network',runtimeConfig:value});
 }
 const catalog=await readPublishedWorldCatalog({fetcher,baseURL});return Object.freeze(catalog?{kind:'published',catalog}:{kind:'legacy'});
}
