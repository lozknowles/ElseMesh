# Owner-world implementation status

This records the current prototype boundary. The public
[warehouse snapshot](https://lozknowles.github.io/ElseMesh/) and the
[legacy exploration game](https://lozknowles.github.io/ElseMesh/legacy.html) remain
separate from connected private owner applications.

## Architecture in use

Each player runs a native local application hosting their own world repository,
authority keys and durable membership ledger. The warehouse and dock use separate
local runtime authorities. Owner signing identity, runtime authority identity
and browser player identity have separate roles. Private keys and ledgers stay
outside application and world repositories.

The current connection path forwards encrypted messages through a byte relay.
The relay is not a shared game server or world authority. Destination owners
issue VIEW/ENTER challenges, decide entry/capacity/clearance and commit arrivals.
The source resolves transfer outcomes using destination-signed receipts or
no-commit tombstones; unresolved outcomes keep movement frozen.

Setup is bounded to manually exchanged signed public contacts, reviewed owner
fingerprints, both directional portal approvals and explicit local player
enrollment. See [native owner setup](owner-world-setup.md),
[authority contract](owner-world-authority.md), [runtime](owner-world-runtime.md)
and [encrypted peer transport](owner-peer-transport.md).

## Evidence currently established

Actual held-key movement has demonstrated these crossings with the separate local
runtime authorities:

| Client/rendering path | Crossing | Destination generation |
| --- | --- | --- |
| MSI / WebGPU | Warehouse to dock to warehouse | 2 |
| macomarchy / WebGL2 | Dock to warehouse to dock | 2 |

Both clients were also reloaded while ACTIVE in the remote world and restored
the correct world. The native portal Sky compiled and drew on MSI without errors.
Its atmosphere currently follows the active world; an independently simulated
destination atmosphere is not established by that check.

Both native owner applications were then restarted from their SQLite ledgers
while the HP relay was off. Each loaded its own world, accepted physical W movement
with a changed position, and preserved generation 2. The destination portal became
unavailable, and stale remote presence was absent. After relay restart both clients obtained fresh VIEW authorization, live apertures
and current peer presence. MSI physically crossed to the dock again at generation 3.
A second relay outage while visiting froze MSI at exactly the same position despite
held movement input. Restoring the relay alone kept it frozen. Explicit Connect
restored the same dock generation 3 and movement; warehouse membership remained
absent.

The latest focused suites passed 40 owner/sky checks and 146 portal regression
checks. These totals describe those suites, not complete gameplay qualification.

The data audit passed 11 of 11 serialization checks. Dock visibility data includes
one GLB and 34 boxes, with six traffic objects. Geometry uses 58 batches. These
counts describe the checked data and geometry; they do not establish a frame-rate
claim or complete scene/graphics acceptance.

Focused HP checks also exercise separate owner authorities and durable ledgers,
signed player authentication, explicit VIEW/ENTER, encrypted relay transport,
prepare/cancel/commit recovery across runtime restart, denial/full/occupied entry,
portal yaw/velocity mapping and a browser transport using WebCrypto. Automated
evidence supports the protocol implementation; device observations establish only
the crossings, reloads, local operation during relay outage, and MSI portal Sky
checks described above.

## World data and editing

The engine/editor application and world data repositories remain separate.
Repository worlds use the same validated import, edit, save and reopen pipeline.
Warehouse and dock have been converted to that format. Other hardcoded procedural
scenes require a non-destructive export before they can be edited as repository
worlds; the conversion work does not cover every legacy scene.

All 11 editor cases passed actual Open/Save, fresh-context canonical reopen
and installed-game-loader checks. Warehouse and dock also passed exact manual
object-move/material checks with fresh editor UI reopen (2 of 2 worlds). The dock
screenshot attempt timed out; that missing screenshot remains an evidence
limitation rather than a claimed visual pass.

A world reference does not convey private repository access or entry permission.
The public warehouse is an immutable single-player snapshot and does not connect
to these private owner runtimes.

## Prototype limits

Content admission, authority delegation and portal invitations currently have
24-hour validity. Automated renewal, ongoing key rotation/revocation management
and automatic authority failover are not implemented. The setup never silently
promotes a relay or legacy coordinator to replace an unavailable owner.

Direct peer discovery, WebRTC and public Internet joining are not implemented.
The current bounded connection path requires the configured encrypted relay and
manual contact/enrollment setup. Traffic objects are local visual content; shared
traffic simulation and cross-owner traffic authority are not established.

The old shared `RepositoryFederation` server remains a legacy prototype. Use the
per-player native owner application for the current connected-world architecture.

Broader device/browser coverage, long sessions and independent destination
atmosphere behavior still require evidence. Keep
actual owner keys, local paths, client identity fingerprints and private deployment configuration out of public reports.
