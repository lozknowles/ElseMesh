# Warehouse fresh-start and readback retest

Fresh-browser performance remains inconsistent with disk space available. No new rendering optimisation passed the visual-equivalence requirement. Production source and assets remain unchanged from `7f494045d897fc8443791680847fd13bc15e931c` on `codex/portal-fps-20261025`; the existing foliage-corrected wall depth prepass is retained. Nothing was deployed.

## Fresh-start measurements

Four sequential, independent browser processes and profiles used one verified production build, the original pinned Warehouse/Sunset assets, 1280 x 720 at DPR 1, standard quality, 180 warm-up frames and 900 sampled frames per view. These runs had no GL timing wrappers, tracing or long-task observer. All four ran the same three scenarios; no run was excluded because of its result.

| Fresh browser | Sunset portal FPS | Frame interval p95 | Frame interval p99 | Interior FPS | Turn-away FPS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 25.75 | 99.8 ms | 150.0 ms | 60.00 | 60.00 |
| 2 | 29.27 | 83.3 ms | 116.7 ms | 60.00 | 60.00 |
| 3 | 26.57 | 83.4 ms | 133.4 ms | 60.00 | 60.00 |
| 4 | 38.62 | 66.6 ms | 66.8 ms | 60.00 | 60.00 |

Every portal sample rendered Sunset and used the two wall depth draws. Readiness passed before and after every run; no runtime or asset errors occurred, and asset requests were idle during sampling. Full frame samples and five successive 180-frame cycle summaries are retained.

The environment was Edge 156.0.4314.42, ANGLE/D3D11 on Intel Arc, driver 31.0.101.5590, a 60 Hz display and Balanced power while charging. C: had roughly 60 GB free initially and rose to about 138 GB during the series, indicating concurrent storage activity. These are fresh browser starts, not cold OS/GPU starts; system shader caches persist. Disk space alone is therefore not established as either the cause or the cure.

Independent GPU counters captured the test browser at roughly 92-93% 3D utilization during the first three portal runs, with other captured processes contributing a few percent. The Windows counter failed before run four's sampling, so run four has **no host GPU telemetry**. The missing data is not zero competing load. A premature build-reuse preflight failed before launching a browser and is retained separately; its complete retry is row 2.

## Readback and attempted replacement

A separate instrumented run recorded 95 readbacks initiated during sampling. The synchronous copy calls averaged **58.22 ms**, with p95 **83.6 ms** and maximum **110.5 ms**. Mean request-to-completion duration was 129.07 ms. All were fulfilled after signalled fences, used the expected 2,883,584 bytes and were serialized. Across the full diagnostic, 130 buffers and fences were created and deleted, with no pending calls, live resources or dropped records at disposal. This is diagnostic evidence, not acceptance FPS. The earlier trace attributing the wait to Chromium's command queue was not repeated here.

The new experiment attempted to eliminate recurring readback by calculating the static Sunset sorting keys on the CPU. It captured GPU keys and decoded source for all **719,538 splats**, froze generation during comparison, and submitted independent copies to Spark's installed sorter. It never installed a candidate order into the renderer.

The two closest CPU arithmetic variants changed 178,640 and 200,327 keys, despite identical active membership. Small floating-point differences produced **6,272 and 6,823 changed ordering positions** across the full 720,896-element ordering, including padding. The generated half-precision center attachment was also unsuitable: it is packed after the full-precision depth calculation and loses information. These tested replacements were rejected before pixel or FPS qualification. This does not prove that all possible CPU emulations are impossible.

Source identity, version, transform, target and packed-data fingerprints stayed stable through the comparison. Frame delivery, automatic updates and sorting methods were restored. Independent source review found no material capture or sorter-contract mismatch explaining the rejection.

## Reproduction and next boundary

The baseline command creates a new production build and fresh browser profile. Keep temporary storage on a drive with adequate space and run only one GPU benchmark at a time:

```sh
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario all --sample-frames 900 --output work/fresh-start.json
```

