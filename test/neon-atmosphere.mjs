import test from 'node:test';
import assert from 'node:assert/strict';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {applyNeonAtmosphere} from '../src/world-runtime/NeonAtmosphere.js';
import {configureWebGLRepositoryScene, updateWebGLRepositoryEnvironment} from '../src/world-runtime/WebGLRepositoryBackend.js';

test('active Neon keeps its dusk lighting, responds to local time and restores normal Warehouse lighting', () => {
  const engine = {scene: new T.Scene(), camera: new T.PerspectiveCamera()};
  engine.camera.position.y = 10;
  const environment = {timeOfDay: 21, weather: 'rain'};
  const project = {environment, objects: []};
  const neon = {project, root: new T.Group(), shiftingWorld: {configureScene: scene => applyNeonAtmosphere(scene,21)}};
  configureWebGLRepositoryScene(engine.scene, neon);
  const preview = engine.scene.background.getHex();
  updateWebGLRepositoryEnvironment(engine, neon, 1, environment);
  assert.equal(engine.scene.background.getHex(), preview);
  updateWebGLRepositoryEnvironment(engine, neon, 2, {...environment,timeOfDay:12});
  assert.notEqual(engine.scene.background.getHex(), preview);
  updateWebGLRepositoryEnvironment(engine, {project,root: new T.Group()}, 3, environment);
  assert.notEqual(engine.scene.background.getHex(), preview);
  assert.ok(engine.scene.fog.density < .001);
});
