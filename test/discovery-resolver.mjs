import test from 'node:test';
import assert from 'node:assert/strict';
import { newIdentity } from '../network/identity.mjs';
import { sampleRegions } from '../network/federation-fixtures.mjs';
import { publishRegion, issueDelegation, PortalGraph } from '../network/federation.mjs';
import { createContact } from '../network/discovery-records.mjs';
import { peerIdForIdentity } from '../network/discovery-identity.mjs';
import { resolveRegionContact } from '../network/discovery-resolver.mjs';

const owner = newIdentity(), host = newIdentity(), helper = newIdentity();
const fixtures = sampleRegions(owner.nodeId, host.nodeId);
const region = { ...fixtures.exterior, hosts: [owner.nodeId, host.nodeId], authority: { nodeId: host.nodeId, epoch: 2 } };
const published = publishRegion(region, owner);
const expected = { ownerNodeId: owner.nodeId, worldId: region.worldId, regionId: region.regionId, manifestHash: published.manifestHash };
const contact = (identity, revision, address) => createContact(identity, { revision, peerId: peerIdForIdentity(identity.publicKeyPem), expiresAt: Date.now() + 60_000, endpoints: [{ transport: 'wss', address, scope: 'public' }] });
const delegation = (permission = 'AUTHORITY') => issueDelegation(owner, { regionId: region.regionId, hostNodeId: host.nodeId, permission, expiresAt: Date.now() + 60_000, version: region.version });

test('signed world and owner remain stable through host route changes without a directory', async () => {
  let current = contact(host, 1, 'wss://first.example.invalid/ws');
  const options = { published, expected, delegation: delegation(), lookup: async id => id === host.nodeId ? current : null };
  const before = await resolveRegionContact(options);
  current = contact(host, 2, 'wss://second.example.invalid/ws');
  const after = await resolveRegionContact(options);
  assert.equal(before.worldId, after.worldId);
  assert.equal(before.servingNodeId, after.servingNodeId);
  assert.notEqual(before.contact.endpoints[0].address, after.contact.endpoints[0].address);
});

test('helper cannot substitute owner, world, manifest version, host or authority permission', async () => {
  const options = { published, expected, delegation: delegation(), lookup: async () => contact(host, 1, 'wss://world.example.invalid/ws') };
  for (const replacement of [{ ownerNodeId: helper.nodeId }, { worldId: 'elsemesh-world:other' }, { manifestHash: 'sha256:' + '0'.repeat(64) }]) {
    await assert.rejects(resolveRegionContact({ ...options, expected: { ...expected, ...replacement } }));
  }
  await assert.rejects(resolveRegionContact({ ...options, delegation: delegation('REPLICA') }), /authority/);
  await assert.rejects(resolveRegionContact({ ...options, lookup: async () => contact(helper, 1, 'wss://helper.example.invalid/ws') }));
  await assert.rejects(resolveRegionContact({ ...options, lookup: async () => null }), /unresolved/);
  await assert.rejects(resolveRegionContact({ ...options, lookup: async () => createContact(host, { peerId: peerIdForIdentity(host.publicKeyPem), revision: 2, expiresAt: Date.now() + 60_000, endpoints: [] }) }), /withdrawn/);
  await assert.rejects(resolveRegionContact({ ...options, now: Date.now() + 120_000 }), /Expired/);
});

test('discovery does not loosen existing portal allowlists', async () => {
  await resolveRegionContact({ published, expected, delegation: delegation(), lookup: async () => contact(host, 1, 'wss://world.example.invalid/ws') });
  const portal = { ...fixtures.caveEntry, access: { mode: 'ALLOWLIST', allowPlayers: ['player:permitted'] } };
  const graph = new PortalGraph([portal]);
  assert.throws(() => graph.resolve(portal.portalId, 'player:uninvited', fixtures.capabilities, 'ONLINE'), /access denied/);
});

test('contact and authority delegation must still be fresh after asynchronous lookup', async () => {
  const started = Date.now();
  const grant = delegation();
  let time = started;
  const short = createContact(host, { peerId: peerIdForIdentity(host.publicKeyPem), revision: 1, issuedAt: started, expiresAt: started + 1000, endpoints: [{ transport: 'wss', address: 'wss://world.example.invalid/ws', scope: 'public' }] });
  await assert.rejects(resolveRegionContact({ published, expected, delegation: grant, now: () => time, lookup: async () => { time = started + 1001; return short; } }), /expired contact/);
  time = started;
  const long = createContact(host, { peerId: peerIdForIdentity(host.publicKeyPem), revision: 2, issuedAt: started, expiresAt: started + 120_000, endpoints: [{ transport: 'wss', address: 'wss://world.example.invalid/ws', scope: 'public' }] });
  await assert.rejects(resolveRegionContact({ published, expected, delegation: grant, now: () => time, lookup: async () => { time = grant.expiresAt + 1; return long; } }), /Expired.*delegation/);
});

test('invitation lookup cannot bypass the shared PeerID and endpoint binding', async () => {
  const options = { published, expected, delegation: delegation() };
  const wrongPeer = peerIdForIdentity(helper.publicKeyPem);
  const mismatched = createContact(host, { peerId: wrongPeer, revision: 1, expiresAt: Date.now() + 60_000, endpoints: [] });
  await assert.rejects(resolveRegionContact({ ...options, lookup: async () => mismatched }), /identity mismatch/);
  const wrongEndpoint = createContact(host, { peerId: peerIdForIdentity(host.publicKeyPem), revision: 2, expiresAt: Date.now() + 60_000, endpoints: [{ transport: 'libp2p', address: `/ip4/203.0.113.10/tcp/42901/p2p/${wrongPeer}`, scope: 'public' }] });
  await assert.rejects(resolveRegionContact({ ...options, lookup: async () => wrongEndpoint }), /Endpoint peer identity mismatch/);
});
