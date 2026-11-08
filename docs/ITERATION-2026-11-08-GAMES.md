# SAVE SLOT: six-cartridge play audit

## Scope

This iteration verifies all six complete games rather than inferring game coverage from a scene-transition recording. The accepted shelf, open-box and console compositions are unchanged. Enlarged-screen entry receives a 220 ms interruptible visual handoff, scoped to the visual stage. HTML controls stay live. Reduced motion and browsers without the View Transition API use the immediate path. No new paid generations are used.

## Evidence standard

Acceptance playthroughs use actual browser keyboard or emulated touch input. Session storage is read for route feedback and assertions; these playthroughs do not inject game state, teleport, write progress, or accelerate game time. Full uncut runs are retained locally. The short delivery montage is explicitly an excerpt, not a continuous full playthrough.

Focused unit and fault-injection regressions are separate from those playthroughs. The action-contract regression uses valid saved fixtures to measure exactly one brake, rather than presenting that fixture as a completed game.

Each cartridge is checked for the actual destination and visible victory; restart cancellation, confirmation and movement afterward; earned partial and completed progress across same-tab reload and shelf exit/reentry; and independent cartridge state.

## Save contract

Ordinary progress uses per-cartridge sessionStorage in the current browser tab/session. It is not a cloud save or a guarantee after a tab/browser is closed. If browser storage is blocked or full, independent cartridge snapshots remain in page memory until the page closes or reloads. The interface changes to a page-only notice after a runtime storage failure. pagehide flushes the latest state on ordinary navigation; a browser crash or OS kill is not guaranteed.

## Defects found and fixed

1. Blocked storage previously discarded a cartridge's earned progress when switching away and back despite the page-open memory promise. A page-scoped store now preserves independent snapshots, session saves, legacy MOSS loading and restart isolation.
2. In DUSK, JavaScript's signed remainder placed reverse-moving traffic outside the route after 100 seconds (first car) and 105 seconds (second car). Positive cyclic wrapping preserves the initial phase, 2.4-unit/s speed and collision behavior.
3. A held direction plus a second finger on ACTIVATE did not reliably produce a click. Touch actions now run on pointer press, with compatibility clicks suppressed. Mouse, Enter, Space and E are preserved. A single ORBIT brake has factor 0.15; two deliberate actions have factor 0.0225.
4. Mobile instructions still referred to keyboard-only E/WASD. All six now have RU/EN instructions naming their actual touch controls, with desktop copy unchanged.

## Local and baseline verification

- 60/60 unit tests and TypeScript/Vite build passed.
- Five enlarged-handoff cases passed: WebGL, small RU fallback, reduced motion, unsupported API, and unwrapped native cancellation with no unhandled rejection. Pause and Back remain clickable during the handoff. Accepted endpoint sizes and the persistent canvas are preserved.
- 60 touch-copy/layout cases passed: all six games, RU/EN, 375 x 667 and 390 x 844, ordinary and enlarged views, plus desktop keyboard copy.
- Nine focused action-input cases passed, including secondary-finger MOSS activation and exactly-one-brake tests for touch, mouse and keyboard.
- Three storage browser regressions passed: ordinary reload while moving without pausing, blocked storage from entry, and runtime write failure after a successful initial probe.
- On public baseline 4b6f8e8 all six full keyboard playthroughs passed victory, partial/completed restoration and cancelled/confirmed restart.
- All six baseline touch routes reached real victory. ORBIT's post-victory touch checks initially stopped because the harness tapped an already-disabled brake; the guard was corrected for the final run. The separately reproduced two-finger MOSS defect was fixed and retested rather than being counted as a baseline pass.

## Final public playthroughs

Published application commit: 4234d5d2a668e5e85364704c1e5fcad894d1c82f. GitHub Pages run 42520267478 passed build and deploy. The public JS index-e1zKRcfX.js and CSS index-CTkSRD13.css matched the local Pages build byte-for-byte.

All rows below are fresh full routes on https://seoshiro.github.io/save-slot/ using trusted emulated touch. Every row passed partial reload/reentry, completed reload/reentry, cancelled/confirmed restart, continued input after reset and independent cartridge progress.

