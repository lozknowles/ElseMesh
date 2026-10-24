# Repository-world mobile controls

The standalone repository-world pages supply an explicit touch overlay to the existing `Input` class. `Input` still defaults to the legacy `.tw-root` when no overlay is supplied. The runtime uses the same movement, look, jump, use and camera-view paths as keyboard input; object permissions remain in the existing interaction path.

## Review gates and verification

- **Plan gate:** The architect confirmed the missing `.tw-root` as the cause and recommended an optional input root, scoped overlay styling, guarded actions and clearing held pointers when gameplay is interrupted. The implementation follows that path.
- **No-progress gate:** Native CDP touch dispatch repeatedly stalled in HP's software-rendered Chromium. The architect advised stopping that route and using accelerated MSI Edge or a physical device for final native-touch acceptance. The HP browser check uses synthetic pointer events in the full game and therefore does not prove native touch gestures.
- **Completion gate:** The architect found no material security, desktop or legacy-input regression. Use still enters the existing permission path. The fix is releasable as a tested repair, with sustained native mobile gameplay explicitly unverified.
- `npm run test:input`: 21 passed, including simultaneous move/look/action holds and interruption release.
- `npm run test:worlds`: 24 passed.
- `npm run build`: passed.
- Mobile Chromium at 390 × 844 and 844 × 390 loaded the published world on the WebGL2 fallback with two visible sticks and Use, Jump and View buttons. Synthetic pointer input in the game produced move and look axes, held jump and Use input, a single view toggle, and released captures. Slow software rendering prevented a reliable sustained walking measurement.

A physical phone/tablet and accelerated native touch remain the user acceptance check.
