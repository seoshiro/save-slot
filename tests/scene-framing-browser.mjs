import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const dir = "evidence/six-games/scene-framing";
await fs.mkdir(dir, { recursive: true });
const report = [];
try {
  await page.goto("http://127.0.0.1:4198/");
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
  for (const [width, height] of [
    [1366, 310],
    [1536, 350],
    [375, 250],
    [390, 300],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(
      ({ width, height }) =>
        window.qaScene.width === width && window.qaScene.height === height,
      { width, height },
    );
    for (const p of [0, 1, 2]) {
      const result = await page.evaluate(
        ({ p }) => {
          const s = window.qaScene;
          s.progress.value = p;
          s.selection.value = 5;
          s.selected = 5;
          s.openingIndex = 5;
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
            box: bounds(s.boxes[5].group),
            cart: bounds(s.boxes[5].cart),
          };
        },
        { p },
      );
      await page.screenshot({
        path: `${dir}/${width}x${height}-stage${p}.png`,
      });
      report.push({ width, height, ...result });
      if (p === 1)
        for (const b of [result.box, result.cart])
          assert.ok(
            b.left >= -1 && b.right <= 1 && b.bottom >= -1 && b.top <= 1,
            JSON.stringify({ width, height, ...result }),
          );
      if (p === 2) {
        const [x, y, w, h] = result.screen;
        assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height);
      }
    }
  }
} finally {
  await fs.writeFile(dir + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