The explicit diagnostic flag performs the oracle after timing and marks the report ineligible for optimisation timing claims:

```sh
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 540 --readback-observe --splat-key-oracle --output work/readback-key-oracle.json
```

An oracle failure aborts the session before further visual checks. A timeout cannot cancel already-submitted GL readback or shared-worker operations; restored flags alone do not prove those operations have settled.

Local raw reports, source/build hashes, host observations, the frozen build-reuse runner and gate records are retained in `D:/Codex/ElseMesh-fresh-readback-20261027/`. Summaries are `fresh-start-summary.json` and `readback-summary.json`.

The integrated diagnostic command passed a separate real-world smoke run using a fresh normal production build: readiness passed before and after, no runtime or asset errors occurred, the same ordering differences were reproduced, and all saved methods and frame gating were restored. Both modified tooling modules passed syntax checks. A final comparison verified all 652 recorded production source and asset hashes unchanged. New visual comparison tests were not run because no rendering change was retained; historical foliage pixel tests are not represented as fresh results.

Completion review tightened timeout handling after that smoke run. Four checks of the actual CLI handoff block with mocked browser outcomes passed: disabled, completed ordering rejection, timeout result and browser-evaluation failure. Failure cases prevent subsequent visual checks. This was a failure-path check, not another GPU measurement; the oracle calculation was unchanged.

The architect's decision after the failed oracle was to stop this bounded replacement attempt. Repeating buffer hints, drain scheduling or frame caps would revisit rejected mechanisms. GPU sorting is a larger architectural investigation: it must first reproduce the installed sorter's full ordering, ties, inactive entries and padding in isolation, before integration or performance claims. Fresh-start variability and a safe readback fix remain open.

The subsequent authorised [GPU sorting investigation](WEBGL-GPU-SORT-2026-10-27.md) achieved exact tested ordering, but the faster prototype still costs about 12 ms per sort and has not been integrated.

## Follow-up: display ceiling and redundant rotation work

After publication of the validated `f26c520` source, the user requested further local work without deployment. The new investigation remains on `codex/portal-fps-20261025`. All 652 production source/asset hashes remain unchanged; the new modules below are explicit diagnostic tools, never application imports. The published game has not been changed by this follow-up.

Three bounded fresh diagnostic boots used the same verified build and 540 translating-portal samples each. The first two included the existing GPU-query profiler; the third removed those queries while retaining the lifecycle/readback observers. All three measured approximately 32 FPS, with 540 generation passes and 535, 511 and 530 completed worker sorts initiated during sampling. Copy-call means were 1.91, 2.46 and 1.86 ms. Removing queries did not restore the earlier 58 ms waits. These instrumented results do not establish an improvement or a cause of the earlier inconsistency.

The machine was now in an active Remote Desktop session. An independent empty-page control using headless Edge reported document visibility as visible and measured exactly 32 FPS over 120 intervals. This was not a foreground desktop-window test. Display enumeration differed from the earlier local setup. This establishes a current browser frame-callback ceiling independent of the game workload; it does not explain the earlier local fresh-start variation. No session, registry, driver or power settings were changed. Microsoft's [remote-session frame-rate documentation](https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/frame-rate-limited-to-30-fps) is supporting context, not proof of this machine's exact ceiling.

The diagnostic reports retain observer overhead, dropped raw readback events, incomplete GPU query coverage and sparse host counters. Call-level copy records and lifecycle counts remained available. No healthy/slow contrast was obtained, and no fourth fresh-start game run was attempted. The later browser runs tested output correctness, not FPS.

### Confirmed redundant work

The pinned Spark renderer uses radial sorting. At an identical world position, camera orientation does not change either the radial key or the packed SOG color calculation. Nevertheless, Spark's direction and source-version checks can trigger regeneration, readback and sorting when turning in place.

