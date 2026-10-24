import {mkdir,readFile,writeFile,realpath,lstat} from 'node:fs/promises';
import {resolve,join,relative,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {loadOrCreateIdentity,nodeId,signObject,verifyObject,canonical,assetId} from '../../network/identity.mjs';
import {publishRegion,issueDelegation,verifyRegionVersion,verifyDelegation,createPortalInvitation,acceptPortalInvitation,verifyPortalInvitation} from '../../network/federation.mjs';
import {repositoryFederationPortal} from '../../network/repository-federation.mjs';
import {pinnedRepository,prepareRepositoryConfig} from './repository-world-server.mjs';
import {createOwnerWorldRuntime} from './owner-world-runtime.mjs';
import {issueObjectAdminDelegation} from '../../network/owner-object-access.mjs';
import {loadWorldSource} from '../../src/world-runtime/vendor/world-engine-contract.js';
const check=(ok,m)=>{if(!ok)throw Error(m);};
const protocol='elsemesh.owner-contact/1';
const applicationRoot=fileURLToPath(new URL('../../',import.meta.url));
async function existingIdentity(file){const identity=await json(file);check(typeof identity.privateKeyPem==='string'&&nodeId(identity.publicKeyPem)===identity.nodeId&&verifyObject(signObject({kind:'owner-setup-key-check'},identity),new Set([identity.nodeId])),'Invalid existing owner key');return identity;}
const publicOnly=v=>{const text=JSON.stringify(v);check(!/privateKey|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/.test(text),'Private key material is forbidden in exchange files');return v;};
const json=async file=>{const s=await lstat(file);check(s.isFile()&&!s.isSymbolicLink()&&s.size<=2*1024*1024,'Invalid setup input file');return JSON.parse(await readFile(file,'utf8'));};
const output=async(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
function disjoint(a,b){const norm=x=>process.platform==='win32'?x.toLowerCase():x;const aa=norm(a),bb=norm(b),inside=(x,y)=>{const r=relative(x,y);return r===''||(!r.startsWith('..')&&!r.includes(':'));};check(!inside(aa,bb)&&!inside(bb,aa),'State, static application and world repository paths must be disjoint');}
async function state(stateDir){const dir=await realpath(stateDir),checkpoint=await json(join(dir,'checkpoint.json'));check(checkpoint.protocol==='elsemesh.owner-setup/1','Unknown setup checkpoint');disjoint(dir,await realpath(checkpoint.world.root));disjoint(dir,await realpath(checkpoint.staticRoot));disjoint(dir,await realpath(applicationRoot));return{dir,checkpoint};}
function contactValid(contact,owner){
 publicOnly(contact);check(contact?.protocol===protocol&&contact.signer===owner&&verifyObject(contact,new Set([owner])),'Public contact owner pin/signature rejected');
 const d=contact.descriptor,r=verifyRegionVersion(d.published,new Set([owner])),delegation=verifyDelegation(contact.delegation,d.published,new Set([owner]));
 check(nodeId(contact.publicKeyPem)===contact.authorityNodeId&&contact.authorityNodeId!==owner&&r.ownerNodeId===owner&&r.authority.nodeId===contact.authorityNodeId&&delegation.hostNodeId===contact.authorityNodeId&&delegation.permission==='AUTHORITY','Contact authority/delegation mismatch');
 check(d.epoch===r.authority.epoch&&d.worldId===d.binding.authoredWorldId&&d.regionId===d.binding.authoredRegionId&&d.contentDigest===d.binding.contentDigest&&d.binding.authorityNodeId===contact.authorityNodeId&&d.binding.authorityEpoch===d.epoch&&d.binding.federationWorldId===r.worldId&&d.binding.federationRegionId===r.regionId&&d.binding.serverId===contact.authorityNodeId&&d.binding.expiresAt>Date.now()&&verifyObject(d.binding,new Set([owner])),'Contact content admission mismatch');
 check(r.assets.some(a=>a.assetId==='sha256:'+d.contentDigest.replace(/^sha256:/,'')),'Region must bind actual authored manifest digest as an asset');
 check(Array.isArray(contact.portals)&&contact.portals.length===1&&r.portals.length===1&&r.portals[0]===contact.portals[0].id,'Exactly one authored directional portal is required');
 return contact;
}
const adapter=c=>({federationRegionId:c.descriptor.published.descriptor.regionId,region:c.descriptor.published.descriptor});
function portalFor(source,destination){
 const p=source.portals[0],exit=destination.portals.find(x=>x.id===p.destination?.portalId);
 check(p.destination?.worldId===destination.descriptor.worldId&&p.destination.regionId===destination.descriptor.regionId&&exit&&p.enabled&&p.traversal?.enabled!==false,'Authored portal destination does not match pinned peer');
 return repositoryFederationPortal(adapter(source),adapter(destination),p,exit);
}
export async function initOwnerSetup({stateDir,worldRoot,commit,staticRoot,expiresAt=Date.now()+24*3600000}={}){
 const root=await realpath(worldRoot),web=await realpath(staticRoot),parent=await realpath(dirname(resolve(stateDir))),dir=join(parent,resolve(stateDir).split(/[\\/]/).at(-1));
 disjoint(dir,root);disjoint(dir,web);disjoint(root,web);disjoint(dir,await realpath(applicationRoot));check(Number.isSafeInteger(expiresAt)&&expiresAt>Date.now()&&expiresAt<=Date.now()+7*86400000,'Admission expiry must be within seven days');
 const loaded=await loadWorldSource(await pinnedRepository(root,commit)),p=loaded.project;
 check((p.portals??[]).length===1,'Exactly one pinned authored portal required');
 await mkdir(dir,{mode:0o700}); // New directory only: an incomplete checkpoint is never silently reused.
 const owner=await loadOrCreateIdentity(join(dir,'owner.json')),authority=await loadOrCreateIdentity(join(dir,'authority.json'));
 check(owner.nodeId!==authority.nodeId,'Owner and runtime authority must be distinct');
 const federationWorldId=p.metadata.worldId.replace('elsemesh.world:','elsemesh-world:'),federationRegionId=p.metadata.regionId.replace('elsemesh.region:','elsemesh-region:');
 const region={protocol:'elsemesh.region/1',worldId:federationWorldId,regionId:federationRegionId,version:1,ownerPlayerId:'player:'+owner.nodeId.split(':')[1],ownerNodeId:owner.nodeId,admins:[],hosts:[authority.nodeId],authority:{nodeId:authority.nodeId,epoch:1},rules:{gravity:1,avatarScale:1,environmentScale:1,timeOfDay:'LOCAL',weapons:'DISALLOW',movement:['WALK','RUN','JUMP','SWIM'],requiredCapabilities:['elsemesh.handoff/2']},assets:[{assetId:'sha256:'+loaded.identity.contentDigest.replace(/^sha256:/,''),mediaType:'application/octet-stream'}],portals:p.portals.map(x=>x.id),participants:{players:[],npcs:[]}};
 const published=publishRegion(region,owner),binding=signObject({kind:'elsemesh.world-content-admission/1',authoredWorldId:p.metadata.worldId,authoredRegionId:p.metadata.regionId,contentDigest:loaded.identity.contentDigest,federationWorldId,federationRegionId,authorityNodeId:authority.nodeId,authorityEpoch:1,serverId:authority.nodeId,sessionEpoch:'owner-local:'+randomUUID(),expiresAt},owner);
 const descriptor={worldId:p.metadata.worldId,regionId:p.metadata.regionId,name:p.metadata.name,contentDigest:loaded.identity.contentDigest,epoch:1,binding,published};
 const delegation=issueDelegation(owner,{regionId:federationRegionId,hostNodeId:authority.nodeId,permission:'AUTHORITY',expiresAt,version:1});
 const contact=signObject({protocol,authorityNodeId:authority.nodeId,publicKeyPem:authority.publicKeyPem,descriptor,delegation,portals:p.portals},owner);
 contactValid(contact,owner.nodeId);
 const world={...descriptor,root,commit,ownerNodeId:owner.nodeId,federationWorldId,federationRegionId,delegation,portals:p.portals};
 await output(join(dir,'checkpoint.json'),{protocol:'elsemesh.owner-setup/1',staticRoot:web,world,ownerNodeId:owner.nodeId,authorityNodeId:authority.nodeId,contact});
 await output(join(dir,'contact.json'),contact);return contact;
}
export async function inviteOwnerSetup({stateDir,peerContact,peerOwnerNodeId}={}){
 const{dir,checkpoint:c}=await state(stateDir),peer=contactValid(peerContact,peerOwnerNodeId),local=contactValid(c.contact,c.ownerNodeId);
 check(peer.signer!==local.signer&&peer.authorityNodeId!==local.authorityNodeId&&peer.descriptor.worldId!==local.descriptor.worldId,'Owners, authorities and worlds must be distinct');
 portalFor(peer,local);const portal=portalFor(local,peer),owner=await existingIdentity(join(dir,'owner.json'));
 check(owner.nodeId===c.ownerNodeId,'Local owner key mismatch');
 const invitation=createPortalInvitation(owner,portal,Math.min(c.world.binding.expiresAt,Date.now()+86400000));
 await output(join(dir,'connected.json'),{peer,invitation});
 await output(join(dir,'invitation.json'),invitation);return invitation;
}
export async function acceptOwnerSetup({stateDir,invitation}={}){
 const{dir,checkpoint:c}=await state(stateDir),connected=await json(join(dir,'connected.json')),peer=contactValid(connected.peer,connected.peer.signer);
 publicOnly(invitation);check(verifyObject(invitation,new Set([peer.signer]))&&canonical(invitation.portal)===canonical(portalFor(peer,c.contact)),'Incoming invitation differs from pinned authored portal');
 const owner=await existingIdentity(join(dir,'owner.json'));check(owner.nodeId===c.ownerNodeId,'Local owner key mismatch');
 const acceptance=acceptPortalInvitation(owner,invitation,new Set([peer.signer]));
 await output(join(dir,'incoming.json'),{invitation,acceptance});await output(join(dir,'acceptance.json'),acceptance);return acceptance;
}
export async function finalizeOwnerSetup({stateDir,peerAcceptance,enrollment,avatarAssetId,inventoryHash,capacity=16}={}){
 const{dir,checkpoint:c}=await state(stateDir),connected=await json(join(dir,'connected.json')),incoming=await json(join(dir,'incoming.json')),local=contactValid(c.contact,c.ownerNodeId),peer=contactValid(connected.peer,connected.peer.signer),trustedOwners=[local.signer,peer.signer];
 publicOnly(peerAcceptance);
 verifyPortalInvitation(connected.invitation,peerAcceptance,{sourceRegion:local.descriptor.published.descriptor,destinationRegion:peer.descriptor.published.descriptor,trustedOwners:new Set(trustedOwners)});
 verifyPortalInvitation(incoming.invitation,incoming.acceptance,{sourceRegion:peer.descriptor.published.descriptor,destinationRegion:local.descriptor.published.descriptor,trustedOwners:new Set(trustedOwners)});
 check(canonical(connected.invitation.portal)===canonical(portalFor(local,peer))&&canonical(incoming.invitation.portal)===canonical(portalFor(peer,local)),'Portal checkpoint drift');
 check(Array.isArray(enrollment)&&enrollment.length>0&&enrollment.length<=128&&Number.isInteger(capacity)&&capacity>0&&capacity<=128,'Explicit enrollment and capacity required');
 const players={},policy={viewPlayers:[],enterPlayers:[],capacity};
 for(const p of enrollment){check(p&&/^elsemesh-node:[0-9a-f]{64}$/.test(p.nodeId)&&!players[p.nodeId]&&typeof p.label==='string'&&p.label.length>0&&p.label.length<=80&&typeof p.view==='boolean'&&typeof p.enter==='boolean'&&(!p.enter||p.view),'Invalid explicit enrolled player policy');players[p.nodeId]={label:p.label};const id='player:'+p.nodeId.split(':')[1];if(p.view)policy.viewPlayers.push(id);if(p.enter)policy.enterPlayers.push(id);}
 check([avatarAssetId,inventoryHash].every(x=>/^sha256:[0-9a-f]{64}$/.test(x)),'Explicit validated avatar and inventory hashes required');
 const contact=x=>({worldId:x.descriptor.worldId,authorityNodeId:x.authorityNodeId,publicKeyPem:x.publicKeyPem,descriptor:x.descriptor});
 const config={protocol:'elsemesh.owner-runtime/1',worlds:[{...c.world,portals:c.world.portals.map(p=>({...p,invitation:connected.invitation,acceptance:peerAcceptance}))}],trustedOwners,contacts:[contact(local),contact(peer)],peers:[{published:peer.descriptor.published,delegation:peer.delegation,invitation:connected.invitation,acceptance:peerAcceptance},{published:peer.descriptor.published,delegation:peer.delegation,...incoming}],players,policy,ledgerPath:join(dir,'ledger.sqlite'),avatarAssetId,inventoryHash};
 const authority=await existingIdentity(join(dir,'authority.json'));check(authority.nodeId===c.authorityNodeId,'Local authority key mismatch');
 await prepareRepositoryConfig(config,authority);await output(join(dir,'config.json'),config);return config;
}
export async function delegateObjectAdmin({stateDir,playerNodeId}={}){
 const{dir,checkpoint:c}=await state(stateDir),config=await json(join(dir,'config.json')),owner=await existingIdentity(join(dir,'owner.json'));
 check(owner.nodeId===c.ownerNodeId&&Object.hasOwn(config.players,playerNodeId),'Administrator must be an explicitly enrolled browser identity');
 const delegation=issueObjectAdminDelegation(owner,{worldId:c.world.worldId,contentDigest:c.world.contentDigest,authorityNodeId:c.authorityNodeId,authorityEpoch:c.world.epoch,playerNodeId,expiresAt:c.world.binding.expiresAt});
 const file=join(dir,'object-admin-delegations.json');let previous=[];try{previous=await json(file);}catch(e){if(e.code!=='ENOENT')throw e;}
 check(Array.isArray(previous)&&previous.length<128,'Invalid administrator delegation store');
 await writeFile(file,JSON.stringify([...previous.filter(d=>d.playerNodeId!==playerNodeId),delegation],null,2)+'\n',{mode:0o600});
 return delegation;
}
export async function startOwnerSetup({stateDir,port=5201,relayUrl='ws://127.0.0.1:18891'}={}){
 const{dir,checkpoint:c}=await state(stateDir),config=await json(join(dir,'config.json')),identity=await existingIdentity(join(dir,'authority.json'));
 check(config.worlds.length===1&&config.contacts.length===2&&config.peers.length===2&&config.ledgerPath===join(dir,'ledger.sqlite')&&identity.nodeId===c.authorityNodeId,'Finalized owner config mismatch');
 let objectAdminDelegations=[];try{objectAdminDelegations=await json(join(dir,'object-admin-delegations.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
 return createOwnerWorldRuntime({root:c.staticRoot,config:{...config,objectAdminDelegations},identity,port,relayUrl});
}
async function cli(){
 if(process.argv[2]==='--help'){console.log('Owner world setup: init, invite/connect, accept, finalize, delegate-admin, start. See docs/owner-world-setup.md. All options use --name value; keys are generated only by init on the owner machine.');return;}
 const[command,...args]=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){check(args[i]?.startsWith('--')&&args[i+1]&&!args[i+1].startsWith('--'),'Options require --name value');check(!Object.hasOwn(options,args[i]),'Duplicate option');options[args[i]]=args[i+1];}
 const allowed={init:['--state-dir','--world-root','--commit','--static-root'],invite:['--state-dir','--peer-contact','--peer-owner'],connect:['--state-dir','--peer-contact','--peer-owner'],accept:['--state-dir','--invitation'],finalize:['--state-dir','--peer-acceptance','--enrollment','--avatar-asset-id','--inventory-hash','--capacity'],'delegate-admin':['--state-dir','--player-node'],start:['--state-dir','--port','--relay-url']};check(allowed[command]&&Object.keys(options).every(k=>allowed[command].includes(k)),'Unknown command or option');
 const stateDir=options['--state-dir'];check(stateDir,'--state-dir required');
 let result;
 if(command==='init')result=await initOwnerSetup({stateDir,worldRoot:options['--world-root'],commit:options['--commit'],staticRoot:options['--static-root']});
 else if(command==='invite'||command==='connect')result=await inviteOwnerSetup({stateDir,peerContact:await json(options['--peer-contact']),peerOwnerNodeId:options['--peer-owner']});
 else if(command==='accept')result=await acceptOwnerSetup({stateDir,invitation:await json(options['--invitation'])});
 else if(command==='finalize')result=await finalizeOwnerSetup({stateDir,peerAcceptance:await json(options['--peer-acceptance']),enrollment:await json(options['--enrollment']),avatarAssetId:options['--avatar-asset-id'],inventoryHash:options['--inventory-hash'],capacity:Number(options['--capacity']??16)});
 else if(command==='delegate-admin')result=await delegateObjectAdmin({stateDir,playerNodeId:options['--player-node']});
 else if(command==='start'){const runtime=await startOwnerSetup({stateDir,port:Number(options['--port']??5201),relayUrl:options['--relay-url']??'ws://127.0.0.1:18891'});for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>runtime.close().then(()=>process.exit(0)));console.log(JSON.stringify({status:'LOCAL_OWNER_RUNTIME_STARTED',worldId:runtime.config.defaultWorldId,address:runtime.address}));return;}
 else throw Error('Command must be init, invite/connect, accept, finalize or start');
 console.log(JSON.stringify({status:command==='finalize'?'LOCAL_OWNER_CONFIG_READY_NOT_STARTED':'OWNER_SETUP_PHASE_READY',ownerNodeId:result.signer,worldId:result.descriptor?.worldId??result.worlds?.[0].worldId}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)cli().catch(error=>{console.error('Owner setup failed ['+(error.code??error.name)+']: '+String(error.message).slice(0,400));process.exitCode=1;});
