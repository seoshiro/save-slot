# SAVE SLOT — verification log

## Scope

Independent preview; existing portfolio, NOCT and SIDE A unchanged. All eight supplied images were downloaded and visually inspected. The clean console image alone was sent to Meshy; the storyboard and website screenshots were not used as 3D-generation input.

## Executed checks

- TypeScript and Vite production build.
- Six pure game tests: solid terrain, diagonal speed, remote/idempotent activation, portal gating, reachable objectives, corrupt session data.
- Browser matrix at **1440×1000**, **768×1024**, **390×844** in installed Chrome: shelf, matching world, insertion, pause, no movement while paused, EN/RU, return, three interrupted open/close cycles, one renderer, concept mode, browser Back, no horizontal overflow.
- Forced light mode with a visible Canvas game and language retained after reload.
- axe WCAG 2 A/AA and 2.1 AA rule sets on the shelf. The initial missing semantic role on the labelled scene container was corrected; the repeated shelf scans have no violations. This is an automatic scan, not a complete WCAG conformance claim.

Machine-readable results and actual screenshots are in `evidence/qa.json` and `evidence/`. Additional end-to-end recording and published-address checks are recorded after deployment.

## Published-address check

GitHub Pages preview: **https://seoshiro.github.io/save-slot/**. Workflow build and deployment succeeded. The complete three-size browser matrix was repeated on this public URL: EN/RU, shelf, insertion, pause, interrupted returns, concept view, Back, fallback and refresh. No page errors were captured; the three automatic shelf accessibility scans report no violations.

The uncut desktop recording from the public URL includes actual keyboard play: signals 1/3, 2/3, 3/3, portal completion, confirmed restart and return to the shelf. Recorded game time at completion: **26.2998 seconds** on this known route. This is one automated play-through, not an estimate of typical player completion time.

The additional local recovery test aborts the GLB request, plays in Canvas mode, retries the model and verifies that insertion/selection survive with one renderer. It also checks persisted movement, reload, orientation and all six worlds. The game's semantic group was corrected after an automatic scan; the repeated game scan has no violations.

Production dependencies: `npm audit --omit=dev --json` reported zero known vulnerabilities at verification. This covers that dependency audit only.

## Rendering evidence and limits

Recordings and performance JSON identify installed **Chrome 156.0.8078.76**, Windows 11 build 26200, AMD Ryzen 5 7535HS, 15 GiB reported RAM and **AMD Radeon Graphics / ANGLE Direct3D11**. Desktop viewport 1440×1000, mobile viewport 390×844. Tests are headless installed Chrome on the laptop; the mobile viewport is not a physical phone. The public recordings include real resource timings. A browser test instance overlapped part of the desktop recording; it is not a controlled benchmark.

RAF delivery intervals and long tasks are retained as diagnostics. They do not measure complete GPU presentation or prove smoothness on other devices. The actual uncut recordings are provided alongside them. Startup shader work produces measurable long tasks; a cached repeat visit and other hardware may behave differently.

## Asset publication boundary

The new local cleaned GLB is **1,003,836 bytes** and its inspected mesh has **22,640 triangles**. The earlier public console remains in the repository. A GitHub `create_blob` call for the replacement required a platform confirmation and did not finish; a subsequent read-only lookup of its deterministic Git blob SHA returned 404. No repeated blob submission was made. The optimised GLB, original Meshy GLB and Blender file are retained in the delivered source archive. This is the remaining upload step, not a new generation or expense.

## Visual fixes made during verification

- Enlarged the shelf and chosen box after the first real-browser view exposed excessive camera distance.
- Removed the hidden hero from layout flow in the open state.
- Kept cartridge art proportional by composing its own wide label, instead of squeezing a tall cover into it.
- Replaced the generated top tray with a real open cartridge slot; removed uneven baked lighting and a duplicate control.
- Reduced motion uses short transitions. Video and sound never autoplay. Audio is a small original synthesized cue only after explicit sound activation.
- The first model/GPU preparation finishes while the shelf remains intact, with an honest preparing status and Cancel. Opening uses warmed resources; repeated opening does not repeat loading. Hover/focus can start the same single cached preparation.
- A horizontal drag captures the pointer and cancels the selection tween; its release selects a world without opening it. Static console shadows are cached during gameplay rather than recomputed for every screen-texture update.
- Frame inspection exposed an actual empty-canvas interval during the animated layout resize. `renderer.setSize` cleared the drawing buffer after the previous RAF. Resize now draws synchronously before paint. Nine sampled real-browser screenshots retained visible object pixels; `evidence/motion-qa.json` records their timing and the limited scope of this check. The continuous recording remains the main motion evidence.
- Console standby text and field notes follow EN/RU, including the initial saved language and model recovery. Physical WASD/E uses keyboard codes so a different keyboard layout does not break the controls. A real-browser RU movement/pause check passed. Gameplay instructions are shown only for MOSS SIGNAL; the five concept worlds do not imply playable games.
- Game input/screen activation waits for the actual insertion endpoint. Concept cartridges show their concept view after insertion. Escape pauses when leaving the enlarged screen, Back dismisses restart/about dialogs, and the portfolio/concept credit remains visible on mobile. These targeted browser checks passed. Dragging interrupts from the current interpolated selection.

