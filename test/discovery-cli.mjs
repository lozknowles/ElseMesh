import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('../tools/networking/discovery-node.mjs', import.meta.url));
const listen = ['/ip4/127.0.0.1/tcp/0'];
const allowedScopes = ['local:test', 'public'];
const route = { transport: 'wss', address: 'wss://world.example.invalid/ws', scope: 'public' };
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function completedWithin(done, milliseconds) {
  let timer;
  try {
    return await Promise.race([done.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); })]);
  } finally { clearTimeout(timer); }
}

function launch(args, { serving = false } = {}) {
  // Windows OS termination bypasses Node SIGTERM callbacks. The Windows-only
  // child wrapper calls the same exported CLI run() and emits its real shutdown
  // event through test IPC; identity/lookup always execute the CLI entrypoint.
  const wrapped = serving && process.platform === 'win32';
  const script = `const { run } = await import(${JSON.stringify(pathToFileURL(cli).href)});
    process.on('message', message => { if (message?.type === 'test-stop') { process.emit('SIGTERM'); if (process.connected) process.disconnect(); } });
    try { await run(process.argv.slice(1)); } catch { console.error('Discovery test command failed'); process.exitCode=1; if (process.connected) process.disconnect(); }`;
  const child = spawn(process.execPath, wrapped ? ['--input-type=module', '-e', script, ...args] : [cli, ...args], { stdio: wrapped ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'] });
  const handle = { child, wrapped, stdout: '', stderr: '', closed: false, result: null };
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', text => { handle.stdout += text; });
  child.stderr.on('data', text => { handle.stderr += text; });
  handle.done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => { handle.closed = true; handle.result = { code, signal }; resolve(handle.result); });
  });
  // Every child also has an independent bounded wait below and test cleanup.
  handle.done.catch(() => {});
  return handle;
}

function jsonRows(handle) {
  return handle.stdout.split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}

async function stop(handle) {
  if (handle.closed) return handle.done;
  if (handle.wrapped && handle.child.connected) handle.child.send({ type: 'test-stop' });
  else handle.child.kill('SIGTERM');
  if (await completedWithin(handle.done, 1500)) return handle.result;
  handle.child.kill('SIGKILL');
  if (!await completedWithin(handle.done, 3000)) throw new Error('Test child did not terminate');
  return handle.result;
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'elsemesh-discovery-cli-'));
  const children = [];
  t.after(async () => {
    for (const child of children) await stop(child);
    await rm(root, { recursive: true, force: true });
  });
  return {
    root,
    launch(args, options) { const handle = launch(args, options); children.push(handle); return handle; },
    async command(args) {
      const handle = this.launch(args);
      if (!await completedWithin(handle.done, 6000)) { await stop(handle); throw new Error('Discovery CLI exceeded bounded wait'); }
      return { ...handle.result, rows: jsonRows(handle), stdout: handle.stdout, stderr: handle.stderr };
    },
    async config(name, value) { const file = path.join(root, name); await writeFile(file, JSON.stringify(value)); return file; },
  };
}

async function listening(handle) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    const row = jsonRows(handle).find(value => value.event === 'discovery-listening');
    if (row) return row;
    if (handle.closed) throw new Error('Discovery serve exited before startup');
    await sleep(20);
  }
  throw new Error('Discovery serve startup exceeded bounded wait');
}

async function exists(file) { try { await access(file); return true; } catch { return false; } }

test('CLI identity persists across executions and emits public IDs only', { timeout: 20_000 }, async t => {
  const f = await fixture(t), state = path.join(f.root, 'identity-node');
  const first = await f.command(['identity', '--state-dir', state]);
  assert.equal(first.code, 0, first.stderr);
  assert.equal(first.rows.length, 1);
  assert.deepEqual(Object.keys(first.rows[0]).sort(), ['nodeId', 'peerId']);
  assert.match(first.rows[0].nodeId, /^elsemesh-node:[0-9a-f]{64}$/);
  const saved = await readFile(path.join(state, 'identity.json'), 'utf8');
  assert.ok(typeof JSON.parse(saved).privateKeyPem === 'string');
  const second = await f.command(['identity', '--state-dir', state]);
  assert.equal(second.code, 0, second.stderr);
  assert.deepEqual(second.rows[0], first.rows[0]);
  assert.ok(await readFile(path.join(state, 'identity.json'), 'utf8') === saved, 'Saved identity changed');
  assert.ok(!`${first.stdout}${first.stderr}${second.stdout}${second.stderr}`.includes('PRIVATE KEY'));
  const privateBody = JSON.parse(saved).privateKeyPem.split('\n').filter(line => line && !line.startsWith('---')).join('');
  assert.ok(!`${first.stdout}${first.stderr}${second.stdout}${second.stderr}`.includes(privateBody), 'CLI output leaked key material');
  assert.equal(await exists(path.join(state, 'active.lock')), false);
});

