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

## Visual fixes made during verification

- Enlarged the shelf and chosen box after the first real-browser view exposed excessive camera distance.
- Removed the hidden hero from layout flow in the open state.
- Kept cartridge art proportional by composing its own wide label, instead of squeezing a tall cover into it.
- Replaced the generated top tray with a real open cartridge slot; removed uneven baked lighting and a duplicate control.
- Reduced motion uses short transitions. Video and sound never autoplay. Audio is a small original synthesized cue only after explicit sound activation.

## Known boundaries

- Mobile sizes are browser viewport tests, not a physical phone. Safari is not tested.
- This is one short playable game and five illustrated concepts.
- Session progress belongs to this tab's browser session; it is not a cloud save or account.
- User-provided illustration crops are used for the six worlds. Exact full-resolution source artwork was not separately generated or purchased.
- No optional concept film was generated; the live game is the evidence of gameplay.
