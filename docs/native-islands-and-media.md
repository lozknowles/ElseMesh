# Native islands and media screens

Worlds stay in independent repositories. `world.json` pins hashed components and resource files; loading a world never executes repository scripts, hooks or package installers. Owner keys, session state, grants, welcome-visit records and migration bundles remain private and outside world repositories.

## Detailed island rendering

`native-island/1` supplies original cell-centred terrain fields, original vegetation records and portable bark assets to installed rendering recipes. The engine reuses ElseMesh terrain CDLOD, instanced vegetation, near/far meshes, grass and ocean/refraction rendering. Plant records are flat instance data, not one scene object per plant. Fine terrain is streamed by visible/arrival tiles; owner physics admits a verified fine field. WebGL2 uses a reduced optical approximation and is not claimed identical to WebGPU.

The editor design view currently edits a coarse terrain proxy. Those height edits do not modify the captured native fine fields. The ElseMesh graphics preview renders the captured resources. Save/open a repository snapshot to preserve its resource closure; standalone project JSON cannot embed it. Native full-resolution sculpting remains a limitation.

## Flat-screen TV

`media-screen/1` is a normal editable entity with a stable ID, transform, fixed YouTube provider, validated video ID and bounded width. Video streams from YouTube; video bytes, credentials and arbitrary HTML are never stored in world data. The TV housing is real geometry on both backends.

In an owner session, `media.play` requires the authored ceiling, a private player grant, current membership and accepted proximity. The short signed lease renews while watching and revocation, expiry, disconnect or world change destroys the iframe. Standalone repository preview is explicitly separate from owner authority and cannot change owner state.

Press E near a TV, then choose **Play on TV**. A fresh user gesture is needed for browser playback policies. Return to game is outside the iframe. Embed refusal, missing client identification and autoplay restrictions are reported rather than replaced by a thumbnail. Playback is local to the authorized viewer, not synchronized across players. Portal previews contain only the inactive TV housing and never start a player or audio request.

The iframe is projected onto the physical screen and clipped to the game canvas.
When the screen is partly outside the canvas, its visible portion can remain on
screen; views crossing the camera near plane still fail closed. Visibility is
proven conservatively in screen cells: only cells with a clear sight volume are
shown. Current posed native avatar bounds, noncolliding props, terrain and
vegetation participate. The renderer-owned sky uses a guarded interior proof so
its enclosing bounding box does not falsely hide the TV. If the proof is
unavailable or altered, the normal conservative occluder path remains in force.
Playback can continue audibly while the picture is hidden by an obstruction;
world changes, lost authorization and backgrounding still stop the player.

The ground collision index uses a finer grid than capsule and ray queries while
retaining the original collision tests and candidate order. The optional captured
search regression is `test/collider-ground-capture.mjs`; it requires
`ELSEMESH_COLLIDER_CAPTURE` and `ELSEMESH_COLLIDER_PROJECT` paths to the
local retained capture and pinned Sunset connections JSON. The optional
`ELSEMESH_COLLIDER_RECEIPT` path writes a new receipt. Captures are not
included in the public game package.

`water-exclusion/1` adds up to sixteen editable, stable-ID world-space surface exclusion boxes. Main, portal, cheap and depth water variants discard final displaced surface fragments inside them. These are rendered-surface exclusions only: water queries, swimming and buoyancy are unchanged. The TV visibility proof trusts only an installed enforcing renderer and strict containment of the camera and all four corners in one box.

## Qualification limits

A finite-domain colour seam remains visible in some aerial ocean views. Original refraction improves underwater source rendering but does not fully resolve this boundary. Native TV playback and delivery video require client evidence beyond source tests. Existing vehicle/gameplay migration and legacy combined-entry retirement are separate unfinished work; retained source is not evidence those behaviours are available in repository worlds.

## Indoor weather and walking presentation

The warehouse solid roof and floor define a transformed logical shelter, including the authored collision-only hidden roof. Rain streaks intersecting it are conservatively omitted; native mist excludes sheltered ray samples and WebGL fog measures exterior ray distance. The active main view supports this explicitly recognized warehouse geometry; this does not infer arbitrary buildings or provide sheltered WebGL portal-preview weather. Storm lighting remains active; this repository runtime does not yet connect the weather callback to thunder audio. Native mist retains 24 integration samples.

Avatar body facing follows accepted horizontal displacement, including collision sliding, while camera/control and network yaw remain independent. Stationary avatars retain their last body heading; teleports and changed worlds reset presentation tracking.
