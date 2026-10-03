# Provider-neutral, decentralised networking plan

Design revision: 2026-10-03. Baseline implementation: `9671381`.

Implementation update: [cooperative discovery nodes](discovery-nodes.md) now
provide signed self-owned contact records, persisted revision guards, an explicit
multi-helper libp2p exchange and a resolver bound to an owner-pinned region
manifest. This is a bounded discovery cohort, not a DHT, browser gateway, relay
or world-server implementation. The remaining architecture below stays a plan.
This is a proposed architecture and acceptance plan, not a claim that the proposed
adapters or federated browser travel already work. It supersedes any plan that
requires choosing a ZeroTier membership arrangement. No networking provider is
mandatory; the baseline is ordinary Internet/LAN connectivity and browser WSS.

## 1. Three independent layers

| Layer | Owns | Must not own |
| --- | --- | --- |
| ElseMesh federation | Stable WorldID/RegionID/PortalID, ownership and authority, discovery-record verification, portal destinations, player authentication, destination admission, versioned application messages and rules | Overlay membership, IP allocation, provider tokens, socket-specific game rules |
| Network connectivity | Scoped reachable address candidates over public Internet, LAN, optional Tailscale/ZeroTier or another provider; configured ingress and relay paths | World identity, permission to enter, inventory or gameplay protocol translation |
| Game transport | Browser WebSocket/WebRTC connections; later suitable native QUIC/UDP-library implementations; encryption, framing, delivery capabilities, bounded queues and connection health | World ownership, discovery policy, automatic admission or implicit compatibility between different games |

The dependency direction is game/portal -> federation connection coordinator ->
connectivity candidates + transport implementation. Provider adapters run in the
host/deployment layer, outside world and portal code. A browser need not contain
provider SDKs. An OS-managed overlay can simply expose an IP route; an optional
adapter can report/configure that route without becoming the game protocol.

Smallest useful delivery: **two independently owned WSS world services, signed
records exchanged by invitation or static HTTPS file, destination-controlled
admission, then an explicit browser portal join**. Reuse the existing server and
schemas where appropriate. Do not begin with a DHT, global controller, consensus
system, arbitrary protocol bridge or seamless state migration.

## 2. What exists, and what is actually verified

| Existing component | Reusable part | Limit / evidence status |
| --- | --- | --- |
| [`network/identity.mjs`](../../network/identity.mjs) | Ed25519 NodeID fingerprints, canonical signing, asset hashes | Node key change changes NodeID. Does not yet establish durable world ownership independent of hosting keys. |
| [`network/federation.mjs`](../../network/federation.mjs) and fixtures | Versioned region/portal/rule schemas, signed manifests, invitations, authority epochs, handoff validation | Node experimental library; gameplay cave crossing does not invoke remote federation. Current owner binding uses `ownerNodeId`. |
| `PortalGraph`, `endpointFor()` | Address-free portal destinations; resolution outside portal descriptors | Legacy `endpointFor` reads one endpoint from an injected map. The additive `resolveRegionContact` verifies an owner-pinned manifest and signed contact; it does not dial or admit a player. `REPLICA_AVAILABLE` is not proof of an authorised running game authority. |
| [`network/routes.mjs`](../../network/routes.mjs) | Scoped candidates and injected reachability probe, direct/relay ordering | Simulated route tests do not prove NAT traversal, overlay connectivity or a functioning relay. No authenticated negotiation/time budget is supplied by this model. |
| [`network/transport.mjs`](../../network/transport.mjs) | Lifecycle and reliable/transient vocabulary | Contract mixes identity, discovery, advertising and delivery. Split responsibilities incrementally; an interface alone proves no support. |
| [`network/tcp-udp-transport.mjs`](../../network/tcp-udp-transport.mjs) | Real local TCP/UDP test transport, signatures and stale-state rejection | Unencrypted development reference; not a secure public service. No relay; the separate libp2p discovery service does not upgrade this transport. |
| [`OnlineRoomTransport`](../../src/network/OnlineRoomTransport.js), [`online-server`](../../tools/networking/online-server.mjs), [`RoomSecurity`](../../tools/networking/RoomSecurity.mjs) | Browser-native WebSocket, same-origin `/ws`, invitation/host bearer credentials in first frame, bounds, sequence checks, role/capacity checks, proxy deployment | Independent of overlay providers. Current browser path cannot select an arbitrary advertised destination. Origin checks are not player authentication; room-supplied NodeID is not proof of key possession. |
| [`BrowserIdentity`](../../src/network/BrowserIdentity.js) | Local WebCrypto key storage | Keys are not used for a federation challenge during the existing room join. Role identities are not yet persistent cross-world player accounts. |
| Room `ItemEconomy` and `HelicopterLease` | In-memory room inventory/economy/trading and vehicle ownership | Useful local authority examples, not durable cross-world inventory, accounts or ownership transfer. Some older room documentation understates these implemented features. |
| Local `BroadcastChannel` demo and [`game-bridge`](../../tools/networking/game-bridge.mjs) | Local testing and a localhost WS bridge to the reference transport | Neither establishes Internet reachability nor a production federation gateway. |
| [`libp2p-quic/main.go`](../../tools/networking/libp2p-quic/main.go) | Native `/elsemesh/qualify/1.0.0` probe | Qualification program, not integrated browser/game QUIC support. |

