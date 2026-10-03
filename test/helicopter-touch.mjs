import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/Input.js';
import { flightStep, canLeaveHelicopter } from '../src/player/HelicopterPhysics.js';
import { initialHelicopter } from '../src/network/HelicopterLease.js';
import { readFileSync } from 'node:fs';
import { Vector3 } from '../src/engine/index.js';

class Element {
  constructor(captures=new Map()){this.events=new Map();this.children=[];this.style={};this.attributes={};this.captures=captures;this.classes=new Set();
    this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,value)=>value?this.classes.add(x):this.classes.delete(x)};}
  addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn);}
  dispatch(name,data={}){const e={preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...data};for(const fn of this.events.get(name)||[])fn(e);return e;}
  append(child){this.children.push(child);}
  setAttribute(name,value){this.attributes[name]=value;}
  querySelector(){return this.knob??(this.knob=new Element(this.captures));}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
  setPointerCapture(id){this.captures.set(id,this);}
  hasPointerCapture(id){return this.captures.get(id)===this;}
  releasePointerCapture(id){if(!this.hasPointerCapture(id))return;this.captures.delete(id);this.dispatch('lostpointercapture',{pointerId:id});}
}
function fixture(){
  const previous={window:globalThis.window,document:globalThis.document},captures=new Map(),root=new Element(captures),win=new Element(captures),doc=new Element(captures);
  win.matchMedia=()=>({matches:true});doc.createElement=()=>new Element(captures);doc.querySelector=()=>root;doc.hidden=false;
  globalThis.window=win;globalThis.document=doc;
  const input=new Input(new Element(captures)),flight=root.children[0].children.find(e=>e.className==='tw-touch-flight');
  const [up,down]=flight.children;
  return {input,up,down,flight,win,doc,captures,
    pointer:(target,name,id,data={})=>(captures.get(id)||target).dispatch(name,{pointerId:id,...data}),
    restore(){for(const [key,value]of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};
}
function run(fn){const f=fixture();try{return fn(f);}finally{f.restore();}}

test('altitude controls only hold in helicopter mode; capture keeps drag/release out of look',()=>run(f=>{
  assert.equal(f.flight.hidden,true);assert.equal(f.up.textContent,'Up');assert.equal(f.down.textContent,'Down');
  assert.match(f.up.attributes['aria-label'],/Helicopter up/);
  f.pointer(f.up,'pointerdown',1);assert.equal(f.input.down('Space'),false);
  f.input.setHelicopterTouchMode(true);assert.equal(f.flight.hidden,false);
  const start=f.pointer(f.up,'pointerdown',1);assert.ok(start.defaultPrevented&&start.stopped);
  assert.equal(f.input.down('Space'),true);assert.equal(f.input.keys.has('Space'),false);assert.equal(f.captures.get(1),f.up);
  const drag=f.pointer(f.win,'pointermove',1,{clientX:-500,clientY:1000});assert.ok(drag.defaultPrevented&&drag.stopped);
  assert.deepEqual(f.input.consumeLook(),{x:0,y:0});assert.equal(f.input.down('Space'),true);
  f.pointer(f.win,'pointerup',1);assert.equal(f.input.down('Space'),false);assert.equal(f.captures.size,0);
}));

test('pointer sources and physical keyboard remain independent',()=>run(f=>{
  f.input.setHelicopterTouchMode(true);
  f.pointer(f.up,'pointerdown',1);f.pointer(f.up,'pointerdown',2);f.pointer(f.down,'pointerdown',3);
  assert.equal(f.input.down('Space'),true);assert.equal(f.input.down('KeyC'),true);
  f.pointer(f.up,'pointercancel',1);assert.equal(f.input.down('Space'),true);
  f.up.dispatch('lostpointercapture',{pointerId:99});assert.equal(f.input.down('Space'),true);
  f.up.releasePointerCapture(2);assert.equal(f.input.down('Space'),false);assert.equal(f.input.down('KeyC'),true);
  f.win.dispatch('keydown',{code:'KeyC'});f.pointer(f.down,'pointerup',3);assert.equal(f.input.down('KeyC'),true);
  f.pointer(f.down,'pointerdown',4);f.win.dispatch('keyup',{code:'KeyC'});assert.equal(f.input.down('KeyC'),true);
  f.pointer(f.down,'pointercancel',4);assert.equal(f.input.down('KeyC'),false);
}));

test('mode exit clears touch sources/capture while preserving keyboard',()=>run(f=>{
  f.input.setHelicopterTouchMode(true);f.win.dispatch('keydown',{code:'KeyC'});f.pointer(f.up,'pointerdown',1);
  f.input.setHelicopterTouchMode(false);
  assert.equal(f.flight.hidden,true);assert.equal(f.input.down('Space'),false);assert.equal(f.input.down('KeyC'),true);assert.equal(f.captures.size,0);
  f.input.setHelicopterTouchMode(true);assert.equal(f.input.down('Space'),false);
}));

test('cancel, focus/visibility changes, suspension and resets cannot leave altitude held',()=>run(f=>{
  f.input.setHelicopterTouchMode(true);
  for(const reset of [()=>f.win.dispatch('blur'),()=>{f.doc.hidden=true;f.doc.dispatch('visibilitychange');},()=>f.input.suspend(),()=>f.input.resume(),()=>f.input._clearTransientInput()]) {
    f.input.enabled=true;f.pointer(f.up,'pointerdown',1);f.pointer(f.down,'pointerdown',2);reset();
    assert.equal(f.input.down('Space'),false);assert.equal(f.input.down('KeyC'),false);assert.equal(f.captures.size,0);
    assert.equal(f.up.classes.has('is-active'),false);assert.equal(f.down.classes.has('is-active'),false);
  }
  f.input.suspend();f.pointer(f.up,'pointerdown',3);assert.equal(f.captures.size,0);
}));

test('held touch altitude follows existing spool/climb/land and safe-exit physics',()=>run(f=>{
  f.input.setHelicopterTouchMode(true);const state=initialHelicopter();
  const step=()=>flightStep(state,{active:true,x:0,forward:0,lift:Number(f.input.down('Space'))-Number(f.input.down('KeyC'))},1/120,()=>8);
  f.pointer(f.up,'pointerdown',1);for(let i=0;i<1200;i++)step();
  assert.ok(state.y>45);assert.equal(canLeaveHelicopter(state),false);
  f.pointer(f.up,'pointerup',1);f.pointer(f.down,'pointerdown',2);for(let i=0;i<2400;i++)step();
  assert.equal(state.y,8.25);assert.equal(canLeaveHelicopter(state),true);
  state.vx=1;assert.equal(canLeaveHelicopter(state),false,'must also stop');
}));

test('real helicopter exit keeps airborne/moving/water gates and clears buttons only after safe exit',async()=>{
  const f=fixture();
  try {
    // ThirdIsland's asset dependencies use Vite import.meta.env. Execute the real
    // method body without loading unrelated browser asset modules in Node.
    const source=readFileSync(new URL('../src/world/ThirdIslandSystem.js',import.meta.url),'utf8');
    const body=source.slice(source.indexOf(' exit() {')+' exit() {'.length,source.indexOf(' update(dt) {'));
    const exit=Function('canLeaveHelicopter','return function(){'+body.slice(0,body.lastIndexOf('}'))+'};')(canLeaveHelicopter);
    const system={exit};let ground=8;
    system.active=true;system.state={...initialHelicopter(),grounded:false};system.hud={style:{}};system.granted=true;
    system.app={input:f.input,terrainData:{heightAt:()=>ground},player:{mode:'helicopter',position:new Vector3(),velocity:new Vector3(),groundAt:()=>8}};
    system.toast=message=>{system.lastMessage=message;};f.input.setHelicopterTouchMode(true);f.pointer(f.up,'pointerdown',1);
    assert.equal(system.exit(),false);assert.equal(f.input.down('Space'),true);
    system.state.grounded=true;system.state.vx=1;assert.equal(system.exit(),false);
    system.state.vx=0;ground=-1;assert.equal(system.exit(),false);
    ground=8;assert.equal(system.exit(),true);assert.equal(system.app.player.mode,'walk');
    assert.equal(f.flight.hidden,true);assert.equal(f.input.down('Space'),false);assert.equal(f.captures.size,0);
  } finally {f.restore();}
});
