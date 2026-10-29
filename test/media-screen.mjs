import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import * as N from '../src/engine/index.js';
import {Material} from '../src/engine/render/Material.js';
import {buildPalmNear} from '../src/world/vegetation/PlantGeometry.js';
import {convertNativePlantGeometry,buildWebGLNativeSky} from '../src/world-runtime/WebGLNativeIsland.js';
import {mediaLayout,buildMediaScreenHousing,projectMediaScreen,screenQuadTransform,mediaScreenUnobstructed,mediaScreenCellVisibility,mediaSightTiles,webGLPalmOcclusionBounds,webGLPalmTriangleBounds,collectMediaScreenOccluders,mediaScreenSurfaceExcluded,youtubeEmbedURL,MediaScreen} from '../src/world-runtime/MediaScreen.js';
const config={schema:'elsemesh.media-screen/1',provider:'youtube',videoId:'N-V7VpmoPkU',width:6.4},volume={id:'warehouse:surface:interior-01',min:[-14.5,3.1,-90.5],max:[14.5,8.5,-63.5]};
function fixture(){const camera=new T.PerspectiveCamera(65,16/9,.1,1000);camera.position.set(6.5,4.65,-82);camera.lookAt(6.5,5.2,-89.8);camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();const matrix=new T.Matrix4().makeTranslation(6.5,5.2,-89.8),viewport={left:0,top:0,width:1280,height:720},projection=projectMediaScreen(camera,matrix,config,viewport),root=new T.Group(),active={root,matrices:new Map([['tv',matrix]]),project:{environment:{windSpeed:5}}};return{camera,matrix,viewport,projection,root,active};}
test('TV geometry faces +Z in both original renderer APIs; strict IDs and private embed origin',()=>{for(const [api,material]of [[T,p=>new T.MeshStandardMaterial(p)],[N,p=>new Material(p)]]){const housing=buildMediaScreenHousing(config,{api,material});assert.equal(housing.children.length,3);assert(housing.children[1].position.z>0);for(const mesh of housing.children){mesh.geometry.dispose();mesh.material.dispose();}}assert.equal(mediaLayout(config).height,3.6);assert.throws(()=>youtubeEmbedURL({...config,videoId:'https://evil.test'},'http://localhost:18893'));const url=new URL(youtubeEmbedURL(config,'http://localhost:18893'));assert.equal(url.origin,'https://www.youtube-nocookie.com');assert.equal(url.searchParams.get('origin'),'http://localhost:18893');assert.throws(()=>youtubeEmbedURL(config,'https://user:pass@evil.test/path'));});
test('projected screen is a perspective quad and refuses rear, offscreen and clipping views',()=>{const f=fixture();assert(f.projection);assert.match(screenQuadTransform(f.projection.quad),/^matrix3d/);f.camera.position.z=-95;f.camera.lookAt(6.5,5.2,-89.8);assert.equal(projectMediaScreen(f.camera,f.matrix,config,f.viewport),null);const g=fixture();g.camera.lookAt(100,4.65,-82);assert.equal(projectMediaScreen(g.camera,g.matrix,config,g.viewport),null);});
test('partly offscreen TV keeps its complete projected surface and conservative sight volume',()=>{
 const camera=new T.PerspectiveCamera(65,16/9,.1,100),matrix=new T.Matrix4().makeTranslation(3,0,-5),viewport={left:0,top:0,width:1280,height:720};
 const projection=projectMediaScreen(camera,matrix,config,viewport);
 assert.ok(projection,'a visible TV portion must not disappear when its right edge leaves the viewport');
 assert.ok(projection.quad.some(p=>p.x>viewport.width));assert.equal(projection.world.length,4);
 assert.match(screenQuadTransform(projection.quad),/^matrix3d/);
});
function clippingFixture(x=0,y=0,z=-5,angle=0,viewport={left:0,top:0,width:1280,height:720}){
 const camera=new T.PerspectiveCamera(65,16/9,.1,100),matrix=new T.Matrix4().makeRotationY(angle);matrix.setPosition(x,y,z);
 return {camera,matrix,viewport,projection:projectMediaScreen(camera,matrix,config,viewport)};
}
function assertClipMapping(projection){
 const values=screenQuadTransform(projection.quad).slice(9,-1).split(',').map(Number),v=projection.viewport;
 for(const point of projection.visiblePolygon){
  const x=point.u*1280,y=point.v*720,w=values[3]*x+values[7]*y+values[15];
  assert.ok(Math.abs((values[0]*x+values[4]*y+values[12])/w-point.x)<1e-7);
  assert.ok(Math.abs((values[1]*x+values[5]*y+values[13])/w-point.y)<1e-7);
  assert.ok(point.x>=v.left+1-1e-7&&point.x<=v.left+v.width-1+1e-7);
  assert.ok(point.y>=v.top+1-1e-7&&point.y<=v.top+v.height-1+1e-7);
 }
}
test('each viewport edge/corner and an enclosing TV use perspective-correct iframe clipping',()=>{
 for(const [x,y]of [[3,0],[-3,0],[0,2],[0,-2],[3,2],[-3,2],[3,-2],[-3,-2]]){
  const f=clippingFixture(x,y);assert.ok(f.projection,`${x},${y}`);assert.equal(f.projection.viewportPartial,true);
  assert.match(f.projection.clipPath,/^polygon\(/);assertClipMapping(f.projection);
  const world=f.projection.world.map(p=>p.slice()),quad=f.projection.quad.map(p=>({...p}));
  assert.equal(mediaScreenUnobstructed(f.projection,f.camera,[],{complete:true}),true);
  assert.deepEqual(f.projection.world,world);assert.deepEqual(f.projection.quad,quad);
 }
 const enclosing=clippingFixture(0,0,-1).projection;assert.ok(enclosing);assert.equal(enclosing.visiblePolygon.length,4);
 assert.ok(Math.abs(enclosing.visibleArea-1278*718)<1e-6);assertClipMapping(enclosing);
});
test('oblique clipping retains the original homography across offset subviewports and resize',()=>{
 for(const viewport of [{left:150,top:60,width:900,height:500},{left:25,top:30,width:600,height:900}]){
  const f=clippingFixture(3,0,-5,-.55,viewport);assert.ok(f.projection);assertClipMapping(f.projection);
  assert.equal(f.projection.quad.length,4);assert.equal(f.projection.world.length,4);
  assert.ok(f.projection.quad.some(p=>p.x>viewport.left+viewport.width));
 }
 const full=clippingFixture().projection;assert.equal(full.clipPath,null);assert.equal(full.viewportPartial,false);
});
test('fully offscreen, subpixel slivers, rear/near/far and degenerate projections remain hidden',()=>{
 for(const [x,y,z,angle]of [[20,0,-5,0],[-20,0,-5,0],[0,20,-5,0],[0,-20,-5,0],[0,0,5,0],[0,0,-5,Math.PI],[0,0,-.15,0],[0,0,-.5,.8],[0,0,-110,0]])
  assert.equal(clippingFixture(x,y,z,angle).projection,null,`${x},${y},${z},${angle}`);
 const edge=(5-mediaLayout(config).frontZ)*Math.tan(65*Math.PI/360)*16/9+config.width/2;
 assert.equal(clippingFixture(edge-.0001).projection,null,'visible area rather than full projected area rejects a tiny sliver');
 const f=clippingFixture();f.matrix.makeScale(0,1,1);f.matrix.setPosition(0,0,-5);assert.equal(projectMediaScreen(f.camera,f.matrix,config,f.viewport),null);
 for(const viewport of [{left:NaN,top:0,width:1280,height:720},{left:0,top:0,width:0,height:720}])assert.equal(projectMediaScreen(f.camera,f.matrix,config,viewport),null);
 assert.equal(screenQuadTransform([{x:0,y:0},{x:1,y:1},{x:2,y:2},{x:3,y:3}]),null);
});
test('viewport clipping does not bypass full-surface occlusion or claim offscreen clear cells are visible',()=>{
 const f=clippingFixture(5.5),wall={min:[-100,-100,-2.51],max:[3,100,-2.49]};assert.ok(f.projection);
 assert.equal(mediaScreenUnobstructed(f.projection,f.camera,[wall],{complete:true}),false);
 assert.equal(mediaScreenCellVisibility(f.projection,f.camera,[wall],{complete:true}).visible,false,'clear cells to the right are all outside the viewport');
 assert.equal(mediaScreenCellVisibility(f.projection,f.camera,[],{complete:false}).visible,false);
 const p=clippingFixture(3),corner=p.projection.world[1].map(n=>n/2),bound={min:corner.map(n=>n-.01),max:corner.map(n=>n+.01)};
 assert.equal(mediaScreenUnobstructed(p.projection,p.camera,[bound],{complete:true}),false,'an offscreen corner remains in the conservative full sight proof');
});
test('fully onscreen TV keeps a single proven clear cell smaller than 64 pixels',()=>{
 const f=clippingFixture(0,0,-80),projection=f.projection;assert.ok(projection);assert.equal(projection.viewportPartial,false);
 const cellArea=projection.visibleArea/24;assert.ok(cellArea>0&&cellArea<64,'outer TV passes64px while each cell is smaller');
 const z=(-80+mediaLayout(config).frontZ)/2;
 const bounds=[{min:[-1.06,-10,z-.001],max:[10,10,z+.001]},{min:[-10,-10,z-.001],max:[10,.44,z+.001]}];
 const result=mediaScreenCellVisibility(projection,f.camera,bounds,{complete:true});
 assert.equal(result.visible,true);assert.equal(result.partial,true);assert.equal(result.clearCells,1);
 assert.match(decodeURIComponent(result.mask),/<rect x="0" y="0"/);
});
test('whole-screen occlusion includes non-colliding meshes and avatars; wall behind TV does not hide',()=>{const f=fixture(),back=new T.Mesh(new T.BoxGeometry(30,12,.3),new T.MeshBasicMaterial());back.position.set(0,6,-91);f.root.add(back);let result=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert(result.complete);assert(mediaScreenUnobstructed(f.projection,f.camera,result.bounds,result));const prop=new T.Mesh(new T.BoxGeometry(.5,.5,.5),new T.MeshBasicMaterial());prop.position.set(6.5,5,-86);prop.userData.collision='none';f.root.add(prop);result=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});assert.equal(mediaScreenUnobstructed(f.projection,f.camera,result.bounds,result),false);f.root.remove(prop);result=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv',avatarRoots:[prop]});assert.equal(mediaScreenUnobstructed(f.projection,f.camera,result.bounds,result),false);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,[],{complete:false}),false);});
test('water proof requires installed enforcement and ALL five points strictly inside SAME bounded volume',()=>{const f=fixture(),water={surfaceExclusionsEnforced:true,surfaceExclusions:[volume]};assert(mediaScreenSurfaceExcluded({water},f.projection,f.camera));assert.equal(mediaScreenSurfaceExcluded({water:{...water,surfaceExclusionsEnforced:false}},f.projection,f.camera),false);assert.equal(mediaScreenSurfaceExcluded({water:{...water,surfaceExclusions:[{...volume,max:[Infinity,8.5,-63.5]}]}},f.projection,f.camera),false);const old=f.camera.position.y;f.camera.position.y=3.1+.025;assert.equal(mediaScreenSurfaceExcluded({water},f.projection,f.camera),false);f.camera.position.y=old;assert.equal(mediaScreenSurfaceExcluded({water:{...water,surfaceExclusions:[{...volume,max:[14.5,8.5,-85]},{...volume,id:'other',min:[-14.5,3.1,-85]}]}},f.projection,f.camera),false);});
function fakeDOM(){const listeners=new Map(),messages=[];class Element{constructor(tag){this.tag=tag;this.style={};this.attributes={};this.children=[];this.contentWindow={postMessage:(...args)=>messages.push(args)};}append(...items){this.children.push(...items);}setAttribute(k,v){this.attributes[k]=v;}remove(){this.removed=true;}}const doc={body:new Element('body'),visibilityState:'visible',createElement:t=>new Element(t),exitPointerLock(){},addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)},win={location:{origin:'http://localhost:18893'},addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};return {doc,win,listeners,messages};}
test('partial viewport and occlusion masks intersect, resize updates clipping, and access revocation destroys playback',()=>{
 const f=clippingFixture(3,0,-5,0,{left:100,top:50,width:640,height:360}),dom=fakeDOM(),active={matrices:new Map([['tv',f.matrix]])};
 let allowed=true,bounds=[{min:[1.4,-.1,-2.6],max:[1.6,.1,-2.4]}];
 const manager=new MediaScreen({getContext:()=>({ready:true,active,key:'session',camera:f.camera,viewport:f.viewport}),
  isAuthorized:()=>allowed,isUnobstructed:projection=>mediaScreenCellVisibility(projection,f.camera,bounds,{complete:true}),document:dom.doc,window:dom.win});
 try{
  manager.enter({id:'tv',mediaScreen:config},active);assert(manager.startPlayback());const frame=manager.iframe;
  assert.equal(frame.style.opacity,'1');assert.match(frame.style.clipPath,/^polygon\(/);assert.match(frame.style.maskImage,/data:image\/svg/);
  assert.equal(frame.style.pointerEvents,'none','occlusion-partial playback does not expose player hit targets');
  const clip=frame.style.clipPath,transform=frame.style.transform;
  f.viewport.left=20;f.viewport.top=60;f.viewport.width=900;f.viewport.height=500;manager.update();
  assert.notEqual(frame.style.transform,transform);assert.notEqual(frame.style.clipPath,clip);assert.equal(manager.iframe,frame);
  bounds=[];manager.update();assert.equal(frame.style.maskImage,'none');assert.match(frame.style.clipPath,/^polygon\(/);
  assert.equal(frame.style.pointerEvents,'auto','CSS clipPath independently limits hit testing to the viewport polygon');
  f.matrix.makeTranslation(0,0,-5);manager.update();assert.equal(frame.style.clipPath,'none','full visibility clears the old viewport clip');
  bounds=[{min:[-100,-100,-2.6],max:[100,100,-2.4]}];manager.update();assert.equal(frame.style.opacity,'0');assert.equal(frame.style.pointerEvents,'none');
  bounds=[];f.matrix.makeTranslation(20,0,-5);manager.update();assert.equal(frame.style.clipPath,'none');assert.equal(frame.style.opacity,'0');assert.equal(manager.iframe,frame);
  allowed=false;manager.update();assert.equal(manager.iframe,null);assert.equal(frame.src,'about:blank');assert.equal(frame.removed,true);
 }finally{manager.dispose();}
});
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

test('partly blocked TV reveals proven cells without restarting playback; full wall and unknown bounds hide',()=>{
 const f=fixture(),dom=fakeDOM(),prop={min:[6.2,4.6,-86.3],max:[6.8,5.3,-85.7]},wall={min:[0,0,-86.3],max:[13,10,-85.7]};
 const visibility=bounds=>mediaScreenCellVisibility(f.projection,f.camera,bounds,{complete:true});
 const partial=visibility([prop]);assert.equal(partial.visible,true);assert.equal(partial.partial,true);assert(partial.clearCells>0&&partial.clearCells<partial.totalCells);assert.match(partial.mask,/data:image\/svg\+xml/);
 assert.equal(visibility([wall]).visible,false);
 assert.equal(visibility([{min:[0,0,-91],max:[13,10,-90]}]).partial,false);
 assert.equal(visibility([prop,prop]).clearCells,partial.clearCells,'overlapping occluders cannot reveal a hole');
 assert.equal(mediaScreenCellVisibility(f.projection,f.camera,[prop],{complete:false}).visible,false);
 assert.equal(mediaScreenCellVisibility(f.projection,f.camera,[{min:[NaN,0,0],max:[1,1,1]}],{complete:true}).visible,false);
 let bounds=[prop];
 const manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key:'session',camera:f.camera,viewport:f.viewport}),isAuthorized:()=>true,isUnobstructed:()=>visibility(bounds),document:dom.doc,window:dom.win});
 manager.enter({id:'tv',mediaScreen:config},f.active);assert(manager.startPlayback());const frame=manager.iframe;manager.closeControls();
 assert.equal(manager.diagnostics().screenPartial,true);assert.equal(frame.style.opacity,'1');assert.equal(frame.style.maskImage,partial.mask);
 manager.receive({source:frame.contentWindow,origin:'https://www.youtube-nocookie.com',data:{event:'infoDelivery',info:{playerState:1,currentTime:4}}});
 bounds=[wall];manager.update();assert.equal(manager.iframe,frame);assert.equal(frame.style.opacity,'0');
 bounds=[];manager.update();assert.equal(manager.iframe,frame);assert.equal(frame.style.opacity,'1');assert.equal(frame.style.maskImage,'none');
 manager.receive({source:frame.contentWindow,origin:'https://www.youtube-nocookie.com',data:{event:'infoDelivery',info:{playerState:1,currentTime:9}}});
 assert.equal(manager.diagnostics().advancedSeconds,5);manager.dispose();
});

