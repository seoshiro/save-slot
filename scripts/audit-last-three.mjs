import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const url = process.env.TEST_URL || "https://seoshiro.github.io/save-slot/";
const mode = process.env.INPUT_MODE || "keyboard";
const ids = (process.env.GAME_IDS || "tidebound,ember-vault,snowbyte").split(
  ",",
);
const run =
  process.env.RUN_LABEL ||
  `${mode}-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}`;
const out = path.join("evidence/six-game-audit/last-three", run);
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(out, "audit-script.mjs"));
const report = {
  url,
  mode,
  run,
  started: new Date().toISOString(),
  method:
    "Normal UI keyboard or genuine Chromium CDP touch input. Only read-only sessionStorage observation for navigation and assertions; no storage writes, state injection, teleportation, speed or clock overrides. Videos are full uncut recordings. Save scope: same tab sessionStorage, not closed-browser persistence. Physical devices untested.",
  games: [],
};
const write = () =>
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2),
  );
const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
report.browser = browser.version();
const context = await browser.newContext({
  viewport:
    mode === "touch"
      ? { width: 390, height: 844 }
      : { width: 1366, height: 900 },
  hasTouch: mode === "touch",
  isMobile: mode === "touch",
  deviceScaleFactor: 1,
  recordVideo: {
    dir: out,
    size:
      mode === "touch"
        ? { width: 390, height: 844 }
        : { width: 1366, height: 900 },
  },
});
const recordingBegan = Date.now();
const page = await context.newPage();
const video = page.video();
const cdp = mode === "touch" ? await context.newCDPSession(page) : null;
const sleep = (ms) => page.waitForTimeout(ms);
let r,
  id,
  touchCount = 0;
page.on("pageerror", (e) => {
  if (r) r.errors.push(e.message);
});
page.on("console", (m) => {
  if (r && m.type() === "error") r.consoleErrors.push(m.text());
});
const state = (game = id) =>
  page.evaluate(
    (game) =>
      JSON.parse(sessionStorage.getItem(`save-slot:${game}:v2`) || "null"),
    game,
  );
const allStates = () =>
  page.evaluate(() =>
    Object.fromEntries(
      Object.keys(sessionStorage)
        .filter((k) => /^save-slot:.*:v2$/.test(k))
        .map((k) => [k, JSON.parse(sessionStorage.getItem(k))]),
    ),
  );
const click = async (locator) =>
  mode === "touch" ? locator.tap() : locator.click();
const shot = (label) =>
  page.screenshot({
    path: path.join(out, `${id}-${label}.png`),
    fullPage: true,
  });
const waitBoot = () =>
  page
    .locator(".boot-intro")
    .waitFor({ state: "hidden", timeout: 25000 })
    .catch(() => {});
