import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const dir = "evidence/composition-review/scene-bounds";
await fs.mkdir(dir, { recursive: true });
const report = [];
try {
  await page.goto("http://127.0.0.1:4198/");
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const { SaveScene } = await import("/src/scene.ts");
    const THREE = await import("/node_modules/.vite/deps/three.js");
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;background:#f3ecd9";
    const host = document.createElement("div");
    host.style.cssText = "width:100vw;height:100vh";
    document.body.append(host);
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 500;
    const c = canvas.getContext("2d");
    c.fillStyle = "#123c42";
    c.fillRect(0, 0, 700, 500);
    c.fillStyle = "#f4e9ac";
    c.font = "40px monospace";
    c.fillText("SAVE SLOT", 230, 250);
    window.qaScene = new SaveScene(
      host,
      {
        select: () => {},
        settled: () => {},
        ready: () => {},
        error: console.error,
        screenRect: (...r) => (window.qaScreen = r),
      },
      canvas,
    );
    window.qaTHREE = THREE;
  });
  await page.waitForFunction(
    () =>
      window.qaScene.ready &&
      document.querySelector('[data-resource-ready="true"]'),
    { timeout: 30000 },
  );
  for (const [width, height, viewportWidth = width] of [
    [924, 530, 1366],
    [680, 360, 1024],
    [1100, 360, 1536],
    [339, 300, 375],
    [354, 315, 390],
  ]) {
    await page.setViewportSize({ width: viewportWidth, height });
    await page.evaluate(
      ({ width, height }) => {
        window.qaScene.el.style.cssText = `width:${width}px;height:${height}px`;
      },
      { width, height },
    );
    await page.waitForFunction(
      ({ width, height }) =>
        window.qaScene.width === width && window.qaScene.height === height,
      { width, height },
    );
    for (const selected of [0, 1, 5])
      for (const p of [
        0, 0.24, 0.4, 0.52, 0.64, 0.7, 0.85, 1, 1.1, 1.3, 1.42, 1.5, 1.7, 2,
      ]) {
        const result = await page.evaluate(
          ({ p, selected, width, height, viewportWidth }) => {
            const t = Math.max(0, Math.min(1, (p - 0.18) / (0.72 - 0.18)));
            const compose = t * t * (3 - 2 * t);
            const hostWidth =
              viewportWidth < 700
                ? width
                : viewportWidth + (width - viewportWidth) * compose;
            window.qaScene.el.style.width = hostWidth + "px";
            window.qaScene.el.style.height =
              320 + (height - 320) * compose + "px";
            window.qaScene.resize();
            const s = window.qaScene;
            s.progress.value = p;
            s.selection.value = selected;
            s.selected = selected;
            s.openingIndex = selected;
            s.setGame(p === 2, p === 2);
            s.render(performance.now());
            const THREE = window.qaTHREE;
            const bounds = (o) => {
              o.updateWorldMatrix(true, true);
              const b = new THREE.Box3().setFromObject(o),
                points = [];
              for (const x of [b.min.x, b.max.x])
                for (const y of [b.min.y, b.max.y])
                  for (const z of [b.min.z, b.max.z])
                    points.push(new THREE.Vector3(x, y, z).project(s.camera));
              return {
                left: Math.min(...points.map((v) => v.x)),
                right: Math.max(...points.map((v) => v.x)),
                top: Math.max(...points.map((v) => v.y)),
                bottom: Math.min(...points.map((v) => v.y)),
              };
            };
            return {
              p,
              screen: window.qaScreen,
              console: bounds(s.console),
              neighbors: s.boxes.filter(
                (b, i) => i !== selected && b.group.visible,
              ).length,
              boxVisible: s.boxes[selected].group.visible,
              box: bounds(s.boxes[selected].group),
              cart: bounds(s.boxes[selected].cart),
            };
          },
          { p, selected, width, height, viewportWidth },
        );
        if (selected === 5 && [0, 1, 2].includes(p))
          await page.screenshot({
            path: `${dir}/${width}x${height}-stage${p}.png`,
          });
        report.push({ width, height, viewportWidth, selected, ...result });
        for (const b of [
          ...(result.boxVisible ? [result.box] : []),
          ...(p >= 0.4 ? [result.console] : []),
          ...(p >= 0.66 ? [result.cart] : []),
        ])
          assert.ok(
            b.left >= -1 && b.right <= 1 && b.bottom >= -1 && b.top <= 1,
            JSON.stringify({ width, height, selected, ...result }),
          );
        if (p >= 0.85)
          for (const b of [
            ...(result.boxVisible ? [result.box] : []),
            result.cart,
            result.console,
          ])
            assert.ok(
              b.left >= -1 && b.right <= 1 && b.bottom >= -1 && b.top <= 1,
              JSON.stringify({ width, height, ...result }),
            );
        if (p >= 0.24) assert.equal(result.neighbors, 0);
        if (p === 2) {
          assert.equal(result.boxVisible, false);
          if (viewportWidth < 700)
            assert.ok(
              result.screen[3] >= 125,
              `Mobile game field too small: ${result.screen[3]}`,
            );
          const [x, y, w, h] = result.screen;
          assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height);
        }
      }
  }
} finally {
  await fs.writeFile(dir + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    `Validated ${report.length} full-model compositions; report: ${dir}/report.json`,
  );
}
