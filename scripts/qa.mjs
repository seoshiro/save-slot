import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const url = process.env.TEST_URL || "http://localhost:4197/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  url,
  at: new Date().toISOString(),
  checks: [],
  errors: [],
  screenshots: [],
};
function ok(v, name) {
  if (!v) throw Error(name);
  report.checks.push(name);
}
try {
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(url);
    await page
      .getByRole("button", { name: "MOSS SIGNAL", exact: true })
      .click();
    await page.waitForTimeout(700);
    const stem =
      size.width === 390 ? "mobile" : size.width === 768 ? "tablet" : "desktop";
    await page.screenshot({
      path: `evidence/${stem}-shelf.png`,
      fullPage: true,
    });
    report.screenshots.push(stem + "-shelf.png");
    ok(
      (await page.locator(".app").getAttribute("data-stage")) === "shelf",
      stem + " shelf",
    );
    await page.getByRole("button", { name: /OPEN BOX/ }).click();
    await page
      .getByRole("button", { name: "INSERT & START", exact: true })
      .waitFor({ state: "visible" });
    await page.waitForTimeout(1700);
    await page.screenshot({
      path: `evidence/${stem}-open.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "INSERT & START", exact: true })
      .click();
    await page.waitForTimeout(850);
    await page.keyboard.press("Escape");
    ok(
      await page
        .getByRole("heading", { name: "GAME PAUSED", exact: true })
        .isVisible(),
      stem + " pause",
    );
    const before = await page.evaluate(() =>
      sessionStorage.getItem("save-slot:moss:v1"),
    );
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(200);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(1000);
    ok(
      (await page.evaluate(() =>
        sessionStorage.getItem("save-slot:moss:v1"),
      )) === before,
      stem + " pause prevents movement",
    );
    await page
      .getByRole("button", { name: "Resume", exact: true })
      .first()
      .click();
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(550);
    await page.keyboard.up("ArrowUp");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "RU", exact: true }).click();
    ok(
      (await page.locator("html").getAttribute("lang")) === "ru",
      stem + " RU language preserves game",
    );
    await page.screenshot({
      path: `evidence/${stem}-game-ru.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page
      .getByRole("button", { name: /Back to shelf/ })
      .first()
      .click();
    await page.waitForTimeout(1650);
    ok(
      (await page
        .getByRole("button", { name: "MOSS SIGNAL", exact: true })
        .getAttribute("aria-pressed")) === "true",
      stem + " return preserves world",
    );
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /OPEN BOX/ }).click();
      await page.waitForTimeout(150);
      await page
        .getByRole("button", { name: /Back to shelf/ })
        .first()
        .click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1600);
    ok(
      (await page.locator(".scene canvas").count()) === 1,
      stem + " one persistent WebGL canvas after interrupted cycles",
    );
    await page.getByRole("button", { name: "ORBIT ZERO", exact: true }).click();
    await page.getByRole("button", { name: /OPEN BOX/ }).click();
    await page.waitForTimeout(1600);
    ok(
      await page
        .getByRole("heading", { name: "ORBIT ZERO", exact: true })
        .isVisible(),
      stem + " concept matches selection",
    );
    await page
      .getByRole("button", { name: "EXPLORE WORLD", exact: true })
      .click();
    await page.waitForTimeout(750);
    ok(
      await page.locator(".concept-info").isVisible(),
      stem + " concept is distinct from playable demo",
    );
    await page.goBack();
    await page.waitForTimeout(1550);
    ok(
      (await page.locator(".app").getAttribute("data-stage")) === "shelf",
      stem + " browser Back",
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    ok(!overflow, stem + " no horizontal overflow");
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    report[stem + "A11y"] = a.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      summary: v.help,
      nodes: v.nodes.map((n) => n.target),
    }));
    await context.close();
  }
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(url + "?webgl=0");
  await page
    .getByRole("button", { name: "MOSS SIGNAL", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: /OPEN BOX/ }).click();
  await page
    .getByRole("button", { name: "INSERT & START", exact: true })
    .click();
  ok(
    await page.locator(".game-region canvas").isVisible(),
    "Canvas demo works without WebGL",
  );
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await page.reload();
  ok(
    (await page.locator("html").getAttribute("lang")) === "ru",
    "language persisted after reload",
  );
  await page.screenshot({
    path: "evidence/mobile-fallback.png",
    fullPage: true,
  });
  await page.close();
} finally {
  await browser.close();
  fs.writeFileSync("evidence/qa.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (report.errors.length) process.exitCode = 1;
