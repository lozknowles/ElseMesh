import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OwnerWorldLedger} from '../network/owner-world-ledger.mjs';
import {newIdentity,verifyObject} from '../network/identity.mjs';
import {OwnerObjectAccess,normalizeObjectAccess,issueObjectAdminDelegation} from '../network/owner-object-access.mjs';
const object=(id,kind,position=[0,0,0],extra={})=>({id,kind,position,rotation:[0,0,0],scale:[1,1,1],visible:true,...extra});
const project=()=>({objects:[object('computer','computer',[0,0,0],{computer:{targetSignId:'sign'}}),object('sign','neon-sign',[1,0,0],{neon:{powered:true}}),object('other','neon-sign',[2,0,0],{neon:{powered:true}}),object('retro','box')],terminals:[{id:'terminal',objectId:'retro',interactionRadius:3}]});
test('authored policy admission boundaries',async(t)=>{
 const p=project(),legacy=normalizeObjectAccess(p);
 await t.test('absent policy alone derives supported legacy actions',()=>{assert.equal(legacy.policyMode,'Legacy world defaults');assert.ok(legacy.rules.some(r=>r.objectId==='retro'&&r.actions.includes('computer.use')));
 });
 await t.test('explicit empty policy denies every object action',()=>{
 p.objectAccess={schema:'elsemesh.object-access/1',rules:[]};assert.deepEqual(normalizeObjectAccess(p).rules,[]);assert.notEqual(normalizeObjectAccess(p).policyDigest,legacy.policyDigest);
 });
 await t.test('null, unknown schemas, unsupported actions and wrong references reject',()=>{
 for(const bad of [null,{schema:'unknown',rules:[]},{schema:'elsemesh.object-access/1',rules:[{objectId:'missing',actions:['computer.use']}]},{schema:'elsemesh.object-access/1',rules:[{objectId:'computer',actions:['neon.power']}]}])assert.throws(()=>normalizeObjectAccess({...p,objectAccess:bad}));
 });
});
test('private delegation, explicit grants, revisions, replay, distance, links and restart durability',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'owner-object-')),file=join(dir,'ledger.sqlite'),owner=newIdentity(),identity=newIdentity(),admin=newIdentity(),visitor=newIdentity(),world={worldId:'world',contentDigest:'content',ownerNodeId:owner.nodeId,epoch:1,binding:{expiresAt:Date.now()+600000}},binding={world:'world'},players={[admin.nodeId]:{label:'Admin'},[visitor.nodeId]:{label:'Visitor'}};
 let ledger=await OwnerWorldLedger.open(file,binding),counter=0;
 const pid=n=>'player:'+n.split(':')[1],session=n=>({nodeId:n,playerId:pid(n),sessionId:'session:'+n,generation:0}),authority={ledger,assertCurrent(){},policy:{viewPlayers:[pid(admin.nodeId),pid(visitor.nodeId)],enterPlayers:[pid(admin.nodeId),pid(visitor.nodeId)]}};
 await ledger.transact(state=>{for(const n of [admin.nodeId,visitor.nodeId]){const s=session(n);state.members[s.playerId]={...s,playerNodeId:n,status:'ACTIVE',motion:{position:[0,0,0]}};state.grants[n]={grantId:n,playerNodeId:n,playerId:s.playerId,sessionId:s.sessionId,expiresAt:Date.now()+60000};}return true;});
 const delegation=issueObjectAdminDelegation(owner,{...world,authorityNodeId:identity.nodeId,authorityEpoch:1,playerNodeId:admin.nodeId,expiresAt:Date.now()+60000}),make=()=>new OwnerObjectAccess({project:project(),world,identity,authority,players,adminDelegations:[delegation]});let access=make();
 const call=async(n,op,data={})=>{const s=session(n),a=ledger.snapshot().objectAccess;return access.handle({requestId:'request-'+counter++,operation:op,payload:{worldId:'world',contentDigest:'content',sessionId:s.sessionId,generation:0,policyDigest:access.policy.policyDigest,policyRevision:a?.revision??1,...data}},s,{grantId:n});};
 try{
 let r;
 await t.test('administrator sees enrolled labels; visitors see only own grants and effective rights',async()=>{
 r=await call(admin.nodeId,'object-access-read');assert.equal(r.result.isAdmin,true);assert.equal(r.result.players.length,2);assert.equal(verifyObject(r,new Set([identity.nodeId])),true);
 r=await call(visitor.nodeId,'object-access-read');assert.equal(r.result.isAdmin,false);assert.equal(r.result.players,undefined);
 assert.ok(r.result.grants.every(g=>g.playerNodeId===visitor.nodeId));assert.ok(r.result.effectiveActions.every(o=>o.actions.length===0));
 });
 await t.test('administrator still needs play grant and visitors cannot administer',async()=>{
 assert.equal((await call(admin.nodeId,'object-use',{objectId:'computer'})).allowed,false,'owner admin play needs explicit grants');
 assert.equal((await call(visitor.nodeId,'object-access-update',{expectedRevision:1,playerNodeId:visitor.nodeId,objectId:'computer',action:'computer.use',allowed:true})).allowed,false);
 });
 const update=async(id,action,allowed=true)=>call(admin.nodeId,'object-access-update',{expectedRevision:ledger.snapshot().objectAccess.revision,playerNodeId:visitor.nodeId,objectId:id,action,allowed});
 await t.test('grants intersect supported world actions and exact live session context',async()=>{
 assert.equal((await update('computer','computer.use')).allowed,true);assert.equal((await call(visitor.nodeId,'object-use',{objectId:'computer'})).allowed,true);
 assert.equal((await call(visitor.nodeId,'object-use',{objectId:'computer',generation:1})).allowed,false);
 assert.equal((await call(visitor.nodeId,'object-use',{objectId:'terminal'})).allowed,false);
 assert.equal((await call(visitor.nodeId,'object-neon-power',{objectId:'computer',targetObjectId:'sign',value:false})).allowed,false);
 assert.equal((await update('computer','neon.power')).allowed,false);
 });
 await t.test('effects require both grants, authored target and accepted distance',async()=>{
 await update('sign','neon.power');await update('other','neon.power');
 assert.equal((await call(visitor.nodeId,'object-neon-power',{objectId:'computer',targetObjectId:'other',value:false})).allowed,false);
 assert.equal((await call(visitor.nodeId,'object-neon-power',{objectId:'computer',targetObjectId:'sign',value:false})).allowed,true);
 await ledger.transact(state=>{state.members[pid(visitor.nodeId)].motion.position=[20,0,0];return true;});
 assert.equal((await call(visitor.nodeId,'object-use',{objectId:'computer'})).allowed,false);
 await ledger.transact(state=>{state.members[pid(visitor.nodeId)].motion.position=[0,0,0];return true;});
 });
 await t.test('coarse ENTER denial is signed and leaves membership active',async()=>{
 authority.policy.enterPlayers=[];assert.equal((await call(visitor.nodeId,'object-use',{objectId:'computer'})).allowed,false);authority.policy.enterPlayers=[pid(visitor.nodeId)];
 assert.equal(ledger.snapshot().members[pid(visitor.nodeId)].status,'ACTIVE');
 });
 await t.test('request replay denies with bounded renewable use lease',async()=>{
 const s=session(visitor.nodeId),p={worldId:'world',contentDigest:'content',policyDigest:access.policy.policyDigest,policyRevision:ledger.snapshot().objectAccess.revision,sessionId:s.sessionId,generation:0,objectId:'computer'},e={requestId:'replay-id',operation:'object-use',payload:p};assert.equal((await access.handle(e,s,{grantId:visitor.nodeId})).allowed,true);assert.equal((await access.handle(e,s,{grantId:visitor.nodeId})).allowed,false);
 const lease=await call(visitor.nodeId,'object-use',{objectId:'computer'});assert.equal(lease.expiresAt-lease.issuedAt,3000);assert.equal(lease.allowed,true);
 });
 await t.test('restart retains grant and overlay; revocation denies renewal',async()=>{
 await ledger.close();ledger=await OwnerWorldLedger.open(file,binding);authority.ledger=ledger;access=make();
 assert.equal((await call(visitor.nodeId,'object-use',{objectId:'computer'})).allowed,true);assert.equal((await call(visitor.nodeId,'object-access-read')).result.overlay.signs[0].config.powered,false);
 await update('computer','computer.use',false);assert.equal((await call(visitor.nodeId,'object-use',{objectId:'computer'})).allowed,false);
 });
 await t.test('VIEW-only overlay reveals no grants and rejects absent VIEW',async()=>{
 const saved=ledger.snapshot().members[pid(visitor.nodeId)];await ledger.transact(state=>{delete state.members[pid(visitor.nodeId)];return true;});
 const overlay=await call(visitor.nodeId,'object-overlay-read');assert.equal(overlay.allowed,true);assert.deepEqual(Object.keys(overlay.result),['overlay']);assert.equal((await call(visitor.nodeId,'object-access-read')).allowed,false);
 authority.policy.viewPlayers=[];assert.equal((await call(visitor.nodeId,'object-overlay-read')).allowed,false);authority.policy.viewPlayers=[pid(visitor.nodeId)];await ledger.transact(state=>{state.members[pid(visitor.nodeId)]=saved;return true;});
 });
 await t.test('wrong actor delegation signature rejects admission',async()=>{
 assert.throws(()=>new OwnerObjectAccess({project:project(),world,identity,authority,players,adminDelegations:[{...delegation,playerNodeId:visitor.nodeId}]}));
 });
 }finally{await ledger.close();await rm(dir,{recursive:true,force:true});}
});