An actual-GPU oracle confirmed all 2,883,584 packed words, 2,883,584 depth bytes and 720,896 ordering entries were identical across yaw/pitch changes, with identical active counts and view origins. Each tested rotation still caused one readback and one sort. A translation control changed the data and ordering, confirming that the oracle detected relevant input changes. Ordering comparisons use the fulfilled installed-worker result; Spark's incrementally uploaded texture can have a stale CPU image.

The ordinary translating route changed position in 537 of 540 sampled updates. Therefore this orientation-only finding does not explain or fix the original moving-route stalls.

### External canonical-generation prototype

`canonical-generation-prototype.mjs` substitutes a detached, world-aligned camera only for eligible generation updates. It preserves the exact world position, projection and layer mask and still invokes the entire original `updateInternal` function. The actual rendering camera remains unchanged. It does not skip version/mapping checks, replace sorting, install alternate ordering or change renderer resources.

The experiment requires the admitted static source, radial sorting, explicitly disabled renderer LOD generation/driving and mesh LOD, and no edits, custom generation behavior, directional transforms, covariance, extended splats or XR. The installer does not disable those flags itself. Ineligible calls pass through unchanged. Parented cameras fail closed because stale ancestors could otherwise change the world-position interpretation.

The corrected real-Warehouse qualification passed 12 settled A/B/A2 checkpoints covering turns and translations. Packed data, depth keys, complete ordering and all 3,686,400 canvas RGBA bytes matched exactly at every checkpoint, including repeat baselines. A separate turn sequence reduced 12 readbacks/sorts to zero; all six translation steps still triggered required sorting. A stale-parent passthrough control preserved the exact original world origin. Original generation, flags, cameras and renderer state were restored, and coupled Warehouse/Sunset/Microduck readiness passed afterward.

The first qualification report is retained: it found one pixel changing equally in the candidate and repeat baseline. Inspection also found the harness omitted the normal main-world `bindView` step after portal rendering. The harness was corrected to match the real render sequence, the success-result contract was fixed, and failed-image retention was added. The second strict run passed without tolerances. This does not prove the omitted binding caused the first pixel discrepancy.

This is **settled-output qualification of an experimental tool**, not production adoption. Other eligibility transitions, normal unsynchronised moving publication and uncapped FPS remain unqualified. There is no claimed fix for translating-view stalls or fresh-start consistency. The prototype remains default-disabled and is invoked only by an explicit post-timing diagnostic flag.

### Reproduce and continue

The empty-page control records an external frame ceiling before loading the game. Lifecycle observation is diagnostic overhead; omit it from acceptance measurements.

```sh
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario all --sample-frames 900 --frame-clock-control --output work/local-console-baseline.json
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 540 --readback-observe --lifecycle-observe --output work/lifecycle.json
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 180 --rotation-oracle --output work/rotation-oracle.json
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 180 --generation-camera-oracle --output work/generation-camera-oracle.json
node --test test/warehouse-lifecycle-diagnostics.mjs test/warehouse-generation-camera-diagnostic.mjs test/warehouse-generation-camera-motion-diagnostic.mjs
```

Choose one oracle per browser session. Failed capture, output qualification or restoration stops the CLI before subsequent visual checks. Timings preceding an oracle use the original production implementation and must never be presented as candidate FPS. The generation-camera CLI handoff is covered by CPU failure-boundary checks; the real-GPU qualification used the separately retained local package runner, not a new integrated CLI GPU run.

Raw reports, source hashes, the failed first qualification, corrected qualification, empty-page control, frozen runners, telemetry and architect decisions are retained in `D:/Codex/ElseMesh-stall-followup-20261027/`. Start with `lifecycle-summary.json` and `canonical-qualification-run-v2.json`. The next performance comparison requires a local-desktop frame-clock control comparable with the original local baseline. No new deployment is authorized by this follow-up.

### Visible desktop retry

