import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshGame,
  advance,
  activate,
  parseGame,
  gameIds,
  gameSpecs,
  hazards,
  tideHigh,
  fireOn,
  progress,
  status,
  walkable,
} from "../src/game.ts";
import type { GameState, GameId } from "../src/game.ts";
const step = (s: GameState, x = 0, y = 0) => advance(s, x, y, 0.05);
function move(s: GameState, x: number, y: number): GameState {
  for (let i = 0; i < 2400; i++) {
    const dx = x - s.x,
      dy = y - s.y;
    if (Math.hypot(dx, dy) < 0.13) return activateBrake(s);
    if (["orbit-zero", "snowbyte"].includes(s.id) && Math.hypot(dx, dy) < 0.7)
      s = activateBrake(s);
    s = step(s, Math.abs(dx) > 0.07 ? dx : 0, Math.abs(dy) > 0.07 ? dy : 0);
    if (s.won) return s;
  }
  throw new Error(
    "Unreachable waypoint " +
      s.id +
      " " +
      x +
      "," +
      y +
      " at " +
      s.x +
      "," +
      s.y,
  );
}
const activateBrake = (s: GameState) =>
  ["orbit-zero", "snowbyte"].includes(s.id) ? activate(s).state : s;
function waitFor(
  s: GameState,
  predicate: (s: GameState) => boolean,
): GameState {
  for (let i = 0; i < 500; i++) {
    if (predicate(s)) return s;
    s = step(s);
  }
  throw new Error("No safe phase");
}
function interact(s: GameState, x: number, y: number) {
  return activate(move(s, x, y)).state;
}
test("all six cartridges win through real frame-by-frame routes", (t) => {
  let s = freshGame("dusk-delivery");
  s = move(s, 3.3, 16);
  s = interact(s, 3.3, 4);
  s = interact(s, 5, 4);
  s = move(s, 5, 2.6);
  s = move(s, 23, 2.6);
  s = interact(s, 23, 4);
  s = interact(s, 23, 16);
  s = move(s, 23, 17.5);
  s = move(s, 4, 17.5);
  s = move(s, 4, 16);
  assert.ok(s.won, "dusk");
  assert.ok(s.elapsed >= 29.9 && s.elapsed < 90, "dusk lasts 30–90 seconds");
  t.diagnostic(
    "dusk duration: " + s.elapsed.toFixed(2) + "; setbacks: " + s.setbacks,
  );
  s = freshGame("orbit-zero");
  for (const p of [
    { x: 6, y: 4 },
    { x: 23, y: 5 },
    { x: 22, y: 16 },
    { x: 4, y: 16 },
  ])
    s = move(s, p.x, p.y);
  for (let i = 0; i < 20 && !s.won; i++) s = step(activate(s).state);
  assert.ok(s.won, "orbit");
  assert.ok(s.elapsed >= 29.9 && s.elapsed < 90, "orbit lasts 30–90 seconds");
  t.diagnostic(
    "orbit duration: " + s.elapsed.toFixed(2) + "; setbacks: " + s.setbacks,
  );
  s = freshGame();
  s = interact(s, 5.5, 5.5);
  s = interact(s, 22.5, 5.5);
  s = interact(s, 22.5, 15.5);
  s = move(s, 22.5, 5.5);
  s = move(s, 14.5, 5.5);
  s = move(s, 14.5, 3.5);
  assert.ok(s.won, "moss");
  assert.ok(s.elapsed >= 29.9 && s.elapsed < 90, "moss lasts 30–90 seconds");
  t.diagnostic(
    "moss duration: " + s.elapsed.toFixed(2) + "; setbacks: " + s.setbacks,
  );
  s = freshGame("tidebound");
  for (let i = 0; i < 3; i++) {
    s = move(s, 5.5 + i * 7, 10);
    s = waitFor(
      s,
      (t) => !tideHigh(t.elapsed + 0.05, i) && tideHigh(t.elapsed - 0.05, i),
    );
    s = move(s, 10.5 + i * 7, 10);
  }
  s = move(s, 24.5, 7.5);
  assert.ok(s.won, "tide");
  assert.ok(s.elapsed >= 29.9 && s.elapsed < 90, "tide lasts 30–90 seconds");
  t.diagnostic(
    "tide duration: " + s.elapsed.toFixed(2) + "; setbacks: " + s.setbacks,
  );
  assert.ok(s.elapsed >= 30 && s.elapsed < 90, "tide duration " + s.elapsed);
  s = freshGame("ember-vault");
  s = move(s, 5, 13);
  s = waitFor(
    s,
    (t) => !fireOn(t.elapsed + 0.05, 1) && fireOn(t.elapsed - 0.05, 1),
  );
  s = move(s, 5, 9);
  s = waitFor(
    s,
    (t) => !fireOn(t.elapsed + 0.05, 0) && fireOn(t.elapsed - 0.05, 0),
  );
  s = interact(s, 5, 4);
  s = interact(s, 14, 4);
  s = interact(s, 23, 4);
  s = move(s, 23, 7);
  s = waitFor(
    s,
    (t) => !fireOn(t.elapsed + 0.05, 0) && fireOn(t.elapsed - 0.05, 0),
  );
  s = move(s, 23, 11);
  s = waitFor(
    s,
    (t) => !fireOn(t.elapsed + 0.05, 1) && fireOn(t.elapsed - 0.05, 1),
  );
  s = move(s, 23, 16);
  assert.ok(s.won, "ember");
  assert.ok(s.elapsed >= 29.9 && s.elapsed < 90, "ember lasts 30–90 seconds");
  t.diagnostic(
    "ember duration: " + s.elapsed.toFixed(2) + "; setbacks: " + s.setbacks,
  );
  s = freshGame("snowbyte");
  for (const [x, y] of [
    [4, 15.2],
    [23, 15.2],
    [23, 16],
    [23, 10],
    [5, 10],
    [5, 4.8],
    [23, 4.8],
    [23, 4],
    [24.5, 4],
  ])
    s = move(s, x, y);
  assert.ok(s.won, "snow");
  assert.ok(s.elapsed >= 29.9 && s.elapsed < 90, "snow lasts 30–90 seconds");
  t.diagnostic(
    "snow duration: " + s.elapsed.toFixed(2) + "; setbacks: " + s.setbacks,
  );
  assert.ok(s.elapsed >= 30 && s.elapsed < 90, "snow duration " + s.elapsed);
});
for (const id of gameIds) {
  test(id + ": goal is gated, identity isolated, state immutable", () => {
    const s = freshGame(id);
    const before = JSON.stringify(s);
    advance(s, 1, 0, 0.05);
    activate(s);
    assert.equal(JSON.stringify(s), before);
    assert.equal(step({ ...s, ...gameSpecs[id].goal }).won, false);
    assert.deepEqual(parseGame(s, id), s);
    const other = gameIds.find((other) => other !== id)!;
    assert.deepEqual(parseGame(s, other), freshGame(other));
    for (const bad of [
      { ...s, x: Infinity },
      { ...s, y: 0 },
      { ...s, vx: NaN },
      { ...s, won: true },
      { ...s, checkpoint: 3 },
      { ...s, cooldown: -1 },
      { ...s, beacons: [false, 0, false] },
      { ...s, id: "other" },
    ])
      assert.deepEqual(parseGame(bad, id), s);
    assert.ok(walkable(s.x, s.y, id));
    assert.equal(status(s), "playing");
    assert.equal(progress(s), 0);
  });
}
test("traffic, asteroids, fire, tides and cracks cause honest recoverable setbacks", () => {
  for (const id of ["dusk-delivery", "orbit-zero", "snowbyte"] as GameId[]) {
    let s = freshGame(id);
    const h = hazards(s)[0];
    s = step({ ...s, x: h.x, y: h.y });
    assert.equal(s.setbacks, 1, id);
    assert.equal(status(s), "setback");
    assert.deepEqual(
      [s.x, s.y],
      [gameSpecs[id].spawn.x, gameSpecs[id].spawn.y],
    );
  }
  for (const [id, x, y] of [
    ["tidebound", 7, 10],
    ["ember-vault", 5, 8],
  ] as [GameId, number, number][]) {
    const s = step({ ...freshGame(id), x, y });
    assert.equal(s.setbacks, 1, id);
  }
  const checkpoint = {
    ...freshGame("tidebound"),
    x: 14,
    y: 10,
    beacons: [true, false, false],
    checkpoint: 0,
  };
  const reset = step(checkpoint);
  assert.equal(reset.x, 10.5);
  assert.equal(progress(reset), 1);
});
test("inertia persists without input and action brakes it", () => {
  for (const id of ["orbit-zero", "snowbyte"] as GameId[]) {
    let s = freshGame(id);
    for (let i = 0; i < 20; i++) s = step(s, 1, 0);
    const drift = step(s);
    assert.ok(drift.x > s.x);
    const brake = activate(s).state;
    assert.ok(Math.abs(brake.vx) < Math.abs(s.vx) * 0.2);
  }
});
test("ordered checkpoints cannot be collected backwards and elapsed is capped", () => {
  for (const id of ["snowbyte", "tidebound", "ember-vault"] as GameId[]) {
    const s = { ...freshGame(id), ...gameSpecs[id].objectives[2] };
    assert.equal(progress(activate(step(s)).state), 0);
    assert.deepEqual(
      parseGame({ ...s, beacons: [false, true, false] }, id),
      freshGame(id),
    );
  }
  const s = freshGame("orbit-zero");
  assert.equal(advance(s, 1, 0, 1e9).elapsed, 0.05);
  assert.equal(advance(s, 1, 0, NaN), s);
});

