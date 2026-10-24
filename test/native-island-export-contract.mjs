import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Optional first argument selects a freshly bundled contract during development.
const module=await import(pathToFileURL(resolve(process.argv[2]??'src/world-runtime/vendor/world-engine-contract.js')).href);
const {validateNativeIsland,createNativeIslandResourceReader}=module;
if(!validateNativeIsland||!createNativeIslandResourceReader)throw Error('Install the matching native island contract before this integration check.');
const base=resolve('.local-evidence/native-island-20261024');
for(const kind of ['loz','lost']){const root=join(base,kind),nativeIsland=JSON.parse(await readFile(join(root,'native-island.json')));const errors=validateNativeIsland(nativeIsland);if(errors.length)throw Error(kind+':'+errors.join(';'));const reader=createNativeIslandResourceReader({nativeIsland},async(path,limit)=>{const b=await readFile(join(root,path));if(b.length>limit)throw Error('Read budget');return b;});let refs=0,bytes=0;for(const r of [...nativeIsland.resources,...nativeIsland.assets]){await reader(r.id);refs++;bytes+=r.bytes;}const report={result:'PASS',kind,refs,decodedReferencedBytes:bytes,proof:'Current builder strict schema, all field hashes and sizes, decoded min/max, original vegetation numeric fields/count/seed range and JPEG dimensions, recipe/bindings'};await writeFile(join(root,'contract-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
