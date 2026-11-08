import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { worlds } from "../src/data.ts";

const url = process.env.TEST_URL || "http://127.0.0.1:4201/";
const dir =
  process.env.EVIDENCE_DIR || "evidence/six-game-audit/touch-instructions";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];
try {
  for (const width of [375, 390, 1366]) {
    for (const lang of ["en", "ru"]) {
      const mobile = width < 700,
        height = width === 390 ? 844 : width === 375 ? 667 : 768;
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: mobile,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(
        (lang) => localStorage.setItem("save-slot:lang", lang),
        lang,
      );
      try {
        for (const world of worlds) {
          await page.goto(`${url}?webgl=0&case=${world.id}#${world.id}`);
          await page
            .locator(".boot-intro")
            .waitFor({ state: "hidden", timeout: 45000 });
          await page.locator('.app[data-settled="1"]').waitFor();
          await page.locator(".insert-button").click();
          await page.locator('.app[data-settled="2"]').waitFor();
          const expected = (
            mobile ? world.touchInstructions : world.instructions
          )[lang];
          assert.equal(await page.locator(".game-hint").innerText(), expected);
          if (mobile) {
            assert.ok(
              (
                await page.locator(".game-region").getAttribute("aria-label")
              ).includes(expected),
            );
            await page.locator(".activate").click();
            assert.equal(
              await page.locator(".game-hint").innerText(),
              expected,
              "Unsuccessful action keeps the touch instructions",
            );
          } else {
            assert.ok(await page.locator(".desktop-controls").isVisible());
          }
          const modes = mobile ? ["normal", "large"] : ["normal"];
          for (const mode of modes) {
            if (mode === "large") {
              await page.locator(".game-actions .secondary").nth(1).click();
              await page.locator(".app.large-mode").waitFor();
            }
            const layout = await page.evaluate((mobile) => {
              const selectors = mobile
                ? [".game-hint", ".dpad", ".activate", ".game-actions"]
                : [".game-hint", ".desktop-controls", ".game-actions"];
              return {
                scrollWidth: document.documentElement.scrollWidth,
                elements: selectors.map((s) => {
                  const el = document.querySelector(s),
                    r = el.getBoundingClientRect();
                  return {
                    selector: s,
                    x: r.x,
                    right: r.right,
                    bottom: r.bottom,
                    height: r.height,
                    overflow: el.scrollWidth > el.clientWidth + 1,
                  };
                }),
              };
            }, mobile);
            assert.ok(
              layout.scrollWidth <= width,
              `${world.id}/${lang}/${mode}: no horizontal page overflow`,
            );
            for (const r of layout.elements) {
              assert.ok(
                r.x >= 0 &&
                  r.right <= width + 1 &&
                  r.bottom <= height + 1 &&
                  r.height > 0,
                `${world.id}/${lang}/${mode}: ${r.selector} remains inside viewport`,
              );
              assert.equal(
                r.overflow,
                false,
                `${r.selector}: no clipped text/control overflow`,
              );
            }
            report.push({
              width,
              height,
              lang,
              game: world.id,
              mode,
              instructions: expected,
              layout,
              status: "passed",
            });
          }
          if (mobile && lang === "ru")
            await page.screenshot({
              path: `${dir}/${width}-${world.id}-${lang}.png`,
            });
        }
        assert.deepEqual(errors, []);
        console.log(
          `${width}/${lang}: all six instruction and layout checks passed`,
        );
      } finally {
        await context.close();
        await fs.writeFile(
          `${dir}/report.json`,
          JSON.stringify(report, null, 2),
        );
      }
    }
  }
} finally {
  await browser.close();
  await fs.writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
}
