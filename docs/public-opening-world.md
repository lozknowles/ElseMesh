# Public opening world and complete release package

The reusable engine reads a validated, pinned world through its common repository loader. The source build's `public/opening-world.json` selects a published public commit. Its world ID is independent of the repository URL. The engine and authoring repository remain separate.

For a downloadable release, `tools/package-opening-world.mjs` verifies a **clean public world checkout at the exact configured commit**, the manifest SHA-256 digest, world identity, schema, asset hashes, paths and capability requirements. It copies that immutable world content under `worlds/loz-opening/` and writes an `elsemesh.opening-world/2` configuration. The version 2 `bundlePath` is a restricted same-origin relative directory. Its repository URL records provenance; startup reads the bundled files, not GitHub. The shared loader validates them again. The public copy cannot grant private VIEW/ENTER permissions or alter an owner ledger.

## Reproduce the downloadable archive

Build on the development host using Node.js 22.15 or newer:

```sh
npm ci
npm run build
node tools/package-opening-world.mjs dist /path/to/clean/public-opening-world-checkout /path/to/new/output
(cd /path/to/new/output && zip -qr ../Loz-Warehouse-Island.zip .)
```

The checkout must be the exact full Git commit in `public/opening-world.json`, with no uncommitted or untracked files. The output directory must not already exist. The package copies only the compiled repository-world runtime, its splash, clouds, antialiasing textures, two stock character models and their portraits, relevant licence notices, credits, and pinned world dependency files. It omits the retired combined game entry, vehicle and unrelated scene assets. It contains `start-local.mjs`, a loopback-only static server; launch it with `node start-local.mjs` and browse `http://127.0.0.1:18888/`. The YouTube TV is external media and cannot play offline.

The world `world.json` digest pins authored content. The game revision, exact world commit, digest and archive SHA-256 identify a reproducible release. To change the opening world deliberately, update the public world repository, verify and publish its immutable revision, then update the engine distribution pin and rebuild. A remote branch changing does not update a running copy.

GitHub's generated source ZIP is for development and may contain compatibility modules and archived tests. The named Release ZIP is the complete fast play download. Directly publishing this prepared static tree to GitHub Pages uses no Actions build. A nested Pages path works because built assets and the bundle are relative to the entry page.
