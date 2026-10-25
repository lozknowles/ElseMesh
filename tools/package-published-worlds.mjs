import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validatePublishedWorldCatalog} from '../src/world-runtime/PublishedWorldCatalog.js';
import {loadWorldSource,repositoryDigest} from '../src/world-runtime/vendor/world-engine-contract.js';
const [buildArg,worldArg,outputArg,previousPagesArg]=process.argv.slice(2);
if(!buildArg||!worldArg||!outputArg||!previousPagesArg)throw Error('Usage: node tools/package-published-worlds.mjs BUILD PINNED_WORLD_REPOSITORY NEW_OUTPUT PREVIOUS_PUBLIC_PAGES');
const build=await fs.realpath(buildArg),world=await fs.realpath(worldArg),previous=await fs.realpath(previousPagesArg),output=path.resolve(outputArg);
const catalog=validatePublishedWorldCatalog(JSON.parse(await fs.readFile(path.join(build,'published-worlds.json'),'utf8')),{baseURL:'https://publication.invalid/ElseMesh/index.html'});
const opening=catalog.worlds.find(w=>w.worldId===catalog.openingWorldId),sunset=catalog.worlds.find(w=>w.worldId!==catalog.openingWorldId);
const git=(...args)=>{const r=spawnSync('git',['-C',world,...args],{encoding:'utf8',maxBuffer:1024*1024});if(r.status)throw Error('Pinned public world Git check failed');return r.stdout.trim();};
if(git('status','--porcelain','--untracked-files=all'))throw Error('World repository must be clean');const commit=git('rev-parse','HEAD');
const openingConfig=JSON.parse(await fs.readFile(path.join(build,'opening-world.json'),'utf8'));
if(openingConfig.worldId!==opening.worldId||openingConfig.contentDigest!==opening.contentDigest||!openingConfig.repository.endsWith('/tree/'+commit))throw Error('Opening configuration differs from catalog/source pin');
const tool=fileURLToPath(new URL('./package-opening-world.mjs',import.meta.url));
const base=spawnSync(process.execPath,[tool,build,world,output,opening.bundlePath],{stdio:'inherit'});if(base.status)throw Error('Opening package failed');
const sourceRoot=await fs.realpath(path.join(world,'worlds/sunset')),needed=new Set(['world.json','README.md','ATTRIBUTION.md','LICENSE']);
const tracked=new Set(spawnSync('git',['-C',world,'ls-files','-z'],{encoding:'utf8',maxBuffer:1024*1024}).stdout.split('\0').filter(Boolean));
const source={kind:'local',label:'public Sunset source',read:async(relative,limit)=>{needed.add(relative);if(!/^(?:world\.json|snapshots\/[a-f0-9]{64}\/[a-z-]+\.json|splat-scenes\/[a-f0-9]{64}\.(?:sog|json))$/.test(relative))throw Error('Unsupported Sunset source path');const full=await fs.realpath(path.join(sourceRoot,relative));if(!full.startsWith(sourceRoot+path.sep))throw Error('Sunset source escaped');const info=await fs.lstat(full);if(!info.isFile()||info.isSymbolicLink()||info.size>limit)throw Error('Invalid Sunset source file');return new Uint8Array(await fs.readFile(full));}};
const loaded=await loadWorldSource(source,{expectedWorldId:sunset.worldId,expectedContentDigest:sunset.contentDigest});
if(loaded.identity.worldId!==sunset.worldId||loaded.identity.contentDigest!==sunset.contentDigest||loaded.project.splatScene?.asset.count!==719538||loaded.project.objects.length)throw Error('Unexpected public Sunset content');
// SOG/physics are lazy runtime resources: loadWorldSource reads their descriptor,
// so publication must explicitly verify and include both immutable byte payloads.
for(const [key,limit]of [['asset',16*1024*1024],['physics',8*1024*1024]]){const ref=loaded.project.splatScene[key];if(!/^splat-scenes\/[a-f0-9]{64}\.(sog|json)$/.test(ref.path)||!ref.path.includes(ref.sha256))throw Error('Invalid Sunset payload reference');const bytes=await source.read(ref.path,limit);if(bytes.byteLength!==ref.bytes||await repositoryDigest(bytes)!==ref.sha256)throw Error('Sunset payload integrity');}

