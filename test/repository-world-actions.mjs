import test from 'node:test';import assert from 'node:assert/strict';
import {repositoryWorldActions} from '../src/world-runtime/RepositoryWorldActions.js';
test('all user world actions are fenced during unresolved transfer',async()=>{const calls=[],portals={pending:true,disconnect:()=>calls.push('disconnect')},host=Object.fromEntries(['load','checkUpdate','applyUpdate'].map(k=>[k,()=>calls.push(k)]));const a=repositoryWorldActions({host,portals});await assert.rejects(a.load({}),/Wait/);assert.throws(()=>a.checkUpdate(),/Wait/);assert.throws(()=>a.applyUpdate(),/Wait/);assert.deepEqual(calls,[]);});
test('load and deliberate apply disconnect portal membership before host replacement',async()=>{const calls=[],portals={pending:false,disconnect:()=>calls.push('disconnect')},host={load:()=>calls.push('load'),checkUpdate:()=>calls.push('check'),applyUpdate:()=>calls.push('apply')};const a=repositoryWorldActions({host,portals});await a.load({});a.checkUpdate();a.applyUpdate();assert.deepEqual(calls,['disconnect','load','check','disconnect','apply']);});

test('explicit local world preview drops owner context only after successful validated activation',async()=>{
 const owner={protocol:'elsemesh.owner-runtime/1'},portals={pending:false,config:owner,disconnect(){this.connected=false;}};
 let succeed=false;const host={async load(){if(!succeed)throw Error('Invalid world');return true;}};
 const actions=repositoryWorldActions({host,portals});await assert.rejects(actions.load({}),/Invalid world/);assert.equal(portals.config,owner,'rejected data cannot downgrade the previous owner world');
 succeed=true;assert.equal(await actions.load({}),true);assert.equal(portals.config,null,'an explicitly opened local snapshot is a standalone preview, never an owner membership');
});
