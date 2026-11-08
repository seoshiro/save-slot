import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const url = new URL(process.env.TEST_URL || "http://localhost:4199/");
url.searchParams.set("webgl", "0");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 375, height: 667 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.addInitScript(() =>
      localStorage.setItem("save-slot:lang", "ru"),
    );
    await page.goto(url.href);
    await page
      .locator(".boot-intro")
      .waitFor({ state: "hidden", timeout: 30000 });
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.locator("[data-open-box]").click();
      await page.locator('.app[data-settled="1"]').waitFor();
      await page.locator(".insert-button").click();
      await page.locator('.app[data-settled="2"]').waitFor();
      await page
        .getByRole("button", { name: "Увеличить экран игры", exact: true })
        .click();
      await page.locator(".app.large-mode").waitFor();
      await page.locator(".backbar .back").click();
      // Let the asynchronous history.back() popstate arrive after the light-mode
      // effect has already settled the shelf. That second close must be a no-op.
      await page.waitForFunction(() => !location.hash);
      await page.waitForTimeout(150);
      assert.equal(
        await page.locator(".app").getAttribute("data-settled"),
        "0",
      );
      assert.equal(
        await page.locator(".app").getAttribute("data-stage"),
        "shelf",
      );
      assert.equal(await page.locator(".app.large-mode").count(), 0);
    }
    // No artificial pause between the Back click and the next visible Open.
    await page.locator("[data-open-box]").click();
    await page.locator('.app[data-settled="1"]').waitFor();
    await page.locator(".backbar .back").click();
    await page.locator("[data-open-box]").click();
    await page.locator('.app[data-settled="1"]').waitFor();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !location.hash);
    await page.locator('.app[data-settled="0"]').waitFor();
    await page.goForward();
    await page.locator('.app[data-settled="1"]').waitFor();
    await page.goBack();
    await page.locator('.app[data-settled="0"]').waitFor();
    console.log(
      `${viewport.width}: three enlarged direct returns, reopen, history forward/back passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
