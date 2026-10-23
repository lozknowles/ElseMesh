import test from 'node:test';
import assert from 'node:assert/strict';
import {runRepositorySessionAcceptance} from '../tools/repository-session-acceptance.mjs';

test('real browser repository session protocol, authority, admission and world isolation', {timeout:120000}, async()=>{
 const result=await runRepositorySessionAcceptance();
 assert.equal(result.status,'PASS_BROWSER_PROTOCOL_HARNESS');
 assert.ok(result.checks.length>=20);
 assert.ok(result.checks.every(check=>check.passed));
 console.log('Protocol harness evidence: '+result.evidenceDirectory+'/report.json');
});