test('media screen requires its own grant and accepted viewing proximity',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'owner-tv-')),owner=newIdentity(),identity=newIdentity(),viewer=newIdentity();
 const world={worldId:'world',contentDigest:'content',ownerNodeId:owner.nodeId,epoch:1,binding:{expiresAt:Date.now()+600000}};
 const tv=object('tv','media-screen',[0,2.2,0],{mediaScreen:{schema:'elsemesh.media-screen/1',provider:'youtube',videoId:'N-V7VpmoPkU',width:6.4}}),p={...project(),objects:[...project().objects,tv]};
 const ledger=await OwnerWorldLedger.open(join(dir,'ledger.sqlite'),{world:'world'}),session={nodeId:viewer.nodeId,playerId:'viewer',sessionId:'session',generation:1};
 const authority={ledger,assertCurrent(){},policy:{viewPlayers:['viewer'],enterPlayers:['viewer']}};
 await ledger.transact(s=>{s.members.viewer={...session,playerNodeId:viewer.nodeId,status:'ACTIVE',motion:{position:[0,0,5]}};s.grants.view={playerNodeId:viewer.nodeId,sessionId:'session',expiresAt:Date.now()+60000};return true;});
 const access=new OwnerObjectAccess({project:p,world,identity,authority,players:{[viewer.nodeId]:{label:'Viewer'}}});let seq=0;
 const call=(op,data={})=>access.handle({requestId:'media-'+seq++,operation:op,payload:{worldId:'world',contentDigest:'content',sessionId:'session',generation:1,policyDigest:access.policy.policyDigest,policyRevision:ledger.snapshot().objectAccess?.revision??1,...data}},session,{grantId:'view'});
 try{
  assert.equal((await call('object-use',{objectId:'tv'})).allowed,false);
  await ledger.transact(s=>{s.objectAccess.grants[JSON.stringify([viewer.nodeId,'tv','computer.use'])]=true;return true;});
  assert.equal((await call('object-use',{objectId:'tv'})).allowed,false,'computer permission never grants media playback');
  await ledger.transact(s=>{s.objectAccess.grants[JSON.stringify([viewer.nodeId,'tv','media.play'])]=true;return true;});
  const allowed=await call('object-use',{objectId:'tv'});assert.equal(allowed.allowed,true);assert.equal(allowed.result.action,'media.play');
  assert.equal((await call('object-neon-power',{objectId:'tv',targetObjectId:'sign',value:true})).allowed,false);
  await ledger.transact(s=>{s.members.viewer.motion.position=[0,0,7];return true;});
  assert.equal((await call('object-use',{objectId:'tv',position:[0,0,2]})).allowed,false,'browser cannot forge viewing proximity');
  await ledger.transact(s=>{s.members.viewer.motion.position=[0,0,5];delete s.objectAccess.grants[JSON.stringify([viewer.nodeId,'tv','media.play'])];return true;});
  assert.equal((await call('object-use',{objectId:'tv'})).allowed,false,'revoked playback stops renewing');
 }finally{await ledger.close();await rm(dir,{recursive:true,force:true});}
});
