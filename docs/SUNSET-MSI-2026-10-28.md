# Sunset rendering investigation on the local MSI

Status: preparing the user-authorized release of a bounded, opt-in Sunset
supersampling experiment. The broader sustained 30 FPS target and removal of
readback stalls remain **not qualified**. Publication is recorded separately
after the exact source, package and live deployment are verified.

The user clarified that the main game is the performance priority, accepts the
current Sunset rate, and wants the highest practical resolution with the original
island detail. This release therefore preserves the selected screen and portal
resolution, geometry, foliage, scene content and sort cadence. It does not enable
adaptive resolution or the experiment automatically.

Baseline: `1aa51cce66298a1dbbe482a2504e5a00c1a4da63`, branch
`codex/portal-fps-20261025`. Tests used a foreground maximized Edge window on
the local MSI console, Intel Arc through ANGLE D3D11/WebGL2. Standard settings
remained fixed: 1396 x 715 main output, 512 x 262 portal output, 719,538 pinned
Sunset splats, ordinary callbacks and physics, real portal crossing. Separate
frozen-output phases are not ordinary-motion acceptance tests.

## Integrated runtime option

Graphics → Rendering techniques → Sunset supersampling enables fixed 2x
supersampling in each direction for the qualified Sunset world and content
digest only. It uses the color-correct output policy and Three-owned presenter
described below. The menu reports internal and screen dimensions separately.
The choice lasts for the session and survives world transitions; targets are
released during transitions. Restore defaults, context loss and disposal clear
the choice. The ordinary Warehouse, portal destination and eye-view paths remain
outside this main-output pass. Unsupported views or target sizes use the original
renderer without reducing the selected resolution.

The guarded build transform checks the exact normalized upstream source and all
six substitution sites. Upstream vendor bytes and provenance remain unchanged.
The separate output-surface-derivative.json identifies the transform, derived
module and final runtime chunks; publication validates their hashes.

Maintained checks: npm run test:runtime-graphics includes controller fallback,
failure, restoration, resizing, lifecycle, exact world pin and transform tests.
The broader portal, published-world and generated-package suites remain required.
Integrated browser qualification includes highest-detail Warehouse bypass,
real entry/return, menu toggles, motion, resize, output comparison and context loss.

The integrated highest-detail observations used 2024 x 1037 screen output,
4048 x 2074 internal SSAA and a 1024-pixel portal cap. Enabled/native/re-enabled
walking measured 14.72/3.93/17.84 FPS; turning 10.48/3.97/17.25 FPS.
All frame intervals, including a 2.317-second turning stall, were retained.
These observations are not a sustained 30 FPS qualification; the earlier
28–32 FPS results used Standard output with about half as many screen pixels.
The first integrated harness then failed on a stale browser session during
resize; its measurements are retained separately from lifecycle qualification.

On the final guarded build, highest-detail Warehouse off/enabled-bypass images
were pixel-identical, normal input moved the player, and dimensions, preferences
and the renderer method stayed unchanged. Resize, restore defaults and re-enable
passed. A separate fresh integrated/reference/integrated image sequence at High
detail was exact across every repeated channel. Real context loss cleared the
option; restoration required explicit re-enable and then output frames advanced.
No unexpected page, console or HTTP errors occurred in that independent proof.

The first return harness reversed immediately from the arrival position without
walking clear of the doorway. The runtime deliberately requires departure beyond
0.9m before rearming. That attempt is retained as an unqualified harness failure,
not evidence of a rendering regression. Corrected ordinary traversal passed:
normal forward input reached local z=0.908404 and cleared rearm; normal turning
and forward input then returned to the Warehouse, increasing crossings from one
to two. High detail stayed selected, and the Sunset option remained selected but
inactive with its targets released. A preceding 6-second turning deadline was
insufficient at High detail; its steady-progress trace justified the bounded
12-second turn in the successful run. Both attempts are retained.

Final focused source validation: 46 runtime graphics, 182 portal, 101 published
world and 18 eye-renderer/privacy tests passed; the guarded production build
passed. The whole working-tree publication scanner reports existing findings,
including ignored benchmark artifacts; it is not a clean-publication claim.
The actual release uses a bounded package allowlist and exact byte/provenance
checks, preserving the prior public editor and world assets.

