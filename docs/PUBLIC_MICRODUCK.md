# Public Microduck companion

The public single-player Warehouse and Sunset tour includes one local autonomous Microduck per browser session. It wanders with admitted collision-aware movement, periodically visits the reciprocal gold doorway, clears the destination aperture and explores before returning. It is not a persistent or shared online character. Computer vision and player-eye viewing are not promoted by this release.

## Plan gate

Trigger: integrating an autonomous actor across two cached rendered worlds introduces movement, portal mapping, graphics readiness and resource lifetime risks. The architect approved one controller with two independent, permanently constructed world representations. All visual nodes and materials must be complete before package preparation/registration. After registration only pose, animation and visibility change; no readiness exemption is introduced.

Duck travel does not activate the player's host, move the player's body, pause input or create a network identity, authority, membership or peer. Actual current catalog routes and door geometry are authoritative. Destination grounding, full segment and outward egress must be admitted before changing the actor's world. Failure cancels locally and recovers in the source. Shutdown fences asynchronous completions before packages retire.

Each representation has explicit disposal ownership. Missing or corrupt installed model data must leave the existing tour usable. The original installed rigid model, measured gait and attribution are reused. Model geometry/adaptations remain CC BY-NC-SA 4.0, separately from MIT application code; this public experiment is noncommercial.

## Acceptance and publication

The release was held at the first completion review for deferred graphics disposal and a missing model-download deadline. Both source issues were corrected before publication. Required evidence: autonomous there-and-back while the player stays in Warehouse; player travel independently of duck location; duck visible through destination previews; supported feet, animation, steering and mesh/splat occlusion; blocked arrival/egress and asset failure preserve the tour; bounded packages and stable readiness; shutdown fencing and exactly-once disposal. Existing player travel, boundary, touch and bad-scene regressions must remain green.

Prior public distribution 008be46b5e262a30dc820bbb189e2d31b59b0e95 is the rollback baseline. No publication occurs until the completion gate reviews the scoped evidence.


## Completion review and evidence

The duck uses a gameplay navigation speed of 0.22 world units per second, with the measured original gait retimed to displacement and bounded turn-in-place steering. This is an animated game companion, not a claim about physical robot speed.

Actual public-world CPU sampling confirmed Warehouse → Sunset at 21.13 simulated seconds, return at 47.13 and completed exit at 49.57. Every sampled capsule remained supported by the actual collision data; original splat/physics bytes were unchanged. Physical browser evidence independently confirmed the autonomous round trip in roughly 50 wall-clock seconds while the player's position stayed exactly at spawn. The articulated duck was visible in Warehouse and on grass through the live Sunset doorway. An independent trusted-input player round trip, jump/landing and reviewed boundary check passed with the duck running. Comprehensive foreground mesh/Gaussian occlusion challenge remains unqualified; the screenshots establish the observed portal rendering only.

Corrupt installed model bytes were rejected while Warehouse keyboard movement remained usable. A real HTTP stalled-body regression confirms optional installation stops at a bounded deadline. The model body is capped at the pinned decoded size before allocation/parsing and checked for exact size and SHA-256; compressed transfer Content-Length is not mistaken for decoded size.

Shutdown immediately fences simulation and hides its representations. Visual geometry/materials remain owned by their world packages until preparation leases settle. The real visual/cache/Host integration regression confirms zero resource disposal during a delayed preparation, deferred retirement of inactive graphs, retention of an active graph, and exactly-once disposal on later Host retirement. Replacement and late-load callbacks cannot revive or reset another session.

Two browser attempts were aborted by the GPU guard when a separate protected compute workload changed its memory allocation. These are environment interruptions, not successful tests or product failures. The protected job was left running. A subsequent seven-sample observation found stable memory and 3,030 MiB free, with 99–100 percent GPU use; this does not establish performance isolation or spare compute capacity. Later qualifications keep both the relative memory cap and actual minimum free-memory guard.

Final focused checks passed 34 duck/model/navigation cases, 99 public-world cases, 150 portal regressions, 21 input cases, six security cases, default tests and three package-closure checks. Public model metadata and added documentation have no private path or credential-pattern hits. Only the realtime model and five public notices/metadata files are distributed; full source GLB and private reconstruction evidence are excluded.

Touch/hash qualification, final publication approval and exact source/distribution SHAs are recorded in the final acceptance manifest. Touch emulation is separate from physical mobile GPU qualification. Player-eye consent development remains on a separate branch and is not part of this duck release.


The final sequential v6 browser batch passed five touch/default-startup checks and two corrupt-Sunset checks with no application errors. The default URL selected published WebGL2, both duck representations were ready and the local actor was active. Touch evidence uses browser emulation; physical mobile remains unqualified. The final package entry is `main-B3nlH31k.js`; the acceptance manifest records the actual entry and hash. No protected compute process was stopped, and all owned test browsers were closed.
