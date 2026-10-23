import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../src/engine/index.js';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {createPortalEffects,PORTAL_STORM_SOURCE} from '../src/world-runtime/RepositoryPortalEffects.js';
const portal={id:'a',position:[3,4,5],yaw:.3,width:2,height:3,visual:{frameColor:'#33ddff'}};
for(const isWebGL of [false,true])test('electric rim retains an open centre and animates on '+(isWebGL?'WebGL':'native'),()=>{
 const E=isWebGL?T:N,root=new E.Group(),effects=createPortalEffects({isWebGL});
 const frame=effects.addFrame(root,portal);assert.deepEqual(frame.position.toArray(),portal.position);assert.equal(frame.rotation.y,portal.yaw);
 const arcs=frame.children.filter(c=>c.name==='Portal electrical storm arc');assert.equal(arcs.length,8);assert.equal(frame.children.length,13);
 for(const arc of arcs){const p=arc.geometry.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getX(i))>portal.width/2+.09||Math.abs(p.getY(i))>portal.height/2+.09,'geometry stays on outside rim');}
 const before=arcs[0].geometry.getAttribute('position').array.slice();effects.update(.05,1);assert.notDeepEqual(arcs[0].geometry.getAttribute('position').array,before);
 assert.equal(effects.diagnostics().source,PORTAL_STORM_SOURCE);
 effects.transition('preparing');assert.equal(effects.diagnostics().beamVisible,false);
 effects.transition('handoff-pending');assert.equal(effects.diagnostics().beamVisible,true);
 for(let i=0;i<30;i++){effects.transition('handoff-pending');effects.update(.05,i*.05);}assert.equal(effects.diagnostics().beamVisible,false,'long pending transfers cannot loop departure effect');
 effects.transition('active');assert.equal(effects.diagnostics().beamVisible,true);effects.transition('outcome-unknown');assert.equal(effects.diagnostics().beamVisible,false);
 effects.clear();assert.equal(root.children.length,0);assert.equal(effects.diagnostics().frames,0);effects.dispose();effects.dispose();
});
