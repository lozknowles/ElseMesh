# Drifting mist and thunderstorms

The Atmosphere panel now includes Weather (Clear, Rain, Thunderstorm), Rain intensity,
Rain wind speed, Drifting mist, Mist wind speed and Mist vertical reach. The existing
sun, cloud, haze, shafts, particles and exposure controls remain in place.

Weather defaults to Clear and additional mist density defaults to zero. Selecting a
rain/storm preset increases cloud coverage once; later cloud-slider changes are
respected, including zero. Clear returns cloud coverage to at most the normal preset.
Weather and cloud settings persist locally under `elsemesh.weather.v1`. Invalid
stored values are bounded or replaced with defaults. Preview staging must namespace browser storage to keep its preferences separate from production; the game source itself uses this literal key.

Mist uses eight noise samples per pixel in the existing half-resolution AirHaze
pass, with depth-aware upsampling. It starts at the active sea-level datum and
fades exponentially with height. It is not terrain-following fog. Zero density
bypasses the added optical-depth work. Mist remains available with sun shafts off.
Existing camera/lens underwater gates retain ownership of the air/water boundary.

Rain and lightning use two native transparent meshes with a maximum of 900 rain
streaks and a 12-segment bolt. Animation is deterministic for a weather seed.
Underwater cameras, recognised caves and dry rail transit suppress weather; mist
is also suppressed in those sheltered locations. Rain is camera-local and is
clipped below the supplied water surface. It does not trace individual roof or
terrain collisions or create splashes. Lightning adds a visible bolt and air-only
flash, not a shadow-casting point light.
Both the flash and the bolt are restricted to sky pixels using scene depth;
mountains, buildings and opaque tree silhouettes occlude them. The bolt samples
the existing opaque depth copy rather than the attached render depth texture.

Thunder now follows the first visible flash of each strike with an approximate
0.32-second delay, scheduled on the existing SoundScape AudioContext clock. The
three flickers in one strike produce one rumble. Mode/seed/clock resets create a
new storm generation. Skipped flashes and events while sound is locked, muted or
at zero volume are not queued. Enter the game/click the scene to unlock audio.
The normal mute key and master volume apply; `?noAudio` creates no audio context.

Thunder is a procedural stereo noise effect, the sole exception to the recorded
ambience policy, with a reusable five-second buffer and at most two voices.
It routes through the existing above-water bus, master and limiter. Clear/Rain,
shelter, submersion, hidden documents, suspended audio and page exit cancel it.
Cancellation fades for 30 ms; source/filter/gain nodes disconnect on completion.
`?weatherAudioDebug` logs strike identity and both scheduling clocks for manual
diagnosis. Scheduling evidence does not establish perceived sound quality.

The controller releases its own meshes and materials on non-cached page exit.
Changing weather does not reset the existing ocean wind/swell controls or game
progress. This is local visual weather, not a network-synchronised simulation.

## Review gates and qualification

The user explicitly authorised game weather changes on 2026-10-21, superseding the
earlier builder-only boundary for this scope. Work is isolated on
`feature/mist-thunderstorms`, based on the verified upstream main commit
`95719848d5ffa4428b57c75c272483e1c2113a72`; dirty game checkouts remain untouched.

Architect PLAN review required retaining AirHaze/Underwater composition, Clear
defaults, bounded weather geometry, existing Atmosphere UI and separate preview
publication. The implementation follows that approach. Build and source review
are distinct from GPU and behavioural qualification. No new tests were requested,
added or run. Final source review and visible GPU acceptance are recorded with the
delivery evidence; underwater transitions, persistence, world changes and cleanup
must not be claimed qualified without their corresponding observations.

Architect COMPLETION source review found no definite JavaScript/API or WGSL source blocker and approved a feature branch/draft PR, after correcting the preview-storage claim. Normal temporal-AA rain trails are an unobserved visual risk because the CPU-animated vertices do not supply complete previous positions. Browser startup, visible mist/storm, submerged transitions, shelters, settings reload and cleanup remain separate acceptance checks; build alone does not compile WGSL. No default-branch merge is part of this delivery.

Manual Edge observation: the game finished loading, the new Atmosphere controls were present, selecting Thunderstorm set initial cloud coverage to88%, and mist visibly changed the scene. Rain streaks were visible with sun shafts at0 and mist at0.004. No console errors were captured. Screenshot evidence is retained outside the repository. The observed session reported low frame rate (about1fps); no performance or smooth-motion qualification is claimed. Lightning timing, reload persistence, underwater transitions and cleanup remain unobserved.
