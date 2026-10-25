# Per-owner local runtime

Each client runs `tools/networking/owner-world-runtime.mjs` on loopback. The MSI
owns only the warehouse authority and immutable repository; the Mac owns only the
dock authority and repository. HP hosts the encrypted byte relay only. A single
browser socket to localhost does not confer remote VIEW, ENTER or commit rights.

## Provisioning contract

Provision native Ed25519 keys on the owner machine using
`network/identity.mjs:newIdentity()`; save the owner key and a separate authority
key outside every world repository. Exchange public keys and explicitly approve
the two contacts. Re-sign content admissions, region manifests, authority
delegations, and portal invitation/acceptance with those local owner keys.
Do not copy a server identity generated on HP to either client.

Runtime requires existing JSON identity at `ELSEMESH_OWNER_IDENTITY`; startup
never generates or replaces keys. Set `ELSEMESH_OWNER_CONFIG` to the private
config, `ELSEMESH_OWNER_STATIC` to the prepared dist directory,
`ELSEMESH_OWNER_PORT` to the stable local port (default 5201), and
`ELSEMESH_OWNER_RELAY=ws://127.0.0.1:18891` through the existing SSH tunnel.

The config has this shape (placeholders are objects, not literal strings):

```js
{
 protocol: 'elsemesh.owner-runtime/1',
 worlds: [{
  worldId: authoredWorldId, regionId: authoredRegionId,
  root: absoluteLocalImmutableGitRepository, commit: full40CharacterCommit,
  ownerNodeId, published: ownerSignedRegion, binding: ownerSignedContentAdmission,
  delegation: ownerSignedAuthorityDelegation,
  portals: authoredPortalsWithOwnerInvitationAndAcceptance
 }],
 trustedOwners: [warehouseOwnerNodeId, dockOwnerNodeId],
 contacts: [
  {worldId: warehouseAuthoredWorldId, authorityNodeId: warehouseAuthorityNodeId,
   publicKeyPem: warehouseAuthorityPublicKey, descriptor: warehouseDescriptor},
  {worldId: dockAuthoredWorldId, authorityNodeId: dockAuthorityNodeId,
   publicKeyPem: dockAuthorityPublicKey, descriptor: dockDescriptor}
 ],
 peers: [{published: otherOwnerSignedRegion, delegation: otherAuthorityDelegation,
          invitation: ownerSignedPortalInvitation, acceptance: otherOwnerAcceptance}],
 players: {[browserPlayerNodeId]: {label: 'Player'}},
 policy: {viewPlayers: [playerId], enterPlayers: [playerId], capacity: 16},
 ledgerPath: absolutePrivateOwnerLedgerPath,
 avatarAssetId: validatedAvatarAssetHash,
 inventoryHash: validatedInventoryHash
}
```

Each descriptor contains `{worldId,regionId,contentDigest,epoch,binding,published}`.
Descriptor worldId/regionId are authored repository IDs. The signed region's
worldId/regionId are federation IDs; runtime config exposes both bindings to
the browser challenge verifier. The config must contain exactly one local world.
All descriptors and publications must agree with the immutable content and
explicit owner trust. Each authored directional portal needs its approved
invitation/acceptance in the authority peer list.

Only public runtime config is served: IDs, owner/authority pins and content digests.
Private keys, policies, repository paths and the ledger are never served.

## Browser and recovery behavior

Select `OwnerWorldTransport` for protocol `elsemesh.owner-runtime/1`.
Local browser WebSocket identity proof is followed by a destination-issued signed
nonce and browser signature for VIEW and separately ENTER. Every later browser
operation also bears its player signature; trusted peer transport is not player
authentication. Remote owners verify the original player envelope.

Source prepare durably fences its member. Destination readiness/capacity is owned
by the destination. The core handoff operation commits remotely; the browser
adapter marks commit attempted before invoking it so a lost reply remains frozen.
Source status/cancel requires destination receipt/tombstone. A verified committed
receipt is required before routing the browser to the destination. Fresh VIEW is
then bound to the destination session.

