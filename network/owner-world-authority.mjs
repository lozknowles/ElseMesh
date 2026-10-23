import { randomUUID } from 'node:crypto';
import { canonical, signObject, verifyObject, assetId } from './identity.mjs';
import { verifyRegionVersion, verifyDelegation, verifyPortalInvitation, createPortalHandoffV2, acceptPortalHandoffV2, mapPortalTransformV2, FEDERATION_CAPABILITIES } from './federation.mjs';
import { OwnerWorldLedger } from './owner-world-ledger.mjs';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const digest = value => assetId(Buffer.from(canonical(value)));
export const playerIdForNode = nodeId => `player:${nodeId.split(':')[1]}`;
const degrees=m=>({...m,yaw:Math.atan2(Math.sin(m.yaw??0),Math.cos(m.yaw??0))*180/Math.PI,pitch:(m.pitch??0)*180/Math.PI});
const radians=m=>({...m,yaw:m.yaw*Math.PI/180,pitch:m.pitch*Math.PI/180});
const safeMotion = motion => motion && ['position','velocity'].every(k => Array.isArray(motion[k]) && motion[k].length === 3 && motion[k].every(n => Number.isFinite(n) && Math.abs(n) <= 1e6)) && Number.isFinite(motion.yaw ?? 0) && Number.isFinite(motion.pitch ?? 0);

