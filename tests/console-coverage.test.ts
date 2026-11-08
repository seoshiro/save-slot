import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import * as THREE from "three";
const source = readFileSync(
  new URL("../src/scene.ts", import.meta.url),
  "utf8",
);
const method = source.slice(
  source.indexOf("  private renderTransitionScene("),
  source.indexOf("  dispose()"),
);
const window = { innerWidth: 800, innerHeight: 600 };
const Harness = new Function(
  "THREE",
  "window",
  stripTypeScriptTypes("class Harness {" + method + "}") + ";return Harness;",
)(THREE, window);
test("composite renders absent/present opaque scenes and restores visibility/target", () => {
  const group = new THREE.Group();
  const scene = new THREE.Scene();
  scene.add(group);
  const renders: boolean[] = [];
  let target: any = null;
  const h = Object.assign(new Harness(), {
    scene,
    camera: new THREE.Camera(),
    renderer: {
      shadowMap: {},
      extensions: { has: () => true },
      getPixelRatio: () => 1,
      getContext: () => ({
        getInternalformatParameter: () => new Int32Array([4, 2]),
      }),
      getDrawingBufferSize: (v: any) => v.set(800, 600),
      getRenderTarget: () => target,
      setRenderTarget: (v: any) => {
        target = v;
      },
      render: (s: any) => {
        if (s === scene) renders.push(group.visible);
      },
    },
  });
  h.renderTransitionScene(group, 0.3);
  assert.deepEqual(renders, [false, true]);
  assert.equal(group.visible, true);
  assert.equal(target, null);
  assert.equal(h.fadeComposite.quad.material.uniforms.opacity.value, 0.3);
  assert.equal(h.fadeComposite.absent.width, 800);
  const resource = h.fadeComposite;
  h.renderTransitionScene(group, 0.8);
  assert.equal(h.fadeComposite, resource);
  renders.length = 0;
  h.renderTransitionScene(null, 1);
  assert.deepEqual(renders, [true]);
});
test("no spatial dissolve or per-surface alpha fade remains; composite is disposed", () => {
  assert.doesNotMatch(source, /coverageThreshold|boxOpacity|revealOpacity/);
  assert.match(source, /fadeComposite.absent.dispose/);
  assert.match(source, /fadeComposite.present.dispose/);
  assert.match(source, /isXRRenderTarget = true/);
  assert.doesNotMatch(source, /HalfFloatType|#include <tonemapping_fragment>/);
  assert.match(source, /#include <colorspace_fragment>/);
});
