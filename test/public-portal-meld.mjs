import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicPortalMeld} from '../src/world-runtime/PublicPortalMeld.js';
function fixture({waapi=true}={}){
 const events=()=>({handlers:new Map(),addEventListener(k,v){this.handlers.set(k,v);},removeEventListener(k){this.handlers.delete(k);}});
 const source={identity:{worldId:'A'}},destination={identity:{worldId:'B'}},motion={...events(),matches:false};let time=0,copies=0,created=0;
 const canvas={...events(),width:1600,height:900,getBoundingClientRect:()=>({left:0,top:0,width:800,height:450})};
 const doc={...events(),visibilityState:'visible',body:{append(){}},createElement(){created++;return {...events(),style:{},dataset:{},animate:waapi?function(keyframes,options){this.animation={keyframes,options,currentTime:0,playState:'running',cancel(){this.playState='idle';},finish(){this.playState='finished';this.currentTime=380;this.onfinish?.();}};return this.animation;}:undefined,setAttribute(){},getContext:()=>({drawImage(c,x,y,w,h){assert.equal(c,canvas);assert.equal(w,canvas.width);assert.equal(h,canvas.height);copies++;}}),remove(){this.removed=true;}};}};
 const win={...events(),matchMedia:()=>motion},meld=new PublicPortalMeld({canvas,document:doc,window:win,now:()=>time});
 const request=()=>meld.request({source,generation:3,destinationWorldId:'B'}),frame=(active=source,generation=3,eligible=true)=>meld.afterFrame({active,generation,eligible});
 return {meld,source,destination,canvas,doc,win,motion,request,frame,setTime:v=>time=v,copies:()=>copies,created:()=>created};
}
test('idle frames allocate/copy nothing; source captures once and authorized destination dissolves over 380ms',()=>{
 const f=fixture();for(let i=0;i<100;i++)f.frame();assert.equal(f.created(),0);
 const t=f.request();assert.equal(f.copies(),0);f.frame();f.frame();assert.equal(f.copies(),1);assert.match(f.meld.overlay.style.cssText,/display:none/);
 f.meld.authorize(t,f.destination,4);assert.match(f.meld.overlay.style.cssText,/display:none/);f.frame(f.destination,4);assert.equal(f.meld.overlay.style.display,'block');assert.equal(f.meld.diagnostics().shown,1);
 const animation=f.meld.overlay.animation;assert.deepEqual(animation.keyframes,[{opacity:1},{opacity:0}]);assert.equal(animation.options.duration,380);assert.equal(f.meld.overlay.style.opacity,'0');
 // Finish without another game frame: native opacity is autonomous.
 f.setTime(380);animation.finish();assert.equal(f.meld.overlay,null);assert.equal(f.copies(),1);f.meld.dispose();
});
test('missing source frame and wrong destination cannot show an image',()=>{
 for(const capture of [false,true]){const f=fixture(),t=f.request();if(capture)f.frame();f.meld.authorize(t,{identity:{worldId:'C'}},4);f.frame(f.destination,4);assert.equal(f.meld.ticket,null);assert.equal(f.meld.diagnostics().shown,0);f.meld.dispose();}
 const f=fixture(),t=f.request();f.meld.authorize(t,f.destination,4);assert.equal(f.meld.ticket,null);f.meld.dispose();
});
test('new reversal invalidates old snapshot and stale authorization cannot erase the new request',()=>{
 const f=fixture(),old=f.request();f.frame();const current=f.request();f.meld.authorize(old,f.destination,4);assert.equal(f.meld.ticket,current);f.frame();assert.equal(f.copies(),2);f.meld.cancel();f.meld.dispose();
});
test('shared eyes, media, source changes and resize invalidate before capture or presentation',()=>{
 for(const invalidate of [f=>f.frame(f.source,3,false),f=>f.frame(f.destination,4),f=>{f.canvas.width++;f.frame();},f=>f.win.handlers.get('resize')(),f=>f.canvas.handlers.get('webglcontextlost')(),f=>f.win.handlers.get('pagehide')()]){const f=fixture();f.request();invalidate(f);assert.equal(f.meld.ticket,null);assert.equal(f.copies(),0);f.meld.dispose();}
 const f=fixture(),t=f.request();f.frame();f.meld.authorize(t,f.destination,4);f.frame(f.destination,5);assert.equal(f.meld.ticket,null);f.meld.dispose();
});
test('reduced motion disables capture and disposal removes event handlers',()=>{
 const f=fixture();f.motion.matches=true;assert.equal(f.request(),null);f.frame();assert.equal(f.copies(),0);f.meld.dispose();assert.equal(f.canvas.handlers.size,0);assert.equal(f.win.handlers.size,0);assert.equal(f.doc.handlers.size,0);
});

test('a valid captured pending source survives preparation delays beyond 1.5 seconds without extra copies',async()=>{
 const f=fixture(),t=f.request();f.frame();assert.equal(f.meld.overlay.width,1600);assert.equal(f.meld.overlay.height,900);
 await new Promise(resolve=>setTimeout(resolve,1550));f.setTime(10000);f.frame();assert.equal(f.meld.ticket,t);assert.equal(f.copies(),1);
 f.meld.authorize(t,f.destination,4);f.frame(f.destination,4);assert.equal(f.meld.diagnostics().shown,1);f.setTime(10380);f.meld.overlay.animation.finish();assert.equal(f.meld.ticket,null);f.meld.dispose();
});
test('a hidden captured source is discarded if an intervening non-ordinary view is rendered',()=>{
 const f=fixture(),t=f.request();f.frame();f.frame(f.source,3,false);f.meld.authorize(t,f.destination,4);f.frame(f.destination,4);assert.equal(f.meld.ticket,null);assert.equal(f.meld.diagnostics().shown,0);f.meld.dispose();
});

test('stale native finish cannot cancel a reversal and context mismatch never records completion',()=>{
 const f=fixture(),t=f.request();f.frame();f.meld.authorize(t,f.destination,4);f.frame(f.destination,4);const stale=f.meld.overlay.animation.onfinish;const next=f.request();stale();assert.equal(f.meld.ticket,next);f.meld.cancel();
 const last=f.request();f.frame();f.meld.authorize(last,f.destination,4);f.frame(f.destination,4);f.meld.getContext=()=>({active:f.source,generation:5});f.meld.overlay.animation.finish();assert.equal(f.meld.finished,0);assert.equal(f.meld.ticket,null);f.meld.dispose();
});
test('CSS fallback fades and cleans up without a game frame; reduced motion cancels an in-flight animation',()=>{
 const f=fixture({waapi:false}),t=f.request();f.frame();f.meld.authorize(t,f.destination,4);f.frame(f.destination,4);assert.equal(f.meld.diagnostics().method,'css');assert.match(f.meld.overlay.style.animation,/380ms/);f.meld.overlay.handlers.get('animationend')();assert.equal(f.meld.ticket,null);assert.equal(f.meld.finished,1);f.meld.dispose();
 const g=fixture(),u=g.request();g.frame();g.meld.authorize(u,g.destination,4);g.frame(g.destination,4);const animation=g.meld.overlay.animation;g.motion.matches=true;g.motion.handlers.get('change')();assert.equal(g.meld.ticket,null);assert.equal(animation.playState,'idle');g.meld.dispose();
});
