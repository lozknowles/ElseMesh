Current follow-up (27 October): the old distant-tree ordering experiment is superseded by the wall depth prepass described at the end of this document. Exact foliage fidelity passes; FPS retention is supported in one matched same-world comparison but remains inconsistent across fresh browser starts. The [readback investigation](WEBGL-READBACK-INVESTIGATION-2026-10-26.md) narrowed the stalls to GPU command waiting but adopted no runtime fix. The user authorised a separate-branch push; nothing is deployed. Git-status statements below describe the historical measurement stages.

# Actual Warehouse rendering comparison

> Historical native-path comparison below. The later WebGL tree-order experiment is documented in the follow-up at the end; its measured gain does not change the earlier native patch result.

Actual Warehouse FPS comparison — 25 October 2026

Result: no FPS improvement was observed. The modified runs had lower pooled frame cadence in all three views, including sizeable variation in the controls. The actual Warehouse/Sunset application selects WebGL2; the production change is in the separate WebGPU PortalViews implementation, which is structurally excluded from this route. These measurements do not establish the cause of the lower cadence or demonstrate a patch-induced regression. They establish no speedup and do not support a broad no-regression claim.

The test used the actual authored Warehouse and Sunset worlds served only on this computer from a normal production build. It did not deploy or modify the public site. This is an automated rendering comparison, not a measurement of a human-controlled foreground gameplay session.

Measured frame cadence (FPS = 1,000 / mean browser animation-frame interval)

View | Baseline FPS | Modified FPS | Baseline individual runs | Modified individual runs
--- | ---: | ---: | --- | ---
Warehouse interior | 59.99 | 50.94 | 59.99, 60.00 | 57.74, 45.57
Facing live Sunset portal | 18.10 | 17.16 | 17.67, 18.56 | 17.06, 17.25
Facing away from portal | 59.83 | 52.05 | 60.00, 59.67 | 46.15, 59.66

Frame-time and CPU detail (pooled 360 samples per variant per view)

View | Baseline/candidate frame p95 (ms) | Baseline/candidate full update CPU mean (ms) | Baseline/candidate portal CPU mean (ms)
--- | ---: | ---: | ---:
Warehouse interior | 16.90 / 33.40 | 5.56 / 4.75 | 0.02 / 0.02
Facing live Sunset portal | 116.90 / 133.30 | 6.49 / 6.32 | 0.77 / 0.73
Facing away from portal | 16.90 / 33.40 | 5.69 / 5.21 | 0.02 / 0.02

Method and scope
- Four fresh sequential browser runs: baseline A1, candidate B1, candidate B2, baseline A2. The same final harness, browser, camera route and settings were used. Source hashes verify that only PortalViews.js differed among the checked production files; the candidate was restored after the series.
- 156.0.4314.42, ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11). Intel Arc driver 31.0.101.5590. Hardware rendering verified; software rendering rejected. Balanced power plan and AC/battery status are recorded in environment.json; no settings were changed.
- Headless Edge, 1280 x 720 viewport, DPR 1, standard quality. Each portal target is 512 x 288. This is not physical-mobile or foreground display qualification.
- Each view gets 180 warmup frames and 180 samples. The same small camera movement repeats in warmup and sampling; logical simulation dt is 1/60 with fixed per-scenario start frame and seeded Math.random. Frame pacing uses real requestAnimationFrame timestamps.
- Free-camera positioning avoids collision/input variability. The actual host update (water, wind, traffic, neon and LOD work) runs once inside the measured app update. Microduck and ambient workloads remain active; media stays in its normal inactive state. Player movement, collisions, live travel and multiplayer were not tested.
- Readiness requires the active Warehouse identity/root in the live scene, an admitted inactive Sunset package, two bound duck visuals and actor, an authorized live portal image, and no runtime errors. Active Warehouse preparation-fingerprint mismatch is recorded rather than falsely treated as a rendering failure; no admission state was changed.
- All four gold-door runs draw the actual Sunset destination once in every sampled frame (720 total). The interior and turn-away controls draw no destination views. All sampled windows have zero observed asset activity. Diagnostics and screenshots run outside timing windows. No GPU completion waits/readbacks occur inside timed frames.
- Full-update and portal timings measure synchronous CPU work/submission, not GPU duration. FPS depends on browser pacing and system load. Only two runs per variant were taken, so this is a bounded comparison, not a statistical equivalence or broad no-regression proof. No other task-owned GPU benchmark ran concurrently; ordinary user apps remained open.
- The original published catalog contains the Warehouse–Sunset route. The separate blue Dock doorway remains unavailable/loading by design; it was not silently supplied another destination.

