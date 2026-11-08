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
          0.519999,
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
test("latest stage cancels prior completion and uses remaining-distance durations", () => {
  const method = source.slice(
    source.indexOf("  setStage(stage: number)"),
    source.indexOf("  warmConsole()"),
  );
  let tweens: any[] = [];
  const gsap = {
    killTweensOf: () => {},
    isTweening: () => false,
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
  assert.equal(tweens[0].duration, 1.65);
  scene.progress.value = 0.6;
  scene.setStage(0);
  tweens[0].onComplete();
  assert.deepEqual(settled, []);
  tweens[1].onComplete();
  assert.deepEqual(settled, [0]);
  assert.ok(Math.abs(tweens[1].duration - 0.99) < 1e-9);
  scene.progress.value = 1;
  scene.setStage(2);
  assert.ok(Math.abs(tweens[2].duration - 1.05) < 1e-9);
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

test("shelf projection keeps all desktop endpoints and mobile selection inside with visible gaps", () => {
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
  for (const [width, height] of [
    [1366, 310],
    [1536, 350],
    [375, 250],
    [390, 300],
  ]) {
    for (let n = 0; n <= 100; n++) {
      const selected = n / 20;
      const boxes = Array.from({ length: 6 }, () => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry));
        return { group, flap: new THREE.Group(), cart: new THREE.Group() };
      });
      const scene = Object.assign(Object.create(Harness.prototype), {
        dead: false,
        progress: { value: 0 },
        width,
        height,
        callbacks: {},
        camera: new THREE.PerspectiveCamera(32, width / height, 0.1, 100),
        selection: { value: selected },
        boxes,
        openingIndex: Math.round(selected),
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
      scene.render(0);
      const bounds = boxes.map(({ group }) => {
        group.updateMatrixWorld();
        const points = [];
        for (const x of [-0.8, 0.8])
          for (const y of [-1.36, 1.36])
            for (const z of [-0.24, 0.24])
              points.push(
                group
                  .localToWorld(new THREE.Vector3(x, y, z))
                  .project(scene.camera),
              );
        return {
          points,
          left: Math.min(...points.map((v) => v.x)),
          right: Math.max(...points.map((v) => v.x)),
          top: Math.max(...points.map((v) => v.y)),
          bottom: Math.min(...points.map((v) => v.y)),
        };
      });
      for (const [i, b] of bounds.entries()) {
        if (width >= 700 || i === Math.round(selected))
          assert.ok(
            b.left >= -1 && b.right <= 1 && b.top <= 1 && b.bottom >= -1,
            JSON.stringify({ width, height, selected, i, b }),
          );
        if (i > 0 && b.right > -1 && bounds[i - 1].left < 1) {
          const a = bounds[i - 1].points,
            c = b.points;
          const axes = [new THREE.Vector2(1, 0)];
          for (const points of [a, c])
            for (const u of points)
              for (const v of points)
                if (u !== v)
                  axes.push(
                    new THREE.Vector2(-(v.y - u.y), v.x - u.x).normalize(),
                  );
          const separated = axes.some((axis) => {
            const ap = a.map((v) => v.x * axis.x + v.y * axis.y),
              cp = c.map((v) => v.x * axis.x + v.y * axis.y);
            return (
              Math.max(...ap) < Math.min(...cp) - 0.002 ||
              Math.max(...cp) < Math.min(...ap) - 0.002
            );
          });
          assert.ok(
            separated,
            "projected silhouettes overlap " +
              JSON.stringify({ width, height, selected, i }),
          );
        }
      }
    }
  }
  geometry.dispose();
});

test("repeated stage intent does not restart the active timeline", () => {
  const method = source.slice(
    source.indexOf("  setStage(stage: number)"),
    source.indexOf("  warmConsole()"),
  );
  let writes = 0,
    kills = 0;
  const gsap = {
    isTweening: () => true,
    killTweensOf: () => kills++,
    to: () => writes++,
  };
  const Harness = new Function(
    "clamp",
    "gsap",
    js("class Harness {" + method + "}") + ";return Harness;",
  )(clamp, gsap);
  const scene = Object.assign(Object.create(Harness.prototype), {
    target: 1,
    progress: { value: 0.47 },
    transitionId: 7,
  });
  scene.setStage(1);
  assert.equal(writes, 0);
  assert.equal(kills, 0);
  assert.equal(scene.progress.value, 0.47);
  assert.equal(scene.transitionId, 7);
});

test("opening during fractional shelf selection waits for its existing motion", () => {
  const method = source.slice(
    source.indexOf("  setStage(stage: number)"),
    source.indexOf("  warmConsole()"),
  );
  const progress = { value: 0 },
    selection = { value: 3.4 };
  let moving = true;
  const tweens: any[] = [];
  const gsap = {
    killTweensOf: () => {},
    isTweening: (target: unknown) => target === selection && moving,
    to: (_: unknown, config: any) => tweens.push(config),
  };
  const Harness = new Function(
    "clamp",
    "gsap",
    js("class Harness {" + method + "}") + "; return Harness;",
  )(clamp, gsap);
  const scene = Object.assign(Object.create(Harness.prototype), {
    progress,
    selection,
    selected: 0,
    target: 0,
    ready: true,
    dead: false,
    transitionId: 0,
    callbacks: {},
    request: () => {},
  });
  scene.setStage(1);
  assert.equal(tweens.length, 0);
  assert.equal(selection.value, 3.4);
  assert.equal(scene.target, 1);
  selection.value = 0;
  moving = false;
  scene.setStage(scene.target);
  assert.equal(tweens.length, 1);
  assert.equal(tweens[0].value, 1);
  assert.match(
    source.slice(
      source.indexOf("  setSelected(i: number)"),
      source.indexOf("  setStage(stage: number)"),
    ),
    /onComplete:[\s\S]*this.setStage\(this.target\)/,
  );
});
