import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";
const dir = "docs/media";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  url: "https://seoshiro.github.io/save-slot/",
  applicationCommit: "4234d5d2a668e5e85364704c1e5fcad894d1c82f",
  capturedAt: new Date().toISOString(),
  conditions:
    "Windows Chrome headless; DPR 1; mobile viewport and touch emulation, not a physical phone. Real public page; no app, game-state, scene or style changes.",
  runs: [],
};
for (const [label, width, height] of [
  ["desktop", 1366, 768],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: label === "mobile",
    recordVideo: { dir: "delivery/presentation-raw", size: { width, height } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.goto(report.url);
  await page
    .locator(".boot-intro")
    .waitFor({ state: "hidden", timeout: 45000 });
  await page.locator('.scene[data-resource-ready="true"]').waitFor();
  const run = {
    label,
    width,
    height,
    status: response.status(),
    assets: await page
      .locator("script[src]")
      .evaluateAll((es) => es.map((e) => e.src)),
    errors,
    images: [],
  };
  report.runs.push(run);
  await page
    .locator(".world-picks")
    .getByRole("button", { name: "MOSS SIGNAL", exact: true })
    .click();
  await page.waitForTimeout(900);
  async function shot(stage) {
    const filename = `${label}-${stage}.webp`;
    await sharp(await page.screenshot())
      .webp({ quality: 91 })
      .toFile(`${dir}/${filename}`);
    run.images.push(filename);
  }
  await shot("shelf");
  await page.locator("[data-open-box]").click();
  await page.locator('.app[data-settled="1"]').waitFor();
  await page.waitForTimeout(350);
  await shot("box");
  await page.locator(".insert-button").click();
  await page.locator('.app[data-settled="2"]').waitFor();
  await page.waitForTimeout(500);
  await shot("console");
  await page
    .getByRole("button", { name: "Larger game screen", exact: true })
    .click();
  await page.waitForTimeout(400);
  await shot("game");
  const video = page.video();
  await context.close();
  run.video = await video.path();
}
await browser.close();
await fs.writeFile(
  `${dir}/capture-manifest.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
