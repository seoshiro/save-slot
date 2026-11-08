import { test } from "node:test";
import assert from "node:assert/strict";
import { advance, freshGame, hazards } from "../src/game.ts";

const traffic = (elapsed: number) =>
  hazards({ ...freshGame("dusk-delivery"), elapsed });
const close = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${actual} should equal ${expected}`,
  );

test("both traffic lanes stay on the road through late game cycles", () => {
  for (const elapsed of [
    0, 1, 99, 100, 100.01, 104.99, 105, 105.01, 107.5, 110, 200.1, 500.125,
    3599.9, 86400,
  ]) {
    const cars = traffic(elapsed);
    assert.equal(cars.length, 4);
    for (const car of cars) {
      assert.ok(
        car.x >= 2 && car.x < 26,
        `car outside road at ${elapsed}: ${car.x}`,
      );
      assert.equal(car.radius, 0.8);
    }
  }
  assert.deepEqual(
    traffic(107.5)
      .filter((car) => car.y === 12)
      .map((car) => car.x),
    [8, 20],
  );
});

test("traffic keeps the original initial phase and speed", () => {
  for (const elapsed of [0, 0.1, 1, 4.95, 23.7, 99.9, 100]) {
    const expected = [8, 12].flatMap((y, i) =>
      [0, 12].map((offset) => ({
        x: 2 + ((elapsed * (i ? -2.4 : 2.4) + offset + 240) % 24),
        y,
      })),
    );
    traffic(elapsed).forEach((car, i) => {
      close(car.x, expected[i].x);
      assert.equal(car.y, expected[i].y);
    });
  }
});

test("late traffic wraps continuously at the same 2.4 units per second", () => {
  for (const elapsed of [
    9.99, 99.99, 104.99, 109.99, 199.99, 504.99, 1009.99, 86399.99,
  ]) {
    const before = traffic(elapsed);
    const after = traffic(elapsed + 0.02);
    before.forEach((car, i) => {
      const wrappedDelta = ((((after[i].x - car.x + 12) % 24) + 24) % 24) - 12;
      close(wrappedDelta, (car.y === 8 ? 2.4 : -2.4) * 0.02);
    });
    traffic(elapsed + 10).forEach((car, i) => close(car.x, before[i].x));
  }
});

test("late lower-lane collisions still cause setbacks and keep earned objectives", () => {
  const elapsed = 107.5;
  for (const car of traffic(elapsed).filter((car) => car.y === 12)) {
    const before = {
      ...freshGame("dusk-delivery"),
      x: car.x,
      y: car.y,
      elapsed,
      beacons: [true, false, false],
    };
    const after = advance(before, 0, 0, 0.02);
    assert.equal(after.setbacks, 1);
    assert.deepEqual(after.beacons, before.beacons);
    assert.deepEqual([after.x, after.y], [4, 16]);
    assert.equal(after.cooldown, 1.2);
  }
  assert.equal(
    advance(
      { ...freshGame("dusk-delivery"), x: 14, y: 12, elapsed },
      0,
      0,
      0.02,
    ).setbacks,
    0,
  );
});