const start = async (select = true) => {
  await waitBoot();
  if (select) {
    await click(
      page
        .getByRole("button", {
          name: id.toUpperCase().replaceAll("-", " "),
          exact: true,
        })
        .last(),
    );
    await sleep(750);
    await click(page.getByRole("button", { name: /OPEN BOX/ }));
  }
  const insert = page.getByRole("button", {
    name: "INSERT & START",
    exact: true,
  });
  await insert.waitFor({ timeout: 25000 });
  await sleep(1850);
  await click(insert);
  await page
    .locator(".game-actions button:nth-child(2):not(:disabled)")
    .waitFor({ timeout: 25000 });
  await sleep(1100);
};
const leave = async () => {
  if (!(await page.locator(".game-overlay").isVisible()))
    await click(page.locator(".game-actions button").first());
  await click(
    page
      .locator(".game-overlay")
      .getByRole("button", { name: /Back to shelf/ }),
  );
  await page.locator('.app[data-stage="shelf"]').waitFor({ timeout: 25000 });
  await sleep(1400);
};
const action = async () => {
  if (mode === "touch") await click(page.locator(".activate"));
  else await page.keyboard.press("e");
};
const brake = async () => {
  if (id === "snowbyte" && !(await state())?.won) {
    await action();
    await action();
  }
};
const flush = async () => {
  await brake();
  await sleep(1100);
  return state();
};
const hold = async (key, ms) => {
  if (mode === "touch") {
    const b = page.locator(`.pad-${key.toLowerCase()}`);
    await b.scrollIntoViewIfNeeded();
    const box = await b.boundingBox();
    assert(box, "Touch target missing");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          radiusX: 5,
          radiusY: 5,
          force: 1,
          id: 1,
        },
      ],
    });
    touchCount++;
    try {
      await sleep(ms);
    } finally {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
  } else {
    await page.keyboard.down(key);
    try {
      await sleep(ms);
    } finally {
      await page.keyboard.up(key);
    }
  }
};
const move = async (x, y) => {
  console.log(id, mode, "waypoint", x, y);
  for (let attempt = 0; attempt < 18; attempt++) {
    const s = await state();
    if (s.won) return;
    const dx = x - s.x,
      dy = y - s.y;
    if (Math.hypot(dx, dy) < 0.29) return;
    const horizontal = Math.abs(dx) > Math.abs(dy),
      delta = horizontal ? dx : dy;
    const key = horizontal
      ? dx > 0
        ? "ArrowRight"
        : "ArrowLeft"
      : dy > 0
        ? "ArrowDown"
        : "ArrowUp";
    const speed = id === "tidebound" ? 1.2 : id === "ember-vault" ? 2.3 : 2.6;
    const seconds =
      id === "snowbyte"
        ? Math.max(0.15, (Math.abs(delta) - 0.4) / speed + 0.35)
        : Math.max(0.03, Math.abs(delta) / speed);
    await hold(key, Math.min(seconds, 14) * 1000);
    await flush();
  }
  throw Error(
    `Automation waypoint ${x},${y} failed: ${JSON.stringify(await state())}`,
  );
};
const interact = async (x, y) => {
  await move(x, y);
  await action();
  await sleep(1100);
};
const phase = async (kind, row) => {
  let previous = (await state()).elapsed;
  for (let i = 0; i < 250; i++) {
    const s = await state();
    const v =
      kind === "tide"
        ? (s.elapsed + row * 0.65) % 10
        : (s.elapsed + row * 0.9) % 4.5;
    // A fresh ~1s save sample must not be aliased by a sub-second phase window.
    // Water ends at 8.5 + row*7. At the staging point, exiting takes 3/1.2=2.5s.
    // Reserve 0.35s for the 80ms sampling interval and dispatch before high tide.
    if (s.elapsed !== previous) {
      previous = s.elapsed;
      const tideExitSeconds = Math.max(0, (8.5 + row * 7 - s.x) / 1.2);
      if (
        kind === "tide"
          ? v >= 6 && 10 - v >= tideExitSeconds + 0.35
          : v >= 2.1 && v < 2.7
      )
        return;
    }
    await sleep(80);
  }
  throw Error(`Automation safe-phase timeout ${kind}`);
};
const sameProgress = (a, b) =>
  JSON.stringify(a.beacons) === JSON.stringify(b.beacons) &&
  a.won === b.won &&
  Math.hypot(a.x - b.x, a.y - b.y) < 0.12 &&
  a.checkpoint === b.checkpoint &&
  a.setbacks === b.setbacks;
