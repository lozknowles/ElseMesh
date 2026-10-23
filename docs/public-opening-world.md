# Public opening world

The engine remains reusable. A deployment may supply `opening-world.json` beside
its HTML entry point. No authored world is copied into engine source, and the
engine contains no owner-specific default repository.

The bounded configuration has exactly these fields:

```json
{
  "schema": "elsemesh.opening-world/1",
  "repository": "https://github.com/example/world/tree/0000000000000000000000000000000000000000",
  "worldId": "elsemesh.world:example",
  "contentDigest": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Replace the example commit and SHA-256 digest with the published commit and exact
`world.json` byte digest. Branches/tags are rejected. The loader uses the existing
credential-free, bounded GitHub adapter without a GitHub API request. Before
hydrating assets it checks manifest identity and digest. The shared loader then
validates schema, capabilities, hashes, paths, referenced sizes and content, and
the host checks identity/digest again before detached scene activation. Errors
leave an explicit unavailable status and repository selection controls.

An installed coordinator at `/runtime-config` takes precedence, including existing
membership and player defaults. Only HTTP 404 selects the public opening config;
a broken coordinator is never silently replaced. The opening config is resolved
relative to the document, including project deployments under a URL subdirectory.
If neither configuration exists the ordinary repository selector remains available.

The published data is an offline single-player replica, not a signed authority.
It grants no VIEW or ENTER admission, makes no destination discovery requests and
renders existing portal apertures explicitly unavailable. It contains no server
credentials or signing keys. Personal avatar and computer session state remain
local runtime state. A same-world-ID public replica is not an independent fork;
editing the private source or pushing its branch does not change this deployment.
Publish and select another immutable commit deliberately to update it.

## Packaging and release

Build on the development host, then run:

```
npm run build
node tools/package-opening-world.mjs dist /outside/source/opening-world.json /new/staging/output
```

The tool requires an existing output parent, refuses an existing output directory,
output inside the build, symbolic links in build contents, and reserved packaging
paths. It reserves the new staging directory atomically; a failed copy leaves a
partial directory that must not be published. It maps the built repository
runtime to `index.html`, preserves the original game at `legacy.html`, and leaves
`worlds.html` available with its original-game link also pointing to legacy.html.
The packaged play-online and network-demo pages select legacy.html through
HTML entry metadata, preserving room invitations and network demo query/fragment
parameters. Source/dev installations retain the usual index.html game target.
No compiled JavaScript is rewritten. All build assets are retained. The public config is
operator deployment data, not a committed owner-specific engine default.

Review the exact allowlisted world dependency closure and its attribution before
publishing to a fresh public repository without private history. Preserve stable
IDs only for a read-only replica. Save engine SHA, world commit, manifest digest,
artifact commit and previous Pages artifact SHA as the reproducible release and
rollback boundary. Direct publication to the existing Pages branch needs no
GitHub Actions build. Roll back by publishing the previous artifact tree as a new
commit, without rewriting history or changing the private authored world.

The entry uses the existing repository gameplay runtime: walking, collision,
avatars, weather and supported interactions. Original procedural game systems
remain accessible in `legacy.html`; this is not a migration of every legacy scene.
