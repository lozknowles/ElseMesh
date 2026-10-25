# Player eyes: prototype provenance

The camera, neutral observer controls, accepted gaze context and render lifetime primitives were first qualified in a separate owner-runtime lab. That prototype authorized world VIEW access but did not provide target-to-recipient consent. Its prior evidence does not qualify the new sharing protocol.

This main-engine integration adds explicit session-scoped per-recipient vision sharing. Default sharing is off. A recipient must have both current player consent and independent world VIEW permission. God view is an observation tool, not an authority escalation. Static public single-player mode has no remote player roster.

## Plan gate

The architect approved reuse of the qualified rendering primitives, conditional on owner-enforced consent, session/world/content/authority/revision fencing, pushed revocation, fail-closed connection loss and three-client exclusion tests. Revocation means no further eye draw after the client processes the authoritative revoke; already delivered pixels cannot be recalled.

Source or destination world/session changes invalidate sharing. The player must share again after arriving in a new world; grants are not copied through portal handoff. Cross-world observation is allowed only with newly issued target consent and destination VIEW permission. Existing avatar presence does not constitute consent to vision sharing.

## Original acceptance criteria (historical hold)

At the initial review, acceptance was pending. Three authenticated clients must prove intended-recipient access and excluded-player denial, authenticated share/revoke ownership, replay and reordered-message protection, revoke during preparation and transfer, VIEW loss and authority changes, and safe own-camera recovery. Public empty-roster behavior, own physical body and input, portals and resource lifetime regressions must remain intact. No production or privacy qualification is implied until this section records the final evidence and completion review.


## Preliminary completion gate

The first main-engine completion review held publication for seven concrete findings: generic coordinator presence carried eye state without consent; explicit Stop sharing on an already empty record did not fence delayed grants; recipient VIEW-session binding was signed but not checked against the actual verified session; expected consent conflicts could be mistaken for remote-world disconnection; owner default rendering left the feature unavailable without a query override; a focused player dropdown retained revoked names; and the sharing UI did not expose its 60-second expiry.

The primary accepted all findings. Assigned repairs preserve ordinary avatar presence, restrict the eye protocol to owner-authorized mode, add explicit signed VIEW-session receipts and revision fences, distinguish authenticated application denial from transport loss, select supported owner rendering by default, and update permission removals/expiry immediately in the UI. No production publication is approved until focused security tests and actual default-URL browser sharing, revoke, cross-world and public empty-roster checks pass. The earlier private lab push does not claim these new consent guarantees.


## Concurrent release integration gate

A newer public release landed during qualification: Original Island export support and a bounded 2 MiB GitHub commit-response fix. The architect required preserving that history, its current editor and optional-world pins before publication. The consent branch merged engine revision 2f3b90b without rewriting it. The vendor retains its clean c24 base build, but explicitly records the downstream response-limit patch and actual patched SHA; it is not described as an unchanged clean vendor bundle. Packaging preserves and validates the incoming editor/Original Island provenance. The latest incoming Pages revision 5594b9b is the integration and rollback baseline; intentionally removed older files are not resurrected.

The original Sunset two-context server-GPU attempt was guard-aborted at +772 MiB, four MiB beyond the conservative cap, before consent assertions. Actual free memory remained above 2 GiB and protected processes were unchanged, but this does not qualify the behavior or authorize a silent budget increase. The architect directed moving only graphical clients to the already-authorized desktop while keeping code, builds, owner runtimes and orchestration on hpubuntu, using private loopback forwarding and owned cleanup.


## Owner Sunset physics integration gate

Tracing the real owner path exposed a missing dependency: generic terrain was still used for a Splat world even though the client used its reviewed mask. The architect required the qualified small owner adapter, fail-closed unknown/missing/tampered physics, purpose caps before Git object reads, and owner-confirmed client segments. No fixture clearance override substitutes for this path. Native and public single-player movement retain their existing behavior.

The owner adapter now compiles the exact pinned physics without decoding Gaussians or using the GPU. SOG/physics reads have purpose-specific pre-allocation caps and a two-entry, 24 MiB immutable-repository cache. Full segments enforce native contacts and reviewed support. The client checks proposals against its exact verified signed receipt/correction context, including world, region, content, authority, session, generation and connection. It waits stationary until the initial/destination signed receipt; network round-trip pauses remain an acknowledged tradeoff.

The actual-world CPU proof passes 236 route samples, stationary and jump/landing checks, six genuine signed confirmations around a real rounded corner, and rejection of an unconfirmed coalesced chord. All 1,461 independently classified integer-index aperture samples were admitted and passed strict bidirectional sweeps, mapped arrivals and egress; no sample was excluded. An outside-edge regression remains rejected. The earlier floating-step fixture accumulated a one-femtometre outside-edge error; the no-progress review approved integer-index reconstruction without any production tolerance change. Original SOG/physics hashes and authored door geometry are unchanged.

Focused owner-boundary/contact/cache checks pass 30 cases, and the actual pinned-source suite passes both cases. A broader run passed 80 cases; a separate raw-export test could not run because its external original-heights fixture was unavailable. This is not claimed as an implementation failure or a passed raw-export qualification.


## Earlier review-branch status (historical hold)

At this earlier checkpoint, the consent implementation was reviewable in the main engine repository but was not enabled by a main/Pages release. Ordinary-world physical acceptance passed seven checks with two browser clients and a third authenticated excluded client. Pinned owner Sunset physics, protocol, movement confirmation and the prebuilt owner package are qualified separately by CPU tests.

