# Cooperative discovery nodes

ElseMesh has a runnable native discovery service at
`tools/networking/discovery-node.mjs`. Independent helpers exchange signed contact
records over libp2p TCP, Noise and Yamux. There is no built-in public directory,
vendor account, overlay SDK, hard-coded bootstrap host or operator-specific address.

This implements discovery for a small, explicitly configured group of peers.
It does not yet wire browser portal travel to these records, run a world server,
punch through NAT, provide a public relay, or integrate native `libzt`. A route
advertisement is a hint, not evidence that the advertised service is online.

## Identity and authority

Each node owns a different Ed25519 keypair. Its ElseMesh NodeID is the existing
SHA-256 fingerprint of its public key. The same key derives its libp2p PeerID;
Noise proves possession of that key on the discovery connection. These are two
encodings of one node identity, not an IP address or a ZeroTier identity. Keep
private keys private and do not copy one keypair onto several independent nodes.

Nodes sign only their own `elsemesh.node-contact/1` records. A helper forwards the
original signed bytes; it cannot change another node's routes, extend its lease,
assign world ownership or authorise a player. A record contains the node/peer
identities, monotonic revision, issue/expiry times and scoped endpoints. Empty
endpoints explicitly withdraw the routes. Records expire within at most 24 hours;
the command renews its own ten-minute lease while it runs.

`resolveRegionContact()` binds a caller-pinned world ID, region ID, owner NodeID
and signed manifest hash to the existing owner-signed region. A separate serving
node also needs the existing owner-signed, version-bound `AUTHORITY` delegation.
`REPLICA` alone is insufficient. The resolver then retrieves that serving node's
contact. Existing world IDs and signed objects are preserved; this is not a
migration to the proposed genesis-derived WorldID format. Updating a region
version requires the caller to obtain and explicitly trust its new manifest hash.
Changing a host address requires only a new contact revision.

The result is route information only. Existing portal allowlists, destination
admission, editing rights and owner checks remain separate. Callers must still
authenticate the destination service before using a returned endpoint.

## Start a node

Install the pinned packages with `npm ci` (Node 24 recommended). Keep each state
directory outside the repository and web roots. The examples below use generic
Linux paths; on Windows use a private directory owned by your account instead.

First create each node's independent identity:

```sh
node tools/networking/discovery-node.mjs identity --state-dir /var/lib/elsemesh/node-a
node tools/networking/discovery-node.mjs identity --state-dir /var/lib/elsemesh/node-b
```

Only public NodeID and PeerID values are printed. Put the other participants'
PeerIDs in each helper's `allowedPeers`. A configured bootstrap peer is also
admitted automatically. Pin visitor/publisher PeerIDs at the helpers before they
query or publish; no automatic open registration is enabled.

Create a private configuration file, replacing the example address and PeerIDs:

```json
{
  "listen": ["/ip4/0.0.0.0/tcp/42901"],
  "bootstrap": ["/ip4/203.0.113.10/tcp/42901/p2p/REPLACE_WITH_HELPER_PEER_ID"],
  "allowedPeers": ["REPLACE_WITH_VISITOR_OR_PUBLISHER_PEER_ID"],
  "contactNodeIds": [],
  "allowedScopes": ["public"],
  "advertise": [],
  "syncIntervalMs": 15000
}
```

Use a second independently operated helper in `bootstrap` to avoid relying on
one operator. Helpers may bootstrap each other; the exchange carries fresh cached
records in both directions. A node does not need to connect to every participant.
The first helper can start with no bootstrap entries. An empty `advertise` array
is useful for helpers whose addresses are supplied directly in bootstrap config.

```sh
node tools/networking/discovery-node.mjs serve --state-dir /var/lib/elsemesh/node-a --config /var/lib/elsemesh/node-a/config.json
```

To advertise a world service, use endpoint objects such as:

```json
{"transport":"wss","address":"wss://world.example.invalid/ws","scope":"public"}
```

The accepted endpoint hints are `wss`, `libp2p` and the existing development
`tcp-udp` transport. Accepting a hint does not implement or qualify that transport
as a game protocol. A libp2p endpoint must end in this node's `/p2p/<PeerID>`.
Endpoints contain no passwords, admission tokens or controller credentials.

Lookup from a visitor whose PeerID the helpers admit:

```sh
node tools/networking/discovery-node.mjs lookup --state-dir /var/lib/elsemesh/visitor --config /var/lib/elsemesh/visitor/config.json --node elsemesh-node:REPLACE_WITH_DESTINATION_FINGERPRINT
```

