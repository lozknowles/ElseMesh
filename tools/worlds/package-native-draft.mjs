import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadWorldSource,packWorldRepository} from '../../src/world-runtime/vendor/world-engine-contract.js';
export async function packageNativeDraft({kind='loz',evidenceRoot=resolve(process.env.ELSEMESH_NATIVE_EVIDENCE_ROOT??'.local-evidence/native-island-20261024'),sourceRoot=process.env.ELSEMESH_WORLD_ROOT,outputRoot=process.env.ELSEMESH_OUTPUT_ROOT}={}){
 if(!sourceRoot||!outputRoot)throw Error('Native draft packaging requires sourceRoot and outputRoot arguments or ELSEMESH_WORLD_ROOT and ELSEMESH_OUTPUT_ROOT.');
 const readRoot=root=>async(path,limit)=>{const bytes=await readFile(join(root,path));if(bytes.length>limit)throw Error('Read budget exceeded');return bytes;};
 const loaded=await loadWorldSource({kind:'local',label:kind,read:readRoot(sourceRoot)}),before=loaded.project,project=structuredClone(before),capture=join(evidenceRoot,kind);
 project.nativeIsland=JSON.parse(await readFile(join(capture,'native-island.json')));
 const files=await packWorldRepository(project,{nativeIslandRead:readRoot(capture),attribution:{authors:['ElseMesh contributors','DRG Software Solutions LLC'],license:'MIT; CC0 bark assets see native resource credits',source:'Trusted offline first-island seed7 exact field/scatter capture'},provenance:{sourceLocation:'Trusted offline original TerrainData scalar fields and exact CPU TerrainBake, ShoreField, vegetation Scatter capture'}});
 await mkdir(outputRoot);for(const [path,bytes]of files){await mkdir(dirname(join(outputRoot,path)),{recursive:true});await writeFile(join(outputRoot,path),bytes,{flag:'wx'});}
 const after=await loadWorldSource({kind:'local',label:kind+' native draft',read:readRoot(outputRoot)});
 const invariant=['metadata','spawn','objects','assets','portals','terrain','environment','water','terminals','features','geography','objectAccess','welcome','traffic'];for(const key of invariant)if(JSON.stringify(before[key])!==JSON.stringify(after.project[key]))throw Error('Draft changed preserved '+key);
 const report={kind,sourceRoot,outputRoot,worldId:after.identity.worldId,contentDigest:after.identity.contentDigest,objects:after.project.objects.length,assets:after.project.assets.length,nativeRefs:after.project.nativeIsland.resources.length,preserved:invariant,state:'DRAFT; not admitted or published',nativeVisualAcceptance:'PENDING'};
 await writeFile(join(capture,'draft-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)packageNativeDraft({kind:process.argv[2]??'loz',sourceRoot:process.argv[3],outputRoot:process.argv[4],evidenceRoot:process.argv[5]}).catch(e=>{console.error(e);process.exitCode=1});
