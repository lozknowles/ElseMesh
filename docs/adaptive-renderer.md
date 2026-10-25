# Adaptive renderer at portals

## Current state (25 October 2026)

The published installation selects WebGL2 once in `InstallationMode.js`. Its catalog has a global `renderer: webgl2` pin. The warehouse island can render in the native WebGPU backend, but Sunset Courtyard's Gaussian splat is supported only by the WebGL backend. `PublicPortalRuntime` already defers destination world loading until a portal is near; it does not defer or change the renderer. The current public build therefore uses WebGL throughout. This document is a design and acceptance contract, **not a claim that live switching is shipped**.

## Target behaviour

* Prefer WebGPU for the warehouse island on a compatible browser. Use the existing WebGL fallback when WebGPU is unavailable.
* Derive each validated world's rendering requirement from its authored content and engine capabilities, not from its repository URL. A `splatScene` currently requires WebGL2. Native islands prefer WebGPU.
* When an authorized portal enters preview range, load only its pinned destination revision, prepare the required backend, and display an explicitly live destination view within the source aperture. Keep the source world and its renderer active while previewing.
* For a WebGL destination viewed from WebGPU, render a clipped, mapped camera in a bounded offscreen WebGL canvas and copy its image into a WebGPU portal texture. The WebGPU specification allows `HTMLCanvasElement` with a WebGL context as a `copyExternalImageToTexture` source. Browser and device qualification remains required; no universal zero-copy or timing assumption is made. Bound the view to 512 pixels on its long edge, one visible cross-backend view, a measured update budget, and recursion depth one.
* On crossing, suspend input only after the destination graphics, physics, arrival clearance, content revision and permissions are ready. Preserve position, facing, pitch and velocity through the existing portal transform. Swap the active presentation at the same authoritative transfer point. Resume input only after a destination frame is ready.
* Keep one logical player, input owner, authority membership and portal runtime throughout the transition. Renderer-specific scenes, cameras, avatars, portal targets, GPU resources and caches are separate presentation packages keyed by backend, graphics device/context, world ID and content digest.
* If preparation fails before the transfer commits, leave the player safely in the source world and show an unavailable portal. After an authoritative transfer commits, recover the destination instead of restoring a stale source membership. Returning through the paired portal may switch back to WebGPU.
* A machine without WebGPU remains on WebGL2 throughout. No user-visible toggle is required for ordinary play.

## Required implementation boundaries

1. Move backend creation and disposal, scene construction, avatar presentation, portal view rendering and per-frame graphics state out of the single-backend closure in `main.js`. Keep the existing input, player/session, media and permission owners stable.
2. Replace the catalog's global renderer pin with validated per-world capability metadata. Verify it against loaded content; a catalog assertion alone cannot make a splat usable by WebGPU.
3. Give `PublicPortalRuntime` a backend-aware package manager. A preview package cannot be inserted into the other backend's scene. The current `PublishedWorldCache` key already includes renderer, but its one cache/two-slot ownership model must be extended with explicit leases across a switch.
4. Add a cross-backend aperture adapter with clipping, mapped camera, explicit loading/live/stale/offline states and a bounded image-copy path. Do not display a cached image as live.
5. Make travel a two-phase prepare/commit operation across physics and presentation, with cancellation and failure recovery. Keep existing federation and visitor permissions independent of repository access.

## Acceptance

On MSI: WebGPU warehouse at a point away from portals; approach Sunset without changing the warehouse renderer; live viewpoint-dependent Sunset preview; safe WebGL crossing; return to WebGPU; repeated round trips without increasing graphics resources or player/session count. Test touch controls, TV continuation, permissions and other portals. On macomarchy: the same portal journey with WebGL fallback and no attempted WebGPU swap. Measure frame stalls and portal-preview freshness on both machines. Separately verify a failure before commit leaves the player at the source and a failed post-commit presentation recovers the destination. Existing two-world and federation tests remain required.

## Architect gates

* PLAN: The existing renderer and cache are lifetime-bound in `main.js`; a page reload, duplicate public runtime or second player session would lose interaction state and risk duplicate authority. Decision: keep one logical runtime and move backend-owned resources behind presentation packages. First qualify the WebGL-to-WebGPU preview bridge on the actual target browser.
* NO-PROGRESS: The hpubuntu headless Chromium probe had no WebGPU adapter. A browser-control attempt to open a local probe file on MSI was blocked by the browser URL security policy. Do not bypass that policy. Device bridge qualification remains open and must be completed through an approved normal deployment/test surface.
* COMPLETION: Pending. Dynamic switching must not be described as implemented or released until the above acceptance runs.

## Bounded WebGL visual repair in the same checkout

The existing fallback has been improved independently of adaptive switching: source height/plant positions remain intact; the WebGL sky now responds to runtime time, cloud, wind and storm state; terrain sand/hills have additional detail; shoreline foam is limited to shallow reachable shoreline; and distant canopy cards are less sparse. This is an approximation of the original optical renderer, not parity.

* PLAN gate: Architect identified the global WebGL catalog pin and cautioned against simply changing the default to WebGPU while Sunset still requires WebGL. Decision: repair the current fallback without changing portal travel or identity.
* COMPLETION gate: Architect reviewed unit, browser and package evidence and required the sky to follow runtime environment changes. That was fixed and an integration test added. Remaining limits are native FFT/refraction/grass-blade parity and actual MSI/mac visual and performance acceptance.
