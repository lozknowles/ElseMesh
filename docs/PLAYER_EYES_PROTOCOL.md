# Consented player-eye viewing

God view renders an approximate game-avatar eye camera. It is not a device-camera stream. Geometry and ordinary avatar presence already admitted by world VIEW remain ordinary game data; explicit consent governs the additional eye state and this viewing feature, and does not promise secrecy of previously delivered geometry or pixels.

## Authority and sharing

Sharing defaults off. Only the authenticated active target session can modify its sharing record. Recipients are stable authenticated node identities, not display labels. Ordinary avatar presence retains players and body state but excludes optional eye pitch and eye-session fields. Eligible recipients receive a separate owner-signed eye roster; selection never falls back to ordinary presence.

The owner stores revisioned per-target/recipient permission in its ledger. A grant binds target node, target eye-session hash and generation, world, content digest, authority epoch, recipient node and recipient VIEW session, revision, grant ID and issue/expiry times. The consent lease is at most 60 seconds; accepted gaze must be at most three seconds old. Existing world VIEW authorization is independently required. Consent does not confer ENTER, new scene-loading rights or flight privileges.

`readEyeSharing()` returns current context, authenticated recipient choices, shares and revision. `setEyeSharing(recipientNodeId, allowed, {expectedRevision, leaseMs})` modifies the current target's own sharing; `setEyeSharing(null, false)` atomically revokes all recipients. Replay and stale revisions are rejected. Choosing Stop sharing invalidates pending updates as well as existing grants.

`eyeRoster(worldId)` refreshes an owner-signed roster asynchronously. `currentEyeRoster(worldId)` returns a synchronous clone of the verified, still-current cache. `isEyeConsentValid(row)` gates every selection and draw; `subscribeEyeConsent(callback)` announces invalidation after clearing the cache. The signed roster envelope is request-ID-bound, type `eyes-roster`, and expires after three seconds. Signed grant tokens use protocol `elsemesh.eye-sharing/1` and type `eye-grant`; settings and update replies are `eyes-sharing` and `eyes-sharing-updated`. Grant tokens remain stable through polling until permission, context or lease changes.

## Revocation and world changes

Owner-signed `eye-revoked` and `eye-sharing-changed` messages are revision-monotonic. The recipient clears authoritative cached rows before invoking callbacks. View selection and preparation fence the exact grant revision, recipient, session, owner, scene, content and lease. Revocation synchronously exits the selected view and clears retained eye render targets/framebuffer before any further admitted draw. This means immediately after processing an authenticated revoke, not zero network latency or recall of previously delivered pixels.

Disconnect, lost/expired VIEW, explicit unsubscribe, target departure, owner restart and session/content/authority changes fail closed. Owner polling refreshes subscribed worlds every 250 milliseconds; short signed envelopes bound a lost push. Conservative owner-clock and round-trip timing avoid extending leases locally. Late roster responses or preparation callbacks cannot resurrect a revoked target.

Portal handoff does not copy consent. Sharing ends at the source world/session boundary. The target must explicitly share again after arrival; an observer may then select the target across a portal only with fresh destination consent and current destination VIEW access. The observer retains its own body, world, membership and physical gravity while using a neutral independent camera.

Static single-player mode shows an empty roster without creating an identity or peer connection. The current viewing renderer supports WebGL; native rendering retains its existing behavior and presents an explicit availability message rather than pretending to share a view.


## VIEW receipts and application denials

Owner subscription additionally returns a signed `viewReceipt` using protocol `elsemesh.owner-view-session/1`, type `view-session`. It binds the request ID, world/content/authority epoch, player identity, SHA-256 VIEW-session digest, grant ID and lease. The transport stores this verified session with a renewal fence. A consent token's recipient VIEW-session digest must equal that actual current verified session during both roster admission and each draw. Renewal, replacement or loss fences pending responses and previously accepted tokens.

Authenticated application denial uses a contextual owner-signed `eyes-denied` response with code `EYE_CONSENT_DENIED`. It clears affected eye data without incorrectly marking an otherwise usable remote world offline. Invalid/unsigned replies, VIEW/authority failures and RPC connection failures retain the normal fail-closed authority handling. An explicit Stop sharing increments the durable revision even when there are no current recipients, fencing an earlier delayed grant request.

The generic coordinator path does not implement this consent protocol and publishes no optional eye pitch or eye-session state. Owner-only gaze publication and three-peer generic presence tests guard that boundary while preserving ordinary avatars, accepted self receipts and portal handoff.
