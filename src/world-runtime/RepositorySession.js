import { PrivateNeonClient, privateNeonIdentity, privateNeonMatchesWorld, canonical, admitFederatedRuntimeWorld } from './vendor/world-engine-contract.js';
const encoder=new TextEncoder();
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
async function verifySigned(proof,trustedOwners){
 if(!plain(proof)||typeof proof.publicKey!=='string'||proof.publicKey.length>2000||typeof proof.signature!=='string'||proof.signature.length>256||typeof proof.signer!=='string'||!trustedOwners.has(proof.signer))return false;
 try{
  const der=Uint8Array.from(atob(proof.publicKey.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',der)),v=>v.toString(16).padStart(2,'0')).join('');
  if(proof.signer!=='elsemesh-node:'+digest)return false;
  const key=await crypto.subtle.importKey('spki',der,{name:'Ed25519'},false,['verify']);
  const {signature,...payload}=proof;
  return await crypto.subtle.verify('Ed25519',key,Uint8Array.from(atob(signature),c=>c.charCodeAt(0)),encoder.encode(canonical(payload)));
 }catch{return false;}
}
/** Runtime operator trust and WebSocket state never enter authored world content. */
export class RepositorySession{
 constructor(host,{trustedOwners=new Set(),onStatus=()=>{}}={}){this.host=host;this.trustedOwners=new Set(trustedOwners);this.onStatus=onStatus;this.client=null;this.snapshot=null;this.generation=0;this.connected=false;}
 async publicIdentity(){const identity=await privateNeonIdentity();return {nodeId:identity.nodeId,publicKey:identity.publicKey};}
 async connect({binding,region}){
  this.disconnect();const generation=this.generation;
  if(encoder.encode(JSON.stringify({binding,region})).length>100000)throw new Error('Runtime admission exceeds its size limit.');
  const project=this.host.getAuthoredProject(),identity=this.host.active?.identity;
  if(!project||!identity)throw new Error('Open a world before connecting a runtime session.');
  const [bindingOK,regionOK]=await Promise.all([verifySigned(binding,this.trustedOwners),verifySigned(region,this.trustedOwners)]);
  if(generation!==this.generation)return false;
  if(!bindingOK||!regionOK||region.kind!=='region-version'||!plain(region.descriptor))throw new Error('Runtime admission must be signed by an explicitly trusted owner.');
  const descriptor=region.descriptor;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(canonical(descriptor)))),v=>v.toString(16).padStart(2,'0')).join('');
  if(region.manifestHash!=='sha256:'+hash||descriptor.protocol!=='elsemesh.region/1'||descriptor.ownerNodeId!==region.signer||!plain(descriptor.authority)||!Number.isSafeInteger(descriptor.authority.epoch)||typeof binding.serverId!=='string'||!binding.serverId||binding.serverId.length>256||typeof binding.sessionEpoch!=='string'||!binding.sessionEpoch||binding.sessionEpoch.length>100||!Number.isSafeInteger(binding.expiresAt)||binding.expiresAt<=Date.now()||binding.expiresAt>Date.now()+86400000)throw new Error('Region hash, owner, authority or admitted server identity is invalid.');
  if(generation!==this.generation)return false;
  // The installed runtime verifies both signatures before invoking the data contract.
  admitFederatedRuntimeWorld(project,identity.contentDigest,binding,region,{verifyBinding:p=>p===binding&&bindingOK,verifyRegion:p=>{if(p!==region||!regionOK)throw new Error('Untrusted region');return region.descriptor;}});
  const worldId=project.metadata.worldId,signIds=project.objects.filter(o=>o.kind==='neon-sign').map(o=>o.id);
  const client=new PrivateNeonClient({
   status:status=>{if(generation!==this.generation)return;this.connected=status==='Connected';if(!this.connected){this.snapshot=null;this.host.setRuntimeOverlay(null);}this.onStatus(status);},
   error:error=>{if(generation!==this.generation)return;this.onStatus(error);},
   snapshot:(snapshot,offsetMs)=>{
    if(generation!==this.generation)return;
    if(this.host.getAuthoredProject()?.metadata.worldId!==worldId||this.host.active?.identity.contentDigest!==identity.contentDigest||!privateNeonMatchesWorld(snapshot,worldId,signIds)||(snapshot.serverId!==binding.serverId||snapshot.epoch!==binding.sessionEpoch)){
     this.disconnect();this.onStatus('Session identity/content changed; admission must be reviewed again.');return;
    }
    this.snapshot=snapshot;this.host.setRuntimeOverlay({...snapshot,offsetMs});
   },
  });
  this.client=client;await client.connect();return generation===this.generation;
 }
 setPower(id,powered){if(!this.client||!this.snapshot||!this.connected)throw new Error('Connect the admitted runtime session first.');this.client.setPower(id,powered);}
 setConfig(id,config){if(!this.client||!this.snapshot||!this.connected)throw new Error('Connect the admitted runtime session first.');this.client.setConfig(id,config);}
 disconnect(){this.generation++;const client=this.client;this.client=null;this.snapshot=null;this.connected=false;client?.disconnect();this.host.setRuntimeOverlay(null);this.onStatus('Offline');}
 dispose(){this.disconnect();}
}
export {verifySigned as verifyRuntimeSignature};
