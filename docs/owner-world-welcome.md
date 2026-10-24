# Private first visit welcome authority

Worlds may author `welcome: {schema: "elsemesh.world-welcome/1", text: "Welcome", audio: true}`. The server accepts only these fields, nonempty literal text of at most 2000 characters, and a boolean audio preference. It does not accept audio URLs or executable markup. The client renders literal text and may offer installed speech playback while respecting local mute; server tests do not prove audible playback.

The browser requests a welcome only after a committed destination is visibly active. This visibility is a client acceptance gate: the authority can verify ACTIVE accepted membership, current VIEW/ENTER permission and the exact session/generation, but cannot observe rendered pixels. Frozen, absent and failed transfer membership cannot claim a welcome.

## Signed protocol

Both operations use existing signed browser envelopes and are processed before generic VIEW exceptions:

- `world-welcome-read`: worldId, contentDigest, authorityEpoch, sessionId, generation, welcomeHash, welcomeRequestId and presentationId.
- `world-welcome-ack`: the same context plus claimId.

welcomeHash is `sha256:` followed by the SHA-256 of canonical JSON of the exact authored welcome object. Absent welcome uses null. Text is not normalized before hashing. presentationId is a unique browser activation ID retained across retries.

Authority-signed `elsemesh.world-welcome-result/1` results bind operation, requestId, welcomeRequestId, authenticated player ID/node, world/content, authority epoch, session/generation, welcome hash and issuedAt/expiresAt (three seconds maximum). Ordinary denial returns allowed:false and Access restricted. Service failure returns a signed Welcome unavailable result without private error details; clients request nonfatal transport handling and do not freeze the owner for a welcome failure.

A fresh read returns `{seen:false, configured:true, claimId, claimExpiresAt, welcome}`. A concurrent activation receives only `{seen:false, configured:true, pending:true, retryAt}`; it receives no welcome payload until the prior claim expires. The same activation/session may retry and recover its live claim. Claims expire after at most ten seconds. Acknowledgement follows visible text presentation and returns `{seen:true, configured:true}`. The same claim acknowledgement is idempotent after acknowledgement has persisted. Unconfigured worlds return `{seen:false, configured:false}`.

## Private durable semantics

Claim and seen records persist in the existing private SQLite ledger transaction. The key is the pair of stable authored worldId and authenticated playerId. It includes no URL, content digest, text, revision, browser tab or presentation ID. Responses expose only the requesting player's status and current welcome; no visit list is returned.

A seen record survives reload, restart and return arrival. Recreating the welcome service with edited welcome text and the same stable world identity retains seen status. An expired or unacknowledged claim may be retried: a crash between visible text presentation and acknowledgement can therefore cause another presentation. Exactly once visual or audible presentation cannot be guaranteed across that crash boundary.

The existing authority ledger admission binding remains strict. This slice does not introduce automatic migration to a newly published content manifest or reprovisioned ledger. Full revision admission requires a separate explicit migration preserving private first visit records; the tests prove same-ledger welcome edit semantics, not automatic new-content ledger startup.

The focused test suite covers authored validation, request signature/context binding, bounded claims, concurrent activation/expiry, idempotent acknowledgement, SQLite reopen, edited same-world text, wrong actor/session/generation/authority/world/content/hash, frozen or absent membership, generic VIEW/ENTER denial, private response boundaries and typed storage failure.
