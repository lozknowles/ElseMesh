export const GRAPHICS_DEFAULTS = Object.freeze({
 mode: 'manual', maxOutputPixels: 1000000, portalLongEdge: 512, minimumScale: .7
});

export const GRAPHICS_PRESETS = Object.freeze({
 performance: Object.freeze({...GRAPHICS_DEFAULTS, maxOutputPixels: 500000, portalLongEdge: 256}),
 standard: GRAPHICS_DEFAULTS,
 capture: Object.freeze({...GRAPHICS_DEFAULTS, maxOutputPixels: 2100000, portalLongEdge: 1024})
});

const OPTIONS = Object.freeze({
 mode: ['manual', 'target30'],
 maxOutputPixels: [500000, 1000000, 1500000, 2100000],
 portalLongEdge: [256, 384, 512, 768, 1024],
 minimumScale: [.5, .7, .85]
});

/** Partial preferences are allowed; an invalid field invalidates the whole object. */
export function validateGraphicsPreferences(input) {
 try {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return {...GRAPHICS_DEFAULTS};
  if (Reflect.ownKeys(input).some(key => !Object.hasOwn(OPTIONS, key))) return {...GRAPHICS_DEFAULTS};
  const result = {...GRAPHICS_DEFAULTS};
  for (const key of Object.keys(OPTIONS)) {
   if (Object.hasOwn(input, key)) {
    const value = input[key];
    if (!OPTIONS[key].includes(value)) return {...GRAPHICS_DEFAULTS};
    result[key] = value;
   }
  }
  return result;
 } catch {
  return {...GRAPHICS_DEFAULTS};
 }
}

const BUFFER_LIMIT = 300;
const REFRESH_MS = 250;
const WINDOW_MS = 4000;
const WARMUP_MS = 3000;
const COOLDOWN_MS = 2000;
const SETTLE_MS = 500;
const PHASE_MS = 4000; // 500ms settle, then at least3s of complete frame intervals.
const MIN_PHASE_SAMPLES = 30;
const MIN_GAIN = 1.08;
const BASELINE_VARIATION = .15;
const SLOW_MS = 2000;
const RECOVERY_MS = 8000;
const STEP = .1;
const rounded = value => Math.round(value * 100) / 100;
const percentile = (sorted, fraction) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];

/**
 * Pure pacing policy. Call with performance.now(), never a clamped simulation dt.
 * The renderer owns applying effective settings. A lower resolution is a probe,
 * not an assertion that resolution caused the slowdown or that 30FPS is possible.
 */
export class GraphicsQualityModel {
 constructor(preferences = GRAPHICS_DEFAULTS) {
  this.revision = 0;
  this.settings = validateGraphicsPreferences(preferences);
  this.scale = 1;
  this.portalScale = 1;
  this.effective = this._effective();
  this._resetPolicy();
 }

 configure(preferences) {
  this.settings = validateGraphicsPreferences(preferences);
  this.scale = this.portalScale = 1;
  this._publishEffective();
  this._resetPolicy();
  return this.snapshot();
 }

 _resetPolicy() {
  this.intervals = [];
  this.previous = null;
  this.started = null;
  this.lastRefresh = null;
  this.slowSince = this.fastSince = null;
  this.cooldownUntil = 0;
  this.probe = null;
  this.blocked = {portal: false, output: false};
  this.blockedReasons = {portal: null, output: null};
  this.decisions = [];
  this.stats = {fps: null, p95Ms: null, p99Ms: null, samples: 0};
  this.status = this.settings.mode === 'manual' ? 'Manual quality' : 'Warming up';
 }

 _effective() {
  return {
   maxOutputPixels: Math.min(this.settings.maxOutputPixels, Math.round(this.settings.maxOutputPixels * this.scale ** 2)),
   portalLongEdge: Math.max(256, Math.min(this.settings.portalLongEdge, Math.round(this.settings.portalLongEdge * this.portalScale))),
   scale: this.scale,
   portalScale: this.portalScale
  };
 }

 _publishEffective() {
  const next = this._effective();
  if (JSON.stringify(next) !== JSON.stringify(this.effective)) {
   this.effective = next;
   this.revision++;
  }
 }

 _decision(at, action, detail = {}) {
  this.decisions.push({at, action, ...detail});
  if (this.decisions.length > 16) this.decisions.shift();
 }

