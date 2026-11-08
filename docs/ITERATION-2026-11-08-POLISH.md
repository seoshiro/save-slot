# SAVE SLOT transition polish, 8 November 2026

## Scope

This pass addresses the remaining feedback on the published e7184d9 recording: a white pre-intro interval on cold navigation, overlapping shelf and Back labels, parts showing through during reveal/return, and a shadow outliving the body. The accepted normal-mode endpoint camera, object positions and sizes are preserved. No paid generations or external services were used, and the main portfolio is unchanged.

## Implementation

- The inline HTML intro paints while production CSS loads. Application mount waits for the stylesheet; failure leaves an EN/RU retry action rather than unstyled controls. No new minimum loading delay is added.
- Shelf heading and Back navigation share a non-overlapping progress handoff. Hidden navigation cannot receive focus; Escape and the visible header remain available for immediate cancellation.
- Partial console and selected-box transitions blend complete opaque rendered scenes, including their shadows. Individual surfaces are not independently transparent; neither internal geometry nor a screen-door noise pattern is exposed. Normal endpoints retain their original single-pass rendering. Bounded viewport-stable RGBA8 buffers are prepared during the existing intro; animated canvas resizing does not recreate them. Per-material tone mapping preserves the CRT appearance.
- Enlarged play reserves the measured HTML panel width instead of an obsolete percentage. This removes the canvas/text overlap discovered during visual checking. Mobile retains its stacked layout.
- Redundant history popstate after an immediate fallback return no longer resets the already-closed shelf to an unsettled state. Direct enlarged return, immediate reopen and browser history are covered by a focused regression.
- Existing normal-mode movement, camera fitting, endpoint geometry and game rules are unchanged.

## Acceptance checks

The short recording visibly enters the enlarged game screen and returns directly to the shelf while still enlarged. Rapid enlarged-mode toggles and interrupted open/insert sequences are checked separately. Dense frame samples check the top-label handoff; intermediate screenshots and video are reviewed for surface, shadow and color continuity.

Browser conditions are Chrome on Windows, DPR 1, 100% browser zoom. Mobile checks use CSS viewport and touch emulation, not physical iOS/Android devices or Safari. Cold-document first paint is tested separately with delayed resources. Browser surfaces before the HTTP document arrives are outside the site; record the actual first captured frame rather than assuming it is part of the page.

Run `npm run test:polish` for the focused browser flow and `npm test` / `npm run build` for unit/type/build checks. Production preview is tested with TEST_URL=http://localhost:4199/. The baseline layout and interaction suites remain applicable. The integrated local build passed 34 unit tests and TypeScript/Vite build; the existing large-bundle warning remains. Focused final-build verification passed 260 assertions across all ten EN/RU viewport cases, 110 reduced-motion assertions across four cases, and 100 fallback assertions across four cases. Baseline layout checks passed 225 assertions and the interaction/axe/recovery matrix passed 60 checks. The dedicated CSS-blocked first-paint and fallback-history regression also passed.

The isolated clean recording showed distinct partial console frames and coordinated shadow fading, without the rejected screen-door pattern. The public deployment and its delivery recording are verified separately after publishing. Mobile physical devices, Safari, Firefox and Edge were not tested; no universal frame-rate claim is made.

## Rollback

`archive/before-2026-11-08-transition-polish` preserves e7184d95c6847e04646d52f7356c5df624a117a4. Earlier rollback branches remain intact.
