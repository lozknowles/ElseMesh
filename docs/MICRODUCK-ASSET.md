# Authentic Microduck asset

The robot geometry is an adaptation of **Pollen Robotics Microduck**, not a proxy robot. Source: https://github.com/pollen-robotics/microduck_rl at `b02fdea4902c2b93b7d34a83a6f05da4ececb7d3`. The upstream MJCF was generated from the Onshape CAD linked in its header.

## Rights and attribution

The STL meshes and adapted GLB/Blender geometry are **CC BY-NC-SA 4.0** (noncommercial, attribution and share-alike). Credit Pollen Robotics, link the repository and https://creativecommons.org/licenses/by-nc-sa/4.0/, and retain modification notices. They are separate from this application's MIT code license. The source XML, metadata and official policy weights are Apache 2.0. See the supplied upstream license notices in `public/models/microduck/`. This is a summary of the supplied licenses.

Changes: conversion from STL/MJCF to glTF; joint hierarchy retained; source RGBA materials translated to rough PBR materials; uniform display scaling to 25 cm; realtime geometry decimation; official CPU policy motion baked into rigid nodes with horizontal root translation and root yaw removed for world navigation. No textures, generated character geometry, or skin deformation are used.

## Assets and axes

- `public/models/microduck/microduck-realtime.glb`: optimized geometry with seven animations.
- Full geometry, editable Blender source and raw policy motion are not published in this distribution.
- `public/models/microduck/manifest.json`: output and source hashes, 14 joint pivots/axes/ranges, dimensions, conversion changes, policy provenance and measured rollout evidence.
- The manifest retains the editable Blender source hash; the full source file is not included.
- Raw CPU motion retains free-root motion and foot sites before display conversion; it is not included.

Native MJCF axes: +Z up, +X forward, +Y left; glTF: +Y up, +X forward, -Z left. Renderer orientation adapters must respect +X forward. The imported source visual bounds in standing pose measure about 26.77 cm; the asset parent applies uniform scaling to exactly 25 cm display height and places the lowest actual transformed visual vertex on ground. SI source bounds and scale factor remain in the manifest. Do not independently rescale root animations.

## Motion evidence and limits

Official weights: https://huggingface.co/pollen-robotics/microduck-policies at revision `665ae4eb20bfe13bca1ef4ea6d4bb6b4a096e448`, `velstand.onnx`. CPU MuJoCo and the upstream inference observation/action code drive the source robot, using the BAM XL330 M6 actuator at 50 Hz control / 500 Hz simulation. BAM is pinned to the source repository's lockfile revision `62bd8ce12154340be97e06f7f41a0ca8f116d967`; using its newer branch head changes the actuator API.

Seven clips: **Idle, Walk, Turn, Stop, Look, EnterPortal, ExitPortal**. They are all sampled official-policy responses. Command schedules and clip selection are authored: Stop ramps velocity down, Look sends a smooth head-yaw command, and portal clips ramp walking on/off. Portal teleportation is world-controller behavior, not learned policy behavior. No invented sinusoidal joint gait substitutes for the policy.

Walk and Turn are naturally phase-matched subsequences selected from the rollout, without synthesizing intermediate seam motion. Walk is 0.84 s with maximum endpoint joint difference about 0.00321 rad; Turn is 1.30 s with about 0.00251 rad. The raw walk moves about 0.0521 m forward per selected cycle (about 0.0620 m/s); display scaling reduces that to about 0.0579 m/s. Use the exact manifest speed for visual foot-speed matching. The gait has lateral/yaw drift; horizontal displacement and yaw are removed in the GLB so world navigation owns those quantities. They remain in raw evidence.

The low 0.12 m/s command produced near-standing in this rehearsal; the measured walk uses a 0.25 m/s command. Requested speed and measured speed are distinct. All seven raw rollouts stayed upright (minimum vertical-up cosine above 0.995). Foot sites are reference frames, not sole penetration measurements. Root/body trajectories and contact counts are recorded; browser-specific foot sliding, collision, transitions, portal physics and real-device execution require their own qualification. Single-shot clips do not have cyclic endpoints and should not be looped.

