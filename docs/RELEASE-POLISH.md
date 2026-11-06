# SAVE SLOT — final polish, 6 November 2026

This iteration changes loading presentation and fallback layout only. Console geometry, gameplay, source art and other projects are unchanged.

## Changes
- The unavailable-3D notice and Retry action occupy their own grid row below the scene/game frame. The row remains present during play, pause, enlarged play and return.
- Every 3D box starts with a complete light paper CanvasTexture bearing its actual title, number and accent. The downloaded image is attached only after its load callback. An unavailable cover keeps the readable paper version.
- Navigation does not wait for cover downloads. No artificial loader delay was added.

## Executed before publication
- TypeScript/Vite production build and six game logic tests passed.
- 251 fallback layout assertions passed in cloud Chromium at 1440×1000, 1366×768, 1024×768, 390×844 and 375×667, in EN/RU: shelf, opening, game, pause, enlarged game and return. No captured page errors.
- 11 cold-load assertions passed on the production build. Fresh contexts, browser cache disabled, CDP 250 ms latency, 128000 bytes/s download and 64000 bytes/s upload. Cover responses were held to inspect the placeholder stage, then released. Language/selection remained usable. A separate aborted cover ended with five loaded images and one retained paper cover.
- Sampled actual WebGL frames were inspected; the pending boxes were light and labelled.

## Conditions and limits
The final polish browser environment is Linux cloud Chromium with ANGLE/SwiftShader software WebGL. This is a real WebGL context, not the Canvas fallback, but does not measure GPU performance on the owner's laptop or a phone. Earlier Windows/AMD checks remain historical evidence, not newly repeated measurements. Physical phones and Safari have not been checked. A known Vite chunk-size warning remains; it is not a failed build.

No new generation or console geometry edit was made. Incremental generation cost: 0. Cumulative authorized ledger: 93.5 / 300, reserve 206.5 credits.

Rollback: archive/before-release-polish-2026-11-06 at 2adb011596f3f04467c3ade38d8fc50b89cc255c.

Public-address verification and current portfolio media are recorded in the final delivery report after deployment. No earlier recording is relabelled as current.
