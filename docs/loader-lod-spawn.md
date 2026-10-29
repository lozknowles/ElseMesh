# Loader, presentation detail and local arrival changes

This change retains the current world repository schemas, vendored editor
contract, appearance allowlist, VIEW/ENTER/object permissions, signed transfer
protocols and durable membership ledger. It does not adopt upstream world IDs,
downloaded scripts, component registrations or the Go daemon.

## Loader

The installed GLB parser accepts ArrayBuffer views using their supplied byte
offset and length. Header and chunk bounds cannot consume bytes outside that
range. Node extras remain inert metadata and do not install runtime handlers.

## Presentation detail

Repository spheres, cylinders and cones retain their existing dimensions,
material, authored transform and collision records. Below 30 projected pixels
(with 12% hysteresis), a lower-segment version of the same parametric shape is
eligible. Boxes, authored GLBs, native terrain, trees and splats are unchanged.
This is a targeted implementation, not a new authored LOD contract.

The two installed stock avatars use full/medium/low visual geometry below
48/24 projected pixels, with hysteresis. Their original skeleton, mixer,
animation state, materials, textures, appearance and animated bounds are reused.
Variant validation checks ordered joints, hierarchy, bind space, mesh transforms,
material layout, attributes, indices and weights. Blender export round-off in
rest matrices/inverse binds is bounded to 0.002 per component. Posed tests compare
the original and exported skeletons at multiple phases of every supported clip.
The presentation sphere uses a conservative 1.35 m radius; 22 sampled phases
of every clip include male running poses beyond the initially proposed radius.
WebGL retains canonical vertex-color attributes and alpha, including the female
model's RGBA normalized color and secondary color attribute. Dropping those
attributes would darken the reduced female model, so browser color checks and
actual-loader regressions cover them explicitly.
Optional variant loading/preparation cannot hide or delay the original ready
avatar. Failure retains full detail; stale results are disposed.

Native selection writes a different geometry into the color draw record without
changing the canonical mesh. Depth/shadow passes and resource preparation use
full detail. WebGL selection is scoped to synchronous command generation and
restored in finally, including nested portal/consented-eye views and exceptions.
WebGL conservatively retains full detail whenever internal shadow maps are
enabled. Each camera has its own hysteresis; selection uses the physical target
height and projection. Canonical bounds remain available to picking, TV
occlusion, readiness checks and collision. Existing adaptive quality policy is
unchanged. Triangle reduction is not a qualified frame-rate improvement.

### Avatar asset provenance

The four reduced stock GLBs were copied without changes from
ElseMesh/elsemesh.github.io commit
`e95aae5b19f4b1f3be4e7bd78869fbdc2f485c5a`.
The full stock source GLBs in both repositories are byte-identical. They retain
the existing Microsoft Rocketbox MIT attribution in
`public/models/characters/LICENSE-Rocketbox.md`.
`tools/characters/export-avatar-lods.py` preserves the upstream generator;
its arguments accept source and output directories. No runtime simplification
or downloaded avatar URLs are introduced. Opening-world packages include the
four optional variants alongside the full originals.

| Asset | Full triangles | Medium | Low |
| --- | ---: | ---: | ---: |
| stock-player | 7,364 | 3,682 | 1,841 |
| stock-female | 8,732 | 4,366 | 2,183 |

## Local arrival allocation

Only successful local ENTER admission may search near its immutable authored
spawn. The server supplies ground/collision candidates, tries the authored pose
first, then checks nearest grid positions within 3.2 m (0.8 m spacing, at most
49 positions, at most 0.4 m height change). Capacity, current occupants and
reserved portal arrivals are checked in the same serialized ledger operation.
Unknown ground, occupied/blocked candidates and exhausted searches fail closed.
Client motion cannot change the search origin. Signed portal destinations retain
their exact mapped poses and never use this search.

## Review gates and evidence boundaries

PLAN architect review required evidence of compatible assets, per-camera
selection, trusted collision support and atomic allocation. The implementation
uses matching installed stock assets, canonical draw bounds and the existing
owner transaction rather than new world contracts or network messages.

NO-PROGRESS architect review traced initial spawn test failures to fixtures that
placed spawns at Y=20 over terrain at approximately Y=16.36. Those fixtures now
explicitly author their intended flat floor; separate tests retain invalid/no
ground rejection. Windows forced-process termination reports an exit code rather
than a POSIX SIGKILL signal. The recovery test proves readiness and committed
ledger state before killing the exact child and reopening the same ledger.
Overlapping suite workloads exposed fixture deadline/cleanup issues; controlled
reruns and final acceptance are recorded with the change's validation results.

Source/build checks and synthetic browser views do not establish production,
independent-network or physical-device acceptance. No installed owner service,
world data repository, signing identity or live deployment is changed by this
source change.

## Local rendering evidence

Native WebGPU and WebGL browser draws exercised both stock avatars at near,
medium and far distances and restored full detail on return. Matched animated
captures were inspected. A WebGL pixel-color check retains the authored shirt
color at all three levels; canonical geometry, materials and animation mixers
remain identical outside each draw. An actual mapped WebGL portal camera also
selects its own lower detail, then the main view restores full detail.

The pinned Warehouse/Sunset source smoke used the real immutable catalog paths,
verified the Warehouse world ID and content digest, loaded 113 collision boxes,
demonstrated held-key walking and a live Sunset preview, and kept exactly two
cached packages without runtime errors. It does not establish live owner
permissions or public deployment acceptance; separate signed-owner tests cover
the permission and durable-transfer implementation.

Additional review corrections keep LOD ownership out of serializable metadata
(so native and WebGL cloning still work) and include off-axis sphere extent in
projected size rather than underestimating objects near screen edges.

Run focused checks with `npm run test:loader-lod-spawn`. Run both renderer
fixtures with `npm run test:lod:browser` (Edge by default, or set
`CHROMIUM_PATH` to an installed Chromium browser). Run the published source
smoke with `node test/warehouse-source-smoke.mjs <pinned-opening-world-root>`.
Browser evidence goes to `.local-evidence/presentation-lod`, or the directory
selected by `ELSEMESH_LOD_EVIDENCE`.

### Gate decisions

- PLAN: substantial loader/rendering/authority integration triggered review.
  The architect required compatible assets, per-camera ownership and trusted
  atomic allocation. Accepted with engine-owned primitive tessellation and the
  exact matching stock variants; no new content callbacks or schemas.
- NO-PROGRESS, admission failures: repeated clearance denial traced to unsupported
  floating test fixtures. The architect directed checking the physical support
  layer. Explicit intended floors fixed fixtures; real invalid-ground rejection
  and production clearance stayed strict.
- NO-PROGRESS, timed owner tests: overlapping heavy runs exposed test deadline
  and cleanup pressure. The architect required isolated serial and concurrency-4
  runs without relaxing production leases or guessing that serial success alone
  proves concurrent acceptance. Results remain part of the validation record.
- NO-PROGRESS, Warehouse startup: two fixture launches requested an unserved
  catalogue digest path. The architect identified catalogue precedence over the
  test's opening bundle override. Corrected only fixture routing for both pinned
  worlds; the published-flow browser smoke then passed.
- COMPLETION review: the architect found serializable ownership cycles,
  underestimated off-axis bounds and insufficient renderer integration evidence.
  Non-enumerable ownership, the off-axis projection regression, actual native
  GPU and mapped WebGL portal draws, and the pinned Warehouse smoke address these
  findings. Final owner regression, focused checks and build must pass before
  merge; independent-device/network and TV streaming remain outside this evidence.
