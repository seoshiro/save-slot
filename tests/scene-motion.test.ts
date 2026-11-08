import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import * as THREE from "three";
const source = readFileSync(
  new URL("../src/scene.ts", import.meta.url),
  "utf8",
);
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const js = (s: string) => stripTypeScriptTypes(s);
const layoutSource = source
  .slice(
    source.indexOf("export function shelfLayout"),
    source.indexOf("type BoxRig"),
  )
  .replace("export ", "");
const layout = new Function(
  "clamp",
  "mix",
  "smooth",
  js(layoutSource) + ";return shelfLayout;",
)(clamp, mix, smooth);

test("rotated shelf boxes keep clearance across 5,001 intermediate positions", () => {
  for (let n = 0; n <= 5000; n++) {
    const poses = layout(n / 1000, 6);
    for (let i = 1; i < 6; i++)
      assert.ok(
        poses[i].x - poses[i - 1].x - poses[i].half - poses[i - 1].half >=
          0.219999,
        "overlap at " + n / 1000,
      );
  }
});
test("integer crossings are continuous, including first and last selection", () => {
  for (let i = 0; i < 6; i++) {
    const before = layout(Math.max(0, i - 0.000001), 6),
      after = layout(Math.min(5, i + 0.000001), 6);
    for (let j = 0; j < 6; j++)
      assert.ok(Math.abs(before[j].x - after[j].x) < 0.00001);
    assert.ok(Math.abs(layout(i, 6)[i].x) < 1e-10);
  }
});
test("both shelf ends have equal selected-neighbor spacing", () => {
  const first = layout(0, 6),
    last = layout(5, 6);
  assert.ok(Math.abs(first[1].x - (last[5].x - last[4].x)) < 1e-10);
});
test("neighbors have completed clearance before selected box travel", () => {
  assert.match(source, /const spread = smooth\(0, 0.23, op\)/);
  assert.match(source, /const travel = smooth\(0.24, 0.52, op\)/);
});
test("drag uses selection-only callback and same drag/release scale", () => {
  assert.match(source, /if \(wasDrag\) \{[\s\S]*?"drag",[\s\S]*?return;/);
  assert.equal((source.match(/this.width < 700 \? 95 : 150/g) || []).length, 2);
  assert.match(source, /Math.hypot\(dx, dy\) > 12/);
});
test("latest stage cancels prior completion and uses requested full durations", () => {
  const method = source.slice(
    source.indexOf("  setStage(stage: number)"),
    source.indexOf("  warmConsole()"),
  );
  let tweens: any[] = [];
  const gsap = {
    killTweensOf: () => {},
    to: (_: unknown, config: any) => tweens.push(config),
  };
  const make = new Function(
    "clamp",
    "gsap",
    js("class Harness {" + method + "}") + "; return Harness;",
  );
  const Harness = make(clamp, gsap);
  const settled: number[] = [];
  const scene = Object.assign(Object.create(Harness.prototype), {
    ready: true,
    dead: false,
    selected: 2,
    openingIndex: 2,
    transitionId: 0,
    progress: { value: 0 },
    deferredSelection: null,
    callbacks: { settled: (x: number) => settled.push(x) },
    request: () => {},
  });
  scene.setStage(1);
  assert.equal(tweens[0].duration, 2.2);
  scene.progress.value = 0.6;
  scene.setStage(0);
  tweens[0].onComplete();
  assert.deepEqual(settled, []);
  tweens[1].onComplete();
  assert.deepEqual(settled, [0]);
  assert.equal(tweens[1].duration, 2.2);
  scene.progress.value = 1;
  scene.setStage(2);
  assert.equal(tweens[2].duration, 1.05);
});

test("actual box bounds stay disjoint throughout open/return on mobile and desktop", () => {
  const method = source.slice(
    source.indexOf("  private render(time: number)"),
    source.indexOf("  dispose()"),
  );
  const Harness = new Function(
    "THREE",
    "clamp",
    "mix",
    "smooth",
    "shelfLayout",
    js("class Harness {" + method + "}") + "; return Harness;",
  )(THREE, clamp, mix, smooth, layout);
  const geometry = new THREE.BoxGeometry(1.6, 2.72, 0.48);
  const material = new THREE.MeshBasicMaterial();
  for (const width of [390, 1440])
    for (let selected = 0; selected < 6; selected++) {
      const boxes = Array.from({ length: 6 }, () => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry, material));
        return { group, flap: new THREE.Group(), cart: new THREE.Group() };
      });
      const scene = Object.assign(Object.create(Harness.prototype), {
        dead: false,
        progress: { value: 0 },
        width,
        height: 480,
        callbacks: {},
        camera: new THREE.PerspectiveCamera(32, width / 480, 0.1, 100),
        selection: { value: selected },
        boxes,
        openingIndex: selected,
        inspectPose: { value: 0 },
        inspectAngle: 0,
        lastTime: 0,
        rafTimes: [],
        shelf: new THREE.Group(),
        console: new THREE.Group(),
        ready: true,
        shadowPose: {},
        renderer: { shadowMap: {}, render: () => {} },
        request: () => {},
      });
      for (let frame = 0; frame <= 400; frame++) {
        scene.progress.value = frame / 200;
        scene.render(frame * 16.7);
        const bounds = boxes.map((b) =>
          new THREE.Box3().setFromObject(b.group),
        );
        for (let i = 1; i < 6; i++)
          assert.ok(
            !bounds[i].intersectsBox(bounds[i - 1]),
            "intersection " +
              JSON.stringify({ width, selected, p: scene.progress.value, i }),
          );
      }
    }
  geometry.dispose();
  material.dispose();
});
