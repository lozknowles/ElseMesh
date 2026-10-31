import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadWorldSource,packWorldRepository,validateSplatScene,repositoryDigest} from '../src/world-runtime/vendor/world-engine-contract.js';
import {TABLE_TENNIS_SPLAT_PROFILE,assertQualifiedSplatProfile} from '../src/world-runtime/SplatSceneProfiles.js';
import {compileSplatScenePhysics} from '../src/world-runtime/SplatScenePhysics.js';
import {loadVerifiedPhysicsBytes} from '../src/world-runtime/SplatSceneSource.js';
import {createSplatSceneAdapter} from '../src/world-runtime/SplatSceneAdapter.js';
import {prepareSplatWorldPhysics} from '../network/splat-world-physics.mjs';
import {isRepositoryContentPath} from '../src/world-runtime/LocalRepositoryFiles.js';
const sourceRoot=process.env.ELSEMESH_PUBLIC_ROOM_SOURCE_ROOT;
async function fixture(){
 const root=await fs.realpath(sourceRoot),read=async(relative,limit)=>{assert.ok(isRepositoryContentPath(relative));const full=await fs.realpath(path.join(root,relative));assert.ok(full.startsWith(root+path.sep));const info=await fs.lstat(full);assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.size<=limit);return new Uint8Array(await fs.readFile(full));};
 return {root,read,loaded:await loadWorldSource({kind:'local',read})};
}
test('actual Room pins, honest SOG provenance, native qualification and owner admission',{skip:!sourceRoot},async()=>{
 const {read,loaded}=await fixture(),project=loaded.project,scene=project.splatScene;
 assert.equal(project.metadata.worldId,'elsemesh.world:5c2e6618-a04a-4460-912a-bfc57bc5bbad');assert.equal(assertQualifiedSplatProfile(project),TABLE_TENNIS_SPLAT_PROFILE);assert.deepEqual(validateSplatScene(scene),[]);
 assert.deepEqual(Object.keys(scene.provenance).sort(),['sourceFormat','sourceManifestSha256','reviewSha256','qualificationSha256'].sort());assert.equal(scene.provenance.sourceFormat,'sog');
 for(const hash of [scene.provenance.sourceManifestSha256,scene.provenance.reviewSha256]){const bytes=await read('splat-scenes/'+hash+'.json',64*1024);assert.equal(await repositoryDigest(bytes),hash);}
 const bytes=await loadVerifiedPhysicsBytes(project,read),physics=await compileSplatScenePhysics(project,bytes),owner=await prepareSplatWorldPhysics(project,read);
 assert.equal(physics.assetSha256,scene.asset.sha256);assert.ok(physics.clearance(project.spawn.position));assert.ok(owner.clearance(project.spawn.position));
 for(const route of physics.qualification.reviewedRoutes)for(let i=1;i<route.length;i++){assert.ok(physics.segment(route[i-1],route[i]).valid);assert.ok(owner.segment(route[i-1],route[i]).valid);}
 assert.ok(physics.clearance(physics.arrival.mappedPosition));assert.ok(physics.segment(physics.arrival.mappedPosition,physics.arrival.egressPosition).valid);
 assert.equal(physics.clearance([physics.bounds.max[0]+1,project.spawn.position[1],project.spawn.position[2]]),false);
});
test('actual Room roundtrip keeps source-manifest provenance and exact lazy payloads',{skip:!sourceRoot},async()=>{
 const {read,loaded}=await fixture(),files=await packWorldRepository(loaded.project,{splatSceneRead:read}),reloaded=await loadWorldSource({kind:'local',read:async(relative,limit)=>{const bytes=files.get(relative);assert.ok(bytes&&bytes.length<=limit);return bytes;}});
 assert.deepEqual(reloaded.project.splatScene,loaded.project.splatScene);assert.equal(assertQualifiedSplatProfile(reloaded.project),TABLE_TENNIS_SPLAT_PROFILE);
 for(const ref of [loaded.project.splatScene.asset,loaded.project.splatScene.physics])assert.equal(await repositoryDigest(await reloaded.splatSceneRead(ref.path,ref.bytes)),ref.sha256);
});
test('actual Room provenance variants, pins and payload corruption fail closed',{skip:!sourceRoot},async()=>{
 const {read,loaded}=await fixture();
 for(const change of [p=>p.splatScene.asset.count--,p=>p.splatScene.physics.bytes--,p=>p.splatScene.transform.scale+=.001,p=>p.splatScene.provenance.reviewSha256='a'.repeat(64)]){
  const p=structuredClone(loaded.project);change(p);let reads=0;await assert.rejects(createSplatSceneAdapter(p,{read:async()=>{reads++;}}));await assert.rejects(prepareSplatWorldPhysics(p,async()=>{reads++;}));assert.equal(reads,0);
 }
 for(const provenance of [{...loaded.project.splatScene.provenance,videoSha256:'a'.repeat(64)},{...loaded.project.splatScene.provenance,sourceFormat:'ply'},{...loaded.project.splatScene.provenance,sourceManifestSha256:'bad'}])assert.ok(validateSplatScene({...loaded.project.splatScene,provenance}).length);
 for(const ref of [loaded.project.splatScene.asset,loaded.project.splatScene.physics])await assert.rejects(prepareSplatWorldPhysics(loaded.project,async(relative,limit)=>{const bytes=await read(relative,limit);if(relative===ref.path){const corrupt=bytes.slice();corrupt[0]^=1;return corrupt;}return bytes;}),/hash|integrity|SHA/i);
});
