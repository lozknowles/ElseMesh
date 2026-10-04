import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Input } from '../src/core/Input.js';
import { Euler, Group, Quaternion, Vector3 } from '../src/engine/index.js';
import { flightStep } from '../src/player/HelicopterPhysics.js';
import { initialHelicopter } from '../src/network/HelicopterLease.js';

class Element {
  constructor(tagName = 'DIV', parentElement = null) {
    this.tagName = tagName; this.parentElement = parentElement; this.isContentEditable = false;
    this.events = new Map(); this.classes = new Set(); this.attributes = {};
  }
  addEventListener(name, fn, options = false) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push({ fn, capture: options === true || Boolean(options?.capture) });
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) {
      if (selector.includes('.tw-interactive') && node.classes.has('tw-interactive')) return node;
      if (selector.includes('dialog') && node.attributes.role === 'dialog') return node;
    }
    return null;
  }
  dispatch(name, data = {}) {
    const event = { type: name, target: this, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...data };
    const handlers = this.events.get(name) ?? [];
    for (const { fn } of handlers.filter(handler => handler.capture)) fn(event);
    if (!event.stopped) for (const { fn } of handlers.filter(handler => !handler.capture)) fn(event);
    return event;
  }
}

function fixture() {
  const previous = { window: globalThis.window, document: globalThis.document };
  const win = new Element(), doc = new Element(), dom = new Element('CANVAS');
  let blocked = false;
  win.matchMedia = () => ({ matches: false });
  doc.querySelector = () => null; doc.hidden = false; doc.activeElement = dom;
  globalThis.window = win; globalThis.document = doc;
  const input = new Input(dom, { keyboardLookBlocked: () => blocked });
  return { input, win, doc, dom, block(value) { blocked = value; },
    key(code, extra = {}) { return win.dispatch('keydown', { code, target: dom, ...extra }); },
    release(code, extra = {}) { return win.dispatch('keyup', { code, target: dom, ...extra }); },
    focus(target) { doc.activeElement = target; doc.dispatch('focusin', { target }); win.dispatch('focusin', { target }); },
    restore() { for (const [key, value] of Object.entries(previous)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } };
}
function run(fn) { const f = fixture(); try { return fn(f); } finally { f.restore(); } }
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-9, `Expected ${expected}, got ${actual}`); }

test('unlocked arrows supply fixed per-second look; default dt and opposites are deterministic', () => run(f => {
  assert.equal(f.input.locked, false);
  const event = f.key('ArrowRight'); assert.equal(event.defaultPrevented, true);
  near(f.input.consumeLook().x, 700 / 60);
  assert.deepEqual(f.input.consumeLook(0), { x: 0, y: 0 });
  f.key('ArrowLeft'); f.key('ArrowUp'); f.key('ArrowDown');
  assert.deepEqual(f.input.consumeLook(0.25), { x: 0, y: 0 });
  f.release('ArrowLeft'); f.release('ArrowUp');
  assert.deepEqual(f.input.consumeLook(0.1), { x: 70, y: 70 });
  f.release('ArrowRight'); f.release('ArrowDown'); f.key('ArrowLeft'); f.key('ArrowUp');
  assert.deepEqual(f.input.consumeLook(0.1), { x: -70, y: -70 });
}));

test('look distance is frame-rate independent and repeated keydown does not accelerate or retrigger', () => {
  for (const rate of [30, 60, 120]) run(f => {
    f.key('ArrowRight'); f.input.endFrame();
    for (let i = 0; i < 25; i++) f.key('ArrowRight', { repeat: true });
    assert.equal(f.input.hit('ArrowRight'), false);
    let x = 0;
    for (let frame = 0; frame < rate; frame++) { x += f.input.consumeLook(1 / rate).x; f.input.endFrame(); }
    near(x, 700);
  });
});

test('mouse, touch and cursor deltas add; WASD movement and public clear remain independent', () => run(f => {
  f.input.lookStick.x = 0.8; f.input.lookStick.y = -0.9;
  const touch = f.input.consumeLook(0.2);
  f.dom.dispatch('mousedown', { button: 0 });
  f.win.dispatch('mousemove', { movementX: 3, movementY: -4 });
  f.key('KeyW'); f.key('KeyD'); f.key('ArrowRight'); f.key('ArrowDown');
  const look = f.input.consumeLook(0.2);
  near(look.x, touch.x + 3 + 140); near(look.y, touch.y - 4 + 140);
  assert.deepEqual(f.input.moveAxes(), { x: 1, y: 1, sprint: 0 });
  f.win.dispatch('mousemove', { movementX: 7, movementY: 2 });
  f.input.clearKeyboardLook();
  assert.equal(f.input.hit('ArrowRight'), false);
  assert.equal(f.input.down('KeyW'), true); assert.equal(f.input.down('KeyD'), true);
  const cleared = f.input.consumeLook(0.2);
  near(cleared.x, touch.x + 7); near(cleared.y, touch.y + 2);
}));

test('Ctrl, Meta, Alt and prevented events are rejected; Shift alone is allowed', () => run(f => {
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { defaultPrevented: true }]) {
    f.input.clearKeyboardLook();
    const event = f.key('ArrowRight', extra);
    assert.equal(event.defaultPrevented, Boolean(extra.defaultPrevented));
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  }
  f.key('ArrowDown', { shiftKey: true });
  assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 70 });
  // A modifier transition consumed by UI still clears an existing arrow hold.
  f.key('ControlLeft', { ctrlKey: true, stopped: true });
  assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
}));

