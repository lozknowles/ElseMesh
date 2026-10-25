import {readFile,writeFile,mkdir,copyFile,realpath,readdir,lstat,cp} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {SourceTextModule} from 'node:vm';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const check=(v,m)=>{if(!v)throw Error(m);};
/** Package an already-built application; no compiler or install hooks run on players' machines. */
export async function packageOwnerRuntime(output,{staticRoot=join(source,'dist')}={}){
 output=resolve(output);staticRoot=await realpath(staticRoot);
 check(!relative(source,output).startsWith('..')?relative(source,output).startsWith('.local-evidence/'):true,'Package output must not overwrite source');
 check(output!==source&&output!==staticRoot&&!source.startsWith(output+'/')&&!staticRoot.startsWith(output+'/'),'Overlapping package output');
 await mkdir(output);const selected=new Set(),queue=['tools/networking/owner-world-runtime.mjs','tools/networking/owner-world-setup.mjs'];
 while(queue.length){const name=queue.pop();if(selected.has(name))continue;check(!name.startsWith('..')&&!name.includes('node_modules'),'Invalid application source path');const path=join(source,name),info=await lstat(path);check(info.isFile()&&!info.isSymbolicLink(),'Application source must be an ordinary file');const text=await readFile(path,'utf8');selected.add(name);
  const imports=new SourceTextModule(text,{identifier:name}).dependencySpecifiers;
  for(const spec of imports){if(spec.startsWith('node:')||spec==='ws')continue;check(spec.startsWith('.'),'Unpackaged dependency '+spec);const target=relative(source,resolve(dirname(path),spec));check(!target.startsWith('..'),'Dependency outside application');queue.push(target);}
 }
 for(const name of selected){await mkdir(dirname(join(output,name)),{recursive:true});await copyFile(join(source,name),join(output,name));}
 const wsRoot=await realpath(join(source,'node_modules/ws'));
 await mkdir(join(output,'node_modules'),{recursive:true});await cp(wsRoot,join(output,'node_modules/ws'),{recursive:true,dereference:false,filter:async p=>{check(!(await lstat(p)).isSymbolicLink(),'Dependency symlink denied');return true;}});
 await cp(staticRoot,join(output,'dist'),{recursive:true,dereference:false,filter:async p=>{check(!(await lstat(p)).isSymbolicLink(),'Static symlink denied');return true;}});
 for(const name of ['LICENSE','docs/owner-world-setup.md','docs/owner-world-runtime.md','docs/owner-world-authority.md','docs/owner-peer-transport.md','docs/PLAYER_EYES.md','docs/PLAYER_EYES_PROTOCOL.md','docs/PLAYER_EYES_LAB.md','src/world-runtime/vendor/world-engine-contract.provenance.json','src/world-runtime/vendor/THREE-LICENSE.txt','src/world-runtime/vendor/FONT-LICENSE.txt','src/world-runtime/vendor/ESBUILD-LICENSE.txt']){await mkdir(dirname(join(output,name)),{recursive:true});await copyFile(join(source,name),join(output,name));}
 await writeFile(join(output,'package.json'),JSON.stringify({name:'elsemesh-owner-runtime',private:true,type:'module',description:'Prebuilt ElseMesh per-player world runtime; requires Node.js 24 or later and Git. No install scripts.'},null,2)+'\n');
 await writeFile(join(output,'README.txt'),'ElseMesh owner runtime\nRequires Node.js 24 or later and Git. No npm install or build on player machines.\nRun: node tools/networking/owner-world-setup.mjs --help\nOwner keys/configuration/ledger stay outside this application and outside world repositories.\nGod view: players explicitly share avatar-eye views with chosen recipients for up to one minute. Sharing stops at world/session change. See docs/PLAYER_EYES_PROTOCOL.md.\n');
 const files=[];async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name);check(!item.isSymbolicLink(),'Package symlink denied');if(item.isDirectory())await walk(p);else{const bytes=await readFile(p);files.push({path:relative(output,p).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}await walk(output);files.sort((a,b)=>a.path.localeCompare(b.path));
 const receipt={schema:'elsemesh.owner-runtime-package/1',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sourceState:execFileSync('git',['status','--porcelain'],{cwd:source,encoding:'utf8'}).trim()?'DIRTY-PROTOTYPE-NOT-RELEASE':'clean',files};await writeFile(join(output,'package-manifest.json'),JSON.stringify(receipt,null,2)+'\n');return {output,sourceCommit:receipt.sourceCommit,sourceState:receipt.sourceState,files:files.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const out=process.argv.find(a=>a.startsWith('--output='));check(out,'Usage on the build host: node --experimental-vm-modules tools/package-owner-runtime.mjs --output=<fresh-directory>');console.log(JSON.stringify(await packageOwnerRuntime(out.slice(9))));}
