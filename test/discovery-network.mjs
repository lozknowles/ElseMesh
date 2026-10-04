import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { multiaddr } from '@multiformats/multiaddr';
import { lpStream } from '@libp2p/utils';
import { newIdentity, signObject } from '../network/identity.mjs';
import { ContactStore, createContact } from '../network/discovery-records.mjs';
import { DiscoveryNode, DISCOVERY_PROTOCOL, peerIdForIdentity, libp2pKey, parseBootstrap, verifyPeerBinding } from '../network/libp2p-discovery.mjs';

const scopes = ['local:test'];
const routes = node => node.addresses().map(address => ({ transport: 'libp2p', address, scope: scopes[0] }));
const nodeFor = (identity, options = {}) => new DiscoveryNode({ identity, allowedScopes: scopes, timeoutMs: 600, ...options });

test('one existing Ed25519 identity maps reproducibly to its authenticated libp2p peer', async () => {
  const identity = newIdentity();
  assert.deepEqual((await libp2pKey(identity)).publicKey, (await libp2pKey(identity)).publicKey);
  const node = nodeFor(identity);
  try {
    await node.start();
    assert.ok(node.addresses()[0].endsWith('/p2p/' + peerIdForIdentity(identity.publicKeyPem)));
    assert.equal(verifyPeerBinding(await node.publish(routes(node)), { allowedScopes: scopes }).nodeId, identity.nodeId);
  } finally { await node.stop(); }
  await assert.rejects(libp2pKey({ ...identity, privateKeyPem: newIdentity().privateKeyPem }), /mismatch/);
});

test('independent helpers propagate records, survive helper loss and discover changed routes after restart', { timeout: 15_000 }, async () => {
  const firstIdentity = newIdentity(), secondIdentity = newIdentity(), worldIdentity = newIdentity(), visitorIdentity = newIdentity();
  const peers = [firstIdentity, secondIdentity, worldIdentity, visitorIdentity].map(i => peerIdForIdentity(i.publicKeyPem));
  const first = nodeFor(firstIdentity, { allowedPeers: peers });
  const nodes = [first];
  try {
    await first.start();
    const firstAddress = first.addresses()[0];
    const second = nodeFor(secondIdentity, { allowedPeers: peers, bootstrap: [firstAddress] }); nodes.push(second);
    await second.start();
    const world = nodeFor(worldIdentity, { bootstrap: [firstAddress] }); nodes.push(world);
    await world.start();
    const old = await world.publish(routes(world));
    assert.equal((await world.sync())[0].status, 'exchanged');
    assert.equal((await second.sync())[0].status, 'exchanged');
    assert.equal((await second.lookup(world.nodeId, { refresh: false })).revision, old.revision);
    const visitor = nodeFor(visitorIdentity, { bootstrap: [firstAddress, second.addresses()[0]] }); nodes.push(visitor);
    await visitor.start();
    assert.equal((await visitor.lookup(world.nodeId)).signature, old.signature);
    await first.stop();
    const status = await visitor.sync();
    assert.deepEqual(status.map(r => r.status), ['unavailable', 'exchanged']);
    assert.equal((await visitor.lookup(world.nodeId, { refresh: false })).signature, old.signature);
    const saved = world.snapshot();
    await world.stop();
    const store = new ContactStore({ maxRecords: 32, allowedScopes: scopes }).restoreState(saved);
    const moved = nodeFor(worldIdentity, { store, bootstrap: [second.addresses()[0]] }); nodes.push(moved);
    await moved.start();
    const updated = await moved.publish(routes(moved));
    assert.equal(updated.revision, old.revision + 1);
    assert.equal(updated.nodeId, old.nodeId);
    assert.notDeepEqual(updated.endpoints, old.endpoints);
    await moved.sync();
    const discovered = await visitor.lookup(worldIdentity.nodeId);
    assert.deepEqual(discovered.endpoints, updated.endpoints);
    await second.stop();
    assert.equal((await visitor.lookup(worldIdentity.nodeId)).signature, updated.signature);
    assert.equal(new Set([first.nodeId, second.nodeId, world.nodeId, visitor.nodeId]).size, 4);
  } finally { await Promise.all(nodes.map(node => node.stop())); }
});