## Conservative portal culling

The return portal was being drawn when its entire flat aperture was behind the
camera. A bounding sphere intersected the frustum even though all four aperture
corners were outside. `WebGLPortalViews` now rejects an aperture only when its
whole rectangle is outside one frustum plane. The same predicate serves normal
and eye-view rendering. Grazing edges and partial intersections remain visible;
authorization, resource ownership and portal status handling retain their paths.

Validation: 182 portal tests and 10 eye-renderer tests passed. Cases include the
behind-camera regression, turning back to the portal, partial/rotated/enclosing
apertures, near-plane crossings and comparison against explicit corner distances.
The candidate production build passed. This saves an unnecessary destination
draw, but does not solve the dominant Sunset cost.

## Measurements and rejected candidates

The external evidence directory is `D:/Codex/ElseMesh-sunset-fix-20261028`.
Each JSON report retains source hashes, frame intervals, focus/readiness checks,
errors and applicable restoration results. Screenshots and raw RGBA outputs are
stored alongside reports. These historical probes are distinct from the bounded
runtime option above; GPU sorting and alpha-crop probes are excluded from it.

| Probe | Result | Interpretation |
| --- | --- | --- |
| `phase-1` | Sunset 6.27 FPS; 45 observed stationary frames had no generation/readback/worker-sort calls | Stationary Sunset slowdown is separate from moving-view readback stalls |
| `raster-2` | Default main GPU 133-142 ms; single-sample offscreen 6-13 ms | Large MSAA/framebuffer cost; offscreen was not presented and color semantics differed |
| `matched-1` | Same-format offscreen 4 samples: 122-146 ms; 0 samples: 7-14 ms | Confirms a major sample-count cost in the tested renderer, without establishing an acceptable AA replacement |
| `ssaa-1` | Fixed 2x-per-axis whole-scene supersampling: 29.56 FPS, main plus presentation 30-33 ms | Insufficient headroom; ordinary offscreen color/tone semantics differed from default, so visual quality was not qualified |
| `predicate-1` | Original/candidate/original: 29.90/28.69/27.42 FPS; similar GPU cost | Early alpha-bound discard gave no useful gain and failed exact output; rejected |
| `output-1` | Exact same-size default/control pixels; corrected encoded SSAA2 31.93 FPS, p95 33.5 ms, GPU 21-28 ms | Promising stationary diagnostic; moving gameplay and full visual qualification still required |

`predicate-1` preserved original geometry and surviving fragment expressions,
but changed 800 final pixels and 2,905 supersampled intermediate pixels. All
within-mode repeats and repeated originals were exact. No tolerance was relaxed.
The geometry-crop variant was prepared but never run or adopted.

## Color-correct output experiment

An ordinary Three render target changes program output color space, tone mapping
and unlit color conversion. Spark also switches its `encodeLinear` uniform.
Consequently the earlier offscreen comparison cannot establish unchanged game
appearance, even with equal sample counts.

The external output prototype registers exact renderer-owned output targets and
applies a consistent output policy to those three Three paths and Spark's actual
draw callback. Other portal/generation targets retain ordinary semantics. It uses
RGBA8 storage separately from output encoding, without impersonating an XR target.
A guarded Vite transform leaves the tracked vendor and its upstream provenance
untouched; the derivative build emits its own input/output/patch SHA manifest.

The mandatory first control compared actual default-framebuffer output with a
1x four-sample registered target, requiring exact original/control/original
repeats. It passed with zero changed pixels, allowing the `output-1` timing above.
Full material, fog, portal, motion and fresh-boot qualification remains necessary.

The wider `quality-1` run was invalidated by a proof-harness polling deadlock,
before collecting output/timing. `quality-2` used timer polling and passed the
original Sunset view, but its first return-portal baseline capture differed from
the next original by 2,705 pixels inside the Warehouse preview. The second
original, both controls and both later originals were all exactly equal. This
does not establish a candidate regression, but also does not qualify first-frame
behavior. The subsequent bounded warmed-state proof is described below; failed
evidence is retained.

