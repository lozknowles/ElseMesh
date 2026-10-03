import { readFile, writeFile, mkdir, rename, open, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { loadOrCreateIdentity } from '../../network/identity.mjs';
import { ContactStore } from '../../network/discovery-records.mjs';
import { DiscoveryNode, peerIdForIdentity } from '../../network/libp2p-discovery.mjs';

async function readJson(file, maxBytes) {
  if ((await stat(file)).size > maxBytes) throw new Error('Configuration/state exceeds size limit');
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function run(argv = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    'state-dir': { type: 'string' }, config: { type: 'string' }, node: { type: 'string' }, help: { type: 'boolean' }, 'show-routes': { type: 'boolean' },
  } });
  if (values.help) {
    console.log('Usage: node tools/networking/discovery-node.mjs identity|serve|lookup --state-dir PRIVATE_DIRECTORY [--config CONFIG.json] [--node elsemesh-node:HEX] [--show-routes]');
    return;
  }
  const mode = positionals[0];
  if (positionals.length !== 1 || !['identity', 'serve', 'lookup'].includes(mode) || !values['state-dir']) throw new Error('Mode and --state-dir required; use --help');
  const stateDir = path.resolve(values['state-dir']);
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const lockFile = path.join(stateDir, 'active.lock');
  const lock = await open(lockFile, 'wx', 0o600).catch(() => { throw new Error('State directory is locked; use a separate directory for each node'); });
  let node, timer, stopping;
  const close = async () => {
    if (stopping) return stopping;
    stopping = (async () => {
      clearTimeout(timer);
      await node?.stop();
      await lock.close();
      await unlink(lockFile);
    })();
    return stopping;
  };
  try {
    await lock.writeFile(String(process.pid));
    const identity = await loadOrCreateIdentity(path.join(stateDir, 'identity.json'));
    if (mode === 'identity') {
      console.log(JSON.stringify({ nodeId: identity.nodeId, peerId: peerIdForIdentity(identity.publicKeyPem) }));
      await close(); return;
    }
    if (!values.config) throw new Error('--config required');
    const config = await readJson(values.config, 64 * 1024);
    const fields = ['listen', 'bootstrap', 'allowedPeers', 'contactNodeIds', 'allowedScopes', 'advertise', 'syncIntervalMs'];
    if (!config || Array.isArray(config) || typeof config !== 'object' || Object.keys(config).some(key => !fields.includes(key))) throw new Error('Invalid discovery configuration');
    const allowedScopes = config.allowedScopes ?? ['public'];
    const interval = config.syncIntervalMs ?? 15_000;
    if (!Number.isSafeInteger(interval) || interval < 5000 || interval > 300_000) throw new Error('Invalid sync interval');
    const store = new ContactStore({ maxRecords: 32, allowedScopes });
    const stateFile = path.join(stateDir, 'contacts.json');
    try { store.restoreState(await readJson(stateFile, 1024 * 1024)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const persist = async state => {
      const temp = path.join(stateDir, `contacts-${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(state), { mode: 0o600, flag: 'wx', flush: true });
      await rename(temp, stateFile);
    };
    if (mode === 'lookup' && !values.node) throw new Error('--node required for lookup');
    const contactNodeIds = [...(config.contactNodeIds ?? []), ...(mode === 'lookup' ? [values.node] : [])];
    node = new DiscoveryNode({ identity, store, allowedScopes, bootstrap: config.bootstrap, allowedPeers: config.allowedPeers, contactNodeIds, persist });
    await node.start({ listen: config.listen });
    if (mode === 'lookup') {
      if (!values.node) throw new Error('--node required for lookup');
      const helpers = await node.sync();
      const contact = await node.lookup(values.node, { refresh: false });
      console.log(JSON.stringify({ status: contact?.endpoints.length ? 'FOUND_ROUTE_HINTS' : contact ? 'WITHDRAWN' : 'UNRESOLVED', contact: values['show-routes'] ? contact : contact && { nodeId: contact.nodeId, revision: contact.revision, expiresAt: contact.expiresAt, endpointCount: contact.endpoints.length }, helpers }));
      if (!contact?.endpoints.length) process.exitCode = 2;
      await close(); return;
    }
    if (!Array.isArray(config.advertise)) throw new Error('serve requires explicit advertise array (empty for a lookup-only helper)');
    let own = await node.publish(config.advertise);
    console.log(JSON.stringify({ event: 'discovery-listening', nodeId: identity.nodeId, peerId: node.peerId, ...(values['show-routes'] ? { listen: node.addresses(), contact: own } : { revision: own.revision, endpointCount: own.endpoints.length }) }));
    const tick = async () => {
      try {
        if (own.expiresAt - Date.now() < 300_000) own = await node.publish(config.advertise);
        const helpers = await node.sync();
        console.log(JSON.stringify({ event: 'discovery-sync', helpers }));
        if (!stopping) timer = setTimeout(tick, interval);
      } catch {
        console.error('Discovery stopped after a state/persistence failure');
        process.exitCode = 1;
        await close();
      }
    };
    process.once('SIGINT', () => { void close(); });
    process.once('SIGTERM', () => { void close(); });
    await tick();
  } catch (error) {
    await close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch(() => { console.error('Discovery command failed; check configuration, identity and state-directory ownership.'); process.exitCode = 1; });
}
