import {T} from './vendor/world-engine-contract.js';

const nightSky = new T.Color('#111520');
const nightHaze = new T.Color('#333044');
const daySky = new T.Color('#7990a3');
const dayHaze = new T.Color('#9898a2');

// The Warehouse preview and walking view use the authored evening lighting.
// A visitor's local time setting can still bring the city into daylight.
export function applyNeonAtmosphere(scene, hour = 21, flash = 0) {
  const daylight = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
  scene.background.copy(nightSky).lerp(daySky, daylight);
  scene.fog.color.copy(nightHaze).lerp(dayHaze, daylight);
  scene.fog.density = .008 - daylight * .003;
  const lights = scene.userData.repositoryLights;
  if (lights) {
    lights.sky.intensity = 1.2 + daylight;
    lights.sun.intensity = .95 + daylight * 1.65 + flash * 5;
  }
}