The result is `FOUND_ROUTE_HINTS`, `WITHDRAWN` or `UNRESOLVED`. It includes each
helper exchange outcome. Lookup tries all configured helpers within bounded
timeouts and preserves a still-fresh cached record when helpers are down. With
the library, `importContact()` also accepts a verified record from an invitation;
no helper is required while that record remains fresh. A brand-new node always
needs some initial contact: an invitation, cache or at least one reachable seed.

By default the command omits endpoint addresses from its output. Add
`--show-routes` to `serve` or `lookup` when you explicitly need the full signed
record and bound addresses. Treat that output as private when using local or
overlay routes; do not send it to public logs.

## Bounds and persistence

The initial service deliberately limits the cohort: at most eight bootstrap
addresses, 32 admitted libp2p peers, 32 retained node records, 16 KiB per signed
record and 1 MiB per exchange. Each connection permits two discovery streams;
the service processes at most eight at once and 30 requests per peer per minute.
The default exchange timeout is three seconds. Larger networks need a separately
designed retrieval/pagination and admission policy before increasing these bounds.

The cache retains the last signed revision even after expiry. It rejects
rollback, same-revision conflicts and overflow rather than evicting rollback
guards. State is written before acknowledging accepted records. The CLI uses
atomic file replacement and an exclusive per-directory lock; persistence errors
stop discovery. Protect and back up both `identity.json` and `contacts.json`.
Deleting or rolling back the whole state directory loses those local guards;
remote peers can still reject an old revision. This is not consensus or instant
global revocation. After an unclean process death, inspect the PID in `active.lock`
and verify that process is gone before manually removing only that stale lock.

Remote helpers cannot add arbitrary subjects to the cache. Locally admitted
subjects are this node, the identities of its configured peers, explicit
`contactNodeIds`, locally requested lookup IDs, and explicitly imported invitation
records. The total admission set is capped at 32, including this node. For a
world served through a helper that does not itself admit the world's peer, put
its NodeID in that helper's `contactNodeIds`. A compromised helper therefore
cannot fill permanent slots with unrelated identities. Adding a contact subject
does not grant it world permissions or permission to connect as a discovery peer.

Bootstrap addresses currently require a literal IPv4/IPv6 address, TCP port and
pinned PeerID. DNS bootstrap, DHT, mDNS, automatic peerstore dialing and arbitrary
endpoint probing are not enabled. Learned contact endpoints are never dialed by
this service. Configuration changes require restart. A moved helper needs an
updated seed address unless another configured helper remains reachable.

## Optional underlays and private routes

Ordinary routed IP works directly. An operator may instead configure reachable
IP addresses supplied by Tailscale, ZeroTier, WireGuard or another network. Those
providers control their own membership; discovery does not install or enrol them.
No provider is required and none grants world permissions.

Public scope rejects private/local address literals. A private route requires an
explicit scope such as `overlay:community` in both its endpoint and each recipient's
`allowedScopes`. All admitted peers in that configured cohort receive all admitted
cached records, so only include peers authorised to see those scopes. Do not mix
private records into a public helper configuration. DNS in an endpoint is syntax
checked only; it is never resolved here. A future connector must independently
check resolved addresses, credentials, redirects and service identity before
dialing. A signature alone is not permission to probe local services.

Native `libzt` remains a separate packaging and transport experiment. A ZeroTier
node ID is not a routable IP, and ZeroTier network membership remains separate
from ElseMesh identity and discovery.

## Verification and remaining work

Run `npm run test:discovery`, `npm run test:network`, `npm run test:security`,
`npm run test:publication` and `npm run build`.

The discovery tests use real independent loopback libp2p nodes. They cover
helper-to-helper forwarding, helper loss, changed routes after restart, cached
invitation resolution, key binding, forged/stale records, persistence failure,
malformed/oversized traffic, timeout fallback and owner/delegation boundaries.
Loopback evidence does not qualify public Internet reachability, restrictive NAT,
overlay providers, geographically distributed hosts or browser travel. Deploying
helpers on public hosts and adding the public gateway/relay/browser paths remain
separate acceptance work.

The service follows the pinned libp2p v3
[stream API](https://github.com/libp2p/js-libp2p/blob/main/doc/migrations/v2.0.0-v3.0.0.md)
and [TCP/Noise/Yamux configuration](https://github.com/libp2p/js-libp2p/blob/main/doc/GETTING_STARTED.md).
