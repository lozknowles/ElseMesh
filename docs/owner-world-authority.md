# Per-owner world authority

Each sidecar owns exactly one local world and one local durable ledger. MSI hosts
its warehouse; Mac hosts its dock. The signed region owner key and delegated
runtime authority key are distinct identities. Both keys are provisioned locally
outside the repository. HP can relay encrypted bytes and builds packages; it has
no authority over these worlds and receives no private keys.

`OwnerWorldAuthority.open(options)` accepts `identity`, owner-signed `published`,
owner-issued `delegation`, `trustedOwners` (Set), `peers` (signed published region,
authority delegation, owner invitation and acceptance), `ledgerPath`, explicit
`policy: {viewPlayers, enterPlayers, capacity}`, immutable bounded `readWorld`,
`clearance`, optional trusted server `localSpawnCandidates()`, and
`rpc(peerAuthority, operation, payload)`.

The caller supplies an absolute SQLite ledger path outside every world/source repository on the owning device. Node.js 24 or later is required. One process holds the exclusive `.lock` file before opening the database. A single payload row is replaced in a short transaction with SQLite `journal_mode=DELETE` and `synchronous=FULL`, verified at startup. In-memory state and acknowledgements advance only after COMMIT succeeds. Async policy/RPC work is calculated before the database transaction. Write uncertainty poisons the runtime and retains the lock. Existing JSON, foreign schema and binding mismatches are rejected without reset or automatic migration.

Unclean termination retains the lock: after verifying the prior process is dead, an operator can remove only the stale lock and restart against the same SQLite ledger. Never delete/reset a ledger to recover a transfer. The HP tests cover reopen, callback rollback, binding mismatch, injected SQLite write failure, and process kill/recovery; actual Windows client operation is a separate acceptance check.

The local facade authenticates every browser request with the browser Ed25519 key,
including read/state/movement/prepare/handoff/status/cancel, checks session and
grant ownership, and rejects request replay. Core grants are bearer capabilities
and must not be exposed to unrelated browser sessions or peers. The injected peer
RPC supplies the authenticated `callerNodeId`; a request body cannot supply it.
Only ready/commit/status/cancel operate as transfer authority RPCs. Trusted peer
transport identities convey no player VIEW, ENTER or administration rights.

A destination `challenge({playerId,playerNodeId,action,sessionId,portalId})` returns
a signed destination authority challenge. The browser verifies the pinned
authority signature, then signs:

```js
signObject({protocol:'elsemesh.owner-player-proof/1',challenge}, browserIdentity)
```

`playerId` must equal `player:${playerNodeId.split(':')[1]}`. Destination challenges
bind the destination authority, world, region, manifest content hash, authority
epoch, player, browser key, session, action, portal and short expiry. Nonces are
consumed durably. `subscribe({proof})` requires VIEW and returns a grant. `read`
and `state` require its active grant. `enterLocal({proof,motion})` requires a
separate local ENTER proof with no portal, capacity and arrival clearance;
remote portal entry always uses a transfer. Policy defaults deny all players.
The owner runtime derives local candidates from immutable admitted collision and
ground data. It tries the supported authored spawn first, then nearest grid
positions in deterministic distance/x/z order (0.8 m spacing, 3.2 m radius,
at most 49 candidates, at most 0.4 m vertical change). A missing floor or blocked
capsule is rejected. These are server constants, never browser-supplied radius
or position policy. Local admission checks capacity, every live member and
reserved portal arrival, and writes the selected motion in the same serialized
ledger transaction. Failure rolls back admission and nonce consumption together.
Yaw, pitch and velocity are preserved; only position can change. The optional
callback is used solely by local ENTER; portal mapping, reservation and commit
keep their exact mapped arrival. Without the callback the core retains its
single-position behavior. No world, wire or ledger schema changes are involved.
`acceptedState({grantId,playerId,sessionId,motion})` updates only ACTIVE membership
and checks movement against current members and reserved arrival space.

The source API is:

1. Obtain a destination ENTER proof naming the portal and current source session.
2. `prepare({grantId,portalId,proof,motion,avatarAssetId,inventoryHash,sequence})`.
   Motion must equal the source's accepted member motion. Source persists an
   intent, asks the destination `ready({binding,proof})` to reserve capacity,
   membership identity and clearance, verifies its signed reservation, and
   durably freezes source membership before returning `{transferId,reservation}`.
3. `handoff({transferId})` persists the signed federation `/2` handoff in an outer
   envelope binding transfer, world contents, epochs and reservation. The source
   then RPCs `commit({transferId,envelope})`. Destination checks admission,
   signature, portal revision, sessions, player, accepted motion, asset hashes,
   epochs, world contents and current clearance. It persists ACTIVE destination
   membership and its signed receipt in one transaction before returning it.
4. Source removes its frozen membership only after verifying and persisting the
   destination receipt. A lost reply leaves source frozen; retry or `status`
   recovers the same persisted destination receipt. Duplicate commit returns the
   original receipt and cannot add a second member.
5. `cancel({transferId})` requests a durable destination cancellation tombstone.
   Source unfreezes only after checking that signed binding. If destination has
   committed, cancel returns the commit receipt and source finalises departure.
   Timeouts and expiry alone never unfreeze issued or fenced source membership.

Reservations do not expire automatically; they block capacity/clearance until
commit or signed cancellation. Unknown outcomes stay frozen across restart.
`status` can reconcile a committed transfer; `cancel` reconciles a tombstone.
A destination cannot convert a cancelled reservation into a committed one.
The committed destination remains authoritative even while the source awaits a
receipt; source FROZEN members cannot move, initiate another transfer, or enter
another world as ACTIVE members through that source.

`dispatch(operation,payload,{callerNodeId})` supports challenge, subscribe, read,
state, accepted-state, enter-local, prepare, ready, handoff, commit, status, cancel.
The browser facade adapts presentation ready/commit packets: authority `handoff`
performs the actual destination commit and source reconciliation. `readWorld`
must serve bounded frozen descriptor/files, never arbitrary filesystem paths or
mutable repository contents. `clearance` must use the loaded collision geometry,
reserved arrivals and members; it must return boolean true to admit.

The focused `node test/owner-world-authority.mjs` uses distinct
owner and authority keys. It proves explicit VIEW versus ENTER denial, missing
VIEW grant rejection, durable freeze after failed cancellation and restart,
tombstone rejection of reservation replay, persisted commit despite lost reply,
restart reconciliation, and idempotent commit. These are core protocol checks;
physical MSI/Mac sidecar deployment and browser roundtrip remain separate
integration acceptance criteria. There is no DHT, global ledger, central game
server or cargo-driving protocol in this scope.

`node --test test/local-spawn-allocation.mjs test/owner-world-authority.mjs`
also covers simultaneous local entries, deterministic nearest placement, durable
replay rejection, full capacity, reserved-arrival occupancy, blocked and missing
support, height bounds, preserved motion and unchanged portal arrivals. These
CPU protocol checks do not establish deployed-device admission or visual quality.
