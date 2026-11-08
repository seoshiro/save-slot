import { chromium } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
import os from "node:os";

const url = process.env.TEST_URL || "https://seoshiro.github.io/save-slot/";
const ids = (
  process.env.GAME_IDS || "dusk-delivery,orbit-zero,moss-signal"
).split(",");
const modes = (process.env.INPUT_MODES || "keyboard,touch").split(",");
const out = process.env.AUDIT_OUT || "evidence/six-game-audit/first-three";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  url,
  requestedBuild: process.env.BUILD_ID || null,
  at: new Date().toISOString(),
  browser: browser.version(),
  os: os.platform() + " " + os.release(),
  saveScope:
    "sessionStorage in the same browser tab/session. Closing the tab/browser is not a persistence guarantee.",
  method:
    "Actual Playwright keyboard input or CDP touchStart/touchEnd plus Playwright touchscreen taps. Read-only sessionStorage observations for navigation and assertions. No state injection, storage writes, teleportation, clock/time acceleration, or gameplay changes. Uncut browser recordings. Physical mobile device untested.",
  runs: [],
};
const persist = () =>
  fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
try {
  for (const mode of modes) {
    const mobile = mode === "touch";
    const viewport = mobile
      ? { width: 390, height: 844 }
      : { width: 1366, height: 768 };
    const context = await browser.newContext({
      viewport,
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: 1,
      recordVideo: { dir: out + "/raw", size: viewport },
    });
    const page = await context.newPage(),
      video = page.video(),
      videoBegan = Date.now();
    const cdp = mobile ? await context.newCDPSession(page) : null;
    const sleep = (ms) => page.waitForTimeout(ms);
    const touchLog = [];
    let currentRun = null;
    await page.exposeFunction("auditPointer", (e) => touchLog.push(e));
    await page.exposeFunction("auditVictory", () => {
      if (currentRun && currentRun.videoWinSeconds === undefined) {
        currentRun.videoWinSeconds = (Date.now() - videoBegan) / 1000;
        persist();
      }
    });
    await page.addInitScript(() => {
      for (const event of [
        "pointerdown",
        "pointerup",
        "pointercancel",
        "click",
      ])
        document.addEventListener(
          event,
          (e) =>
            window.auditPointer({
              event,
              type: e.pointerType,
              pointerId: e.pointerId,
              isPrimary: e.isPrimary,
              trusted: e.isTrusted,
              target: e.target.closest("button")?.className,
              time: Date.now(),
            }),
          true,
        );
      new MutationObserver(() => {
        const title = document.querySelector(".game-overlay h3")?.textContent;
        if (title && /ROUTE COMPLETE|МАРШРУТ ПРОЙДЕН/.test(title))
          window.auditVictory();
      }).observe(document, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const state = (id) =>
      page.evaluate(
        (id) =>
          JSON.parse(
            sessionStorage.getItem("save-slot:" + id + ":v2") || "null",
          ),
        id,
      );
    const allStates = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.keys(sessionStorage)
            .filter((k) => /^save-slot:.*:v2$/.test(k))
            .map((k) => [k, JSON.parse(sessionStorage.getItem(k))]),
        ),
      );
    const press = async (locator) => (mobile ? locator.tap() : locator.click());
    const settled = async (n) =>
      page
        .locator('.app[data-settled="' + n + '"]')
        .waitFor({ timeout: 40000 });
    const boot = async () => {
      await page
        .locator(".boot-intro")
        .waitFor({ state: "hidden", timeout: 40000 });
    };
    const shelf = async () => {
      await press(page.locator(".backbar .back"));
      await settled(0);
    };
    const enter = async (id) => {
      const stage = await page.locator(".app").getAttribute("data-stage");
      if (stage === "shelf") {
        if ((await page.locator(".app").getAttribute("data-game")) !== id) {
          await press(
            page
              .getByRole("button", {
                name: id.toUpperCase().replaceAll("-", " "),
                exact: true,
              })
              .last(),
          );
          await sleep(800);
        }
        await press(page.locator("[data-open-box]"));
        await settled(1);
      }
      await press(page.locator(".insert-button"));
      await settled(2);
      await sleep(1150);
    };
    const hold = async (key, ms) => {
      if (!mobile) {
        await page.keyboard.down(key);
        await sleep(ms);
        await page.keyboard.up(key);
        return;
      }
      const el = page.locator(".pad-" + key.toLowerCase());
      await el.scrollIntoViewIfNeeded();
      const b = await el.boundingBox();
      assert.ok(b && b.width && b.height, "Touch pad has bounds");
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          {
            x: b.x + b.width / 2,
            y: b.y + b.height / 2,
            radiusX: 4,
            radiusY: 4,
            force: 1,
            id: 1,
          },
        ],
      });
      await sleep(ms);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };
    const action = async () =>
      mobile ? press(page.locator(".activate")) : page.keyboard.press("e");
    const pause = async () => {
      await press(page.locator(".game-actions > button").first());
      await sleep(100);
    };
    const resume = async () => {
      await press(page.locator(".game-overlay .primary"));
      await sleep(100);
    };
    await page.goto(url);
    await boot();
    report.assets = await page
      .locator("script[src]")
      .evaluateAll((els) => els.map((el) => el.src));
    for (const id of ids) {
      const pointerEventStart = touchLog.length;
      const r = {
        id,
        mode,
        checks: [],
        observations: [],
        errors: [],
        viewport: { ...viewport },
        videoStartSeconds: (Date.now() - videoBegan) / 1000,
      };
      report.runs.push(r);
      currentRun = r;
      persist();
      const check = (value, name) => {
        assert.ok(value, name);
        r.checks.push(name);
        persist();
      };
      const inertia = id === "orbit-zero";
      const brake = async () => {
        if (inertia) {
          for (let i = 0; i < 2; i++) {
            if ((await state(id)).won) break;
            if (mobile && (await page.locator(".activate").isDisabled())) break;
            await action();
          }
        }
      };
      const flush = async () => {
        await brake();
        await sleep(1100);
        return state(id);
      };
      const move = async (x, y) => {
        console.log(mode, id, "waypoint", x, y);
        for (let attempt = 0; attempt < 16; attempt++) {
          const s = await state(id);
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
          const speed =
            id === "moss-signal" ? 1.85 : id === "dusk-delivery" ? 2.2 : 2.5;
          const seconds = inertia
            ? Math.max(0.15, (Math.abs(delta) - 0.4) / speed + 0.35)
            : Math.max(0.03, Math.abs(delta) / speed);
          await hold(key, Math.min(seconds, 14) * 1000);
          await flush();
        }
        throw Error(
          "Waypoint failed " +
            x +
            "," +
            y +
            " " +
            JSON.stringify(await state(id)),
        );
      };
      const interact = async (x, y) => {
        await move(x, y);
        await action();
        await sleep(120);
      };
      const traffic = async (x, startY, endY, lane) => {
        await move(x, startY);
        let previous = (await state(id)).elapsed;
        for (let i = 0; i < 250; i++) {
          const s = await state(id);
          if (s.elapsed !== previous) {
            previous = s.elapsed;
            const crossing =
              s.elapsed + Math.abs((lane === 0 ? 8 : 12) - startY) / 2.2;
            if (
              [0, 12].every((offset) => {
                const raw =
                  (crossing * (lane === 0 ? 2.4 : -2.4) + offset + 240) % 24;
                const car =
                  2 + (process.env.FIXED_WRAP === "1" ? (raw + 24) % 24 : raw);
                const d = Math.abs(x - car);
                return Math.min(d, 24 - d) > 3.5;
              })
            ) {
              await move(x, endY);
              return;
            }
          }
          await sleep(80);
        }
        throw Error("Traffic gap timeout");
      };
      const compareProgress = (a, b, label) => {
        check(
          JSON.stringify(a.beacons) === JSON.stringify(b.beacons) &&
            a.won === b.won &&
            a.checkpoint === b.checkpoint &&
            a.setbacks === b.setbacks &&
            Math.hypot(a.x - b.x, a.y - b.y) < 0.08,
          label,
        );
      };
      const partial = async () => {
        await flush();
        await pause();
        const saved = await state(id);
        check(
          saved.beacons.filter(Boolean).length === 1 && !saved.won,
          "One objective earned through real " + mode + " input",
        );
        r.partial = saved;
        await page.screenshot({
          path: out + "/" + id + "-" + mode + "-partial.png",
        });
        await hold("ArrowDown", 250);
        await sleep(1100);
        compareProgress(saved, await state(id), "Pause blocks movement");
        await page.reload();
        await boot();
        compareProgress(
          saved,
          await state(id),
          "Partial state retained on same-tab reload",
        );
        await enter(id);
        await flush();
        compareProgress(
          saved,
          await state(id),
          "Partial state restored into playable game after reload",
        );
        await shelf();
        const exited = await state(id);
        if (process.env.CROSS_CARTRIDGE === "1") {
          const other = id === "moss-signal" ? "orbit-zero" : "moss-signal";
          await enter(other);
          const otherBefore = await state(other);
          check(
            otherBefore.id === other,
            "Different cartridge loads its own state",
          );
          await press(page.locator(".game-actions > button").nth(2));
          await press(page.locator(".restart-dialog button").first());
          await sleep(1100);
          check(
            (await state(other)).beacons.every((v) => !v),
            "Other cartridge reset through confirmation",
          );
          compareProgress(
            exited,
            await state(id),
            "Resetting another cartridge preserves earned objective and position",
          );
          await shelf();
        }
        await enter(id);
        await flush();
        compareProgress(
          exited,
          await state(id),
          "Partial state restored after leaving and reentering cartridge",
        );
        await press(page.locator(".game-actions > button").nth(1));
        await sleep(500);
      };
      try {
        if (mobile && id === "moss-signal") {
          await page.setViewportSize({ width: 375, height: 812 });
          r.viewport = { width: 375, height: 812 };
          await press(page.getByRole("button", { name: "RU", exact: true }));
        }
        await enter(id);
        r.start = await state(id);
        check(
          r.start.beacons.every((v) => !v) && !r.start.won,
          "New cartridge starts with independent empty progress",
        );
        await press(page.locator(".game-actions > button").nth(1));
        await sleep(700);
        if (mobile) {
          r.controls = await page
            .locator(".pad,.activate,.game-actions > button")
            .evaluateAll((els) =>
              els.map((el) => {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                );
                return {
                  label: el.getAttribute("aria-label") || el.textContent.trim(),
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                  inViewport:
                    r.x >= 0 &&
                    r.y >= 0 &&
                    r.right <= innerWidth &&
                    r.bottom <= innerHeight,
                  hit: el.contains(hit),
                  disabled: el.disabled,
                };
              }),
            );
          check(
            r.controls.every((c) => c.inViewport && c.hit),
            "Mobile controls in viewport and unobstructed at " +
              r.viewport.width +
              "px",
          );
          await page.screenshot({
            path: out + "/" + id + "-" + mode + "-controls.png",
          });
        }
        if (mobile && id === "moss-signal" && process.env.TOUCH_EDGE === "1") {
          const point = async (selector, id) => {
            const b = await page.locator(selector).boundingBox();
            return {
              x: b.x + b.width / 2,
              y: b.y + b.height / 2,
              radiusX: 4,
              radiusY: 4,
              force: 1,
              id,
            };
          };
          const send = (type, touchPoints) =>
            cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
          await send("touchStart", [await point(".pad-arrowleft", 1)]);
          await sleep(240);
          await send("touchCancel", []);
          await sleep(1100);
          const cancelled = await state(id);
          await sleep(1100);
          const stopped = await state(id);
          check(
            Math.hypot(cancelled.x - stopped.x, cancelled.y - stopped.y) <
              0.001,
            "CDP touchCancel clears held direction without stuck movement",
          );
          const up = await point(".pad-arrowup", 1);
          await send("touchStart", [up]);
          await sleep(180);
          await send("touchMove", [{ ...up, x: 190, y: 250 }]);
          await sleep(180);
          await send("touchEnd", []);
          await sleep(1100);
          const outside = await state(id);
          await sleep(1100);
          const released = await state(id);
          check(
            Math.hypot(outside.x - released.x, outside.y - released.y) < 0.001,
            "Moving touch outside pad and releasing clears direction",
          );
          await move(5.5, 5.5);
          const direction = await point(".pad-arrowup", 1),
            activatePoint = await point(".activate", 2);
          await send("touchStart", [direction]);
          await sleep(80);
          await send("touchStart", [direction, activatePoint]);
          await sleep(100);
          await send("touchMove", [direction]);
          await sleep(100);
          await send("touchEnd", []);
          await sleep(1100);
          const multiTouchState = await state(id);
          r.multiTouchState = multiTouchState;
          if (!multiTouchState.beacons[0]) {
            await page.screenshot({
              path: out + "/moss-multitouch-failed.png",
            });
            await action();
            await sleep(1100);
            r.singleTouchAtSamePosition = await state(id);
            await page.screenshot({
              path: out + "/moss-single-touch-comparison.png",
            });
          }
          check(
            multiTouchState.beacons[0],
            "Two simultaneous touch points allow direction plus objective activation",
          );
          await page.screenshot({
            path: out + "/" + id + "-" + mode + "-multitouch-objective.png",
          });
        }
        const began = Date.now();
        if (id === "dusk-delivery") {
          if (Number(process.env.DUSK_WAIT_SECONDS) > 0) {
            await sleep(Number(process.env.DUSK_WAIT_SECONDS) * 1000);
            r.lateTrafficState = await state(id);
            check(
              r.lateTrafficState.elapsed > 105,
              "DUSK gameplay clock passed 105s without acceleration",
            );
            await page.screenshot({
              path: out + "/" + id + "-" + mode + "-late-traffic.png",
            });
          }
          await move(3.3, 16);
          await traffic(3.3, 13.2, 10.8, 1);
          await traffic(3.3, 9.2, 6.8, 0);
          await move(3.3, 4);
          await interact(5, 4);
          await partial();
          await move(5, 2.6);
          await move(23, 2.6);
          await interact(23, 4);
          await traffic(23, 6.8, 9.2, 0);
          await traffic(23, 10.8, 13.2, 1);
          await interact(23, 16);
          await move(23, 17.5);
          await move(4, 17.5);
          await move(4, 16);
        } else if (id === "orbit-zero") {
          await move(6, 16);
          await move(6, 4);
          await partial();
          for (const [x, y] of [
            [23, 4],
            [23, 5],
            [23, 16],
            [22, 16],
            [4, 16],
          ])
            await move(x, y);
          await brake();
          await sleep(1200);
        } else {
          await interact(5.5, 5.5);
          await partial();
          await interact(22.5, 5.5);
          await interact(22.5, 15.5);
          await move(22.5, 5.5);
          await move(14.5, 5.5);
          await move(14.5, 3.5);
        }
        await sleep(1200);
        r.final = await state(id);
        r.wallSeconds = (Date.now() - began) / 1000;
        check(
          r.final.won && r.final.beacons.every(Boolean),
          "All three objectives and actual goal completed through " + mode,
        );
        check(
          await page.locator(".game-overlay h3").isVisible(),
          "Victory overlay visible",
        );
        r.victoryText = await page.locator(".game-overlay").innerText();
        r.videoWinCapturedSeconds = (Date.now() - videoBegan) / 1000;
        await page.screenshot({
          path: out + "/" + id + "-" + mode + "-win.png",
        });
        const completed = await state(id);
        await page.reload();
        await boot();
        await enter(id);
        compareProgress(
          completed,
          await state(id),
          "Completed state restored after reload",
        );
        check(
          await page.locator(".game-overlay h3").isVisible(),
          "Victory overlay restored after reload",
        );
        await shelf();
        await enter(id);
        compareProgress(
          completed,
          await state(id),
          "Completed state restored after leave and reenter",
        );
        const states = await allStates();
        await press(page.locator(".game-actions > button").nth(2));
        await page.locator(".restart-dialog[open]").waitFor();
        await press(page.locator(".restart-dialog button").nth(1));
        compareProgress(
          completed,
          await state(id),
          "Cancel restart preserves completed state",
        );
        await press(page.locator(".game-actions > button").nth(2));
        await press(page.locator(".restart-dialog button").first());
        await sleep(1100);
        const reset = await state(id);
        r.reset = reset;
        check(
          !reset.won &&
            reset.beacons.every((v) => !v) &&
            reset.checkpoint === -1 &&
            reset.setbacks === 0,
          "Confirmed restart clears only active cartridge",
        );
        const after = await allStates();
        for (const [k, v] of Object.entries(states)) {
          if (k !== "save-slot:" + id + ":v2")
            check(
              JSON.stringify(v) === JSON.stringify(after[k]),
              "Restart preserves separate cartridge " + k,
            );
        }
        await hold("ArrowRight", 350);
        await flush();
        const post = await state(id);
        check(
          Math.hypot(post.x - reset.x, post.y - reset.y) > 0.08,
          "Restarted game accepts " + mode + " movement",
        );
        await shelf();
        check(errors.length === 0, "No browser page errors");
        r.passed = true;
      } catch (e) {
        r.passed = false;
        r.failure = String(e.stack || e);
        r.final = await state(id).catch(() => null);
        await page
          .screenshot({ path: out + "/" + id + "-" + mode + "-failure.png" })
          .catch(() => {});
        console.log("FAIL", r.failure);
        try {
          if (
            (await page.locator(".app").getAttribute("data-stage")) !== "shelf"
          )
            await shelf();
        } catch {
          await page.goto(url);
          await boot();
        }
      }
      r.errors = [...errors];
      const runTouchLog = touchLog.slice(pointerEventStart);
      r.touchPointerEvents = runTouchLog.filter((e) =>
        e.target?.includes("pad"),
      ).length;
      r.touchPointerTypes = [
        ...new Set(
          runTouchLog
            .filter((e) => e.target?.includes("pad"))
            .map((e) => e.type),
        ),
      ];
      r.trustedTouchPointers = runTouchLog
        .filter((e) => e.target?.includes("pad"))
        .every((e) => e.trusted && e.type === "touch");
      if (mobile && r.passed)
        check(
          r.touchPointerEvents > 0 && r.trustedTouchPointers,
          "Actual trusted touch pointer events observed on directional controls",
        );
      r.videoEndSeconds = (Date.now() - videoBegan) / 1000;
      persist();
      console.log("RESULT", JSON.stringify(r));
    }
    await context.close();
    await video.saveAs(out + "/" + mode + "-uncut.webm");
    fs.writeFileSync(
      out + "/" + mode + "-pointer-events.json",
      JSON.stringify(touchLog, null, 2),
    );
  }
} finally {
  await browser.close();
  persist();
}
if (report.runs.some((r) => !r.passed)) process.exitCode = 1;
