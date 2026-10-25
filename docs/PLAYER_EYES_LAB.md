# Player eyes: prototype provenance

The camera, neutral observer controls, accepted gaze context and render lifetime primitives were first qualified in a separate owner-runtime lab. That prototype authorized world VIEW access but did not provide target-to-recipient consent. Its prior evidence does not qualify the new sharing protocol.

This main-engine integration adds explicit session-scoped per-recipient vision sharing. Default sharing is off. A recipient must have both current player consent and independent world VIEW permission. God view is an observation tool, not an authority escalation. Static public single-player mode has no remote player roster.

## Plan gate

The architect approved reuse of the qualified rendering primitives, conditional on owner-enforced consent, session/world/content/authority/revision fencing, pushed revocation, fail-closed connection loss and three-client exclusion tests. Revocation means no further eye draw after the client processes the authoritative revoke; already delivered pixels cannot be recalled.

Source or destination world/session changes invalidate sharing. The player must share again after arriving in a new world; grants are not copied through portal handoff. Cross-world observation is allowed only with newly issued target consent and destination VIEW permission. Existing avatar presence does not constitute consent to vision sharing.

## Acceptance

Pending. Three authenticated clients must prove intended-recipient access and excluded-player denial, authenticated share/revoke ownership, replay and reordered-message protection, revoke during preparation and transfer, VIEW loss and authority changes, and safe own-camera recovery. Public empty-roster behavior, own physical body and input, portals and resource lifetime regressions must remain intact. No production or privacy qualification is implied until this section records the final evidence and completion review.


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
