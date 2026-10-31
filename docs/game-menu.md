# Game menu

Press **M** or tap **Menu** to open the existing graphics controls. M toggles the menu when keyboard focus is not in an editable control. Escape and Close return to the game. Existing modal ownership and guarded input suspension/resumption are preserved; repeated keys, Ctrl/Alt/Meta combinations and IME composition do not open it.

Screen resolution limits now include 720p (921,600 pixels) and 1080p (2,073,600 pixels), alongside the existing quality choices. They cap internal pixel count while preserving viewport aspect ratio. Screen size, DPR and adaptive scaling can produce smaller or differently shaped dimensions; the menu displays actual render width × height. Quality settings remain device-local preferences.

Current world time offers World default, dawn, morning, noon, afternoon, dusk, evening and night. It is a presentation override for the current visit, clears when travelling, and never changes authored content or authoritative world time. Main scene lighting, native sky and neon presentation receive the effective time. Independently rendered portal destinations retain their existing lighting. A departing cached native sky is restored before activation, so an override cannot leak into a later preview. Scanned indoor splats retain their captured lighting.

## Validation and architect gates

PLAN: architect approved reuse of GraphicsPanel and the existing environment path, requiring honest resolution-limit labels, actual dimensions, visit-local time, cached-scene restoration, independent preview lighting, modal/editing keyboard guards and listener disposal. Implementation follows these conditions without changing world permissions, content pins or owner overlays.

Local checks: 62 graphics policy/runtime/experiments, host and published-travel tests passed; all 8 generated-package closure/privacy/licensing tests passed. Browser checks changed actual output to 1280×720 and 1920×1080; verified M, Escape, held-input clearing and select ownership; showed noon/night differences with unchanged authored data; verified default time and native sky restoration on Dock entry and Warehouse return; then completed both portal pairs and another Dock round trip with three stable roots and no travel errors. Portrait 390×844 and landscape 844×390 Chromium touch emulation can open, change and close the menu with resumed gameplay. Physical phones, Safari, native GPU execution and frame-rate acceptance remain separate.

COMPLETION: architect found no material blocker after reviewing code and desktop/mobile evidence. A generic check for any other open HTML dialog also supplements the existing named guards; the menu defers to that owner for M and button activation. The welcome aside remains accessible alongside Menu. Shift+M is allowed as uppercase M. Final clean-revision packaging, byte comparison and live checks follow local acceptance.
