# Find and run repository worlds

ElseMesh loads authored worlds from independent repositories. The repository-world player is the default game entry. The retired combined-island entry is no longer built or distributed.

## Open the public warehouse

**[Play Loz's warehouse island](https://lozknowles.github.io/ElseMesh/)** is the
public warehouse snapshot. Download the complete bundled island from the [GitHub Releases page](https://github.com/lozknowles/ElseMesh/releases/latest).

Warehouse data lives in [the independent opening-island repository](https://github.com/lozknowles/elsemesh-world-loz-opening-island).
The public warehouse is single-player. It does not connect to private owner
worlds. An illuminated frame does not mean a destination is online or authorised;
an unavailable portal aperture remains opaque.

## Open or edit a world in a source checkout

1. Install dependencies and start the development server as described in the
   [main README](../README.md).
2. Open `index.html` at the local address printed by Vite. `worlds.html` remains an owner-application alias.
3. Expand **Public GitHub world**.
4. Paste [this pinned opening-island version](https://github.com/lozknowles/elsemesh-world-loz-opening-island/tree/ebeea605c39df2b528b68588f2909358bb28e46d)
   and click **Open pinned world**.
5. Wait for the warehouse name and status. WASD walks; mouse drag or arrows look.

Alternatively, clone the world repository and select its folder through
**Open world files**. Content contains no installation scripts.

`world.json` selects the snapshot. Referenced terrain, objects, spawn and
connections live under `snapshots/<digest>/`; models live under `assets/`.
Portals are in the selected connections component. Import, edit, save and reopen
use the same validated repository pipeline; editing hashes by hand is unsupported.

Warehouse and dock have been converted to repository data. Other hardcoded legacy
scenes need a non-destructive export before they can use this pipeline. The
conversion does not imply that every procedural scene has already been exported.

## Connect private owner worlds

The recommended path is a prepared native local application per player.
Follow [Provision one local owner world](owner-world-setup.md) and the
[local runtime contract](owner-world-runtime.md).

Each machine hosts one local world and runs that world's own authority. Its owner
keys, separate authority key and durable membership ledger live outside both the
application package and world repository. The engine/editor can be updated
separately from world content.

The bounded setup exchanges public signed contacts, portal invitations and
acceptances manually. Review and pin the other owner's fingerprint through the
agreed human channel. Each owner explicitly enrolls browser player identities and
grants VIEW and ENTER separately. A portal reference and access to public scenery
grant no private-world entry.

The current connection path uses an encrypted byte relay. The relay forwards
encrypted messages; each local owner remains responsible for their own data,
capacity, entry decisions and arrival commits. A single browser connection to its
local application does not create a shared world authority.

Prototype content admissions, authority delegations and portal invitations have
24-hour validity. Renewal and automatic authority failover are not implemented.
Expired or unreachable authority must be resolved explicitly; it must not silently
be replaced by a shared coordinator.

Actual native roundtrips have reached generation 2 on MSI/WebGPU and
macomarchy/WebGL2, and both clients restored the correct remote world after a
reload. With the relay off, both local applications restarted from SQLite,
preserved generation 2 and accepted physical movement in their own worlds;
destination portals were unavailable and stale remote presence was absent.
Fresh live views and current peer presence returned after restarting the relay.
MSI crossed again at generation 3, paused safely during a visiting-world outage,
and resumed that same membership only after explicit Connect. It then physically
returned home at generation 4.

The portal Sky compiled and drew on MSI without errors, with atmosphere still
following the active world. Direct peer discovery, WebRTC and public Internet
joining are not implemented. Traffic remains local visual content.

See [current device, editor and test evidence and remaining limits](owner-implementation-status.md).

## Legacy networking entrypoints

`tools/networking/repository-world-server.mjs` and its shared
`RepositoryFederation` coordinator are legacy prototype entrypoints. They are not
the recommended connected repository-world deployment.

The original exploration game's room server and `play-online.html` invitations
belong to that older game. GitHub Pages hosts static application content; it does
not run private owner worlds or their authority ledgers.
