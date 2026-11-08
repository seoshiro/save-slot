import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { freshGame } from "../src/game.ts";

const url = process.env.TEST_URL || "http://127.0.0.1:4201/";
const dir = process.env.EVIDENCE_DIR || "evidence/six-game-audit/action-input";
await fs.mkdir(dir, { recursive: true });
const report = {
  url,
  method:
    "Focused input contract, not a playthrough: valid saved-game fixtures put Moss beside beacon 1 and give Orbit initial vx=1. Browser mouse/keyboard and trusted CDP touch events drive the app at real time. Orbit vx / exp(-0.45 * elapsed) distinguishes one brake (0.15) from a duplicate (0.0225).",
  cases: [],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const cases = [
  "single-touch",
  "multi-touch",
  "mouse",
  "enter",
  "space",
  "key-e",
  "multi-then-enter",
  "multi-then-mouse",
];
async function point(page, selector, id) {
  const r = await page.locator(selector).boundingBox();
  return {
    x: r.x + r.width / 2,
    y: r.y + r.height / 2,
    id,
    radiusX: 4,
    radiusY: 4,
    force: 1,
  };
}
async function multi(page, cdp) {
  const direction = await point(page, ".pad-arrowup", 1);
  const action = await point(page, ".activate", 2);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [direction],
  });
  await page.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [direction, action],
  });
  await page.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [direction],
  });
  await page.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}
try {
  for (const mode of [...cases, "moss-multi-touch"]) {
    const id = mode === "moss-multi-touch" ? "moss-signal" : "orbit-zero";
    const fixture = freshGame(id);
    if (id === "moss-signal") Object.assign(fixture, { x: 5.5, y: 5.9 });
    else fixture.vx = 1;
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const row = { mode, game: id };
    report.cases.push(row);
    try {
      await page.addInitScript((fixture) => {
        localStorage.setItem("save-slot:lang", "en");
        sessionStorage.setItem(
          `save-slot:${fixture.id}:v2`,
          JSON.stringify(fixture),
        );
        window.__actionEvents = [];
        for (const type of [
          "pointerdown",
          "pointerup",
          "pointercancel",
          "click",
        ]) {
          addEventListener(
            type,
            (e) => {
              if (e.target.closest?.(".activate"))
                window.__actionEvents.push({
                  type,
                  pointerType: e.pointerType,
                  primary: e.isPrimary,
                  trusted: e.isTrusted,
                  detail: e.detail,
                });
            },
            true,
          );
        }
      }, fixture);
      await page.goto(`${url}?webgl=0#${id}`);
      await page
        .locator(".boot-intro")
        .waitFor({ state: "hidden", timeout: 45000 });
      await page.locator('.app[data-settled="1"]').waitFor();
      await page.locator(".insert-button").click();
      await page.locator('.app[data-settled="2"]').waitFor();
      await page.waitForTimeout(1100);
      const cdp = await context.newCDPSession(page);
      const action = page.locator(".activate");
      if (mode.includes("multi")) await multi(page, cdp);
      if (mode === "single-touch") await action.tap();
      if (mode === "mouse" || mode === "multi-then-mouse") await action.click();
      if (mode === "enter" || mode === "multi-then-enter") {
        await action.focus();
        await page.keyboard.press("Enter");
      }
      if (mode === "space") {
        await action.focus();
        await page.keyboard.press("Space");
      }
      if (mode === "key-e") {
        await page.locator(".game-region").focus();
        await page.keyboard.press("e");
      }
      await page.locator(".game-actions .secondary").first().click();
      await page.locator(".game-overlay").waitFor();
      row.saved = await page.evaluate(
        (id) => JSON.parse(sessionStorage.getItem(`save-slot:${id}:v2`)),
        id,
      );
      row.events = await page.evaluate(() => window.__actionEvents);
      if (mode.includes("multi"))
        assert.ok(
          row.events.some(
            (e) =>
              e.type === "pointerdown" &&
              e.pointerType === "touch" &&
              e.primary === false &&
              e.trusted,
          ),
          "The action receives a trusted secondary touch",
        );
      if (id === "moss-signal")
        assert.deepEqual(
          row.saved.beacons,
          [true, false, false],
          "Moss activates while the direction is held by the first finger",
        );
      else {
        row.normalizedVelocity =
          row.saved.vx / Math.exp(-0.45 * row.saved.elapsed);
        row.expectedActivations = mode.startsWith("multi-then") ? 2 : 1;
        const expected = Math.pow(0.15, row.expectedActivations);
        assert.ok(
          Math.abs(row.normalizedVelocity - expected) < 0.000001,
          `${mode}: expected ${expected}, got ${row.normalizedVelocity}; no duplicate or lost action`,
        );
        assert.equal(
          row.saved.setbacks,
          0,
          "No hazard/reset contaminated the brake measurement",
        );
      }
      assert.deepEqual(errors, []);
      row.status = "passed";
    } catch (e) {
      row.status = "failed";
      row.failure = String(e.stack || e);
      await page
        .screenshot({ path: `${dir}/${mode}-failure.png` })
        .catch(() => {});
    } finally {
      await context.close();
      await fs.writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
    }
    console.log(mode, row.status, row.failure || "");
  }
} finally {
  await browser.close();
  await fs.writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
}
if (report.cases.some((r) => r.status === "failed")) process.exitCode = 1;