const warehouseManifest=JSON.parse(await fs.readFile(path.join(world,'world.json'),'utf8'));
const connectionsRef=warehouseManifest.components.connections;
if(!/^snapshots\/[a-f0-9]{64}\/connections\.json$/.test(connectionsRef.path))throw Error('Invalid warehouse connections path');
const connectionsBytes=new Uint8Array(await fs.readFile(path.join(world,connectionsRef.path)));
if(connectionsBytes.byteLength!==connectionsRef.bytes||await repositoryDigest(connectionsBytes)!==connectionsRef.sha256)throw Error('Warehouse connections integrity');
const warehousePortals=JSON.parse(new TextDecoder().decode(connectionsBytes)).portals;
for(const route of catalog.routes){const portals=route.sourceWorldId===opening.worldId?warehousePortals:loaded.project.portals;const door=portals.find(p=>p.id===route.portalId);if(!door?.enabled||door.destination.worldId!==route.destinationWorldId||door.destination.portalId!==route.destinationPortalId)throw Error('Catalog route differs from authored world');}

if(await repositoryDigest(new Uint8Array(await fs.readFile(path.join(sourceRoot,'world.json'))))!==sunset.contentDigest)throw Error('Sunset manifest pin changed');
const destination=path.join(output,sunset.bundlePath);await fs.mkdir(destination,{recursive:false});let total=0;
for(const relative of [...needed].sort()){
 if(!tracked.has('worlds/sunset/'+relative))throw Error('Uncommitted public Sunset file');const full=await fs.realpath(path.join(sourceRoot,relative)),info=await fs.lstat(full);
 if(!full.startsWith(sourceRoot+path.sep)||!info.isFile()||info.isSymbolicLink())throw Error('Unsupported Sunset file');total+=info.size;if(total>32*1024*1024||needed.size>100)throw Error('Sunset package budget');
 const target=path.join(destination,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(full,target);
}
async function inspect(dir){const info=await fs.lstat(dir);if(info.isSymbolicLink())throw Error('Symlink in public editor');if(info.isDirectory())for(const name of await fs.readdir(dir))await inspect(path.join(dir,name));else if(!info.isFile())throw Error('Invalid editor file');}
await inspect(path.join(previous,'editor'));await fs.cp(path.join(previous,'editor'),path.join(output,'editor'),{recursive:true,errorOnExist:true,force:false});
await fs.copyFile(path.join(build,'published-worlds.json'),path.join(output,'published-worlds.json'));
await fs.copyFile(fileURLToPath(new URL('../node_modules/@sparkjsdev/spark/LICENSE',import.meta.url)),path.join(output,'licenses/SPARK-LICENSE.txt'));
let credits=await fs.readFile(path.join(output,'credits.html'),'utf8');credits=credits.replace('</body>',`<section><h2>Sunset Courtyard</h2><p>Original 719,538-Gaussian reconstruction supplied by the project owner. Walking uses the reviewed ground corridor and gameplay scale. Scan data retain their existing rights; source recording and training material are not distributed.</p><p>Gaussian rendering uses Spark 2.4.0 and Three.js 0.180.0. <a href="licenses/SPARK-LICENSE.txt">Spark licence</a>. <a href="${sunset.bundlePath}ATTRIBUTION.md">Scene attribution</a>.</p></section></body>`);await fs.writeFile(path.join(output,'credits.html'),credits);
await fs.writeFile(path.join(output,'publication.json'),JSON.stringify({schema:'elsemesh.publication/1',worldRepositoryCommit:commit,openingWorldId:opening.worldId,worlds:catalog.worlds,routes:catalog.routes,scene:{count:719538,assetSha256:loaded.project.splatScene.asset.sha256,physicsSha256:loaded.project.splatScene.physics.sha256},previousPublicEditorPreserved:true},null,2)+'\n');
console.log(JSON.stringify({output,worldRepositoryCommit:commit,sunsetBytes:total,worlds:catalog.worlds}));