Network observations
- baseline-A1: 29 raw aborted requests; 29 have matching fully consumed resource bytes with exact positive Content-Length and coupled runtime-readiness evidence; 0 unresolved asset failures.
- candidate-B1: 31 raw aborted requests; 31 have matching fully consumed resource bytes with exact positive Content-Length and coupled runtime-readiness evidence; 0 unresolved asset failures.
- candidate-B2: 24 raw aborted requests; 24 have matching fully consumed resource bytes with exact positive Content-Length and coupled runtime-readiness evidence; 0 unresolved asset failures.
- baseline-A2: 40 raw aborted requests; 40 have matching fully consumed resource bytes with exact positive Content-Length and coupled runtime-readiness evidence; 0 unresolved asset failures.
These warnings are preserved in full. Same-URL completion is resource-level evidence and does not prove the identity or cause of each aborted request. No network-failure-free claim is made. Every sample window was checked for asset requests, responses, failures and completed reads; none overlapped accepted samples.

Visual checks
All three camera checkpoints were inspected before accepting the route, and all twelve accepted-run screenshots were inspected after measurement. They show the authored Warehouse interior, live Sunset courtyard through the gold doorway, and the Warehouse when facing away. No new visual defect was apparent in these checkpoints. These are visual checkpoints, not exact pixel equivalence: ambient/Microduck state can differ between boots.

Review and next steps
The exact change and supporting renderer code were shared with Argon through the user-specified Chrome Gemini conversation before accepted measurements. Argon's initial review found no immediate correctness blocker and correctly noted that the published WebGL2 route cannot benefit. When Argon reached its account limit, the user authorised Flash-Lite for this follow-up only. Complete further source batches were sent and its two replies are preserved separately.

Flash-Lite retracted incorrect WebGPU/legacy test instructions after challenge, but its position-only tile caching and main-camera-only electrical-effect suppression remain unsafe as proposed. No additional production change was adopted from those suggestions.

Recommended next work is a CPU/GPU capture of the actual WebGL/Spark Sunset portal pass and frame pacing. Its synchronous portal CPU cost is below one millisecond on average while frame intervals are much longer; this makes GPU/pacing work a useful hypothesis to investigate, not a proven GPU bottleneck. Also measure duplicated terrain view requests, per-frame diagnostics/animation graph walks, and electrical-arc updates separately. A later fix should target a measured bottleneck, preserve streaming and all portal cameras, and be retested on this actual-world route. See 06-review-assessment.txt for exact source references and rejected assumptions.

Revisions and saved state
- Engine baseline: dfc5066dd3ba70af663101b9aa465d4262dd9074.
- Local branch: codex/portal-fps-20261025. Candidate production change remains the native withSceneTransforms scope around eligible multipass portal rendering.
- World repository commit: 9a292002611928ef8a867ed939c8aa20c56a5283.
- Warehouse digest: fcba18b28ac9b8bf7ef52a1fc8ba0d3dc489d0bd4c94c651cdc559a7617a0e5d (1,730 authored objects).
- Sunset digest: 3d904b583d30a198311e0b64248b93c689cf6c2442259964f822794346778992 (719,538 Gaussian splats).
- world-bundle-receipt.json retains hashes for all copied world resources. The application continued to use its normal digest verification.
- The implementation remains staged, not committed: no Git author identity was invented. No merge, push or deployment occurred.
- Earlier smoke trials and the failed all-records readiness attempt are excluded. The failed A1 attempt is retained under excluded/. Only the four successful runs named in abba-execution.json contribute to these numbers.

