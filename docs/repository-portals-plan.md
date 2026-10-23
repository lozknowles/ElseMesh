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

## PLAN gate: native residency and actual 3D portal presentation

New user acceptance on 23 October: eliminate MSI native WebGPU pauses and redo actual side-by-side footage with MSI WebGPU and macomarchy WebGL2, both cameras tracking. Subsequent steering requires electricity over every side/corner and materialisation on the original arriving avatar, visible locally and through another client portal.

New MSI CPU/rAF/GPU queue profile records 2.9 and 3.6 second presentation stalls, GPU queue delays above three seconds and CPU long tasks up to 925ms. No new synchronous pipeline labels appeared. Existing live preview resources were rebuilt for entry, then outgoing resources were disposed/rebuilt for reverse viewing. Architect approved bounded resident packages retaining exact geometry/material/pipeline identities, isolated fresh Player/camera and digest/authority/device-bound borrowed leases. Cancellation preserves preview ownership; unknown outcomes pin resources until authoritative reconciliation. Bound active plus two preview packages; no hidden history pool or root cloning. Retain bounded known peer models and aperture/effect materials too.

Architect also approved a signed presentation record created once by successful authority commit, containing transfer/player/world/generation/epoch and bounded commit/expiry times. It is presentation evidence only; admission is unchanged. Presence/status repeat the same record; clients validate and deduplicate with connection epoch fencing. Original local/remote/preview avatar instances receive only verified remaining-time effects; no proxies, expired replay or client-authored event requests. Warm actual effect variants before crossing and preserve portal clipping/depth. Continuous rim geometry must cover all four sides and corners.

Primary decision: implement those bounded changes and verify a physical MSI roundtrip with build/pipeline counts, resource identity, rAF and queue timings before another long mixed-backend video. Verify lease failure/recovery/disposal and signature replay rejection, then observe both visual effects in actual 3D on both clients. Previous both-WebGL recording remains an archived deliverable and is not evidence of native smoothness.

## Resident world package handoff PLAN gate

Physical MSI diagnostics showed zero new synchronous pipeline labels but async compilation bursts (601 to 922 pipelines before a 1908 ms rAF plateau; reverse preview rebuilt back to 601 before another 1400 ms plateau). Existing preview candidates already contained full terrain, native colliders and main/late/depth/portal variants, while Host.prepare rebuilt the destination and activation disposed the outgoing package. Architect approved bounded reuse of actual packages rather than cloning roots or changing authority.

ResidentRepositoryWorlds owns at most one active plus two distinct destination packages, keyed by world/digest and renderer-device generation with authority epoch validation. Same-world portal travel/preview and duplicate destination preview ownership fail closed. Two linked worlds retain exactly their two actual packages. Only packages referenced by the new active world's at-most-two portal destinations survive pruning; there is no historical hidden package pool. Material readiness fingerprints invalidate changed variants. Graphics leases never grant ENTER: signed crossing, independent destination admission, reservation digest/epoch, exact committed pose and recovery fences are unchanged.

A borrowed preview continues rendering until atomic committed activation; Host prepares a new Player with an isolated camera and exact authoritative pose/capsule checks. Cancellation/stale preparation releases ownership to the preview without disposal. Unknown outcomes retain the prepared graphics pin and active source. Outgoing resources survive only when referenced for a permitted next preview. Per-world aperture bundles, material identities and peer layers/models are retained; inactive peers hide and remain in a 32-entry pool, with only inactive least-recently-present entries evicted. No inactive pose simulation is advanced. Explicit disposal owns each package once.

Native integrated acceptance includes a strict warm A-to-B-to-A assertion: scene-build and world-precompile counters remain identical before and after the round trip. Synthetic tests retain exact root/collider identity over twenty cycles, validate fresh arrival controllers, pin/cancel/epoch/digest/capacity/failure ownership, and reject stale readiness. These do not establish physical MSI rAF continuity; that remains a separate trace/capture gate.


## NO-PROGRESS gates, 23 October 2026

A restarted coordinator initially left the MSI browser on its synthetic data-URL error page. Reload and navigation were refused because that current document was blocked. Architect required read-only inventory plus actual root/runtime-config health; both HTTP routes returned200. One ordinary browser-tool replacement tab at the same authorised URL succeeded. No policy bypass, alternate control channel or browser security flag was used.

