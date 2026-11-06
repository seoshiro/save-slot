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

## Published verification
The same application was checked on https://seoshiro.github.io/save-slot/ after Pages run [42189332777](https://github.com/seoshiro/save-slot/actions/runs/42189332777) succeeded for commit 7272470448265eecee26120defdc62cee5349de1.

All **261 assertions passed**, with zero captured page errors, in Chromium **153.0.8010.12**. The raw report is [public-release-polish.json](../evidence/public-release-polish.json). It includes bounding boxes for the separate notice row through all six states and both cold/error cases. The actual public console response still has SHA-256 0c142edacbc018db33643ba6b9402e70aa28aedda7c77fc017580c6de54011bd.

Current captures were made from the public address in this iteration:
- [Desktop shelf](https://d2ol7oe51mr4n9.cloudfront.net/user_3E5G2A3SehelVArAZlo5WHsGiG5/29d3ae5e-235d-492c-a6c4-eff15a1340a0.png)
- [Desktop game](https://d2ol7oe51mr4n9.cloudfront.net/user_3E5G2A3SehelVArAZlo5WHsGiG5/7382ac52-f8f7-4635-9d59-0fa05ae1079c.png)
- [Mobile game](https://d2ol7oe51mr4n9.cloudfront.net/user_3E5G2A3SehelVArAZlo5WHsGiG5/f7a30b0f-55fd-4f52-aee3-b6b8607916c2.png)
- [Fallback game](https://d2ol7oe51mr4n9.cloudfront.net/user_3E5G2A3SehelVArAZlo5WHsGiG5/0d68fd8e-9e7d-483e-89ec-758fc183d011.png)
- [19-second WebGL interaction](https://d2ol7oe51mr4n9.cloudfront.net/user_3E5G2A3SehelVArAZlo5WHsGiG5/48007dae-d45a-4b2e-ae51-7bd28df54ebb.mp4)
- [12-second fallback interaction](https://d2ol7oe51mr4n9.cloudfront.net/user_3E5G2A3SehelVArAZlo5WHsGiG5/3ac98e5f-be20-4cf1-a7fb-03f1ea6ca791.mp4)

The recordings show opening, insertion, movement, pause and return; they do not claim a complete game win. CDP screencast frame timestamps are preserved in variable-frame-rate MP4 with no speed-up. Software WebGL and sparse cloud capture do **not** substantiate device/GPU smoothness. Desktop recording viewport 1280×900 at deviceScaleFactor 0.75; mobile viewport 390×844 at scale 1. Desktop stills use scale 1. No physical phone or Safari claim is made.

Generation cost remains 0 for this iteration, cumulative 93.5 / 300. Account balance was 516.5 both before and after the work. No new generation, subscription, purchase or model geometry change was made.
