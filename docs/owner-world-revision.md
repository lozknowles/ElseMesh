# Offline two-owner content revision

This is an explicit private-ledger migration. It never reinitializes an existing owner ledger, ignores a binding mismatch, substitutes a new empty ledger, restores an older database, starts a service, or changes a client automatically. Existing `OwnerWorldLedger.open` schema, version and exact binding checks remain unchanged.

Both owners first return every active player to their declared home world using the current transfer protocol. Drain pending transfers and stop both owner processes. Each local migration rejects nonterminal transfers, frozen/fenced members, membership that differs from the reviewed unique home roster, stale expected state digests and an existing process lock. Do not remove a lock belonging to a live or uncertain process. Process-death recovery remains a separate reviewed recovery of the existing lock.

## Signed inputs

Each owner prepares an immutable, owner-signed bundle:

```js
signObject({
  protocol: 'elsemesh.owner-revision-bundle/1',
  config: newOwnerRuntimeConfig,
  adminDelegations: explicitlyReissuedSignedDelegations
}, existingLocalOwnerIdentity)
```

The config uses the same authored world/region IDs, owner, authority identity, ledger path and pinned owner trust. The authority epoch increases. New world content is a full local Git pin with a new owner-signed content admission, published region and authority delegation. Both contact descriptors and peer publications must agree. Issue fresh directional portal invitation/acceptance pairs with increasing portal revisions; old approvals cannot be silently carried forward. No portal primitive or browser-supplied authority override is introduced.

The existing owner and authority keys stay on their native owner machines. A bundle contains public signatures and private configuration paths but no private key material. Keep bundles and receipts in the private owner state directory, outside authored worlds and static hosting.

The two signed migration manifests share `pairID`, the same ordered roster and the same unique homes list. Each local manifest has its own `migrationID` and expected old state:

```js
{
  protocol: 'elsemesh.owner-revision-manifest/1',
  migrationID: 'local-deliberate-revision-id',
  pairID: 'shared-two-owner-revision-id',
  roster: [
    { ownerNodeId, worldId, oldEpoch, newEpoch, bundleDigest },
    { ownerNodeId: peerOwner, worldId: peerWorld, oldEpoch, newEpoch, bundleDigest: peerBundleDigest }
  ],
  homes: [{ playerId, worldId }], // every active player, exactly once across the pair
  adminSubjects: [],             // only these explicitly signed new administrator delegations
  expectedOldBinding,
  expectedOldStateDigest,
  aclDiff: { retained: [], removed: [], retyped: [] }
}
```

Bundle digests hash canonical signed bundle JSON. The manifests bind the whole old SQLite payload digest. Old pinned source signatures and content must match the old ledger binding even if old leases have expired. New admissions, delegation and peer leases must be current during full migration admission. At startup the selected local admission remains current; remote pins are signature/structure checked even after expiry. Expired remote admissions are denied on remote use without preventing independent local startup or local content reads. Full new content admission verifies the native fine-height physics field before mutation, then checks strict spawn, portal arrival and all retained member poses. Park players at clear home positions before stopping; the migration does not silently relocate them.

## Review and apply

CLI entry: `tools/networking/owner-world-revision.mjs`. All options are explicit and output files are new files. These are command templates; retain the exact existing private file paths on each owner machine.

