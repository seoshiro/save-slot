import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";

const url = process.env.TEST_URL || "http://127.0.0.1:4201/";
const out = "evidence/six-game-audit/storage";
fs.mkdirSync(out, { recursive: true });
const report = {
  url,
  date: new Date().toISOString(),
  method:
    "Local Canvas2D storage fault injection; real keyboard movement/action and UI cartridge/restart navigation. No game-state or progress seeding. This is not a full-playthrough test.",
  cases: [],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pageOnly =
  "Browser storage is unavailable. Progress lasts while this page stays open.";
const sessionNotice =
  "Each game keeps its own progress in this browser session.";

async function openMoss(page) {
  const target = new URL(url);
  target.searchParams.set("webgl", "0");
  target.hash = "moss-signal";
  await page.goto(target.href);
  await page
    .locator(".boot-intro")
    .waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector(".app")?.dataset.settled === "1",
  );
  await insert(page);
}
async function insert(page) {
  await page.locator(".insert-button").click();
  await page.waitForFunction(
    () => document.querySelector(".app")?.dataset.settled === "2",
  );
}
async function shelf(page) {
  await page.locator(".backbar .back").click();
  await page.waitForFunction(
    () => document.querySelector(".app")?.dataset.settled === "0",
  );
}
async function selectGame(page, name) {
  await page
    .locator(".world-picks")
    .getByRole("button", { name, exact: true })
    .click();
  await page.locator("[data-open-box]").click();
  await page.waitForFunction(
    () => document.querySelector(".app")?.dataset.settled === "1",
  );
  await insert(page);
}
async function earnFirstBeacon(page) {
  await page.locator(".game-region").focus();
  await page.keyboard.down("ArrowUp");
  try {
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(200);
      await page.keyboard.press("e");
      if ((await page.locator(".app").getAttribute("data-count")) === "1")
        return;
    }
    throw new Error("First Moss beacon was not earned through real input");
  } finally {
    await page.keyboard.up("ArrowUp");
  }
}

try {
  const reloadContext = await browser.newContext({
    viewport: { width: 1100, height: 850 },
    reducedMotion: "reduce",
  });
  const reloadPage = await reloadContext.newPage();
  const reloadCase = { failure: "none-live-reload", checks: [], errors: [] };
  report.cases.push(reloadCase);
  reloadPage.on("pageerror", (error) => reloadCase.errors.push(error.message));
  try {
    await openMoss(reloadPage);
    await earnFirstBeacon(reloadPage);
    const readSaved = () =>
      reloadPage.evaluate(() =>
        JSON.parse(sessionStorage.getItem("save-slot:moss-signal:v2")),
      );
    const first = await readSaved();
    await reloadPage.waitForFunction(
      (elapsed) =>
        JSON.parse(sessionStorage.getItem("save-slot:moss-signal:v2")).elapsed >
        elapsed,
      first.elapsed,
    );
    const before = await readSaved();
    await reloadPage.keyboard.down("ArrowRight");
    await reloadPage.waitForTimeout(180);
    assert.deepEqual(
      await readSaved(),
      before,
      "Movement must precede the next periodic save",
    );
    assert.equal(await reloadPage.locator(".game-overlay").count(), 0);
    await reloadPage.reload();
    await reloadPage.keyboard.up("ArrowRight");
    await reloadPage
      .locator(".boot-intro")
      .waitFor({ state: "hidden", timeout: 30000 });
    await reloadPage.waitForFunction(
      () => document.querySelector(".app")?.dataset.settled === "1",
    );
    const after = await readSaved();
    assert.deepEqual(after.beacons, [true, false, false]);
    assert.ok(
      after.x > before.x + 0.1,
      "Reload must retain movement newer than the periodic save",
    );
    assert.equal(after.y, before.y);
    reloadCase.before = before;
    reloadCase.restored = after;
    reloadCase.checks.push(
      "Real first objective and unsaved live movement survive same-tab reload without pausing",
    );
    assert.deepEqual(reloadCase.errors, []);
    reloadCase.passed = true;
  } catch (error) {
    reloadCase.failureMessage = String(error);
    reloadCase.passed = false;
    process.exitCode = 1;
  } finally {
    await reloadContext.close();
  }
  for (const failure of ["blocked-from-load", "write-fails-after-probe"]) {
    const context = await browser.newContext({
      viewport: { width: 1100, height: 850 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const record = { failure, checks: [], errors: [] };
    report.cases.push(record);
    page.on("pageerror", (error) => record.errors.push(error.message));
    if (failure === "blocked-from-load") {
      await page.addInitScript(() => {
        Object.defineProperty(window, "sessionStorage", {
          configurable: true,
          get() {
            throw new DOMException(
              "Storage fault-injection test",
              "SecurityError",
            );
          },
        });
      });
    }
    try {
      await openMoss(page);
      const notice = page.locator(".game-controls > .small-copy");
      if (failure === "write-fails-after-probe") {
        assert.equal(await notice.innerText(), sessionNotice);
        record.checks.push(
          "Initial storage probe succeeds and session notice is visible",
        );
        await page.evaluate(() => {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (
              this === window.sessionStorage &&
              key.startsWith("save-slot:")
            ) {
              throw new DOMException(
                "Storage fault-injection test",
                "QuotaExceededError",
              );
            }
            return original.call(this, key, value);
          };
        });
      }
      await page.waitForFunction(
        (text) =>
          document.querySelector(".game-controls > .small-copy")
            ?.textContent === text,
        pageOnly,
      );
      record.checks.push(
        "Storage failure is honestly described as page-only progress",
      );
      await earnFirstBeacon(page);
      assert.equal(await page.locator(".app").getAttribute("data-count"), "1");
      record.checks.push(
        "First Moss objective earned by actual ArrowUp/E input",
      );
      if (failure === "write-fails-after-probe") {
        const stored = await page.evaluate(() =>
          JSON.parse(sessionStorage.getItem("save-slot:moss-signal:v2")),
        );
        assert.equal(stored.beacons.filter(Boolean).length, 0);
        record.checks.push(
          "Persisted state is stale while in-memory objective count is one",
        );
      }
      await shelf(page);
      await selectGame(page, "ORBIT ZERO");
      assert.equal(await page.locator(".app").getAttribute("data-count"), "0");
      await page.locator(".game-actions .text-button").click();
      await page.locator(".restart-dialog .primary").click();
      await shelf(page);
      await selectGame(page, "MOSS SIGNAL");
      assert.equal(await page.locator(".app").getAttribute("data-count"), "1");
      record.checks.push(
        "Moss objective survives cartridge switch and restarting Orbit",
      );
      await page.screenshot({
        path: `${out}/${failure}-restored.png`,
        fullPage: true,
      });
      await page.locator(".game-actions .text-button").click();
      await page.locator(".restart-dialog .secondary").click();
      assert.equal(await page.locator(".app").getAttribute("data-count"), "1");
      record.checks.push("Cancelling restart preserves current objective");
      await page.locator(".game-actions .text-button").click();
      await page.locator(".restart-dialog .primary").click();
      assert.equal(await page.locator(".app").getAttribute("data-count"), "0");
      record.checks.push("Confirming restart resets only the active Moss game");
      assert.deepEqual(record.errors, []);
      record.passed = true;
    } catch (error) {
      record.failureMessage = String(error);
      record.passed = false;
      process.exitCode = 1;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
