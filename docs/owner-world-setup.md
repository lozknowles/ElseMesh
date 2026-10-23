# Provision one local owner world

This CLI performs local provisioning using the prepared Node application. It does
not build software, change tunnels, start a relay, or fetch a world. Run development
and tests on HP. When deployment is authorized, copy application code and the
pinned world repository to each owner machine, then run provisioning locally.
Keys are generated on that owner machine and stay there.

The warehouse and dock retain their authored world, region and portal IDs. The
local content must already exist as a Git repository at an exact 40-character
commit. Git and the prepared Node runtime with ws must be installed locally.
The static root is the already compiled application directory.

## Public exchange and local state

Choose a new external state directory whose parent exists. State must be outside the application source/package and world repository.
State, static app and world repository paths must be disjoint. Symlink-resolved paths are checked.
init refuses an existing directory; each later checkpoint/output uses exclusive
creation and never silently overwrites a previous phase.

Private/local files:

- owner.json: owner signing identity, mode 0600 where supported.
- authority.json: distinct runtime authority identity, mode 0600 where supported.
- checkpoint.json, connected.json and incoming.json: local provisioning records.
- config.json: one-world runtime config with explicit policies and local paths.
- ledger.sqlite: this owner's separate durable authority ledger, created
  when the runtime starts. The runtime uses synchronous SQLite transactions for
  durable membership state; JSON ledgers are not automatically migrated.

Exchange only these public, signed files: contact.json, invitation.json and
acceptance.json. Never exchange owner.json, authority.json, a ledger, checkpoint
or config. Windows file mode is not an ACL; keep the state directory within the
owner's private user profile. The application serves only its separate static root.

## Commands

Commands are run from the prepared application directory. Replace the example
paths and exact commit/fingerprint values with the reviewed local deployment
values. Windows example state/world/static paths should be on D: for MSI.
The same options work with absolute POSIX paths on the Mac.

On each owner machine:

```sh
node tools/networking/owner-world-setup.mjs init --state-dir OWNER_STATE --world-root LOCAL_WORLD_REPO --commit FULL_40_CHARACTER_COMMIT --static-root COMPILED_APP_DIR
```

This generates two fresh Ed25519 identities through the existing identity helper.
It loads one immutable pinned repository, signs the region and content admission,
and delegates AUTHORITY to the distinct local runtime identity. The region asset
list binds the actual authored world.json digest; descriptor and content admission
also bind the authored IDs, federation IDs, content digest, authority and epoch.
Only the resulting public contact is exported to contact.json.

Exchange contact.json. Review the other owner's fingerprint through the agreed
human channel, then explicitly pin it:

```sh
node tools/networking/owner-world-setup.mjs invite --state-dir OWNER_STATE --peer-contact RECEIVED_CONTACT_JSON --peer-owner elsemesh-node:REVIEWED_OWNER_FINGERPRINT
```

connect is an alias for invite. This verifies the expected owner signature,
authority public key, delegation, actual content-digest binding, and authored
portal pairing in both directions. It writes this owner's outgoing invitation to
invitation.json using repositoryFederationPortal and the existing signed
federation invitation protocol.

Exchange invitation.json, then run locally on both machines:

```sh
node tools/networking/owner-world-setup.mjs accept --state-dir OWNER_STATE --invitation RECEIVED_INVITATION_JSON
```

This signs only an invitation whose portal transforms and destination match the
already pinned two contacts. It exports acceptance.json. Exchange these public
acceptances.

Create a local enrollment JSON file containing an explicit array, for example:

```json
[
  {
    "nodeId": "elsemesh-node:ACTUAL_BROWSER_PLAYER_FINGERPRINT",
    "label": "Traveler",
    "view": true,
    "enter": true
  }
]
```

Use actual browser player identity fingerprints. Owner, authority and browser
player identities serve distinct roles. Each owner's enrollment policy is local;
VIEW and ENTER are separately stated. Missing enrollment grants no access.
ENTER requires VIEW in this bounded setup. A viewer can have view:true and
enter:false. Flags must be booleans; duplicate or malformed IDs are rejected.

Finalize locally on both machines using the acceptance of that machine's outgoing
invitation. Supply the reviewed avatar asset hash and inventory hash from the
native application configuration:

```sh
node tools/networking/owner-world-setup.mjs finalize --state-dir OWNER_STATE --peer-acceptance RECEIVED_ACCEPTANCE_JSON --enrollment LOCAL_ENROLLMENT_JSON --avatar-asset-id sha256:VALIDATED_AVATAR_HASH --inventory-hash sha256:VALIDATED_INVENTORY_HASH --capacity 16
```

The result is config.json with exactly one local world, two pinned contacts
including self, both directional portal approvals, two trusted owners, explicit
players/VIEW/ENTER policies, and an external local ledger path. Existing authority
keys are read and checked; later phases never regenerate missing keys. Finalize
reopens the pinned Git content through prepareRepositoryConfig before writing.

Provisioning does not start a listener. When runtime startup is authorized:

```sh
node tools/networking/owner-world-setup.mjs start --state-dir OWNER_STATE --port 5201 --relay-url ws://127.0.0.1:18891
```

start calls createOwnerWorldRuntime using authority.json, config.json and the
prepared static root. The existing encrypted SSH forwarding path must already be
available. Port 5201 is local to each owner machine. HP's optional relay retains
only networking state; it never receives private keys, policy or game ledgers.
The existing alternative runtime environment-variable launcher remains usable.

## Prototype authority migration and validity

These fresh owner-generated keys replace the old prototype shared authority.
Existing HP-generated keys are not imported or copied. Authored world/region/
portal IDs and pinned content remain stable; old prototype JSON ledgers, game membership,
grants and transfer ledgers are not automatically admitted into the new owner
ledgers. Start from an explicitly reviewed empty owner ledger. The primary must
retire any old prototype serving path separately before claiming the new topology.

This bounded setup uses authority epoch 1 and region version 1, with content
admission and delegation valid for 24 hours and portal invitations at most 24 hours.
It does not silently renew expired authority, overwrite checkpoints, migrate live
memberships, or implement an ongoing key-rotation/revocation UI. If a phase fails,
inspect the existing local checkpoint and input rather than rerunning with edits
that overwrite proof. Interrupted provisioning may leave an incomplete directory;
preserve it for diagnosis and choose an explicitly reviewed fresh destination.

## Focused evidence

```sh
node --test test/owner-world-setup.mjs
```

HP fixture tests create two immutable Git worlds, independent local owners and
distinct authority keys. They verify public-only exports, actual manifest digest
admission, both directional portal approvals, usable OwnerWorldAuthority configs,
separate ledgers, policies, no world repository changes, contact pin/tamper denial,
path overlap denial and exclusive outputs. This does not prove installation,
browser enrollment, SSH connectivity or physical MSI/Mac gameplay.
