import { createPrivateKey, createPublicKey } from 'node:crypto';
import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { generateKeyPairFromSeed } from '@libp2p/crypto/keys';
import { peerIdFromPublicKey, peerIdFromString } from '@libp2p/peer-id';
import { multiaddr } from '@multiformats/multiaddr';
import { lpStream } from '@libp2p/utils';
import { nodeId } from './identity.mjs';
import { ContactStore, createContact } from './discovery-records.mjs';
import { peerIdForIdentity, verifyPeerBinding } from './discovery-identity.mjs';
export { peerIdForIdentity, verifyPeerBinding } from './discovery-identity.mjs';

export const DISCOVERY_PROTOCOL = '/elsemesh/discovery/1.0.0';
const WIRE = 'elsemesh.discovery-exchange/1';
const MAX_PACKET = 1024 * 1024;
const MAX_RECORDS = 32;

function nodeIdForPeer(id) {
  const peer = peerIdFromString(id);
  if (peer.publicKey?.type !== 'Ed25519') throw new Error('Pinned peer must use Ed25519');
  const key = createPublicKey({ format: 'jwk', key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(peer.publicKey.raw).toString('base64url') } });
  return nodeId(key.export({ type: 'spki', format: 'pem' }));
}

export async function libp2pKey(identity) {
  const key = createPrivateKey(identity.privateKeyPem);
  if (key.asymmetricKeyType !== 'ed25519' || nodeId(identity.publicKeyPem) !== identity.nodeId || nodeId(createPublicKey(key).export({ type: 'spki', format: 'pem' })) !== identity.nodeId) throw new Error('Identity key mismatch');
  const converted = await generateKeyPairFromSeed('Ed25519', Buffer.from(key.export({ format: 'jwk' }).d, 'base64url'));
  if (peerIdFromPublicKey(converted.publicKey).toString() !== peerIdForIdentity(identity.publicKeyPem)) throw new Error('libp2p key mismatch');
  return converted;
}

// Seeds are explicit numeric IP/TCP addresses, including a pinned peer key. DNS,
// returned contact endpoints and peerstore addresses cannot expand the dial set.
export function parseBootstrap(address) {
  if (typeof address !== 'string' || address.length > 512) throw new Error('Invalid bootstrap address');
  const parsed = multiaddr(address);
  const parts = parsed.getComponents();
  if (parts.length !== 3 || !['ip4', 'ip6'].includes(parts[0].name) || parts[1].name !== 'tcp' || parts[2].name !== 'p2p' || !Number.isInteger(Number(parts[1].value)) || Number(parts[1].value) < 1 || Number(parts[1].value) > 65535) throw new Error('Bootstrap requires IP/TCP/pinned PeerID');
  peerIdFromString(parts[2].value);
  return { address: parsed, peerId: parts[2].value, route: parsed.decapsulateCode(421).toString() };
}

function encode(records) {
  const bytes = Buffer.from(JSON.stringify({ protocol: WIRE, records }));
  if (bytes.length > MAX_PACKET || records.length > MAX_RECORDS) throw new Error('Oversized discovery exchange');
  return bytes;
}

function decode(bytes) {
  if (bytes.byteLength > MAX_PACKET) throw new Error('Oversized discovery exchange');
  const value = JSON.parse(Buffer.from(bytes.subarray()).toString('utf8'));
  if (!value || value.protocol !== WIRE || Object.keys(value).sort().join(',') !== 'protocol,records' || !Array.isArray(value.records) || value.records.length > MAX_RECORDS) throw new Error('Invalid discovery exchange');
  return value.records;
}