test('editable and UI targets or active focus retain browser arrow handling', () => run(f => {
  const targets = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY'].map(tag => new Element(tag));
  const editable = new Element(); editable.isContentEditable = true; targets.push(editable);
  const interactive = new Element(); interactive.classes.add('tw-interactive'); targets.push(new Element('SPAN', interactive));
  const dialog = new Element(); dialog.attributes.role = 'dialog'; targets.push(new Element('DIV', dialog));
  for (const target of targets) {
    f.doc.activeElement = f.dom;
    const direct = f.key('ArrowUp', { target });
    assert.equal(direct.defaultPrevented, false);
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
    f.doc.activeElement = target;
    const focused = f.key('ArrowDown', { target: f.dom });
    assert.equal(focused.defaultPrevented, false);
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  }
}));

test('focusin immediately releases a hold; keyup capture releases despite stopped bubble', () => run(f => {
  assert.ok(f.win.events.get('keyup').some(handler => handler.capture), 'keyup must register capture');
  f.key('ArrowRight'); f.release('ArrowRight', { stopped: true });
  assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  f.key('ArrowRight'); f.focus(new Element('BUTTON'));
  f.doc.activeElement = f.dom;
  assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  f.key('ArrowRight', { repeat: true });
  assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  f.key('ArrowRight'); assert.equal(f.input.consumeLook(0.1).x, 70);
}));

test('modal callback clears held arrows at consume and frame boundaries without revival', () => run(f => {
  for (const boundary of [() => f.input.consumeLook(0.1), () => f.input.endFrame()]) {
    f.block(false); f.key('ArrowRight'); f.key('KeyW');
    f.block(true); boundary();
    const rejected = f.key('ArrowDown'); assert.equal(rejected.defaultPrevented, false);
    f.block(false);
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
    assert.equal(f.input.down('KeyW'), true);
    f.key('ArrowRight', { repeat: true });
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  }
}));

test('disabled/hidden input, blur, visibility and suspend cannot restore old holds', () => run(f => {
  for (const reset of [() => f.win.dispatch('blur'), () => { f.doc.hidden = true; f.doc.dispatch('visibilitychange'); }, () => f.input.suspend()]) {
    f.doc.hidden = false; f.input.resume(); f.key('ArrowRight'); reset();
    f.doc.hidden = false; f.input.resume();
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
    f.key('ArrowRight', { repeat: true });
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  }
  for (const block of [() => { f.input.enabled = false; }, () => { f.doc.hidden = true; }]) {
    f.doc.hidden = false; f.input.resume(); block();
    const rejected = f.key('ArrowRight'); assert.equal(rejected.defaultPrevented, false);
    f.doc.hidden = false; f.input.resume();
    assert.deepEqual(f.input.consumeLook(0.1), { x: 0, y: 0 });
  }
}));

test('actual helicopter update uses arrows for steering and comma/period only for side peek', () => run(f => {
  // Execute the actual update body with real Input/physics/math. Loading the
  // entire world module would pull unrelated Vite asset imports into Node.
  const source = readFileSync(new URL('../src/world/ThirdIslandSystem.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const marker = ' update(dt) {';
  const start = source.indexOf(marker), end = source.lastIndexOf('\n }\n}');
  assert.ok(start >= 0 && end > start, 'Helicopter update method must be extractable');
  const update = Function('flightStep', 'Vector3', 'Euler', `return function(dt) {${source.slice(start + marker.length, end)}};`)(flightStep, Vector3, Euler);
  function helicopter() {
    const system = { update, time: 0, active: true, state: initialHelicopter(), peek: 0, lookPitch: 0, trees: [],
      wildlife: { update() {} }, padLamps: [{}, {}], sock: { rotation: {} }, loz: { update() {} }, key: { rotation: { y: 0 } },
      updateLozDialogue() {}, portalInterior: { update() {} }, abandonedWarehouse: { update() {} }, ground: () => 8,
      helicopter: new Group(), hud: { style: {} }, rotor: { rotation: { y: 0 } }, tailRotor: { rotation: { x: 0 } },
      resetPose() { const s = this.state; this.helicopter.position.set(s.x, s.y, s.z); this.helicopter.quaternion.setFromEuler(new Euler(s.pitch, s.yaw, s.roll, 'YXZ')); },
      app: { input: f.input, player: { mode: 'helicopter', position: new Vector3(), velocity: new Vector3() }, camera: { position: new Vector3(), quaternion: new Quaternion() }, colliders: { raycast: () => Infinity, cylinders: [] } } };
    return system;
  }
  for (const [code, expectedYaw, peekSign] of [['ArrowRight', -0.154, 0], ['ArrowLeft', 0.154, 0], ['Comma', 0, 1], ['Period', 0, -1]]) {
    f.input._clearTransientInput(); f.key(code);
    const system = helicopter(); system.update(0.1);
    near(system.state.yaw, expectedYaw);
    assert.equal(Math.sign(system.peek), peekSign);
    assert.ok(Number.isFinite(system.app.camera.quaternion.w));
  }
}));