test('dock requires low speed and a station approach, not just collected cells',()=>{
 const s={...freshGame('orbit-zero'),beacons:[true,true,true],...gameSpecs['orbit-zero'].goal,vx:2};
 assert.equal(step(s).won,false);
 assert.equal(step(activate(s).state).won,true);
 assert.equal(step({...s,x:12,y:3,vx:0}).won,false);
});
test('fire and tidal hazards have real safe phases and preserve earned progress',()=>{
 const fire={...freshGame('ember-vault'),x:5,y:8,elapsed:2.3,beacons:[true,false,false]};
 assert.equal(step(fire).setbacks,0);
 const burnt=step({...fire,elapsed:0});assert.equal(burnt.setbacks,1);assert.deepEqual(burnt.beacons,[true,false,false]);
 const tide={...freshGame('tidebound'),x:7,y:10,elapsed:6.3};assert.equal(step(tide).setbacks,0);
});
test('cartridge instances own independent objective arrays',()=>{
 const a=freshGame('dusk-delivery'),b=freshGame('dusk-delivery'),c=freshGame('moss-signal');
 a.beacons[0]=true;assert.equal(progress(b),0);assert.equal(progress(c),0);
 const restored=parseGame(a,'dusk-delivery');restored.beacons[1]=true;assert.equal(progress(a),1);
});