Physical native preflight retained651pipelines/57sync-compiles through a warm round trip; recorded maximum frame gap0.248seconds. A separate physical Mac crossing failed closed: only three transparent double-sided material version counters changed while content remained identical. Architect confirmed Three increments those counters for every two-pass draw. Primary replaced the WebGL readiness counter fingerprint with a backend-specific supported shader/resource structural signature; native counters remain. Required mutation tests cover defines, texture bindings, side, shader hooks and geometry features; physical Mac round-trip acceptance remains required.


## Completion review corrections and evidence

Architect found cached VIEW grants surviving parked aperture restoration. Both backend restore paths now invalidate authorization, image state and candidate references before fresh subscription. GPU targets/apertures remain allocated; destination graphics remain in the bounded resident manager. Tests prove no destination draw or cached image is exposed before reauthorization or after denied subscription; stale references cannot retain an evicted candidate. A fresh grant cannot steal a root that is currently active elsewhere.

The WebGL structural readiness signature excludes Three's renderer-owned version churn; actual Mac transfer subsequently completed both directions. Shader/define/texture/side/geometry-feature mutation still invalidates readiness. Signed arrival verification retires finished local proofs without per-frame expired-record churn. Native pipeline counts stayed651 and sync-compiles57 in the measured physical round trip. The current40.259second common-wall video retains real frame gaps (MSI223ms, Mac685ms); it does not capture the last MSI return materialisation, which begins after the final recorded frame. Earlier arrivals and both traversal round trips are visible. No native frame interpolation or player/camera assignment was used.


## Final client and texture lifetime gate

The final clean editor contract is pinned to ec5de8c4872b6fbb803003c5d41c886683b0c593. MSI native WebGPU and macomarchy automatic WebGL2 each completed physical keyboard-controlled A-to-B-to-A traversal on that build; MSI retained 651 pipelines and 57 synchronous compiles, with no device loss and a measured maximum frame gap of 239ms. Both independent destination views were live after fresh VIEW authorization. This is bounded client acceptance, not a sustained frame-rate guarantee.

One earlier long-running MSI native tab crashed after approximately fifteen minutes backgrounded while editor checks ran. The cause is not established. One normal replacement client completed the fresh qualification. Long-duration native stability remains unqualified; no browser flags, alternate browser control channel or SSH policy changes were used.

The fresh client's console also exposed one startup destroyed-char6-texture validation error. Inspection found cancelled stock-character builds had already recorded mipmap commands into the shared encoder, but Texture.destroy invalidated the underlying handle before those commands submitted. The bounded lifetime fix invalidates the wrapper and view cache immediately, retaining only the captured old GPU texture until the current encoder submits. Without an encoder disposal remains immediate. Unit coverage verifies submit ordering, repeated disposal and replacement-handle safety; a real native GPU fixture cancels and disposes a textured original character before submitting its mipmaps and requires no validation errors. This does not establish the cause of the earlier long-running tab crash.


Architect completion review conditionally passed the bounded texture lifetime fix. Primary closed its conditions after the final build: 146 portal tests pass, 71 legacy tests pass with one pre-existing skip, build passes, actual native original-avatar GPU fixture passes with no validation errors. A process-local negative control restoring immediate Texture.destroy semantics fails that exact GPU fixture with a destroyed char2 texture at submission; the working tree was not rolled back for this control.

Fresh MSI final-artifact startup and A-to-B-to-A keyboard traversal advance authority generation2 to4, retain651 pipelines/57 synchronous compiles, pending0 and no device loss. No new console validation errors appeared; the browser log's sole char6 message predates this artifact reload. Measured foreground maximum frame gap128.8ms. Fresh macomarchy WebGL2 B-to-A-to-B traversal advances generation2 to4, retains both resident packages, live preview and original female avatar, with empty application error. Two local and two remote signed arrival presentations were recorded on Mac. The earlier unexplained background-tab crash remains disclosed and long-duration stability is not claimed.

Primary release decision: publish the complete editor and game commits to their existing main branches with [skip ci]. Keep private authority/configuration, captured client evidence and four unrelated pre-existing diagnostic tools outside publication. Independent world content remains in its own repositories.