export class OwnerWorldAuthority {
  static async open(options) {
    const instance = new OwnerWorldAuthority(options);
    instance.ledger = await OwnerWorldLedger.open(options.ledgerPath, { authority: options.identity.nodeId, world: instance.region.worldId, content: instance.published.manifestHash, epoch: instance.region.authority.epoch });
    return instance;
  }
  constructor({ identity, published, delegation, trustedOwners, peers = [], policy = {}, readWorld, clearance, rpc }) {
    this.identity = identity; this.published = published; this.trustedOwners = new Set(trustedOwners);
    this.region = verifyRegionVersion(published, this.trustedOwners);
    check(this.region.authority.nodeId === identity.nodeId, 'Not local world authority');
    check(verifyDelegation(delegation, published, this.trustedOwners).permission === 'AUTHORITY' && delegation.hostNodeId === identity.nodeId, 'Missing authority delegation');
    this.delegation = delegation; this.policy = { viewPlayers: [], enterPlayers: [], capacity: 16, ...policy };
    check(Array.isArray(this.policy.viewPlayers) && Array.isArray(this.policy.enterPlayers) && Number.isSafeInteger(this.policy.capacity) && this.policy.capacity > 0 && this.policy.capacity <= 128, 'Invalid explicit policy');
    check(typeof clearance === 'function' && typeof readWorld === 'function', 'World reader and clearance required');
    this.readWorld = readWorld; this.clearance = clearance; this.rpc = rpc; this.peers = new Map(); this.portals = new Map();
    for (const peer of peers) {
      const region = verifyRegionVersion(peer.published, this.trustedOwners);
      // Validate trusted static proof at construction even when its lease expired;
      // expiry is enforced on every later remote use, never on unrelated local play.
      const proofTime = Math.min(Date.now(), peer.delegation.expiresAt - 1, peer.invitation.expiresAt - 1);
      const delegated = verifyDelegation(peer.delegation, peer.published, this.trustedOwners, proofTime);
      check(delegated.permission === 'AUTHORITY' && delegated.hostNodeId === region.authority.nodeId, 'Bad peer delegation');
      const invitation = peer.invitation;
      const sourceRegion = invitation.portal.sourceRegion === this.region.regionId ? this.region : region;
      const destinationRegion = sourceRegion === this.region ? region : this.region;
      const portal = verifyPortalInvitation(invitation, peer.acceptance, { sourceRegion, destinationRegion, trustedOwners: this.trustedOwners, now: proofTime });
      check(sourceRegion.portals.includes(portal.portalId), 'Portal absent from source manifest');
      const approvals = [...(this.peers.get(region.authority.nodeId)?.approvals ?? []), peer.invitation];
      this.peers.set(region.authority.nodeId, { ...peer, region, approvals }); this.portals.set(portal.portalId, { portal, peerAuthority: region.authority.nodeId });
    }
  }
  assertCurrent() { verifyDelegation(this.delegation, this.published, this.trustedOwners); }
  peer(node) { const peer = this.peers.get(node); check(peer, 'Untrusted peer authority'); verifyDelegation(peer.delegation, peer.published, this.trustedOwners); check(peer.approvals.every(invitation => Number.isSafeInteger(invitation.expiresAt) && Date.now() < invitation.expiresAt), 'Expired peer portal invitation'); return peer; }
  challenge({ playerId, playerNodeId, action, sessionId, portalId = null }) {
    this.assertCurrent(); check(playerId === playerIdForNode(playerNodeId) && /^elsemesh-session:[A-Za-z0-9._-]{1,128}$/.test(sessionId) && ['VIEW','ENTER'].includes(action), 'Invalid player challenge');
    const challenge = { kind: 'owner-world-player-challenge', nonce: randomUUID(), authority: this.identity.nodeId, worldId: this.region.worldId, regionId: this.region.regionId, contentHash: this.published.manifestHash, epoch: this.region.authority.epoch, playerId, playerNodeId, action, sessionId, portalId, expiresAt: Date.now() + 60_000 };
    return this.ledger.transact(state => { state.challenges[challenge.nonce] = challenge; return signObject(challenge, this.identity); });
  }
  consumeProof(state, proof, action) {
    const signedChallenge = proof?.challenge; const challenge = state.challenges[signedChallenge?.nonce];
    check(challenge && proof.signer === challenge.playerNodeId && challenge.playerId === playerIdForNode(proof.signer) && verifyObject(proof, new Set([proof.signer])), 'Invalid player signature/nonce');
    check(proof.protocol === 'elsemesh.owner-player-proof/1' && verifyObject(signedChallenge, new Set([this.identity.nodeId])), 'Invalid signed authority challenge');
    const { signer, publicKey, signature, ...body } = signedChallenge;
    check(canonical(body) === canonical(challenge) && challenge.action === action && challenge.authority === this.identity.nodeId && challenge.worldId === this.region.worldId && challenge.contentHash === this.published.manifestHash && challenge.epoch === this.region.authority.epoch && Date.now() < challenge.expiresAt, 'Challenge binding/expiry mismatch');
    check(this.policy[action === 'VIEW' ? 'viewPlayers' : 'enterPlayers'].includes(challenge.playerId), `${action} access denied`);
    delete state.challenges[challenge.nonce]; return challenge;
  }
  async subscribe({ proof }) { this.assertCurrent(); return this.ledger.transact(state => { const c = this.consumeProof(state, proof, 'VIEW'); const grant = { grantId: randomUUID(), playerId: c.playerId, playerNodeId: c.playerNodeId, sessionId: c.sessionId, worldId: c.worldId, expiresAt: Date.now() + 10 * 60_000 }; state.grants[grant.grantId] = grant; return grant; }); }
  grant(grantId) { const grant = this.ledger.snapshot().grants[grantId]; check(grant && Date.now() < grant.expiresAt, 'Active VIEW grant required'); return grant; }
  async read({ grantId, request }) { this.assertCurrent(); this.grant(grantId); return this.readWorld(structuredClone(request)); }
  state({ grantId, playerId } = {}) { const grant = this.grant(grantId); check(!playerId || playerId === grant.playerId, 'Player mismatch'); const member = this.ledger.snapshot().members[grant.playerId]; return member ?? null; }
  async enterLocal({ proof, motion }) {
    this.assertCurrent(); check(safeMotion(motion), 'Invalid motion');
    return this.ledger.transact(async state => { const c = this.consumeProof(state, proof, 'ENTER'); check(!c.portalId && !state.members[c.playerId], 'Existing membership or portal requires transfer'); await this.checkCapacity(state, c.playerId, { position: motion.position, yaw: motion.yaw ?? 0 }); const member = { playerId: c.playerId, playerNodeId: c.playerNodeId, sessionId: c.sessionId, motion, sequence:0, generation:0, status: 'ACTIVE', worldId: this.region.worldId }; state.members[c.playerId] = member; return member; });
  }
  async acceptedState({ grantId, playerId, sessionId, motion, sequence, generation }) {
    this.assertCurrent(); const grant = this.grant(grantId); check(grant.playerId === playerId && grant.sessionId === sessionId && safeMotion(motion), 'Invalid accepted state');
    return this.ledger.transact(async state => { const member = state.members[playerId]; check(member?.status === 'ACTIVE' && member.sessionId === sessionId, 'Player frozen or absent'); check(Number.isSafeInteger(sequence) && sequence > member.sequence && generation === member.generation, 'Stale accepted state sequence/generation'); check(await this.clearance({spawn:motion,playerId,reservations:Object.values(state.transfers).filter(t=>t.role==='DESTINATION'&&t.status==='RESERVED'),members:Object.values(state.members).filter(m=>m.playerId!==playerId)}) === true,'Movement clearance denied'); member.motion = structuredClone(motion); member.sequence = sequence; return member; });
  }
  async checkCapacity(state, playerId, spawn) {
    const reservations = Object.values(state.transfers).filter(t => t.role === 'DESTINATION' && t.status === 'RESERVED');
    const members = Object.values(state.members); check(!state.members[playerId] && !reservations.some(t=>t.binding.playerId===playerId), 'Player already present/reserved');
    check(members.length + reservations.length < this.policy.capacity, 'Destination capacity full');
    check(await this.clearance({ spawn, playerId, reservations: structuredClone(reservations), members: structuredClone(members) }) === true, 'Arrival clearance denied');
  }
  async prepare({ portalId, proof, motion, avatarAssetId, inventoryHash, sequence = 0, grantId, transferId = randomUUID() }) {
    this.assertCurrent(); const grant = this.grant(grantId); const link = this.portals.get(portalId); check(link?.portal.sourceRegion === this.region.regionId, 'Not source portal');
    const pending=this.ledger.snapshot().transfers[transferId];if(pending){check(pending.role==='SOURCE'&&pending.binding.playerId===grant.playerId&&pending.binding.sessionId===grant.sessionId&&pending.binding.portalId===portalId,'Client transfer id binding mismatch');return this.recoverPrepare({transferId,playerId:grant.playerId});}
    const member = this.ledger.snapshot().members[proof?.challenge?.playerId]; check(member?.status === 'ACTIVE' && member.sessionId === proof.challenge.sessionId && grant.playerId === member.playerId && grant.sessionId === member.sessionId, 'Source membership required');
    check(canonical(motion) === canonical(member.motion) && sequence === member.sequence, 'Motion/sequence must be source accepted state');
    check(/^[0-9a-f-]{36}$/.test(transferId),'Invalid client transfer id');
    const existing=this.ledger.snapshot().transfers[transferId];
    if(existing){check(existing.role==='SOURCE'&&existing.binding.playerId===grant.playerId&&existing.binding.sessionId===grant.sessionId&&existing.binding.portalId===portalId,'Client transfer id binding mismatch');return this.recoverPrepare({transferId,playerId:grant.playerId});}
    const peer = this.peer(link.peerAuthority);
    const binding = { transferId, portalId, portalRevision: link.portal.revision, sourceAuthority: this.identity.nodeId, destinationAuthority: link.peerAuthority, sourceWorld: this.region.worldId, destinationWorld: peer.region.worldId, sourceContent: this.published.manifestHash, destinationContent: peer.published.manifestHash, sourceEpoch: this.region.authority.epoch, destinationEpoch: peer.region.authority.epoch, playerId: member.playerId, playerNodeId: member.playerNodeId, sessionId: member.sessionId, motion, avatarAssetId, inventoryHash, sequence, generation:member.generation };
    // Write intent before RPC: lost reservation replies remain recoverable/cancellable.
    await this.ledger.transact(state => { check(state.members[member.playerId]?.status === 'ACTIVE', 'Source no longer active'); state.transfers[transferId] = { role: 'SOURCE', status: 'PREPARING', binding }; return null; });
    const reservation = await this.rpc(link.peerAuthority, 'ready', { binding, proof });
    if(reservation?.kind==='owner-world-cancel-tombstone'){await this.acceptCancellation(binding,reservation);return {transferId,rejection:reservation};}
    this.verifySigned(reservation, link.peerAuthority, 'owner-world-reservation', binding);
    await this.ledger.transact(state => { const t = state.transfers[transferId]; check(t.status === 'PREPARING' && state.members[member.playerId]?.status === 'ACTIVE', 'Source preparation conflict'); t.reservation = reservation; t.status = 'FENCED'; state.members[member.playerId].status = 'FROZEN'; state.members[member.playerId].transferId = transferId; return null; });
    return { transferId, reservation };
  }
  async recoverPrepare({transferId,playerId}) {
    let t=this.ledger.snapshot().transfers[transferId];check(t?.role==='SOURCE'&&t.binding.playerId===playerId,'Unknown source preparation');
    if(t.status==='PREPARING'){const reservation=await this.rpc(t.binding.destinationAuthority,'status',{transferId});if(reservation?.kind==='owner-world-cancel-tombstone'){await this.acceptCancellation(t.binding,reservation);return {transferId,rejection:reservation};}this.verifySigned(reservation,t.binding.destinationAuthority,'owner-world-reservation',t.binding);await this.ledger.transact(state=>{const current=state.transfers[transferId],member=state.members[playerId];check(current.status==='PREPARING'&&member?.status==='ACTIVE'&&member.sessionId===t.binding.sessionId,'Source preparation recovery conflict');current.reservation=reservation;current.status='FENCED';member.status='FROZEN';member.transferId=transferId;return null;});t=this.ledger.snapshot().transfers[transferId];}
    if(t.status==='CANCELLED')return {transferId,rejection:t.tombstone};
    check(t.reservation,'Destination preparation unresolved');return {transferId,reservation:t.reservation};
  }
  async acceptCancellation(binding,tombstone) {
    this.verifySigned(tombstone,binding.destinationAuthority,'owner-world-cancel-tombstone',binding);
    return this.ledger.transact(state=>{const t=state.transfers[binding.transferId];check(t?.role==='SOURCE'&&t.status!=='DEPARTED'&&digest(t.binding)===digest(binding),'Cancellation binding conflict');t.status='CANCELLED';t.tombstone=tombstone;const m=state.members[binding.playerId];if(m?.transferId===binding.transferId){m.status='ACTIVE';delete m.transferId;}return tombstone;});
  }
  verifySigned(signed, authority, kind, binding) { check(verifyObject(signed, new Set([authority])) && signed.kind === kind && signed.bindingHash === digest(binding) && signed.transferId === binding.transferId, 'Invalid signed transfer record'); }
  validateBinding(binding, caller) {
    const peer = this.peer(caller); const link = this.portals.get(binding.portalId);
    check(link?.peerAuthority === caller && link.portal.sourceRegion === peer.region.regionId && link.portal.destinationRegion === this.region.regionId && link.portal.revision === binding.portalRevision && binding.sourceAuthority === caller && binding.destinationAuthority === this.identity.nodeId && binding.sourceWorld === peer.region.worldId && binding.destinationWorld === this.region.worldId && binding.sourceContent === peer.published.manifestHash && binding.destinationContent === this.published.manifestHash && binding.sourceEpoch === peer.region.authority.epoch && binding.destinationEpoch === this.region.authority.epoch, 'Transfer world/authority/content/portal mismatch');
    check(typeof binding.transferId === 'string' && /^[0-9a-f-]{36}$/.test(binding.transferId) && safeMotion(binding.motion), 'Invalid transfer'); return link.portal;
  }
  async ready({ binding, proof }, { callerNodeId } = {}) {
    this.assertCurrent(); const portal = this.validateBinding(binding, callerNodeId);
    return this.ledger.transact(async state => {
      const old = state.transfers[binding.transferId]; if (old) { check(digest(old.binding) === digest(binding), 'Transfer collision');if(old.status==='CANCELLED')return old.tombstone;check(old.status==='RESERVED','Transfer already committed'); return old.reservation; }
      try{const c = this.consumeProof(state, proof, 'ENTER'); check(c.playerId === binding.playerId && c.playerNodeId === binding.playerNodeId && c.sessionId === binding.sessionId && c.portalId === portal.portalId, 'ENTER proof transfer mismatch');
      check(portal.access.mode === 'PUBLIC' || portal.access.allowPlayers.includes(c.playerId), 'Portal entry denied');
      const spawn = radians(mapPortalTransformV2(portal, degrees(binding.motion))); await this.checkCapacity(state, c.playerId, spawn);
      const reservation = signObject({ kind: 'owner-world-reservation', transferId: binding.transferId, bindingHash: digest(binding), destinationSessionId: `elsemesh-session:${randomUUID()}`, spawn }, this.identity);
      state.transfers[binding.transferId] = { role: 'DESTINATION', status: 'RESERVED', binding, reservation }; return reservation;
      }catch(error){const tombstone=signObject({kind:'owner-world-cancel-tombstone',transferId:binding.transferId,bindingHash:digest(binding),reason:error.message},this.identity);state.transfers[binding.transferId]={role:'DESTINATION',status:'CANCELLED',binding,tombstone};return tombstone;}
    });
  }
  async handoff({ transferId }) {
    this.assertCurrent(); const t = await this.ledger.transact(state => {
      const t = state.transfers[transferId]; check(t?.role === 'SOURCE' && ['FENCED','ISSUED','DEPARTED'].includes(t.status), 'Transfer not fenced'); if (t.status === 'DEPARTED') return t;
      if (!t.handoff) { const b = t.binding, portal = this.portals.get(b.portalId).portal; t.handoff = createPortalHandoffV2(this.identity, { portal, ...b, destinationSessionId: t.reservation.destinationSessionId, authorityEpoch: b.sourceEpoch, ...degrees(b.motion), controlMode: 'HUMAN' }); /* The outer signed envelope binds the durable transfer to the unchanged /2 handoff. */ t.envelope = signObject({ kind: 'owner-world-handoff', transferId, bindingHash: digest(b), handoff: t.handoff }, this.identity); t.status = 'ISSUED'; } return t;
    });
    if (t.status === 'DEPARTED') return t.receipt;
    const receipt = await this.rpc(t.binding.destinationAuthority, 'commit', { transferId, envelope: t.envelope }); return this.finalise(t, receipt);
  }
  async finalise(t, receipt) {
    this.verifySigned(receipt, t.binding.destinationAuthority, 'owner-world-commit-receipt', t.binding);
    return this.ledger.transact(state => { const current = state.transfers[t.binding.transferId]; check(['FENCED','ISSUED','DEPARTED'].includes(current.status), 'Departure conflict'); if (current.status !== 'DEPARTED') { check(state.members[t.binding.playerId]?.transferId === t.binding.transferId, 'Source fence missing'); delete state.members[t.binding.playerId]; current.status = 'DEPARTED'; current.receipt = receipt; } return receipt; });
  }
  async commit({ transferId, envelope }, { callerNodeId } = {}) {
    this.assertCurrent(); return this.ledger.transact(async state => {
      const t = state.transfers[transferId]; check(t?.role === 'DESTINATION', 'Unknown reservation'); const portal = this.validateBinding(t.binding, callerNodeId);
      this.verifySigned(envelope, callerNodeId, 'owner-world-handoff', t.binding);
      if (t.status === 'COMMITTED') { check(digest(envelope) === t.envelopeHash, 'Conflicting replay'); return t.receipt; }
      check(t.status === 'RESERVED', 'Reservation cancelled');
      const b = t.binding, h = envelope.handoff; const legacyHandoff = h;
      check(h.playerId === b.playerId && h.playerNodeId === b.playerNodeId && h.sessionId === b.sessionId && h.sequence === b.sequence && h.avatarAssetId === b.avatarAssetId && h.inventoryHash === b.inventoryHash && canonical({position:h.position,velocity:h.velocity,yaw:h.yaw,pitch:h.pitch}) === canonical(degrees({position:b.motion.position,velocity:b.motion.velocity,yaw:b.motion.yaw??0,pitch:b.motion.pitch??0})), 'Handoff binding mismatch');
      const accepted = acceptPortalHandoffV2(legacyHandoff, { portal, sourceAuthority: callerNodeId, sourceEpoch: b.sourceEpoch, destinationAuthority: this.identity.nodeId, destinationSessionId: t.reservation.destinationSessionId, playerNodeId: b.playerNodeId, destinationRules: this.region.rules, supportedCapabilities: FEDERATION_CAPABILITIES, trustedAuthorities: new Set([callerNodeId]), replay: {accept:()=>true}, destinationAdmission: () => ({ accepted:true,playerId:b.playerId,playerNodeId:b.playerNodeId,destinationSessionId:t.reservation.destinationSessionId,sessionId:b.sessionId,destinationRegion:this.region.regionId }) });
      check(!state.members[b.playerId], 'Destination already has member');
      check(await this.clearance({spawn:radians(accepted.spawn),playerId:b.playerId,reservations:Object.values(state.transfers).filter(r=>r.role==='DESTINATION'&&r.status==='RESERVED'&&r.binding.transferId!==transferId),members:Object.values(state.members)}) === true,'Commit arrival clearance denied');
      state.members[b.playerId] = { playerId:b.playerId,playerNodeId:b.playerNodeId,sessionId:t.reservation.destinationSessionId,destinationSessionId:t.reservation.destinationSessionId,worldId:this.region.worldId,status:'ACTIVE',sequence:b.sequence,generation:b.generation+1,motion:radians(accepted.spawn) };
      t.status = 'COMMITTED'; t.envelopeHash = digest(envelope); t.receipt = signObject({ kind:'owner-world-commit-receipt',committedAt:Date.now(),transferId,bindingHash:digest(b),destinationSessionId:t.reservation.destinationSessionId },this.identity); return t.receipt;
    });
  }
  async status({ transferId }, { callerNodeId } = {}) {
    const t = this.ledger.snapshot().transfers[transferId]; check(t, 'Unknown transfer');
    if (callerNodeId) { check(t.role === 'DESTINATION' && t.binding.sourceAuthority === callerNodeId, 'Wrong status caller'); return t.receipt ?? t.tombstone ?? t.reservation; }
    if (t.role === 'SOURCE' && ['FENCED','ISSUED'].includes(t.status)) { const result = await this.rpc(t.binding.destinationAuthority,'status',{transferId}); if (result.kind === 'owner-world-commit-receipt') return this.finalise(t,result); }
    if(t.status==='DEPARTED')return t.receipt;if(t.status==='CANCELLED')return t.tombstone;
    return { transferId, status:t.status, binding:t.binding };
  }
  async cancel({ transferId, binding }, { callerNodeId } = {}) {
    if (callerNodeId) {if(binding){this.validateBinding(binding,callerNodeId);check(binding.transferId===transferId,'Cancellation transfer mismatch');}return this.ledger.transact(state => { let t=state.transfers[transferId];if(!t){check(binding,'Unknown cancellation requires exact binding');t=state.transfers[transferId]={role:'DESTINATION',status:'CANCELLED',binding};}check(t.role==='DESTINATION'&&t.binding.sourceAuthority===callerNodeId&&(!binding||digest(t.binding)===digest(binding)),'Wrong cancel caller'); if(t.status==='COMMITTED') return t.receipt; if(!t.tombstone) { t.status='CANCELLED'; t.tombstone=signObject({kind:'owner-world-cancel-tombstone',transferId,bindingHash:digest(t.binding)},this.identity); } return t.tombstone; });}
    const t=this.ledger.snapshot().transfers[transferId]; check(t?.role==='SOURCE','Unknown source transfer'); if(t.status==='DEPARTED') return t.receipt;if(t.status==='CANCELLED')return t.tombstone;
    const result=await this.rpc(t.binding.destinationAuthority,'cancel',{transferId,binding:t.binding}); if(result.kind==='owner-world-commit-receipt') return this.finalise(t,result);
    this.verifySigned(result,t.binding.destinationAuthority,'owner-world-cancel-tombstone',t.binding);
    return this.ledger.transact(state=>{const current=state.transfers[transferId]; check(current.status!=='DEPARTED','Already departed'); current.status='CANCELLED';current.tombstone=result;const member=state.members[t.binding.playerId];if(member?.transferId===transferId){member.status='ACTIVE';delete member.transferId;}return result;});
  }
  dispatch(operation,payload,context={}) {
    const allowed = ['challenge','subscribe','read','state','accepted-state','enter-local','prepare','ready','handoff','commit','status','cancel']; check(allowed.includes(operation),'Unknown authority operation');
    if (context.callerNodeId) { this.peer(context.callerNodeId); check(['challenge','subscribe','read','ready','commit','status','cancel'].includes(operation),'Peer operation forbidden'); }
    return this[operation==='accepted-state'?'acceptedState':operation==='enter-local'?'enterLocal':operation](payload,context);
  }
  close() { return this.ledger.close(); }
}