Verification performed for this revision: 25/25 tests passed with
`node --test test/network-foundation.mjs test/federation.mjs test/online-room.mjs test/online-security.mjs test/ten-player-room.mjs`.
These cover local sockets, protocol validation, room security and modelled route
changes. `RoomTestSocket.mjs` converts legacy fixture URLs to first-frame joins;
credentials are not sent in HTTP queries. No Tailscale, ZeroTier, external browser,
WebRTC, native game transport or cross-provider interoperability trial was run.
The historical private-machine handoff noted in the federation document is a
reported protocol probe, not newly verified browser travel or provider coverage.

## 3. Federation: identity, discovery and admission

### Stable identity and trust

Keep WorldID, RegionID, PortalID, player identity, operational NodeID and session
identity distinct. Portals store the destination WorldID/RegionID, never an IP,
provider name, room code or transient URL. Preserve the existing region/portal
concepts; reconcile the older `elsemesh:*` sector vocabulary with the newer
`elsemesh-world:*`, `elsemesh-region:*`, `player:*` vocabulary explicitly in v2
migration fixtures. Do not silently reinterpret old signed objects.

Propose an immutable canonical world genesis record containing the owner root
public key and a fresh, cryptographically random per-world nonce. Its SHA-256 hash
determines the new `elsemesh-world:<genesisHash>` ID, so one owner can create
multiple distinct worlds. Current fixture aliases require an
explicit trusted legacy-to-genesis mapping. A pinned genesis record authorises
current owner signing keys; owner-signed delegations authorise serving NodeIDs,
regions, authority epochs, endpoint publication scope and expiry. WorldID remains
the genesis ID when the server, domain, address, overlay or operational key changes.
The immutable genesis identifier is not the current host's NodeID.

Planned owner-key rotation requires an authorised signed succession chain and
monotonic ownership epoch. Revocation invalidates delegated hosts and grants.
Persist the highest accepted epoch/revision; cache expiry bounds stale knowledge,
but cannot promise instant revocation while offline. Phase-one lost/compromised
root-key recovery is explicit out-of-band trust re-pinning with a visible warning,
not an unrecognised new key self-claiming the world. Automatic recovery is deferred.

### Signed endpoint records, not a compulsory directory

Propose `elsemesh.world-contact/1`, separate from immutable content manifests:

```text
worldId, regionId, servingNodeId, authorityEpoch,
recordRevision, issuedAt, expiresAt, owner/delegation proof,
endpoints[] = {
  id, uri, transport, networkScope, reachabilityHint,
  applicationProtocols[], requiredCapabilities[], optionalCapabilities[],
  deliveryProfiles[], ingressIdentity, priority
}, signer, signature
```

All fields are covered by the signature. Bound sizes, endpoint counts, time skew
and lease durations; reject malformed URIs, unknown mandatory fields/capabilities,
expired or rolled-back records. Specify canonical encoding, signature domain
separation and identical Node/browser test vectors before implementing v1. The
existing signing helper is a starting point, not a substitute for a wire standard.
An operational signer must have explicit owner delegation to advertise this region.
Private candidate scopes prevent identical private IPs at different sites from
being merged. Share private routes only with authorised discovery recipients.