## Known boundaries

- Mobile sizes are browser viewport tests, not a physical phone. Safari is not tested.
- This is one short playable game and five illustrated concepts.
- Session progress belongs to this tab's browser session; it is not a cloud save or account.
- User-provided illustration crops are used for the six worlds. Exact full-resolution source artwork was not separately generated or purchased.
- No optional concept film was generated; the live game is the evidence of gameplay.

## Refinement pass - 6 November

- The 3D viewport stays fixed during opening, insertion and return. Camera framing approaches the console at insertion; the desktop projected screen is about 533 px wide at 1440x1000 in the local measurement, previously about 250 px in the reviewed recording. This is screen width, not a performance claim.
- A separate returning state withholds the shelf heading/actions until physical reversal settles. The timeline reverses insertion, cross-travel, descent, flap, console withdrawal, then shelf restoration. Repeated changes retain the current progress.
- MOSS SIGNAL has layered foliage on blocked terrain, ruined stone silhouettes, taller numbered beacons, proximity hints, activation ripples and a portal that lights with restored signals. Collision data and objective logic remain unchanged.
- Light mode uses a standalone 7:5 Canvas frame, not guessed alignment over a console photograph. Covers have bounded aspect ratios and a separate shelf area below the heading.
- No new Higgsfield operations. Cumulative 93.5 / 300; reserve 206.5. The binary replacement still lacks the specific platform confirmation; it has not been resubmitted or bypassed.

Local TypeScript/build and six game tests pass. The existing three-viewport interaction matrix passes, with no captured page errors or automated shelf accessibility violations. Targeted width, return-state and EN/RU WebGL/fallback layout checks are in evidence/refinement-qa.json. Public checks and new recordings follow the text/code deployment; the exact public model will be identified separately.

Published refinement checks: all **24** targeted assertions passed at https://seoshiro.github.io/save-slot/ on application commit a66ea95e7af288e9e3bd2874c343d7ed2aa4e4af. Both languages were visually captured in WebGL and fallback at 1440x1000 and 390x844. No page errors were captured. The projected WebGL screen measured **533.25 x 395.64 px** on desktop; the independent fallback frame measured **720 x 514.28 px**. All six HTML selectors stay inside the viewport. Queued keyboard selection and reopening during return passed on both widths.

The exact published GLB was downloaded from /save-slot/media/console.glb and SHA-256 checked: **6,379,068 bytes**, hash 96A74FF021B4EE249FF52E22CD05D6B6ECB8879F64160E841E00DE852873685B. It does **not** match the cleaned local 1,003,836-byte GLB. See evidence/public-model.json. Recordings made on the public URL therefore honestly show the earlier console body with the new camera/motion/game code. The final cleaned model publication and its public front/angled inspection remain blocked by the original platform confirmation.

The public recovery run passed after the fault route was installed before navigation (so prefetch cannot precede fault injection) and the test awaited the real Canvas-ready state. It verifies failed-model play, retry to 3D with one renderer, game focus, saved position/reload, orientation and all six matching world titles. No page errors; the automatic in-game accessibility scan has no violations. Early test attempts that injected the failure after possible prefetch, or asserted readiness before React's state commit, were corrected in the test setup; no product workaround was needed.

New uncut public recordings: desktop 37.60 s, fallback 36.32 s, and mobile viewport. The first two show actual play through all three signals and the portal, restart and return. Return frames show the console/cart packing while the hero and shelf actions remain absent; they reappear only after the physical transition settles. Contact sheets were extracted from the videos and visually reviewed. Mobile recording uses viewport-only screenshots to avoid Chrome video padding caused by temporary full-page-capture viewport resizing.

Recording conditions remain Chrome 156 / Windows 11 / Ryzen 5 7535HS / AMD Radeon ANGLE D3D11. Mobile is an emulated viewport, not a physical phone. RAF intervals are diagnostics only. The desktop capture retained startup long tasks up to 956 ms during genuine first scene preparation; it is not evidence of universal smoothness or 60 fps. No new paid asset operations were needed for this refinement pass.
