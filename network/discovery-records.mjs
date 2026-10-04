import { createPublicKey, verify } from 'node:crypto';
import { isIP } from 'node:net';
import { multiaddr } from '@multiformats/multiaddr';
import { canonical, nodeId, signObject } from './identity.mjs';

export const CONTACT_PROTOCOL = 'elsemesh.node-contact/1';
export const CONTACT_STORE_PROTOCOL = 'elsemesh.contact-store/1';
export const MAX_CONTACT_BYTES = 16 * 1024;
const MAX_LEASE_MS = 86_400_000;
const FUTURE_SKEW_MS = 60_000;
const fields = ['protocol', 'nodeId', 'revision', 'issuedAt', 'expiresAt', 'endpoints', 'peerId', 'signer', 'publicKey', 'signature'];
const check = (condition, message) => { if (!condition) throw new Error(message); };
const safeTime = (value) => Number.isSafeInteger(value) && value >= 0;
const text = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit && Buffer.byteLength(value) <= limit && !/[\x00-\x20\x7f]/.test(value);
const scope = (value) => text(value, 64) && /^[A-Za-z][A-Za-z0-9_.:-]*$/.test(value);

function exactObject(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  return keys.length === allowed.length && keys.every(key => typeof key === 'string' && allowed.includes(key) && 'value' in descriptors[key] && descriptors[key].enumerable);
}

function denseArray(value, limit) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > limit) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) return false;
  return Array.from({ length: value.length }, (_, index) => descriptors[index]).every(descriptor => descriptor && 'value' in descriptor && descriptor.enumerable);
}

function scopes(values) {
  check(denseArray(values, 32) && values.length > 0 && values.every(scope) && new Set(values).size === values.length, 'Invalid allowed scopes');
  return new Set(values);
}

function validateHost(raw, publicScope) {
  const host = raw.replace(/^\[|\]$/g, '').toLowerCase();
  const family = isIP(host);
  if (family === 4) {
    if (publicScope) {
      const [a, b] = host.split('.').map(Number);
      check(a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168) && !(a === 169 && b === 254) && !(a === 100 && b >= 64 && b <= 127), 'Non-public endpoint literal');
    }
  } else if (family === 6) {
    if (publicScope) check(/^[23][0-9a-f]{3}:/.test(host), 'Non-public IPv6 endpoint literal');
  } else {
    check(host.length <= 253 && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)), 'Invalid endpoint hostname');
    if (publicScope) check(host.includes('.') && /[a-z]/.test(host.split('.').at(-1)) && !/(?:^|\.)(?:localhost|local|internal|home|lan)$/.test(host) && !host.endsWith('.ts.net'), 'Non-public endpoint hostname');
  }
  return { host, family };
}

