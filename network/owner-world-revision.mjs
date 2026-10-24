import { readFile, open, mkdir, lstat, realpath } from "node:fs/promises";
import { join, dirname, resolve, relative } from "node:path";
import { randomUUID } from "node:crypto";
import {
  canonical,
  assetId,
  signObject,
  verifyObject,
  nodeId,
} from "./identity.mjs";
import { OwnerWorldLedger, ownerStateDigest } from "./owner-world-ledger.mjs";
import { verifyRegionVersion } from "./federation.mjs";
import { OwnerWorldAuthority } from "./owner-world-authority.mjs";
import {
  normalizeObjectAccess,
  OwnerObjectAccess,
} from "./owner-object-access.mjs";
import { prepareRepositoryConfig } from "../tools/networking/repository-world-server.mjs";
import {
  loadWorldSource,
  validateNeonSign,
} from "../src/world-runtime/vendor/world-engine-contract.js";
const check = (v, m) => {
    if (!v) throw Error(m);
  },
  digest = (v) => assetId(Buffer.from(canonical(v))),
  same = (a, b) => canonical(a) === canonical(b),
  terminal = (t) =>
    t.role === "SOURCE"
      ? ["DEPARTED", "CANCELLED"].includes(t.status)
      : t.role === "DESTINATION" &&
        ["COMMITTED", "CANCELLED"].includes(t.status);
const ordinary = async (p) => {
  const s = await lstat(p);
  check(
    s.isFile() && !s.isSymbolicLink() && s.size <= 8 * 1024 * 1024,
    "Invalid revision file",
  );
  return readFile(p);
};
export const revisionBundleDigest = (b) => digest(b);
function assertSelectorReceipt(state) {
  const r = state.revision,
    s = r?.selector;
  check(
    s &&
      r.receipt &&
      s.bundleDigest === r.receipt.bundleDigest &&
      s.migrationID === r.receipt.migrationID &&
      s.path === `revisions/${s.bundleDigest.slice(7)}.json` &&
      r.manifest?.migrationID === s.migrationID &&
      r.receipt.oldStateDigest === r.manifest.expectedOldStateDigest &&
      verifyObject(r.receipt, new Set([r.manifest.signer])) &&
      r.manifest.roster.some(
        (row) =>
          row.ownerNodeId === r.manifest.signer &&
          row.worldId === r.receipt.worldId &&
          row.bundleDigest === s.bundleDigest,
      ),
    "Committed selector differs from signed receipt",
  );
}

