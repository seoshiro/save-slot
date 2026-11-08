import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const url = process.env.TEST_URL || "http://localhost:4199/";
const dir = process.env.EVIDENCE_DIR || "evidence/six-games/layout-controls";
await fs.mkdir(dir, { recursive: true });
const report = {
  url,
  at: new Date().toISOString(),
  conditions:
    "Chrome, CSS-pixel viewports, DPR1, 100% browser zoom; mobile viewport plus touch emulation, not physical phones",
  checks: [],
  metrics: [],
  errors: [],
  recordings: [],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ok = (value, message) => {
  assert.ok(value, message);
  report.checks.push(message);
};
const settled = (p, value) =>
  p.locator('.app[data-settled="' + value + '"]').waitFor({ timeout: 30000 });
async function hit(p, selector) {
  return p.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect(),
      x = r.x + r.width / 2,
      y = r.y + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      visible:
        r.width > 0 &&
        r.height > 0 &&
        r.top >= -1 &&
        r.bottom <= innerHeight + 1 &&
        r.left >= -1 &&
        r.right <= innerWidth + 1,
      hit: !!top && (el === top || el.contains(top)),
      x,
      y,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
    };
  });
}
async function scaleText(p) {
  await p.evaluate(() => {
    const bases = window.__textBases || (window.__textBases = new Map());
    for (const [el, value] of bases) el.style.fontSize = value + "px";
    const els = [...document.querySelectorAll(".app *")];
    for (const el of els)
      if (!bases.has(el))
        bases.set(el, parseFloat(getComputedStyle(el).fontSize));
    for (const el of els) el.style.fontSize = bases.get(el) * 2 + "px";
  });
  await p.waitForTimeout(180);
}
async function top(p, label) {
  await p.waitForTimeout(120);
  ok((await p.evaluate(() => scrollY)) === 0, label + ": scroll reset");
}
async function shelf(p, label, height) {
  const c = await hit(p, "[data-open-box]"),
    picks = await hit(p, ".world-picks");
  ok(c.visible && c.hit, label + ": Open clickable without scrolling");
  ok(picks.visible, label + ": cartridge selection visible without scrolling");
  ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    label + ": no horizontal overflow",
  );
  report.metrics.push({ label, ctaBottom: c.bottom, viewportHeight: height });
}
try {
  for (const [width, height] of process.env.TEXT_ONLY
    ? []
    : [
        [1366, 768],
        [1536, 776],
        [375, 667],
        [390, 844],
      ])
    for (const lang of ["en", "ru"]) {
      const label = width + "x" + height + "-" + lang,
        recording = lang === "ru" && (width === 1366 || width === 375);
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        hasTouch: width < 701,
        ...(recording
          ? { recordVideo: { dir: dir + "/raw", size: { width, height } } }
          : {}),
      });
      const p = await context.newPage(),
        video = p.video();
      p.on("pageerror", (e) => report.errors.push(label + ": " + e.message));
      await p.addInitScript(
        (l) => localStorage.setItem("save-slot:lang", l),
        lang,
      );
      await p.goto(url);
      await p
        .locator(".boot-intro")
        .waitFor({ state: "hidden", timeout: 40000 });
      await top(p, label + " entry");
      await shelf(p, label, height);
      if (width < 701) {
        await p.locator(".mobile-about").click();
        ok(
          await p.locator(".about-dialog").isVisible(),
          label + ": About accessible",
        );
        await p.locator(".about-dialog .dialog-close").click();
      }
      for (const name of [
        "SNOWBYTE",
        "DUSK DELIVERY",
        "ORBIT ZERO",
        "SNOWBYTE",
      ]) {
        await p
          .locator(".world-picks")
          .getByRole("button", { name, exact: true })
          .click();
        await p.waitForTimeout(70);
      }
      await p.waitForTimeout(850);
      ok(
        (await p.locator(".app").getAttribute("data-game")) === "snowbyte",
        label + ": rapid selection ends on SNOWBYTE",
      );
      await p.screenshot({
        path: dir + "/" + label + "-shelf.png",
        fullPage: true,
      });
      await p.locator("[data-open-box]").click();
      await settled(p, 1);
      await top(p, label + " open");
      const backOpen = await hit(p, ".backbar .back");
      ok(backOpen.visible && backOpen.hit, label + ": open Back clickable");
      await p.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      await p.locator(".insert-button").click();
      await settled(p, 2);
      await top(p, label + " insert");
      if (width < 701) {
        const down = await hit(p, ".pad-arrowdown");
        ok(
          down.visible && down.hit,
          label + ": complete touch pad accessible without scrolling",
        );
      }
      const screen = await p.locator(".game-region").boundingBox();
      ok(
        screen && screen.height >= (width < 701 ? 130 : 220),
        label + ": playable screen within full-console composition",
      );
      const visualStage = await p.locator(".scene-wrap").boundingBox();
      ok(
        screen.x >= visualStage.x &&
          screen.y >= visualStage.y &&
          screen.x + screen.width <= visualStage.x + visualStage.width &&
          screen.y + screen.height <= visualStage.y + visualStage.height,
        label + ": full game display stays inside visual stage",
      );
      report.metrics.push({ label, normalGameScreen: screen });
      await p.screenshot({
        path: dir + "/" + label + "-play.png",
        fullPage: true,
      });
      if (width < 701) {
        const r = await p.locator(".pad-arrowup").boundingBox();
        const client = await context.newCDPSession(p);
        await client.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }],
        });
        await p.waitForTimeout(350);
        await client.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } else {
        await p.keyboard.down("ArrowUp");
        await p.waitForTimeout(350);
        await p.keyboard.up("ArrowUp");
      }
      await p.locator(".game-actions .secondary").nth(1).click();
      await top(p, label + " enlarge");
      ok(
        await p
          .locator(".app")
          .evaluate((e) => e.classList.contains("large-mode")),
        label + ": enlarged mode entered",
      );
      const back = await hit(p, ".backbar .back"),
        region = await p.locator(".game-region").boundingBox();
      ok(
        back.visible && back.hit,
        label + ": enlarged Back visible and unobstructed",
      );
      ok(region.y >= back.bottom, label + ": canvas stays below Back row");
      await p.screenshot({
        path: dir + "/" + label + "-large.png",
        fullPage: true,
      });
      // Real pointer clicks, with no forced click or scrolling, prove direct return works.
      await p.mouse.click(back.x, back.y);
      await settled(p, 0);
      await top(p, label + " direct return");
      await shelf(p, label + " returned", height);
      ok(
        (await p.locator(".app").getAttribute("data-game")) === "snowbyte",
        label + ": return preserves selection",
      );
      // Interrupt opening, repeat return intent, and then reopen cleanly.
      await p.locator("[data-open-box]").click();
      await p.waitForTimeout(140);
      // Back is intentionally delayed until shelf labels have cleared.
      // The visible header remains an immediate repeated-return target.
      const quick = await hit(p, ".brand");
      await p.mouse.click(quick.x, quick.y, { clickCount: 2, delay: 40 });
      await settled(p, 0);
      await top(p, label + " interrupted return");
      await p.locator("[data-open-box]").click();
      await settled(p, 1);
      await p.locator(".insert-button").click();
      await settled(p, 2);
      for (let i = 0; i < 3; i++) {
        await p.locator(".game-actions .secondary").nth(1).click();
        await p.waitForTimeout(65);
      }
      await top(p, label + " repeated enlarge");
      ok(
        await p
          .locator(".app")
          .evaluate((e) => e.classList.contains("large-mode")),
        label + ": latest repeated enlarge intent wins",
      );
      const finalBack = await hit(p, ".backbar .back");
      ok(
        finalBack.visible && finalBack.hit,
        label + ": repeated enlarged Back stays usable",
      );
      await p.mouse.click(finalBack.x, finalBack.y);
      await settled(p, 0);
      await top(p, label + " final return");
      ok(
        !(await p.locator(".boot-intro").count()),
        label + ": intro does not repeat",
      );
      await context.close();
      if (recording) {
        const file = dir + "/" + label + "-continuous.webm";
        await video.saveAs(file);
        report.recordings.push(file);
      }
    }
  // Simulate 200% text-only enlargement, not page zoom: scrolling is allowed.
  for (const [width, height, lang] of [
    [375, 667, "ru"],
    [1366, 768, "en"],
  ]) {
    const label = width + "x" + height + "-" + lang + "-text200";
    const c = await browser.newContext({ viewport: { width, height } }),
      p = await c.newPage();
    p.on("pageerror", (e) => report.errors.push(label + ": " + e.message));
    await p.addInitScript(
      (l) => localStorage.setItem("save-slot:lang", l),
      lang,
    );
    await p.goto(url);
    await p.locator(".boot-intro").waitFor({ state: "hidden" });
    await scaleText(p);
    await p.waitForTimeout(300);
    await p.locator("[data-open-box]").scrollIntoViewIfNeeded();
    const cta = await hit(p, "[data-open-box]");
    ok(
      cta.visible && cta.hit,
      label + ": Open remains reachable after scrolling",
    );
    await p.locator("[data-open-box]").click();
    await settled(p, 1);
    await top(p, label + " open");
    await scaleText(p);
    const back = await hit(p, ".backbar .back");
    ok(back.visible && back.hit, label + ": Back remains reachable");
    await p.locator(".insert-button").scrollIntoViewIfNeeded();
    const insert = await hit(p, ".insert-button");
    console.log(label, insert);
    await p.screenshot({
      path: dir + "/" + label + "-insert.png",
      fullPage: true,
    });
    ok(insert.visible && insert.hit, label + ": Insert remains reachable");
    await p.locator(".insert-button").click();
    await settled(p, 2);
    await scaleText(p);
    for (const selector of [
      ".game-actions .secondary:first-child",
      ".game-actions .text-button",
    ]) {
      await p.locator(selector).scrollIntoViewIfNeeded();
      const control = await hit(p, selector);
      ok(
        control.visible && control.hit,
        label + ": " + selector + " reachable",
      );
    }
    await p.locator(".game-actions .secondary").nth(1).click();
    await scaleText(p);
    await top(p, label + " enlarge");
    const largeBack = await hit(p, ".backbar .back");
    ok(
      largeBack.visible && largeBack.hit,
      label + ": enlarged Back remains reachable",
    );
    await p.screenshot({ path: dir + "/" + label + ".png", fullPage: true });
    await c.close();
  }
  ok(report.errors.length === 0, "No browser page errors");
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(dir + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
