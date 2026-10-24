import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OpeningProgress} from '../src/world-runtime/OpeningProgress.js';
test('real loading stages advance monotonically and a failure remains below 100%',()=>{
 const root={dataset:{}},label={textContent:''},bar={value:-1},percent={textContent:''},progress=new OpeningProgress({root,label,bar,percent});
 assert.equal(percent.textContent,'0%');
 progress.advance('renderer-ready');progress.advance('world-validated');progress.advance('reading-world');
 assert.equal(bar.value,50);assert.match(label.textContent,/validated/);
 progress.fail('bad content');assert.equal(bar.value,50);assert.equal(percent.textContent,'50%');assert.equal(root.dataset.failed,'');assert.match(label.textContent,/bad content/);
 assert.equal(progress.advance('first-frame'),false);
});
test('100% is reserved for first rendered world frame',()=>{
 const percent={textContent:''},progress=new OpeningProgress({root:{dataset:{}},label:{textContent:''},bar:{value:0},percent});
 for(const stage of ['renderer-ready','reading-world','manifest-verified','world-validated','scene-built','resources-ready','world-ready'])progress.advance(stage);
 assert.equal(progress.value,96);progress.advance('first-frame');assert.equal(percent.textContent,'100%');
});
