import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import * as N from '../src/engine/index.js';
import {Material} from '../src/engine/render/Material.js';
import {mediaLayout,buildMediaScreenHousing,projectMediaScreen,screenQuadTransform,mediaScreenUnobstructed,collectMediaScreenOccluders,mediaScreenSurfaceExcluded,youtubeEmbedURL,MediaScreen} from '../src/world-runtime/MediaScreen.js';
const config={schema:'elsemesh.media-screen/1',provider:'youtube',videoId:'N-V7VpmoPkU',width:6.4},volume={id:'warehouse:surface:interior-01',min:[-14.5,3.1,-90.5],max:[14.5,8.5,-63.5]};
function fixture(){const camera=new T.PerspectiveCamera(65,16/9,.1,1000);camera.position.set(6.5,4.65,-82);camera.lookAt(6.5,5.2,-89.8);camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();const matrix=new T.Matrix4().makeTranslation(6.5,5.2,-89.8),viewport={left:0,top:0,width:1280,height:720},projection=projectMediaScreen(camera,matrix,config,viewport),root=new T.Group(),active={root,matrices:new Map([['tv',matrix]]),project:{environment:{windSpeed:5}}};return{camera,matrix,viewport,projection,root,active};}
test('TV geometry faces +Z in both original renderer APIs; strict IDs and private embed origin',()=>{for(const [api,material]of [[T,p=>new T.MeshStandardMaterial(p)],[N,p=>new Material(p)]]){const housing=buildMediaScreenHousing(config,{api,material});assert.equal(housing.children.length,3);assert(housing.children[1].position.z>0);for(const mesh of housing.children){mesh.geometry.dispose();mesh.material.dispose();}}assert.equal(mediaLayout(config).height,3.6);assert.throws(()=>youtubeEmbedURL({...config,videoId:'https://evil.test'},'http://localhost:18893'));const url=new URL(youtubeEmbedURL(config,'http://localhost:18893'));assert.equal(url.origin,'https://www.youtube-nocookie.com');assert.equal(url.searchParams.get('origin'),'http://localhost:18893');assert.throws(()=>youtubeEmbedURL(config,'https://user:pass@evil.test/path'));});
test('projected screen is a perspective quad and refuses rear, offscreen and clipping views',()=>{const f=fixture();assert(f.projection);assert.match(screenQuadTransform(f.projection.quad),/^matrix3d/);f.camera.position.z=-95;f.camera.lookAt(6.5,5.2,-89.8);assert.equal(projectMediaScreen(f.camera,f.matrix,config,f.viewport),null);const g=fixture();g.camera.lookAt(100,4.65,-82);assert.equal(projectMediaScreen(g.camera,g.matrix,config,g.viewport),null);});
test('whole-screen occlusion includes non-colliding meshes and avatars; wall behind TV does not hide',()=>{const f=fixture(),back=new T.Mesh(new T.BoxGeometry(30,12,.3),new T.MeshBasicMaterial());back.position.set(0,6,-91);f.root.add(back);let result=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert(result.complete);assert(mediaScreenUnobstructed(f.projection,f.camera,result.bounds,result));const prop=new T.Mesh(new T.BoxGeometry(.5,.5,.5),new T.MeshBasicMaterial());prop.position.set(6.5,5,-86);prop.userData.collision='none';f.root.add(prop);result=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert.equal(mediaScreenUnobstructed(f.projection,f.camera,result.bounds,result),false);f.root.remove(prop);result=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv',avatarRoots:[prop]});assert.equal(mediaScreenUnobstructed(f.projection,f.camera,result.bounds,result),false);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,[],{complete:false}),false);});
test('water proof requires installed enforcement and ALL five points strictly inside SAME bounded volume',()=>{const f=fixture(),water={surfaceExclusionsEnforced:true,surfaceExclusions:[volume]};assert(mediaScreenSurfaceExcluded({water},f.projection,f.camera));assert.equal(mediaScreenSurfaceExcluded({water:{...water,surfaceExclusionsEnforced:false}},f.projection,f.camera),false);assert.equal(mediaScreenSurfaceExcluded({water:{...water,surfaceExclusions:[{...volume,max:[Infinity,8.5,-63.5]}]}},f.projection,f.camera),false);const old=f.camera.position.y;f.camera.position.y=3.1+.025;assert.equal(mediaScreenSurfaceExcluded({water},f.projection,f.camera),false);f.camera.position.y=old;assert.equal(mediaScreenSurfaceExcluded({water:{...water,surfaceExclusions:[{...volume,max:[14.5,8.5,-85]},{...volume,id:'other',min:[-14.5,3.1,-85]}]}},f.projection,f.camera),false);});
function fakeDOM(){const listeners=new Map(),messages=[];class Element{constructor(tag){this.tag=tag;this.style={};this.attributes={};this.children=[];this.contentWindow={postMessage:(...args)=>messages.push(args)};}append(...items){this.children.push(...items);}setAttribute(k,v){this.attributes[k]=v;}remove(){this.removed=true;}}const doc={body:new Element('body'),visibilityState:'visible',createElement:t=>new Element(t),exitPointerLock(){},addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)},win={location:{origin:'http://localhost:18893'},addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};return {doc,win,listeners,messages};}
test('iframe needs real Play after authorization, accepts only its own origin and tracks actual advancing time',()=>{const f=fixture(),dom=fakeDOM();let allowed=true,visible=true;const manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key:'session',camera:f.camera,viewport:f.viewport}),isAuthorized:(_id,action)=>allowed&&action==='media.play',isUnobstructed:()=>visible,document:dom.doc,window:dom.win});manager.enter({id:'tv',mediaScreen:config},f.active);assert.equal(manager.iframe,null);assert(manager.startPlayback());const iframe=manager.iframe;assert.equal(iframe.referrerPolicy,'strict-origin-when-cross-origin');const packet=info=>({source:iframe.contentWindow,origin:'https://www.youtube-nocookie.com',data:JSON.stringify({event:'infoDelivery',info})});manager.receive({...packet({playerState:1,currentTime:50}),origin:'https://attacker.test'});assert.equal(manager.status.currentTime,null);manager.receive(packet({playerState:1,currentTime:1}));manager.receive(packet({playerState:1,currentTime:2}));assert.equal(manager.diagnostics().advancedSeconds,1);visible=false;manager.update();assert.equal(manager.iframe,iframe);assert.equal(iframe.style.opacity,'0');manager.receive(packet({playerState:1,currentTime:3}));assert.equal(manager.diagnostics().advancedSeconds,2);manager.closeControls();assert.equal(manager.active?.object.id,'tv');assert.equal(manager.controlsOpen,false);assert.equal(iframe.style.pointerEvents,'none');visible=true;manager.update();assert.equal(manager.iframe,iframe);assert.equal(iframe.style.opacity,'1');assert.equal(iframe.style.pointerEvents,'none');manager.enter({id:'tv',mediaScreen:config},f.active);assert.equal(manager.controlsOpen,true);assert.equal(iframe.style.pointerEvents,'auto');assert.equal(manager.status.currentTime,3);allowed=false;manager.update();assert.equal(manager.active,null);assert.equal(manager.iframe,null);assert.equal(iframe.src,'about:blank');manager.dispose();});
test('hidden tab destroys iframe/audio and embed errors stay explicit',()=>{const f=fixture(),dom=fakeDOM(),manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key:'session',camera:f.camera,viewport:f.viewport}),isAuthorized:()=>true,isUnobstructed:()=>true,document:dom.doc,window:dom.win});manager.enter({id:'tv',mediaScreen:config},f.active);manager.startPlayback();manager.receive({source:manager.iframe.contentWindow,origin:'https://www.youtube-nocookie.com',data:{event:'onError',info:150}});assert.match(manager.note.textContent,/does not allow embedding/);dom.doc.visibilityState='hidden';dom.listeners.get('visibilitychange')();assert.equal(manager.iframe,null);manager.dispose();});