On the user's next explicit retry, Windows Computer Use successfully inspected an owned Edge window at its exact localhost URL. This control was headed, 1280 x 720 at DPR 1, with 30 warm-up callbacks and 120 measured intervals. It measured **31.9991 FPS**, median 31.3 ms and p95 31.6 ms. Every measured callback recorded `document.visibilityState === 'visible'` and `document.hasFocus() === true`. Computer Use observed the completed result in the foreground browser window. The initial page had a script-escaping error before measurement; that failed attempt is retained separately from the corrected result.

Windows still reported active `rdp-tcp#0` session 1. Its display enumeration included the Microsoft Remote Display Adapter at 59 Hz and Intel Arc at 143 Hz. UI access therefore worked, but it did not place the test in the physical-console timing environment. No session or OS settings were changed. The empty foreground page still had the same approximately 32 FPS ceiling, so no further game FPS series was run or claimed as evidence of improvement.

The qualification acceptance predicate was also tightened to require exactly 12 baseline turn readbacks/sorts, zero candidate turn readbacks/sorts, 12 canonical calls and all six translation readbacks/sorts. The retained real-GPU result already meets those counts; a focused CPU test checks missing and unexpected operations. All 11 diagnostic CPU checks passed. This is a stricter acceptance check, not a new rendering algorithm or GPU result.

The retry evidence, host/session observations, visible-page screenshot and gate decisions are retained under `D:/Codex/ElseMesh-local-desktop-20261027/`. The valid frame-control report is `visible-control-v2/visible-frame-control.json`. Production rendering, the published game and the separate branch's upstream remain unchanged by this retry.

### Asynchronous motion and guard transitions

The standalone `warehouse-generation-camera-motion-oracle.mjs` observes a controlled A/B/A2 route through the real Warehouse/Sunset portal. Each variant renders 124 native-rAF frames covering turn, translation, turn, explicit update, directional sorting and return to radial sorting. Ordinary app updates are paused, but the actual portal `onBeforeRender` and asynchronous Spark update/sort/publication lifecycle continue. Sorting is drained only at phase boundaries for settled snapshots, never before every moving frame. This is a bounded asynchronous diagnostic, not ordinary whole-app motion acceptance.

The first run observed sorting in flight during all 24 translating frames in all three variants. The candidate's two turning-only phases initiated no readbacks; translating and directional phases retained sorting. Explicit updates and directional sorting took the original fallback, and canonical updates resumed after radial sorting returned. Metric changes use the same explicit refresh in each variant; automatic property-toggle behavior is not qualified.

All 46 candidate publications in the first run matched original physical inputs and key hashes, with equal full-order hashes and active counts. The repeat baseline matched 119 of 120 publications; the unaligned translation remains explicitly unqualified. All six settled phase endpoints matched packed data, depth keys, complete ordering and active counts. However, three canvas endpoints differed in both A/B and A/A2 comparisons. B and A2 canvas hashes matched at all six endpoints. The report therefore correctly failed strict motion qualification; original generation, methods and readiness were restored.

### Localized baseline image differences

An architect-approved second capture preserved the trajectory, prototype and rendering sequence and added detailed observation only at the first failing phase, `turn-1`. It did not warm away differences, reset visibility caches, wait for terrain residency or relax pixel tolerances. Full images and enlarged crops are retained alongside the failed first report.

Exactly **seven pixels** differed between A and B, with the identical seven pixels and channel deltas between A and A2. B and A2 were byte-identical. The differences occupy PNG coordinates x=0..3, y=145..153, at a window/foliage edge on the far left of the screen. All lie outside the projected portal aperture; no portal-interior or aperture-edge pixel differed in this captured endpoint. This localizes this discrepancy, not every failed endpoint or every moving frame.

The original A endpoint drew 11,557 plant instances; B and A2 each drew 11,575. Ten native instanced meshes changed count or instance buffers between A and the later variants, while B/A2 native snapshots matched. Main-scene draw calls stayed at 178, but triangle counts changed from 8,532,778 to 8,540,522. All 104 native mesh identities and terrain position/index fingerprints matched at the endpoint. Terrain residency and asset consumption grew during A's first phase; by all three endpoints residency was 84 tiles with no queued/running work, and the endpoint geometry matched.

