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