 _setScale(kind, value) {
  if (kind === 'portal') this.portalScale = value;
  else this.scale = value;
  this._publishEffective();
 }

 _lowerScale(kind) {
  const before = kind === 'portal' ? this.portalScale : this.scale;
  const floor = kind === 'portal' ? Math.max(this.settings.minimumScale, 256 / this.settings.portalLongEdge) : this.settings.minimumScale;
  return Math.max(floor, rounded(before - STEP));
 }

 _breakClock(status) {
  // An interrupted probe has no stable comparison window: restore it, not accept it.
  if (this.probe) this._setScale(this.probe.kind, this.probe.before);
  this.probe = null;
  this.previous = this.started = this.lastRefresh = null;
  this.slowSince = this.fastSince = null;
  this.intervals = [];
  this.stats = {fps: null, p95Ms: null, p99Ms: null, samples: 0};
  this.status = status;
 }

 observe(timestamp, {eligible = true, visible = true} = {}) {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
   this._breakClock('Waiting for a valid frame clock');
   return;
  }
  if (!visible || !eligible) {
   this._breakClock(!visible ? 'Paused while hidden' : 'Waiting for a stable scene');
   return;
  }
  if (this.previous === null) {
   this.previous = this.started = timestamp;
   this.status = this.settings.mode === 'manual' ? 'Manual quality' : 'Warming up';
   return;
  }
  const elapsed = timestamp - this.previous;
  this.previous = timestamp;
  // Long explicit pauses are not a meaningful pacing sample. Slow real frames up
  // to ten seconds are retained without a dt cap, including 100ms/500ms stalls.
  if (elapsed <= 0 || elapsed > 10000) {
   this._breakClock('Waiting for a valid frame clock');
   return;
  }
  this.intervals.push({at: timestamp, ms: elapsed});
  if (this.intervals.length > BUFFER_LIMIT) this.intervals.shift();
  // Aggregate the phase independently of bounded sample storage, even at1000Hz.
  if (this.probe && timestamp - elapsed >= this.probe.phaseStarted + SETTLE_MS) {
   this.probe.measuredMs += elapsed;
   this.probe.measuredSamples++;
  }
  if (this.lastRefresh !== null && timestamp - this.lastRefresh < REFRESH_MS) return;
  this.lastRefresh = timestamp;
  const window = this.intervals.filter(sample => sample.at > timestamp - WINDOW_MS);
  const sorted = window.map(sample => sample.ms).sort((a, b) => a - b);
  const duration = window.reduce((sum, sample) => sum + sample.ms, 0);
  this.stats = {
   fps: 1000 * window.length / duration,
   p95Ms: percentile(sorted, .95), p99Ms: percentile(sorted, .99), samples: window.length
  };
  if (this.settings.mode === 'manual') {
   this.status = 'Manual quality';
   return;
  }
  if (timestamp - this.started < WARMUP_MS || (duration < 1000 && window.length < 30) || window.length < 2) {
   this.status = 'Warming up';
   return;
  }
  this._adapt(timestamp);
 }

 _adapt(at) {
  const fps = this.stats.fps;
  if (this.probe) {
   const probe = this.probe;
   this.status = probe.phase === 'candidate' ? this._testingStatus(probe.kind) : 'Checking previous detail';
   if (at - probe.phaseStarted < PHASE_MS) return;
   const measuredFps = probe.measuredMs >= 3000 && probe.measuredSamples >= MIN_PHASE_SAMPLES ? 1000 * probe.measuredSamples / probe.measuredMs : null;
   if (probe.phase === 'candidate') {
    probe.candidateFps = measuredFps;
    probe.candidateSamples = probe.measuredSamples;
    // Always restore A before interpreting B. Moving workload can otherwise look
    // like a quality win merely because the camera finished an expensive turn.
    this._setScale(probe.kind, probe.before);
    probe.phase = 'confirmation';
    probe.phaseStarted = at;
    probe.measuredMs = probe.measuredSamples = 0;
    this._decision(at, 'probe-checking-baseline', {kind: probe.kind, candidateFps: probe.candidateFps});
    this.status = 'Checking previous detail';
    return;
   }
   const stable = measuredFps !== null && probe.candidateFps !== null && Math.abs(measuredFps - probe.baselineFps) / probe.baselineFps <= BASELINE_VARIATION;
   const improved = stable && probe.candidateFps >= probe.baselineFps * MIN_GAIN && probe.candidateFps >= measuredFps * MIN_GAIN;
   if (improved) this._setScale(probe.kind, probe.candidate);
   else {
    this.blocked[probe.kind] = true;
    this.blockedReasons[probe.kind] = stable ? 'nonresponsive' : 'unstable';
   }
   this._decision(at, improved ? 'probe-improved' : 'probe-restored', {
    kind: probe.kind, baselineFps: probe.baselineFps, candidateFps: probe.candidateFps,
    confirmationFps: measuredFps, stable, reason: improved ? 'confirmed' : stable ? 'nonresponsive' : 'unstable'
   });
   this.probe = null;
   this.slowSince = this.fastSince = null;
   this.cooldownUntil = at + COOLDOWN_MS;
   this.status = improved ? 'Confirmed detail change improved pacing' : this._failureStatus(probe.kind);
   return;
  }

  if (fps > 36) {
   this.slowSince = null;
   this.fastSince ??= at;
   if (at - this.fastSince >= RECOVERY_MS && at >= this.cooldownUntil) {
    const kind = this.scale < 1 ? 'output' : this.portalScale < 1 ? 'portal' : null;
    if (kind) {
     const before = kind === 'output' ? this.scale : this.portalScale;
     this._setScale(kind, Math.min(1, rounded(before + STEP)));
     this._decision(at, 'quality-recovered', {kind});
     this.cooldownUntil = at + COOLDOWN_MS;
     this.fastSince = null;
    }
    if (this.scale === 1 && this.portalScale === 1) {
     this.blocked = {portal: false, output: false};
     this.blockedReasons = {portal: null, output: null};
    }
   }
   this.status = this.scale === 1 && this.portalScale === 1 ? 'At configured quality' : 'Monitoring quality recovery';
   return;
  }
  this.fastSince = null;
  // The tiny epsilon prevents floating-point summation from treating exact30 as slow.
  if (fps >= 30 - 1e-6) {
   this.slowSince = null;
   this.status = 'Target reached';
   return;
  }

  const kind = !this.blocked.portal && this._lowerScale('portal') < this.portalScale ? 'portal' :
   !this.blocked.output && this._lowerScale('output') < this.scale ? 'output' : null;
  if (!kind) {
   this.status = this.blocked.output ? this._failureStatus('output') : 'Target not met at minimum quality';
   this.slowSince = null;
   return;
  }
  this.status = this.blocked.output ? this._failureStatus('output') : this.blocked.portal ?
   this._failureStatus('portal') : 'Monitoring sustained slow frames';
  if (at < this.cooldownUntil) {
   this.slowSince = null;
   return;
  }
  this.slowSince ??= at;
  if (at - this.slowSince < SLOW_MS) return;
  const before = kind === 'portal' ? this.portalScale : this.scale;
  const candidate = this._lowerScale(kind);
  this.probe = {kind, before, candidate, baselineFps: fps, started: at, phase: 'candidate', phaseStarted: at, measuredMs: 0, measuredSamples: 0, candidateFps: null};
  this._setScale(kind, candidate);
  this._decision(at, 'probe-started', {kind, baselineFps: fps});
  this.slowSince = this.fastSince = null;
  this.status = this._testingStatus(kind);
 }

 _testingStatus(kind) {
  return 'Testing ' + (kind === 'portal' ? 'portal' : 'screen') + ' detail';
 }

 _failureStatus(kind) {
  return this.blockedReasons[kind] === 'unstable' ? '30 FPS target not met; scene workload varied' :
   '30 FPS target not met; resolution changes did not improve frame pacing';
 }

 snapshot() {
  return {
   ...this.stats, status: this.status, settings: {...this.settings},
   effective: {...this.effective}, revision: this.revision,
   bufferedSamples: this.intervals.length,
   adaptation: {
    targetFps: 30, probe: this.probe ? {...this.probe} : null,
    blocked: {...this.blocked}, blockedReasons: {...this.blockedReasons}, decisions: this.decisions.map(value => ({...value})),
    bufferLimit: BUFFER_LIMIT
   }
  };
 }
}
