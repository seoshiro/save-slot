import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const url = process.env.TEST_URL || "http://127.0.0.1:4201/";
const dir =
  process.env.EVIDENCE_DIR || "evidence/six-game-audit/enlarged-handoff";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const cases = [
  {
    label: "unwrapped-fallback-en",
    width: 1366,
    height: 768,
    light: true,
    unwrapped: true,
  },
  { label: "desktop-webgl-en", width: 1366, height: 768 },
  {
    label: "small-fallback-ru",
    width: 375,
    height: 667,
    light: true,
    lang: "ru",
  },
  {
    label: "reduced-fallback-ru",
    width: 1366,
    height: 600,
    light: true,
    lang: "ru",
    reduced: true,
  },
  {
    label: "unsupported-fallback-en",
    width: 1366,
    height: 768,
    light: true,
    unsupported: true,
  },
];
const report = [];
const settled = (page, n) =>
  page.locator(`.app[data-settled="${n}"]`).waitFor({ timeout: 45000 });
const idle = (page) =>
  page.waitForFunction(() => window.__handoffs.every((h) => h.finished));
const rect = (page, selector) =>
  page.locator(selector).evaluate((el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return { x, y, width, height };
  });
const pointer = async (page, selector) => {
  const point = await page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect(),
      x = r.x + r.width / 2,
      y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, hit: hit === el || el.contains(hit) };
  });
  assert.ok(
    point.hit,
    `${selector}: transition snapshot does not intercept the pointer`,
  );
  await page.mouse.click(point.x, point.y);
};
try {
  for (const c of cases.filter(
    (c) => !process.env.CASES || process.env.CASES.split(",").includes(c.label),
  )) {
    const row = { ...c, checks: [] };
    report.push(row);
    const context = await browser.newContext({
      viewport: { width: c.width, height: c.height },
      hasTouch: c.width < 701,
      reducedMotion: c.reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((c) => {
      localStorage.setItem("save-slot:lang", c.lang || "en");
      localStorage.setItem("save-slot:selected", "1");
      window.__handoffs = [];
      window.__rejections = [];
      addEventListener("unhandledrejection", (e) =>
        window.__rejections.push(String(e.reason)),
      );
      if (c.unwrapped) return;
      if (c.unsupported) {
        document.startViewTransition = undefined;
      } else {
        const start = document.startViewTransition.bind(document);
        document.startViewTransition = (...args) => {
          const h = {
            started: performance.now(),
            ready: false,
            finished: false,
          };
          window.__handoffs.push(h);
          const t = start(...args);
          t.ready
            .then(() => {
              h.ready = true;
              h.readyAt = performance.now();
            })
            .catch(() => {});
          t.finished
            .then(() => {
              h.finished = true;
              h.finishedAt = performance.now();
            })
            .catch(() => {
              h.finished = true;
            });
          return t;
        };
      }
    }, c);
    try {
      await page.goto(url + (c.light ? "?webgl=0" : ""));
      await page
        .locator(".boot-intro")
        .waitFor({ state: "hidden", timeout: 45000 });
      await page.locator("[data-open-box]").click();
      await settled(page, 1);
      await page.locator(".insert-button").click();
      await settled(page, 2);
      await page.waitForTimeout(150);
      row.normal = await rect(page, ".scene-wrap");
      await page.evaluate(() => {
        window.__originalGameCanvas = document.querySelector(
          ".game-region canvas",
        );
        window.__originalSceneCanvas = document.querySelector(".scene canvas");
      });
      const toggle = page.locator(".game-actions .secondary").nth(1);
      await toggle.click();
      await page.locator(".app.large-mode").waitFor();
      if (!c.reduced && !c.unsupported && !c.unwrapped) {
        await page.waitForFunction(() => window.__handoffs.at(-1).ready);
        row.transitionActive = await page.evaluate(
          () => !window.__handoffs.at(-1).finished,
        );
        assert.ok(
          row.transitionActive,
          "The visual transition has an observable intermediate phase",
        );
        if (c.width > 700) {
          await pointer(page, ".game-actions .secondary:first-child");
          assert.equal(
            await page.locator(".game-overlay").count(),
            1,
            "Pause responds during the crossfade",
          );
          row.checks.push(
            "Live Pause receives pointer input during the transition",
          );
        }
        await page.screenshot({ path: `${dir}/${c.label}-handoff.png` });
      }
      await idle(page);
      row.large = await rect(page, ".game-region");
      if (c.width === 1366 && c.height === 768)
        assert.deepEqual(
          row.large,
          { x: 34, y: 156, width: 904, height: 522 },
          "Accepted enlarged endpoint is unchanged",
        );
      assert.equal(
        await page.evaluate(
          () =>
            window.__originalGameCanvas ===
            document.querySelector(".game-region canvas"),
        ),
        true,
      );
      row.checks.push(
        "Existing live game canvas retained; enlarged endpoint unchanged",
      );
      if (await page.locator(".game-overlay").count())
        await page.locator(".game-actions .secondary").first().click();
      await toggle.click();
      await page.locator(".app:not(.large-mode)").waitFor();
      await idle(page);
      row.returned = await rect(page, ".scene-wrap");
      assert.deepEqual(
        row.returned,
        row.normal,
        "Regular composition endpoint is unchanged",
      );
      row.checks.push("Shrink returns to the exact normal-stage rectangle");
      await toggle.evaluate((el) => {
        el.click();
        el.click();
        el.click();
      });
      await page.locator(".app.large-mode").waitFor();
      await idle(page);
      row.checks.push("Rapid enlarge/shrink/enlarge preserves latest intent");
      await page.evaluate(() => {
        document.querySelector(".game-actions .secondary:nth-child(2)").click();
        document.querySelector(".game-actions .secondary:nth-child(2)").click();
        document.querySelector(".backbar .back").click();
      });
      await settled(page, 0);
      await page.waitForTimeout(350);
      assert.equal(await page.locator(".app.large-mode").count(), 0);
      assert.equal(await page.locator('.app[data-stage="shelf"]').count(), 1);
      assert.equal(await page.evaluate(() => scrollY), 0);
      row.checks.push(
        "Back cancels pending rapid changes without reopening or stale large state",
      );
      await page.locator("[data-open-box]").click();
      await settled(page, 1);
      await page.locator(".insert-button").click();
      await settled(page, 2);
      await toggle.click();
      await page.locator(".app.large-mode").waitFor();
      if (!c.reduced && !c.unsupported && !c.unwrapped)
        await page.waitForFunction(() => window.__handoffs.at(-1).ready);
      await pointer(page, ".backbar .back");
      await settled(page, 0);
      await idle(page);
      assert.equal(await page.locator(".app.large-mode").count(), 0);
      assert.equal(
        await page.evaluate(
          () =>
            window.__originalSceneCanvas ===
            document.querySelector(".scene canvas"),
        ),
        true,
      );
      row.checks.push(
        "Direct pointer Back works during handoff; persistent scene retained",
      );
      if (c.unwrapped) await page.waitForTimeout(350);
      row.transitions = await page.evaluate(() => window.__handoffs);
      if (c.reduced || c.unsupported)
        assert.equal(
          row.transitions.length,
          0,
          "Reduced motion / unsupported API uses immediate path",
        );
      assert.deepEqual(await page.evaluate(() => window.__rejections), []);
      assert.deepEqual(errors, []);
      row.checks.push(
        "No page errors or unhandled transition cancellation rejections",
      );
      row.status = "passed";
    } catch (e) {
      row.status = "failed";
      row.failure = String(e.stack || e);
      await page
        .screenshot({ path: `${dir}/${c.label}-failure.png`, fullPage: true })
        .catch(() => {});
    } finally {
      await context.close();
      await fs.writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
    }
    console.log(c.label, row.status, row.failure || "");
  }
} finally {
  await browser.close();
  await fs.writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
}
if (report.some((r) => r.status === "failed")) process.exitCode = 1;