At that checkpoint, the original Sunset graphical checks remained unqualified. The first two-context run stopped before consent assertions at +772 MiB against a 768 MiB cap. The single approved 400×320 attempt stopped before both clients were ready at +771 MiB; requested CSS sizes are not reported as actual drawing-buffer evidence because the guard closed the pages before that snapshot. Neither attempt is counted as a functional pass. Both restored the baseline after owned cleanup.

The approved desktop alternative was unavailable: sshd explicitly prohibited the private forwarding channels. Its policy was left unchanged, no bypass was attempted, and the temporary test windows and owned forwarder were closed. The test identities were not loaded on the desktop.

The review permits proposing one explicit human-approved capacity experiment, not quietly increasing a guard. Any such experiment must retain at least 2 GiB actually free, a fixed deadline, stable protected processes and owned cleanup, and acknowledge possible compute contention. Until successful Sunset rendering/consent/revoke assertions or a changed approved release scope, main and Pages publication remain on hold.


## Focused original Sunset acceptance

The primary withdrew the proposed memory-cap increase and selected a materially different, lower-resource engine qualification: a visibly labeled synthetic **Vision test room** connected to the original Sunset scene. This did not substitute for a full Warehouse capacity claim. Both owners used the frozen packaged runtime, strict admission and actual signed movement. All nonportal Sunset project fields, its 719,538 Gaussians, original physics, transform and doorway geometry stayed exact; only documented fixture identities and reciprocal links changed.

All nine browser checks passed at actual 400×320 drawing buffers and portal targets, pixel ratio one. Genuine UI sharing excluded the third authenticated client. Observer airborne selection continued to a signed landing with no correction or session/generation change. The target crossed physically, cleared to a signed 1.07 m outward position, jumped and landed on the strict signed Sunset floor. Fresh cross-world sharing rendered the original Sunset statue/landscape and a live return view showing the test-room sign/avatar. Verified revocation synchronously removed selection and retained targets/pixels, with no later eye draws. Sampled GPU use stayed within the original 768 MiB guard and restored after owned cleanup. The full Warehouse/Sunset two-client graphics combination was not qualified by this run.

A separate final static-public smoke passed four checks: default published WebGL startup, original Sunset live preview and local duck, a truthful empty God view roster without identity/socket/consent calls, and actual keyboard movement after closing the popup.

The user subsequently explicitly approved one new 800 MiB / 2 GiB minimum-free / 240-second full Warehouse/Sunset attempt. This is a separate human-authorized scope, not an inferred retry or automatic budget ladder. It runs only after the narrow legacy transition safety fix and exact final build are qualified; any guard or acceptance failure ends that scope without another increase.


## Legacy transition safety review

The minimum-version review found that a local known-legacy rejection could occur after the transition had marked a commit outcome uncertain, despite making no request. A synchronous compatibility assertion now runs before that uncertainty boundary using the same frozen request/context passed into prepare. The transport retains its defensive assertion. No VIEW prerequisite is added to ENTER.

Actual owner/encrypted-RPC, real transition and real Input tests confirm known legacy rejection allocates nothing and restores source controls/membership; uncached legacy discovered after reservation waits for real signed cancellation; missing cancellation proof remains conservatively frozen until definitive recovery. Modern ENTER without destination VIEW remains supported. Present malformed or invalidly signed receipts remain authentication failures, not harmless legacy. The final related CPU suite passes 68 cases.


## Final compatibility source gate

The architect reviewed the frozen 11db1c9 runtime and found no remaining material compatibility blocker. Known old-runtime rejection precedes the uncertain prepare boundary; signed cancellation and ambiguous-outcome freezing remain enforced. The primary accepted the review and retained matching owner/client upgrades as a deployment prerequisite. Final checks passed 70 consent, 101 published-runtime, 150 portal, 32 network, 6 security, 25 world, 30 owner-Splat and 2 actual pinned-Sunset cases. The default suite passed 73 with one pre-existing real-GPU test skipped; that skipped case is not claimed as qualified. A scan of all 48 changed text files found no credential or private-path matches. Final graphical evidence and publication remain separately gated.


## Human-approved full Warehouse/Sunset attempt

The single approved 800 MiB experiment used the clean 11db1c9 client and matching 320-file owner package, after seven stable samples over 30 seconds at 13,301 MiB used / 2,966 MiB free. Both real full-scene clients reached ready with 400 by 320 drawing buffers, pixel ratio one, original 719,538-Gaussian Sunset and live portal targets. Default denial with a third authenticated client also passed.

The next sampled GPU allocation jumped from 14,088 MiB used to 14,284 MiB used: 983 MiB above baseline with 1,983 MiB free. The guard terminated the owned browser. Thus the cap and minimum-free targets were briefly exceeded before detection; neither target is described as maintained throughout. Sharing, cross-world eye rendering and revocation in the full Warehouse/Sunset combination did not complete and remain unqualified. This is a guard-aborted attempt, not a functional pass. No retry or larger budget is authorized. The focused original-Sunset and ordinary-world successes do not substitute for this full-scene acceptance.


## Limited-release decision

The architect's no-progress and release-scope review found a narrow engine/Pages release defensible after cleanup and exact publication checks. The primary accepted this scope: ordinary-world consent, focused original-Sunset cross-world consent, strict owner physics, and the public single-player empty roster. The full Warehouse/Sunset multiplayer combination remains explicitly unqualified. No persistent owner installation is restarted or upgraded by this release; participating owners must separately install the matching consent-enabled package. The review does not authorize another graphics attempt, a larger resource cap, or a full-scene readiness claim. Allocation profiling or a client with sufficient headroom would be separate future work.
