import { chromium } from "@playwright/test";
import fs from "node:fs";
const url = process.env.TEST_URL || "http://localhost:4197/";
const repro = process.env.REPRO === "1";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  url,
  at: new Date().toISOString(),
  checks: [],
  errors: [],
  modes: [],
};
const ok = (v, n) => {
  if (!v) throw Error(n);
  report.checks.push(n);
};
try {
  for (const width of repro
    ? [390]
    : process.env.SHORT_ONLY === "1"
      ? [375]
      : [390, 1440])
    for (const disabled of repro ? [true] : [false, true])
      for (const lang of repro ? ["en"] : ["en", "ru"]) {
        const p = await browser.newPage({
          viewport: {
            width,
            height: width === 375 ? 667 : width <= 700 ? 844 : 1000,
          },
          isMobile: width <= 700,
          hasTouch: width <= 700,
        });
        p.on("pageerror", (e) => report.errors.push(e.message));
        if (disabled)
          await p.addInitScript(() => {
            const original = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type, ...args) {
              return type === "webgl" ||
                type === "webgl2" ||
                type === "experimental-webgl"
                ? null
                : original.call(this, type, ...args);
            };
          });
        const id = `${width}-${lang}-${disabled ? "fallback" : "webgl"}`;
        await p.goto(url);
        await p
          .getByRole("button", {
            name: lang === "en" ? "EN" : "RU",
            exact: true,
          })
          .click();
        await p
          .getByRole("button", { name: "MOSS SIGNAL", exact: true })
          .last()
          .click();
        await p.locator("[data-open-box]").click();
        await p.locator(".world-info.arrived").waitFor();
        await p.locator(".insert-button").click();
        await p.locator(".game-region").waitFor();
        await p.waitForTimeout(850);
        if (!disabled) {
          ok(
            (await p.locator(".scene canvas").count()) === 1,
            `${id} genuine scene canvas`,
          );
          const gpu = await p.locator(".scene canvas").evaluate((c) => {
            const gl = c.getContext("webgl2"),
              d = gl.getExtension("WEBGL_debug_renderer_info");
            return d
              ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL)
              : gl.getParameter(gl.VERSION);
          });
          report.modes.push({ id, mode: "WebGL", gpu });
        } else {
          ok(
            (await p.locator(".light-mode").count()) === 1,
            `${id} actual WebGL failure fallback`,
          );
          report.modes.push({
            id,
            mode: "Canvas2D; WebGL context unavailable",
          });
        }
        if (width <= 700 && !repro) {
          ok(
            await p.evaluate(() => scrollY < 2),
            `${id} compact play starts at page top`,
          );
          const area = await p.locator(".scene-wrap").boundingBox(),
            field = await p.locator(".game-region").boundingBox();
          ok(
            field.y >= area.y &&
              field.y + field.height <= area.y + area.height + 1,
            `${id} game inside scene bounds`,
          );
          for (const sel of [
            ".game-region",
            ".dpad",
            ".activate",
            ".game-actions > .secondary:first-child",
          ]) {
            const b = await p.locator(sel).boundingBox();
            ok(
              b.y >= 0 && b.y + b.height <= (width === 375 ? 667 : 844),
              `${id} ${sel} inside first viewport`,
            );
          }
          const hint = await p.locator(".game-hint").innerText();
          ok(
            lang === "en"
              ? hint.includes("tap Activate")
              : hint.includes("Включить"),
            `${id} touch instructions`,
          );
        }
        await p.screenshot({ path: `evidence/handheld-${id}-play.png` });
        if (disabled && !repro) {
          const n = p.locator(".fallback-notice");
          if (await n.isVisible()) {
            const a = await n.boundingBox(),
              b = await p.locator(".game-region").boundingBox();
            ok(
              a.y >= b.y + b.height || a.y + a.height <= b.y,
              `${id} notice outside game`,
            );
          }
        }
        await p.locator(".backbar .back").click();
        await p.waitForTimeout(2000);
        await p.screenshot({
          path: `evidence/${repro ? "repro-before" : "handheld-" + id}-return.png`,
        });
        ok(
          (await p.locator(".app").getAttribute("data-stage")) === "shelf",
          `${id} return settles to shelf`,
        );
        ok(
          await p.locator(".shelf-actions").isVisible(),
          `${id} shelf actions restored`,
        );
        ok(
          (await p.locator(".hero-copy").getAttribute("aria-hidden")) ===
            "false",
          `${id} heading restored`,
        );
        ok(
          await p.locator("[data-open-box]").isVisible(),
          `${id} open button restored`,
        );
        ok(
          (await p
            .getByRole("button", {
              name: lang === "en" ? "Next world" : "Следующий мир",
              exact: true,
            })
            .isVisible()) || (await p.locator(".browse .square").count()) === 2,
          `${id} arrows restored`,
        );
        await p.close();
      }
} catch (e) {
  report.failure = e.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync(
    `evidence/${repro ? "repro-before" : process.env.SHORT_ONLY === "1" ? "handheld-short-qa" : "handheld-qa"}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
