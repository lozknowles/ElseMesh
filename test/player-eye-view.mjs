import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {PlayerEyeView} from '../src/world-runtime/PlayerEyeView.js';
import {PlayerEyePanel} from '../src/world-runtime/PlayerEyePanel.js';
function fixture(){
 let at=1000;const scene=new T.Scene(),group=new T.Group();scene.add(group);group.position.set(3,4,5);group.rotation.y=2;const camera=new T.PerspectiveCamera();camera.position.set(10,11,12);camera.rotation.set(.1,.2,0,'YXZ');const hooks=[];
 const target={key:'player:one',nodeId:'node:one',label:'Alice <img src=x>',worldId:'world:one',worldName:'Room <script>',currentWorld:true,remotePlayer:true,authorized:true,validated:true,ready:true,updatedAt:1000,pose:{position:[3,4,5],yaw:.7,pitch:-.3,gen:2,seq:4,eyeSession:'gaze:one'},fence:{world:'world:one',authority:'owner:one',epoch:3,content:'hash:one',node:'node:one',session:'session:one',gen:2,consent:'signed-grant-1'},avatar:{group},scene,candidate:{id:'candidate'}};
 const records=new Map([[target.key,target]]),view=new PlayerEyeView({resolveTarget:key=>records.get(key),listTargets:()=>[...records.values()],eyeCamera:camera,onActivate:s=>hooks.push(['activate',s.key]),onExit:s=>hooks.push(['exit',s.reason]),now:()=>at});
 return {view,target,records,hooks,camera,scene,group,setNow:value=>{at=value;}};
}
test('selected eye camera is independent and uses interpolated avatar head origin with published gaze',()=>{
 const f=fixture(),ownPosition=f.camera.position.clone(),ownRotation=f.camera.quaternion.clone();assert.equal(f.view.select(f.target.key),true);const draw=f.view.update();assert.notEqual(draw.camera,f.camera);assert.deepEqual(draw.camera.position.toArray(),[3,5.6,5]);assert.equal(draw.camera.rotation.order,'YXZ');assert.equal(draw.camera.rotation.x,-.3);assert.equal(draw.camera.rotation.y,.7);assert.deepEqual(f.camera.position.toArray(),ownPosition.toArray());assert.equal(f.camera.quaternion.equals(ownRotation),true);assert.equal(f.group.visible,true);assert.equal(draw.scene,f.scene);assert.equal(draw.avatar,f.target.avatar);
 f.group.position.x=4;f.target.pose.seq++;assert.equal(f.view.update().camera.position.x,4);f.view.ownView();assert.deepEqual(f.hooks.map(h=>h[0]),['activate','exit']);assert.equal(f.view.update(),null);
});
test('every membership/content/authority/generation/gaze-session fence change immediately exits without pursuit',()=>{
 for(const change of [t=>t.fence.world='other',t=>t.fence.authority='other',t=>t.fence.epoch++,t=>t.fence.content='other',t=>t.fence.node='other',t=>t.fence.session='other',t=>t.fence.consent='signed-grant-2',t=>{t.fence.gen++;t.pose.gen++;},t=>t.pose.eyeSession='other']){const f=fixture();assert.equal(f.view.select(f.target.key),true);change(f.target);assert.equal(f.view.update(),null);assert.equal(f.view.status().active,false);assert.equal(f.hooks.filter(h=>h[0]==='exit').length,1);}
});
test('stale, revoked, offline/missing, invalid sequence and missing pitch cannot retain view',()=>{
 for(const change of [f=>f.setNow(2501),f=>f.records.clear(),f=>f.target.authorized=false,f=>f.target.validated=false,f=>f.target.currentWorld=false,f=>f.target.remotePlayer=false,f=>f.target.ready=false,f=>f.target.pose.seq--,f=>f.target.pose.seq=NaN,f=>f.target.pose.pitch=undefined,f=>f.target.pose.position=[Infinity,0,0],f=>f.target.pose.yaw+=1]){const f=fixture();f.view.select(f.target.key);change(f);assert.equal(f.view.update(),null);assert.equal(f.hooks.at(-1)[0],'exit');}
 const f=fixture();f.target.pose.pitch=undefined;assert.equal(f.view.targets()[0].available,false);assert.match(f.view.targets()[0].reason,/gaze unavailable/);assert.equal(f.view.select(f.target.key),false);assert.equal(f.hooks.length,0);
});
test('asset readiness is re-resolved synchronously; promises cannot outlive a selection fence; disposal bounded',()=>{
 const f=fixture();f.target.ready=false;assert.equal(f.view.select(f.target.key),false);f.target.ready=true;assert.equal(f.view.select(f.target.key),true);f.view.ownView();f.records.set(f.target.key,Promise.resolve(f.target));assert.equal(f.view.select(f.target.key),false);assert.equal(f.view.status().active,false);
 f.records.set(f.target.key,f.target);f.view.select(f.target.key);f.view.dispose();f.view.dispose();assert.equal(f.view.select(f.target.key),false);assert.deepEqual(f.view.targets(),[]);assert.equal(f.hooks.filter(h=>h[0]==='activate').length,f.hooks.filter(h=>h[0]==='exit').length);assert.equal(f.view.listeners.size,0);
});
class Element{constructor(tag){this.style={};this.tag=tag;this.children=[];this.textContent='';this.value='';this.parent=null;this.attributes={};}append(...children){for(const child of children){child.parent=this;this.children.push(child);}}replaceChildren(...children){this.children=[];this.append(...children);}setAttribute(key,value){this.attributes[key]=value;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}}
function documentFixture(){const listeners=new Set();return {createElement:tag=>new Element(tag),addEventListener:(name,handler)=>{assert.equal(name,'keydown');listeners.add(handler);},removeEventListener:(name,handler)=>listeners.delete(handler),listeners};}
test('panel renders labels as text, reports own world, Escape restores and disposal releases UI/listeners',()=>{
 const f=fixture(),document=documentFixture(),parent=new Element('main'),panel=new PlayerEyePanel({controller:f.view,parent,document,ownWorldName:()=>'<b>Own room</b>'});assert.equal(panel.select.children[1].textContent,'Alice <img src=x> · Room <script>');assert.equal(panel.select.children[1].children.length,0);assert.equal(panel.notice.textContent,'View only — your avatar remains in <b>Own room</b>.');panel.select.value=f.target.key;panel.select.onchange();assert.equal(f.view.status().active,true);let prevented=false;for(const handler of document.listeners)handler({key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.view.status().active,false);assert.equal(f.hooks.at(-1)[0],'exit');
 f.view.select(f.target.key);panel.dispose();panel.dispose();assert.equal(f.view.status().active,false);assert.equal(parent.children.length,0);assert.equal(document.listeners.size,0);assert.equal(f.view.listeners.size,0);assert.equal(panel.select.onchange,null);
});

test('hook failures cannot retain selected view or leak disposed panel listeners',()=>{
 const f=fixture();f.view.onActivate=()=>{throw Error('activation unavailable');};assert.throws(()=>f.view.select(f.target.key),/activation unavailable/);assert.equal(f.view.status().active,false);assert.equal(f.hooks.at(-1)[0],'exit');
 f.view.onActivate=()=>{};const document=documentFixture(),parent=new Element('main'),panel=new PlayerEyePanel({controller:f.view,parent,document,viewerWorldName:()=> 'Viewer room'});assert.match(panel.notice.textContent,/Viewer room/);f.view.select(f.target.key);f.view.onExit=()=>{throw Error('exit unavailable');};assert.throws(()=>panel.dispose(),/exit unavailable/);assert.equal(f.view.status().active,false);assert.equal(document.listeners.size,0);assert.equal(parent.children.length,0);assert.equal(f.view.listeners.size,0);
});
