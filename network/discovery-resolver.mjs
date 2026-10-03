import { verifyRegionVersion, verifyDelegation } from './federation.mjs';
import { verifyPeerBinding } from './discovery-identity.mjs';

// Resolve routes only. A result is not player admission, host readiness or edit permission.
// The caller pins a signed region version from its invitation/trust store, not a helper.
export async function resolveRegionContact({ published, expected, delegation, lookup, now = Date.now, allowedScopes = ['public'] }) {
  const clock = typeof now === 'function' ? now : () => now;
  published = structuredClone(published);
  delegation = structuredClone(delegation);
  if (!expected?.ownerNodeId || !expected.worldId || !expected.regionId || !expected.manifestHash) throw new Error('Pinned destination identity and manifest required');
  const trustedOwners = new Set([expected.ownerNodeId]);
  const region = verifyRegionVersion(published, trustedOwners);
  if (region.worldId !== expected.worldId || region.regionId !== expected.regionId || published.manifestHash !== expected.manifestHash) throw new Error('Destination world/region/version mismatch');
  const servingNodeId = region.authority.nodeId;
  if (servingNodeId !== region.ownerNodeId) {
    const grant = verifyDelegation(delegation, published, trustedOwners, clock());
    if (grant.permission !== 'AUTHORITY' || grant.hostNodeId !== servingNodeId) throw new Error('Serving node lacks authority delegation');
  }
  const contact = await lookup(servingNodeId);
  if (!contact) throw new Error('Destination unresolved');
  const resolvedAt = clock();
  if (servingNodeId !== region.ownerNodeId) verifyDelegation(delegation, published, trustedOwners, resolvedAt);
  const verified = verifyPeerBinding(contact, { now: resolvedAt, expectedNodeId: servingNodeId, allowedScopes });
  if (!verified.endpoints.length) throw new Error('Destination has withdrawn its routes');
  return {
    worldId: region.worldId, regionId: region.regionId, ownerNodeId: region.ownerNodeId,
    servingNodeId, authorityEpoch: region.authority.epoch, manifestHash: published.manifestHash,
    contact: verified,
  };
}