function endpoint(value, allowed) {
  check(exactObject(value, ['transport', 'address', 'scope']) && ['libp2p', 'wss', 'tcp-udp'].includes(value.transport) && text(value.address, 2048) && scope(value.scope) && allowed.has(value.scope), 'Invalid endpoint fields/scope');
  const publicScope = value.scope === 'public';
  if (value.transport === 'libp2p') {
    check(!/[?#]/.test(value.address), 'Multiaddress query/fragment prohibited');
    try { multiaddr(value.address); } catch { throw new Error('Invalid multiaddress syntax'); }
    const parts = value.address.split('/');
    check(parts.shift() === '' && parts.every(Boolean), 'Invalid direct multiaddress');
    const [family, host, transport, port, ...tail] = parts;
    check(['ip4', 'ip6', 'dns', 'dns4', 'dns6'].includes(family) && ['tcp', 'udp'].includes(transport) && /^(?:[1-9][0-9]{0,4})$/.test(port ?? '') && Number(port) <= 65535, 'Invalid multiaddress transport/port');
    const info = validateHost(host ?? '', publicScope);
    check((family !== 'ip4' || info.family === 4) && (family !== 'ip6' || info.family === 6) && (!family.startsWith('dns') || info.family === 0), 'Multiaddress host family mismatch');
    if (['ws', 'wss', 'quic-v1'].includes(tail[0])) {
      const protocol = tail.shift();
      check(protocol === 'quic-v1' ? transport === 'udp' : transport === 'tcp', 'Multiaddress protocol/transport mismatch');
    }
    check(transport !== 'udp' || value.address.includes('/quic-v1'), 'UDP multiaddress requires quic-v1');
    check(tail.length === 0 || (tail.length === 2 && tail[0] === 'p2p' && /^[A-Za-z0-9]{1,256}$/.test(tail[1])), 'Unsupported direct multiaddress suffix');
  } else {
    let parsed;
    try { parsed = new URL(value.address); } catch { throw new Error('Invalid endpoint URL'); }
    check(parsed.protocol === `${value.transport}:` && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.hostname, 'Invalid endpoint URL scheme/credentials');
    validateHost(parsed.hostname, publicScope);
    check(!parsed.port || (Number(parsed.port) >= 1 && Number(parsed.port) <= 65535), 'Invalid endpoint port');
    if (value.transport === 'tcp-udp') check(parsed.port && ['', '/'].includes(parsed.pathname), 'TCP/UDP endpoint requires explicit port and no path');
  }
}

function validate(record, { now, expectedNodeId, allowedScopes, maxLeaseMs, allowExpired = false }) {
  check(safeTime(now) && Number.isSafeInteger(maxLeaseMs) && maxLeaseMs > 0 && maxLeaseMs <= MAX_LEASE_MS, 'Invalid clock/lease policy');
  const allowed = scopes(allowedScopes);
  check(exactObject(record, fields), 'Invalid contact schema');
  check(record.protocol === CONTACT_PROTOCOL && typeof record.nodeId === 'string' && /^elsemesh-node:[0-9a-f]{64}$/.test(record.nodeId) && record.signer === record.nodeId, 'Invalid contact domain/identity');
  check(expectedNodeId === undefined || record.nodeId === expectedNodeId, 'Unexpected contact node identity');
  check(Number.isSafeInteger(record.revision) && record.revision >= 1 && safeTime(record.issuedAt) && safeTime(record.expiresAt) && record.expiresAt > record.issuedAt && record.expiresAt - record.issuedAt <= maxLeaseMs, 'Invalid contact revision/lease');
  check(record.issuedAt - now <= FUTURE_SKEW_MS && (allowExpired || record.expiresAt > now), 'Future or expired contact');
  check(text(record.peerId, 256), 'Invalid contact peer identity');
  check(denseArray(record.endpoints, 32), 'Invalid contact endpoint count');
  record.endpoints.forEach(value => endpoint(value, allowed));
  check(new Set(record.endpoints.map(canonical)).size === record.endpoints.length, 'Duplicate contact endpoints');
  check(typeof record.publicKey === 'string' && Buffer.byteLength(record.publicKey) <= 2048 && typeof record.signature === 'string' && /^[A-Za-z0-9+/]{86}==$/.test(record.signature), 'Invalid contact key/signature encoding');
  const bytes = Buffer.from(canonical(record));
  check(bytes.length <= MAX_CONTACT_BYTES, 'Oversized contact');
  try {
    const key = createPublicKey(record.publicKey);
    const { signature, ...payload } = record;
    check(key.asymmetricKeyType === 'ed25519' && key.export({ type: 'spki', format: 'pem' }) === record.publicKey && nodeId(record.publicKey) === record.nodeId && Buffer.from(signature, 'base64').length === 64 && Buffer.from(signature, 'base64').toString('base64') === signature && verify(null, Buffer.from(canonical(payload)), key, Buffer.from(signature, 'base64')), 'Invalid self-signed Ed25519 contact');
  } catch { throw new Error('Invalid self-signed Ed25519 contact'); }
  // This establishes identity/integrity only, never admission or host authority.
  return structuredClone(record);
}

export function createContact(identity, { revision, issuedAt = Date.now(), expiresAt, endpoints, peerId }) {
  check(Array.isArray(endpoints), 'Invalid contact endpoints');
  const signed = signObject({ protocol: CONTACT_PROTOCOL, nodeId: identity.nodeId, revision, issuedAt, expiresAt, endpoints: structuredClone(endpoints), peerId }, identity);
  return validate(signed, { now: issuedAt, allowedScopes: endpoints.length ? [...new Set(endpoints.map(value => value.scope))] : ['public'], maxLeaseMs: MAX_LEASE_MS });
}

export function verifyContact(record, { now = Date.now(), expectedNodeId, allowedScopes = ['public'], maxLeaseMs = MAX_LEASE_MS } = {}) {
  return validate(record, { now, expectedNodeId, allowedScopes, maxLeaseMs });
}

export class ContactStore {
  #entries = new Map(); #limit; #clock; #scopes;
  constructor({ maxRecords = 256, now = Date.now, allowedScopes = ['public'] } = {}) {
    check(Number.isSafeInteger(maxRecords) && maxRecords >= 1 && maxRecords <= 4096, 'Invalid contact-store capacity');
    scopes(allowedScopes);
    check(typeof now === 'function' || safeTime(now), 'Invalid contact-store clock');
    this.#limit = maxRecords; this.#clock = typeof now === 'function' ? now : () => now; this.#scopes = [...allowedScopes];
  }
  #time() { const now = this.#clock(); check(safeTime(now), 'Invalid contact-store clock'); return now; }
  get size() { return this.#entries.size; }
  highestRevision(id) { return this.#entries.get(id)?.highestRevision ?? 0; }
  accept(record) {
    const valid = verifyContact(record, { now: this.#time(), allowedScopes: this.#scopes });
    const previous = this.#entries.get(valid.nodeId);
    if (previous) {
      check(valid.revision >= previous.highestRevision, 'Contact revision rollback');
      if (valid.revision === previous.highestRevision) {
        check(canonical(valid) === canonical(previous.record), 'Contact revision equivocation');
        return structuredClone(previous.record);
      }
    } else check(this.#entries.size < this.#limit, 'Contact-store capacity reached; rollback guards retained');
    this.#entries.set(valid.nodeId, { nodeId: valid.nodeId, highestRevision: valid.revision, record: valid });
    return structuredClone(valid);
  }
  get(id) { const entry = this.#entries.get(id); return entry && entry.record.expiresAt > this.#time() ? structuredClone(entry.record) : null; }
  records() { const now = this.#time(); return [...this.#entries.values()].filter(entry => entry.record.expiresAt > now).map(entry => structuredClone(entry.record)); }
  exportState() { return { protocol: CONTACT_STORE_PROTOCOL, records: [...this.#entries.values()].sort((a, b) => a.nodeId.localeCompare(b.nodeId)).map(entry => structuredClone(entry)) }; }
  fork() {
    const copy = new ContactStore({ maxRecords: this.#limit, now: this.#clock, allowedScopes: this.#scopes });
    copy.#entries = new Map([...this.#entries].map(([id, entry]) => [id, structuredClone(entry)]));
    return copy;
  }
  restoreState(state) {
    check(exactObject(state, ['protocol', 'records']) && state.protocol === CONTACT_STORE_PROTOCOL && denseArray(state.records, this.#limit), 'Invalid contact-store state');
    const restored = new Map();
    const now = this.#time();
    for (const entry of state.records) {
      check(exactObject(entry, ['nodeId', 'highestRevision', 'record']), 'Invalid contact-store entry');
      const record = validate(entry.record, { now, expectedNodeId: entry.nodeId, allowedScopes: this.#scopes, maxLeaseMs: MAX_LEASE_MS, allowExpired: true });
      check(entry.highestRevision === record.revision && !restored.has(record.nodeId), 'Invalid contact highwater/duplicate');
      const existing = this.#entries.get(record.nodeId);
      if (existing) check(record.revision > existing.highestRevision || (record.revision === existing.highestRevision && canonical(record) === canonical(existing.record)), 'Restored contact rollback/equivocation');
      restored.set(record.nodeId, { nodeId: record.nodeId, highestRevision: record.revision, record });
    }
    // Restore may not silently drop an already retained rollback guard.
    check([...this.#entries.keys()].every(id => restored.has(id)), 'Restore would drop contact rollback guard');
    this.#entries = restored;
    return this;
  }
}