Apply a separate fetch/probe policy: permitted schemes, hosts, network scopes,
byte/time limits and a bounded redirect count. Revalidate each redirect and DNS
resolution; never forward admission credentials to a different origin. Server
resolvers must block unexpected loopback, link-local/metadata and private targets,
including DNS rebinding, unless an operator explicitly configures the intended
LAN/overlay scope. A signed advertisement is not permission to scan local services.

An invitation contains the expected world identity/trust fingerprint and either a
fresh signed record or one or more discovery locations. Bootstrap may also use a
local address book, a configured static HTTPS manifest, or any independently
self-hosted directory. Directory responses are untrusted until signatures are
verified. A directory locates an owner; it cannot create ownership or admission.
No central directory, overlay controller or vendor login is required by ElseMesh.
An optional overlay may still require its own control plane.

With a fresh trusted direct record and a reachable world, discovery services can
all be unavailable and connection must still work. When every known address and
record source disappears, automatic rediscovery is impossible: a new invitation,
updated seed or independently reachable directory is needed. Never claim that a
stable identifier alone supplies a reachable route. DHT and LAN discovery are
optional future retrieval mechanisms, not phase-one prerequisites.

### Connection and owner-authoritative admission

1. Resolve and verify the expected world's contact/delegation record.
2. Intersect exact application protocol versions, mandatory capabilities and
   delivery profiles with the client's implementations. A version range cannot
   imply a translator exists. Reject incompatibility before gameplay.
3. Filter scoped candidates by client route availability, security policy and
   browser constraints. Probe a bounded number with cancellation and deadlines
   (initial target: 3 seconds per candidate, 10 seconds total, configurable).
4. Establish the chosen secure transport and authenticate the serving authority
   or explicitly owner-delegated ingress. Bind a fresh signed challenge to world,
   region, authority epoch, both nonces, connection/session and requested scope.
   TLS hostname validation alone does not prove WorldID ownership.
5. The destination evaluates its own admission policy and returns a short-lived,
   audience/world/region/player/session-bound grant and authoritative spawn/rules,
   or denies admission. Phase one allows destination-local ephemeral guest keys
   where the owner permits guests; persistent player identity linking is separate.
6. Only after destination readiness and explicit acceptance does the client leave
   the source. On denial, incompatibility, cancellation or failed readiness, keep
   the visitor at the source where possible; do not leave a half-loaded avatar.

Network membership, a signed source handoff, agreement between portal owners,
room invitation and destination player admission are different permissions.
**A reachable node may deny entry even to an authorised overlay member.** Validate
and consume admission grants at the destination, not merely in the source UI.
`acceptPortalHandoff()` presently validates source signature/epoch, portal fields,
rules and replay; it does not enforce destination admission or the portal's
player allowlist itself. Add a destination policy gate around it. A replica can
serve content, but may admit gameplay only with current authority delegation and
readiness. Nonces/grant consumption must survive relevant reconnect/restart replay
windows; the bounded in-memory `ReplayGuard` alone is insufficient for that claim.

Return distinct states: UNRESOLVED, INCOMPATIBLE, UNREACHABLE, AUTHENTICATION_FAILED,
ACCESS_DENIED, READY, DISCONNECTED. A denial must not trigger a less restrictive
route or protocol downgrade. Trying another endpoint of the same authenticated
world does not relax its policy.

## 4. Connectivity: name the real path

