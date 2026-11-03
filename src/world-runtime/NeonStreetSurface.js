import {T} from './vendor/world-engine-contract.js';
import {NEON_STREET_LIMIT} from './NeonShiftLots.js';

// One baked tile covers a two-by-two block. Light spill is painted into the
// wet asphalt so portal previews and the active city share the same surface.
function paintBlock(ctx) {
  const size = ctx.canvas.width;
  let seed = 61735;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pixels = ctx.createImageData(size, size);
  for (let p = 0; p < pixels.data.length; p += 4) {
    const grain = Math.floor(random() * 12);
    pixels.data.set([32 + grain, 39 + grain, 51 + grain, 255], p);
  }
  ctx.putImageData(pixels, 0, 0);
  const unit = size / 36;
  ctx.scale(unit, unit);
  function street(y, reverse) {
    ctx.save();
    if (reverse) ctx.transform(0, 1, 1, 0, 0, 0);
    ctx.translate(0, y);
    for (const side of [-1, 1]) {
      // Broken curb paint on block fronts, clear space at crossings.
      for (const x of [4.5, 22.5]) {
        ctx.fillStyle = '#65665a';
        ctx.fillRect(x, side * 3.70, 9, .085);
        const light = side === 1 ? [213, 63, 115] : [58, 179, 203];
        for (let i = 0; i < 210; i++) {
          const d = random() ** 1.9;
          const dx = x + random() * 8.4;
          ctx.fillStyle = 'rgba(' + light.join(',') + ',' + (.10 + (1 - d) * .26) + ')';
          ctx.fillRect(dx, side * (3.6 - d * 2.8), .18 + random() * .65, .025 + random() * .055);
        }
        // Recessed storm drains running parallel to the curb.
        ctx.fillStyle = '#121b24';
        ctx.fillRect(x + 2, side * 3.25, .92, .28);
        ctx.fillStyle = '#55606c';
        for (let grate = 0; grate < 8; grate++) ctx.fillRect(x + 2.05 + grate * .11, side * 3.25, .025, .27);
      }
    }
    ctx.fillStyle = '#887658';
    for (const x of [5, 11, 23, 29]) ctx.fillRect(x, -.055, 2, .11);
    ctx.restore();
  }
  for (const y of [0, 18, 36]) { street(y, false); street(y, true); }
  // Oblique repair seams and fine rain scratches break up the two-axis grid.
  ctx.strokeStyle = '#262c36'; ctx.lineWidth = .045;
  for (let i = 0; i < 38; i++) {
    const x = random() * 36, y = random() * 36;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + .38, y + .21); ctx.lineTo(x + .61, y + .16); ctx.stroke();
  }
}

export function installNeonStreetSurface(floor, grid) {
  grid.visible = false;
  const canvas = typeof document === 'undefined' ? {width: 512, height: 512} : document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext?.('2d');
  if (ctx) paintBlock(ctx);
  const surface = new T.CanvasTexture(canvas);
  surface.name = 'NeonShift_WetAsphalt';
  surface.wrapS = surface.wrapT = T.RepeatWrapping;
  surface.repeat.setScalar(2 * NEON_STREET_LIMIT / 36);
  surface.offset.setScalar(-NEON_STREET_LIMIT / 36);
  surface.anisotropy = 4;
  surface.colorSpace = T.SRGBColorSpace;
  const material = floor.material;
  material.color.set('#ffffff');
  material.map = surface;
  material.emissive.set('#ffffff');
  material.emissiveIntensity = .48;
  material.emissiveMap = surface;
  material.metalness = .22;
  material.roughness = .38;
  floor.name = 'NeonShift_WetStreets';
}