test('TV holds bounded fine terrain tiles while visible and releases them on exit',async()=>{
 const f=fixture(),dom=fakeDOM(),tiles=[{id:'near',bounds:[0,-100,32,-64]},{id:'far',bounds:[100,100,132,132]}];
 let held=0,released=0;const cache={tiles,retain:async selected=>{assert.deepEqual(selected.map(t=>t.id),['near']);held++;return()=>{released++;};}};
 f.active.nativeIsland={data:{cache,texel:1,origin:-128,res:256}};
 assert.deepEqual(mediaSightTiles({...f.projection,terrainTexel:1,terrainOrigin:-128,terrainResolution:256},f.camera,cache).map(t=>t.id),['near']);
 const manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key:'session',camera:f.camera,viewport:f.viewport}),isAuthorized:()=>true,isUnobstructed:()=>true,document:dom.doc,window:dom.win});
 manager.enter({id:'tv',mediaScreen:config},f.active);assert(manager.startPlayback());assert.equal(manager.diagnostics().screenVisible,false);
 await Promise.resolve();manager.update();assert.equal(manager.diagnostics().screenVisible,true);assert.equal(held,1);
 manager.update();assert.equal(held,1,'same tile footprint does not create leases every frame');
 manager.exit();assert.equal(released,1);manager.dispose();
});

