# Public Sunset repository world

This change adds the pinned Sunset splat scene to the repository-world renderer. This published two-world installation deliberately starts in WebGL2. Other installations retain their existing renderer selection. The Sunset world uses its original splat appearance and its reviewed collision/support corridor; it does not substitute a flat terrain mesh.

## Plan gate and scope

The architect approved a minimal source promotion from the qualified private implementation onto public main `4c9499f`, preserving the existing touch-control fix and ordinary world behavior. The approved family comprises the verified source reader, physics compiler, Spark adapter, managed readiness contract, shared Three shim, local movement guard, portal projection helper and scene-options wrapper. The promotion includes only the small Player/Colliders/Host/scene hooks required to enforce those boundaries.

Player-eyes selection, duck behavior, NPC simulation, capture encoders, private owner-confirmation movement and new network protocol fields are excluded. The public movement guard relies on the admitted local support mask and sampled native collision segment. It has no private authority callback or remote acknowledgment requirement.

## Source and renderer contract

The generated world contract comes from clean Worlds commit `c24c8b40304681e08254adad77b9bb4142dd67fe`, using its build script. Generated bundle SHA-256 is `d04ead00ab70158ca2d467c52fd5e035c2c5a958063815bcf9e7cd5e9e826fd4`. The versioned `splatScene` descriptor is serialized in the repository connections component and binds exact hash-named SOG/physics resources. Ordinary GLB/project limits and native-island semantics are unchanged.

The renderer accepts only the pinned 719538-point Sunset SOG, fixed game transform, reviewed provenance and exact reviewed physics bytes. SOG decoding is bounded to that catalog before allocation. Source loading verifies hashes and byte counts; malformed paths, traversal, external resource references and unknown descriptor fields fail closed. It uses a dedicated repository capability, without adding a general asset endpoint.

Spark is pinned to 2.4.0 and Three to 0.180.0. Vite aliases Spark to the same installed Three constructors as the world contract. This is required for compatible material, geometry and texture ownership. The shared Three shim does not create another renderer or scene implementation.

The adapter initializes the three existing packed Spark accumulator targets at the pinned bounded capacity before one-time readiness registration. It preserves logical point counts, mapping, versions, pool ordering and existing target/attachment identities. GPU preparation holds renderer state only during synchronous operations and restores it before yielding.

Managed readiness normalizes only the proven transient IDs of the exact adapter-owned `extSplats` and `extSplats2` samplers. Ordering and ordinary texture identities remain strict. Foreign resources, changed layouts/program structure, later pool allocation and disposed resources invalidate readiness. No fingerprint check allocates or enrolls resources. Disposal removes lifecycle listeners and releases only owned resources.

## Movement and portal behavior

The reviewed physics is already in game-world coordinates; only the visual SplatMesh receives the fixed transform. Whole-foot support and native capsule checks constrain walking and jumping. The post-native-resolution guard prevents collision pushes from moving a player outside reviewed support. Initial and arrival poses are checked before activation, including locations where a raw collider floor exists beneath an unreviewed cell. Other movement modes are rejected for this corridor.

Native rendering explicitly rejects splat descriptors rather than rendering ordinary terrain. Ordinary authored objects retain their normal rendering and colliders; their collision records are merged into the compiled scene. The Sunset branch omits generic terrain and sea meshes. Normal portal rendering retains mapped cameras, oblique Gaussian clipping, bounded render targets and full synchronous state restoration. Physical target dimensions are divided by pixel ratio for both ordinary and splat views.

The scale is **assumed gameplay scale**. The admitted traversable region is the reviewed corridor, not a claim that every visible Gaussian surface supports walking. The original footage, source point cloud and private qualification evidence are not part of this public artifact.

## Source verification

The promoted source/physics/adapter/readiness/initial-pool/player-boundary tests passed (77 checks at the first integrated source checkpoint). Ordinary portal regressions passed: **150/150**, including the added pixel-ratio-two viewport check. Tests include real installed Spark accumulator CPU allocation, source hash/size failures, native contact/tangent cases, support-mask boundaries, safe jump/gravity behavior, unsupported arrivals, native-path rejection and disposal/state restoration. The private authoring CLI is not promoted; its authoring-only test is intentionally excluded from the runtime suite.

These are source and unit results. Public artifact packaging, browser travel/return, mobile controls, resource measurements, privacy review and release approval must be recorded separately below by the release owner. A successful build or inherited private-world evidence alone is not public deployment qualification.


## Published single-player installation

The installation resolver reads `/runtime-config` once before creating graphics. A valid owner/coordinator installation keeps its network path. Only an actual 404 permits the optional same-origin published catalog; malformed responses, denial, server errors and network failures do not downgrade to public mode. Without a catalog, the legacy opening snapshot behavior remains available. This edition selects WebGL2 at startup because the admitted Gaussian renderer requires it.

The public catalog is publication integrity, not an owner permission grant. It pins exactly two manifests under `worlds/<full content digest>/` and one reciprocal portal pair. There is no synthetic membership, identity, receipt or VIEW/ENTER grant. Other authored destinations, including the retained Dock doorway, cannot expand this fetch or travel graph. The public source reader is bounded and constrained to the deployment prefix.

`PublishedWorldCache` retains at most two graphics packages with explicit leases. The host prepares and validates an arrival before its atomic swap. Source, generation, cache and runtime-epoch fences reject superseded completion. Preparation leases cover the entire coupled graphics graph, including portal material/target resources. Closing is logically immediate, while physical retirement waits for protected preparation to settle. Initial preparation and cached rewarming are both covered. Input can be resumed only in the same source context or this operation's exact committed destination context.