export function ownerBinding(config) {
  const w = config.worlds[0],
    r = w.published.descriptor;
  return {
    authority: r.authority.nodeId,
    world: r.worldId,
    content: w.published.manifestHash,
    epoch: r.authority.epoch,
  };
}
export function revisionPairDigest(m) {
  return digest({ pairID: m.pairID, roster: m.roster, homes: m.homes });
}
function manifestValid(m, owner) {
  check(
    m?.protocol === "elsemesh.owner-revision-manifest/1" &&
      m.signer === owner &&
      verifyObject(m, new Set([owner])),
    "Owner-signed migration manifest required",
  );
  check(
    typeof m.migrationID === "string" &&
      /^[A-Za-z0-9._:-]{1,128}$/.test(m.migrationID) &&
      typeof m.pairID === "string" &&
      /^[A-Za-z0-9._:-]{1,128}$/.test(m.pairID) &&
      Array.isArray(m.roster) &&
      m.roster.length === 2,
    "Invalid migration/pair identity",
  );
  check(
    new Set(m.roster.map((r) => r.ownerNodeId)).size === 2 &&
      new Set(m.roster.map((r) => r.worldId)).size === 2 &&
      m.roster.every(
        (r) =>
          typeof r.bundleDigest === "string" &&
          /^sha256:[a-f0-9]{64}$/.test(r.bundleDigest) &&
          Number.isSafeInteger(r.oldEpoch) &&
          Number.isSafeInteger(r.newEpoch) &&
          r.newEpoch > r.oldEpoch,
      ),
    "Invalid revision pair roster",
  );
  check(
    Array.isArray(m.homes) &&
      m.homes.length <= 128 &&
      new Set(m.homes.map((h) => h.playerId)).size === m.homes.length &&
      m.homes.every(
        (h) =>
          /^player:[a-f0-9]{64}$/.test(h.playerId) &&
          m.roster.some((r) => r.worldId === h.worldId),
      ),
    "Unique explicit home membership required",
  );
  check(
    Array.isArray(m.adminSubjects) &&
      new Set(m.adminSubjects).size === m.adminSubjects.length,
    "Explicit administrator subjects required",
  );
  return m;
}
async function bundleValid(bundle, anchor, identity, { full = true } = {}) {
  const old = anchor.worlds[0],
    owner = old.ownerNodeId;
  check(
    bundle?.protocol === "elsemesh.owner-revision-bundle/1" &&
      bundle.signer === owner &&
      verifyObject(bundle, new Set([owner])),
    "Owner-signed revision bundle required",
  );
  check(
    !/privateKey|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/.test(
      JSON.stringify(bundle),
    ),
    "Revision bundle must not contain private keys",
  );
  const c = bundle.config,
    w = c?.worlds?.[0];
  check(
    c?.protocol === "elsemesh.owner-runtime/1" &&
      c.worlds.length === 1 &&
      w.ownerNodeId === owner &&
      w.worldId === old.worldId &&
      w.regionId === old.regionId &&
      resolve(c.ledgerPath) === resolve(anchor.ledgerPath) &&
      same([...c.trustedOwners].sort(), [...anchor.trustedOwners].sort()) &&
      ownerBinding(c).authority === identity.nodeId,
    "Revision owner/world/authority/ledger/trust drift",
  );
  check(
    Array.isArray(bundle.adminDelegations) &&
      Array.isArray(c.contacts) &&
      c.contacts.length === 2 &&
      c.contacts.every(
        (x) =>
          x.descriptor &&
          verifyObject(x.descriptor.binding, new Set(c.trustedOwners)) &&
          verifyObject(x.descriptor.published, new Set(c.trustedOwners)) &&
          x.worldId === x.descriptor.worldId &&
          x.descriptor.epoch ===
            x.descriptor.published.descriptor.authority.epoch &&
          x.descriptor.binding.authorityEpoch === x.descriptor.epoch &&
          x.descriptor.binding.contentDigest === x.descriptor.contentDigest &&
          x.descriptor.binding.authorityNodeId === x.authorityNodeId &&
          nodeId(x.publicKeyPem) === x.authorityNodeId &&
          Number.isSafeInteger(x.descriptor.binding.expiresAt) &&
          ((!full && x.worldId !== w.worldId) ||
            x.descriptor.binding.expiresAt > Date.now()),
      ),
    "Invalid revision contacts",
  );
  const worldRoot = await realpath(w.root),
    stateRoot = await realpath(dirname(resolve(c.ledgerPath)));
  const contains = (a, b) => {
    const r = relative(a, b);
    return r === "" || (!r.startsWith("..") && !r.includes(":"));
  };
  check(
    !contains(worldRoot, stateRoot) && !contains(stateRoot, worldRoot),
    "Revision world and private ledger directories must remain disjoint",
  );
  const local = c.contacts.find((x) => x.worldId === w.worldId);
  check(
    local &&
      local.authorityNodeId === identity.nodeId &&
      same(local.descriptor.binding, w.binding) &&
      same(local.descriptor.published, w.published),
    "Revision local contact drift",
  );
  for (const p of c.peers)
    check(
      c.contacts.some((x) => same(x.descriptor.published, p.published)),
      "Peer publication differs from selected contact",
    );
  if (!full)
    return {
      config: { ...c, objectAdminDelegations: bundle.adminDelegations },
    };
  check(
    Array.isArray(c.peers) && c.peers.length === 2,
    "Two fresh directional peer approvals required",
  );
  for (const peer of c.peers) {
    const prior = anchor.peers.find(
      (p) => p.invitation.portal.portalId === peer.invitation.portal.portalId,
    );
    check(
      prior &&
        peer.invitation.invitationId !== prior.invitation.invitationId &&
        peer.invitation.portal.revision > prior.invitation.portal.revision,
      "Fresh higher-revision portal invitations required for owner revision",
    );
  }
  const prepared = await prepareRepositoryConfig(c, identity),
    world = prepared.worlds[0],
    project = (await loadWorldSource(world.source)).project;
  const authority = new OwnerWorldAuthority({
    identity,
    published: world.published,
    delegation: world.delegation,
    trustedOwners: new Set(c.trustedOwners),
    peers: c.peers,
    policy: c.policy,
    readWorld: async () => {},
    clearance: () => false,
    rpc: async () => {
      throw Error("Offline revision never uses RPC");
    },
  });
  authority.assertCurrent();
  for (const node of authority.peers.keys()) authority.peer(node);
  check(
    world.clearance(project.spawn.position) === true,
    "New revision spawn lacks strict clearance",
  );
  for (const portal of project.portals ?? [])
    check(
      world.clearance([
        portal.position[0],
        portal.position[1] - portal.height / 2,
        portal.position[2],
      ]) === true,
      "New revision portal lacks strict arrival clearance",
    );
  new OwnerObjectAccess({
    project,
    world,
    identity,
    authority,
    players: c.players,
    adminDelegations: bundle.adminDelegations,
  });
  return {
    config: { ...c, objectAdminDelegations: bundle.adminDelegations },
    world,
    project,
  };
}
export async function stageOwnerRevision({
  ledgerPath,
  bundle,
  anchorConfig,
  identity,
}) {
  const existing = await OwnerWorldLedger.inspect(ledgerPath);
  if (existing.revision?.activation)
    anchorConfig = await selectOwnerRevision(anchorConfig, identity);
  await bundleValid(bundle, anchorConfig, identity);
  const bytes = Buffer.from(canonical(bundle)),
    id = revisionBundleDigest(bundle),
    name = id.slice(7) + ".json",
    dir = join(dirname(resolve(ledgerPath)), "revisions");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const directory = await lstat(dir);
  check(
    directory.isDirectory() && !directory.isSymbolicLink(),
    "Revision staging directory must be ordinary",
  );
  const path = join(dir, name);
  try {
    const file = await open(path, "wx", 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    check(
      Buffer.compare(await ordinary(path), bytes) === 0,
      "Staged immutable revision conflict",
    );
  }
  return { path: "revisions/" + name, bundleDigest: id, bytes: bytes.length };
}
export function transformOwnerRevisionState(
  state,
  {
    manifest,
    newBinding,
    oldProject,
    newProject,
    config,
    newContentDigest,
    now = Date.now(),
    review = false,
  },
) {
  check(
    same(state.binding, manifest.expectedOldBinding) &&
      ownerStateDigest(state) === manifest.expectedOldStateDigest,
    "Old binding/state digest changed",
  );
  check(
    newBinding.world === state.binding.world &&
      newBinding.authority === state.binding.authority &&
      newBinding.epoch > state.binding.epoch,
    "Revision requires same authority/world and higher epoch",
  );
  check(
    Object.values(state.transfers).every(terminal),
    "Pending transfer blocks offline migration",
  );
  check(
    Object.values(state.members).every(
      (m) => m.status === "ACTIVE" && !m.transferId,
    ),
    "Fenced/non-active member blocks migration",
  );
  const homes = manifest.homes
    .filter((h) => h.worldId === newProject.metadata.worldId)
    .map((h) => h.playerId)
    .sort();
  check(
    same(Object.keys(state.members).sort(), homes),
    "All players must return to their unique declared home world before migration",
  );
  const next = structuredClone(state);
  next.binding = structuredClone(newBinding);
  next.challenges = {};
  next.grants = {};
  for (const member of Object.values(next.members)) {
    check(
      config.players[member.playerNodeId] &&
        config.policy.enterPlayers.includes(member.playerId),
      "Home member removed from explicit enrollment",
    );
    member.sessionId = "elsemesh-session:" + randomUUID();
    member.generation = (member.generation ?? 0) + 1;
    member.sequence = 0;
    member.motion.velocity = [0, 0, 0];
    delete member.destinationSessionId;
    member.worldId = newBinding.world;
  }
  for (const t of Object.values(next.transfers))
    t.archivedByMigration = manifest.migrationID;
  const policy = normalizeObjectAccess(newProject),
    old = new Map(oldProject.objects.map((o) => [o.id, o])),
    objects = new Map(newProject.objects.map((o) => [o.id, o])),
    oldAccess = state.objectAccess,
    kept = [],
    removed = [],
    retyped = [];
  const terminalFor = (project, id) =>
    project.terminals?.find((t) => t.objectId === id);
  const stable = (id) =>
    old.has(id) &&
    objects.has(id) &&
    old.get(id).kind === objects.get(id).kind &&
    !!terminalFor(oldProject, id) === !!terminalFor(newProject, id) &&
    terminalFor(oldProject, id)?.kind === terminalFor(newProject, id)?.kind;
  for (const [key, allowed] of Object.entries(oldAccess?.grants ?? {})) {
    if (!allowed) continue;
    let tuple;
    try {
      tuple = JSON.parse(key);
    } catch {
      removed.push({ key, reason: "invalid grant key" });
      continue;
    }
    if (
      !Array.isArray(tuple) ||
      tuple.length !== 3 ||
      !tuple.every((x) => typeof x === "string") ||
      !/^elsemesh-node:[a-f0-9]{64}$/.test(tuple[0])
    ) {
      removed.push({ key, reason: "invalid grant key" });
      continue;
    }
    const [node, id, action] = tuple,
      valid =
        stable(id) &&
        Object.hasOwn(config.players, node) &&
        config.policy.enterPlayers.includes("player:" + node.split(":")[1]) &&
        policy.rules.some(
          (r) => r.objectId === id && r.actions.includes(action),
        );
    if (valid) kept.push(key);
    else {
      removed.push({
        key,
        reason:
          old.has(id) && objects.has(id) && !stable(id)
            ? "retyped object"
            : "removed object/action/player ceiling",
      });
      if (old.has(id) && objects.has(id) && !stable(id)) retyped.push(id);
    }
  }
  const signs = (oldAccess?.overlay?.signs ?? []).filter(
    (x) =>
      stable(x.id) &&
      objects.get(x.id).kind === "neon-sign" &&
      !validateNeonSign(x.config).length &&
      policy.rules.some(
        (r) =>
          r.objectId === x.id && r.actions.some((a) => a.startsWith("neon.")),
      ),
  );
  const diff = {
    retained: kept.sort(),
    removed: removed.sort((a, b) => a.key.localeCompare(b.key)),
    retyped: [...old.keys()]
      .filter((id) => objects.has(id) && !stable(id))
      .sort(),
  };
  if (!review)
    check(
      same(manifest.aclDiff, diff),
      "Reviewed ACL diff differs from computed migration",
    );
  next.objectAccess = {
    contentDigest: newContentDigest,
    policyDigest: policy.policyDigest,
    policyVersion: policy.policyVersion,
    revision: (oldAccess?.revision ?? 0) + 1,
    grants: Object.fromEntries(kept.map((k) => [k, true])),
    audit: [
      ...(oldAccess?.audit ?? []).slice(-4095),
      {
        kind: "owner-revision",
        revision: (oldAccess?.revision ?? 0) + 1,
        actor: manifest.signer ?? null,
        migrationID: manifest.migrationID,
        at: now,
        diff,
      },
    ],
    overlay: { signs },
    replay: {},
  };
  if (next.worldWelcome) {
    next.worldWelcome = {
      schema: "elsemesh.private-world-visits/1",
      visits: Object.fromEntries(
        Object.entries(next.worldWelcome.visits ?? {})
          .filter(([key, v]) => {
            try {
              return (
                v.seen === true &&
                JSON.parse(key)[0] === newProject.metadata.worldId
              );
            } catch {
              return false;
            }
          })
          .map(([key, v]) => [
            key,
            {
              seen: true,
              seenAt: v.seenAt ?? now,
              migratedBy: manifest.migrationID,
            },
          ]),
      ),
    };
  }
  return { state: next, diff };
}

function validateOldSource(anchor, state, loaded) {
  const w = anchor.worlds[0];
  verifyRegionVersion(w.published, new Set(anchor.trustedOwners));
  check(
    same(ownerBinding(anchor), state.binding) &&
      verifyObject(w.binding, new Set([w.ownerNodeId])) &&
      w.binding.contentDigest === loaded.identity.contentDigest &&
      w.contentDigest === loaded.identity.contentDigest &&
      w.binding.authoredWorldId === loaded.project.metadata.worldId &&
      w.binding.authoredRegionId === loaded.project.metadata.regionId &&
      w.worldId === loaded.project.metadata.worldId &&
      w.regionId === loaded.project.metadata.regionId &&
      w.binding.authorityEpoch === state.binding.epoch &&
      w.binding.authorityNodeId === state.binding.authority &&
      w.published.descriptor.assets.some(
        (a) =>
          a.assetId ===
          "sha256:" + loaded.identity.contentDigest.replace(/^sha256:/, ""),
      ),
    "Old pinned source/config does not match exact ledger binding",
  );
}
export async function reviewOwnerRevision({
  ledgerPath,
  bundle,
  anchorConfig,
  identity,
  migrationID,
  pairID,
  roster,
  homes,
  adminSubjects = [],
}) {
  const state = await OwnerWorldLedger.inspect(ledgerPath);
  if (state.revision?.activation)
    anchorConfig = await selectOwnerRevision(anchorConfig, identity);
  const validated = await bundleValid(bundle, anchorConfig, identity),
    server = await import("../tools/networking/repository-world-server.mjs"),
    old = anchorConfig.worlds[0],
    oldLoaded = await loadWorldSource(
      await server.pinnedRepository(old.root, old.commit),
    );
  validateOldSource(anchorConfig, state, oldLoaded);
  const oldProject = oldLoaded.project;
  const manifest = {
    protocol: "elsemesh.owner-revision-manifest/1",
    migrationID,
    pairID,
    roster,
    homes,
    adminSubjects,
    expectedOldBinding: state.binding,
    expectedOldStateDigest: ownerStateDigest(state),
    aclDiff: null,
  };
  const reviewed = transformOwnerRevisionState(state, {
    manifest,
    newBinding: ownerBinding(validated.config),
    oldProject,
    newProject: validated.project,
    config: validated.config,
    newContentDigest: validated.world.contentDigest,
    review: true,
  });
  manifest.aclDiff = reviewed.diff;
  return {
    manifest,
    summary: {
      members: Object.keys(state.members),
      terminalTransfers: Object.keys(state.transfers).length,
      aclDiff: reviewed.diff,
      newBundleDigest: revisionBundleDigest(bundle),
      newBinding: ownerBinding(validated.config),
    },
  };
}
export async function migrateOwnerRevision({
  ledgerPath,
  manifest,
  bundle,
  anchorConfig,
  identity,
  ownerIdentity,
  fault = () => {},
}) {
  manifestValid(manifest, anchorConfig.worlds[0].ownerNodeId);
  check(
    ownerIdentity.nodeId === manifest.signer &&
      verifyObject(
        signObject(
          { protocol: "elsemesh.revision-key-check/1" },
          ownerIdentity,
        ),
        new Set([manifest.signer]),
      ),
    "Migration receipt owner key mismatch",
  );
  const before = await OwnerWorldLedger.inspect(ledgerPath),
    md = digest(manifest);
  if (before.revision?.selector?.migrationID === manifest.migrationID) {
    check(
      before.revision.manifestDigest === md,
      "Completed migration ID changed",
    );
    assertSelectorReceipt(before);
    const staged = JSON.parse(
      await ordinary(
        join(dirname(resolve(ledgerPath)), before.revision.selector.path),
      ),
    );
    check(
      revisionBundleDigest(staged) === before.revision.selector.bundleDigest,
      "Committed bundle missing/corrupt on retry",
    );
    return before.revision.receipt;
  }
  check(
    same(before.binding, manifest.expectedOldBinding) &&
      ownerStateDigest(before) === manifest.expectedOldStateDigest,
    "Old binding/state digest changed",
  );
  if (before.revision?.activation)
    anchorConfig = await selectOwnerRevision(anchorConfig, identity);
  const local = manifest.roster.find(
    (r) => r.worldId === anchorConfig.worlds[0].worldId,
  );
  check(
    local?.ownerNodeId === manifest.signer &&
      local.oldEpoch === before.binding.epoch &&
      local.bundleDigest === revisionBundleDigest(bundle),
    "Local migration roster drift",
  );
  const validated = await bundleValid(bundle, anchorConfig, identity),
    newBinding = ownerBinding(validated.config);
  for (const row of manifest.roster) {
    const c = validated.config.contacts.find((c) => c.worldId === row.worldId);
    check(
      c &&
        c.descriptor.epoch === row.newEpoch &&
        c.descriptor.published.descriptor.ownerNodeId === row.ownerNodeId,
      "New contacts do not match signed pair roster",
    );
  }
  check(
    newBinding.epoch === local.newEpoch,
    "New epoch differs from signed roster",
  );
  const delegated = bundle.adminDelegations.map((d) => d.playerNodeId).sort();
  check(
    same(delegated, [...manifest.adminSubjects].sort()),
    "Administrator reissuance differs from explicit manifest",
  );
  const oldSource =
      await import("../tools/networking/repository-world-server.mjs"),
    oldWorld = anchorConfig.worlds[0],
    oldLoaded = await loadWorldSource(
      await oldSource.pinnedRepository(oldWorld.root, oldWorld.commit),
    );
  validateOldSource(anchorConfig, before, oldLoaded);
  const oldProject = oldLoaded.project;
  const transformed = transformOwnerRevisionState(before, {
    manifest,
    newBinding,
    oldProject,
    newProject: validated.project,
    config: validated.config,
    newContentDigest: validated.world.contentDigest,
  });
  for (const m of Object.values(transformed.state.members))
    check(
      validated.world.clearance(m.motion.position) === true,
      "Home member pose lacks strict new-world clearance",
    );
  fault("before-stage");
  const selector = await stageOwnerRevision({
    ledgerPath,
    bundle,
    anchorConfig,
    identity,
  });
  fault("after-stage");
  const ledger = await OwnerWorldLedger.open(ledgerPath, before.binding);
  let receipt;
  try {
    await ledger.transact((state) => {
      check(
        ownerStateDigest(state) === manifest.expectedOldStateDigest,
        "Old state changed before commit",
      );
      const next = transformed.state;
      next.revision = {
        schema: "elsemesh.owner-revision/1",
        selector: { ...selector, migrationID: manifest.migrationID },
        manifestDigest: md,
        manifest: structuredClone(manifest),
        previous: state.revision ?? null,
        activation: null,
      };
      const resultingStateDigest = ownerStateDigest(next);
      receipt = signObject(
        {
          protocol: "elsemesh.owner-revision-receipt/1",
          migrationID: manifest.migrationID,
          pairID: manifest.pairID,
          pairDigest: revisionPairDigest(manifest),
          rosterDigest: digest(manifest.roster),
          worldId: oldProject.metadata.worldId,
          bundleDigest: selector.bundleDigest,
          oldStateDigest: manifest.expectedOldStateDigest,
          newBinding,
          homeMembers: Object.values(next.members).map((m) => ({
            playerId: m.playerId,
            playerNodeId: m.playerNodeId,
            sessionId: m.sessionId,
            generation: m.generation,
            sequence: m.sequence,
            motion: m.motion,
          })),
          resultingStateDigest,
          committedAt: Date.now(),
        },
        ownerIdentity,
      );
      next.revision.receipt = receipt;
      fault("before-commit");
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, next);
      return receipt;
    });
    fault("after-db-commit");
  } finally {
    await ledger.close();
  }
  fault("after-commit");
  return receipt;
}
function verifyReceiptPair(state, receipts, config) {
  const r = state.revision,
    m = r.manifest;
  check(
    Array.isArray(receipts) &&
      receipts.length === 2 &&
      new Set(receipts.map((x) => x.signer)).size === 2,
    "Both owner revision receipts required before activation",
  );
  for (const row of m.roster) {
    const receipt = receipts.find((x) => x.signer === row.ownerNodeId);
    check(
      receipt &&
        receipt.protocol === "elsemesh.owner-revision-receipt/1" &&
        verifyObject(receipt, new Set([row.ownerNodeId])) &&
        receipt.pairID === m.pairID &&
        receipt.pairDigest === revisionPairDigest(m) &&
        receipt.rosterDigest === digest(m.roster) &&
        receipt.worldId === row.worldId &&
        receipt.bundleDigest === row.bundleDigest &&
        receipt.newBinding.epoch === row.newEpoch,
      "Mismatched owner revision receipt pair",
    );
    check(
      Array.isArray(receipt.homeMembers) &&
        same(
          receipt.homeMembers.map((m) => m.playerId).sort(),
          m.homes
            .filter((h) => h.worldId === row.worldId)
            .map((h) => h.playerId)
            .sort(),
        ) &&
        receipt.homeMembers.every(
          (x) =>
            x.playerId === "player:" + x.playerNodeId.split(":")[1] &&
            /^elsemesh-session:/.test(x.sessionId) &&
            Number.isSafeInteger(x.generation) &&
            Number.isSafeInteger(x.sequence),
        ),
      "Receipt home membership differs from reviewed unique homes",
    );
    if (config) {
      const c = config.contacts.find((c) => c.worldId === row.worldId);
      check(
        c &&
          c.descriptor.published.descriptor.worldId ===
            receipt.newBinding.world &&
          c.descriptor.published.manifestHash === receipt.newBinding.content &&
          c.descriptor.published.descriptor.authority.nodeId ===
            receipt.newBinding.authority &&
          c.descriptor.epoch === receipt.newBinding.epoch,
        "Peer receipt content differs from selected contacts",
      );
    }
  }
  check(
    receipts.some((x) => same(x, r.receipt)),
    "Local committed receipt absent from pair",
  );
  return true;
}
export async function activateOwnerRevision({ ledgerPath, receipts }) {
  const state = await OwnerWorldLedger.inspect(ledgerPath);
  check(state.revision, "No committed revision");
  assertSelectorReceipt(state);
  const selected = state.revision.selector;
  check(
    /^revisions\/[a-f0-9]{64}\.json$/.test(selected.path),
    "Invalid committed revision selector",
  );
  const selectedBytes = await ordinary(
      join(dirname(resolve(ledgerPath)), selected.path),
    ),
    selectedBundle = JSON.parse(selectedBytes);
  check(
    revisionBundleDigest(selectedBundle) === selected.bundleDigest &&
      Buffer.compare(selectedBytes, Buffer.from(canonical(selectedBundle))) ===
        0 &&
      verifyObject(selectedBundle, new Set([state.revision.receipt.signer])),
    "Committed revision bundle missing/corrupt",
  );
  manifestValid(state.revision.manifest, state.revision.receipt.signer);
  verifyReceiptPair(state, receipts, selectedBundle.config);
  if (state.revision.activation) {
    check(
      same(
        [...state.revision.activation.receipts].sort((a, b) =>
          a.signer.localeCompare(b.signer),
        ),
        [...receipts].sort((a, b) => a.signer.localeCompare(b.signer)),
      ),
      "Activated receipt pair changed",
    );
    return state.revision.activation;
  }
  const committed = structuredClone(state);
  delete committed.revision.receipt;
  check(
    ownerStateDigest(committed) === state.revision.receipt.resultingStateDigest,
    "Committed state changed before pair activation",
  );
  const ledger = await OwnerWorldLedger.open(ledgerPath, state.binding);
  try {
    return await ledger.transact((current) => {
      check(
        same(current.revision.receipt, state.revision.receipt),
        "Revision changed before activation",
      );
      verifyReceiptPair(current, receipts);
      current.revision.activation = {
        receipts: structuredClone(receipts),
        activatedAt: Date.now(),
      };
      return current.revision.activation;
    });
  } finally {
    await ledger.close();
  }
}
export async function selectOwnerRevision(config, identity) {
  let state;
  try {
    state = await OwnerWorldLedger.inspect(config.ledgerPath);
  } catch (e) {
    if (e.code === "ENOENT") return config;
    throw e;
  }
  if (!state.revision) return config;
  const r = state.revision;
  assertSelectorReceipt(state);
  check(
    r.schema === "elsemesh.owner-revision/1" &&
      r.selector &&
      /^revisions\/[a-f0-9]{64}\.json$/.test(r.selector.path),
    "Invalid committed revision selector",
  );
  const bytes = await ordinary(
      join(dirname(resolve(config.ledgerPath)), r.selector.path),
    ),
    bundle = JSON.parse(bytes);
  check(
    revisionBundleDigest(bundle) === r.selector.bundleDigest &&
      Buffer.compare(bytes, Buffer.from(canonical(bundle))) === 0,
    "Committed revision bundle missing/corrupt",
  );
  manifestValid(r.manifest, config.worlds[0].ownerNodeId);
  check(
    digest(r.manifest) === r.manifestDigest &&
      r.manifest.migrationID === r.selector.migrationID,
    "Committed manifest drift",
  );
  check(
    r.activation,
    "Both owners must activate matching committed revision receipts before startup",
  );
  const result = await bundleValid(bundle, config, identity, { full: false });
  verifyReceiptPair(state, r.activation.receipts, result.config);
  check(
    same(ownerBinding(result.config), state.binding) &&
      same(r.receipt.newBinding, state.binding),
    "Selected bundle/ledger binding mismatch",
  );
  return result.config;
}
