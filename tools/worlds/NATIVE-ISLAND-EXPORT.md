# Native first-island export

Trusted offline authoring tools. These scripts write evidence and new draft repositories. They never install callbacks or source generators in world content.

1. `node tools/worlds/export-native-island.mjs loz` and `lost` capture exact original 2048 x 2048 source scalar arrays from the private original first-island evidence, run original CPU TerrainBake, ShoreField and vegetation Scatter recipes, and write typed hashed resource tiles.
2. `node test/native-island-export.mjs` reconstructs every fine field, verifies eight raw source channels byte for byte, checks hashes/extrema/plant clearances/portable texture bindings, and independently repeats the original CPU bake, shore solve and scatter. It records the result in private evidence.
3. After installing the matching native-island contract, `node tools/worlds/package-native-draft.mjs loz` and `lost` create new repositories. The helper refuses existing output directories. It reloads the packed repository and asserts original identity, spawn, objects, asset inventory and portal data are preserved.

The source terrain uses cell centres: origin -1024, 2048 samples, 1 metre texel; sample (i,j) lies at (-1024+i+0.5,-1024+j+0.5). Fine fields contain every source sample. Coarse levels 3 and 4 are fallback data; their averages are not advertised as original fine terrain. All binary fields use row-major little endian typed arrays, tile size at most 128 and zero halo. Float channels are not quantized.

Raw rock, sand, path, gully, seagrass, rubble and scarp masks are kept separately from exact original normal/AO and splat CPU bakes. The original 512-square shore field and 1024-square RGBA grass mask are tiled with their real domain levels. The vegetation baseline is original source VegSite default obstacles and Scatter seed 99 over the unflattened first-island arrays, without removed Village footprints. Source-generator poses are exact; full original App plant-pose equality is not a target because the removed village is absent. Plant records retain every original float field and seed, species name and order. Explicit warehouse/portal or hut clearance removals occur after scattering, preserving all surviving poses and RNG order. Original default pier corridor, spawn and boardwalk exclusions apply. Cave carve and later islands were absent from the recorded source arrays; source hashes and exclusions are retained in the original private evidence.

The CPU detail texture capture removes exactly the GPU texture upload and mipmap dispatch from an evidence copy of the original module. Its pixel loop and scatter source remain unchanged and source hashes are recorded. No App, legacy World, GPU renderer or original Village is needed for environment capture. The existing Lost Island hut capture remains separate.

Six CC0 scanned bark JPEGs and their original credits travel as hashed native assets. Explicit material bindings select palm/tree albedo, normal and ORM images. Installed versioned native vegetation code builds the original procedural leaf and impostor atlas recipes; these are not arbitrary world code.

Evidence is private in `.local-evidence/native-island-20261024`. Draft output locations must be supplied explicitly; there are no machine-specific source or destination defaults. Canonical worlds, signing keys, admissions and native clients are not modified. This export is data evidence, not native visual acceptance. Vegetation records/grass remain resident and native terrain GPU textures are full-domain allocations with progressive fine uploads; only bounded fine CPU residency is claimed.

## Portable inputs and fixture tests

Paths below are examples relative to the caller's working directory. Supply your own trusted source checkout, previously captured raw fields and world repositories. No keys, owner state, grants or private capture files belong in Git. Missing required inputs fail explicitly; fixture tests are not silently skipped.

```sh
export ELSEMESH_SOURCE_ROOT="$PWD/fixtures/original-source"
export ELSEMESH_RAW_EVIDENCE_ROOT="$PWD/fixtures/raw-island"
export ELSEMESH_NATIVE_EVIDENCE_ROOT="$PWD/.local-evidence/native-island-20261024"
export ELSEMESH_LOST_EVIDENCE_ROOT="$PWD/.local-evidence/lost-island-20261024"
export ELSEMESH_NATIVE_WORLD_ROOT="$PWD/fixtures/native-world"
export ELSEMESH_LOST_ISLAND_ROOT="$PWD/fixtures/lost-world"
export ELSEMESH_COMPARISON_WORLD_ROOTS='["fixtures/other-world-a","fixtures/other-world-b","fixtures/other-world-c"]'
node --test test/lost-island-export.mjs test/repository-native-physics.mjs
node test/native-island-export.mjs
node test/native-island-real-startup.mjs "$ELSEMESH_NATIVE_WORLD_ROOT"
```

The original source fixture must contain the TerrainData, TerrainBake, ShoreField, Scatter, texture and Village modules matching the capture's recorded hashes. Raw evidence must contain the eight original field files (`original-heights.f32`, `original-rock.f32`, and six `.u8` masks). Native evidence contains the hashed `loz/` and `lost/` captures; Lost Island evidence contains `provenance.json` and raw fields. These fixtures are required external evidence, not bundled test data. The native export test performs an independent repeat capture in ignored evidence. The startup test uses the real GPU and does not substitute a mock.

CLI positional arguments override environment settings:

```sh
node tools/worlds/export-native-island.mjs loz fixtures/original-source fixtures/raw-island .local-evidence/native-island-20261024
node tools/worlds/export-lost-island.mjs fixtures/original-source drafts/new-lost .local-evidence/lost-island-20261024
node tools/worlds/package-native-draft.mjs loz fixtures/source-world drafts/new-native .local-evidence/native-island-20261024
```

For environment-only invocation, capture reads `ELSEMESH_SOURCE_ROOT` and `ELSEMESH_RAW_EVIDENCE_ROOT`; Lost Island export reads `ELSEMESH_SOURCE_ROOT` and `ELSEMESH_OUTPUT_ROOT`; packaging reads `ELSEMESH_WORLD_ROOT` and `ELSEMESH_OUTPUT_ROOT`. Evidence locations default only to the ignored relative `.local-evidence` directories shown above. Output world directories must not already exist.