test('unknown peer cannot exchange, and helpers cannot substitute libp2p keys or forge other node records', { timeout: 8000 }, async () => {
  const owner = newIdentity(), unknown = newIdentity();
  const helper = nodeFor(owner);
  let outsider;
  try {
    await helper.start();
    outsider = nodeFor(unknown, { bootstrap: [helper.addresses()[0]] });
    await outsider.start();
    const own = await outsider.publish(routes(outsider));
    assert.equal((await outsider.sync())[0].status, 'unavailable');
    assert.equal(await helper.lookup(unknown.nodeId, { refresh: false }), null);
    const { signature, signer, publicKey, ...payload } = own;
    await assert.rejects(helper.importContact(signObject({ ...payload, peerId: helper.peerId }, unknown)), /identity mismatch/);
    await assert.rejects(helper.importContact({ ...own, endpoints: routes(helper) }));
    const redirected = signObject({ ...payload, endpoints: routes(helper) }, unknown);
    await assert.rejects(helper.importContact(redirected), /Endpoint peer identity mismatch/);
    await helper.importContact(own);
    assert.equal((await helper.lookup(unknown.nodeId, { refresh: false })).signature, own.signature);
  } finally { await outsider?.stop(); await helper.stop(); }
});

test('seed addresses cannot introduce DNS, peerless, unsupported or learned dial targets', () => {
  const peer = peerIdForIdentity(newIdentity().publicKeyPem);
  for (const address of [`/dns4/example.invalid/tcp/4001/p2p/${peer}`, '/ip4/127.0.0.1/tcp/4001', `/ip4/127.0.0.1/udp/4001/quic-v1/p2p/${peer}`, `/ip4/127.0.0.1/tcp/0/p2p/${peer}`]) assert.throws(() => parseBootstrap(address));
  assert.equal(parseBootstrap(`/ip4/127.0.0.1/tcp/4001/p2p/${peer}`).peerId, peer);
});

test('persistence errors stop serving cached results and repeated publication uses distinct revisions', async () => {
  const identity = newIdentity();
  let fail = false;
  const node = nodeFor(identity, { persist: async () => { if (fail) throw new Error('disk unavailable'); } });
  try {
    await node.start();
    const records = await Promise.all([node.publish(routes(node)), node.publish(routes(node))]);
    assert.deepEqual(records.map(r => r.revision), [1, 2]);
    fail = true;
    await assert.rejects(node.publish(routes(node)), /persistence failed/);
    await assert.rejects(node.lookup(identity.nodeId, { refresh: false }), /persistence failed/);
  } finally { await node.stop(); }
});

test('a fresh signed invitation record works with zero bootstrap peers', async () => {
  const identity = newIdentity();
  const record = createContact(identity, { peerId: peerIdForIdentity(identity.publicKeyPem), revision: 1, expiresAt: Date.now() + 60_000, endpoints: [{ transport: 'wss', address: 'wss://world.example.invalid/ws', scope: 'public' }] });
  const publicReader = new DiscoveryNode({ identity: newIdentity() });
  try {
    await publicReader.start();
    await publicReader.importContact(record);
    assert.equal((await publicReader.lookup(identity.nodeId)).signature, record.signature);
  } finally { await publicReader.stop(); }
});

