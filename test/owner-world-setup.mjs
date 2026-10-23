import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {initOwnerSetup,inviteOwnerSetup,acceptOwnerSetup,finalizeOwnerSetup} from '../tools/networking/owner-world-setup.mjs';
import {newIdentity,assetId,signObject} from '../network/identity.mjs';
import {OwnerWorldAuthority} from '../network/owner-world-authority.mjs';
import {createWorld,packWorldRepository} from '../src/world-runtime/vendor/world-engine-contract.js';
const git=(r,...args)=>execFileSync('git',['-C',r,...args],{encoding:'utf8'}).trim();
async function fixtures(t){
 const dir=await mkdtemp(join(tmpdir(),'owner-setup-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const projects=[createWorld('Owner A'),createWorld('Owner B')],worlds=[];
 for(let i=0;i<2;i++){const p=projects[i],d=projects[1-i];p.portals=[{id:'elsemesh-portal:setup-'+i,name:'Door',position:[0,1.5,i?10:0],yaw:0,width:3,height:3,destination:{worldId:d.metadata.worldId,regionId:d.metadata.regionId,portalId:'elsemesh-portal:setup-'+(1-i)},enabled:true,view:{enabled:true,maxDistance:20},traversal:{enabled:true},policyRef:'public',visual:{frameColor:'#ffffff',unavailableColor:'#555555'}}];}
 for(let i=0;i<2;i++){const root=join(dir,'world-'+i),web=join(dir,'web-'+i),stateDir=join(dir,'state-'+i);await mkdir(root);await mkdir(web);await writeFile(join(web,'worlds.html'),'Fixture app');
  for(const[p,b]of await packWorldRepository(projects[i])){await mkdir(dirname(join(root,p)),{recursive:true});await writeFile(join(root,p),b);}
  git(root,'init','-q');git(root,'add','.');git(root,'-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','fixture');
  worlds.push({stateDir,worldRoot:root,staticRoot:web,commit:git(root,'rev-parse','HEAD')});
 }
 return{dir,worlds,projects};
}
async function connected(t){
 const f=await fixtures(t),contacts=await Promise.all(f.worlds.map(initOwnerSetup));
 const invitations=await Promise.all(f.worlds.map((w,i)=>inviteOwnerSetup({stateDir:w.stateDir,peerContact:contacts[1-i],peerOwnerNodeId:contacts[1-i].signer})));
 const acceptances=await Promise.all(f.worlds.map((w,i)=>acceptOwnerSetup({stateDir:w.stateDir,invitation:invitations[1-i]})));
 return{...f,contacts,invitations,acceptances};
}
test('distinct local keys and two-direction public consent produce one-world configs and distinct ledgers',async t=>{
 const f=await connected(t),player=newIdentity(),enrollment=[{nodeId:player.nodeId,label:'Traveler',view:true,enter:true}],configs=[];
 for(let i=0;i<2;i++){
  const config=await finalizeOwnerSetup({stateDir:f.worlds[i].stateDir,peerAcceptance:f.acceptances[1-i],enrollment,avatarAssetId:assetId(Buffer.from('repository-avatar/1')),inventoryHash:assetId(Buffer.from('empty'))});configs.push(config);
  const owner=JSON.parse(await readFile(join(f.worlds[i].stateDir,'owner.json'))),identity=JSON.parse(await readFile(join(f.worlds[i].stateDir,'authority.json')));
  assert.notEqual(owner.nodeId,identity.nodeId);assert.equal(owner.nodeId,f.contacts[i].signer);
  assert.equal(config.worlds.length,1);assert.equal(config.contacts.length,2);assert.equal(config.peers.length,2);
  assert.equal(config.worlds[0].worldId,f.projects[i].metadata.worldId);
  assert.ok(config.worlds[0].published.descriptor.assets.some(a=>a.assetId==='sha256:'+f.contacts[i].descriptor.contentDigest));
  const authority=await OwnerWorldAuthority.open({identity,published:config.worlds[0].published,delegation:config.worlds[0].delegation,trustedOwners:config.trustedOwners,peers:config.peers,policy:config.policy,ledgerPath:config.ledgerPath,readWorld:async()=>null,clearance:async()=>true,rpc:async()=>null});
  assert.equal(authority.portals.size,2);await authority.close();
  if(process.platform!=='win32')assert.equal((await stat(join(f.worlds[i].stateDir,'owner.json'))).mode&0o777,0o600);
  assert.doesNotMatch(JSON.stringify(f.contacts[i]),/privateKey|state-|world-0|world-1/);
  assert.equal(git(f.worlds[i].worldRoot,'status','--porcelain'),'');
 }
 assert.notEqual(configs[0].ledgerPath,configs[1].ledgerPath);
 assert.notEqual(f.contacts[0].authorityNodeId,f.contacts[1].authorityNodeId);
});
test('wrong owner pin, tampered contact and state overlap fail before provisioning or trust import',async t=>{
 const f=await fixtures(t),a=await initOwnerSetup(f.worlds[0]),b=await initOwnerSetup(f.worlds[1]);
 await assert.rejects(initOwnerSetup({...f.worlds[0],stateDir:join(f.worlds[0].worldRoot,'private')}),/disjoint/);
 await assert.rejects(inviteOwnerSetup({stateDir:f.worlds[0].stateDir,peerContact:b,peerOwnerNodeId:a.signer}),/pin/);
 await assert.rejects(inviteOwnerSetup({stateDir:f.worlds[0].stateDir,peerContact:{...b,authorityNodeId:a.authorityNodeId},peerOwnerNodeId:b.signer}),/pin/);
 await assert.rejects(initOwnerSetup(f.worlds[0]),/EEXIST/);
});
test('wrong acceptance, missing enrollment and overly permissive malformed enrollment fail closed',async t=>{
 const f=await connected(t),player=newIdentity(),base={stateDir:f.worlds[0].stateDir,peerAcceptance:f.acceptances[1],enrollment:[{nodeId:player.nodeId,label:'Visitor',view:true,enter:false}],avatarAssetId:assetId(Buffer.from('avatar')),inventoryHash:assetId(Buffer.from('empty'))};
 await assert.rejects(finalizeOwnerSetup({...base,peerAcceptance:f.acceptances[0]}),/owner|mismatch|signature/);
 await assert.rejects(finalizeOwnerSetup({...base,enrollment:[]}),/enrollment/);
 await assert.rejects(finalizeOwnerSetup({...base,enrollment:[{nodeId:player.nodeId,label:'Visitor',view:false,enter:true}]}),/policy/);
 const config=await finalizeOwnerSetup(base);assert.deepEqual(config.policy.enterPlayers,[]);
 await assert.rejects(finalizeOwnerSetup(base),/EEXIST/);
});
test('signed contact without actual manifest asset binding is rejected',async t=>{
 const f=await fixtures(t),contacts=await Promise.all(f.worlds.map(initOwnerSetup));
 const owner=JSON.parse(await readFile(join(f.worlds[1].stateDir,'owner.json'))),contact=structuredClone(contacts[1]);
 const {publishRegion}=await import('../network/federation.mjs');contact.descriptor.published=publishRegion({...contact.descriptor.published.descriptor,assets:[]},owner);
 const {signature,publicKey,signer,...body}=contact;
 const resigned=signObject(body,owner);
 await assert.rejects(inviteOwnerSetup({stateDir:f.worlds[0].stateDir,peerContact:resigned,peerOwnerNodeId:owner.nodeId}),/manifest digest/);
});