test('native fine-ground/zero-grass proof and flat indexed forest do not hide an empty warehouse cone',()=>{
 const f=fixture(),count=10000,inst={count,px:new Float32Array(count).fill(70),py:new Float32Array(count).fill(2.8),pz:new Float32Array(count).fill(70),iPos:new Float32Array(count*4),iDat:new Float32Array(count*4)};for(let i=0;i<count;i++){inst.iPos[i*4+3]=1;inst.iDat[i*4+2]=1;}
 const vegetation={group:new T.Group(),types:[{inst,near:{meshes:[{geometry:new T.BoxGeometry(1,2,1)}]}}],grass:{meshes:[{geometry:new T.BoxGeometry(.2,1,.2)}],cellsPerSide:32,cellFlags:new Uint8Array(1024).fill(1)}};
 const mask={res:128,data:new Uint8Array(128*128*4)},data={isNativeIsland:true,res:256,size:256,origin:-128,texel:1,heights:new Float32Array(256*256).fill(2.8),cache:{readyAt:()=>true}};
 f.active.nativeIsland={data,vegetation,mediaOcclusion:{grassMask:mask},water:{surfaceExclusionsEnforced:true,surfaceExclusions:[volume]}};f.root.add(vegetation.group);
 let proof=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert.equal(proof.complete,true,proof.reasons.join(';'));assert.equal(proof.ground.grassZeroMaskProof,true);assert.equal(proof.stats.nativeCandidates,0,'far forest uses cached spatial broadphase, not 10000 per-frame objects');assert(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof));
 mask.data.fill(255);proof=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert.equal(proof.complete,false);assert.match(proof.reasons.join(';'),/grass density/);mask.data.fill(0);data.cache.readyAt=()=>false;proof=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert.equal(proof.complete,false);assert.match(proof.reasons.join(';'),/Fine terrain/);
});