Facade routing caches are disposable. Signed reservation requests name the
original source world, and the source reconstructs only that player's matching
reservation from its durable ledger. Prepare uses a browser-known UUID before
the source can fence; lost preparation replies can be rediscovered. Pending
destination reservations are recovered by querying the destination's signed
record. Normal ENTER, capacity and clearance rejections produce a binding-specific
destination-signed durable no-commit tombstone. An authenticated cancellation can
also tombstone an unknown transfer using the full validated source binding, so a
ready message delayed in transit cannot resurrect it. Source resumption requires
that signed proof; timeout alone never releases a source fence. Unknown outcomes
keep controls frozen. A normal source restart derives
its welcome from current local membership or the latest departed destination,
preventing creation of a second source membership. A fresh page receives its own
pending source record only after browser identity authentication. OwnerWorldTransport
reconciles status and, where uncommitted, obtains signed cancellation before any
graphics activation or source movement. It then renews destination/source VIEW and
ENTER proofs for the settled session. Unreachable owners keep bootstrap blocked.

The repository browser contract uses radians. The authority bridge converts
motion angles to degrees only at the legacy V2 portal primitive boundary and
converts mapped arrival angles back to radians. Signed source motion remains in
the original browser units.

Native two-device graphics, owner key provisioning on both actual clients, and
browser rendering acceptance remain separate qualification.

## Focused verification

Run on HP only:

```sh
node --test test/owner-world-runtime.mjs
node test/owner-world-authority.mjs
node --test test/owner-peer-rpc.mjs
```

The first runtime test uses ephemeral loopback, a real immutable Git repository,
real keys, and the actual OwnerWorldTransport with WebCrypto to prove browser
identity, VIEW/ENTER, accepted poses, private-config omission and replay denial.
The second starts two separate local facades and the encrypted byte relay. It
proves prepared reservation rediscovery after source restart, definitive
cancellation, committed transfer recovery after source restart, remote bootstrap,
return travel, generation/sequence continuity, explicit remote ENTER/capacity/occupied rejection, physical occupancy rejection, and
rotated portal yaw/velocity mapping. It manually signs the same browser request
protocol for the two-owner travel sequence; it also exercises an actual fresh OwnerWorldTransport/WebCrypto bootstrap after a ready request is lost before destination delivery and source restart, proving signed no-commit cancellation and delayed-ready rejection. It does not exercise the renderer.

## Collision correction for normal movement

An authenticated normal `state` request blocked by player clearance receives a
signed `pose-corrected` receipt containing the last accepted pose. It binds the
original signed request, authority epoch, player, world, session, generation and
attempted/accepted sequences; it expires within five seconds. Rejected motion
never advances the ledger sequence. The browser validates the receipt, rechecks
its current context after signature verification, and resets physics position,
velocity and crossing history while preserving the current look direction.
Pending transfers and frozen/offline clients ignore corrections; a correction
cannot resume a frozen player. Authentication errors and actual transport loss
retain the existing fail-closed behavior.

This applies only to ordinary movement. Strict `accepted-state` rejection before
portal preparation still throws and can mark the owner offline; it cannot grant
a crossing or prepare/commit a transfer. That recovery limitation remains.

HP protocol/host checks: `node --test test/owner-motion-correction.mjs
 test/owner-motion-application.mjs` (11 cases). Real native collision and travel
acceptance must be reported separately from these tests.


## Minimum participating owner runtime

All participating owner installations must upgrade to the qualified consent-enabled owner package, including its matching prebuilt client. Older owner-runtime/1 installations lack signed VIEW-session and motion receipt fields required by the new guarantees. Mixed old/new owner federation is not supported by this release; an outdated destination is unavailable and reports **Owner runtime upgrade required**. This is not an invitation to relax receipt verification or couple VIEW permission to ENTER.

Use the whole owner application package when upgrading; keep owner keys, world repositories and ledger/configuration in their existing external state locations. Do not run two authorities concurrently with the same identity/state. Existing owners are not automatically restarted or upgraded by the static website release. Ordinary static single-player mode needs no owner connection and remains functional with an empty sharing roster.