Evidence files
comparison-summary.json; baseline-A1.json; candidate-B1.json; candidate-B2.json; baseline-A2.json; their PNG checkpoints and logs; environment.json; world-bundle-receipt.json; architect-gates.txt; 01–06 review text files; portal-optimisation-and-warehouse-test.patch.

Reproduction
Prerequisites: Node 24, dependencies installed with npm ci, and installed Microsoft Edge. Use the unchanged public/published-worlds.json and public/opening-world.json from the engine baseline. World assets come from https://github.com/lozknowles/elsemesh-world-loz-opening-island.git at commit 9a292002611928ef8a867ed939c8aa20c56a5283: Warehouse starts at the repository root and Sunset starts at worlds/sunset. For each catalog entry, copy world.json and the relative resource paths listed for that world in world-bundle-receipt.json into engine/public/worlds/<contentDigest>/, preserving paths. Verify file sizes/SHA-256 against the receipt and each world.json against the catalog contentDigest. Keep these test bundles ignored and local.
With those exact bundles available, run from the engine repository root:
node tools/performance/warehouse-fps-benchmark.mjs --channel msedge --label candidate --output work/warehouse-candidate.json
For the baseline, use the baseline commit's PortalViews.js contents with the same final harness and world bundles. Compare sequential baseline/candidate/candidate/baseline runs, then restore candidate source. Do not run competing GPU benchmarks. The output remains local and the server binds to loopback only.

Final architect review approved completion of this bounded measurement/review task, with the table formatting and reproduction details corrected. It did not approve a Warehouse speedup or release. Explaining the slower candidate controls, collecting GPU/frame-pacing evidence, foreground gameplay, actual travel and improving the WebGL route remain open. The gate and primary decision are recorded in architect-gates.txt.


## Follow-up: actual WebGL distant-tree ordering

The local distant-tree-only candidate raised portal-facing cadence from 28.12 to 36.08 FPS (+28.30%) in the final interrupted A/B/B/A comparison. Only distant tree meshes receive renderOrder=1, allowing ordinary opaque Warehouse walls/apertures to establish depth first. Shrubs, near trees, palms, geometry, instance counts, shaders and portal rendering remain unchanged. The earlier native PortalViews patch was held constant on both sides.

| View | Baseline FPS (individual runs) | Candidate FPS (individual runs) |
| --- | --- | --- |
| warehouse-interior-away | 54.76 (54.81, 54.70) | 53.96 (53.01, 54.94) |
| gold-sunset-parallax | 28.12 (27.74, 28.51) | 36.08 (36.19, 35.96) |
| gold-turn-away | 55.08 (54.86, 55.30) | 55.22 (55.19, 55.26) |

These are hardware WebGL2 headless Edge measurements at1280x720/DPR1, standard quality and512x288 portal target. Each run has180 warmup and180 measured frames per view. All sampled windows were asset-idle with admitted Warehouse/Sunset/duck resources and exactly180 actual Sunset draws in the portal view. Controls drew no destinations. B2 stopped the orchestrator AFTER its timing windows because strict image comparison failed; A2 resumed separately. The raw B2 measured-with-errors status is retained, and only its valid timing component is used here. The interior control pooled1.46% lower with a worse B1 tail; broad absence of regressions is not established.

Separate partial GPU render-scope queries measured main Warehouse 23.80 -> 16.25ms, portal 8.13 -> 8.68ms. Query drops/pending remain explicit; these are not complete GPU frame budgets.

52 targeted CPU tests and108 deterministic GPU fixture image cases passed. Actual-world checks found53/8/43 differing pixels at front/left/right views, versus zero baseline-repeat noise; near1m and away matched. All differences lie in exterior foliage seen through windows, outside the portal aperture and a3px margin (nearest23.81px). Maximum RGB deltas20/18/34; cause unestablished. Exact actual-world visual equivalence remains **unmet**. Equal-depth ordering can change pixel outcomes. This is a local experiment with a measured FPS benefit, **not release qualification**. No merge, push or deployment.

