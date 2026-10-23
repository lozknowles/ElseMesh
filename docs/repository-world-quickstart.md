# Find and run repository worlds

The worlds are separate data repositories. Running the original game or its room server alone does not load them.

## Open the public warehouse

[Play the warehouse island](https://lozknowles.github.io/ElseMesh/).

Its data is in [the independent opening-island repository](https://github.com/lozknowles/elsemesh-world-loz-opening-island). The public snapshot is single-player. An illuminated portal frame does not mean a destination is connected; its unavailable aperture is deliberately opaque.

## Use a local source checkout

1. Install dependencies and start the development server as described in the main README.
2. Open worlds.html at the local address printed by Vite. Source index.html starts the original exploration game.
3. Expand Public GitHub world.
4. Paste https://github.com/lozknowles/elsemesh-world-loz-opening-island/tree/7713a89cd22749e7598e2e0a1db2a540970c0d19 and click Open pinned world.
5. Wait for the warehouse name and status. WASD walks; mouse drag or arrows look.

Alternatively clone the world repository and select its folder through Open world files. World content contains no installation scripts.

world.json selects the snapshot. Referenced terrain, objects, spawn and connections live under snapshots/<digest>/; models live under assets/. Portals are in the selected connections component. Editing hashes by hand is unsupported.

## Connected portals and Player 2

The original room server and its play-online.html invitations are separate from repository-world admission. The repository coordinator entry is tools/networking/repository-world-server.mjs. It requires separately prepared operator configuration, pinned world commits, signed owner approvals and enrolled browser identities. Private configuration and credentials stay outside the game and world repositories.

The coordinator serves worlds.html at its root, authenticates the browser and chooses that player's configured default world. VIEW authorisation permits destination scenery; ENTER authorisation is separate. A portal reference does not grant access to a private world. Missing repository access or installation configuration must be reported rather than assumed.

GitHub Pages hosts the static client, not the multiplayer coordinator. Internet guests additionally need a reachable HTTPS/WSS server and scoped invitation admission. A public single-player snapshot does not prove multiplayer portal operation.