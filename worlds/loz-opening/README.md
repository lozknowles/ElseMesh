# Loz's Warehouse Island

Prepared release candidate; no push, deployment, private runtime migration or new live acceptance is implied.

World ID: `elsemesh.world:2842c4f2-93a0-4492-b942-e53e524de319`  
Region ID: `elsemesh.region:3c498d61-7d1f-478a-8a85-d9e66d3b63fb`  
Repository schema: `elsemesh.world-repository/3`  
Project schema: `elsemesh.worlds.project/2`

Required installed capabilities: `media-screen/1`, `native-island/1`, `object-access/1`, `objects`, `portal/1`, `project/2`, `retro-terminal/1`, `terrain`, `water-exclusion/1`, `water/1`, `weather`, `welcome/1`.

Public content snapshot of the SAME authored Loz world, not a new world identity. It contains authored action ceilings and portal target IDs, not owner keys, runtime contacts, private per-player grants or portal admissions. Importing this snapshot grants no runtime access. Native visuals/media remain dependent on the installed supported engine and provider interaction. Full original legacy game additions are excluded.

## Identity and runtime permissions

This public snapshot deliberately shares the permanent identity of the privately operated Loz world. It is a content snapshot, not a separate live authority. Authored action ceilings describe supported actions; they are not private per-player access grants. Owner keys, ledger/session state, endpoints, contacts, signed invitations and runtime admissions are not included. A recipient must configure their own reviewed runtime permissions; importing data confers no access to an existing owner service.

## Content and storage

The ready-to-play game package includes only the active immutable snapshot and its required asset/native resource closure. The repository retains Git history and earlier content snapshots for recovery. Current content uses ordinary Git with hashed binary files, no Git LFS pointer files, hooks, executable runtime code or install scripts. The dock licence-source ZIP is an explicit retained nonexecuted source archive, not runtime code. Native field resources preserve the fine source data; renderer resource residency/streaming limits remain engine concerns.

Future larger assets may require another storage provider; that provider is not selected and no endpoint or migration is configured here. Do not add placeholder credentials or pretend a future provider is active.

See ATTRIBUTION.md and retained source/licence notices. Asset-specific licences take precedence; no new blanket licence is invented for unlicensed user-authored content.

Authored TV clearance placement: east wall at [15.6, 5.2, -77], yaw -PI/2, width 6.4 metres. Native clear-view and provider-playback acceptance is recorded separately from this content snapshot.

Warehouse native grass-mask apron cleared at x[-30,30], z[-100,-54]; terrain, objects and vegetation records preserved. Native TV picture and provider playback accepted on MSI before this publication.

## Warehouse dining scale

The dining table, six chairs, rug and place settings are authored at 65% of their previous horizontal dimensions and 80% of their previous height about the dining area floor. The table is 3.25 m by 1.3 m with a 0.816 m top; chair seats are about 0.507 m wide and 0.484 m high. The remaining rug, place settings and decorations keep their stable IDs and edits.

The dining table, six chairs, two nesting tables, ground-floor side table and mezzanine reading table now use eleven instances of six reusable ElseMesh Worlds furniture GLBs. Each GLB is copied into this world as a content-addressed asset, so loading does not depend on the editor. The leading object ID of each former furniture assembly remains stable; retired component IDs and exact provenance are recorded in the asset metadata. All eleven furniture instances have solid bounds, including the legs; the collision proxy blocks movement under the table as well as through the top. Rug, tableware and flowers remain separately editable.
