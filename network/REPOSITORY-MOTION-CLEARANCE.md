# Repository authority movement and native physics

Repository admission still creates a synchronous Boolean `world.clearance`. Legacy federation calls must never receive a Promise as a truthy clearance result.

For native-island content, asynchronous admission first verifies and preloads exactly the declared level-zero height resources: 256 tiles, 2048 x 2048 little-endian finite Float32 samples, 16 MiB total. The shared content reader verifies hashes, byte sizes and extrema; missing, malformed or corrupt fine heights fail admission. No coarse terrain fallback is admitted. The private copied field remains inside an immutable sampler closure and uses the renderer's `sampleNativeField` cell-centred convention. Admission does not read vegetation, shading, imagery or ocean blobs. Legacy worlds retain their existing terrain sampler.

The strict capsule check retains the existing radius 0.3 m, height 1.8 m, overlap rules and feet skin. Strict entry, reservation, commit and accepted-state operations receive no step exception. Ordinary `state` processing alone passes the internal collision-correction option. Inside the ledger transaction, the authority derives `purpose: movement` and clones the actual current member motion as `previousMotion`. Payload fields with those names are ignored. Other players and reservations retain their existing exclusion check.

The movement exception applies only when strict geometry clearance fails and only to authored `collision: walkable` leading edges. Shared native `Colliders.groundHeightAt` semantics derive previous and successive support surfaces. Previous feet must match known support within 0.08 m. A supported straight path of at most 4 m is checked at intervals no greater than 0.1 m (at most 40 segments). Each support change is bounded to 0.4 m. Solid geometry remains blocking at every checked supported pose. This bound supports delayed reports spanning several treads; it is not general movement anti-cheat or a simulation of arbitrary curved client paths.

A leading-edge tread top must be within 0.4 m of both derived support and current reported feet. Once the feet XZ point is inside the tread, their height must agree with its top within 0.08 m: the exception cannot permit walking through the slab. Raising onto a ledge must leave a full capsule clear of solid ceilings. Elevated or unsupported previous feet cannot enlarge the step bound. Reports requiring the exception beyond 4 m are denied; normal poses that already pass strict clearance retain their prior behavior.

The installed owner static server allows `frame-ancestors self` only for the exact normalized installed relative path `editor/native-preview.html`; all other files keep `frame-ancestors none`. Base URI and object source remain self and none respectively. This allows the trusted editor preview iframe without allowing world content or arbitrary HTML to frame the runtime.

Qualification commands on HP:

- `node --test test/repository-motion-clearance.mjs`: captured Mac fifth-tread coordinates, delayed supported path, negatives, shared native support, and the actual Player walking all fourteen original warehouse tread bounds with dt 0.05.
- `node --test test/owner-stair-clearance.mjs`: two actual owner facades, encrypted RPC, browser transport, remote membership, ordinary Player stair reports, delayed report, strict arrival and accepted-state rejection, ledger-derived context, and narrow CSP headers. All identities and ledgers are fresh temporary fixtures.
- `node --test test/repository-native-physics.mjs`: private draft fine-field comparison against original source and the renderer sampler, corrupt/missing/nonfinite/dimension failures and synchronous legacy clearance. This private qualification test expects the HP native draft and source evidence.

These checks establish source and protocol behavior. Native device walking, portal and preview visual acceptance remain a separate task.
