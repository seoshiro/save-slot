import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const out = {
  at: new Date().toISOString(),
  checks: [],
  errors: [],
  screens: [],
};
const dir = "evidence/six-games";
fs.mkdirSync(dir, { recursive: true });
const ok = (v, name) => {
  if (!v) throw Error(name);
  out.checks.push(name);
};
const url = process.env.TEST_URL || "http://localhost:4199";
try {
  for (const [width, height, lang, light] of [
    [320, 720, "ru", false],
    [390, 844, "en", true],
    [768, 1024, "ru", true],
    [1280, 720, "en", false],
    [1920, 1080, "ru", false],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 701,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => out.errors.push(e.message));
    await page.addInitScript(
      (lang) => localStorage.setItem("save-slot:lang", lang),
      lang,
    );
    await page.goto(url + (light ? "/?webgl=0" : ""));
    await page
      .locator(".boot-intro")
      .waitFor({ state: "hidden", timeout: 30000 });
    const label = `${width}-${lang}-${light ? "fallback" : "webgl"}`;
    const bounds = await page
      .locator(".hero-copy,.scene-wrap,.shelf-actions")
      .evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, width: r.width };
        }),
      );
    console.log(label, bounds);
    await page.screenshot({
      path: `${dir}/${label}-debug.png`,
      fullPage: true,
    });
    ok(bounds[0].bottom <= bounds[1].top, `${label}: title before scene`);
    ok(bounds[1].bottom <= bounds[2].top, `${label}: scene before actions`);
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${label}: no horizontal overflow`,
    );
    await page.screenshot({
      path: `${dir}/${label}-shelf.png`,
      fullPage: true,
    });
    out.screens.push(`${label}-shelf.png`);
    await page.locator("[data-open-box]").click();
    await page.waitForFunction(
      () => document.querySelector(".app").dataset.settled === "1",
    );
    await page.locator(".insert-button").click();
    await page.waitForFunction(
      () => document.querySelector(".app").dataset.settled === "2",
    );
    await page.locator(".game-region").focus();
    await page.keyboard.press("Escape");
    ok(await page.locator(".game-overlay").isVisible(), `${label}: pause`);
    const raw = await page.evaluate(() =>
      sessionStorage.getItem("save-slot:moss-signal:v2"),
    );
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(250);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(100);
    ok(
      (await page.evaluate(() =>
        sessionStorage.getItem("save-slot:moss-signal:v2"),
      )) === raw,
      `${label}: pause freezes progress`,
    );
    await page.locator(".game-overlay .primary").click();
    if (width < 701) {
      const button = page.getByRole("button", {
        name: lang === "ru" ? "Вверх" : "Move up",
        exact: true,
      });
      const box = await button.boundingBox();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 },
        ],
      });
      await page.waitForTimeout(800);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp.detach();
    } else {
      await page.keyboard.down("ArrowUp");
      await page.waitForTimeout(800);
      await page.keyboard.up("ArrowUp");
    }
    await page.waitForTimeout(1000);
    const moved = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("save-slot:moss-signal:v2")),
    );
    ok(
      moved.y < 16.5,
      `${label}: ${width < 701 ? "touch pad" : "keyboard"} moves`,
    );
    await page.locator(".game-actions .secondary").nth(1).click();
    await page.waitForTimeout(200);
    ok(
      await page
        .locator(".app")
        .evaluate((e) => e.classList.contains("large-mode")),
      `${label}: enlarge`,
    );
    await page.keyboard.press("Escape");
    ok(
      !(await page
        .locator(".app")
        .evaluate((e) => e.classList.contains("large-mode"))),
      `${label}: exit enlarged view`,
    );
    await page.screenshot({ path: `${dir}/${label}-game.png`, fullPage: true });
    out.screens.push(`${label}-game.png`);
    await page.locator(".game-actions .text-button").click();
    await page.locator(".restart-dialog .secondary").click();
    ok(
      !(await page.locator(".restart-dialog").isVisible()),
      `${label}: cancel restart preserves game`,
    );
    await page.locator(".backbar .back").click();
    await page.waitForFunction(
      () => document.querySelector(".app").dataset.stage === "shelf",
    );
    await page.waitForTimeout(100);
    ok(
      (await page
        .locator(".world-picks")
        .getByRole("button", { name: "MOSS SIGNAL", exact: true })
        .getAttribute("aria-pressed")) === "true",
      `${label}: returns own box`,
    );
    await page.waitForTimeout(450);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    ok(
      audit.violations.length === 0,
      `${label}: axe shelf ${JSON.stringify(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })))}`,
    );
    await context.close();
  }
  // Reduced motion has no forced decorative wait, and model failure is recoverable via light view.
  for (const mode of ["reduced", "model-failure", "artwork-retry"]) {
    const context = await browser.newContext({
      viewport: { width: 1000, height: 800 },
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => out.errors.push(e.message));
    if (mode === "model-failure")
      await p.route("**/*.glb*", (route) => route.abort());
    if (mode === "artwork-retry")
      await p.route("**/moss-cover.webp", (route) => route.abort());
    const start = Date.now();
    await p.goto(url);
    if (mode === "artwork-retry") {
      await p
        .getByRole("button", { name: "Retry loading", exact: true })
        .waitFor();
      ok(
        await p.locator(".boot-intro").isVisible(),
        "image load failure remains recoverable",
      );
      await p.unroute("**/moss-cover.webp");
      await p
        .getByRole("button", { name: "Retry loading", exact: true })
        .click();
    }
    await p.locator(".boot-intro").waitFor({ state: "hidden", timeout: 30000 });
    if (mode === "reduced") {
      const elapsed = Date.now() - start;
      ok(
        elapsed < 3000,
        `reduced motion ready in ${elapsed}ms without decorative minimum`,
      );
    }
    if (mode === "model-failure")
      ok(
        await p
          .locator(".app")
          .evaluate((e) => e.classList.contains("light-mode")),
        "GLB failure opens usable light view",
      );
    if (mode === "artwork-retry")
      ok(
        (await p.locator(".scene").getAttribute("data-resource-ready")) ===
          "true",
        "asset retry restores fully prepared scene",
      );
    await context.close();
  }
  ok(out.errors.length === 0, `No page errors: ${out.errors.join(";")}`);
} catch (e) {
  out.failure = String(e);
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync(
    `${dir}/interaction-matrix.json`,
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}
