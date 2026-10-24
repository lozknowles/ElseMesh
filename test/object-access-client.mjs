import test from 'node:test';
import assert from 'node:assert/strict';
import {OwnerObjectAccessClient,canResumeObjectInteraction} from '../src/world-runtime/OwnerObjectAccessClient.js';
import {objectActionRows,accessObjectLabel} from '../src/world-runtime/ObjectControlsHelp.js';
import {C64Computer} from '../src/world/C64Computer.js';
function fixture(){
 let time=10000,lost=0,revision=0,allowed=true,patch={},verify=async()=>true;
 const active={},t={closed:false,frozen:false,connectionEpoch:1,identity:{nodeId:'player'},ownerConfig:{contacts:[{worldId:'world',authorityNodeId:'authority'}]}};
 const context={transport:t,active,connection:1,worldId:'world',contentDigest:'content',sessionId:'session',generation:2,authorityEpoch:3,ready:true};
 t.request=async(operation,payload)=>({protocol:'elsemesh.object-access-result/1',accessRequestId:payload.accessRequestId,operation,signer:'authority',worldId:'world',contentDigest:'content',playerNodeId:'player',sessionId:'session',generation:2,authorityEpoch:3,policyVersion:1,policyDigest:'policy',policyRevision:revision,issuedAt:time,expiresAt:time+3000,allowed,result:operation==='object-use'?{objectId:payload.objectId,action:'computer.use'}:{rules:[],grants:[],overlay:{signs:[]}},...patch});
 const c=new OwnerObjectAccessClient({getContext:()=>context,now:()=>time,verify:(...args)=>verify(...args),onLost:()=>lost++});
 return {c,t,context,setTime:n=>time=n,setRevision:n=>revision=n,setAllowed:n=>allowed=n,setPatch:p=>patch=p,setVerify:f=>verify=f,lost:()=>lost};
}
test('lease expires using local clock and closes once without accepting a delayed renewal',async()=>{const f=fixture();await f.c.read();await f.c.use('computer');assert(f.c.valid());f.setTime(13000);f.c.tick();assert(!f.c.valid());assert.equal(f.lost(),1);});
test('signed deny preserves exact restricted wording and does not mark transport offline',async()=>{const f=fixture();await f.c.use('computer');f.setAllowed(false);await assert.rejects(f.c.use('computer'),{message:'Access restricted'});assert.equal(f.lost(),1);assert.equal(f.t.closed,false);});
test('invalid signatures and receipt replay bindings fail closed',async()=>{for(const patch of [{accessRequestId:'old'},{sessionId:'old'},{generation:9},{worldId:'old'},{contentDigest:'old'},{playerNodeId:'other'},{authorityEpoch:8},{operation:'other'},{policyVersion:9},{expiresAt:14000}]){const f=fixture();f.setPatch(patch);await assert.rejects(f.c.use('computer'),/unavailable/);assert(!f.c.valid());}const f=fixture();f.setVerify(async()=>false);await assert.rejects(f.c.use('computer'),/unavailable/);});
test('membership change during signature verification rejects a late valid receipt',async()=>{const f=fixture();f.setVerify(async()=>{f.context.sessionId='next';return true;});await assert.rejects(f.c.use('computer'),/unavailable/);assert(!f.c.valid());});
test('policy revision change closes an existing lease before exposing updated rights',async()=>{const f=fixture();await f.c.read();await f.c.use('computer');f.setRevision(1);await f.c.read();assert(!f.c.valid());assert.equal(f.lost(),1);assert.equal(f.c.snapshot.policyRevision,1);});
test('a healthy revoke can resume movement; offline, handoff, changed session, prior disabled input cannot thaw',()=>{const active={},t={frozen:false,closed:false,connectionEpoch:1,membership:{sessionId:'s'},generation:2},c={active,hostGeneration:3,inputEnabled:true,transport:t,connection:1,sessionId:'s',generation:2},ctx={active,hostGeneration:3,transport:t,connected:true,ownerMode:true,pending:false,authorityOffline:false};assert(canResumeObjectInteraction(c,ctx));for(const patch of [{pending:true},{authorityOffline:true},{connected:false},{active:{}},{hostGeneration:4}])assert(!canResumeObjectInteraction(c,{...ctx,...patch}));for(const patch of [{frozen:true},{closed:true},{connectionEpoch:2},{generation:4},{membership:{sessionId:'new'}}])assert(!canResumeObjectInteraction(c,{...ctx,transport:{...t,...patch}}));assert(!canResumeObjectInteraction({...c,inputEnabled:false},ctx));});
test('forced C64 close never resumes or requests pointer lock; ordinary close obeys adapter',()=>{let resumes=0,locks=0;const computer=Object.create(C64Computer.prototype);Object.assign(computer,{active:true,dialog:{close(){}},app:{input:{resume(){resumes++;},requestLock(){locks++;}},canResume:()=>false}});computer.close({resume:false});assert.equal(resumes,0);assert.equal(locks,0);computer.active=true;computer.close();assert.equal(resumes,0);computer.active=true;computer.app.canResume=()=>true;computer.close();assert.equal(resumes,1);assert.equal(locks,1);});
test('C64 rechecks authority before executing a queued command',async()=>{let closed=false;const computer=Object.create(C64Computer.prototype);computer.app={canCommand:async()=>false};computer.close=({resume})=>{assert.equal(resume,false);closed=true;};computer.write=()=>assert.fail('must not run command');await computer.submit('RUN');assert(closed);});

