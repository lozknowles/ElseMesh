import { createPublicKey } from 'node:crypto';
import { publicKeyFromRaw } from '@libp2p/crypto/keys';
import { peerIdFromPublicKey } from '@libp2p/peer-id';
import { multiaddr } from '@multiformats/multiaddr';
import { verifyContact } from './discovery-records.mjs';

export function peerIdForIdentity(publicKeyPem) {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Ed25519 identity required');
  return peerIdFromPublicKey(publicKeyFromRaw(Buffer.from(key.export({ format: 'jwk' }).x, 'base64url'))).toString();
}

// Every resolver and exchange uses the same binding, including local invitations.
export function verifyPeerBinding(record, options) {
  const verified = verifyContact(record, options);
  if (peerIdForIdentity(verified.publicKey) !== verified.peerId) throw new Error('Contact libp2p identity mismatch');
  for (const endpoint of verified.endpoints) {
    if (endpoint.transport !== 'libp2p') continue;
    const parts = multiaddr(endpoint.address).getComponents();
    if (parts.at(-1)?.name !== 'p2p' || parts.at(-1).value !== verified.peerId) throw new Error('Endpoint peer identity mismatch');
  }
  return verified;
}