test('TV releases unused sight leases and retries a failed lease from the play control',async()=>{
 const f=fixture(),dom=fakeDOM(),tiles=[{id:'near',bounds:[0,-100,32,-64]}];let attempts=0,releases=0;
 const cache={tiles,retain:async()=>{if(++attempts===2)throw Error('temporary read failure');return()=>{releases++;};}};
 f.active.nativeIsland={data:{cache,texel:1,origin:-128,res:256}};
 const manager=new MediaScreen({getContext:()=>({ready:true,active:f.active,key:'session',camera:f.camera,viewport:f.viewport}),isAuthorized:()=>true,isUnobstructed:()=>true,document:dom.doc,window:dom.win});
 manager.enter({id:'tv',mediaScreen:config},f.active);manager.current();await Promise.resolve();assert.equal(attempts,1);
 manager.closeControls();assert.equal(releases,1,'closing without Play releases the already loaded terrain');
 manager.enter({id:'tv',mediaScreen:config},f.active);manager.current();await new Promise(setImmediate);assert.match(manager.sightError,/temporary read failure/);
 assert(manager.startPlayback());assert.equal(attempts,3,'the play control retries a rejected lease');
 await Promise.resolve();manager.update();assert.equal(manager.diagnostics().screenVisible,true);
 dom.doc.visibilityState='hidden';dom.listeners.get('visibilitychange')();assert.equal(releases,2,'hidden tab releases the lease');
 manager.dispose();
});
test('TV sight lease includes every fine cell at tile boundaries',()=>{
 const cache={tiles:[{id:'a',bounds:[0,0,128,128]},{id:'b',bounds:[128,0,256,128]}]};
 const camera={position:new T.Vector3(125.1,5,4)};
 const projection={world:[[125.1,5,4],[125.1,5,6],[125.1,4,6],[125.1,4,4]],terrainTexel:1,terrainOrigin:0,terrainResolution:256};
 assert.deepEqual(mediaSightTiles(projection,camera,cache).map(t=>t.id),['a','b']);
});
test('source palm triangles use fine shader bounds rather than whole-plant boxes',()=>{
 const source=buildPalmNear(),geometry=convertNativePlantGeometry(source.geometry);
 const matrix=new T.Matrix4().makeTranslation(4,2,-86);
 const boxes=webGLPalmTriangleBounds(geometry,matrix,{height:8,lean:.12,angle:.7,windStrength:1,windLength:1});
 assert.equal(boxes.length,geometry.index.count/3);
 assert(boxes.every(b=>b.min.every((n,k)=>Number.isFinite(n)&&n<=b.max[k])));
 const whole=webGLPalmOcclusionBounds({min:[-5,0,-5],max:[5,12,5],radius:13},matrix,{height:8,lean:.12,windStrength:1,windLength:1});
 assert(boxes.some(b=>b.max[1]<whole.max[1]-2),'some geometry is bounded more tightly than the entire palm');
 geometry.dispose();source.geometry.dispose();
});
test('renderer-owned WebGL palms use shader-aligned bounds without false below-floor occlusion',()=>{
 const f=fixture(),local={min:[-.5,-.5,-.5],max:[.5,.5,.5],radius:Math.sqrt(.75)};
 const distant=new T.Matrix4().makeTranslation(25,3,-100);
 const tight=webGLPalmOcclusionBounds(local,distant,{height:15,lean:.3,windStrength:1,windLength:1});
 assert(tight.min[1]>1,'plant bounds stay near the real base height');
 assert(tight.max[2]<-90,'distant palm cannot overreach the TV');
 const geometry=new T.BoxGeometry(1,1,1);geometry.setAttribute('iPlant',new T.InstancedBufferAttribute(Float32Array.from([0,.3,15,1]),4));geometry.setAttribute('iRecord',new T.InstancedBufferAttribute(Float32Array.from([0,1,0,0]),4));
 const material=new T.MeshStandardMaterial();material.customProgramCacheKey=()=> 'native-source-plants-webgl/1:palm|weather-shelter-v1';material.userData.nativeWindStrength=1;material.userData.nativeWindVector=new T.Vector2(1,0);
 const plant=new T.InstancedMesh(geometry,material,1);plant.userData.mediaOcclusionPlant='native-palm-v1';plant.setMatrixAt(0,distant);f.root.add(plant);
 let proof=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});
 assert.equal(proof.bounds.length,0,'far palm does not black out warehouse TV');
 plant.setMatrixAt(0,new T.Matrix4().makeTranslation(6.5,3,-86));plant.instanceMatrix.needsUpdate=true;
 proof=collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});
 assert(proof.bounds.length>0,'a real palm in the sightline still blocks the TV');
 plant.geometry.dispose();plant.material.dispose();
});

