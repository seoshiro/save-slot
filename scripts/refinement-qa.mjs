import { chromium } from "@playwright/test";
import fs from "node:fs";
const base = process.env.TEST_URL || "http://localhost:4197/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  url: base,
  at: new Date().toISOString(),
  checks: [],
  errors: [],
  screens: [],
};
const ok = (v, n) => {
  if (!v) throw Error(n);
  report.checks.push(n);
};
try {
  for (const width of [1440, 390])
    for (const light of [false, true]) {
      const p = await browser.newPage({
        viewport: { width, height: width === 1440 ? 1000 : 844 },
      });
      p.on("pageerror", (e) => report.errors.push(e.message));
      const prefix = `v2-${width}-${light ? "fallback" : "webgl"}`;
      await p.goto(base + (light ? "?webgl=0" : ""));
      await p
        .getByRole("button", { name: "MOSS SIGNAL", exact: true })
        .last()
        .click();
      await p.waitForTimeout(700);
      const hero = await p.locator(".hero-copy").boundingBox();
      const selectors = await p.locator('.world-picks').boundingBox();
      ok(selectors.x >= 0 && selectors.x + selectors.width <= width, `${prefix} all six selectors inside viewport`);
      if (light) {
        const covers = await p.locator(".flat-active").boundingBox();
        ok(
          covers.y > hero.y + hero.height - 10,
          `${prefix} shelf below heading`,
        );
      }
      await p.screenshot({
        path: `evidence/${prefix}-shelf.png`,
        fullPage: true,
      });
      await p.getByRole("button", { name: /OPEN BOX/ }).click();
      await p
        .getByRole("button", { name: "INSERT & START", exact: true })
        .waitFor({ state: "visible" });
      await p.waitForTimeout(1750);
      await p
        .getByRole("button", { name: "INSERT & START", exact: true })
        .click();
      await p.locator(".game-region").waitFor({ state: "visible" });
      await p.waitForTimeout(900);
      const field = await p.locator(".game-region").boundingBox();
      if (light) {
        const area = await p.locator(".scene-wrap").boundingBox();
        ok(
          field.y >= area.y && field.y + field.height <= area.y + area.height,
          `${prefix} complete framed game fits scene`,
        );
      }
      report[`${prefix}Field`] = field;
      if (width === 1440)
        ok(field.width >= 450, `${prefix} game width >=450px`);
      await p.screenshot({
        path: `evidence/${prefix}-game-en.png`,
        fullPage: true,
      });
      await p.getByRole("button", { name: "RU", exact: true }).click();
      await p.screenshot({
        path: `evidence/${prefix}-game-ru.png`,
        fullPage: true,
      });
      await p.getByRole("button", { name: "EN", exact: true }).click();
      await p
        .getByRole("button", { name: /Back to shelf/ })
        .first()
        .click();
      await p.waitForTimeout(200);
      if (!light) {
        ok(
          (await p.locator(".app").getAttribute("data-stage")) === "returning",
          `${prefix} intermediate return`,
        );
        ok(
          (await p.locator(".shelf-actions").count()) === 0,
          `${prefix} no premature shelf UI`,
        );
      }
      await p.screenshot({
        path: `evidence/${prefix}-return.png`,
        fullPage: true,
      });
      await p.waitForTimeout(1500);
      ok(
        (await p.locator(".app").getAttribute("data-stage")) === "shelf",
        `${prefix} shelf restored`,
      );
      ok(
        !(await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        )),
        `${prefix} no overflow`,
      );
      if (!light) {
        await p.getByRole("button", { name: /OPEN BOX/ }).click();
        await p.waitForTimeout(500);
        await p
          .getByRole("button", { name: /Back to shelf/ })
          .first()
          .click();
        await p.waitForTimeout(100);
        await p.keyboard.press("ArrowRight");
        await p.keyboard.press("Enter");
        await p.waitForTimeout(2100);
        ok(
          await p
            .getByRole("heading", { name: "TIDEBOUND", exact: true })
            .isVisible(),
          `${prefix} queued selection and reopen during return`,
        );
        await p
          .getByRole("button", { name: /Back to shelf/ })
          .first()
          .click();
        await p.waitForTimeout(1600);
      }
      await p.close();
    }
} finally {
  await browser.close();
  fs.writeFileSync(
    "evidence/refinement-qa.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
