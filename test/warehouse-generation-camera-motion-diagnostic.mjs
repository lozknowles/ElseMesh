import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {runWarehouseGenerationCameraMotionOracle} from '../tools/performance/warehouse-generation-camera-motion-oracle.mjs';

// Validate the actual serialized browser entry boundary. These CPU checks do
// not replace the retained, failed GPU motion/visual qualification.
const runInWindow=window=>vm.runInNewContext('('+runWarehouseGenerationCameraMotionOracle.toString()+')',{window});
test('missing native frame gate rejects before changing diagnostic state',async()=>{
 const benchmark={splatOracleGateAvailable:true,splatOraclePaused:false,scenario:null};
 const window={__warehouseBenchmark:benchmark,__repositoryWorldApp:{backend:'webgl2'}};
 await assert.rejects(runInWindow(window)(),/Post-ready gate and native oracleRequestFrame required/);
 assert.equal(benchmark.splatOraclePaused,false);
});
test('invalid bounds reject before prototype installation or app access',async()=>{
 let installed=false;
 const benchmark={splatOracleGateAvailable:true,oracleRequestFrame:()=>{},splatOraclePaused:false,scenario:null};
 const window={__warehouseBenchmark:benchmark,__repositoryWorldApp:{backend:'webgl2'},__installCanonicalGenerationPrototype:()=>{installed=true;throw Error('Unexpected install');}};
 await assert.rejects(runInWindow(window)({timeoutMs:90000,framesPerPhase:0}),/Invalid bounded oracle options/);
 assert.equal(installed,false);
 assert.equal(benchmark.splatOraclePaused,false);
});
