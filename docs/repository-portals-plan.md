# Repository portals: PLAN gate

23 October 2026. User requests actual mapped views and walking between two independent world repositories, with MSI Player 1 and macomarchy Player 2. Subsequent steering makes Loz's warehouse computer room the opening world, with sand, sea and original ElseMesh mountains, and the existing interactive Commodore 64.

Architect gate approved a bounded pair with revisions: retain existing federation identity/portal/invitation/handoff foundations; separate view subscriptions from gameplay membership; one authenticated coordinator may serve the initial two independently stored worlds. Do not describe that deployment as distributed authority failover. Stable authored IDs, repository locations, pinned revisions and runtime endpoints remain separate.

Authored data: upright unit-scale rectangular apertures with stable IDs, radians and centered poses, destinations by world/region/portal identity, distinct view/traversal settings and policy references. Endpoint discovery and owner/player identities are operator data outside repositories. New required capabilities reject unsupported installations; old repositories retain non-destructive loading.

Use one rigid source/destination transform for camera, player position, facing and velocity. Detect swept capsule crossings; reserve/prepare destination, validate content+clearance+access, then commit a fenced, idempotent membership change. Keep the source on precommit failure. Return needs destination offset and spatial rearm, not timer alone.

Render permitted detached destination geometry with its own camera/uniform block and arbitrary plane clipping. Limit two destination caches, bounded textures and depth one; never recursively sample portal apertures. Remote avatars arrive through authorized view subscriptions. Camera projection follows each rendered frame; remote state may be bounded-rate. Loading/offline/restricted views are visibly distinct and stale images never claim live state.

Warehouse starter is 1,755 editable GLB components with static computer screens. Fork its identity for Loz with provenance and reattach existing retro-screen materials/C64Computer behavior by stable entity references. Export the original TerrainData mountain heights into authored content rather than embed engine source in the world. Render sea and use matching existing Player water-query/swim behavior; water is not painted terrain. Keep startup configuration outside the reusable engine and world repositories.

Implementation ownership: domain/format/math; native portal render/clipping; federation coordinator/transport; primary owns warehouse content, startup, native host integration, client evidence and overall acceptance. All development/build/test on hpubuntu; approved client input on MSI, remote browser input for macomarchy from hpubuntu. Preserve current checkouts and legacy routes.

Acceptance: local schema/math/render resources/security/membership regressions; actual two-machine Player1 sees Player2 movement through portal, crosses, appears exactly once in destination, returns. Also restricted/offline/blockedexit/stalecontent/duplicatecommit/lostack/reopen cases. Client WebGPU support must be qualified early; report device failures separately, never replace the two-machine requirement with two local contexts. Completion architect review remains required.

## Corrective NO-PROGRESS gate: deployed fallback provenance

The first device investigation was scoped too narrowly to this native-only checkout. macomarchy's actual existing GUI tab requests the established /play federated route with renderer=webgl2; the user reports it previously ran the two-world demonstration. WebGPU requestAdapter returning null does not diagnose that fallback application. The initial device-blocked claim was narrowed accordingly.

A recovered staged source was found on macomarchy under its existing 2026-10-18 MSI/macomarchy experiment, including WebGLFallback.js and live federation/transition modules. Read-only recovery and source provenance comparison on hpubuntu precede any further lifecycle integration. Do not change browser flags or replace its existing fallback. The old MSI /play origin currently returns502 because its local5200 listener is absent; preserve the existing loaded Mac page while identifying source.

Architect challenged runtime ownership: one owner for scene transition, transport and membership. Keep authored repository format, editor and reusable native rendering work, but reconcile the recovered live runtime contracts before deciding which coordinator pieces to retain. Native local headless integration has passed A/B/return with avatars and rejection/recovery cases; it remains distinct from the required physical GUI proof and video. No completion or push of this increment is claimed yet.

## Revised PLAN gate: recovered compatibility runtime

Trigger: existing Mac WebGL2 route/source disproved the native-only assumption. Architect inspected recovered backend, transition and the current host. Findings: retain repository data/editor/native views; reuse the established backend boundary and the recovered FederatedWorldTransition as the only client transfer owner; keep one server membership ledger. The old installed recipes and miniature panels cannot meet authored-world or mapped-window acceptance. Lost commit acknowledgement must freeze controls until authoritative reconciliation, rather than restoring the source.

Primary decision: proceed with additive versioned handoff validation, backend adapters using the same loaded data and native physics, and the recovered transition with repository transport adapters. Legacy /1 behavior stays explicit. Exact recovered source revision is unknown and documented as candidate recovery. No Mac flags or drivers change. Physical MSI/Mac journey and video remain unmet until demonstrated.

## NO-PROGRESS gate: weather stress test during client recording

Trigger: two default npm test runs passed 131/132 cases but the unchanged finite-drop stress case exceeded five seconds. Architect inspected the source and release history: 410,448 matcher assertions; linear bounded geometry generation; eight CPUs with load 24.46 and two existing Chrome processes near 275% CPU each. The same timeout and serialized release command were already documented in release-1.0-verification.md.

Decision: do not change weather code or repeat the same parallel run. Finish recording, then run `npx vitest run --maxWorkers=1 --testTimeout=15000` once and preserve duration/output. If that fails, profile generation versus assertion overhead before changing implementation. This gate is not a runtime performance qualification.

## PLAN gate: replacement side-by-side gameplay recording

Trigger: user rejected upscaled portrait footage as blocky and requested two simultaneous world views with cameras tracking the actual players. Architect approved two native 1280×720 client feeds into 2560×720 without enlargement, explicit bounded main/portal capture quality, a five-second sharpness/cadence sample, and restoration of temporary viewport overrides.