A controlled CPU review caught disposal during an asynchronous rewarm, and a follow-up review found the equivalent initial bootstrap path. Both were fixed under the architect's preparation-lifetime gate. Tests retain delayed compilation, disconnect, cache replacement, unrelated host load, failure, coalescing and duplicate-release cases. An independent real Three/signature/cache/helper rerun confirms no root, target, material or geometry disposal while compilation is pending, and complete cleanup after it settles.

## Authored doorway clearance

The additional Warehouse doorway is centered at [-1.5, 4.45, -78.5], yaw 0, width 2.06, height 2.9. Its floor and approach were checked against the actual 113 Warehouse collision boxes. The original Dock portal is unchanged.

The first physical return found the Sunset aperture's bottom 0.0002032556 units above the actual grounded foot height. The corrected authored return height is 2.904 at the SAME center, orientation and width. Both rigid mapping matrices remain exactly unchanged. No sweep tolerance, terrain, support mask, transform or collision data changed. All 1,461 usable-width samples pass both directions' strict mapped arrivals and egress; the affine ground bound across the approach leaves at least 1.218 mm of bottom clearance. The original failed grounded sweep is retained as a regression.

The SOG remains `66334b9bcea5abb6b2a310c44c584fd7fdc8fb999db9c718c785473c41019298` and physics remains `eedaeb18bfa8eacbee42c10d105b67d519f9351fb75879f4306645cf1d3a3757`. Public world repository revision `9a292002611928ef8a867ed939c8aa20c56a5283` contains the added route and doorway correction. The Warehouse manifest is `fcba18b28ac9b8bf7ef52a1fc8ba0d3dc489d0bd4c94c651cdc559a7617a0e5d`; Sunset is `3d904b583d30a198311e0b64248b93c689cf6c2442259964f822794346778992`.

## Packaging and publication safeguards

The two-world packaging tool verifies both lazy SOG/physics payloads explicitly: manifest loading alone does not fetch those payloads. An initial unshipped candidate omitted them; the package closure regression now checks every referenced file's byte count and hash. The current closure includes 85,173,945 Warehouse bytes and 20,700,472 Sunset bytes, plus required software, notices and the unchanged existing public editor. The original recording, PLY/training files, identities, keys, ledgers and acceptance logs are excluded. Public physics and SOG metadata were inspected for private paths and credentials; their admitted bytes did not need alteration.

The website is configured to publish the `gh-pages` branch. The source workflow now builds the same packaged artifact rather than raw `dist`, preserves the existing editor, validates package closure, and only invokes the Actions Pages deployment when the repository is configured for workflow publication. Branch-based publication remains an explicit atomic release with the previous deployed revision retained for rollback. Previous hashed application assets and the previous immutable opening world may be retained byte-for-byte for cached clients.

Physical test-driver failures are distinguished from application failures: decorative camera motion left an incorrect heading; an exact lateral target and a tiny angular target were unnecessary; a straight return after an intentional wall probe intersected real geometry. The final driver uses trusted input, a supported geometric ray/aperture predicate and collision-validated approaches, tests ordinary repeated crossings first, and performs boundary containment last. No application tolerance or collision rule was changed to satisfy these driver conditions.

Final physical, touch-emulation, error-injection, resource and publication-gate results follow after validation. Physical mobile GPU behavior and new provider playback are separate from mobile input emulation and preservation of the existing TV implementation.


## Accepted publication candidate

The final architect publication gate approves the scoped public single-player tour after source, lifecycle, privacy and physical evidence review. It does not promote experimental player-eye viewing, Microduck, network travel or arbitrary whole-scene walking.

The immutable v5 candidate references `main-CNOK0buL.js`. Physical default-URL evidence confirms Warehouse → original Sunset → Warehouse, live views in both directions, mapped feet contact, jump/landing and stable containment at the reviewed boundary. Three crossings were observed with the same two graphics packages and no leaked pins or disposal errors. Parked readiness is not claimed continuously true: acquisition explicitly performs real GPU preparation before reuse when normal portal material features have changed.

The full six-crossing stress sequence remains **incomplete** because of test-driver precision, route and callback-wiring failures. Those are retained as harness-negative evidence; the complete travel harness is not labelled PASS. The successful ordinary round trip and independent boundary checks remain valid. No collision or application tolerance was changed to satisfy the test driver, and no further stress rerun is required for this narrow release claim.

Touch controls passed four checks in trusted browser touch emulation. A deliberately corrupted SOG passed two failure checks: the bad scene was rejected while the Warehouse and walking input remained usable. Both fresh profiles explicitly verified the default URL without a renderer query, published WebGL2 selection, exactly one configuration 404, same-origin loading, and no peer socket or identity database. Physical mobile GPU behavior, provider/YouTube playback and C64 interaction were not newly qualified.

Final source checks include the dedicated 98-check published-world suite, 25 public bootstrap/cache/driver cases, 150 ordinary portal regressions, the 77 focused splat checks, 24 world-host tests and six security tests. The default test command passed with one existing skipped case. The clean contract source passed 33 selected contract/reader tests and TypeScript checking. Build and two generated-package closure checks passed.

The release tree contains 4,949 byte-identical candidate files plus 1,324 byte-identical compatibility files from the previous public revision, totaling 285,180,816 bytes. The independent release hash manifest is `aa1aa7aa1d4acf1d42a44068dbab33aa55f55094daf35159ac6197f287dde696`. Forty-one changed public text files were scanned with no private path or key hits. Compatibility bytes and the existing public editor are unchanged. The source recording, PLY/training data, identities, keys and acceptance files are not distributed.

The previous Pages revision `87709369d5f3700b97f47e790ffae1337548efaf` is retained for rollback. Final source/distribution commit IDs and post-publication live checks are recorded in the release acceptance manifest. Publication uses fresh baseline checks and fast-forward updates only, with the Pages distribution pushed last.