1. `inspect --ledger EXISTING_LEDGER` returns the binding, state digest and bounded member/transfer status summary without opening the ledger for writing.
2. `plan --config EXISTING_CONFIG --authority EXISTING_AUTHORITY --bundle OWNER_SIGNED_NEW_BUNDLE --request SHARED_PAIR_REQUEST --output REVIEW_PLAN` verifies content and produces the unsigned manifest plus ACL diff. The request contains only migrationID, pairID, roster, homes and adminSubjects.
3. Review both plans together. `sign --plan REVIEW_PLAN --owner EXISTING_LOCAL_OWNER --output OWNER_SIGNED_MANIFEST` signs only the reviewed local manifest.
4. `stage --config EXISTING_CONFIG --authority EXISTING_AUTHORITY --bundle OWNER_SIGNED_NEW_BUNDLE` verifies and fsyncs canonical bundle bytes in the existing ledger's private `revisions/<digest>.json` directory. Staging alone changes no active selector or ledger binding.
5. `apply --config EXISTING_CONFIG --authority EXISTING_AUTHORITY --owner EXISTING_LOCAL_OWNER --bundle OWNER_SIGNED_NEW_BUNDLE --manifest OWNER_SIGNED_MANIFEST --output LOCAL_COMMIT_RECEIPT` repeats verification, acquires the existing ledger lock, rechecks the exact old state and atomically commits the new binding, selector, transformed state and owner-signed receipt in the single SQLite payload.
6. Exchange both signed commit receipts. Each `activate --ledger EXISTING_LEDGER --receipts MATCHING_TWO_RECEIPTS_ARRAY` verifies the shared pair/roster/homes, exact local committed receipt and new contact content before activation. One receipt, a changed roster or different pair fails closed.
7. Keep both runtimes stopped until both matching signed receipts have been checked and activation completed on both machines. Then use the existing startup command. Cross-machine activation is deliberately not claimed to be atomic.

A completed identical apply retry returns the same signed receipt. Changed reuse of a migration ID or an uncompleted operation against changed old state is rejected. Missing/corrupt committed bundle bytes never trigger fallback to the old config. Startup reads the database selector, validates its signed immutable bundle and matching receipt pair, and then performs normal content admission. The old config remains only the stable local trust/ledger locator. Later deliberate revisions resolve the active selector first. Rollback means another owner-signed higher-epoch migration, not an old DB restore.

## State rules

Active local home members retain identity and accepted pose; session IDs rotate, generation increases and motion sequence restarts from the migrated accepted pose. VIEW grants and challenges are cleared. Terminal transfers and tombstones remain in private history with a migration archive marker. Shared epoch/content predicates prevent archived histories from becoming live bootstrap, recovery, status or presentation state.

Receipts include signed rotated home membership summaries. A player reconnecting through the other owner is routed to that verified current home session. It cannot be defaulted into a duplicate local membership or reconstructed from an old DEPARTED transfer. New transfers after activation take precedence over the migration home hint.

Object grants survive only for the same stable object kind and terminal system kind (c64, bbc or sun), supported new authored action ceiling, and still enrolled ENTER player. Removed/retyped objects, removed actions and removed players appear in the reviewed diff. Policy/content context and access revision update in the same transaction; prior audit is retained and a migration audit entry is appended. Valid stable neon overrides are retained. Unsupported transient overlay state is discarded. Migrated access contexts fail closed on later content/policy drift instead of clearing private grants automatically.

Only explicitly listed, owner-signed new administrator delegations are used. Old private administrator files do not override the selected bundle. Completed welcome visits remain keyed to stable world/player; unfinished claims, old session claims and VIEW challenges are discarded.

## Qualification and limits

`node --test test/owner-world-revision.mjs` uses fresh synthetic two-owner keys, Git repositories and temporary SQLite state. It tests staged/commit fault boundaries, actual SIGKILL immediately after DB commit and stale-lock rejection, idempotent retry, exact stale-state rejection, both-receipt activation, corrupt/missing bundle failure, old grant/history rejection, remote-home bootstrap, both migrated facades performing an encrypted RPC/browser roundtrip and restart with exactly one membership, remote-expired/local-available startup, terminal-system retyping, ACL retention/removal/retyping, welcome retention, pending/fenced/home conflicts and explicit administrator subjects.

Existing ledger, authority, browser/runtime, object access and welcome regressions must also pass. The separate native physics qualification verifies the exact 16 MiB original fine terrain and failure on missing/corrupt/nonfinite/dimension errors. Production migration, actual client signing, both-owner drain and native acceptance are primary-owned release actions. This source work performs none of them.