function skyFixture(){
 const f=fixture();f.sky=buildWebGLNativeSky();f.root.add(f.sky.mesh);f.active.nativeIsland={sky:f.sky,water:{surfaceExclusionsEnforced:true,surfaceExclusions:[{id:'sky-test-dry-volume',min:[-99999,-99999,-99999],max:[99999,99999,99999]}]}};
 f.collect=()=>collectMediaScreenOccluders(f.active,{camera:f.camera,projection:f.projection,screenObjectId:'tv'});return f;
}

test('actual renderer sky certifies the complete TV cone inside its faceted interior, while walls still block',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const info=f.sky.mediaOcclusionDiagnostics();assert.ok(info.innerRadius>4000&&info.innerRadius<4200);assert.ok(info.margin>0);assert.equal(info.geometryInspections,1);
 let proof=f.collect();assert.equal(proof.complete,true);assert.equal(proof.stats.skyInteriorExclusions,1);assert.equal(proof.bounds.length,0);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),true);
 const wall=new T.Mesh(new T.BoxGeometry(2,2,.2),new T.MeshBasicMaterial());wall.position.set(6.5,5,-86);f.root.add(wall);t.after(()=>{wall.geometry.dispose();wall.material.dispose();});proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,1);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),false);
 f.root.remove(wall);f.active.nativeIsland.water.surfaceExclusionsEnforced=false;proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,1);assert.equal(proof.complete,false,'sky proof cannot bypass the existing water exclusion proof');
});