| Deployment | Actual reachable path | Limitation |
| --- | --- | --- |
| Public world, ordinary browser | Browser -> public HTTPS/WSS ingress -> world service | Valid TLS, firewall and WS upgrade needed; no VPN installation. GitHub Pages can host assets, not the socket service. |
| Same LAN | Browser -> LAN-reachable secure endpoint -> world | LAN route/DNS/TLS and browser local-network policy must permit it; another site's identical private address is unrelated. |
| Tailscale-connected client | Client OS tailnet route -> authorised world WSS endpoint | Network ACL/member approval plus destination admission; no ElseMesh provider login requirement. |
| ZeroTier-connected client | Client OS ZeroTier route -> authorised world WSS endpoint | Same separation; ZeroTier network authorization is not world authorization. |
| Browser outside either overlay | Browser -> public world ingress/gateway -> explicitly routed private world | Requires public ingress or a usable peer/relay path; a private advertisement alone is unusable. |
| Different private networks | Each side -> mutually reachable configured relay, or client -> public gateway -> destination private route | Gateway needs an authorised destination route; alternatively configure shared connectivity. No automatic Tailscale-to-ZeroTier bridge. |
| No inbound route / CGNAT | World opens authenticated outbound tunnel to configured public ingress; visitor uses that ingress | Tunnel/relay must actually exist and be reachable by both sides. If outbound traffic is also blocked, report UNREACHABLE. |

For phase one use an **owner-trusted ingress**, deployed with the world or an
explicit authenticated backend route. It may terminate TLS and see traffic; it
must be authorised for that world and must not invent permission or impersonate an
unrelated world. Credentials are destination-scoped and never forwarded to other
worlds. A WS-to-native gateway is also a trust and transport termination boundary.
An untrusted opaque relay with end-to-end application encryption/authentication is
a separate later profile, not an automatic property of WSS to a relay.

Discovery, WSS ingress, signalling, TURN and any application relay must have
configurable URLs, credentials, limits and self-hosted deployment options. No
hard-coded public relay is necessary. Operators can run independent services;
one world may itself use a central authority server without centralising the
federation. Report the application path and any observed overlay path separately;
if direct-versus-relayed underlay information is unavailable, report unknown.

