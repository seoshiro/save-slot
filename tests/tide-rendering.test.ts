import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshGame,
  paintGame,
  tideHigh,
  walkable,
  COLS,
  ROWS,
} from "../src/game.ts";

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alpha: number;
};
function render(elapsed: number, time = 0, ready = false) {
  const rects: Rect[] = [];
  const context = {
    fillStyle: "",
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    font: "",
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({
        x,
        y,
        w,
        h,
        color: this.fillStyle,
        alpha: this.globalAlpha,
      });
    },
    fillText() {},
  };
  const state = {
    ...freshGame("tidebound"),
    elapsed,
    beacons: [ready, ready, ready],
  };
  const before = structuredClone(state);
  paintGame(context as unknown as CanvasRenderingContext2D, state, time, false);
  assert.deepEqual(state, before, "rendering cannot change game state");
  assert.equal(context.globalAlpha, 1, "beacon beam restores opacity");
  assert.equal(context.imageSmoothingEnabled, false);
  return rects;
}

test("TIDEBOUND retains exact hazard bounds and high/low signals at every phase", () => {
  for (const elapsed of [0, 4.8, 5.5, 6, 8, 9.5, 10]) {
    const rects = render(elapsed);
    for (let i = 0; i < 3; i++) {
      const x = (6 + i * 7) * 16;
      const high = tideHigh(elapsed, i);
      assert.ok(
        rects.some(
          (r) =>
            r.x === x &&
            r.y === 144 &&
            r.w === 40 &&
            r.h === 32 &&
            r.color === (high ? "#348eab" : "#8f9b8c"),
        ),
      );
      assert.ok(
        rects.some(
          (r) =>
            r.x === x + 10 &&
            r.y === 131 &&
            r.color === (high ? "#f09d77" : "#c7e5a4"),
        ),
      );
    }
  }
});

test("TIDEBOUND coastline fills only the existing walkable tile footprint", () => {
  const rects = render(0);
  const beaches = rects.filter(
    (r) => r.w === 16 && r.h === 16 && ["#c7b68b", "#c0b08a"].includes(r.color),
  );
  const painted = new Set(beaches.map((r) => `${r.x / 16},${r.y / 16}`));
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      assert.equal(
        painted.has(`${x},${y}`),
        walkable(x + 0.5, y + 0.5, "tidebound"),
      );
});

test("TIDEBOUND reduced-motion decoration is fixed while tide danger still updates", () => {
  assert.deepEqual(render(0, 0, true), render(0.25, 0, true));
  assert.notDeepEqual(render(0, 0, true), render(6, 0, true));
  assert.notDeepEqual(render(0, 0, true), render(0, 1000, true));
});