test('sky proof uses actual owner identity and cannot be granted by mesh name or a forged owner',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());f.sky.mesh.name='anything-at-all';assert.equal(f.collect().stats.skyInteriorExclusions,1,'actual owner works without the diagnostic name');
 const actual=f.active.nativeIsland.sky;f.active.nativeIsland.sky={mesh:actual.mesh,containsSightCone:()=>true};let proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,0);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),false,'unregistered owner cannot suppress the enclosing generic bound');
 f.active.nativeIsland.sky=actual;const forged=new T.Mesh(new T.BoxGeometry(1,1,.2),new T.MeshBasicMaterial());forged.name='native-island-webgl-sky';forged.position.set(6.5,5,-86);f.root.add(forged);t.after(()=>{forged.geometry.dispose();forged.material.dispose();});proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,1);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),false,'a named intervening prop remains an occluder');
});

test('sky-local containment handles translated rotated scaled and parent-transformed actual skies',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const parent=new T.Group();f.root.add(parent);parent.add(f.sky.mesh);
 const poses=[[[100,-20,60],[.2,.8,-.3],[2,.5,1.7]],[[1,2,3],[0,Math.PI/2,0],[-1,3,.4]],[[1000,5,-700],[.4,-.6,.1],[.01,5,2]]];
 for(const [translation,rotation,scale]of poses){parent.position.fromArray(translation);parent.rotation.set(...rotation);f.sky.mesh.position.set(3,-4,2);f.sky.mesh.rotation.set(.1,.3,-.2);f.sky.mesh.scale.fromArray(scale);f.root.updateMatrixWorld(true);const m=f.sky.mesh.matrixWorld;
  f.camera.position.copy(new T.Vector3(0,0,0).applyMatrix4(m));f.camera.updateMatrixWorld(true);f.projection={world:[[-2,1,-10],[2,1,-10],[2,-1,-10],[-2,-1,-10]].map(p=>new T.Vector3(...p).applyMatrix4(m).toArray())};assert.equal(f.collect().stats.skyInteriorExclusions,1,JSON.stringify({translation,rotation,scale}));
 }
});

