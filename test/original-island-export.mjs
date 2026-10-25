import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, mkdir, cp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {loadWorldSource, packWorldRepository, describeRuntimeWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {ORIGINAL_WORLD_ID} from '../tools/worlds/export-original-island.mjs';

const root=process.env.ELSEMESH_ORIGINAL_WORLD_ROOT;
const source=folder=>({kind:'local',label:'Original Island test',read:async(path,limit)=>{
 const bytes=await readFile(join(folder,path));assert.ok(bytes.length<=limit,path+' over budget');return bytes;
}});

test('Original Island is portable and builder object edits persist while native resources stay intact', {skip:!root}, async()=>{
 const work=await mkdtemp(join(tmpdir(),'elsemesh-original-'));
 try{
  const initial=await loadWorldSource(source(root));
  assert.equal(initial.identity.worldId,ORIGINAL_WORLD_ID);
  assert.equal(initial.project.metadata.name,'Original Island');
  assert.ok(initial.project.nativeIsland.resources.length>2500);
  const descriptor=describeRuntimeWorld(initial.project);
  assert.ok(descriptor.boxes.length>=220);
  for(const id of ['original-pier','original-boardwalk','original-lobster-boat']){
   assert.ok(initial.project.objects.some(object=>object.id===id),id);
  }
  const clone=join(work,'clone');await cp(root,clone,{recursive:true});
  const cloned=await loadWorldSource(source(clone));
  assert.equal(cloned.identity.worldId,initial.identity.worldId);
  assert.equal(cloned.identity.contentDigest,initial.identity.contentDigest);
  const edited=structuredClone(cloned.project);
  const boat=edited.objects.find(object=>object.id==='original-lobster-boat');
  boat.position[0]+=2;
  const output=join(work,'edited');
  for(const [path,bytes] of await packWorldRepository(edited,{nativeIslandRead:source(clone).read})){
   await mkdir(dirname(join(output,path)),{recursive:true});await writeFile(join(output,path),bytes);
  }
  const reopened=await loadWorldSource(source(output));
  assert.equal(reopened.identity.worldId,ORIGINAL_WORLD_ID);
  assert.equal(reopened.project.objects.find(object=>object.id===boat.id).position[0],boat.position[0]);
  assert.equal(reopened.project.nativeIsland.resources.length,initial.project.nativeIsland.resources.length);
  assert.ok(reopened.project.assets.find(asset=>asset.id==='original-lobster-boat-glb'));
 } finally {await rm(work,{recursive:true,force:true});}
});
