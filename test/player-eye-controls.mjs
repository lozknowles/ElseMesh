import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../src/core/Input.js';
import {Player} from '../src/player/Player.js';
import {Colliders} from '../src/world/Colliders.js';
import {PerspectiveCamera,Vector3} from '../src/engine/index.js';
import {PlayerEyeControls} from '../src/world-runtime/PlayerEyeControls.js';
import {PlayerEyePanel} from '../src/world-runtime/PlayerEyePanel.js';
import {PlayerEyeView} from '../src/world-runtime/PlayerEyeView.js';
function fixture(){
 const input=Object.assign(Object.create(Input.prototype),{enabled:true,keys:new Set(),pressed:new Set(),_touchHeld:new Map(),_touchActionHeld:new Map(),_touchFlightResetters:[],_touchActionResetters:[],look:{x:0,y:0},moveStick:{x:0,y:0},lookStick:{x:0,y:0},wheel:0,mouseDown:false,rightDown:false,_keyboardLookAllowed:()=>false});
 const colliders=new Colliders();colliders.addBox(new Vector3(0,-.1,0),new Vector3(20,.1,20),0,{walkable:true});const player=new Player({camera:new PerspectiveCamera(),input,terrain:{heightAt:()=>0},colliders,query:{allocate:()=>0,setPoint(){},cpuValid:true,cpu:new Float32Array([-1000,0,0,0])},boat:null});player.position.set(1,.4,2);player.velocity.set(1,2.5,3);player.yaw=.7;player.pitch=.2;
 const listeners=new Map(),canvas={addEventListener:(name,fn,capture)=>{assert.equal(capture,true);listeners.set(name,fn);},removeEventListener:(name,fn,capture)=>{assert.equal(capture,true);assert.equal(listeners.get(name),fn);listeners.delete(name);},focus(){this.focused=true;}},document={exits:0,exitPointerLock(){this.exits++;}};let allowed=true,resumable=true;
 const controls=new PlayerEyeControls({input,canvas,document,getPlayer:()=>player,canActivate:()=>allowed,canResume:()=>resumable});return {input,player,controls,canvas,document,listeners,setAllowed:value=>{allowed=value;},setResumable:value=>{resumable=value;}};
}
function buffer(input){input.keys.add('KeyW');input.keys.add('ArrowRight');input.pressed.add('Space');input.look.x=90;input.look.y=70;input.moveStick.y=1;input.lookStick.x=1;input.wheel=5;input.mouseDown=true;}
test('actual suspended Input keeps actual Player neutral while jump gravity settles without changing XZ or gaze',()=>{
 const f=fixture(),position=f.player.position.clone(),vertical=f.player.velocity.y;buffer(f.input);assert.equal(f.controls.activate(),true);assert.equal(f.input.enabled,false);assert.equal(f.document.exits,1);assert.equal(f.player.velocity.x,0);assert.equal(f.player.velocity.z,0);assert.equal(f.player.velocity.y,vertical);assert.deepEqual(f.player.position.toArray(),position.toArray());
 assert.equal(f.input.keys.size,0);assert.equal(f.input.pressed.size,0);assert.equal(f.input.wheel,0);assert.deepEqual(f.input.consumeLook(),{x:0,y:0});
 let highest=f.player.position.y;for(let frame=0;frame<200;frame++){buffer(f.input);if(frame===10)f.input.resume();assert.equal(f.controls.maintain(),true);f.player.update(.02);highest=Math.max(highest,f.player.position.y);assert.equal(f.player.position.x,position.x);assert.equal(f.player.position.z,position.z);assert.equal(f.player.yaw,.7);assert.equal(f.player.pitch,.2);}
 assert.ok(highest>position.y);assert.equal(f.player.position.y,0);assert.equal(f.player.grounded,true);buffer(f.input);f.controls.deactivate();assert.equal(f.input.enabled,true);assert.deepEqual(f.input.consumeLook(),{x:0,y:0});assert.equal(f.input.hit('Space'),false);assert.equal(f.input.down('KeyW'),false);assert.equal(f.input.wheel,0);assert.equal(f.canvas.focused,true);f.controls.dispose();assert.equal(f.listeners.size,0);
});
test('entry checks walk/authority guard and exit never resumes prior-disabled or unsafe input',()=>{
 for(const initial of [false,true]){const f=fixture();f.input.enabled=initial;f.controls.activate();f.setResumable(false);buffer(f.input);f.controls.deactivate();assert.equal(f.input.enabled,false);assert.equal(f.input.keys.size,0);assert.equal(f.input.look.x,0);f.controls.dispose();}
 const f=fixture();f.player.mode='swim';assert.equal(f.controls.activate(),false);assert.equal(f.input.enabled,true);f.player.mode='walk';f.setAllowed(false);assert.equal(f.controls.activate(),false);f.setAllowed(true);f.controls.activate();f.setAllowed(false);f.setResumable(false);assert.equal(f.controls.maintain(),false);assert.equal(f.controls.active,false);assert.equal(f.input.enabled,false);f.controls.dispose();
});
test('capture pointer blockers prevent lock requests only while active and disposal removes every listener',()=>{
 const f=fixture();let prevented=0,stopped=0;const event={preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}};for(const listener of f.listeners.values())listener(event);assert.equal(prevented,0);f.controls.activate();for(const listener of f.listeners.values())listener(event);assert.equal(prevented,3);assert.equal(stopped,3);f.controls.dispose();f.controls.dispose();assert.equal(f.listeners.size,0);assert.equal(f.input.enabled,true);assert.equal(f.controls.activate(),false);
});
class Element{constructor(tag){this.style={};this.tagName=tag.toUpperCase();this.children=[];this.value='';this.textContent='';}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(){}remove(){}focus(){this.focused=true;}}
test('trusted I shortcut releases pointer lock and focuses selector; typing, modifiers, repeats and synthetic keys are ignored',()=>{
 const listeners=new Set(),document={activeElement:null,createElement:tag=>new Element(tag),addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),exits:0,exitPointerLock(){this.exits++;}},controller={status:()=>({active:false,reason:'Own view'}),targets:()=>[],subscribe:()=>()=>{},ownView(){}};const panel=new PlayerEyePanel({controller,parent:new Element('main'),document});
 const dispatch=patch=>{const event={code:'KeyI',isTrusted:true,target:{tagName:'CANVAS'},preventDefault(){},stopPropagation(){},...patch};for(const listener of listeners)listener(event);};
 for(const patch of [{isTrusted:false},{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'INPUT'}},{target:{tagName:'TEXTAREA'}},{target:{isContentEditable:true}},{target:{closest:()=>true}}])dispatch(patch);assert.equal(document.exits,0);document.activeElement={tagName:'SELECT'};dispatch({});assert.equal(document.exits,0);document.activeElement=null;dispatch({});assert.equal(document.exits,1);assert.equal(panel.select.focused,true);panel.dispose();assert.equal(listeners.size,0);
});
test('wire pitch boundary rejects 1.5001 instead of treating it as an available view',()=>{
 const camera=new PerspectiveCamera(),record={key:'p',remotePlayer:true,currentWorld:true,authorized:true,validated:true,ready:true,avatar:{group:{localToWorld(){}}},scene:{},updatedAt:0,pose:{pitch:1.5001}};const view=new PlayerEyeView({eyeCamera:camera,resolveTarget:()=>record,listTargets:()=>[record],now:()=>0});assert.equal(view.targets()[0].available,false);assert.equal(view.select('p'),false);assert.match(view.status().reason,/invalid/);view.dispose();
});