export class DiscoveryNode {
  #identity; #node; #store; #seeds; #allowed; #subjects = new Set(); #scopes; #persist; #timeout; #queue = Promise.resolve();
  #active = 0; #rates = new Map(); #failed = false; #syncing; #stopped = false;
  constructor({ identity, store, bootstrap = [], allowedPeers = [], contactNodeIds = [], allowedScopes = ['public'], persist = async () => {}, timeoutMs = 3000 }) {
    if (!Array.isArray(bootstrap) || bootstrap.length > 8 || !Array.isArray(allowedPeers) || allowedPeers.length > 32 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error('Invalid discovery limits');
    this.#identity = identity;
    this.#seeds = bootstrap.map(parseBootstrap);
    this.#allowed = new Set([...allowedPeers, ...this.#seeds.map(seed => seed.peerId)]);
    for (const id of this.#allowed) peerIdFromString(id);
    if (this.#allowed.size > 32) throw new Error('Too many admitted peers');
    this.#scopes = [...allowedScopes];
    this.#store = new ContactStore({ maxRecords: MAX_RECORDS, allowedScopes });
    if (store) this.#store.restoreState(store.exportState());
    if (!Array.isArray(contactNodeIds) || contactNodeIds.length > MAX_RECORDS || this.#store.size > MAX_RECORDS) throw new Error('Invalid contact admission limit');
    for (const id of [identity.nodeId, ...this.#allowed].map(id => id.startsWith('elsemesh-node:') ? id : nodeIdForPeer(id))) this.#admitSubject(id);
    for (const id of contactNodeIds) this.#admitSubject(id);
    for (const entry of this.#store.exportState().records) {
      // restoreState has already checked the current clock and the node's scope
      // policy. Check bindings at issue time to retain expired signed guards.
      verifyPeerBinding(entry.record, { now: entry.record.issuedAt, allowedScopes });
      this.#admitSubject(entry.nodeId);
    }
    this.#persist = persist;
    this.#timeout = timeoutMs;
  }
  get nodeId() { return this.#identity.nodeId; }
  get peerId() { return peerIdForIdentity(this.#identity.publicKeyPem); }
  addresses() { return this.#node?.getMultiaddrs().map(value => value.toString()) ?? []; }
  snapshot() { return this.#store.exportState(); }
  #admitSubject(id) {
    if (typeof id !== 'string' || !/^elsemesh-node:[0-9a-f]{64}$/.test(id)) throw new Error('Invalid contact admission identity');
    if (!this.#subjects.has(id) && this.#subjects.size >= MAX_RECORDS) throw new Error('Contact admission capacity reached');
    this.#subjects.add(id);
  }
  #assertReady() { if (this.#failed || this.#stopped) throw new Error('Discovery persistence failed or node stopped'); }
  async start({ listen = ['/ip4/127.0.0.1/tcp/0'] } = {}) {
    if (this.#node) throw new Error('Discovery already started');
    if (!Array.isArray(listen) || listen.length > 4 || listen.length < 1 || listen.some(value => !/^\/(ip4|ip6)\/[^/]+\/tcp\/\d+$/.test(value))) throw new Error('Invalid discovery listen addresses');
    const routes = new Set(this.#seeds.map(seed => seed.route));
    this.#node = await createLibp2p({
      start: false, privateKey: await libp2pKey(this.#identity),
      addresses: { listen }, transports: [tcp()], connectionEncrypters: [noise()], streamMuxers: [yamux()],
      connectionManager: { maxConnections: 32, maxParallelDials: 4, inboundConnectionThreshold: 5 },
      connectionGater: {
        denyDialPeer: id => !this.#allowed.has(id.toString()),
        denyDialMultiaddr: address => !routes.has(address.decapsulateCode(421).toString()),
        denyInboundEncryptedConnection: id => !this.#allowed.has(id.toString()),
      },
    });
    await this.#node.handle(DISCOVERY_PROTOCOL, async (stream, connection) => {
      const peer = connection.remotePeer.toString();
      const signal = AbortSignal.timeout(this.#timeout);
      let counted = false;
      try {
        this.#assertReady();
        if (!this.#allowed.has(peer) || this.#active >= 8) throw new Error('Discovery peer not admitted or busy');
        const time = Date.now();
        let rate = this.#rates.get(peer);
        if (!rate || time - rate.since >= 60_000) this.#rates.set(peer, rate = { since: time, count: 0 });
        if (++rate.count > 30) throw new Error('Discovery rate limit');
        this.#active++; counted = true;
        const framed = lpStream(stream, { maxDataLength: MAX_PACKET, maxBufferSize: MAX_PACKET + 16 });
        const records = decode(await framed.read({ signal }));
        await this.#accept(records);
        await framed.write(encode(this.#store.records()), { signal });
        await stream.close({ signal });
      } catch (error) { stream.abort(error); }
      finally { if (counted) this.#active--; }
    }, { maxInboundStreams: 2, maxOutboundStreams: 2 });
    await this.#node.start();
    return this;
  }
  async #accept(records) {
    const action = this.#queue.then(async () => {
      this.#assertReady();
      const candidate = this.#store.fork();
      let accepted = 0, rejected = 0;
      for (const record of records) {
        try {
          if (!this.#subjects.has(record?.nodeId)) throw new Error('Contact subject not locally admitted');
          candidate.accept(verifyPeerBinding(record, { allowedScopes: this.#scopes }));
          accepted++;
        } catch { rejected++; }
      }
      if (accepted) {
        try { await this.#persist(candidate.exportState()); }
        catch { this.#failed = true; throw new Error('Discovery persistence failed'); }
        this.#store = candidate;
      }
      return { accepted, rejected };
    });
    this.#queue = action.catch(() => {});
    return action;
  }
  async importContact(record) {
    verifyPeerBinding(record, { allowedScopes: this.#scopes });
    this.#admitSubject(record.nodeId);
    const result = await this.#accept([record]);
    if (result.rejected) throw new Error('Stale, conflicting or inadmissible contact');
    return this.#store.get(record.nodeId);
  }
  async publish(endpoints, { leaseMs = 600_000 } = {}) {
    this.#assertReady();
    if (!Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 86_400_000) throw new Error('Invalid contact lease');
    // Serialize revision allocation as well as persistence, so parallel publication
    // cannot issue different records at the same sequence.
    const action = this.#queue.then(async () => {
      this.#assertReady();
      const now = Date.now();
      const record = createContact(this.#identity, { peerId: this.peerId, revision: this.#store.highestRevision(this.nodeId) + 1, issuedAt: now, expiresAt: now + leaseMs, endpoints });
      const candidate = this.#store.fork();
      candidate.accept(verifyPeerBinding(record, { allowedScopes: this.#scopes }));
      try { await this.#persist(candidate.exportState()); }
      catch { this.#failed = true; throw new Error('Discovery persistence failed'); }
      this.#store = candidate;
      return record;
    });
    this.#queue = action.catch(() => {});
    return action;
  }
  async sync() {
    this.#assertReady();
    if (!this.#node) throw new Error('Discovery not started');
    if (this.#syncing) return this.#syncing;
    this.#syncing = Promise.all(this.#seeds.map(async seed => {
      let stream;
      try {
        const signal = AbortSignal.timeout(this.#timeout);
        stream = await this.#node.dialProtocol(seed.address, DISCOVERY_PROTOCOL, { signal });
        const framed = lpStream(stream, { maxDataLength: MAX_PACKET, maxBufferSize: MAX_PACKET + 16 });
        await framed.write(encode(this.#store.records()), { signal });
        const result = await this.#accept(decode(await framed.read({ signal })));
        await stream.close({ signal });
        return { peerId: seed.peerId, status: 'exchanged', ...result };
      } catch (error) {
        stream?.abort(error);
        return { peerId: seed.peerId, status: 'unavailable' };
      }
    })).finally(() => { this.#syncing = null; });
    return this.#syncing;
  }
  async lookup(id, { refresh = true } = {}) {
    this.#assertReady();
    if (!/^elsemesh-node:[0-9a-f]{64}$/.test(id)) throw new Error('Invalid destination NodeID');
    this.#admitSubject(id);
    if (refresh) await this.sync();
    this.#assertReady();
    return this.#store.get(id);
  }
  async stop() {
    this.#stopped = true;
    await this.#node?.stop();
    await this.#syncing;
    await this.#queue;
  }
}
