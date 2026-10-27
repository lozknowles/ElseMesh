import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Exercise the real CLI handoff/failure boundary, without pretending mocks qualify GPU output.
const source=fs.readFileSync(new URL('../tools/performance/warehouse-fps-benchmark.mjs',import.meta.url),'utf8');
const start=source.indexOf(' if(report.rotationOracleRequested||report.generationCameraOracleRequested){\n  const name=');
const end=source.indexOf(' if(report.splatKeyOracleRequested){',start);
assert.ok(start>=0&&end>start,'Actual CLI oracle boundary must exist');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const execute=new AsyncFunction('page','report','progress','installCanonicalGenerationPrototype','runCanonicalQualification','runWarehouseRotationOracle','output','writeFile',source.slice(start,end));
function fixture(result,{throws=false,injectionFails=false,enabled=true}={}){
 const calls=[];
 const page={async addScriptTag(){calls.push('inject');if(injectionFails)throw Error('injection failed');},async evaluate(){calls.push('evaluate');if(throws)throw Error('browser closed');return result;}};
 const report={generationCameraOracleRequested:enabled,rotationOracleRequested:false};
 return {report,calls,run:()=>execute(page,report,()=>{},function install(){},async function qualify(){},async function rotation(){},'work/test.json',async()=>{calls.push('write');})};
}
test('default path does not inject or execute prototype',async()=>{const f=fixture(null,{enabled:false});await f.run();assert.deepEqual(f.calls,[]);assert.equal(f.report.generationCameraOracle,undefined);});
test('successful explicit qualification retains result',async()=>{const result={status:'settled-output-qualified-external-only',passed:true,sessionInvalidated:false},f=fixture(result);await f.run();assert.deepEqual(f.calls,['inject','evaluate']);assert.equal(f.report.generationCameraOracle,result);});
test('pixel rejection prevents subsequent CLI checks',async()=>{const f=fixture({status:'qualification-rejected',passed:false,sessionInvalidated:false});await assert.rejects(f.run(),/failed or rejected/);assert.equal(f.report.generationCameraOracle.passed,false);});
test('restoration invalidation defeats an otherwise passing result',async()=>{const f=fixture({status:'unavailable-or-failed',passed:true,sessionInvalidated:true});await assert.rejects(f.run(),/failed or rejected/);});
test('browser evaluation failure is recorded and rejects',async()=>{const f=fixture(null,{throws:true});await assert.rejects(f.run(),/failed or rejected/);assert.equal(f.report.generationCameraOracle.sessionInvalidated,true);assert.match(f.report.generationCameraOracle.error,/browser closed/);});
test('injection failure prevents evaluation',async()=>{const f=fixture(null,{injectionFails:true});await assert.rejects(f.run(),/injection failed/);assert.deepEqual(f.calls,['inject']);});

const oracle=fs.readFileSync(new URL('../tools/performance/warehouse-generation-camera-oracle.mjs',import.meta.url),'utf8');
const proofExpression=oracle.match(/work\.proved=([^;]+);report\.workReduction=work/)[1];
const provesWork=new Function('work','return '+proofExpression);
const completeWork=()=>({A:{steps:12,readbacks:12,sorts:12},B:{steps:12,readbacks:0,sorts:0,canonicalCalls:12},translation:{steps:6,readbacks:6,sorts:6}});
test('work proof requires every expected baseline and translation operation',()=>{assert.equal(provesWork(completeWork()),true);for(const [section,field]of [['A','steps'],['A','readbacks'],['A','sorts'],['B','steps'],['B','canonicalCalls'],['translation','steps'],['translation','readbacks'],['translation','sorts']]){const work=completeWork();work[section][field]--;assert.equal(provesWork(work),false,section+'.'+field);}for(const field of ['readbacks','sorts']){const work=completeWork();work.B[field]=1;assert.equal(provesWork(work),false,field);}});
