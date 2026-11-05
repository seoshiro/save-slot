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