test('truncated TV sight volume clears camera-straddling off-cone boxes and an interior floor below all sight rays',()=>{
 const f=fixture(),clear=bound=>mediaScreenUnobstructed(f.projection,f.camera,[bound],{complete:true});
 assert.equal(clear({min:[-10,0,-85],max:[-8,10,-79]}),true);
 assert.equal(clear({min:[-20,2.8,-100],max:[20,3.1,-70]}),true);
 assert.equal(clear({min:[-20,0,-93],max:[20,12,-90]}),true,'behind TV is clear');
 assert.equal(clear({min:[6.2,4.6,-86.3],max:[6.8,5.3,-85.7]}),false,'real front obstruction blocks');
});
test('angled TV sight SAT handles corner obstruction, tangency, and separating off-cone geometry',()=>{
 const camera=new T.PerspectiveCamera(65,16/9,.1,100);camera.position.set(0,2,0);camera.lookAt(1,2,-8);camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
 const matrix=new T.Matrix4().makeRotationY(.35);matrix.setPosition(1,2,-8);
 const projection=projectMediaScreen(camera,matrix,config,{left:0,top:0,width:1280,height:720});assert.ok(projection);
 const check=b=>mediaScreenUnobstructed(projection,camera,[b],{complete:true});
 const corner=projection.world[0].map((n,i)=>(n+camera.position.toArray()[i])/2),box=(p,r)=>({min:p.map(n=>n-r),max:p.map(n=>n+r)});
 assert.equal(check(box(corner,.02)),false,'screen-corner ray obstruction blocks');
 assert.equal(check(box(projection.world[0],0)),false,'touching far corner blocks');
 assert.equal(check({min:[-10,-3,-9],max:[-9,7,2]}),true,'camera-straddling side box clears angled view');
 assert.equal(check({min:[-20,-3,-9],max:[20,-2,2]}),true,'floor separated along world Y clears');
});
test('unknown bounds and malformed sight volumes fail closed with a useful diagnostic',()=>{
 const f=fixture();for(const bound of [null,{}, {min:[0,0,0],max:[NaN,1,1]},{min:[0,0,0],max:[Infinity,1,1]},{min:[2,0,0],max:[1,1,1]},{min:[0,0],max:[1,1,1]}]){
  let diagnostic;assert.equal(mediaScreenUnobstructed(f.projection,f.camera,[bound],{complete:true,onBlocked:value=>diagnostic=value}),false);assert.match(diagnostic.reason,/bounds/);assert.equal(diagnostic.boundIndex,0);
 }
 assert.equal(mediaScreenUnobstructed({...f.projection,world:[[NaN,0,0],...f.projection.world.slice(1)]},f.camera,[],{complete:true}),false);
 assert.equal(mediaScreenUnobstructed(f.projection,f.camera,[],{complete:false}),false);
});

test('TV can start while obstructed, continue offscreen and resume its picture without seeking',()=>{
 const f=fixture(),dom=fakeDOM();let visible=false;
 const manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key:'session',camera:f.camera,viewport:f.viewport}),isAuthorized:()=>true,isUnobstructed:()=>visible,document:dom.doc,window:dom.win});
 manager.enter({id:'tv',mediaScreen:config},f.active);
 assert(manager.startPlayback());
 const iframe=manager.iframe;
 assert.equal(manager.diagnostics().screenVisible,false);
 assert.equal(iframe.style.opacity,'0');
 manager.receive({source:iframe.contentWindow,origin:'https://www.youtube-nocookie.com',data:{event:'infoDelivery',info:{playerState:1,currentTime:5}}});
 manager.closeControls();
 assert.equal(manager.controlsOpen,false);
 assert.equal(manager.active.object.id,'tv');
 visible=true;manager.update();
 assert.equal(manager.iframe,iframe);
 assert.equal(manager.diagnostics().screenVisible,true);
 assert.equal(iframe.style.opacity,'1');
 manager.receive({source:iframe.contentWindow,origin:'https://www.youtube-nocookie.com',data:{event:'infoDelivery',info:{playerState:1,currentTime:8}}});
 assert.equal(manager.diagnostics().advancedSeconds,3);
 manager.dispose();
 assert.equal(iframe.src,'about:blank');
});

test('offscreen TV and world change retain then close the exact player',()=>{
 const f=fixture(),dom=fakeDOM();let key='session';
 const manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key,camera:f.camera,viewport:f.viewport}),isAuthorized:()=>true,isUnobstructed:()=>true,document:dom.doc,window:dom.win});
 manager.enter({id:'tv',mediaScreen:config},f.active);assert(manager.startPlayback());
 const iframe=manager.iframe;manager.closeControls();
 f.camera.lookAt(100,4.65,-82);manager.update();
 assert.equal(manager.iframe,iframe);assert.equal(iframe.style.opacity,'0');
 f.camera.lookAt(6.5,5.2,-89.8);manager.update();
 assert.equal(manager.iframe,iframe);assert.equal(iframe.style.opacity,'1');
 key='new-world';manager.update();
 assert.equal(manager.iframe,null);assert.equal(manager.active,null);assert.equal(iframe.src,'about:blank');
 manager.dispose();
});
