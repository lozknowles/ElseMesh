import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateOpeningWorld} from '../src/world-runtime/OpeningWorld.js';
import {loadWorldSource,repositoryDigest} from '../src/world-runtime/vendor/world-engine-contract.js';

const [buildArg,worldArg,outputArg,bundlePath='worlds/loz-opening/']=process.argv.slice(2);
if(!/^worlds\/[a-z0-9][a-z0-9-]{0,63}\/$/.test(bundlePath))throw Error('Invalid opening bundle path');
if(!buildArg||!worldArg||!outputArg)throw Error('Usage: node tools/package-opening-world.mjs BUILD PINNED_PUBLIC_WORLD_REPOSITORY NEW_OUTPUT_DIRECTORY');
const build=await fs.realpath(path.resolve(buildArg)),world=await fs.realpath(path.resolve(worldArg));
const requestedOutput=path.resolve(outputArg);
const output=path.join(await fs.realpath(path.dirname(requestedOutput)),path.basename(requestedOutput));
for(const root of [build,world]){
 const relative=path.relative(root,output);
 if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Output must be outside source directories.');
}
try{await fs.lstat(output);throw Error('Output directory already exists.');}catch(error){if(error.code!=='ENOENT')throw error;}
function git(args){const result=spawnSync('git',['-C',world,...args],{encoding:'utf8',maxBuffer:1024*1024});if(result.status!==0)throw Error('Pinned public world repository is unavailable.');return result.stdout.trim();}
const config=JSON.parse(await fs.readFile(path.join(build,'opening-world.json'),'utf8'));
const {source}=validateOpeningWorld(config);
if(config.schema!=='elsemesh.opening-world/1'||source.path)throw Error('Build must use a pinned root repository world.');
if(git(['rev-parse','HEAD'])!==source.ref||git(['status','--porcelain','--untracked-files=all']))throw Error('World checkout must be clean and match the configured commit.');
if((await fs.readFile(path.join(world,'world.json'))).byteLength>1048576)throw Error('World manifest exceeds its byte limit.');
const manifest=await fs.readFile(path.join(world,'world.json'));
if(await repositoryDigest(manifest)!==config.contentDigest)throw Error('World manifest digest differs from the configured revision.');
const needed=new Set(['world.json','README.md','LICENSE','ATTRIBUTION.md','NATIVE-VEGETATION-CREDITS.md']);
const loaded=await loadWorldSource({kind:'local',label:'package candidate',read:async(relative,limit)=>{
 needed.add(relative);
 const file=path.join(world,relative),info=await fs.lstat(file);
 if(!info.isFile()||info.isSymbolicLink()||info.size>limit)throw Error('World source contains an invalid file.');
 return new Uint8Array(await fs.readFile(file));
}},{expectedWorldId:config.worldId,expectedContentDigest:config.contentDigest});
if(loaded.identity.worldId!==config.worldId||loaded.identity.contentDigest!==config.contentDigest)throw Error('World source failed identity validation.');
const track=spawnSync('git',['-C',world,'ls-files','-z'],{encoding:'buffer',maxBuffer:1024*1024});
if(track.status!==0)throw Error('Cannot enumerate pinned world files.');
const tracked=new Set(track.stdout.toString('utf8').split('\0').filter(Boolean));
for(const ref of [...(loaded.project.nativeIsland?.resources??[]),...(loaded.project.nativeIsland?.assets??[])])needed.add(ref.path);
const selected=[...needed].sort();
const contentPath=/^(?:world\.json|(?:README|ATTRIBUTION|NATIVE-VEGETATION-CREDITS)\.md|LICENSE|assets\/[a-f0-9]{64}\.glb|native-island\/[a-f0-9]{64}\.bin|snapshots\/[a-f0-9]{64}\/[a-z-]+\.json|landscape-images\/[a-f0-9]{64}\.(?:png|jpg)|imagery\/[a-f0-9]{64}\.(?:png|jpg))$/;
let total=0;
if(selected.length>5000)throw Error('World repository has too many files.');
for(const relative of selected){
 if(!tracked.has(relative))throw Error('Referenced world content is not committed.');
 if(!contentPath.test(relative))throw Error('World repository contains an unsupported packaged path.');
 const file=path.join(world,relative),info=await fs.lstat(file);
 if(!info.isFile()||info.isSymbolicLink())throw Error('World repository contains a non-file or link.');
 total+=info.size;if(total>120*1024*1024)throw Error('World repository exceeds the package byte limit.');
}
const buildFiles=['index.html','worlds.html','assets','clouds','textures/smaa','images/loz-warehouse-island.svg'];
const characterFiles=['stock-player.glb','stock-female.glb','stock-player-medium.glb','stock-player-low.glb','stock-female-medium.glb','stock-female-low.glb','avatar-male.png','avatar-female.png','LICENSE-Rocketbox.md'];
for(const name of buildFiles)await fs.access(path.join(build,name));
for(const name of characterFiles)await fs.access(path.join(build,'models/characters',name));
async function inspect(directory){
 const info=await fs.lstat(directory);if(info.isSymbolicLink())throw Error('Build contains a symbolic link.');
 if(info.isDirectory())for(const entry of await fs.readdir(directory))await inspect(path.join(directory,entry));
 else if(!info.isFile())throw Error('Build contains a non-file.');
}
for(const name of buildFiles)await inspect(path.join(build,name));
for(const name of characterFiles)await inspect(path.join(build,'models/characters',name));
await fs.mkdir(output);
for(const name of buildFiles){const target=path.join(output,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.cp(path.join(build,name),target,{recursive:true,force:false,errorOnExist:true});}
for(const name of characterFiles){const target=path.join(output,'models/characters',name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(build,'models/characters',name),target);}
const worldTarget=path.join(output,bundlePath);await fs.mkdir(worldTarget,{recursive:true});
for(const relative of selected){const target=path.join(worldTarget,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(world,relative),target);}
await fs.copyFile(new URL('../public/opening-credits.html',import.meta.url),path.join(output,'credits.html'));
const notices=[['LICENSE','LICENSE'],['src/world-runtime/vendor/THREE-LICENSE.txt','licenses/THREE-LICENSE.txt'],['src/world-runtime/vendor/FONT-LICENSE.txt','licenses/FONT-LICENSE.txt'],['src/world-runtime/vendor/ESBUILD-LICENSE.txt','licenses/ESBUILD-LICENSE.txt'],['src/vendor/basic-m6502/LICENSE','licenses/BASIC-M6502-LICENSE.txt']];
for(const [from,to] of notices){const target=path.join(output,to);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(new URL('../'+from,import.meta.url),target);}
await fs.writeFile(path.join(output,'opening-world.json'),JSON.stringify({...config,schema:'elsemesh.opening-world/2',bundlePath},null,2)+'\n');
await fs.copyFile(new URL('./serve-opening-world.mjs',import.meta.url),path.join(output,'start-local.mjs'));
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log(JSON.stringify({worldId:config.worldId,repositoryCommit:source.ref,contentDigest:config.contentDigest,worldFiles:selected.length,worldBytes:total,output}));