test('sky certificate rejects boundary outside and vertex-radius-inside-but-facet-outside cones',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());f.camera.position.set(0,0,0);f.camera.updateMatrixWorld(true);const r=f.sky.mediaOcclusionDiagnostics().innerRadius;
 f.projection={world:Array.from({length:4},()=>[r,0,0])};assert.equal(f.collect().stats.skyInteriorExclusions,0,'certified boundary is strict');
 f.projection={world:Array.from({length:4},()=>[r+1,0,0])};assert.equal(f.collect().stats.skyInteriorExclusions,0);
 const p=[-4190*Math.cos(Math.PI/24),0,4190*Math.sin(Math.PI/24)];assert.ok(Math.hypot(...p)<4200);
 let outsideFacet=false;const g=f.sky.mesh.geometry,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),q=new T.Vector3(...p);
 for(let i=0;i<g.index.count;i+=3){a.fromBufferAttribute(g.attributes.position,g.index.getX(i));b.fromBufferAttribute(g.attributes.position,g.index.getX(i+1));c.fromBufferAttribute(g.attributes.position,g.index.getX(i+2));n.subVectors(b,a).cross(c.sub(a));const d=n.dot(a);if(Math.abs(d)>1e-9&&n.dot(q)/d>1+1e-6){outsideFacet=true;break;}}
 assert.equal(outsideFacet,true,'independent plane check confirms this point is outside an actual triangle facet');f.projection={world:[p,[p[0],.01,p[2]],[p[0]+.01,.01,p[2]],[p[0]+.01,0,p[2]]]};assert.equal(f.collect().stats.skyInteriorExclusions,0,'the vertex radius is not the certified inner radius');
 f.projection={world:[[-1,1,-5],[1,1,-5],[1,-1,-5],[-1,-1,-5]]};f.camera.position.set(r+1,0,0);f.camera.updateMatrixWorld(true);assert.equal(f.collect().stats.skyInteriorExclusions,0,'all four corners inside do not excuse an outside camera');
});

test('sky proof uses the actual parented camera world origin and every screen corner',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const parent=new T.Group();parent.position.set(5000,0,0);parent.add(f.camera);f.camera.position.set(0,0,0);parent.updateMatrixWorld(true);assert.equal(f.collect().stats.skyInteriorExclusions,0,'camera.position alone would incorrectly appear inside');
 parent.remove(f.camera);f.camera.position.set(0,0,0);f.camera.updateMatrixWorld(true);f.projection={world:[[-1,1,-5],[1,1,-5],[1,-1,-5],[4201,-1,-5]]};assert.equal(f.collect().stats.skyInteriorExclusions,0,'one outside corner invalidates the entire exclusion');
});

