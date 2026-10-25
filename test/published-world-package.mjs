import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validatePublishedWorldCatalog} from '../src/world-runtime/PublishedWorldCatalog.js';
const arg=process.env.PUBLIC_SUNSET_PACKAGE;
if(!arg)throw Error('PUBLIC_SUNSET_PACKAGE must identify the generated publication candidate');
const root=await fs.realpath(arg),sha=b=>createHash('sha256').update(b).digest('hex');
const catalog=validatePublishedWorldCatalog(JSON.parse(await fs.readFile(path.join(root,'published-worlds.json'),'utf8')),{baseURL:'https://publication.invalid/ElseMesh/index.html'});
test('generated publication contains every manifest, native and lazy SOG/physics byte with the pinned hash',async()=>{
 let verified=0,bytes=0;const projects=[];
 for(const world of catalog.worlds){const dir=await fs.realpath(path.join(root,world.bundlePath)),seen=new Set(),json=[];
  const manifestBytes=await fs.readFile(path.join(dir,'world.json')),manifest=JSON.parse(manifestBytes);assert.equal(sha(manifestBytes),world.contentDigest);assert.equal(manifest.world.worldId,world.worldId);
  async function inspect(directory){for(const item of await fs.readdir(directory,{withFileTypes:true})){const full=path.join(directory,item.name);assert.ok(!item.isSymbolicLink());if(item.isDirectory())await inspect(full);else if(item.name.endsWith('.json'))json.push(full);}}
  await inspect(dir);
  async function visit(value){if(Array.isArray(value)){for(const x of value)await visit(x);return;}if(!value||typeof value!=='object')return;
   if(typeof value.path==='string'&&/^[a-f0-9]{64}$/.test(value.sha256??'')&&Number.isSafeInteger(value.bytes)){
    assert.ok(!value.path.includes('..')&&!value.path.includes('\\')&&!value.path.startsWith('/'));
    if(!seen.has(value.path)){const full=await fs.realpath(path.join(dir,value.path));assert.ok(full.startsWith(dir+path.sep));const content=await fs.readFile(full);assert.equal(content.byteLength,value.bytes,value.path);assert.equal(sha(content),value.sha256,value.path);seen.add(value.path);verified++;bytes+=content.byteLength;}
   }
   for(const x of Object.values(value))await visit(x);
  }
  for(const file of json)await visit(JSON.parse(await fs.readFile(file,'utf8')));
  const connections=JSON.parse(await fs.readFile(path.join(dir,manifest.components.connections.path),'utf8'));projects.push({world,connections,dir});
  if(connections.splatScene){const scene=connections.splatScene;assert.equal(scene.asset.count,719538);assert.equal(scene.asset.sha256,'66334b9bcea5abb6b2a310c44c584fd7fdc8fb999db9c718c785473c41019298');assert.equal(scene.physics.sha256,'eedaeb18bfa8eacbee42c10d105b67d519f9351fb75879f4306645cf1d3a3757');assert.ok(seen.has(scene.asset.path));assert.ok(seen.has(scene.physics.path));}
 }
 assert.ok(verified>1000);assert.ok(bytes>100*1024*1024);
 for(const route of catalog.routes){const p=projects.find(p=>p.world.worldId===route.sourceWorldId).connections.portals.find(p=>p.id===route.portalId);assert.ok(p.enabled);assert.equal(p.destination.worldId,route.destinationWorldId);assert.equal(p.destination.portalId,route.destinationPortalId);}
});
test('publication preserves editor, notices, immutable opening pin and excludes lab/source evidence artifacts',async()=>{
 const config=JSON.parse(await fs.readFile(path.join(root,'opening-world.json'),'utf8')),opening=catalog.worlds.find(w=>w.worldId===catalog.openingWorldId);assert.equal(config.bundlePath,opening.bundlePath);assert.equal(config.contentDigest,opening.contentDigest);await fs.access(path.join(root,'editor/index.html'));await fs.access(path.join(root,'licenses/SPARK-LICENSE.txt'));
 const denied=/\.(?:mp4|ply|sqlite|pem|pyc)$|client-identities|owner-trace|sensor\.jsonl|\.local-evidence|microduck/i;
 async function visit(dir){for(const name of await fs.readdir(dir)){assert.ok(!denied.test(name),name);const full=path.join(dir,name),info=await fs.lstat(full);assert.ok(!info.isSymbolicLink());if(info.isDirectory())await visit(full);}}
 await visit(root);
});
