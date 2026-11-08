# SAVE SLOT composition pass, 8 November 2026

## Review basis

Reviewed the complete 35.48-second user recording named `2026-11-08 22-11-26.mp4`. No separate timestamp list accompanied the request. The observed defects were approximately: neighbors crossing the description at 2–4 seconds, a stray DUSK fragment during the ORBIT description at 12–16 seconds, clipped console/cartridge during play at 17–24 seconds, and abrupt contraction on return at 24–26 seconds. Private source video and extracted frames are not published.

## Three composed views

- Shelf: the established typography, six covers, selection clearance and viewport-budgeted Open button remain. Opening waits for an in-flight shelf selection without snapping it.
- Open box: the full selected box, extracted cartridge and complete console occupy a measured visual area. Desktop description has a separate, non-overlapping column. On mobile it follows below the visual stage, with a compact heading and visible launch button.
- Game: the selected box closes and recedes before the camera moves closer. The full console and inserted cartridge stay in frame; no unrelated boxes remain at the edges. The game remains the same Canvas2D simulation. A separate enlarged display is still available.

Camera bounds use the actual console model rather than fitting the CRT alone. One progress value controls object movement, stage width/height, panel reveal and reverse return. Neighbors finish clearing before the description appears. Console entry is an in-bounds reveal, rather than a hard crop through the canvas floor. Interrupted transitions take time proportional to the remaining route.

The return retains its rendered game state and layout while reversing. Shelf text and controls fade back with the physical shelf instead of waiting for a remount. Mobile header size is stable between modes. Touch actions occupy the free column beside the directional pad, retaining 44px targets.

## Verification

The acceptance deliverable is the uninterrupted real-page flow: DUSK Open → shelf → ORBIT Open → launch → shelf. Endpoint and intermediate screenshots are reviewed for the exact reported defects, separately from state/control assertions.

Browser conditions: installed Chrome on Windows 11, CSS-pixel viewports, DPR1, 100% browser zoom. EN and RU at 1366×768, 1536×776, 375×667 and 390×844; a 1366×600 short-window check is additional. Mobile is viewport/touch emulation, not physical phones or Safari. Text-only enlargement is simulated at 200%, where scrolling is allowed.

The regression checks now require the game display to remain within the complete-console composition, rather than demanding the oversized cropped CRT from the prior iteration. The normal screen is deliberately smaller than that defective crop; enlarged mode provides a larger standalone display. No change to game rules, art, state storage or completion conditions.

`npm test`, `npm run build`, `tests/scene-composition-browser.mjs`, `tests/composition-journey.mjs`, `tests/layout-journey.mjs` and `scripts/interaction-matrix.mjs` provide the reproducible checks. The existing Vite large-bundle warning remains; no new performance benchmark is claimed.

Public deployment must be checked for the exact commit after publishing. Final recordings should be captured from that public version, not from earlier local candidates.

## Scope and rollback

No paid generation or other paid service was used. Main portfolio, NOCT and SIDE A remain unchanged. `archive/before-2026-11-08-compositions` preserves published commit `02cecfd6930ab892d06dfe95f759b6775fb8fad2`; older rollback branches remain intact.