| Game          | Actual win                        | Game elapsed | Setbacks | Language / viewport |
| ------------- | --------------------------------- | ------------ | -------- | ------------------- |
| DUSK DELIVERY | Three deliveries and depot        | 69.26 s      | 0        | EN, 390 x 844       |
| ORBIT ZERO    | Three cells and slowed docking    | 54.65 s      | 0        | EN, 390 x 844       |
| MOSS SIGNAL   | Three beacons and portal          | 57.64 s      | 0        | RU, 375 x 812       |
| TIDEBOUND     | Three safe islands and lighthouse | 41.99 s      | 0        | EN, 390 x 844       |
| EMBER VAULT   | Key, two seals and vault          | 57.28 s      | 0        | EN, 390 x 844       |
| SNOWBYTE      | Three flags and cable-car station | 47.17 s      | 0        | EN, 390 x 844       |

Game elapsed is the saved game clock, not a performance benchmark or total test wall time. DUSK also passed a separate local production route after a real 120-second wait (victory at 189.63 game seconds); the late traffic remained on the road. MOSS additionally passed trusted two-finger direction/action, touchCancel and release-outside checks.

The full keyboard routes were verified on the preceding public baseline. The new published version was then fully exercised with touch as listed above; keyboard/mouse action handling was separately checked on the final code.

Test-harness failures are retained, not relabeled as app passes. A local TIDE waiting helper could miss its too-short sampling window; it now uses a fresh sample and a calculated safe-crossing margin. A public ORBIT run won, then the test waited on a BRAKE button disabled by victory; a new complete successful run replaced that incomplete acceptance attempt. Victory timestamps were checked against decoded video frames, including a corrected observer that previously noticed another cartridge during an isolation check. No app state was injected in any selected full-route result.

The approximately 61-second delivery video is an edited original-speed selection: first enlarged-screen entry, then the actual DUSK, ORBIT, MOSS, TIDEBOUND, EMBER and SNOWBYTE victories listed above. It is not a continuous six-game playthrough. Full uncut sources and their timing manifests are retained locally. Physical phones and other browser engines remain untested.

For first enlarged-screen entry, a fresh-page serialized screenshot capture confirmed genuine intermediate browser pixels, without a warm-up or app/style/time changes. Two captures fell within the transition, including one acquired 125-202 ms after the real click. The capture averaged 56.2 ms per screenshot (maximum 102 ms); timestamps bound acquisition and preserve real-time frame holds. This proves intermediate pixels, not physical display smoothness or a rendering FPS. The initial screencast omitted that interval, so it was not used as evidence of a smooth first entry. Output video frame rate is an encoding timebase, not a performance measurement.

## Reproduce

Set TEST_URL to the intended production preview or public URL.

- scripts/audit-first-three.mjs: DUSK, ORBIT and MOSS, keyboard/touch, full routes and save/restart checks. INPUT_MODES chooses input; AUDIT_OUT isolates evidence. DUSK_WAIT_SECONDS allows a real-time late-traffic regression.
- scripts/audit-last-three.mjs: TIDEBOUND, EMBER and SNOWBYTE. INPUT_MODE chooses keyboard/touch and RUN_LABEL isolates evidence.
- tests/game-storage-browser.mjs: storage-failure and live-reload contracts.
- tests/enlarged-handoff.mjs and tests/touch-instructions-browser.mjs: visual/control handoff and copy/layout.
- tests/action-input-browser.mjs: narrowly controlled action-input fixtures.

## Conditions and limits

Chrome 157 on Windows, headless browser automation, DPR 1 and 100% browser zoom. Touch uses trusted Chromium/CDP touch events and mobile viewport emulation, not a physical touchscreen. Physical iOS/Android devices, Safari, Firefox and Edge were not tested. No universal frame-rate claim is made.

Two fingers on different controls are tested. The rare case of two simultaneous fingers on the same arrow still shares one direction key: lifting either stops that key. This does not leave movement stuck.

## Rollback

archive/before-2026-11-09-six-game-audit preserves 4b6f8e85827b14fcb02a504cc56fab33af4d87f4. The main portfolio, NOCT and SIDE A remain unchanged.
