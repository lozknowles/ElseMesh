# Warehouse readback investigation

The GPU readback stalls were narrowed to command-queue waiting. **No safe readback optimisation was adopted, and fresh-start FPS consistency remains unresolved.** The branch retains the foliage-corrected Warehouse wall depth prepass. The new readback and frame-budget helpers run only when explicitly selected by the benchmark.

## Evidence and rejected experiments

The actual Warehouse/Sunset trace contained 21 `getBufferSubData` spans totalling 4,313 ms. Nested Chromium `WaitForCmd` spans accounted for 4,288.82 ms (99.44%), with only 4.731 ms of renderer-thread CPU time during those waits. The lifecycle observer verified the expected 2,883,584-byte RGBA8 attachment, correct buffer identity, signalled fences and serialized readback. No accumulating buffer or fence leak was observed.

| Diagnostic | Mean copy-call duration | Disposition |
| --- | ---: | --- |
| Existing path | 63.07 ms | Reference |
| Restore pack-buffer binding | 60.14 ms | Stall remained |
| `STATIC_READ` allocation hint | 61.49 ms | Stall remained |
| Drain queued work before copying | 1.61 ms | Moved the wait; frame rate worsened |
| Limit outstanding frame fences to two | 23.81 / 22.41 ms | Frame pacing worsened |
| `STREAM_DRAW` preliminary screen | 67.39 ms | No useful initial benefit |

These are instrumented diagnostic measurements, not acceptance FPS. The queue-drain test produced 58 identical pairs of copies from the same completed buffer; it did not establish an independent visual or source-data oracle.

The counterbalanced control/two-frame/two-frame/control sequence measured 37.24 / 37.84 / 35.95 / 37.13 FPS. The two-frame cap reduced sorting-input age and increased sort completions, but worsened the 95th-percentile frame interval from 41.8 to 62.5 ms. All deferred intervals remained in cadence. Sorting-input age is not proof of GPU presentation freshness. The cap also delays the application update, so it was rejected for production. No three-frame search followed.

The second capped run first failed during build copying because C: was full, before GPU measurement. Its failure was retained; the retry and final control reused a verified build and stored output/browser temporary state on D:. This interrupted sequence is not clean fresh-start acceptance evidence. Other open applications were using the GPU. Shared GPU activity and disk pressure are confounders, not proven causes of the earlier inconsistency.

## Reproduction

Use the exact pinned world bundles and hardware procedure described in [the Warehouse report](WAREHOUSE-PERFORMANCE-2026-10-25.md). Run one GPU job at a time and ensure adequate disk space: each normal benchmark invocation makes a new production build. The following helpers are diagnostic only:

```sh
node tools/performance/warehouse-fps-benchmark.mjs --profile off --scenario portal-motion --sample-frames 540 --observe-longtasks --readback-observe --output work/readback-original.json
```

Add one experiment at a time: `--readback-restore-pack`, `--readback-usage STATIC_READ`, `--readback-usage STREAM_DRAW`, or `--readback-drain-queue`. The frame-budget comparison uses `--frame-budget 64` for the instrumented control and `--frame-budget 2` for the rejected cap. Both retain readback observation. These flags must not be used to claim unprofiled FPS or gameplay qualification.

The lifecycle helper preserves original Promise identity and reports pending calls. The drain helper cleans its added fence, but a vendor rejection can leave the vendor's original resources pending; snapshots expose that limitation. Frame fences do not bound every asynchronous Spark submission. The helpers are not imported by application entry points.

## Branch handoff, 27 October 2026

The user authorised pushing `codex/portal-fps-20261025`, without deployment. Production rendering code remains identical to the previously tested foliage-fix snapshot. The rejected allocation and scheduling experiments are opt-in tooling only. The earlier performance reports describe historical uncommitted states; this handoff supersedes those Git-status statements, not their measurements or limitations.

Fresh portal and published-world checks passed 280 tests before the push. The earlier exact GPU and actual-world visual evidence is retained; it is not represented as newly rerun. The next performance step is a repeated unprofiled baseline with adequate disk headroom and accounted-for competing GPU work. A safe readback fix remains open.

That retest is now recorded in [the 27 October fresh-start report](WEBGL-FRESH-START-2026-10-27.md). Four independent browser starts still varied from 25.75 to 38.62 FPS at the Sunset portal, and a CPU replacement failed exact sorting equivalence. No new runtime fix was retained.