test('F1 lists only present supported semantic actions and only signed effective rights can enable them',()=>{const project={objects:[{id:'computer',kind:'computer'},{id:'sign',kind:'neon-sign'},{id:'rock',kind:'rock'}]},snapshot={rules:[{objectId:'computer',actions:['computer.use']},{objectId:'sign',actions:['neon.power']},{objectId:'missing',actions:['computer.use']}],effectiveActions:[{objectId:'computer',actions:['computer.use']}]};const rows=objectActionRows(project,snapshot,{fresh:true});assert.equal(rows.length,3);assert.equal(rows[0].allowed,true);assert.equal(rows[1].allowed,false);assert.equal(rows[1].known,true);assert(objectActionRows(project,{rules:[],effectiveActions:[]},{fresh:true}).every(r=>!r.allowed&&r.known));assert(objectActionRows(project,snapshot,{fresh:false}).every(r=>!r.allowed&&!r.known));assert.equal(objectActionRows({objects:[]},null).length,0);});

test('real authority signed read/use/revoke interoperate with browser signature verifier',async()=>{
 const {OwnerObjectAccess}=await import('../network/owner-object-access.mjs'),{newIdentity}=await import('../network/identity.mjs'),authorityIdentity=newIdentity(),player=newIdentity(),world={worldId:'world',contentDigest:'content',epoch:3,ownerNodeId:authorityIdentity.nodeId,binding:{expiresAt:Date.now()+600000}},session={nodeId:player.nodeId,playerId:'p',sessionId:'session',generation:2};
 const state={members:{p:{status:'ACTIVE',playerNodeId:player.nodeId,sessionId:'session',generation:2,motion:{position:[0,0,0]}}},grants:{g:{playerNodeId:player.nodeId,sessionId:'session',expiresAt:Date.now()+60000}}};
 const project={objects:[{id:'computer',kind:'computer',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,computer:{}}]},authority=new OwnerObjectAccess({project,world,identity:authorityIdentity,players:{[player.nodeId]:{label:'Player'}},authority:{assertCurrent(){},ledger:{transact:async fn=>fn(state)},policy:{viewPlayers:['p'],enterPlayers:['p']}}}),active={};
 const transport={identity:{nodeId:player.nodeId},closed:false,frozen:false,ownerConfig:{contacts:[{worldId:'world',authorityNodeId:authorityIdentity.nodeId}]},request:(operation,payload)=>authority.handle({requestId:crypto.randomUUID(),operation,payload},session,{grantId:'g'})};
 const client=new OwnerObjectAccessClient({getContext:()=>({transport,active,connection:1,...world,sessionId:'session',generation:2,authorityEpoch:3,ready:true})});
 await client.read();await assert.rejects(client.use('computer'),{message:'Access restricted'});await client.read();
 state.objectAccess.grants[JSON.stringify([player.nodeId,'computer','computer.use'])]=true;state.objectAccess.revision++;
 await client.read();await client.use('computer');assert(client.valid());
 delete state.objectAccess.grants[JSON.stringify([player.nodeId,'computer','computer.use'])];state.objectAccess.revision++;
 await client.read();assert(!client.valid());await assert.rejects(client.use('computer'),{message:'Access restricted'});
});

