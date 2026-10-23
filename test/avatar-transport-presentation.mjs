import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../src/engine/index.js';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {createPortalEffects,createClosedPortalRimGeometry} from '../src/world-runtime/RepositoryPortalEffects.js';
import {createAvatarTransportPresentation} from '../src/world-runtime/AvatarTransportPresentation.js';
const record={protocol:'elsemesh.portal-presentation/1',type:'portal-arrival',transferId:'transfer:1',playerNodeId:'elsemesh-node:abc',playerId:'player:abc',sourceWorldId:'A',destinationWorldId:'B',destinationGeneration:1,authorityEpoch:1,committedAt:1000,expiresAt:4000};
test('closed electrical strip includes exact corners and matched vertex-jitter seam',()=>{
 const g=createClosedPortalRimGeometry(2,3),p=g.getAttribute('position'),uv=g.getAttribute('uv');
 assert.deepEqual([p.getX(0),p.getY(0)],[p.getX(p.count-2),p.getY(p.count-2)]);assert.equal(uv.getX(0),uv.getX(uv.count-2));
 for(const [x,y]of [[-1.13,-1.63],[1.13,-1.63],[1.13,1.63],[-1.13,1.63]])assert.ok(Array.from({length:p.count/2},(_,i)=>Math.hypot((p.getX(i*2)+p.getX(i*2+1))/2-x,(p.getY(i*2)+p.getY(i*2+1))/2-y)).some(d=>d<1e-5),'corner missing');
 for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getX(i))>=1.09||Math.abs(p.getY(i))>=1.59,'open aperture invaded');g.dispose();
});
for(const webgl of [true,false])test('actual avatar scene effect has finite authority-timed replay-safe lifetime '+webgl,()=>{
 const E=webgl?T:N,root=new E.Group(),states=[];let clock=1000;
 const p=createAvatarTransportPresentation({root,isWebGL:webgl,now:()=>clock,materialAdapter:{setState:s=>states.push(s)}});assert.equal(root.children.length,1);
 assert.equal(p.observeVerifiedTransfer(record,'A'),false);assert.equal(p.observeVerifiedTransfer(record,'B'),true);assert.equal(p.diagnostics().progress,0);assert.equal(p.observeVerifiedTransfer(record,'B'),false);
 clock=1750;p.update();assert.equal(p.diagnostics().progress,.5);assert.equal(states.at(-1).active,true);
 assert.ok(p.group.children.some(m=>m.name.includes('scan')));clock=2500;p.update();assert.equal(p.diagnostics().active,false);assert.equal(states.at(-1).active,false);assert.equal(states.at(-1).progress,1);
 assert.equal(p.observeVerifiedTransfer({...record,transferId:'late'},'B'),false);
 clock=2000;const late=createAvatarTransportPresentation({root,isWebGL:webgl,now:()=>clock});assert.equal(late.observeVerifiedTransfer(record,'B'),true);assert.ok(Math.abs(late.diagnostics().progress-2/3)<1e-8,'late observation restarted visual clock');late.dispose();
 p.dispose();p.dispose();assert.equal(root.children.length,0);assert.equal(states.at(-1).active,false);
});
test('resident root preservation retains all explicitly owned portal frames',()=>{
 const scene=new T.Group(),a=new T.Group(),b=new T.Group(),e=createPortalEffects({isWebGL:true});scene.add(a,b);const portal={id:'a',position:[0,0,0],width:2,height:3,visual:{frameColor:'#33ddff'}};e.addFrame(a,portal);e.addFrame(b,portal);e.clear({preserveRoots:new Set([a,b])});assert.equal(e.diagnostics().continuousPerimeters,2);e.removeRoot(a);assert.equal(e.diagnostics().continuousPerimeters,1);e.dispose();
});
