# Owner peer transport

This transport connects two independently owned world runtimes through an optional,
non-authoritative byte relay. Each runtime keeps its own world files, owner signing
key, authority policy and game membership ledger. The relay contains an ephemeral
network connection registry only. It has no world repository, game policy, game
membership ledger, owner signing key or gameplay decision endpoint.

## Runtime integration

Import `createOwnerPeerRpc` from `network/owner-peer-rpc.mjs`.

```js
const peer = createOwnerPeerRpc({
  identity, // Existing identity.mjs Ed25519 identity; loaded by the owner runtime.
  contacts: [{ nodeId: otherOwnerId, publicKeyPem: otherOwnerPublicKey }],
  relayUrl: 'ws://127.0.0.1:18891',
  handler: async ({ callerNodeId, operation, payload }) =>
    authority.dispatch({ callerNodeId, operation, payload }),
});
await peer.start();
const result = await peer.request(otherOwnerId, 'world.read', request);
await peer.close();
```

The operation name in this example is illustrative: the existing world authority
defines and validates actual operations. Authenticated callerNodeId is transport
evidence, not permission to read a world, join a session, or mutate state. The
receiving owner runtime must apply its own policy on every operation.

Contacts are explicit node IDs and matching Ed25519 public keys. Keep contact
configuration and identity private keys outside the world repository. No contact
discovery, trust-on-first-use, email matching, or automatic membership exists.
At most two configured remote contacts and two relay connections are accepted.

## Route and confidentiality

The current implementation reports `route: 'relayed'`. It does not claim a direct
peer path. The clients connect outbound through their already approved SSH
forwards, with local endpoint `ws://127.0.0.1:18891`. Plain WebSocket is restricted
to loopback; SSH protects the client-to-relay connection. No new tunnel, firewall
rule, port or production listener is established by this library.

Peers also mutually authenticate end to end using their pinned Ed25519 identities.
Signed X25519 ephemeral hello messages bind the protocol version, both node IDs,
both nonces and both ephemeral keys through the signed response and transcript
hash. HKDF-SHA256 derives distinct directional AES-256-GCM keys. The session hash,
sender, recipient, protocol version and strict monotonic counter are authenticated
as additional data. Replayed, reordered, altered and wrong-session ciphertext is
rejected. The relay can see node IDs, handshake public material, packet lengths,
timing and connectivity. It cannot decrypt operation names, request payloads,
responses or world content. It can still drop traffic, interfere with availability,
or deny registration; availability through an untrusted relay is not guaranteed.

The relay challenges each connection with a fresh nonce and verifies a signed
registration proof. This proves network node key possession only. The relay has no
owner key and never determines game authority. Registry entries disappear when
connections close and do not constitute game membership.

## Limits and failures

JSON RPC cleartext is capped at 192 KiB, ciphertext wire frames at 384 KiB, send
backpressure at four wire frames, pending RPCs and active handlers at 32 each.
Read files in chunks no larger than exported `MAX_CHUNK_BYTES` (64 KiB); base64
encoding fits the RPC envelope. A timeout is bounded to 100–60000 ms and defaults
to 10000 ms. Disconnects reject pending calls; a missing peer fails closed.
Handler errors return a generic rejection, excluding private error/path text.
The transport has no application log output. Relay startup logs only its role,
loopback address and route.

World authorization, canonical paths, manifest proof, hash verification,
membership persistence, revocation, game transfer semantics and policy validation
remain receiving-runtime responsibilities. This module does not introduce a
parallel game or portal protocol.

## Relay lifecycle and focused evidence

`createOwnerPeerRelay({host, port, maxPeers})` is exported by
`tools/networking/owner-peer-relay.mjs`; its defaults are loopback port 18891 and
two peers. Direct invocation starts that networking relay and must only be done
by the primary under deployment authority. It generates challenge nonces, not a
persistent identity or owner key.

Focused test command on the HP development checkout:

```sh
node --test test/owner-peer-rpc.mjs
```

Tests use ephemeral loopback listeners only. Coverage includes authenticated
caller propagation, simultaneous initiation, 64 KiB base64 chunk transport,
relay-observed absence of private operation/payload cleartext, wrong contact keys,
invalid handshake signatures, ciphertext tampering, replay/direction/session
rejection, size limits, generic handler errors and pending-request disconnects.
These are local transport checks. Physical MSI/Mac behavior and existing tunnel
acceptance require separate client evidence.
