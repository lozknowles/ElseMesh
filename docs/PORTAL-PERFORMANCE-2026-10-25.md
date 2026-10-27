# Local portal performance experiment — 25 October 2026

User scope: establish a baseline and try portal optimisations on a separate branch; **no deployment**.

Branch: `codex/portal-fps-20261025`. Reconciled baseline: `dfc5066dd3ba70af663101b9aa465d4262dd9074`.
The Argon attachment snapshot (`359077b4`) predates this baseline.

## PLAN gate

Trigger: sustained renderer implementation and device performance qualification.
Architect reviewed the approach before production-source changes. Findings:

- The published installation is pinned to WebGL2; the proposed `PortalViews` change is WebGPU only. Do not conflate the two.
- Use the existing frame-bounded `MeshRenderer.withSceneTransforms` around an eligible portal's multipass `SceneRenderer.render`, after ambient, neon, LOD and water/view setup.
- Preserve `GPU.submit()` between views because LOD/material buffers are mutable.
- Defer callback-list caching: arbitrary candidate roots can change after admission. Defer electrical-effect culling: back faces and other portal cameras complicate visibility.
- Measure hardware explicitly, label synthetic fixtures, use repeated alternating baseline/candidate runs and check images, per-pass work, clipping, permission and lifetime regressions.

Decision: accept the narrowed scope. No renderer switch, source callback registry, resolution reduction, animation throttling or electrical-effect change in this experiment.

## Acceptance and evidence

Completed: hardware baseline/candidate comparison, targeted regressions, build and COMPLETION architect review (recorded below).
Synthetic browser fixtures will isolate portal work; their FPS is not full-world gameplay FPS or live-device acceptance.
The existing headless GPU fixtures validate rendering correctness, not browser performance.

Baseline targeted checks: 23 tests passed across portal views, transform cache, render-pass scheduling and submit lifetime; native headless clipping/parallax fixture passed on this host before changes.

## NO-PROGRESS gate

Trigger: the original native-island fixture produced no output for more than two minutes, and a second hardware timing run later made no visible progress. The original fixture was stopped; early overlapping benchmark runs were classified exploratory/contended and excluded.

Architect required stage instrumentation, an external deadline and separation of compilation, queue/readback and process-teardown failures rather than repeating silent runs. Decision: instrument the original native-island fixture without changing its assertions, enforce a 90-second external deadline, and add stage/visibility/rAF deadline reporting to the browser benchmark. Keep the rendering workload and browser flags unchanged and rebaseline with the instrumented harness.

Result: the instrumented **baseline** native-island fixture passed, including native water/vegetation, two destination sea levels, refraction, main rebind, submission rearm, resize, revoke, all water mask/depth variants and disposal, with zero validation errors. Initial compilation was the slow phase. The candidate real-island check was subsequently completed (see below). A cancelled second candidate benchmark is not performance evidence.

The same instrumented fixture subsequently passed on the candidate with all original assertions unchanged. A visible-window repeat closed during measurement; it was excluded. A matched headless/background hardware Edge ABBA series was then run separately from the visible-window samples.

## Change and result

`PortalViews.render()` now opens a fresh `withSceneTransforms(e.scene, ...)` scope only around the native-island multipass render. Water/view binding, ambient, neon and LOD updates run before the scope. The existing submission fence remains after each view. The direct single-pass portal path and WebGL renderer are unchanged. No callback list or cross-frame transforms are cached.

Hardware: Intel Arc / WebGPU adapter `intel`, `xe-lpg`, non-fallback; Edge 156.0.4314.42; viewport 1280 x 720, DPR 1; portal target 512 x 288. Native fixture has 4,096 group nodes per destination, sparse animated callbacks and simple red/green clipping panels. This is a synthetic CPU-focused hierarchy, not a complete authored world.

Native comparison: baseline, candidate, candidate, baseline, one fresh browser process per run; 60 warmup and 180 recorded frames per scenario per run. Aggregate statistics pool 360 samples per variant. Identical hardware/browser/headless flags, viewport and harness source hash; hashes for each production source are retained in JSON. No competing task-owned GPU tests ran during the accepted series.

| Native scenario | Baseline mean portal CPU | Candidate mean portal CPU | Baseline/candidate p95 | Hierarchy calls before/after |
| --- | ---: | ---: | ---: | ---: |
| One visible | 3.253 ms | 2.788 ms | 5.3 / 4.0 ms | 8,198 / 4,099 |
| Two visible | 4.795 ms | 4.342 ms | 6.4 / 5.6 ms | 16,396 / 8,198 |