Tailscale Serve is private-tailnet exposure; Funnel is an optional public ingress,
not an ElseMesh dependency ([Tailscale documentation](https://tailscale.com/docs/features/tailscale-funnel)).
ZeroTier's controller manages network membership, not game access
([ZeroTier documentation](https://docs.zerotier.com/controller/)).

## 5. Game transports and protocol compatibility

Propose `ConnectivityProvider.candidates(context)` for scoped routes and optional
observations, `DiscoverySource.lookup(worldId)` for record retrieval, and
`GameTransport.connect(endpoint, negotiatedProfile)` for authenticated connection
setup and delivery. Federation supplies identity/policy; adapters cannot mint it.
Keep provider dependencies/configuration in host-side adapters/deployment packages,
never in region schemas, `PortalGraph` or gameplay. Refactor the existing broad
`NetworkTransport` behind compatibility wrappers rather than rewrite all modes.

| Profile | Required behaviour | Transport mapping |
| --- | --- | --- |
| Control/events | Reliable ordered delivery within a defined stream; explicit request IDs, ack/error, idempotency, deadlines, bounded messages and queues | WSS first; reliable ordered WebRTC channel later; authenticated native streams later. Connection loss does not imply a command succeeded. |
| Latest state | Entity/session/authority-epoch sequence, stale rejection, bounded replaceable outgoing snapshots, resync after reconnect | WSS can coalesce unsent snapshots but cannot retract bytes already queued. WebRTC unordered partial reliability or QUIC datagrams later when negotiated. |
| Assets | Hash validation, independent size/concurrency limits, resumable retrieval where implemented | HTTPS initially; avoid bulk assets blocking movement/control on one socket. |

Set explicit limits in the negotiated profile (message bytes, buffered bytes,
state frequency, queue age and disconnect/resync policy). Measure RTT, jitter,
loss, snapshot age and queue growth; choose a profile against a declared latency
budget, not a marketing label. Missing metrics remain unknown. A WSS profile is
acceptable for the first shared-world milestone but has TCP head-of-line blocking;
it does not provide true unreliable delivery or a hard low-latency guarantee.
See [WebSocket RFC6455](https://www.rfc-editor.org/rfc/rfc6455).

WebRTC needs compatible peers, reachable signalling, ICE candidate exchange and
possibly TURN. STUN does not relay gameplay and TURN does not make an inaccessible
world magically participate; the world/peer must reach and use that service.
Signalling must bind the negotiated DTLS identity to the authenticated world.
Ordered/reliable and unordered/partial-reliability channels are distinct profiles
([WebRTC specification](https://www.w3.org/TR/webrtc/),
[TURN RFC8656](https://www.rfc-editor.org/rfc/rfc8656)).

Ordinary browsers cannot open arbitrary native UDP or native QUIC-library sockets.
Native QUIC/GameNetworkingSockets/other UDP libraries remain optional future
implementations with encryption, congestion control, MTU/fragmentation handling,
ordering and replay tests. QUIC datagrams and streams have different delivery
semantics ([RFC9221](https://www.rfc-editor.org/rfc/rfc9221)). WebTransport, if later
considered, needs its own browser/server capability profile; it is not arbitrary
native QUIC interoperability.

Carrying identical ElseMesh messages over another transport is adaptation.
Connecting a different game protocol requires an explicit, versioned translator
with defined mappings for identity, authority, rules, units, messages and state;
reject unsupported semantics. A generic UDP tunnel or common overlay is not such
a translator. Neither channel adapters nor a hello exchange alone prove gameplay
interoperability.

## 6. Portal travel is initially a destination join

The first portal milestone is visibly leaving one world and joining another at
its approved spawn, with a new destination session and optional loading screen.
It is not seamless simulation or account migration. Keep existing solo/local
caves working. Do not execute scripts received from another world.

Separate future federation protocols are needed for portable avatar assets,
inventory ownership/provenance and destination acceptance, durable import/export
receipts and anti-duplication, script sandboxing, session continuity, transactional
state transfer, single-presence guarantees and authoritative simulation handover.
The existing handoff's `inventoryHash` and session fields do not implement these.
Room-scoped trading is reusable policy experience, not evidence of cross-owner
asset transfer. AI/generated content remains a proposal subject to owner approval,
asset validation and bounded rules; it does not acquire machine permissions.

## 7. Phases and acceptance gates

No later phase is implied by an adapter stub. Record commit, OS/browser/provider
versions, topology, endpoint class, actual direct/relay path, logs, measured limits
and failures for every interoperability result. Keep secrets/private routes out
of public evidence. All rows below are **proposed acceptance tests**, except the
25 existing local tests explicitly reported above.

| Phase | Smallest deliverable | Acceptance before promotion |
| --- | --- | --- |
| 1: Records and boundaries | Versioned world trust/delegation/contact records; manual/static discovery; separate narrow interfaces | Cross-runtime signing vectors; two worlds under one owner have distinct IDs and retain both after authorised owner-key rotation; reject forged/expired/rollback/oversized records, wrong authority and unknown required versions; scoped duplicate IPs; no provider imports in core; explicit legacy schema mapping. |
| 2: No-overlay WSS federation | Two services with separate owners; destination challenge/policy; configurable endpoints and origins | Tests A, B, F, H1, I below with directories disabled. Public TLS/browser trial required before claiming browser federation. Preserve room mode and first-frame credential protections. |
| 3: Browser portal join | Minimal independently hosted destination scene and return portal, destination rules, source recovery | Real browser travel both directions; F/G/J; no inventory/script migration; reconnect authoritative resync and no stuck loading. Source/destination remain independently controlled. |
| 4: Optional connectivity | Tailscale and ZeroTier route adapters or documented OS routes; self-hosted ingress/relay | C/D/E/G/H2/K executed on real separate hosts/networks; record each verified topology separately, not a blanket provider-support claim. |
| 5: Additional transports | WebRTC then a measured useful native profile | L/M, congestion/queue tests and observed latency benefit. No native browser UDP promise; fallback only with compatible, authorised semantics. |

| Test | Setup and required result |
| --- | --- |
| A — no overlay | Disable/remove all overlay dependencies. Two independently owned world services exchange advertised versioned messages over WSS, with distinct credentials. Verify direct invite/static-record discovery, allow and deny, reconnect, and unchanged solo play. |
| B — ordinary browser | Supported desktop and phone browsers on an external network with no VPN; valid public WSS ingress. Authenticate, enter, see movement and reconnect. A GitHub Pages client needs explicit approved cross-origin endpoints: permitted server Origin, browser connect policy and CORS for HTTP record/asset fetches. Never replace the current exact-origin guard with wildcard access. |
| C — LAN | Two hosts on the same LAN, no overlay/controller/Internet directory. Trusted local record and browser-compatible secure endpoint work. A private endpoint from an unrelated LAN fails; record browser local-network permission/TLS restrictions rather than disabling protections. |
| D — optional Tailscale | Two authorised OS members with permitted network ACLs use the same ElseMesh application profile. No portal changes/provider API calls in core. Nonmember cannot use the private endpoint; can use a separately authorised public ingress if configured. Repeat destination denial despite membership. |
| E — optional ZeroTier | Repeat D with authorised ZeroTier members and network rules. Revoke network membership: path fails, no world-ID change. World admission remains separate in both providers. |
| F — destination denial/authentication | Valid overlay membership and source-signed handoff, but destination denies guest/player: no spawn or state disclosure. Reject forged, replayed, expired, revoked and wrong-audience grants/challenges. Denial cannot be bypassed using another endpoint. Test restart replay behaviour and identity mismatch. |
| G — unreachable / mixed private networks | Advertise a tailnet-only endpoint to a ZeroTier-only client and an outside browser with no shared route. Bounded UNREACHABLE, no source departure/hang. Then add an explicit authorised public ingress or dual-reachable relay and verify every hop; remove a backend route and fail cleanly again. |
| H1 — WSS host migration, phase 2 | Pin one world and portal, change its public/LAN WSS address, hosting process and delegated operational NodeID using a newer owner-authorised contact record. WorldID/RegionID/PortalID remain identical, without portal retargeting. Old record/key revocation or expiry and rollback rejection work. No overlay is used. |
| H2 — provider migration, phase 4 | Repeat H1 moving from public/LAN to Tailscale and then ZeroTier. From clients with the appropriate reachable path, identity remains identical. Clients lacking the new route report unreachable, not renamed world. Run these provider trials only in phase 4; they are not prerequisites for no-overlay federation. |
| I — decentralised discovery | Disable every directory; use a fresh signed invite/direct record and connect. Test two independent self-hosted directories, tampered responses, stale cache and service outage. If all known bootstrap locations move, show refresh-invitation action rather than invent a route. |
| J — portal interruption | Denial, unsupported rules, load failure, cancellation and connection loss at each join stage preserve/recover source state where possible. Return portal works. No claim of atomic inventory transfer or single presence. Replica-only destination cannot grant active authority. |
| K — self-hosted relay/gateway | Both endpoints behind inbound restrictions establish the documented outbound path through an independently hosted service. Verify ingress delegation, backend authentication, destination admission, bounded resource use, relay outage and truthful path reporting. Trusted gateway visibility is disclosed. |
| L — transport semantics | Under controlled delay/loss/reorder, commands are ordered/idempotent or explicitly fail; latest-state never regresses, queues remain bounded, stale snapshots expire and reconnect resyncs. Compare WSS with WebRTC reliable and partial-reliable modes; mandatory datagram profile rejects WSS instead of falsely claiming equivalence. Exercise ICE direct and forced TURN, including relay failure. |
| M — native and incompatible protocol | Real native endpoints exchange the same versioned ElseMesh semantics via the selected QUIC/UDP library with authenticated identities and measured limits. Browser reaches them only via implemented compatible browser transport/gateway. Unknown game protocol fails explicitly; a translator requires its own mappings and end-to-end tests. |

## 8. Architecture gate record

PLAN gate: architect reviewed the three-layer/WSS-first proposal and required
owner/host key separation, signed fresh endpoint leases, explicit bootstrap,
destination-bound admission, gateway trust, truthful transport semantics and
replica readiness. Decision: incorporate all; defer DHT, untrusted relays,
automatic key recovery and seamless transfer. This document changes the plan;
it adds no runtime provider support or deployment.

COMPLETION gate: architect reviewed the architecture and federation documents.
Findings: avoid WorldID collisions for multiple worlds under one owner key, and
remove optional-provider tests from the no-overlay milestone. Decision: derive
WorldID from per-world genesis including a nonce, add rotation coverage, and split
H1/H2 migration gates. Added fetch/redirect policy following the advisory finding.
All material documentation findings resolved. Existing local tests passed 25/25;
provider interoperability and browser federation remain future acceptance work.
