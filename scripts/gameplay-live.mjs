import { chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
const url = process.env.TEST_URL || "http://localhost:4198/";
const ids = (
  process.env.GAME_IDS ||
  "dusk-delivery,orbit-zero,moss-signal,tidebound,ember-vault,snowbyte"
).split(",");
const out = "evidence/six-games";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  url,
  date: new Date().toISOString(),
  os: os.platform() + " " + os.release(),
  cpu: os.cpus()[0]?.model,
  browser: browser.version(),
  method:
    "Real Playwright keyboard input; read-only sessionStorage for position feedback. No game state or storage writes.",
  games: fs.existsSync(out + "/report.json")
    ? JSON.parse(fs.readFileSync(out + "/report.json", "utf8")).games.filter(
        (g) => !ids.includes(g.id),
      )
    : [],
};
try {
  for (const id of ids) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      recordVideo: { dir: out, size: { width: 1440, height: 1000 } },
    });
    const page = await context.newPage(),
      video = page.video();
    const r = { id, checks: [], errors: [], consoleErrors: [] };
    report.games.push(r);
    page.on("pageerror", (e) => r.errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") r.consoleErrors.push(m.text());
    });
    const state = () =>
      page.evaluate(
        (id) =>
          JSON.parse(
            sessionStorage.getItem("save-slot:" + id + ":v2") || "null",
          ),
        id,
      );
    const sleep = (ms) => page.waitForTimeout(ms);
    const release = async () => {
      for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])
        await page.keyboard.up(key);
    };
    const inertia = id === "orbit-zero" || id === "snowbyte";
    const brake = async () => {
      if (inertia) {
        await page.keyboard.press("e");
        await page.keyboard.press("e");
      }
    };
    const flush = async () => {
      await release();
      await brake();
      await sleep(1100);
      return state();
    };
    const move = async (x, y) => {
      console.log(id, "waypoint", x, y);
      for (let attempt = 0; attempt < 12; attempt++) {
        const s = await state();
        if (s.won) return;
        const dx = x - s.x,
          dy = y - s.y,
          dist = Math.hypot(dx, dy);
        if (dist < 0.29) return;
        // Cardinal legs are intentional: the visible maps have corners and structural collision.
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const delta = horizontal ? dx : dy;
        const key = horizontal
          ? dx > 0
            ? "ArrowRight"
            : "ArrowLeft"
          : dy > 0
            ? "ArrowDown"
            : "ArrowUp";
        const speed =
          id === "moss-signal"
            ? 1.85
            : id === "tidebound"
              ? 1.2
              : id === "dusk-delivery"
                ? 2.2
                : id === "ember-vault"
                  ? 2.3
                  : id === "orbit-zero"
                    ? 2.5
                    : 2.6;
        const seconds = inertia
          ? Math.max(0.15, (Math.abs(delta) - 0.4) / speed + 0.35)
          : Math.max(0.03, Math.abs(delta) / speed);
        await page.keyboard.down(key);
        await sleep(Math.min(seconds, 14) * 1000);
        await page.keyboard.up(key);
        await flush();
      }
      throw Error(
        "Waypoint failed " +
          x +
          "," +
          y +
          " state " +
          JSON.stringify(await state()),
      );
    };
    const interact = async (x, y) => {
      await move(x, y);
      await page.keyboard.press("e");
      await sleep(120);
    };
    const traffic = async (x, startY, endY, lane) => {
      await move(x, startY);
      let previous = (await state()).elapsed;
      for (let i = 0; i < 250; i++) {
        const s = await state();
        if (s.elapsed !== previous) {
          previous = s.elapsed;
          const crossing =
            s.elapsed + Math.abs((lane === 0 ? 8 : 12) - startY) / 2.2;
          const safe = [0, 12].every((offset) => {
            const car =
              2 + ((crossing * (lane === 0 ? 2.4 : -2.4) + offset + 240) % 24);
            const distance = Math.abs(x - car);
            return Math.min(distance, 24 - distance) > 3.5;
          });
          if (safe) {
            await move(x, endY);
            return;
          }
        }
        await sleep(80);
      }
      throw Error("Traffic gap timeout");
    };
    const phase = async (kind, row) => {
      for (let i = 0; i < 250; i++) {
        const s = await state();
        const value =
          kind === "tide"
            ? (s.elapsed + row * 0.65) % 10
            : (s.elapsed + row * 0.9) % 4.5;
        // Wait for the first saved sample of the safe phase, leaving room to cross.
        if (
          kind === "tide"
            ? value >= 6 && value < 6.9
            : value >= 2.1 && value < 2.7
        )
          return;
        await sleep(80);
      }
      throw Error("Safe phase timeout " + kind);
    };
    try {
      await page.goto(url);
      await page
        .locator(".boot-intro")
        .waitFor({ state: "hidden", timeout: 25000 })
        .catch(() => {});
      await page
        .getByRole("button", {
          name: id.toUpperCase().replaceAll("-", " "),
          exact: true,
        })
        .last()
        .click();
      await sleep(700);
      r.renderer = await page
        .locator(".scene canvas")
        .evaluate((c) => {
          const gl = c.getContext("webgl2");
          if (!gl) return "Canvas2D fallback";
          const ext = gl.getExtension("WEBGL_debug_renderer_info");
          return ext
            ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER);
        })
        .catch(() => "No WebGL canvas");
      await page.getByRole("button", { name: /OPEN BOX/ }).click();
      await page
        .getByRole("button", { name: "INSERT & START", exact: true })
        .waitFor();
      await sleep(1800);
      await page
        .getByRole("button", { name: "INSERT & START", exact: true })
        .click();
      await page.waitForFunction(
        () => {
          const action = document.querySelector(".activate");
          return action && !action.disabled;
        },
        null,
        { timeout: 20000 },
      );
      await sleep(1100);
      await page.keyboard.press("Escape");
      await page
        .getByRole("heading", { name: "GAME PAUSED", exact: true })
        .waitFor();
      const paused = await state();
      await page.keyboard.down("ArrowUp");
      await sleep(350);
      await page.keyboard.up("ArrowUp");
      await sleep(900);
      const pausedAfter = await state();
      if (pausedAfter.x !== paused.x || pausedAfter.y !== paused.y)
        throw Error("Pause moved player");
      r.checks.push("Pause blocks keyboard movement");
      await page
        .getByRole("button", { name: "Start again", exact: true })
        .first()
        .click();
      await page
        .locator(".restart-dialog")
        .getByRole("button", { name: "Restart", exact: true })
        .click();
      await sleep(1100);
      const reset = await state();
      if (reset.beacons.some(Boolean) || reset.setbacks)
        throw Error("Restart failed");
      r.checks.push("Restart clears this cartridge");
      console.log(id, "playable, paused and restarted", r.renderer);
      // Larger game screen keeps keyboard/touch controls and makes the pixel art readable in recordings.
      await page
        .getByRole("button", { name: "Larger game screen", exact: true })
        .click()
        .catch(() => {});
      await sleep(400);
      const began = Date.now();
      if (id === "dusk-delivery") {
        await move(3.3, 16);
        await traffic(3.3, 13.2, 10.8, 1);
        await traffic(3.3, 9.2, 6.8, 0);
        await move(3.3, 4);
        await interact(5, 4);
        await move(5, 2.6);
        await move(23, 2.6);
        await interact(23, 4);
        await traffic(23, 6.8, 9.2, 0);
        await traffic(23, 10.8, 13.2, 1);
        await interact(23, 16);
        await move(23, 17.5);
        await move(4, 17.5);
        await move(4, 16);
      } else if (id === "moss-signal") {
        await interact(5.5, 5.5);
        await interact(22.5, 5.5);
        await interact(22.5, 15.5);
        await move(22.5, 5.5);
        await move(14.5, 5.5);
        await move(14.5, 3.5);
      } else if (id === "orbit-zero") {
        for (const [x, y] of [
          [6, 16],
          [6, 4],
          [23, 4],
          [23, 5],
          [23, 16],
          [22, 16],
          [4, 16],
        ])
          await move(x, y);
        await brake();
        await sleep(1200);
      } else if (id === "tidebound") {
        for (let i = 0; i < 3; i++) {
          await move(5.5 + i * 7, 10);
          await phase("tide", i);
          await move(10.5 + i * 7, 10);
        }
        await move(24.5, 7.5);
      } else if (id === "ember-vault") {
        await move(5, 16);
        await move(5, 13);
        await phase("fire", 1);
        await move(5, 9);
        await phase("fire", 0);
        await interact(5, 4);
        await interact(14, 4);
        await interact(23, 4);
        await move(23, 7);
        await phase("fire", 0);
        await move(23, 11);
        await phase("fire", 1);
        await move(23, 16);
      } else {
        for (const [x, y] of [
          [4, 15.2],
          [23, 15.2],
          [23, 16],
          [23, 10],
          [5, 10],
          [5, 4.8],
          [23, 4.8],
          [23, 4],
          [24.5, 4],
        ])
          await move(x, y);
      }
      await sleep(1200);
      r.final = await state();
      r.wallSeconds = (Date.now() - began) / 1000;
      if (!r.final.won) throw Error("Route did not win");
      r.checks.push(
        "Three objectives and actual destination win through keyboard",
      );
      await page.screenshot({ path: out + "/" + id + "-win.png" });
      await page
        .locator(".game-overlay")
        .getByRole("button", { name: /Back to shelf/ })
        .click();
      await page
        .locator('.app[data-stage="shelf"]')
        .waitFor({ timeout: 20000 });
      await sleep(300);
      if ((await page.locator(".app").getAttribute("data-stage")) !== "shelf")
        throw Error("Return failed");
      r.checks.push("Return to shelf");
      r.passed = true;
    } catch (e) {
      r.failure = e.message;
      r.final = await state().catch(() => null);
      await page
        .screenshot({ path: out + "/" + id + "-failure.png" })
        .catch(() => {});
      r.passed = false;
    }
    await release().catch(() => {});
    await context.close();
    await video.saveAs(out + "/" + id + ".webm");
    fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(r));
  }
} finally {
  await browser.close();
  fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
}
if (report.games.some((g) => !g.passed)) process.exitCode = 1;
