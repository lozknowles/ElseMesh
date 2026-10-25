# God view and vision sharing

In an updated owner-hosted multiplayer game, click **God view · I** or press **I** to open the popup.

Under **Share my vision**, tick the players who may use your avatar's eyes. Sharing is off by default. Each choice lasts up to one minute; the popup shows its expiry. **Stop sharing with everyone** revokes all choices, including pending older updates.

The **Players sharing with you** list contains only players who have shared with your authenticated identity and whose world you may view. Selecting a player switches to their approximate avatar-eye camera. **Return to my view** or Escape restores your own camera. Your avatar stays in its current world with neutral movement and continuing gravity; this is not flight, invulnerability or world-entry permission.

Sharing ends when the target changes world or session. After arriving through a portal, they can explicitly share again; an authorized observer can then choose their view across worlds. This shares the avatar's accepted eye pose, not a webcam, microphone, desktop capture or another God view that the target happens to be watching.

Revocation closes the view and clears retained eye images after its authenticated event is processed. Connection loss, stale state and expired permission fail closed. Already delivered pixels cannot be recalled.

The public standalone warehouse/Sunset tour is single-player: its popup has an honest empty roster and creates no multiplayer identity or socket. Native rendering remains available by explicit choice, but shared-eye viewing requires the supported WebGL mode; updated owner installations choose that mode by default.

All participating owner installations must use the qualified consent-enabled package with its matching client. Older destinations show **Owner runtime upgrade required**. Mixed old/new owner federation is unsupported; do not bypass receipt checks. Owner keys, ledgers, configurations and world repositories remain outside the application package.

See [protocol details](PLAYER_EYES_PROTOCOL.md) and [qualification notes and limits](PLAYER_EYES_LAB.md).