test('changed sky geometry material shaders callbacks and raw position/index bytes fall back conservatively',async t=>{
 const changes=[
  ['geometry replacement',f=>{const old=f.sky.mesh.geometry;f.sky.mesh.geometry=new T.SphereGeometry(4200,24,16);return()=>{f.sky.mesh.geometry.dispose();f.sky.mesh.geometry=old;};}],
  ['material replacement',f=>{const old=f.sky.mesh.material;f.sky.mesh.material=old.clone();return()=>{f.sky.mesh.material.dispose();f.sky.mesh.material=old;};}],
  ['vertex shader',f=>{f.sky.mesh.material.vertexShader+='\n// changed';}],
  ['fragment shader',f=>{f.sky.mesh.material.fragmentShader+='\n// changed';}],
  ['raw position data',f=>{f.sky.mesh.geometry.attributes.position.array[3]+=.25;}],
  ['raw index data',f=>{f.sky.mesh.geometry.index.array[0]=f.sky.mesh.geometry.index.array[1];}],
  ['attribute update version',f=>{f.sky.mesh.geometry.attributes.position.needsUpdate=true;}],
  ['position attribute replacement',f=>{f.sky.mesh.geometry.setAttribute('position',f.sky.mesh.geometry.attributes.position.clone());}],
  ['material compile callback',f=>{f.sky.mesh.material.onBeforeCompile=()=>{};}],
  ['transform-changing object callback',f=>{f.sky.mesh.onBeforeRender=()=>{f.sky.mesh.position.x+=1;};}],
  ['transform-changing ancestor callback',f=>{f.root.onBeforeRender=()=>{};}],
  ['shader defines',f=>{f.sky.mesh.material.defines.OFFSET_POSITION=1;}],
  ['GLSL version',f=>{f.sky.mesh.material.glslVersion=T.GLSL3;}],
  ['material shader type',f=>{f.sky.mesh.material.type='MeshBasicMaterial';}],
  ['uniform callback',f=>{Object.defineProperty(f.sky.mesh.material.uniforms.nativeTime,'value',{get:()=>0});}],
  ['external GPU attribute flag',f=>{f.sky.mesh.geometry.attributes.position.isGLBufferAttribute=true;}],
  ['morph positions',f=>{f.sky.mesh.geometry.morphAttributes.position=[f.sky.mesh.geometry.attributes.position.clone()];}],
  ['displacement',f=>{f.sky.mesh.material.displacementMap={};}]
 ];
 for(const [name,change]of changes)await t.test(name,()=>{const f=skyFixture(),restore=change(f);try{const proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,0);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),false);}finally{restore?.();f.sky.dispose();}});
});

test('singular and nonfinite sky transforms fail closed rather than silently disappearing',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());f.sky.mesh.scale.set(0,1,1);let proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,0);assert.equal(proof.complete,false);assert.match(proof.reasons.join(';'),/sky.*transform/);
 f.sky.mesh.scale.set(1,1,1);f.sky.mesh.matrixAutoUpdate=false;f.sky.mesh.matrix.identity();f.sky.mesh.matrix.elements[12]=NaN;proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,0);assert.equal(proof.complete,false);
 f.sky.mesh.matrix.identity();f.sky.mesh.matrix.elements[3]=.1;proof=f.collect();assert.equal(proof.stats.skyInteriorExclusions,0);assert.equal(proof.complete,false,'unsupported projective object transform is not a clear sight proof');
});

test('actual facet-plane geometry inspection runs once; bounded private byte comparisons detect later raw writes',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const first=f.sky.mediaOcclusionDiagnostics();assert.ok(first.facetPlaneEvaluations>0&&first.snapshotBytes>0);
 for(let i=0;i<10;i++)assert.equal(f.collect().stats.skyInteriorExclusions,1);const after=f.sky.mediaOcclusionDiagnostics();assert.equal(after.geometryInspections,1);assert.equal(after.facetPlaneEvaluations,first.facetPlaneEvaluations);assert.equal(after.byteComparisonChecks,10,'byte comparisons intentionally run per proof, unlike facet construction');
 const array=f.sky.mesh.geometry.attributes.position.array;array[9]+=.5;assert.equal(f.collect().stats.skyInteriorExclusions,0);assert.equal(f.sky.mediaOcclusionDiagnostics().facetPlaneEvaluations,first.facetPlaneEvaluations);
});
function mockSkyCompileParameters(f){const material=f.sky.mesh.material;return {vertexShader:material.vertexShader,fragmentShader:material.fragmentShader,defines:material.defines,uniforms:material.uniforms};}

test('observed altered position/index uploads permanently invalidate even after CPU bytes are restored',async t=>{
 for(const name of ['position','index'])await t.test(name,()=>{const f=skyFixture(),attribute=name==='position'?f.sky.mesh.geometry.attributes.position:f.sky.mesh.geometry.index;try{assert.equal(f.collect().stats.skyInteriorExclusions,1);const original=attribute.array[3];attribute.array[3]=original+1;attribute.onUploadCallback();attribute.array[3]=original;assert.equal(f.collect().stats.skyInteriorExclusions,0);const info=f.sky.mediaOcclusionDiagnostics();assert.equal(info.invalidated,true);assert.match(info.invalidationReason,/upload-mismatch/);}finally{f.sky.dispose();}});
});