## Upstream reproduction

The conversion tooling and full source are not shipped with this public application. The following records the original reproduction procedure using a separate conversion checkout, Python 3.12 and Blender 4.5.9 LTS. Source and dependency versions must be pinned, and no GPU training is required.

```sh
ASSET=./microduck-assets
PROJECT=./asset-conversion-source
python3 -m venv "$ASSET/venv"
"$ASSET/venv/bin/pip" install mujoco==3.17.0 onnxruntime==1.31.0 numpy==2.5.4
# Clone microduck_rl and checkout b02fdea4902c2b93b7d34a83a6f05da4ececb7d3 into "$ASSET/upstream".
# Clone Rhoban/bam and checkout 62bd8ce12154340be97e06f7f41a0ca8f116d967 into "$ASSET/bam".
"$ASSET/venv/bin/pip" install "$ASSET/bam"
"$ASSET/venv/bin/python" "$PROJECT/tools/microduck/bake_policy.py" \
  --source "$ASSET/upstream" --cache "$ASSET/policies" --out "$ASSET/motion.json"
blender -b -t 4 \
  --python "$PROJECT/tools/microduck/convert_mjcf.py" -- \
  --source "$ASSET/upstream" --motion "$ASSET/motion.json" \
  --out "$PROJECT/public/models/microduck" --blend "$ASSET/artifacts/microduck.blend"
python3 "$PROJECT/tools/microduck/validate_asset.py" "$PROJECT/public/models/microduck"
```

The manifest records the actual installed MuJoCo version; reproduce that version when regenerating accepted motion. Checkpoint caches must match the manifest SHA-256. Normalization measures actual vertices, not rotated bounding-box corners. Constant animation channels are retained so each clip fully specifies the root and all joints. Blender preview front/rear PNGs are written beside the editable source for inspection, not embedded in the GLB.


## Measured integration bounds

The game parser and both native/WebGL scene adapters independently measure first Idle pose height **0.249989722 m**, with lowest visual vertex **-0.000000756 m** relative to ground. Normalization uses the complete hierarchy's actual transformed vertices. The exported Idle root translation agrees with the raw source by 3.1e-9 m. Constant channels are retained through Blender's separate force-keeping-object-channels setting, preventing another clip's base root position from leaking into Idle.

A 50 Hz actual-vertex envelope sweep measures maximum horizontal radius 0.087192418 m for Idle, 0.093827881 m for Walk and 0.082831083 m for Turn. Maximum heights across these poses are 0.249991210 m, 0.254060959 m and 0.263080659 m respectively. Walk/Turn minimum visual vertex heights are -0.002131797 m and -0.002194422 m; these small dynamic sole penetrations are retained from the source trajectory, without frame-by-frame floor correction.

For a conservative cylindrical/capsule proxy relative to the model origin, a 5 mm horizontal margin gives radius 0.098827881 m, and a 10 mm top margin gives height 0.273080659 m. These are visual envelope measurements, not a precise articulated contact shape. Run the repeatable sweep with:
```sh
node tools/microduck/measure_envelope.mjs
```

Raw physics foot-site Z ranges are -0.001307886 to 0.017476454 m for Walk and -0.001856232 to 0.021957285 m for Turn; global contact count stays between 3 and 7. Site anchors and global contact counts do not establish which foot/contact patch is planted or quantify ground slip. No contact-patch no-slip claim is made.

## Public local behavior

A single renderer-neutral controller walks between the two catalog worlds using actual capsule collision and reviewed Sunset support. Two permanent visuals are prepared before GPU readiness registration; only their poses and visibility change. The public demo uses 0.22 m/s gameplay speed with proportionally accelerated recorded gait. This is authored exploration and portal behavior, not the original robot brain or computer vision. Invalid routes or unavailable resources leave the duck in its source world and leave the player tour usable.