These observations support a native draw-set confound. Source inspection identifies path-dependent plant frustum caching and asynchronous `bindView` terrain requests, but the capture does not prove which exact mesh caused each pixel or establish a production fix. Actual Spark display/packed and ordering uniforms were checked against their displayed textures. Current-buffer equality was not substituted for that binding check.

The detailed run aligned 14 of 19 candidate publications and 26 of 37 repeat-baseline publications with original physical inputs and keys; all matched orderings/active counts agreed. Unaligned publications remain unqualified. The full-canvas gate still failed. No tolerance, discarded baseline or narrowed visual acceptance was introduced.

During this work Windows changed from active RDP session 1 to disconnected session 1, with console session 2 connected. The Remote Display Adapter disappeared from enumeration. The agent did not change sessions or OS settings. Computer Use confirmed the actual Warehouse document and localhost URL; native monitor capture failed with `CreateForMonitor 0x80070057`, and one accessibility-only recovery succeeded. This environment change and the added observations prohibit timing/throughput comparisons between the two motion runs. The earlier 31.9991 FPS result belongs to the earlier foreground RDP control; it is not asserted as the disconnected session's current ceiling. No uncapped physical-console FPS acceptance was obtained.

The prototype remains default-disabled and production source/assets remain unchanged. Remaining boundaries are ordinary whole-app moving visual equivalence, other eligibility transitions, uncapped fresh-start FPS and the original translating-view readback stalls. The new motion helper is exercised by the frozen standalone package runners, not a new CLI flag. Evidence: `motion-oracle-1.json`, `motion-oracle-2.json`, the retained helper/runner versions and `host-session-display-after-motion.json` under `D:/Codex/ElseMesh-local-desktop-20261027/`. All 13 diagnostic CPU checks, including two serialized motion-entry rejection checks, and syntax checks for the six changed/new tooling modules passed; those checks do not turn the failed GPU motion qualification into a pass. The architect accepted stopping this bounded investigation and a local diagnostic commit, with all remaining qualification gaps disclosed and no runtime adoption, push or deployment.

## 28 October: ordinary-app control and one moving-stall trace

The authorized next pass was bounded to a trustworthy original/original control, a conditional turning-prototype decision, and one moving-stall trace. It began at local `54f3d5f` on `codex/portal-fps-20261025`. No candidate was enabled during this pass; production remains unchanged.

### Session and frame control

Windows initially reported active RDP session 1, console session 4 connected, and the Remote Display Adapter. Computer Use observed the owned localhost test and brought it forward. Two native button calls failed with the same API-state message before measurement. Following review, the owned test runner invoked its own page measurement function. Over 120 intervals after 30 warm callbacks, the page measured **31.9983 FPS**, with every sample visible and focused. The failed native-input attempt is retained separately; it was neither a policy denial nor a game failure.

Later, during the ordinary-app comparison, session 1 was observed disconnected and console 4 connected. The agent made no session or OS changes; the exact transition time is unknown. Thus the earlier ceiling is evidence only for its observed conditions, and no stable uncapped FPS comparison or benefit claim is available.

### Moving stall not reproduced

One headed Edge/Intel Arc WebGL2 trace reused the verified production build after checking all 652 source/asset hashes and built chunk hashes. It sampled 180 moving frames with trace/readback observers and no GPU timer queries. All 161 sample-initiated readbacks completed; synchronous copy calls averaged **2.607 ms**, p95 **3.7 ms**, maximum **4.4 ms**. The retained lifecycle snapshot had no pending calls, live buffers/fences or dropped records. It was taken before observer disposal; its `disposed: false` is not evidence of leaked resources.

The selected trace contained 160 matched copy spans averaging 2.543 ms, maximum 4.201 ms. Nested Chromium `WaitForCmd` totaled 153.568 ms of 406.885 ms, or **37.74%**, versus the earlier long, overwhelmingly command-wait-dominated signature. No trace data loss or configured coverage gaps were reported. The original stall was **not reproduced in this environment**. This is not a fix, and no additional trace or speculative runtime change followed.

