import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { canonical, newIdentity, nodeId, signObject } from '../network/identity.mjs';
import { CONTACT_PROTOCOL, MAX_CONTACT_BYTES, ContactStore, createContact, verifyContact } from '../network/discovery-records.mjs';

const NOW = 100_000;
const publicEndpoint = { transport: 'libp2p', address: '/ip4/203.0.113.30/tcp/4001', scope: 'public' };
function make(identity = newIdentity(), changes = {}) {
  return createContact(identity, { revision: 1, issuedAt: NOW, expiresAt: NOW + 1000, endpoints: [publicEndpoint], peerId: 'test-peer', ...changes });
}
function resign(record, identity, changes = {}) {
  const { signature, signer, publicKey, ...payload } = record;
  return signObject({ ...payload, ...changes }, identity);
}

test('contact binds canonical Ed25519 identity, returns a clone, and conveys identity only', () => {
  const identity = newIdentity();
  const record = make(identity);
  const checked = verifyContact(record, { now: NOW, expectedNodeId: identity.nodeId });
  assert.deepEqual(checked, record);
  checked.endpoints[0].address = '/ip4/203.0.113.40/tcp/4001';
  assert.equal(record.endpoints[0].address, publicEndpoint.address);
  assert.throws(() => verifyContact(record, { now: NOW, expectedNodeId: newIdentity().nodeId }), /Unexpected/);
  assert.throws(() => verifyContact({ ...record, revision: 2 }, { now: NOW }), /self-signed/);
  assert.throws(() => verifyContact(resign(record, identity, { protocol: 'elsemesh.other/1' }), { now: NOW }), /domain/);
});

