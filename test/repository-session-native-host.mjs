import test from 'node:test';
import assert from 'node:assert/strict';
import {runRepositoryNativeHostAcceptance} from '../tools/repository-session-native-host-acceptance.mjs';
test('native repository host integrates actual authority, session and A/B lifecycle',{timeout:120000},async()=>{const result=await runRepositoryNativeHostAcceptance();assert.equal(result.status,'PASS_NATIVE_HOST_SESSION_INTEGRATION');assert.ok(result.checks.every(c=>c.passed));console.log('Native host CPU/GPU resource integration evidence: '+result.evidenceDirectory+'/report.json');});