const persistence = async (label) => {
  await flush();
  if (!(await state()).won)
    await click(page.locator(".game-actions button").first());
  await sleep(1200);
  const before = await state();
  assert(before.beacons.some(Boolean), label + " needs earned objective");
  await shot(label + "-before-reload");
  await page.reload();
  await start(false);
  const reloaded = await state();
  assert(
    sameProgress(before, reloaded),
    label + " reload changed progress " + JSON.stringify({ before, reloaded }),
  );
  r.checks.push(
    label +
      ": position, earned objectives, checkpoint, setbacks and won restored after reload in same tab",
  );
  await leave();
  await start();
  const reentered = await state();
  assert(
    sameProgress(reloaded, reentered),
    label +
      " shelf round-trip changed progress " +
      JSON.stringify({ reloaded, reentered }),
  );
  r.checks.push(
    label +
      ": same progress restored after leaving to shelf and reentering in same tab",
  );
  r[label] = { before, reloaded, reentered };
  await shot(label + "-restored");
  console.log(id, label, "persistence PASS");
  write();
};
const mobileLayout = async () => {
  if (mode !== "touch") return;
  r.mobile = [];
  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 844 });
    await sleep(400);
    r.mobile.push(
      await page.locator(".touch-controls button").evaluateAll((buttons) => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        buttons: buttons.map((b) => {
          const q = b.getBoundingClientRect();
          return {
            label: b.getAttribute("aria-label") || b.textContent,
            x: q.x,
            y: q.y,
            width: q.width,
            height: q.height,
            disabled: b.disabled,
          };
        }),
      })),
    );
    await shot(`touch-controls-${width}-en`);
  }
  await click(page.locator('.languages button[lang="ru"]'));
  await sleep(300);
  r.russianSample = await page.locator(".touch-controls").innerText();
  r.russianLabels = await page
    .locator(".touch-controls button")
    .evaluateAll((bs) =>
      bs.map((b) => b.getAttribute("aria-label") || b.textContent),
    );
  await shot("touch-controls-390-ru");
  await click(page.locator('.languages button[lang="en"]'));
  await sleep(300);
};
try {
  await page.goto(url);
  report.assetScripts = await page
    .locator("script[src]")
    .evaluateAll((ss) => ss.map((s) => s.src));
  report.deploymentVersion = process.env.DEPLOYMENT_VERSION || "not supplied";
  for (id of ids) {
    r = {
      id,
      checks: [],
      errors: [],
      consoleErrors: [],
      started: new Date().toISOString(),
    };
    report.games.push(r);
    write();
    try {
      const previouslyCompleted = await allStates();
      await start();
      assert(
        !(await state()).beacons.some(Boolean),
        "Unplayed cartridge unexpectedly has another game progress",
      );
      r.checks.push("New cartridge starts with its own empty objectives");
      const currentResult = r;
      const victoryObserved = page
        .waitForFunction(
          () =>
            document.querySelector(".game-overlay h3")?.textContent ===
            "ROUTE COMPLETE",
          null,
          { timeout: 300000 },
        )
        .then(() => {
          if (currentResult.passed === false) return;
          currentResult.victoryOverlayAt = new Date().toISOString();
          currentResult.victoryVideoSeconds =
            (Date.now() - recordingBegan) / 1000;
        })
        .catch(() => {});
      await mobileLayout();
      if (mode === "keyboard") {
        await click(
          page.getByRole("button", { name: "Larger game screen", exact: true }),
        );
        await sleep(450);
      }
      const began = Date.now();
      if (id === "tidebound") {
        for (let i = 0; i < 3; i++) {
          await move(5.5 + i * 7, 10);
          await phase("tide", i);
          await move(10.5 + i * 7, 10);
          if (i === 0) await persistence("partial");
        }
        await move(24.5, 7.5);
      } else if (id === "ember-vault") {
        await move(5, 16);
        await move(5, 13);
        await phase("fire", 1);
        await move(5, 9);
        await phase("fire", 0);
        await interact(5, 4);
        await persistence("partial");
        await interact(14, 4);
        await interact(23, 4);
        await move(23, 7);
        await phase("fire", 0);
        await move(23, 11);
        await phase("fire", 1);
        await move(23, 16);
      } else {
        await move(4, 15.2);
        await move(23, 15.2);
        await move(23, 16);
        await persistence("partial");
        for (const p of [
          [23, 10],
          [5, 10],
          [5, 4.8],
          [23, 4.8],
          [23, 4],
          [24.5, 4],
        ])
          await move(...p);
      }
      await sleep(1200);
      r.final = await state();
      r.wallSeconds = (Date.now() - began) / 1000;
      assert(r.final.won, "Actual route did not win");
      assert(
        await page.locator(".game-overlay").isVisible(),
        "Win overlay missing",
      );
      await victoryObserved;
      r.checks.push(
        `Three earned objectives and destination victory via ${mode === "touch" ? "genuine emulated touch only" : "normal keyboard"} input`,
      );
      await shot("win");
      console.log(id, "WIN", JSON.stringify(r.final));
      write();
      await persistence("completed");
      const beforeRestart = await allStates();
      await click(page.locator(".game-overlay .primary"));
      await page.locator(".restart-dialog[open]").waitFor();
      await click(page.locator(".restart-dialog .secondary"));
      assert((await state()).won, "Cancel restart lost victory");
      r.checks.push("Restart cancellation retains completed progress");
      await click(page.locator(".game-overlay .primary"));
      await click(page.locator(".restart-dialog .primary"));
      await sleep(1100);
      const reset = await state();
      assert(
        !reset.won &&
          !reset.beacons.some(Boolean) &&
          reset.checkpoint === -1 &&
          reset.setbacks === 0,
        "Confirmed restart failed",
      );
      r.checks.push(
        "Confirmed restart clears objectives, won, checkpoint, setbacks",
      );
      r.reset = reset;
      const afterRestart = await allStates();
      r.isolationSnapshots = { beforeRestart, afterRestart };
      for (const [k, v] of Object.entries(beforeRestart))
        if (k !== `save-slot:${id}:v2`)
          assert(
            JSON.stringify(v) === JSON.stringify(afterRestart[k]),
            "Restart modified other cartridge " + k,
          );
      for (const [k, v] of Object.entries(previouslyCompleted))
        if (k !== `save-slot:${id}:v2`)
          assert(
            JSON.stringify(v) === JSON.stringify(afterRestart[k]),
            "Gameplay modified other cartridge " + k,
          );
      r.otherCartridgeStates = Object.keys(previouslyCompleted).filter(
        (k) => k !== `save-slot:${id}:v2`,
      );
      r.checks.push(
        "Other visited cartridge states unchanged by gameplay and restart",
      );
      await shot("restart");
      // Leave an actually earned, non-empty save behind. Following cartridges
      // must neither inherit nor erase it, including when they restart.
      if (id === "tidebound") {
        await move(5.5, 10);
        await phase("tide", 0);
        await move(10.5, 10);
      } else if (id === "ember-vault") {
        await move(5, 16);
        await move(5, 13);
        await phase("fire", 1);
        await move(5, 9);
        await phase("fire", 0);
        await interact(5, 4);
      } else {
        await move(4, 15.2);
        await move(23, 15.2);
        await move(23, 16);
      }
      await flush();
      r.isolationSentinel = await state();
      assert(
        r.isolationSentinel.beacons.filter(Boolean).length === 1,
        "Isolation sentinel objective missing",
      );
      r.checks.push(
        "One objective re-earned after restart and retained as a distinct cartridge save for following isolation checks",
      );
      await leave();
      r.passed = true;
    } catch (e) {
      r.passed = false;
      r.failure = e.message;
      r.lastState = await state().catch(() => null);
      await shot("failure").catch(() => {});
      console.log("FAIL", id, e.message);
      await leave().catch(() => {});
    }
    r.finished = new Date().toISOString();
    r.touchHolds = touchCount;
    write();
    console.log("GAME_RESULT", JSON.stringify(r));
  }
  for (const result of report.games.filter((g) => g.passed)) {
    r = result;
    id = result.id;
    try {
      await start();
      const restored = await state();
      assert(
        sameProgress(result.isolationSentinel, restored),
        "Revisit after playing other cartridges changed this cartridge save",
      );
      assert(
        (await page.locator(".app").getAttribute("data-game")) === id &&
          (await page.locator(".app").getAttribute("data-count")) === "1",
        "Revisited cartridge UI did not show its own earned objective",
      );
      result.isolationRevisited = restored;
      result.checks.push(
        "Own earned objective visibly restored after playing and restarting the other cartridges",
      );
      await shot("isolation-revisited");
      await leave();
    } catch (e) {
      result.passed = false;
      result.failure = e.message;
      await shot("isolation-failure").catch(() => {});
      await leave().catch(() => {});
    }
    write();
  }
} finally {
  report.finished = new Date().toISOString();
  report.touchHolds = touchCount;
  write();
  await context.close();
  await video.saveAs(path.join(out, "full-uncut.webm"));
  await browser.close();
}
if (report.games.some((g) => !g.passed)) process.exitCode = 1;