The broader tree+shrub candidate and shader specialization were rejected; their results are excluded. Full method, artifacts, source hashes, raw warnings and gate decisions are in outputs/webgl-sunset-fps-20261025/WEBGL-FPS-RESULTS.txt and final-comparison.json in the owning task workspace. Reproduce using the same bundles described above, but hold native PortalViews.js fixed and switch only WebGLNativeIsland.js for this comparison. The final harness supports --scenario all --profile off and optional --visual-checks (strict nonzero on any pixel difference), plus separate accounting/gpu/gpu-objects/gpu-scissor/trace diagnostics.


## Foliage fidelity follow-up — 26 October 2026

The retained local source restores every native render order to the original implementation. A main-camera depth pass uses only the exact two authored Warehouse brick batches (32 instances, 384 triangles), followed by the unchanged colour order. The admitted active world ID and content digest must match the tested Warehouse. Other revisions and unsupported modes fall back to ordinary rendering. Any scene stencil-writing material disables the prepass. Shared materials, layers, clear policy, background and accounting restore even on exceptions; no additional resources are created. Portal destinations, preparation and Player Eyes retain their existing paths.

The original differences were order-dependent foliage/fine-terrain overlap before glass, established using original-shader pixel traces. Grouping all canopies with terrain failed 24 original shrub fixtures. Moving distant trees and terrain together still failed three actual pixels and six terrain fixtures. These attempts remain archived; tolerances were not relaxed.

Final verification passed 63 CPU tests, 242 exact GPU image cases, and 38 exact actual-world comparisons including evolving wind/gust and oblique window views. GPU tests use observed 24-bit default-framebuffer depth with 0/4 samples and retain the original 108 placements per context, plus terrain and coplanar cases. Original colour draw order, geometry, shaders and instances match. The final normal production smoke confirms two wall depth draws, unchanged Sunset rendering, asset-idle samples and readiness. Native source is byte-identical to the original baseline.

| Comparison | Original A FPS | Prior-fast B FPS | Corrected C FPS |
| --- | ---: | ---: | ---: |
| Independent short boots, 180 samples/view | 25.23 | 35.47 | 30.90 |
| Independent longer boots, 900 portal samples | 21.63 | 27.60 | 25.86 |
| Same loaded world B/C/C/B, 900 samples/block | Not measured | 30.35 | 31.28 |

All frames remain included. Independent-boot C is 12.88% and 6.30% below B respectively; later controls slowed too. Same-world C blocks are 31.03/31.52 FPS versus B 30.34/30.37. A roughly one-second B stall contributes to the pooled 3.04% advantage, so this is evidence of retention in that matched test, not a reliable incremental gain or statistical equivalence. Simulation progresses across blocks; camera cycles and settings match. The matched result does not erase inconsistent independent-boot evidence.

A separate diagnostic identified 146 synchronous Spark GPU readbacks outside the game update, averaging 166.40 ms and reaching 294.3 ms. Their spans covered more than 99.9% of observed long-task time. Spark had exactly one portal callback per sampled frame and none during depth rendering. The underlying driver/queue cause is unresolved; diagnostic FPS is excluded. No Spark production optimisation was made.

The final world/digest and scene-stencil guards were added after independent-boot timing; their inactive path for the pinned scene was verified by the final-source matched blocks, GPU/actual images and smoke. Do not describe the earlier timing source as byte-identical to final source. Qualification remains headless hardware WebGL2 on the recorded Intel Arc/Edge setup, not travel, foreground play, mobile or other GPUs.

Detailed raw data, failed experiments, source hashes and gate records are in the owning task's outputs/foliage-fidelity-20261026/FOLIAGE-FIX-RESULTS.txt. CPU helper/native-order tests are included in test:portals. Reproduce GPU cases with npm run test:warehouse-depth:gpu -- --output work/depth-gpu.json. Run the actual benchmark with --visual-checks --extended-visuals --evolving-visuals for the final 38 comparisons; depth is now the default visual strategy. The historical --plant-order-visuals mode requires archived rejected ordering source. Use --comparison-blocks BCCB --scenario portal-motion --profile off --sample-frames 900 --observe-longtasks for the matched block comparison. Run GPU jobs sequentially.

The change remains on codex/portal-fps-20261025, staged and uncommitted, without push, merge or deployment. Cross-start consistency and the readback stall remain open; this is not release approval.