test('wire rejects malformed/oversized frames and forged records without poisoning a helper', { timeout: 8000 }, async () => {
  const relayIdentity = newIdentity(), owner = newIdentity();
  const helper = nodeFor(newIdentity(), { allowedPeers: [peerIdForIdentity(relayIdentity.publicKeyPem)] });
  let relay;
  try {
    await helper.start();
    relay = await createLibp2p({ privateKey: await libp2pKey(relayIdentity), transports: [tcp()], connectionEncrypters: [noise()], streamMuxers: [yamux()] });
    for (const payload of [Buffer.from('{"protocol":"other","records":[]}'), Buffer.alloc(1024 * 1024 + 1, 120)]) {
      const stream = await relay.dialProtocol(multiaddr(helper.addresses()[0]), DISCOVERY_PROTOCOL);
      const framed = lpStream(stream);
      await assert.rejects(async () => {
        await framed.write(payload, { signal: AbortSignal.timeout(1000) });
        await framed.read({ signal: AbortSignal.timeout(1000) });
      });
      stream.abort(new Error('test completed'));
    }
    const good = createContact(owner, { peerId: peerIdForIdentity(owner.publicKeyPem), revision: 1, expiresAt: Date.now() + 60_000, endpoints: [] });
    const stream = await relay.dialProtocol(multiaddr(helper.addresses()[0]), DISCOVERY_PROTOCOL);
    const framed = lpStream(stream);
    await framed.write(Buffer.from(JSON.stringify({ protocol: 'elsemesh.discovery-exchange/1', records: [{ ...good, revision: 999 }] })));
    const response = JSON.parse(Buffer.from((await framed.read({ signal: AbortSignal.timeout(1000) })).subarray()).toString());
    await stream.close();
    assert.deepEqual(response.records, []);
    assert.equal(await helper.lookup(owner.nodeId, { refresh: false }), null);
    // An admitted relay cannot consume permanent slots with unrelated identities.
    const spam = Array.from({ length: 32 }, () => {
      const unrelated = newIdentity();
      return createContact(unrelated, { peerId: peerIdForIdentity(unrelated.publicKeyPem), revision: 1, expiresAt: Date.now() + 60_000, endpoints: [] });
    });
    const spamStream = await relay.dialProtocol(multiaddr(helper.addresses()[0]), DISCOVERY_PROTOCOL);
    const spamFrame = lpStream(spamStream);
    await spamFrame.write(Buffer.from(JSON.stringify({ protocol: 'elsemesh.discovery-exchange/1', records: spam })));
    await spamFrame.read({ signal: AbortSignal.timeout(1000) });
    await spamStream.close();
    assert.equal(helper.snapshot().records.length, 0);
    await helper.importContact(good);
    assert.equal((await helper.lookup(owner.nodeId, { refresh: false })).revision, 1);
  } finally { await relay?.stop(); await helper.stop(); }
});

test('silent helper is bounded by timeout and a second helper still serves a fresh contact', { timeout: 8000 }, async () => {
  const silentIdentity = newIdentity(), visitorIdentity = newIdentity();
  let silent, visitor;
  const helper = nodeFor(newIdentity(), { allowedPeers: [peerIdForIdentity(visitorIdentity.publicKeyPem)] });
  try {
    silent = await createLibp2p({ privateKey: await libp2pKey(silentIdentity), addresses: { listen: ['/ip4/127.0.0.1/tcp/0'] }, transports: [tcp()], connectionEncrypters: [noise()], streamMuxers: [yamux()] });
    await silent.handle(DISCOVERY_PROTOCOL, () => {});
    await helper.start();
    const own = await helper.publish(routes(helper));
    visitor = nodeFor(visitorIdentity, { bootstrap: [silent.getMultiaddrs()[0].toString(), helper.addresses()[0]], timeoutMs: 200 });
    await visitor.start();
    const started = Date.now();
    assert.equal((await visitor.lookup(helper.nodeId)).signature, own.signature);
    assert.ok(Date.now() - started < 2000);
  } finally { await visitor?.stop(); await silent?.stop(); await helper.stop(); }
});

