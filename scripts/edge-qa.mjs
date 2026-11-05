import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const b = await chromium.launch({ channel: "chrome", headless: true });
const checks = [];
const errors = [];
const url = process.env.TEST_URL || "http://localhost:4197/";
const ok = (v, n) => {
  if (!v) throw Error(n);
  checks.push(n);
};
try {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(url);
  await p.getByRole("button", { name: "About", exact: true }).click();
  ok(await p.locator("dialog[open]").isVisible(), "about opens as modal");
  await p.keyboard.press("Escape");
  ok(
    await p
      .getByRole("button", { name: "About", exact: true })
      .evaluate((e) => e === document.activeElement),
    "Escape restores dialog focus",
  );
  await c.route("**/console.glb", (r) => r.abort());
  await p.getByRole("button", { name: "MOSS SIGNAL", exact: true }).click();
  await p.getByRole("button", { name: /OPEN BOX/ }).click();
  await p.locator(".light-mode").waitFor();
  await p.getByRole("button", { name: "INSERT & START", exact: true }).click();
  ok(
    await p.locator(".game-region canvas").isVisible(),
    "failed model still allows Canvas game",
  );
  await c.unroute("**/console.glb");
  await p.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await p.locator(".app:not(.light-mode)").waitFor();
  await p.waitForTimeout(1700);
  ok(
    (await p.locator(".app").getAttribute("data-stage")) === "inserted",
    "3D recovery preserves insertion and selected game",
  );
  ok(
    (await p.locator(".scene canvas").count()) === 1,
    "recovery leaves one renderer",
  );
  const a = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  checks.push({
    gameA11y: a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  await p.keyboard.down("ArrowUp");
  await p.waitForTimeout(650);
  await p.keyboard.up("ArrowUp");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(100);
  const saved = await p.evaluate(() =>
    JSON.parse(sessionStorage.getItem("save-slot:moss:v1")),
  );
  ok(saved.y < 16.2, "actual movement is persisted");
  await p.reload();
  await p.getByRole("button", { name: "INSERT & START", exact: true }).click();
  await p.keyboard.press("Escape");
  const restored = await p.evaluate(() =>
    JSON.parse(sessionStorage.getItem("save-slot:moss:v1")),
  );
  ok(Math.abs(saved.y - restored.y) < 0.2, "reload preserves robot position");
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(300);
  ok(
    (await p.locator(".app").getAttribute("data-stage")) === "inserted",
    "orientation change preserves game",
  );
  await p
    .getByRole("button", { name: /Back to shelf/ })
    .first()
    .click();
  await p.waitForTimeout(1600);
  for (const name of [
    "DUSK DELIVERY",
    "ORBIT ZERO",
    "MOSS SIGNAL",
    "TIDEBOUND",
    "EMBER VAULT",
    "SNOWBYTE",
  ]) {
    await p.getByRole("button", { name, exact: true }).click();
    await p.getByRole("button", { name: /OPEN BOX/ }).click();
    await p.getByRole("heading", { name, exact: true }).waitFor();
    ok(
      await p
        .locator(".world-heading")
        .innerText()
        .then((t) => t.includes(name)),
      name + " has matching content",
    );
    await p
      .getByRole("button", { name: /Back to shelf/ })
      .first()
      .click();
    await p.waitForTimeout(1550);
  }
  await c.close();
} finally {
  await b.close();
  fs.writeFileSync(
    "evidence/edge-qa.json",
    JSON.stringify({ url, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }, null, 2));
}