test('CLI refuses an exclusive lock and corrupt identity without generating replacements', { timeout: 20_000 }, async t => {
  const f = await fixture(t), locked = path.join(f.root, 'locked'), corrupt = path.join(f.root, 'corrupt');
  await mkdir(locked); await writeFile(path.join(locked, 'active.lock'), 'test-owned-lock');
  const result = await f.command(['identity', '--state-dir', locked]);
  assert.equal(result.code, 1);
  assert.equal(await exists(path.join(locked, 'identity.json')), false);
  assert.equal(await readFile(path.join(locked, 'active.lock'), 'utf8'), 'test-owned-lock');
  await mkdir(corrupt);
  const invalid = '{"nodeId":"invalid","publicKeyPem":"not-a-key","privateKeyPem":"synthetic-invalid"}';
  await writeFile(path.join(corrupt, 'identity.json'), invalid);
  const failure = await f.command(['identity', '--state-dir', corrupt]);
  assert.equal(failure.code, 1);
  assert.ok(await readFile(path.join(corrupt, 'identity.json'), 'utf8') === invalid);
  assert.equal(await exists(path.join(corrupt, 'active.lock')), false);
});

test('CLI corrupt persisted contacts fail closed without replacing identity or state', { timeout: 20_000 }, async t => {
  const f = await fixture(t), state = path.join(f.root, 'corrupt-state');
  assert.equal((await f.command(['identity', '--state-dir', state])).code, 0);
  const identity = await readFile(path.join(state, 'identity.json'), 'utf8');
  const invalid = '{"protocol":"unrecognized","records":[]}';
  await writeFile(path.join(state, 'contacts.json'), invalid);
  const config = await f.config('corrupt-config.json', { listen, bootstrap: [], allowedPeers: [], allowedScopes, advertise: [] });
  const result = await f.command(['serve', '--state-dir', state, '--config', config]);
  assert.equal(result.code, 1);
  assert.ok(await readFile(path.join(state, 'identity.json'), 'utf8') === identity);
  assert.equal(await readFile(path.join(state, 'contacts.json'), 'utf8'), invalid);
  assert.equal(await exists(path.join(state, 'active.lock')), false);
  assert.equal(result.rows.some(row => row.event === 'discovery-listening'), false);
});

