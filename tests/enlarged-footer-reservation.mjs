import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const url = process.env.TEST_URL || "http://localhost:4199/";
const dir = "evidence/transition-polish/enlarged-footer";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];
try {
  for (const height of [600, 768]) {
    const context = await browser.newContext({
      viewport: { width: 1366, height },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("save-slot:lang", "ru");
      localStorage.setItem("save-slot:selected", "1");
    });
    await page.goto(url);
    await page
      .locator(".boot-intro")
      .waitFor({ state: "hidden", timeout: 45000 });
    await page.locator("[data-open-box]").click();
    await page.locator('.app[data-settled="1"]').waitFor({ timeout: 30000 });
    await page.locator(".insert-button").click();
    await page.locator('.app[data-settled="2"]').waitFor({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Увеличить экран игры", exact: true })
      .click();
    await page.locator(".app.large-mode").waitFor();
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => {
      const rect = (selector) =>
        document.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        game: rect(".game-region"),
        panel: rect(".world-info"),
        footer: rect(".footer"),
        documentHeight: document.documentElement.scrollHeight,
      };
    });
    assert.ok(
      metrics.panel.bottom + 20 <= metrics.footer.top,
      "footer remains below the complete panel",
    );
    assert.ok(
      metrics.game.bottom + 20 <= metrics.footer.top,
      "footer remains below enlarged canvas",
    );
    if (height === 600)
      assert.ok(
        metrics.documentHeight > height,
        "short viewport scrolls naturally",
      );
    if (height === 768) {
      assert.ok(
        metrics.documentHeight <= height,
        "normal-height layout stays within viewport",
      );
      assert.deepEqual(
        [
          metrics.game.x,
          metrics.game.y,
          metrics.game.width,
          metrics.game.height,
        ],
        [34, 156, 904, 522],
        "accepted enlarged game geometry remains unchanged",
      );
    }
    await page.screenshot({
      path: `${dir}/1366x${height}-ru-enlarged-full.png`,
      fullPage: true,
    });
    await page.locator(".backbar .back").click();
    await page.locator('.app[data-settled="0"]').waitFor({ timeout: 30000 });
    assert.equal(await page.locator(".app.large-mode").count(), 0);
    assert.equal(await page.evaluate(() => scrollY), 0);
    report.push({ height, ...metrics, directBack: "passed" });
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
