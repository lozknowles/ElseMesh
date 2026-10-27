# Warehouse GPU sorting investigation

Two GPU sorting prototypes reproduce Spark's complete ordering on the tested inputs without recurring CPU readback inside their sorting paths. Fragment gathering reduces the measured GPU sort cost from about **32.5 ms to 11.9 ms**. Both exceed the predeclared **8 ms feasibility screen**, so neither is integrated into the renderer. No FPS improvement or rendered pixel equivalence is claimed.

Work remains local on `codex/portal-fps-20261025`. Production source, assets and dependencies remain unchanged from `7f494045d897fc8443791680847fd13bc15e931c`. The existing foliage-corrected depth prepass is retained. Nothing was deployed.

## Exact ordering contract

The pinned Spark 2.4.0 [Rust sorter](https://raw.githubusercontent.com/sparkjsdev/spark/v2.4.0/rust/spark-rs/src/sort.rs) and [worker binding](https://raw.githubusercontent.com/sparkjsdev/spark/v2.4.0/rust/spark-rs/src/lib.rs) establish the contract: accept raw keys below `0x7f800000`, sort all 32 bits descending, preserve source-index order on ties, and process only the first `numSplats` entries. The binding writes only the active prefix into an initially zero-filled ordering array. The shipped WASM worker independently confirmed this contract for every synthetic fixture.

The prototypes consume Spark's existing GPU depth attachment, decoding the four RGBA8 bytes exactly. They do not recalculate depths on the CPU. Each valid key becomes an unsigned priority paired with its unique original index; invalid and padding entries sort last. The result is packed into Spark's expected 4096-wide RGBA32UI texture, four indices per texel.

The first prototype merges sorted runs by scattering one point per input, using binary search to find its destination. It needs 20 merge passes at the actual capacity of 720,896. The second uses fullscreen fragments and a merge-path partition search for each output position, avoiding the large point stream. Both include initial key conversion and final packing.

## Correctness and cost

Each run checked 16 synthetic fixtures: empty, one/two/odd counts, identical keys, all-invalid keys, ascending/descending input, mixed special float encodings, and boundaries around 4096 and 16,384. Valid-looking padding was deliberately ignored. Every full ordering and active count matched the installed worker.

Each implementation also matched **all 720,896 output entries** at three distinct real Sunset camera origins, with **719,538 active splats**. The captured source-key hashes matched between implementations and repeats. No candidate texture or active count was installed into Spark.

| Run | Whole-sort GPU mean | Range | Exact ordering |
| --- | ---: | ---: | --- |
| Point scatter, initial | 32.49 ms | 29.63-35.01 ms | Passed |
| Point scatter, profile session | 31.00 ms | 30.08-32.46 ms | Passed |
| Fragment gather, initial | 11.91 ms | 10.84-14.08 ms | Passed |
| Fragment gather, integrated CLI repeat | 11.78 ms | 10.82-13.86 ms | Passed |
| Fragment gather, final guarded CLI | 12.14 ms | 10.99-14.52 ms | Passed |

Every row contains 15 GPU timer samples: two warm sorts followed by five recorded sorts at each camera origin. Resources were reused at full size. Timers encompass conversion, all merge passes and packing; result readback, reference-worker sorting and CPU comparison are outside the intervals. GPU disjoint conditions reject measurements. This was Edge 156.0.4314.42 with ANGLE/D3D11 on the Intel Arc laptop, not a cross-device qualification.

The stage diagnostic justified exactly one alternative implementation. An identity point-copy control averaged 1.63 ms versus 0.31 ms for a fragment copy, with all 720,896 copied pairs identical. That control is not a sorting speed claim. Individual stage queries perturbed total time, so complete-sort controls before/after were retained. The fragment implementation was judged by its own complete-sort measurements, not extrapolation from the identity copies.

Instrumentation recorded zero `readPixels` and zero `getBufferSubData` calls during prototype sorts. Explicit readback remains in the correctness oracle only. The existing application still uses its original sorter and readback path: cadence recorded before the post-timing oracle is **not GPU-sort FPS**.

## Boundaries and review

The first oracle did not restore camera pose and forced the default render target during cleanup. Those diagnostic state defects were corrected before the stage and gather runs; subsequent reports confirm restoration of camera pose, target, viewport, scissor, sorting methods and frame gating. They do not invalidate the original captured-order comparison. The browser sessions are disposable and the prototypes never published an order.

Completion review additionally required failed restoration or stage profiling to invalidate the session, and bounded waits for the worker, readback and camera-settling frames. These guards now stop the CLI before subsequent checks. A timeout cannot cancel work already submitted to the GPU or shared worker; the failed browser session must be closed.

Failure checks exercised the actual oracle with an unresolved mock worker: its one-second deadline fired, owned resources were disposed and saved state was restored. The actual final-restoration and stage-result guards rejected injected failures. A subsequent normal-build CLI run passed all 16 synthetic fixtures, three complete captured permutations, readiness and restoration checks with no runtime or asset errors. These mocked failure checks are not GPU or pixel tests.

Both prototypes fail the unchanged 8 ms cost screen. That screen is an early engineering limit for this already busy GPU, not a measured guarantee of FPS improvement below 8 ms. There was no live integration, pixel comparison, moving-view publication test or new fresh-start acceptance series. Existing visual evidence remains historical. No third algorithm was attempted after the conditional variant failed the cost screen.

Any future integration must preserve generation ownership and publish the ordering texture, active count, accumulator and camera metadata together. The CPU draw count is another dependency: the initial scope would need the pinned, static, verified all-active cohort, with fallback for changing activity, mappings, LOD or modifiers. Earlier completion of sorting can change which generation is displayed during motion, so exact frozen permutations alone do not qualify the visuals.

## Reproduction

Run one GPU job at a time and keep build/browser temporary storage on a drive with adequate space. These flags are explicit diagnostics; default rendering and benchmark behavior are unchanged.

```sh
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 180 --gpu-sort-oracle --gpu-sort-method point-scatter --output work/gpu-sort-point.json
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 180 --gpu-sort-oracle --gpu-sort-method point-scatter --gpu-sort-stages --output work/gpu-sort-stages.json
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 180 --gpu-sort-oracle --gpu-sort-method fragment-gather --output work/gpu-sort-gather.json
```

CPU and GPU oracles require separate sessions. The stage diagnostic requires the point method. The actual portal-motion route is required; the ordinary all-scenarios route also supplies it.

Raw reports, source hashes, frozen runners, the verified-build reuse receipt, stage timings and architect gates are retained at `D:/Codex/ElseMesh-gpu-sort-20261027/`. The compact result is `gpu-sort-summary.json`. The normal-build CLI repeat passed readiness before/after and reported no runtime or asset errors. All diagnostic modules passed syntax checks; production file hashes were rechecked separately.