`quality-3` completed the bounded warmed proof: default/control/default repeated
pixels were exact for original, return and oblique views plus the material/fog/
transparency fixture. SSAA repeat outputs were also exact. Visual inspection
showed the original frozen view was inside the avatar's head and the oblique
view partially obscured by it; those captures do not qualify ordinary camera
framing. The return view showed the live portal and courtyard. The helper enabled
free camera while retaining the player-eye position, making the self-avatar
visible. Ordinary moving tests use the normal
application frame loop and are separate from this proof.

`motion-1` used two fresh starts and preserved the real valid arrival position.
Return-facing samples changed yaw only; the earlier out-of-corridor setup was
discarded. Results (FPS):

| Fresh start | Stationary | Turning | Walking | Return-facing |
| --- | ---: | ---: | ---: | ---: |
| 1 | 31.81 | 30.99 | 28.50 | 39.42 |
| 2 | 32.06 | 28.88 | 28.83 | 50.56 |

The target remains unmet while moving. Separate instrumented walking observed
50 completed depth readbacks: synchronous `getBufferSubData` totaled 93.1 ms,
maximum 3 ms. The longer asynchronous readback/worker completion durations are
latency, not synchronous stalls. Renderer calls dominated the CPU-observed time;
their nesting and possible GL submission waits require attribution. Ordinary
return crossing attempts timed out without a runtime error, so return traversal
has not been qualified by this run.

`vector-1` passed all 17 synthetic ordering cases and three actual 719,538-splat
cohorts, with exact valid order, sentinel tails and no readback within the sorter.
However, complete-sort GPU cost across 15 warmed samples was median 14.72 ms,
p95 28.07 ms (minimum 9.27 ms). It failed the predeclared under-5-ms screen and
was rejected under that isolated cost screen. Exactness alone is not an FPS benefit.

## Presentation and moving readback attribution

`presenter-1` traced the raw presentation pass without adding GPU queries. Its
`getParameter(SCISSOR_BOX)` call took 4,420 ms across 171 stationary frames and
3,416 ms across 124 walking frames, dominating outermost renderer spans. The
replacement uses an isolated Three fullscreen triangle with the exact encoded
four-texel average, and cached renderer state instead of raw state queries.

`present-compare-1` corrected the proof camera to the ordinary first-person path
and used the normal main rendering entry. All original/oblique/return/fixture
checks passed exactly: default versus both control presenters, raw versus Three
SSAA, repeats and return-to-original. Injected presentation failure restored
state and recovered exact original pixels. Nevertheless, raw/Three/raw walking
was 28.34/28.01/28.34 FPS. The fresh-start continuation handshake expired before
the additional qualification samples; this was an operator timeout, not an
application failure, and no fresh-candidate qualification is claimed.

`presenter-three-1` identified where waiting moved. Ordinary renderer submission
took about 0.6 ms per frame, but 23 `getBufferSubData` calls totaled 1,836.5 ms
over the five-second walking trace, maximum 91.4 ms. Removing the explicit query
did not remove GPU synchronization. The instrumented walking result of 30.20 FPS
is not an acceptance timing and does not override the uninstrumented comparisons.

This new evidence justifies reassessing GPU sorting as an end-to-end asynchronous
pipeline rather than an isolated under-5-ms operation. The proposed experiment
must preserve native dirty/mapping/interval rules, exact ordering, borrowed
texture identity and atomic publication; it must also eliminate raw state
queries in the sorter itself. Fixed sort throttling, CPU-derived keys and crop
experiments remain inactive. Integration design and ordinary-motion validation
are still pending.

## Unresolved work

The existing asynchronous readback path remains installed. GPU-resident sorting
is not a fix for the stationary raster cost. Prior gather sorting measured about
12 ms of additional GPU work; integrating it without a measured whole-frame
budget would not establish 30 FPS. Its invalid ordering tail must use the shader's
`0xffffffff` sentinel if the exact active count is not read back. Generation/order
publication, texture ownership, fallback and context-loss handling remain required.

Architect plan and evidence gates are recorded in the external
`architect-gates.txt`. No reduced resolution, splat count, opacity, foliage quality
or sort cadence has been accepted to force the FPS target.
