import { chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
const url = process.env.TEST_URL || "http://localhost:4197/";
const mobile = process.env.MOBILE === "1";
const light = process.env.LIGHT === "1";
const stem = (mobile ? "mobile" : "desktop") + (light ? "-fallback" : "");
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({
  viewport: mobile
    ? { width: 390, height: 844 }
    : { width: 1440, height: 1000 },
  recordVideo: {
    dir: "evidence/recordings",
    size: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
  },
});
const p = await ctx.newPage();
const video = p.video();
try {
  await p.addInitScript(() => {
    window.__qa = { frames: [], tasks: [] };
    let prev = 0;
    function f(t) {
      if (prev) window.__qa.frames.push(t - prev);
      prev = t;
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
    new PerformanceObserver((l) =>
      window.__qa.tasks.push(...l.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask", buffered: true });
  });
  await p.goto(url + (light ? "?webgl=0" : ""));
  await p
    .getByRole("button", { name: "MOSS SIGNAL", exact: true })
    .last()
    .click();
  await p.waitForTimeout(800);
  await p.screenshot({
    path: "evidence/" + stem + "-shelf.png",
    fullPage: !mobile,
  });
  const gpu = light
    ? "Canvas2D fallback; no WebGL"
    : await p.locator(".scene canvas").evaluate((c) => {
        const gl = c.getContext("webgl2");
        const d = gl.getExtension("WEBGL_debug_renderer_info");
        return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "Not exposed";
      });
  await p.getByRole("button", { name: /OPEN BOX/ }).click();
  await p
    .getByRole("button", { name: "INSERT & START", exact: true })
    .waitFor({ state: "visible" });
  await p.waitForTimeout(1900);
  await p.screenshot({
    path: "evidence/" + stem + "-open.png",
    fullPage: !mobile,
  });
  await p.getByRole("button", { name: "INSERT & START", exact: true }).click();
  await p.waitForTimeout(900);
  const move = async (key, ms) => {
    await p.keyboard.down(key);
    await p.waitForTimeout(ms);
    await p.keyboard.up(key);
    await p.waitForTimeout(120);
  };
  if (!mobile) {
    await move("ArrowUp", 4590);
    await p.keyboard.press("e");
    await p.waitForTimeout(180);
    console.log("first", await p.locator(".game-stat").innerText());
    await move("ArrowRight", 7090);
    await p.keyboard.press("e");
    await p.waitForTimeout(180);
    console.log("second", await p.locator(".game-stat").innerText());
    await move("ArrowDown", 4170);
    await p.keyboard.press("e");
    await p.waitForTimeout(180);
    console.log("third", await p.locator(".game-stat").innerText());
    await move("ArrowLeft", 1250);
    await move("ArrowUp", 4590);
    await move("ArrowLeft", 2090);
    await move("ArrowUp", 430);
    await p.waitForTimeout(800);
    console.log(
      "progress",
      await p.evaluate(() => sessionStorage.getItem("save-slot:moss:v1")),
    );
    await p.screenshot({
      path: "evidence/" + stem + "-complete.png",
      fullPage: true,
    });
    if (
      !(await p
        .getByRole("heading", { name: "SIGNAL RESTORED", exact: true })
        .isVisible())
    )
      throw Error(
        "Real keyboard play did not finish; inspect recording and saved coordinates",
      );
    await p
      .getByRole("button", { name: "Start again", exact: true })
      .first()
      .click();
    await p.getByRole("button", { name: "Restart", exact: true }).click();
    await p.waitForTimeout(500);
    if (!(await p.locator(".game-stat").innerText()).includes("0"))
      throw Error("Restart did not clear progress");
  } else {
    await p
      .getByRole("button", { name: "Larger game screen", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Move up", exact: true })
      .scrollIntoViewIfNeeded();
    const pad = p.getByRole("button", { name: "Move up", exact: true });
    const rect = await pad.boundingBox();
    await p.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await p.mouse.down();
    await p.waitForTimeout(900);
    await p.mouse.up();
    await p.getByRole("button", { name: "Pause", exact: true }).click();
    await p.waitForTimeout(1000);
    // A full-page capture temporarily resizes Chrome and pollutes its video with grey padding.
    await p.screenshot({ path: "evidence/mobile-play.png", fullPage: false });
    await p
      .getByRole("button", { name: "Resume", exact: true })
      .first()
      .click();
    await p
      .getByRole("button", { name: "Return to console", exact: true })
      .click();
  }
  await p
    .getByRole("button", { name: /Back to shelf/ })
    .first()
    .click();
  await p.waitForTimeout(1800);
  await p.getByRole("button", { name: "Next world", exact: true }).click();
  await p.waitForTimeout(700);
  const metrics = await p.evaluate(() => {
    const a = window.__qa.frames.sort((a, b) => a - b);
    return {
      rafSamples: a.length,
      rafMedianMs: a[Math.floor(a.length * 0.5)],
      rafP95Ms: a[Math.floor(a.length * 0.95)],
      longTasks: window.__qa.tasks,
      resources: performance
        .getEntriesByType("resource")
        .filter((e) => e.name.endsWith(".glb"))
        .map((e) => ({
          url: e.name,
          transferBytes: e.transferSize,
          durationMs: e.duration,
        })),
      navigation: performance.getEntriesByType("navigation").map((e) => ({
        domContentLoaded: e.domContentLoadedEventEnd,
        load: e.loadEventEnd,
      })),
    };
  });
  const report = {
    url,
    at: new Date().toISOString(),
    browser: await b.version(),
    os: os.type() + " " + os.release(),
    cpu: os.cpus()[0].model,
    ramGB: Math.round(os.totalmem() / 1024 ** 3),
    gpu,
    viewport: mobile ? "390x844" : "1440x1000",
    headless: true,
    physicalPhone: false,
    metrics,
    note: "RAF timings measure callback delivery, not complete GPU presentation. Read together with the uncut browser recording; no all-device smoothness claim.",
  };
  fs.writeFileSync(
    "evidence/" + stem + "-performance.json",
    JSON.stringify(report, null, 2),
  );
} finally {
  await ctx.close();
  await video.saveAs("evidence/" + stem + "-full-scenario.webm");
  await b.close();
}