test('expiry while renewal is in flight rejects its late receipt and cannot reopen a closed terminal',async()=>{
 const f=fixture();await f.c.read();await f.c.use('computer');const original=f.t.request;let release;
 f.t.request=(op,payload)=>new Promise(resolve=>{release=async()=>resolve(await original(op,payload));});
 const renewal=f.c.use('computer');f.setTime(13000);f.c.tick();assert.equal(f.lost(),1);await release();await assert.rejects(renewal,/unavailable/);assert(!f.c.valid());assert.equal(f.lost(),1);
});

test('access and F1 labels use authored names or canonical terminal names plus short identity',()=>{const id='00000000-1111-2222-3333-444444444444',project={objects:[{id,name:'Warehouse desk',kind:'computer'},{id:'retro',kind:'box'},{id:'sign',kind:'neon-sign'}],terminals:[{objectId:'retro',kind:'c64'}]};assert.equal(accessObjectLabel(project,id),'Warehouse desk · 00000000…444444');assert.equal(accessObjectLabel(project,'retro'),'Commodore 64 · retro');assert.equal(accessObjectLabel(project,'sign'),'Neon sign · sign');assert(objectActionRows(project,null)[0].label.startsWith(accessObjectLabel(project,id)));});

test('access selections survive grant revision refresh and temporary unavailable snapshot',async()=>{
 const {ObjectAccessPanel}=await import('../src/world-runtime/ObjectAccessPanel.js'),priorDocument=globalThis.document;
 class Element{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.value='';}setAttribute(k,v){this.attributes[k]=v;}append(...items){for(const item of items){this.children.push(item);if(this.tagName==='SELECT'&&item.tagName==='OPTION'&&!this.value)this.value=item.value;}}replaceChildren(...items){this.children=[];this.append(...items);}querySelector(selector){const label=selector.match(/aria-label="([^"]+)"/)?.[1];for(const child of this.children){if(child.attributes?.['aria-label']===label)return child;const found=child.querySelector?.(selector);if(found)return found;}return null;}}
 globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
 try{const host={active:{identity:{worldId:'world',contentDigest:'content'},project:{objects:[{id:'one',kind:'computer',name:'First desk'},{id:'two',kind:'computer',name:'Second desk'}]}}},panel=new ObjectAccessPanel({client:{},host,parent:new Element('div')}),snapshot={isAdmin:true,policyRevision:1,policyMode:'Legacy world defaults',players:[{nodeId:'first',label:'First'},{nodeId:'second',label:'Second'}],rules:[{objectId:'one',actions:['computer.use']},{objectId:'two',actions:['computer.use']}],grants:[]};
 panel.render(snapshot);const player=panel.body.querySelector('[aria-label="Player for access"]'),target=panel.body.querySelector('[aria-label="Object for access"]');player.value='second';player.onchange();target.value='two';target.onchange();panel.render({...snapshot,policyRevision:2});assert.equal(panel.body.querySelector('[aria-label="Player for access"]').value,'second');assert.equal(panel.body.querySelector('[aria-label="Object for access"]').value,'two');panel.render(null);panel.render({...snapshot,policyRevision:3});assert.equal(panel.body.querySelector('[aria-label="Player for access"]').value,'second');assert.equal(panel.body.querySelector('[aria-label="Object for access"]').value,'two');
 }finally{globalThis.document=priorDocument;}
});

test('media lease validates and renews its exact action instead of computer permission',async()=>{
 const f=fixture(),request=f.t.request,calls=[];
 f.t.request=async(op,payload)=>{calls.push([op,payload.objectId]);const r=await request(op,payload);if(op==='object-use')r.result.action='media.play';return r;};
 await f.c.read();await f.c.use('tv','media.play');assert(f.c.valid('tv','media.play'));assert(!f.c.valid('tv','computer.use'));
 f.setTime(11000);f.c.tick();await new Promise(resolve=>setTimeout(resolve,10));
 assert(f.c.valid('tv','media.play'));assert.equal(f.c.lease.action,'media.play');assert(calls.filter(c=>c[0]==='object-use').length>=2);
 const wrong=fixture();await assert.rejects(wrong.c.use('tv','media.play'),/unavailable/);assert(!wrong.c.valid());
});
