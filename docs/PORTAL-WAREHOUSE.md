# Portal warehouse

Author: **Agent Control**

The signed warehouse loft on Island 3 is Building #001. It remains separate from the imported abandoned Building #002.

## Interior

The production recipe in `src/world/PortalInteriorRecipe.js` builds an industrial shell with:

- CC0 scanned brick and concrete maps, metre-scale world projection and bounded 1K textures;
- a polished tiled ground floor with subtle damp variation and reflections;
- rusted black RSJs, splice plates, rivets and exposed roof members;
- a lounge, dining table, kitchen, rugs, pictures, plants and warm task lights;
- illuminated stairs with chrome details and glass ending below the sloping handrail;
- a glass-fronted mezzanine with swivel chairs, books, detailed retro-computer desks, a black library wall and an original period-inspired rainbow emblem.

Merged material batches keep the procedural detail practical for the WebGPU runtime. The original circulation, arrival point, stair footprint, mezzanine footprint and exit remain unchanged.

The fabric and charcoal batches use a 512 px PBR upholstery set derived from BlendKit's CC0 **Soft Black Fabric** by Share Textures. Its untouched 1K source and acquisition metadata are preserved outside the public repository; the three runtime maps total 313,441 bytes. A qualified CC0 chaise was retained as an off-repository design reference because its seven textures and 3.1 m footprint did not justify the browser cost. Royalty Free loft scenes were used only for layout study because assets in this public web repository remain directly extractable. The governed shortlist and hashes are recorded in `tools/portal_interior/blendkit-reference-v1.json`.

## Commodore 64 terminal

Walk to the Commodore 64 on the mezzanine and press **E**. The terminal opens full screen and suspends world controls. Log in with a local display name, then enter numbered BASIC lines. Useful commands include:

```text
10 PRINT "ELSEMESH"
20 FOR I=1 TO 5
30 PRINT I
40 NEXT I
LIST
RUN
SAVE "DEMO"
LOAD "DEMO"
```

The interpreter is the MIT-licensed BASIC-M6502-TS browser build derived from Microsoft's open-source 6502 BASIC. The integration does not ship proprietary Commodore ROMs. `SAVE` and `LOAD` use browser local storage. **Leave** or **Escape** returns to the game.

## First-arrival welcome

The random Esmie ambient voice and its exclusive bundled audio have been removed.
Worlds can instead author a Welcome greeting in the editor. The repository runtime
shows that text and offers native local-voice speech after the first acknowledged
arrival. Private visit records stay outside world repositories. See
[the welcome authority contract](owner-world-welcome.md). Browser speech availability
and audible client playback require separate qualification.

## Agent Control reference-detail operation

The second reference pass adds arched window transoms, roof plates and rivets, mixed cushions and a sofa throw, floor and task lamps, an ottoman, kitchen backsplash, oven, bottles and pendant lights, dining place settings and flowers, richer woven rugs, desk drawers and media, stereo equipment, speakers, small plants, denser graffiti and mezzanine reading chairs. These additions reuse the existing merged material batches and do not change the protected arrival, stair, mezzanine or C64 interaction routes. See [the reference recipe](../tools/portal_interior/reference-detail-v1.json).

## Verification

`test/portal-warehouse.mjs` checks retained circulation zones, reference detail,
programmable BASIC execution, queued terminal input and removal of ambient voice
initialization/assets. Welcome authority and client delivery have separate focused
tests; their programmatic speech checks do not establish audible playback.
