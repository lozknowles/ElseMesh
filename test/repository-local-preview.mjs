import test from 'node:test';import assert from 'node:assert/strict';
import {Group,Scene,PerspectiveCamera} from '../src/engine/index.js';
import {repositoryWorldActions} from '../src/world-runtime/RepositoryWorldActions.js';
import {RepositoryPortalRuntime} from '../src/world-runtime/RepositoryPortalRuntime.js';
test('standalone same-world edited revision bypasses stale authenticated graphics pins without weakening connected pin checks',async()=>{
 const host={},disposed=[],views={entries:new Map()},runtime=new RepositoryPortalRuntime({engine:{backend:'test',scene:new Scene(),camera:new PerspectiveCamera()},host,input:{},views,disposeCandidate:c=>disposed.push(c.root)});
 const old={identity:{worldId:'world',contentDigest:'old'}},descriptor={worldId:'world',contentDigest:'old',epoch:1,published:{descriptor:{authority:{nodeId:'authority'}}}},candidate={root:new Group()};
 runtime.descriptors.set('world',descriptor);const record=runtime.residents.register(old,descriptor,candidate);record.active=true;runtime.residents.active=record;
 const changed={identity:{worldId:'world',contentDigest:'edited'}};
 assert.equal(host.acquireResources(changed),null);assert.equal(await host.registerResources({loaded:changed,identity:changed.identity,root:new Group()}),null);
 runtime.connected=true;assert.throws(()=>host.acquireResources(changed),/identity mismatch/);assert.throws(()=>runtime.releaseOfflineResources(),/Disconnect/);
 runtime.connected=false;host.active={root:candidate.root};assert.throws(()=>runtime.releaseOfflineResources(),/Active authenticated/);
 host.active={root:new Group()};runtime.releaseOfflineResources();assert.equal(disposed.length,1);assert.equal(runtime.residents.records.size,0);assert.equal(runtime.residents.disposed,false);
});
test('disconnect closes live aperture appearance before parking cached graphics',()=>{
 const states=[],runtime=new RepositoryPortalRuntime({engine:{backend:'test',scene:new Scene(),camera:new PerspectiveCamera()},host:{},input:{},views:{entries:new Map([['portal',{}]]),setState:(id,state)=>states.push([id,state])}});
 runtime.transport={disconnect(){}};runtime.clearViews=()=>states.push('park');runtime.disconnect();assert.deepEqual(states,[['portal','unavailable'],'park']);
});

test('deferred authenticated Connect and standalone source activation are mutually exclusive',async()=>{
 const runtime=new RepositoryPortalRuntime({engine:{backend:'test',scene:new Scene(),camera:new PerspectiveCamera()},host:{},input:{suspend(){}},views:{entries:new Map()}});
 let rejectConnect;runtime.transport={connect:()=>new Promise((_,reject)=>{rejectConnect=reject;})};
 const pending=runtime.connect({protocol:'elsemesh.repository-runtime/1'});assert.equal(runtime.connectionPending,true);
 const actions=repositoryWorldActions({host:{load:()=>true},portals:runtime});await assert.rejects(actions.load({}),/current world connection/);assert.throws(()=>runtime.releaseOfflineResources(),/Disconnect/);
 rejectConnect(Error('Test connection stopped'));await assert.rejects(pending,/Test connection/);assert.equal(runtime.connectionPending,false);
 let finish;const owner={protocol:'elsemesh.owner-runtime/1'};runtime.config=owner;runtime.disconnect=()=>{};runtime.releaseOfflineResources=()=>{};
 const loading=repositoryWorldActions({host:{load:()=>new Promise(resolve=>{finish=resolve;})},portals:runtime}).load({});assert.equal(runtime.sourceLoading,true);
 await assert.rejects(runtime.connect({protocol:'elsemesh.repository-runtime/1'}),/source operation/);assert.equal(runtime.config,owner);
 finish(true);assert.equal(await loading,true);assert.equal(runtime.sourceLoading,false);assert.equal(runtime.config,null);
});

test('validated standalone activation resumes local controls after disconnect; rejection stays paused',async()=>{
 let resumed=0;const host={input:{resume(){resumed++;}},load:async()=>true};const portals={disconnect(){},releaseOfflineResources(){}};
 const actions=repositoryWorldActions({host,portals});await actions.load({});assert.equal(resumed,1);
 host.load=async()=>false;assert.equal(await actions.load({}),false);assert.equal(resumed,1);
 host.load=async()=>{throw Error('invalid source');};await assert.rejects(actions.load({}),/invalid source/);assert.equal(resumed,1);
});
