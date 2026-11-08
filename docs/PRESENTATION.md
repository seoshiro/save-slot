# Presentation assets

Captured from https://seoshiro.github.io/save-slot/ on 8 November 2026. The public application script was `assets/index-e1zKRcfX.js`, matching the accepted application build documented at commit `4234d5d`.

## Screenshots

`media/desktop-{shelf,box,console,game}.webp`: 1366 × 768.

`media/mobile-{shelf,box,console,game}.webp`: 390 × 844.

Chrome on Windows, headless, DPR 1. Mobile uses viewport/touch emulation. Both fresh contexts returned HTTP 200 with no page errors. Screenshots retain the actual page composition; only WebP compression is applied. No app styles, scene sizes, game state or timing were changed. `scripts/capture-presentation.mjs` reproduces the capture; raw local videos are excluded from Git. See [capture manifest](media/capture-manifest.json).

## Short preview

`media/save-slot-preview.gif`: 6 seconds at original speed, 768 × 432, 8 fps. Taken from seconds 6–12 of the new desktop browser recording. Reduced spatial/temporal resolution and a 128-colour palette keep the GitHub preview compact. It is a presentation excerpt, not proof of rendering frame rate. The clip shows the shelf, open box, insertion and enlarged game.

## Six-game recording

[Six-game victory montage](media/six-games-verified.webm): 60.57 seconds, approximately 3.1 MB. Copied byte-for-byte from `delivery/SAVE-SLOT-six-games-verified.webm`.

This is an edited original-speed selection from the accepted public first-enlargement recording and actual victories in all six games. It is not a continuous complete playthrough. No victory or gameplay state was injected. The [existing delivery manifest](media/six-games-verified.manifest.json) identifies excerpt timing and source provenance; full uncut sources are retained locally. Mobile touch is emulated, not physical-device testing.

The older `SAVE-SLOT-polish-enlarged-return.webm` was not used in this presentation: it predates the accepted six-game update. Fresh captures and the current verified montage are used instead.

## Scope and rollback

This update changes presentation assets, README and capture tooling only. It does not alter the application, scene sizes or game logic. `archive/before-presentation-2026-11-08` retains the previous repository HEAD `4721c27`. Publication is handled separately after review.
