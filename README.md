![ElseMesh — worlds connected by imagination](public/images/elsemesh-splash.png)

# ElseMesh

An experimental engine, editor and repository-world runtime. Each world is a
separate data repository that can be imported, edited, saved and reopened through
the same validated content pipeline. Each player runs a native local application
that hosts their own world, with their own owner keys, authority and membership
ledger. Connected portals let separately authorised players visit another owner's
world.

The original exploration game remains available: walk, sail and fly between
islands, explore the underwater cave and monorail, and collect a sedan delivered
to Bracken Quay by cargo ship. Fishing, trading and hunger are optional.

**[Play Loz’s warehouse island](https://lozknowles.github.io/ElseMesh/)** ·
[Original exploration game](https://lozknowles.github.io/ElseMesh/legacy.html) ·
[Public opening-world repository](https://github.com/lozknowles/elsemesh-world-loz-opening-island)

The public opening world is an immutable snapshot of Loz’s warehouse island,
with beaches, sea, mountains and retro computers, loaded from its independent
repository. The repository runtime supports WebGPU and a WebGL2 fallback.
WASD walks, mouse drag/arrows look, Shift runs, Space jumps, E uses a nearby
computer, V toggles the follow camera, K opens avatar design and H toggles
controls. This public single-player snapshot does not connect to private owner
worlds. Connected private portals require the separately provisioned local owner
applications and explicit permission from the destination owner. The original
exploration game remains available above.
See [opening-world deployment](docs/public-opening-world.md) for the pinning and
publication boundary.

This is a public experimental source release, not a finished or fully qualified
game. The original exploration game requires WebGPU and a capable desktop GPU. Frame rate and memory use
vary substantially; port traffic, detailed collision recovery, mobile support
and long multiplayer sessions still need broader testing.

## Find the warehouse and repository worlds

Open **[Loz's warehouse island](https://lozknowles.github.io/ElseMesh/)** for the
public snapshot, or **[the original game](https://lozknowles.github.io/ElseMesh/legacy.html)**
for the legacy exploration scene. In a source checkout, open `worlds.html` for the
repository-world player and editor.

For connected private worlds, follow the [native owner setup](docs/owner-world-setup.md).
Each player installs the prepared application and their own local world repository.
Owner keys and the durable ledger stay outside the application and world repository.
Public contacts are exchanged manually, fingerprints are explicitly pinned, and
VIEW and ENTER permissions are enrolled separately by each owner. The current
connection path uses an encrypted byte relay; that relay does not host the worlds
or decide membership.

See the [world quickstart](docs/repository-world-quickstart.md) and
[current implementation evidence and limits](docs/owner-implementation-status.md).
Actual held-key roundtrips have reached generation 2 on MSI/WebGPU and
macomarchy/WebGL2, including reload restoration in the remote world. Both local
owner worlds also restarted and accepted movement with the relay off. Fresh live
views recovered after restarting the relay. MSI crossed again and safely recovered
a paused visit after another outage, then returned home at generation 4. See the
status page for the graphics, editing and test evidence.

The old shared `RepositoryFederation` coordinator is a legacy prototype entrypoint;
the per-owner native application is the recommended connected-world path.

## Run locally

Use Node.js 22.15 or newer (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Build with `npm run build`; `npm run
preview` serves the resulting static site. GitHub Pages hosts the single-player
snapshot and local two-window demo. It does not host private owner authorities.
Use [native owner setup](docs/owner-world-setup.md) for connected repository worlds.
The older exploration-game room server remains documented in
[deployment examples](deploy/README.md). The public client and server use
ElseMesh protocol identifiers and environment variables; older invitations and
saved settings from the private prototype are not migrated.

## Original exploration game controls

For reduced ground detail, choose **Settings → Performance → Terrain shading →
Simple**, or open [Simple terrain mode](https://lozknowles.github.io/ElseMesh/legacy.html?terrainShading=simple).
Full remains the default. The choice is independent of the quality profile and
applies for the current session; the URL flag selects it again after a reload.
Simple preserves terrain shape, collisions, the cave opening and lighting, while
using the existing terrain maps instead of fine procedural surface layers.
Its performance benefit depends on the view and GPU.

An Intel Xe-LPG comparison at 1600×900 output, Balanced quality and 0.75 internal
scale measured 31.62 → 33.20 FPS at the villa and 30.21 → 32.05 FPS at the western
headland. Each result uses two ABBA cycles, with 720 foreground frame intervals
per mode. Separate GPU timestamp runs measured 26.33 → 24.43 ms and
27.56 → 25.26 ms respectively. These are fixed-camera measurements, not phone,
thermal or general gameplay guarantees. Simple is an intentional detail trade-off.

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse or cursor keys ↑ ↓ ← → | Look up/down and turn left/right |
| Comma / full stop in helicopter | Look through left / right side windows |
| Shift / Space | Sprint / jump |
| E | Interact, board or leave a vehicle |
| WASD / Space / R in car | Drive / brake / recover |
| H | Settings |
| N | Map |
| K | Avatar chooser |
| M | Mute |
| F1 or ? | Full controls |

Cursor-key look works without capturing the mouse. Menus, text fields and the
introductory guide keep their own keyboard controls.

On a phone, use the Move and Look sticks. While piloting the helicopter, hold
**Up** to climb or **Down** to descend. Land on dry ground, stop, release the
controls, then tap **Leave helicopter**. Altitude buttons disappear after exiting.

The cargo sequence can be reviewed with `?view=portCargoDelivery&quality=high&noAudio`.
Its delivery vehicle is MMCWorks' Generic Sedan Car, with separate animated
wheels and collision bounds checked against the actual model.

## Checks

```sh
npm test
npm run test:network
npm run test:security
npm run test:cargo
npm run test:vehicle-steering
npm run test:vehicle-material
npm run test:graphics
npm run test:renderer
npm run test:terrain-quality
npm run test:architecture
npm run test:publication
npm run build
```

Publication checks distinguish generic patterns from an optional private
operator-specific scan. See [portable source and publication checks](docs/publication-portability.md)
for configuration and the separate treatment of build output and Git history.

## Rendering performance

The 2 October renderer update shares scene transforms across passes and skips
unused water-depth and inactive postprocessing work. In a controlled six-view
Balanced test on Intel Arc, average FPS rose from 23.0 to 27.3 (+19.1%) at the
same resolution and quality. Five views improved; village was essentially flat.
This is a fixed-camera result, not a guarantee for gameplay or other hardware.
Long-frame hitches remain, including a worse cargo p99 in this run.
See the [method, limitations and raw evidence](docs/performance-2026-10-02/review.txt).

A follow-up adds distant forest batches, draw-submission reuse and conservative
distant-water optical simplification. A separate six-view comparison with these
switches off/on measured 28.5 to 29.3 FPS (+2.7%), with beach +9.5% and underwater
+7.6%; other views stayed within 1%. CPU submission wall time fell 24%, while
frame-time tails did not improve everywhere. Experimental depth ordering remains
disabled. See the [follow-up evidence and limitations](docs/performance-2026-10-02-stage-two/review.txt).

The architecture update batches nearby animated trees and indexes collision
queries, while fixing FPS reporting to use actual frame intervals. Repeated
forest-villa comparisons measured 15–18% higher FPS, including a camera-and-wind
sweep. A separate loaded-world collision workload returned identical results
with 75% less query CPU time. Other views were noisy and did not establish a
general FPS gain; the tree batches add memory and have a documented motion-history
limit after culling gaps. See the [architecture measurements and limits](docs/performance-2026-10-02-architecture/review.txt).

## Licensing and source

Game code is MIT except `tools/ivy_trial.py` (GPL-2.0-or-later); third-party assets retain their own terms. See [CREDITS.md](CREDITS.md)
and [vehicle credits](public/models/port/CREDITS.md). MMCWorks' sedan is CC BY 4.0.
OpenX traffic assets retain MPL-2.0 AND CC-BY-4.0; their notices and editable
source package accompany the game in [vehicle licensing](public/models/port/licensing/README.md).
Those licences do not grant endorsement or independent vehicle/character trademark rights.

This project's intended use is noncommercial. That intent does not add a new
noncommercial restriction to MIT, MPL or CC BY assets. Permission is being sought
for a separate DeLorean model; that model and its derivatives are excluded here.
The private prototype's Godzilla character asset is also excluded. The rest of
the island game runs without it. No private development history, internal
service configuration, private voice samples or permission correspondence is
included in this repository.

ElseMesh is maintained with Agent Control development assistance.
Original code and asset authorship notices are preserved.
