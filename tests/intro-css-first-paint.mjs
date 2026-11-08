import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";

const url = process.env.TEST_URL || "http://localhost:4199/";
const dir = "evidence/transition-polish/intro";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];
try {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 375, height: 667 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let release;
    const cssGate = new Promise((resolve) => {
      release = resolve;
    });
    let cssRequested = false;
    await page.route("**/assets/*.css", async (route) => {
      cssRequested = true;
      await cssGate;
      await route.continue();
    });
    await page.goto(url, { waitUntil: "commit" });
    await page.waitForFunction(() => !!document.querySelector(".boot-logo"));
    // Observe real document paint while CSS is still unavailable, not about:blank.
    await page.waitForFunction(
      () => performance.getEntriesByName("first-contentful-paint").length > 0,
    );
    assert.ok(cssRequested, "production CSS request intercepted");
    assert.equal(
      await page.locator('[data-testid="boot-intro"]').count(),
      0,
      "React cannot expose unstyled app",
    );
    const before = await page.locator(".boot-logo").boundingBox();
    const cdp = await context.newCDPSession(page);
    const capture = await cdp.send("Page.captureScreenshot", { format: "png" });
    const image = Buffer.from(capture.data, "base64");
    await fs.writeFile(`${dir}/css-pending-${viewport.width}.png`, image);
    const { data } = await sharp(image)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [...data.subarray(0, 3)],
      [238, 230, 215],
      "first document background is paper, not white",
    );
    const paint = await page.evaluate(
      () => performance.getEntriesByName("first-contentful-paint")[0].startTime,
    );
    release();
    await page.getByTestId("boot-intro").waitFor();
    const after = await page.locator(".boot-logo").boundingBox();
    for (const key of ["x", "y", "width", "height"])
      assert.ok(Math.abs(before[key] - after[key]) < 1, key);
    await page
      .locator(".boot-intro")
      .waitFor({ state: "hidden", timeout: 45000 });
    report.push({
      viewport,
      firstContentfulPaint: paint,
      firstPaintBeforeCss: true,
      stableLogo: true,
    });
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/assets/*.css", (route) => route.abort());
  await page.goto(url);
  await page.getByRole("button", { name: "Try again", exact: true }).waitFor();
  assert.equal(
    await page.locator(".app").count(),
    0,
    "CSS failure does not reveal unstyled controls",
  );
  report.push({ cssFailure: "visible retry, no unstyled application" });
  await context.close();
} finally {
  await browser.close();
  await fs.writeFile(
    `${dir}/first-paint-report.json`,
    JSON.stringify(report, null, 2),
  );
}
console.log(JSON.stringify(report, null, 2));
