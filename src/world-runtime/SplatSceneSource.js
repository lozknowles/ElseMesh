import {createSplatSceneResourceReader} from './vendor/world-engine-contract.js';
/** Both reads stay inside the caller's hash-verified repository capability.
 * Physics bytes are opaque here; the physics compiler owns syntax/schema/admission.
 * SOG renderer must bound decoded splat count and match project.splatScene.asset.count.
 */
export function readSplatSceneSource(project,read){return Object.freeze(createSplatSceneResourceReader(project,read));}
export async function loadVerifiedSog(project,read){return readSplatSceneSource(project,read).readSog();}
export async function loadVerifiedPhysicsBytes(project,read){return readSplatSceneSource(project,read).readPhysicsBytes();}

// A provenance string is not proof that supplied support cells match a review.
// This one-scene experiment admits only the exact manually reviewed physics bytes.
export const PINNED_SUNSET_PHYSICS=Object.freeze({sha256:'eedaeb18bfa8eacbee42c10d105b67d519f9351fb75879f4306645cf1d3a3757',bytes:7943873});
export function assertPinnedSunsetPhysics(project){const value=project?.splatScene?.physics;if(!value||value.sha256!==PINNED_SUNSET_PHYSICS.sha256||value.bytes!==PINNED_SUNSET_PHYSICS.bytes)throw Error('Experimental Sunset physics must match the exact pinned reviewed corridor.');}