### Terrain/foliage matching succeeded; whole-app control remains invalid

The new `warehouse-app-comparison.mjs` runs the actual app callback with seeded randomness, fixed logical dt/time from the first callback, and a finite identical preparation route. Ambient updates and Microduck remain active. It does not pause the app, drain sorts, reset actor/culling state or extend warmup until a comparison passes. Three synchronous diagnostic checkpoints capture the canvas, actual displayed packed/depth buffers and actual GPU ordering texture. These captures perturb subsequent scheduling; this is correctness evidence, never FPS evidence.

The first attempt failed before any game frames because the external static server compared a real Windows path against an unnormalized root and returned HTTP 404. That runner/report were preserved. One narrow correction normalized the root, required HTTP 200 before waiting for the app, and added failure-state capture and a portable path-containment test.

The corrected run completed two fresh-browser original-only runs. At all three matching logical frames, camera/projection, logical time, resident terrain identities/data coverage, terrain geometry and active foliage buffers matched exactly. Displayed packed/depth outputs also matched. **The earlier terrain/foliage control problem was resolved for this finite route.**

However, Microduck became ready at frame 124 in A and frame 118 in A2, leaving actor animation 0.1 seconds apart. Actual published sorting sources also differed: at the first checkpoint, the displayed worker result originated at request frame 435 versus 437. Each GPU ordering hash matched its own observed worker result. Across the runs, 22 of 35 right-side publications matched exact source/key inputs and all 22 matched full ordering and active counts; 13 remained unaligned. This is not evidence of a nondeterministic sorter.

Whole-canvas differences were 25,529 / 24,454 / 25,533 pixels. The first localized difference was on the duck's feet at PNG (624,664); that localization does not explain every differing pixel. All raw checkpoint RGBA, full images, the first mismatch crops, installation frames and displayed-generation evidence are retained. There were no page errors. The control correctly returned `baseline-invalid-stop-candidate`, and no candidate run followed.

### Decision and reproducibility

The architect's decision is **defer runtime adoption**, not reject the candidate: this pass never installed it. Matching complete render input state, including actor animation and displayed splat generation, must be distinguished from ordinary asynchronous behavior. A future acceptance cycle must assess source age, transitions and visible discontinuities without silently aligning away timing changes caused by an optimization. No further harness redesign or GPU run was authorized within this bounded pass.

Completion review tightened comparison admission: canvas, displayed outputs and every required native buffer must have complete valid SHA-256 hashes; hashing must have finished; and the three checkpoint frames must be unique with identical frame sets. Missing data or duplicate checkpoints can no longer pass by comparing equal. Eleven new comparison/entry/path/admission checks and the 13 existing checks passed: **24 CPU tests total**. The actual capture initializer and package resolver remain byte-equivalent to the retained run; only CPU admission/comparison changed. Re-evaluating the retained report passes input admission but still rejects baseline state/visual equality. No GPU rerun was needed. New helper syntax passed and all 652 production files plus the experimental prototype remained unchanged. Run the CPU checks with:

```sh
node --test test/warehouse-generation-camera-diagnostic.mjs test/warehouse-generation-camera-motion-diagnostic.mjs test/warehouse-lifecycle-diagnostics.mjs tools/performance/warehouse-app-comparison.test.mjs
```

Evidence is under `D:/Codex/ElseMesh-qualification-20261028/`: `app-aa-2-summary.json`, `app-aa-2-admission-review.json`, `moving-trace-summary.json`, `frame-control-auto/visible-frame-control.json`, both original/comparison failure records, frozen runners/helper copies, host observations and `architect-gates.txt`. The new helper is standalone diagnostic tooling; the actual run used its retained package runner, not a new application import or CLI mode. Fresh-start performance, ordinary moving visual acceptance and the original readback stalls remain unresolved. No push or deployment occurred.