Mean CPU submission cost fell 14.3% / 9.4% in this fixture. Run means vary: baseline one-visible 3.012–3.494 ms versus candidate 2.746–2.831 ms; baseline two-visible 4.414–5.176 ms versus candidate 4.213–4.471 ms. Two-visible run ranges overlap. Back-facing, out-of-frustum and empty cases perform zero destination matrix updates in both versions; their sub-0.1 ms timing differences are treated as noise. All four repeat captures of the one-visible synthetic clipping fixture have identical SHA-256 hashes; they are not four different visual acceptance cases. Readback/state checks pass for all five scenarios.

Frame cadence remains approximately 60 Hz. **No gameplay FPS gain or GPU-duration reduction has been established.** The timings measure synchronous portal CPU submission, not GPU completion. No GPU timestamps were collected in this bounded experiment. Whole-world moving-camera, sea/vegetation visual parity and repeated live travel performance remain future acceptance work.

WebGL baseline, measured separately with hardware ANGLE D3D11 on the same Intel GPU and Edge: one visible mean 0.906 ms (p95 1.3 ms), two visible mean 1.545 ms (p95 2.2 ms), 121/242 portal draws; roughly 60 Hz cadence. Clipping, 18-pixel parallax, backface/frustum and state checks passed. Different fixture complexity means its numbers must not be used as a WebGL-versus-WebGPU comparison. No WebGL code changed and no WebGL speedup is claimed.

## Validation

- `npm run test:portals`: 162 passed, including the new two-view animation/frame-refresh/fence and exception-cleanup regressions.
- Renderer transform, submission, timestamp-accounting and pass-scheduling tests: 19 passed.
- `test/portal-views-gpu.mjs` both hardware clip-distance and fragment-fallback variants: passed clipping, parallax and disposal/cache checks.
- Instrumented `test/native-island-portal-gpu.mjs`, original assertions preserved: baseline and candidate passed real native water/vegetation, two destinations plus main, water query/readbacks, resize, revoke, shared-resource lifetime and displaced water exclusions; zero validation errors. Deliberate final device destruction logs device loss and is not an unexpected loss.
- `npm run build`: passed. Warnings: unresolved `images/loz-warehouse-island.svg` left for runtime resolution and an ineffective dynamic GPU import. Neither is changed by this experiment; no deployment performed.
- `git diff --check`: passed.

Raw benchmark JSON, source hashes, screenshots and native-island stage logs are retained with the task's `outputs/portal-fps-20261025` evidence. Earlier contended, interrupted and older-harness trials are excluded from the reported ABBA result.

Reproduce from repository root:

```sh
node tools/performance/portal-fps-benchmark.mjs --channel msedge --headless --label candidate --output work/portal-candidate.json
node tools/performance/webgl-portal-baseline.mjs work/webgl-baseline
npm run test:portals
node test/portal-views-gpu.mjs
node test/portal-views-gpu.mjs --fallback
node test/native-island-portal-gpu.mjs
npm run build
```

For baseline timing use the exact baseline `PortalViews.js` contents on the same harness, not a different renderer or fixture. Keep GPU workloads sequential. The native-island test may spend tens of seconds compiling initial pipelines on this Windows driver.

## COMPLETION gate

Trigger: final review before completing this substantial local experiment. Architect checked source/harness hashes against ABBA evidence, both successful native-island stage logs and logging-only instrumentation, and independently reran six scope tests successfully. No material production-code blocker was found. Findings required stale pending wording to be removed, exact staging without diagnostic artifacts, and screenshot equivalence to be limited to repeat captures of the one-visible synthetic clipping fixture.

Primary decision: accept the review, apply those documentation corrections, retain raw evidence outside the implementation commit and commit only the intended source, tests, harnesses and report. The bounded local experiment is complete; broader release/performance acceptance limits above remain open. No merge, push or deployment is part of this task.

## Saved branch state

The six intended files are staged on codex/portal-fps-20261025. Commit creation was attempted but Git has no configured author identity in this fresh clone; the earlier ElseMesh checkout also supplies none. No identity was invented or global Git configuration changed. The implementation remains reviewable as staged changes and an exported patch. No push, merge or deployment occurred.