test('unchanged context re-uploads remain eligible; changed context re-upload is latched',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const position=f.sky.mesh.geometry.attributes.position,index=f.sky.mesh.geometry.index;
 position.onUploadCallback();index.onUploadCallback();f.sky.mesh.material.onBeforeCompile(mockSkyCompileParameters(f),{});assert.equal(f.collect().stats.skyInteriorExclusions,1);
 position.onUploadCallback();index.onUploadCallback();f.sky.mesh.material.onBeforeCompile(mockSkyCompileParameters(f),{});assert.equal(f.collect().stats.skyInteriorExclusions,1,'mock normal context re-upload/recompile keeps exact data');
 const old=position.array[6];position.array[6]=old+.5;position.onUploadCallback();position.array[6]=old;assert.equal(f.collect().stats.skyInteriorExclusions,0);assert.equal(f.sky.mediaOcclusionDiagnostics().uploadNotifications,5);
});

test('changed compiled shader then restored CPU text cannot regain sky exclusion',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const material=f.sky.mesh.material,original=material.vertexShader;material.onBeforeCompile(mockSkyCompileParameters(f),{});assert.equal(f.collect().stats.skyInteriorExclusions,1);
 material.vertexShader=original.replace('vec4(position,1.0)','vec4(position+vec3(0.0,0.0,200.0),1.0)');assert.notEqual(material.vertexShader,original);material.onBeforeCompile(mockSkyCompileParameters(f),{});material.vertexShader=original;
 assert.equal(f.collect().stats.skyInteriorExclusions,0);assert.equal(f.sky.mediaOcclusionDiagnostics().invalidated,true);assert.match(f.sky.mediaOcclusionDiagnostics().invalidationReason,/compile/);
});

test('owner upload/compile wrappers preserve this/arguments/results and restore only still-owned callbacks',()=>{
 const previousUpload=T.BufferAttribute.prototype.onUploadCallback,previousCompile=T.Material.prototype.onBeforeCompile,calls=[];
 function priorUpload(...args){calls.push({kind:'upload',self:this,args});return 'upload-result';}
 function priorCompile(...args){calls.push({kind:'compile',self:this,args});return 'compile-result';}
 let f;try{T.BufferAttribute.prototype.onUploadCallback=priorUpload;T.Material.prototype.onBeforeCompile=priorCompile;f=skyFixture();}finally{T.BufferAttribute.prototype.onUploadCallback=previousUpload;T.Material.prototype.onBeforeCompile=previousCompile;}
 const position=f.sky.mesh.geometry.attributes.position,index=f.sky.mesh.geometry.index,material=f.sky.mesh.material,args=mockSkyCompileParameters(f),renderer={testRenderer:true};
 try{assert.equal(position.onUploadCallback('a',2),'upload-result');assert.equal(index.onUploadCallback('b',3),'upload-result');assert.equal(material.onBeforeCompile(args,renderer),'compile-result');assert.equal(calls[0].self,position);assert.deepEqual(calls[0].args,['a',2]);assert.equal(calls[1].self,index);assert.equal(calls[2].self,material);assert.equal(calls[2].args[0],args);assert.equal(calls[2].args[1],renderer);assert.equal(f.collect().stats.skyInteriorExclusions,1);}finally{f.sky.dispose();}
 assert.equal(position.onUploadCallback,priorUpload);assert.equal(index.onUploadCallback,priorUpload);assert.equal(material.onBeforeCompile,priorCompile);
 const g=skyFixture(),p=g.sky.mesh.geometry.attributes.position,m=g.sky.mesh.material,foreign=()=>{};p.onUploadCallback=foreign;m.onBeforeCompile=foreign;assert.equal(g.collect().stats.skyInteriorExclusions,0);g.sky.dispose();assert.equal(p.onUploadCallback,foreign);assert.equal(m.onBeforeCompile,foreign,'disposal must not overwrite another callback owner');
});

test('current callback replacement falls back and prior compile shader changes are observed',t=>{
 const f=skyFixture();t.after(()=>f.sky.dispose());const index=f.sky.mesh.geometry.index;index.onUploadCallback=()=>{};assert.equal(f.collect().stats.skyInteriorExclusions,0);
 const original=T.Material.prototype.onBeforeCompile;let g;try{T.Material.prototype.onBeforeCompile=function(shader){shader.vertexShader+='\n// altered by prior compile callback';};g=skyFixture();}finally{T.Material.prototype.onBeforeCompile=original;}t.after(()=>g.sky.dispose());g.sky.mesh.material.onBeforeCompile(mockSkyCompileParameters(g),{});assert.equal(g.collect().stats.skyInteriorExclusions,0);assert.equal(g.sky.mediaOcclusionDiagnostics().invalidationReason,'sky-compiled-shader-mismatch');
});
