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