test('rejects forged identity, non-Ed25519 keys and noncanonical base64 signatures', () => {
  const identity = newIdentity();
  const record = make(identity);
  const other = newIdentity();
  assert.throws(() => verifyContact(resign(record, other), { now: NOW }));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const changed = record.signature.slice(0, -3) + alphabet[alphabet.indexOf(record.signature.at(-3)) + 1] + '==';
  assert.deepEqual(Buffer.from(changed, 'base64'), Buffer.from(record.signature, 'base64'));
  assert.throws(() => verifyContact({ ...record, signature: changed }, { now: NOW }), /self-signed/);
  assert.throws(() => verifyContact({ ...record, signature: record.signature + '\n' }, { now: NOW }));
  const keys = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const publicKeyPem = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const rsa = { nodeId: nodeId(publicKeyPem), publicKeyPem, privateKeyPem: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const { signature, signer, publicKey, ...payload } = record;
  assert.throws(() => verifyContact(signObject({ ...payload, nodeId: rsa.nodeId }, rsa), { now: NOW }));
});

test('enforces exact schema, dense bounded arrays, string and total-byte limits', () => {
  const identity = newIdentity();
  const record = make(identity);
  for (const changes of [{ unexpected: true }, { peerId: '' }, { peerId: 'x'.repeat(257) }, { revision: 0 }, { revision: Number.MAX_SAFE_INTEGER + 1 }, { issuedAt: -1 }, { expiresAt: NOW }]) {
    assert.throws(() => verifyContact(resign(record, identity, changes), { now: NOW }));
  }
  assert.throws(() => createContact(identity, { revision: 1, issuedAt: NOW, expiresAt: NOW + 1, peerId: 'test-peer', endpoints: Array(1) }));
  const extras = [publicEndpoint]; extras.extra = true;
  assert.throws(() => verifyContact({ ...record, endpoints: extras }, { now: NOW }));
  const accessor = { ...record };
  Object.defineProperty(accessor, 'peerId', { enumerable: true, get() { throw new Error('getter must not run'); } });
  assert.throws(() => verifyContact(accessor, { now: NOW }), /schema/);
  assert.throws(() => make(identity, { endpoints: [publicEndpoint, publicEndpoint] }), /Duplicate/);
  assert.throws(() => make(identity, { endpoints: Array.from({ length: 33 }, (_, i) => ({ ...publicEndpoint, address: `/ip4/203.0.113.30/tcp/${4001 + i}` })) }), /count/);
  const large = Array.from({ length: 32 }, (_, i) => ({ transport: 'wss', address: `wss://node.example.invalid/${'x'.repeat(1024)}/${i}`, scope: 'public' }));
  assert.ok(Buffer.byteLength(canonical({ ...record, endpoints: large })) > MAX_CONTACT_BYTES);
  assert.throws(() => make(identity, { endpoints: large }), /Oversized/);
  assert.throws(() => make(identity, { endpoints: [{ ...publicEndpoint, unknown: true }] }), /fields/);
});

test('lease expiry, future skew and configured shorter lease are enforced', () => {
  const identity = newIdentity();
  const record = make(identity);
  assert.throws(() => verifyContact(record, { now: NOW + 1000 }), /expired/);
  assert.throws(() => verifyContact(record, { now: NOW - 60_001 }), /Future/);
  assert.doesNotThrow(() => verifyContact(record, { now: NOW - 60_000 }));
  assert.throws(() => verifyContact(record, { now: NOW, maxLeaseMs: 500 }), /lease/);
  assert.throws(() => make(identity, { expiresAt: NOW + 86_400_001 }), /lease/);
  assert.throws(() => verifyContact(record, { now: NaN }), /clock/);
});

test('public scope rejects private/local literals; explicit local scope is opt-in', () => {
  const identity = newIdentity();
  const local = { transport: 'libp2p', address: `/ip4/${[127, 0, 0, 1].join('.')}/tcp/4001`, scope: 'local:test' };
  const record = make(identity, { endpoints: [local] });
  assert.throws(() => verifyContact(record, { now: NOW }), /scope/);
  assert.doesNotThrow(() => verifyContact(record, { now: NOW, allowedScopes: ['local:test'] }));
  assert.throws(() => make(identity, { endpoints: [{ ...local, scope: 'public' }] }), /Non-public/);
  assert.throws(() => make(identity, { endpoints: [{ transport: 'wss', address: 'wss://localhost:4001/', scope: 'public' }] }), /Non-public/);
});

test('validates URL/multiaddr syntax, schemes, credentials and bounded suffixes without dialing', () => {
  for (const endpoint of [
    { transport: 'wss', address: 'wss://node.example.invalid/room', scope: 'public' },
    { transport: 'tcp-udp', address: 'tcp-udp://node.example.invalid:4001', scope: 'public' },
    { transport: 'libp2p', address: '/dns4/node.example.invalid/tcp/4001/wss', scope: 'public' },
  ]) assert.doesNotThrow(() => make(newIdentity(), { endpoints: [endpoint] }));
  for (const [transport, address] of [
    ['wss', 'https://node.example.invalid/'], ['wss', 'wss://fixture:non-secret@node.example.invalid/'],
    ['wss', 'wss://node.example.invalid/?token=synthetic'], ['tcp-udp', 'tcp-udp://node.example.invalid'],
    ['libp2p', '/ip4/999.0.0.1/tcp/4001'], ['libp2p', '/ip4/203.0.113.30/tcp/0'],
    ['libp2p', '/ip4/203.0.113.30/tcp/4001?x=y'], ['libp2p', '/ip4/203.0.113.30/tcp/4001/unknown'],
  ]) assert.throws(() => make(newIdentity(), { endpoints: [{ transport, address, scope: 'public' }] }));
});

test('store accepts exact duplicates, rejects revision rollback/equivocation, and clones all views', () => {
  const identity = newIdentity();
  const original = make(identity);
  const store = new ContactStore({ now: () => NOW });
  const accepted = store.accept(original);
  assert.deepEqual(store.accept(structuredClone(original)), original);
  accepted.endpoints.length = 0;
  original.endpoints.length = 0;
  const view = store.get(identity.nodeId); view.peerId = 'modified';
  store.records()[0].endpoints.length = 0;
  store.exportState().records[0].record.revision = 900;
  assert.equal(store.get(identity.nodeId).endpoints.length, 1);
  assert.equal(store.highestRevision(identity.nodeId), 1);
  assert.throws(() => store.accept(make(identity, { endpoints: [] })), /equivocation/);
  store.accept(make(identity, { revision: 2, endpoints: [] }));
  assert.equal(store.get(identity.nodeId).endpoints.length, 0);
  assert.throws(() => store.accept(make(identity)), /rollback/);
  assert.equal(store.highestRevision('unknown'), 0);
});

test('expired contacts are hidden but signed tombstones/highwater survive restart and capacity', () => {
  let now = NOW;
  const identity = newIdentity();
  const store = new ContactStore({ maxRecords: 1, now: () => now });
  store.accept(make(identity, { revision: 3 }));
  now += 1001;
  assert.equal(store.get(identity.nodeId), null);
  assert.deepEqual(store.records(), []);
  assert.equal(store.highestRevision(identity.nodeId), 3);
  assert.equal(store.size, 1);
  const saved = JSON.parse(JSON.stringify(store.exportState()));
  const restarted = new ContactStore({ maxRecords: 1, now: () => now }).restoreState(saved);
  assert.equal(restarted.highestRevision(identity.nodeId), 3);
  assert.equal(restarted.get(identity.nodeId), null);
  assert.throws(() => restarted.accept(make(identity, { revision: 2, issuedAt: now, expiresAt: now + 1000 })), /rollback/);
  assert.throws(() => restarted.accept(make(newIdentity(), { issuedAt: now, expiresAt: now + 1000 })), /capacity/);
  restarted.accept(make(identity, { revision: 4, issuedAt: now, expiresAt: now + 1000, endpoints: [] }));
  assert.equal(restarted.highestRevision(identity.nodeId), 4);
  assert.equal(restarted.size, 1);
});

test('restore is strict, all-or-nothing and cannot discard retained rollback guards', () => {
  const a = newIdentity(), b = newIdentity();
  const store = new ContactStore({ now: NOW });
  store.accept(make(a, { revision: 2 }));
  const before = store.exportState();
  const fresh = new ContactStore({ now: NOW }); fresh.accept(make(b));
  const state = fresh.exportState();
  assert.throws(() => store.restoreState(state), /drop/);
  const both = { protocol: before.protocol, records: [...before.records, ...state.records] };
  const bad = structuredClone(both); bad.records[1].highestRevision = 50;
  assert.throws(() => store.restoreState(bad), /highwater/);
  assert.deepEqual(store.exportState(), before);
  assert.throws(() => store.restoreState({ ...before, unknown: true }), /state/);
  assert.throws(() => store.restoreState({ protocol: before.protocol, records: [before.records[0], before.records[0]] }), /duplicate/);
  const rolledBack = new ContactStore({ now: NOW }); rolledBack.accept(make(a));
  assert.throws(() => store.restoreState(rolledBack.exportState()), /rollback/);
  assert.deepEqual(store.exportState(), before);
  store.restoreState(both);
  assert.equal(store.size, 2);
});

test('withdrawal contacts with no endpoints remain signed and never imply availability', () => {
  const record = make(newIdentity(), { endpoints: [] });
  assert.equal(record.protocol, CONTACT_PROTOCOL);
  assert.deepEqual(verifyContact(record, { now: NOW }).endpoints, []);
});