Tracking uses a stable three-quarter offset, collision/terrain clearance and explicit portal-front constraints. It runs after physics and before avatar/portal rendering, independently of freeCam. At world activation it deliberately reframes to the destination portal front rather than interpolating between unrelated coordinates. This preserves first-person portal mapping and one player/session authority. Separate camera-world traversal is outside scope. Both approaches, crossings, destination continuation and returns must be recorded on a shared wall-clock timeline before pushing.

## NO-PROGRESS gate: recording orchestration

Trigger: long MSI CDP frame-ack/control/finalization calls timed out, losing the controller metadata; one take also started late while its orchestration code was prepared. Mac continuous capture independently succeeded. Architect identified coupling recording lifetime to tool lifetime as the wrong layer.

Decision: use browser-owned bounded MediaRecorder capture with chunks and frame/world/pose/monotonic metadata retained inside each browser independently of control calls. Start both recorders before scheduling movement. Preflight one actual crossing, export and decode it before another long simultaneous take. Preserve true rendering gaps; do not create interpolated gameplay. Canvas capture excludes DOM overlays/audio; keep real avatars, portal rim and scene rendering, and add only factual labels. Controls remain short, bounded and independent.


## Native pipeline readiness gate, 23 October

PLAN architect gate: physical native capture showed synchronized render/rAF gaps after world activation (pipeline counts 141 to 239) and reverse preview construction (to 340), while visibility/focus remained healthy. Source inspection located the per-material identity pipeline cache and synchronous first-use fallback. Decision: retain material cache keys and synchronous visible draws, and reuse App.precompile for exact detached-world main/late/shadow and PORTAL_CLIP preview variants. WorldHost.prepare awaits resource readiness before the authority resources-ready message. PortalViews keeps loading and apertures hidden until exact resources compile. Original stock avatars precompile their native variants before model visibility. Renderer precompiling flags restore synchronously before asynchronous waits; failed handles reject readiness. Stale candidate/preview completion cannot activate or revive released resources. No reservation TTL extension or movement changes are introduced.

Native portal electrical frames are staged and compiled in the detached world candidate; effect clear/disposal preserves current prepared frames and releases only the corresponding root. Readiness failure before handoff safely preserves source; activation failure after commit retains existing frozen recovery behavior. Focused readiness/host/preview tests and actual GPU clipping fixture cover these boundaries; physical rAF continuity and first-use compile labels remain a separate preflight gate.


## Renderer material lifetime gate, 23 October

PLAN architect gate: repeated candidate and preview creation uses distinct material identities, while MeshRenderer pipeline and layout maps retained their old versions. Approved bounded change: renderer ownership registers one material dispose listener per renderer and tracks exact pipeline and layout references across versions. Disposal removes only matching entries, clears old vertex-layout pipeline maps, updates counts, and is idempotent. Geometry, textures, shared buffers and GPU pipeline objects are not destroyed. Pending async handle completion cannot reinsert a removed cache entry; disposed materials cannot rebuild renderer resources. Layout caches are scoped per renderer so renderer-owned pipeline references are never reused across renderers. Focused tests cover independent materials/renderers, pending completion, replaced entries and 100 repeated visits returning to the active baseline.

Physical native preflight supplied new source evidence of five synchronous Explorer procedural stand-in material compiles while stock GLBs were pending. ReadiedRepositoryAvatar suppresses inherited procedural stand-ins until the original loaded model and its exact variants are ready. This preserves the requested original character appearance and avoids those fallback compiles; it does not change the physics or global synchronous pipeline policy.


Native MSI preflight after detached readiness showed zero additional synchronous WORLD material compiles across activation; approximately two-second rAF gaps still occurred during asynchronous preparation. Five remaining synchronous Explorer procedural stand-in main-pass material labels were identified. The subsequent ReadiedRepositoryAvatar proxy suppression is unit-qualified and built for the next release; it has not yet received a physical native repeat. The side-by-side Mac/MSI recording uses the explicit WebGL2 compatibility renderer, and does not establish native WebGPU frame-time continuity.

## COMPLETION gate: reviewed bounded release

Trigger: final local implementation, regression/GPU evidence, physical two-client crossings and replacement video were ready. Architect reviewed recovery fencing, world replacement, avatar lifecycle, native preparation and material-owned cache disposal. It found PeerLayer presence freshness overwrote readiness visibility; that was corrected and a real-class integration ordering test added. Final portal suite passes 111 tests; renderer regressions pass 28 plus GPU checks; build passes.

Architect independently verified the final 69-second 2560 by 720 video SHA-256 d2c07a1c66d985c1160a1210752eb5320a935d56cfbbc5847fac2b178bb5f284, manifest and contact sheet. Verdict: PASS WITH DISCLOSED LIMITATIONS. Both recording clients use supported WebGL2 and real tracking cameras/avatars; Mac loading pauses remain. Native WebGPU traversal is verified separately, but continuous native smoothness remains unqualified. Distributed failover, coordinator restart recovery and immediate GPU memory reclamation are not established.

Primary decision: accept the bounded release with qualification limits documented. MSI is restored to its default WebGPU path and its Intel Arc adapter was confirmed; the replacement recording is explicitly labelled WebGL2. Publish ordinary main refs with [skip ci] tips, no dispatch, PR, Pages deployment or workflow settings change. Verify exact staged paths and remote SHAs, then check no runs were triggered. Preserve private evidence/operator keys and the four pre-existing diagnostic tools outside this commit.