test('pending failed persistence never exposes a new contact through reads or snapshots', async () => {
  for (const mode of ['publish', 'import']) {
    const identity = newIdentity(), entering = Promise.withResolvers(), completion = Promise.withResolvers();
    const node = nodeFor(identity, { persist: async () => { entering.resolve(); await completion.promise; } });
    const record = createContact(identity, { peerId: peerIdForIdentity(identity.publicKeyPem), revision: 1, expiresAt: Date.now() + 60_000, endpoints: [] });
    const pending = mode === 'publish' ? node.publish([]) : node.importContact(record);
    const rejection = assert.rejects(pending, /persistence failed/);
    try {
      await entering.promise;
      assert.equal(await node.lookup(identity.nodeId, { refresh: false }), null);
      assert.equal(node.snapshot().records.length, 0);
      completion.reject(new Error('disk write failed'));
      await rejection;
      assert.equal(node.snapshot().records.length, 0);
    } finally { completion.resolve(); await node.stop(); }
  }
});

test('a pending publication is not sent over libp2p and becomes visible only after persistence', { timeout: 8000 }, async () => {
  const entering = Promise.withResolvers(), completion = Promise.withResolvers(), received = Promise.withResolvers();
  const captured = [];
  let publisher, receiver, first = true;
  try {
    receiver = await createLibp2p({ privateKey: await libp2pKey(newIdentity()), addresses: { listen: ['/ip4/127.0.0.1/tcp/0'] }, transports: [tcp()], connectionEncrypters: [noise()], streamMuxers: [yamux()] });
    await receiver.handle(DISCOVERY_PROTOCOL, async stream => {
      const framed = lpStream(stream, { maxDataLength: 1024 * 1024 });
      captured.push(JSON.parse(Buffer.from((await framed.read()).subarray()).toString()).records);
      received.resolve();
      await framed.write(Buffer.from(JSON.stringify({ protocol: 'elsemesh.discovery-exchange/1', records: [] })));
      await stream.close();
    });
    publisher = nodeFor(newIdentity(), { bootstrap: [receiver.getMultiaddrs()[0].toString()], persist: async () => { if (first) { first = false; entering.resolve(); await completion.promise; } } });
    await publisher.start();
    const pending = publisher.publish(routes(publisher));
    await entering.promise;
    const exchanging = publisher.sync();
    await received.promise;
    assert.deepEqual(captured[0], []);
    assert.equal(await publisher.lookup(publisher.nodeId, { refresh: false }), null);
    completion.resolve();
    const committed = await pending;
    await exchanging;
    assert.equal((await publisher.lookup(publisher.nodeId, { refresh: false })).signature, committed.signature);
    await publisher.sync();
    assert.equal(captured[1][0].signature, committed.signature);
  } finally { completion.resolve(); await publisher?.stop(); await receiver?.stop(); }
});

test('restored caches must obey the node scope and peer-binding policy, including expired guards', () => {
  const owner = newIdentity();
  for (const expired of [false, true]) {
    const issuedAt = Date.now() - (expired ? 10_000 : 0);
    const store = new ContactStore({ now: issuedAt, allowedScopes: scopes });
    store.accept(createContact(owner, { peerId: peerIdForIdentity(owner.publicKeyPem), revision: 1, issuedAt, expiresAt: issuedAt + 5000, endpoints: [{ transport: 'wss', address: 'wss://127.0.0.1/ws', scope: scopes[0] }] }));
    assert.throws(() => new DiscoveryNode({ identity: newIdentity(), store, allowedScopes: ['public'] }), /scope/);
    assert.equal(nodeFor(newIdentity(), { store }).snapshot().records.length, 1);
  }
  const mismatched = new ContactStore();
  mismatched.accept(createContact(owner, { peerId: peerIdForIdentity(newIdentity().publicKeyPem), revision: 1, expiresAt: Date.now() + 60_000, endpoints: [] }));
  assert.throws(() => new DiscoveryNode({ identity: newIdentity(), store: mismatched }), /identity mismatch/);
});
