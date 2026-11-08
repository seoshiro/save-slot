# SAVE SLOT layout and controls, 8 November 2026

## Changes

- The shelf measures its actual title, header, footer, selection row and action row. Remaining viewport height goes to the scene. Open and cartridge selection fit without scrolling at 1366x768, 1536x776, 375x667 and 390x844 in both EN and RU.
- The enlarged canvas has a reserved area below Back to shelf. It no longer uses a fixed overlay over navigation. The mobile Back button is explicitly visible.
- Open, insert, enlarge and return reset the document scroll position. Repeated return actions do not issue duplicate history changes. Focus restoration does not scroll the page.
- Normal gameplay has a larger 3D screen. The mobile title, counter and touch controls use a more compact flow, without reducing the 44px directional targets.
- The desktop shelf includes the last box inside its framing. Increased clearance and gentler shelf perspective keep adjacent projected silhouettes separate. The same camera and progress path handles reverse motion; identical repeated stage intents do not restart a running transition.
- TIDEBOUND adds layered water, foam, rock shelves, sandy refuges and lighthouse atmosphere. Existing collision tiles, tide hazards/timing, objectives and mechanics remain unchanged. Reduced motion keeps decoration static.
- Mobile About is reachable from the header.
- The first HTML already includes the loading composition. Vector lettering and matching critical CSS keep its layout stable before JavaScript and fonts arrive. The existing minimum intro time counts from navigation, not from late app startup; real resource readiness still gates entry.

## Verification and conditions

Windows 11, installed Chrome 157, DPR1, browser viewport in CSS pixels and 100% zoom. Mobile viewport and touch input are emulated on Windows; these are not physical-phone or Safari tests. Text-only enlargement is simulated by doubling computed font sizes, preserving access through scrolling rather than promising a one-screen layout.

The unit suite covers all six game routes, collision/storage invariants, 5,001 shelf positions, 4,812 opening/return bounds, projected shelf clearance and TIDEBOUND rendering/hazard invariants. TypeScript and the production build pass. Vite still reports the existing large-bundle warning; it is not a build failure.

The layout journey checks EN/RU at all four requested sizes, Open visibility/hit testing, rapid endpoint selection, opening, insertion, enlarged mode, unobstructed direct Back, scroll resets, interruption, repeated actions and selection retention. Two continuous recordings show the whole workflow without cuts at 1366x768 RU and 375x667 RU. The same suite checks 200% text access to Open, Insert, Pause, Restart and Back.

The existing UI matrix additionally covers WebGL fallback, resource failures/retry, reduced motion, keyboard and touch movement, pause, restart cancellation, accessibility and viewport resizing. Intro tests delay the JavaScript bundle and fonts, capture through Chrome's screenshot API without waiting for fonts, and compare exact logo/composition bounds before and after app mounting.

All new runtime assertions and videos are generated from the production preview. The public deployment must also be checked after pushing this commit; local preview is not evidence of a successful public rollout.

## Materials

Current recordings and reports are under evidence/six-games/layout-controls/. TIDEBOUND's real keyboard completion and visual evidence are under evidence/six-games/tide-atmosphere/. These capture directories are intentionally ignored by Git. Private user reference media is not included.

No new generation or paid service was used. The main portfolio, NOCT and SIDE A remain unchanged.

## Rollback

archive/before-2026-11-08-layout preserves the previously published b4ff8627f668933f166407825d7561abd18ef07c. The earlier pre-six-game archive remains intact.
