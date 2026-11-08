import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const dir = "evidence/six-games/scene-framing";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [],
  errors = [];
try {
  for (const [width, height] of process.env.MOBILE_ONLY
    ? [
        [375, 667],
        [390, 844],
      ]
    : [
        [1366, 768],
        [1536, 776],
        [375, 667],
        [390, 844],
      ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4198/");
    await page
      .locator('.scene[data-resource-ready="true"]')
      .waitFor({ timeout: 40000 });
    await page.waitForTimeout(3500);
    const capture = async (stage) => {
      await page.screenshot({
        path: `${dir}/app-${width}x${height}-${stage}.png`,
        fullPage: true,
      });
      const bounds = await page.evaluate(() => {
        const read = (s) => {
          const e = document.querySelector(s);
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            bottom: r.bottom,
            right: r.right,
          };
        };
        return {
          scene: read(".scene"),
          back: read(".backbar"),
          game: read('[data-testid="game-region"]'),
          open: read("[data-open-box]"),
          scrollY,
          docWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
        };
      });
      results.push({ width, height, stage, ...bounds });
    };
    await page.getByRole("button", { name: "SNOWBYTE", exact: true }).click();
    await page.waitForTimeout(900);
    await capture("shelf");
    await page.locator("[data-open-box]").click();
    await page.locator('.app[data-settled="1"]').waitFor();
    await page.waitForTimeout(100);
    await capture("open");
    await page.locator(".insert-button").click();
    await page.locator('.app[data-settled="2"]').waitFor();
    await page.waitForTimeout(300);
    await capture("game");
    await page
      .getByRole("button", { name: "Larger game screen", exact: true })
      .click();
    await page.waitForTimeout(800);
    await capture("large");
    if (!(await page.locator(".backbar .back").isVisible())) {
      errors.push("Hidden enlarged backbar at " + width + "x" + height);
      await page
        .getByRole("button", { name: "Return to console", exact: true })
        .click();
      await page.waitForTimeout(500);
    }
    await page.locator(".backbar .back").click();
    await page.locator('.app[data-settled="0"]').waitFor();
    await page.waitForTimeout(300);
    await capture("return");
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(
    dir + "/app-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, errors }, null, 2));
}