test('serve/lookup exchange over pinned loopback peers and retain highwater/routes across restarts', { timeout: 20_000 }, async t => {
  const f = await fixture(t), serverState = path.join(f.root, 'server'), clientState = path.join(f.root, 'client');
  const serverIdentity = await f.command(['identity', '--state-dir', serverState]);
  const clientIdentity = await f.command(['identity', '--state-dir', clientState]);
  assert.equal(serverIdentity.code, 0); assert.equal(clientIdentity.code, 0);
  const a = serverIdentity.rows[0], b = clientIdentity.rows[0];
  const serverConfig = await f.config('server.json', { listen, bootstrap: [], allowedPeers: [b.peerId], allowedScopes, advertise: [route] });
  let server = f.launch(['serve', '--show-routes', '--state-dir', serverState, '--config', serverConfig], { serving: true });
  let startup = await listening(server);
  assert.equal(startup.nodeId, a.nodeId);
  assert.equal(startup.peerId, a.peerId);
  assert.equal(startup.contact.revision, 1);
  assert.match(startup.listen[0], /^\/ip4\/127\.0\.0\.1\/tcp\/[1-9][0-9]*\/p2p\//);
  const locked = await f.command(['identity', '--state-dir', serverState]);
  assert.equal(locked.code, 1);
  const clientConfig = await f.config('client.json', { listen, bootstrap: [startup.listen[0]], allowedPeers: [a.peerId], allowedScopes });
  let lookup = await f.command(['lookup', '--show-routes', '--state-dir', clientState, '--config', clientConfig, '--node', a.nodeId]);
  assert.equal(lookup.code, 0, lookup.stderr);
  assert.equal(lookup.rows[0].status, 'FOUND_ROUTE_HINTS');
  assert.deepEqual(lookup.rows[0].contact.endpoints, [route]);
  assert.ok(lookup.rows[0].helpers.some(helper => helper.status === 'exchanged'));
  let saved = JSON.parse(await readFile(path.join(clientState, 'contacts.json'), 'utf8'));
  assert.equal(saved.records.find(entry => entry.nodeId === a.nodeId).highestRevision, 1);
  await stop(server);
  assert.equal(await exists(path.join(serverState, 'active.lock')), false);
  server = f.launch(['serve', '--show-routes', '--state-dir', serverState, '--config', serverConfig], { serving: true });
  startup = await listening(server);
  assert.equal(startup.nodeId, a.nodeId);
  assert.equal(startup.peerId, a.peerId);
  assert.equal(startup.contact.revision, 2);
  await writeFile(clientConfig, JSON.stringify({ listen, bootstrap: [startup.listen[0]], allowedPeers: [a.peerId], allowedScopes }));
  lookup = await f.command(['lookup', '--show-routes', '--state-dir', clientState, '--config', clientConfig, '--node', a.nodeId]);
  assert.equal(lookup.code, 0, lookup.stderr);
  assert.equal(lookup.rows[0].contact.revision, 2);
  await stop(server);
  saved = JSON.parse(await readFile(path.join(clientState, 'contacts.json'), 'utf8'));
  assert.equal(saved.records.find(entry => entry.nodeId === a.nodeId).highestRevision, 2);
  // A fresh lookup process can load retained signed hints with no dial target.
  const offlineConfig = await f.config('offline.json', { listen, bootstrap: [], allowedPeers: [], allowedScopes });
  lookup = await f.command(['lookup', '--show-routes', '--state-dir', clientState, '--config', offlineConfig, '--node', a.nodeId]);
  assert.equal(lookup.code, 0, lookup.stderr);
  assert.equal(lookup.rows[0].contact.revision, 2);
  assert.deepEqual(lookup.rows[0].contact.endpoints, [route]);
  assert.deepEqual(lookup.rows[0].helpers, []);
  assert.ok(!server.stdout.includes('PRIVATE KEY'));
});

test('serve accepts an explicit empty advertisement and lookup reports withdrawal', { timeout: 20_000 }, async t => {
  const f = await fixture(t), state = path.join(f.root, 'withdrawn');
  const identity = await f.command(['identity', '--state-dir', state]);
  assert.equal(identity.code, 0);
  const config = await f.config('withdrawn.json', { listen, bootstrap: [], allowedPeers: [], allowedScopes, advertise: [] });
  const server = f.launch(['serve', '--show-routes', '--state-dir', state, '--config', config], { serving: true });
  const startup = await listening(server);
  assert.deepEqual(startup.contact.endpoints, []);
  await stop(server);
  const lookup = await f.command(['lookup', '--show-routes', '--state-dir', state, '--config', config, '--node', identity.rows[0].nodeId]);
  assert.equal(lookup.code, 2);
  assert.equal(lookup.rows[0].status, 'WITHDRAWN');
  assert.deepEqual(lookup.rows[0].contact.endpoints, []);
});

test('CLI hides listener addresses and route endpoints unless operator requests them', { timeout: 20_000 }, async t => {
  const f = await fixture(t), state = path.join(f.root, 'redacted');
  const identity = await f.command(['identity', '--state-dir', state]);
  assert.equal(identity.code, 0);
  const config = await f.config('redacted.json', { listen, bootstrap: [], allowedPeers: [], allowedScopes, advertise: [route] });
  const server = f.launch(['serve', '--state-dir', state, '--config', config], { serving: true });
  const startup = await listening(server);
  assert.equal(startup.endpointCount, 1);
  assert.equal(Object.hasOwn(startup, 'listen'), false);
  assert.equal(Object.hasOwn(startup, 'contact'), false);
  assert.ok(!server.stdout.includes(route.address));
  await stop(server);
  const lookup = await f.command(['lookup', '--state-dir', state, '--config', config, '--node', identity.rows[0].nodeId]);
  assert.equal(lookup.code, 0);
  assert.equal(lookup.rows[0].contact.endpointCount, 1);
  assert.equal(Object.hasOwn(lookup.rows[0].contact, 'endpoints'), false);
  assert.ok(!lookup.stdout.includes(route.address));
});
