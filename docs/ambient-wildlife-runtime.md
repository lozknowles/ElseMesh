# Ambient wildlife in repository worlds

GLB objects can carry an optional `ambientBehaviour` descriptor with schema
`elsemesh.ambient-behaviour/1`: `bird-flight`, `crab-walk`, or `fish-swim`,
plus bounded speed, radius, and unsigned seed. Repository admission validates this
data. The installed world-engine contract evaluates the deterministic route;
world content cannot supply executable scripts.

Both WebGPU and WebGL update only animated indices in the existing GLB primitive
batches. Static objects keep their authored matrices and batch membership.
Batches containing moving instances disable initial-bounds frustum culling to
avoid disappearing mid-route; static-only batches keep their existing culling.
Each object is evaluated once per frame even when its GLB has several primitives.
Yaw and translation apply to its resolved world matrix, retaining scale, pitch,
roll, and hierarchy transforms. The saved project is never mutated.

Motion runs in the active world and live portal views. Installed candidate terrain height (including native-island heightAt), terrain
bounds, and the project's global water level (or native-island sea level) constrain the contract evaluator.
Absent or unsuitable habitat leaves an object at its authored transform. This
does not model landscape-layer ponds, obstacle avoidance, ecological behaviour,
pathfinding, or physical interaction.

This is decorative client-local animation: no multiplayer authority, AI model,
world edits, or server scripts. Colliders remain at authored positions; use
`collision: "none"` for wildlife. GLB skeletal clips, wings, morph targets and
animation tracks are not driven by this feature. Weather remains owned by the
existing engine environment system.

Run `node --test test/repository-ambient-behaviour.mjs` for controller and scene
integration tests on both backends. These exercise CPU-side instance matrix
updates, batching, habitat and immutable saved transforms; they do not establish
real-device GPU frame rate or visual acceptance.

Weather isolation tests verify loaded environment values, native weather particle/bolt
state, and WebGL fog clearing across A-B-A activation. They do not qualify rendered
WebGL rain, cloud, or thunder parity with the WebGPU weather implementation.

## Release verification

The editor's clean source commit 6c4d4a7 produced the vendored world-engine bundle
(SHA-256 98bcd32c879ccdd4ba4ad0e04039c98aa9958ad4b4e0a741a5562ea915a12a5f).
The current game source integration was reviewed at ffdf3a5; all 121 named runtime
imports resolved. The editor passed 245 serial tests, typecheck and production build;
the game passed 39 focused/access tests, 160 portal tests and production build.
The architect completion gate found no remaining code blocker. Browser visual
acceptance, real-device frame rate and rendered WebGL weather parity are still open.

## Published cached-tab repair

On 25 October 2026, a previously opened public warehouse tab failed at 12%
because its older entry tried to import WebGLRepositoryScene-Kr2hmB38.js after
that hashed file was removed from gh-pages. The six-file module closure from
published revision 008be46 was restored without replacing the current entry
or application assets in gh-pages revision 954f888. The same in-app browser
subsequently loaded Loz's Warehouse Island and displayed the Sunset portal.
The packaging script now keeps bounded prior hashed JavaScript/CSS assets so
a future publication does not repeat this missing-module failure. This does
not guarantee unlimited support for arbitrarily old cached entries.

## Cached-tab release gates

PLAN gate trigger: the live game failed while an older entry referenced a removed
hash-named module. Architect traced the published entry's six-file module closure
and recommended restoring those exact prior Git blobs, leaving the current
entry and game files untouched. Primary accepted the bounded repair.

COMPLETION gate trigger: durable packaging change after the live repair. Architect
found that the workflow's sparse checkout omitted prior assets, and the initial
regression checked only two of the six closure files. Primary added /assets/ to
that checkout and all six hashes to the package regression. The package was
generated from the pinned public world and current Pages tree; all five package
tests passed. The same client tab loaded the warehouse after Pages published
the restored files. A walk through Sunset was not repeated in this repair.

The packager retains hash-named JS/CSS from the previous Pages tree, with
a maximum of 96 prior files, 32 MiB total and 5 MiB per file. Exceeding a
limit fails publication so a release owner can choose an explicit compatibility
window; the script does not silently prune files used by older tabs.
