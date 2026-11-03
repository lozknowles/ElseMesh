# Neon Shift building sources

These five skyscrapers and their colour palette come from [Kenney’s City Kit (Commercial) 2.1](https://kenney.nl/assets/city-kit-commercial). The upstream archive SHA-256 is `F8B09B081C2BB88BCC126E2DEC1CB40FD0DAD7E7E591B6C26AAEFE96FB35276B`. The original licence is in [License.txt](License.txt).

Open any `building-skyscraper-*.glb` in Blender with `Textures/colormap.png` beside the models in its original subfolder. To regenerate the runtime geometry from the engine checkout, run `node tools/derive-neon-city.mjs`. The converter preserves the source triangle connectivity, centers and scales each model to a unit bounding box, and samples the palette into vertex colours. Each generated model records the SHA-256 of its source file. The game scales these meshes into its 80 lots as the towers change height. Doors, signs and the wet streets are engine artwork.
