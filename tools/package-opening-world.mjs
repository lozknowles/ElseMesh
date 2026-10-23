import fs from 'node:fs/promises';
import path from 'node:path';
import {validateOpeningWorld} from '../src/world-runtime/OpeningWorld.js';

// Package only an already-built engine and operator-supplied public selection.
// Authored world files remain in their independent repository.
const [buildArg,configArg,outputArg]=process.argv.slice(2);
if(!buildArg||!configArg||!outputArg)throw Error('Usage: node tools/package-opening-world.mjs BUILD CONFIG NEW_OUTPUT_DIRECTORY');
const build=await fs.realpath(path.resolve(buildArg));
const requestedOutput=path.resolve(outputArg);
const output=path.join(await fs.realpath(path.dirname(requestedOutput)),path.basename(requestedOutput));
const relativeOutput=path.relative(build,output);
if(!relativeOutput||(!relativeOutput.startsWith('..'+path.sep)&&relativeOutput!=='..'&&!path.isAbsolute(relativeOutput)))throw Error('Output must be outside the build directory.');
const configBytes=await fs.readFile(configArg);
if(configBytes.length>8192)throw Error('Opening configuration exceeds 8 KB.');
const config=JSON.parse(configBytes.toString('utf8'));validateOpeningWorld(config);
try{await fs.lstat(output);throw Error('Output directory already exists. Choose a new staging directory.');}catch(error){if(error.code!=='ENOENT')throw error;}
async function inspectBuild(directory){
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw Error('Build must not contain symbolic links.');
    if(entry.isDirectory())await inspectBuild(path.join(directory,entry.name));
    else if(!entry.isFile())throw Error('Build must contain only ordinary files and directories.');
  }
}
await inspectBuild(build);
for(const reserved of ['legacy.html','opening-world.json','.nojekyll']){
  try{await fs.lstat(path.join(build,reserved));throw Error('Build contains reserved packaging path: '+reserved);}catch(error){if(error.code!=='ENOENT')throw error;}
}
const legacy=await fs.readFile(path.join(build,'index.html'),'utf8'),runtime=await fs.readFile(path.join(build,'worlds.html'),'utf8');
if(!runtime.includes('id="legacy-game"')||!runtime.includes('href="./index.html"'))throw Error('Repository runtime entry is missing its legacy link.');
const publicRuntime=runtime.replace('href="./index.html"','href="./legacy.html"');
const entryPages=new Map();
for(const name of ['play-online.html','network-demo.html']){
  const html=await fs.readFile(path.join(build,name),'utf8');
  if(!/<html(?:\s|>)/i.test(html)||/data-game-entry\s*=/i.test(html))throw Error('Unexpected game entry HTML: '+name);
  entryPages.set(name,html.replace(/<html(?=\s|>)/i,'<html data-game-entry="./legacy.html"'));
}
// Reserve the destination atomically. A failure leaves a partial staging folder;
// it is never published by this tool and is never overwritten on another run.
await fs.mkdir(output);
for(const entry of await fs.readdir(build)){
  await fs.cp(path.join(build,entry),path.join(output,entry),{recursive:true,errorOnExist:true,force:false});
}
await fs.writeFile(path.join(output,'legacy.html'),legacy,{flag:'wx'});
await fs.writeFile(path.join(output,'index.html'),publicRuntime);
await fs.writeFile(path.join(output,'worlds.html'),publicRuntime);
for(const [name,html]of entryPages)await fs.writeFile(path.join(output,name),html);
await fs.writeFile(path.join(output,'opening-world.json'),JSON.stringify(config,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(output,'.nojekyll'),'',{flag:'wx'});
console.log('Packaged immutable opening world; original game preserved as legacy.html.');
