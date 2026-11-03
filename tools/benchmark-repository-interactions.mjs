import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {effectiveObjectState,resolveWorldMatrices} from '../src/world-runtime/vendor/world-engine-contract.js';
import {Vector3} from '../src/engine/index.js';
import {nearestRepositoryComputer,nearestRepositoryMedia} from '../src/world-runtime/RepositoryInteractions.js';
const path=process.argv[2];if(!path)throw Error('Pass the pinned Warehouse snapshot objects.json path');
const bytes=fs.readFileSync(path),objects=JSON.parse(bytes),matrices=resolveWorldMatrices(objects);
const active={project:{objects},matrices,player:{position:new Vector3()}},camera=new Vector3();
// Exact pre-change queries, including the visibility helper's per-call map build.
function oldComputer(){let found=null,best=3;for(const object of active.project.objects){if(object.kind!=='computer'||!effectiveObjectState(active.project.objects,object.id).visible)continue;const matrix=active.matrices.get(object.id);const point=new Vector3().setFromMatrixPosition(matrix);point.y+=.5;const distance=point.distanceTo(camera);if(distance<best){best=distance;found=object;}}return found;}
function oldMedia(){let found=null,best=Infinity;const feet=active.player.position;for(const o of active.project.objects){if(o.kind!=='media-screen'||!effectiveObjectState(active.project.objects,o.id).visible)continue;const m=active.matrices.get(o.id);if(!m)continue;const d=Math.hypot(m.elements[12]-feet.x,m.elements[13]-(feet.y+1.65),m.elements[14]-feet.z);if(d<Math.min(8,Math.max(3,o.mediaScreen.width))&&d<best){found=o;best=d;}}return found;}
const tv=objects.find(o=>o.kind==='media-screen');assert.ok(tv);const e=matrices.get(tv.id).elements;
const poses=[0,.5,1,2,2.99,3,4,7.99,8,8.01,20,100].map((offset,i)=>[e[12]+offset,e[13]-1.65+(i%3===0?.1:0),e[14]+(i%2===0?.1:0)]);
function pose(i){active.player.position.fromArray(poses[i%poses.length]);camera.copy(active.player.position);camera.y+=1.62;}
const parity=[];for(let i=0;i<poses.length;i++){pose(i);assert.equal(nearestRepositoryComputer(active,camera),oldComputer());assert.equal(nearestRepositoryMedia(active),oldMedia());parity.push({pose:poses[i],media:oldMedia()?.id??null,computer:oldComputer()?.id??null});}
assert.ok(parity.some(p=>p.media));assert.ok(parity.some(p=>!p.media));
const iterations=12000,rounds=5;let sink=0;
function measure(fn,count=iterations){for(let i=0;i<2000;i++){pose(i);sink+=!!fn();}const samples=[];for(let round=0;round<rounds;round++){const cpu=process.cpuUsage(),start=performance.now();for(let i=0;i<count;i++){pose(i);sink+=!!fn();}const elapsed=performance.now()-start,used=process.cpuUsage(cpu);samples.push({wallUs:elapsed*1000/count,cpuUs:(used.user+used.system)/count});}return {iterations:count,medianCpuUs:samples.map(s=>s.cpuUs).sort((a,b)=>a-b)[2],medianWallUs:samples.map(s=>s.wallUs).sort((a,b)=>a-b)[2],samples};}
const results={oldMedia:measure(oldMedia),newMedia:measure(()=>nearestRepositoryMedia(active),6000000),oldComputer:measure(oldComputer),newComputer:measure(()=>nearestRepositoryComputer(active,camera),6000000),
 oldNoKeyFrameQueries:measure(()=>{const a=oldMedia(),b=oldComputer(),c=oldMedia();return a||b||c;}),newNoKeyFrameQueries:measure(()=>nearestRepositoryComputer(active,camera)||nearestRepositoryMedia(active),6000000)};
console.log(JSON.stringify({path,sha256:createHash('sha256').update(bytes).digest('hex'),objects:objects.length,media:objects.filter(o=>o.kind==='media-screen').length,computers:objects.filter(o=>o.kind==='computer').length,iterations,rounds,parity,results,sink},null,2));
