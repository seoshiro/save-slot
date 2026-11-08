# SAVE SLOT · 8 November 2026

## Delivered changes

- All six cartridges now contain a complete Canvas2D mini-game with a distinct mechanic, objective, finish, pause, restart and return path. Session saves are keyed by cartridge and validated on load.
- Shelf selection uses continuous width-aware packing, including equal end spacing. Neighbors clear space before the selected box travels. The coordinated timeline replaces obsolete tweens and continues from the current pose. Drag release has a selection-only path.
- Opening/return take about 2.2 seconds, insertion 1.05 seconds, and selection 0.8 seconds. Inspection also eases rather than jumping.
- The actual rendered heading determines the stage's top edge. The stage keeps stable dimensions while translating with the shared timeline. The detail panel follows that same progress.
- First entry waits for actual images, fonts, scene textures, model and GPU preparation. The approximately three-second intro is skippable once ready. Reduced motion has no minimum decorative delay. A failed GLB switches to usable light mode; artwork loading has a working retry.
- Existing supplied artwork, cleaned console model and MOSS SIGNAL art/mechanics are retained. No paid generation, dependency fee or hosting upgrade was used.

## Verification

Production build, TypeScript and all 26 automated tests pass. Automated tests cover all six finishes through actual simulation frames, movement/collision, game-specific hazards and inertia, save isolation and invalid-state validation. Scene tests sample 5,001 shelf-selection poses and 4,812 open/return box bounds without intersections.

The production UI matrix passes at 320×720, 390×844, 768×1024, 1280×720 and 1920×1080 in EN/RU, with WebGL and query-selected no-WebGL modes represented. It checks heading/stage/control separation, horizontal overflow, real keyboard and CDP touch input, pause, enlarged view, restart cancellation, return to the same cartridge and axe WCAG A/AA shelf checks. It additionally tests reduced motion, actual GLB request failure and image request failure followed by retry. No page errors were recorded.

The continuous interaction recording covers first entry, fast forward/back/end selections, dragging to the same item without opening it, cancellation during opening, inspection, insertion, enlarged view, RU, viewport resize and return. It passes 14 checks. The detail panel remains inside its right-side area across 190 sampled insertion frames.

The browser Fullscreen API also passed trusted-click entry and exit, EN/RU shelf/open layout and retained selection. Headless Chrome kept its configured 1440×1000 dimensions, so this does not claim a physical OS fullscreen-window check.

## Live six-game completion

All six final recordings use actual keyboard input. Read-only session state supplied position feedback to the test runner; no player teleport, progress injection or win shortcut was used. Each verifies pause, restart, three earned objectives, its own real finishing condition and return to the shelf. All recorded zero setbacks and zero runtime/console errors.

| Game | Game time | Wall time of route |
| --- | ---: | ---: |
| DUSK DELIVERY | 58.99 s | 60.18 s |
| ORBIT ZERO | 46.73 s | 48.65 s |
| MOSS SIGNAL | 38.55 s | 39.71 s |
| TIDEBOUND | 31.92 s | 33.40 s |
| EMBER VAULT | 39.26 s | 40.31 s |
| SNOWBYTE | 44.92 s | 45.84 s |

The whole clips also include initial entry, shelf interaction, pause/restart and return, so their video duration is longer than the route time.

## Hardware performance measurement

- Windows 11 / build 26200, AMD Ryzen 5 7535HS.
- Chrome 157.0.8103.38; actual renderer: ANGLE AMD Radeon Graphics, Direct3D11. The computer also has an RTX 4050, but the measured browser used the AMD adapter.
- Viewport 1440×1000, DPR 1, no video recording during the benchmark.
- 1,478 active-animation requestAnimationFrame intervals: median 7.0 ms, p95 7.2 ms; two gaps exceeded 33 ms (34.7 ms on insertion and 69.5 ms on return). Zero observed long tasks and zero browser errors.

These are observed frame-callback timings, not GPU timer queries and not a before/after speedup claim. They do not promise zero dropped frames on other devices. Mobile sizes and touch input were tested on Windows Chrome; physical iOS/Android devices and Safari were not tested.

## Run the current checks

```sh
npm ci --ignore-scripts
npm test
npm run build
# Keep `npm run preview -- --port 4199` running, then:
node scripts/interaction-matrix.mjs
node tests/scene-browser-qa.mjs
node tests/scene-performance.mjs
node scripts/gameplay-live.mjs
```

Recordings and UI reports are generated under `evidence/six-games/` and delivered separately. They are intentionally excluded from the repository, along with the user's private reference recording. Earlier QA documents describe older iterations.

Rollback: local archive branch `archive/before-2026-11-08-six-games` points to prior main `82895e8985e1eef08b3c4a41715cdd7f4462d3af`.

Additional generation spend: **0 credits**.
