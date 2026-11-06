import { chromium } from "@playwright/test";
import fs from "node:fs";
const url = process.env.TEST_URL || "http://127.0.0.1:4197/";
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: "chrome" }),
  headless: true,
  args: [
    "--no-sandbox",
    ...(process.env.SOFTWARE_WEBGL === "1" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []),
  ],
});
const report = {
  url,
  at: new Date().toISOString(),
  browser: browser.version(),
  environment:
    `${process.platform} Chromium; emulated viewport, not a physical phone`,
  checks: [],
  errors: [],
  layouts: [],
  cold: [],
};
const ok = (v, n) => {
  if (!v) throw Error(n);
  report.checks.push(n);
};
fs.mkdirSync("evidence/final", { recursive: true });
try {
  if (process.env.COLD_ONLY !== "1")
    for (const [width, height] of [
      [1440, 1000],
      [1366, 768],
      [1024, 768],
      [390, 844],
      [375, 667],
    ])
      for (const lang of ["en", "ru"]) {
        const ctx = await browser.newContext({
          viewport: { width, height },
          isMobile: width < 700,
          hasTouch: width < 700,
        });
        const p = await ctx.newPage();
        p.on("pageerror", (e) => report.errors.push(e.message));
        await p.addInitScript(() => {
          const orig = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (t, ...a) {
            return /webgl/.test(t) ? null : orig.call(this, t, ...a);
          };
        });
        await p.goto(url);
        await p
          .getByRole("button", { name: lang.toUpperCase(), exact: true })
          .click();
        const id = `${width}x${height}-${lang}`;
        const check = async (stage) => {
          const n = await p.locator(".fallback-notice").boundingBox(),
            s = await p.locator(".scene-stage").boundingBox(),
            g = (await p.locator(".game-region").count())
              ? await p.locator(".game-region").boundingBox()
              : null;
          ok(n && s, `${id}-${stage}: status visible`);
          ok(n.y >= s.y + s.height + 8, `${id}-${stage}: separate status row`);
          ok(
            n.x >= -1 && n.x + n.width <= width + 1,
            `${id}-${stage}: status in viewport`,
          );
          if (g) {
            ok(n.y >= g.y + g.height + 8, `${id}-${stage}: no frame overlap`);
            ok(
              g.y >= s.y - 1 && g.y + g.height <= s.y + s.height + 1,
              `${id}-${stage}: game inside stage`,
            );
          }
          report.layouts.push({ id, stage, status: n, visual: s, game: g });
          await p.screenshot({ path: `evidence/final/${id}-${stage}.png` });
        };
        await check("shelf");
        await p
          .getByRole("button", { name: "MOSS SIGNAL", exact: true })
          .last()
          .click();
        await p.locator("[data-open-box]").click();
        await p.locator(".world-info.arrived").waitFor();
        await p.waitForTimeout(600);
        await check("open");
        await p.locator(".insert-button").click();
        await p.locator(".game-region").waitFor();
        await p.waitForTimeout(850);
        await check("play");
        await p.keyboard.press("Escape");
        await p.waitForTimeout(150);
        await check("pause");
        await p.keyboard.press("Escape");
        await p.locator(".game-actions .secondary").nth(1).click();
        await p.waitForTimeout(300);
        await check("large");
        await p.locator(".game-actions .secondary").nth(1).click();
        await p.locator(".backbar .back").click();
        await p.waitForTimeout(1800);
        await check("return");
        ok(
          await p.locator("[data-open-box]").isVisible(),
          `${id}: shelf controls restored`,
        );
        await ctx.close();
      }
  for (const fail of process.env.SKIP_COLD === '1' ? [] : [false, true]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 250,
      downloadThroughput: 128000,
      uploadThroughput: 64000,
      connectionType: "cellular3g",
    });
    let release;
    const gate = new Promise((r) => (release = r));
    await p.route("**/*-cover.webp", async (route) => {
      await gate;
      if (fail && route.request().url().includes("moss-cover"))
        await route.abort();
      else await route.continue();
    });
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await p
      .locator('.scene[data-cover-pending="6"]')
      .waitFor({ timeout: 30000 });
    ok(
      (await p.locator(".scene canvas").count()) === 1,
      "cold: real WebGL scene mounted",
    );
    const gpu = await p.locator(".scene canvas").evaluate((c) => {
      const gl = c.getContext("webgl2");
      if (!gl) return null;
      const d = gl.getExtension("WEBGL_debug_renderer_info");
      return d
        ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.VERSION);
    });
    ok(gpu, "cold: WebGL context confirmed");
    for (let i = 0; i < 4; i++) {
      await p.screenshot({
        path: `evidence/final/cold-${fail ? "error" : "load"}-${i}.png`,
      });
      await p.waitForTimeout(200);
    }
    await p.getByRole("button", { name: "RU", exact: true }).click();
    await p.locator(".browse .square").last().click();
    ok(
      (await p
        .locator('.languages button[aria-pressed="true"]')
        .innerText()) === "RU",
      "cold: language remains interactive",
    );
    await p.screenshot({
      path: `evidence/final/cold-${fail ? "error" : "load"}-interactive.png`,
    });
    release();
    await p
      .locator('.scene[data-cover-pending="0"]')
      .waitFor({ timeout: 60000 });
    const state = await p.locator(".scene").evaluate((e) => ({ ...e.dataset }));
    ok(
      state.coversReady === (fail ? "5" : "6"),
      "cold: correct completed texture count",
    );
    ok(
      state.coverErrors === (fail ? "1" : "0"),
      "cold: failure retains paper cover",
    );
    report.cold.push({
      fail,
      state,
      gpu,
      cache: false,
      latencyMs: 250,
      downloadBytesPerSecond: 128000,
    });
    await p.screenshot({
      path: `evidence/final/cold-${fail ? "error" : "load"}-ready.png`,
    });
    await ctx.close();
  }
  ok(report.errors.length === 0, "no captured page errors");
} catch (e) {
  report.failure = e.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync(
    `evidence/final/${process.env.COLD_ONLY === "1" ? "cold-qa" : "release-polish-qa"}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      checks: report.checks.length,
      failure: report.failure,
      cold: report.cold,
      errors: report.errors,
    }),
  );
}
