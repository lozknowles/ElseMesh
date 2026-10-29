# Changelog

## Unreleased

- Accept sliced GLB input views and preserve inert node metadata with container bounds checks.
- Add per-view visual detail for installed stock avatars and small repository spheres, cylinders and cones. Original world contracts, collisions, appearance and permission checks remain in use; no frame-rate result is claimed.
- Allocate a nearby supported local spawn when the authored arrival is occupied or blocked, within bounded server-owned limits. Exact signed portal arrivals retain their existing mapping.
- Include reduced installed avatar geometry in opening-world packages and add focused loader, LOD and atomic admission checks.

## 0.2.0 — 2026-10-29

### Added

- Runtime graphics controls and quality presets, including an adaptive quality option.
- An opt-in 2× output supersampling experiment for the qualified Sunset world, plus conservative portal-aperture culling. Supersampling is off by default and does not change the selected scene/world detail.

### Improved

- TV video presentation now handles the projected video viewport when it is clipped by the game view, while retaining conservative visibility and obstruction behavior.
- Ground collision queries use a ground-only spatial hierarchy with an exact fallback; existing capsule and ray collision checks remain in place.

### Performance status

- The changes reduce selected rendering and collision costs, but high-detail gameplay has not been qualified at a stable 30 FPS. Portal GPU readback stalls remain unresolved.
- GPU sorting remains an investigation/prototype and is not enabled in the runtime.
- No fixed frame-rate result is guaranteed across devices or scenes.

### Release status

- These notes describe repository source. The website and downloadable archive are separate release artifacts; source changes take effect there only when those artifacts are updated.
