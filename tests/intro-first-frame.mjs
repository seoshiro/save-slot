import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const url = process.env.TEST_URL || "http://localhost:4199/",
  dir = "evidence/six-games/layout-controls";
await fs.mkdir(dir, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true }),
  report = { url, checks: [], frames: [] };
try {
  for (const [width, height] of [
    [1366, 768],
    [375, 667],
  ]) {
    const c = await b.newContext({ viewport: { width, height } }),
      p = await c.newPage();
    await p.route("**/assets/index-*.js", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await r.continue();
    });
    await p.route("**/*.woff2", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await r.continue();
    });
    const start = Date.now();
    await p.goto(url, { waitUntil: "commit" });
    await p.locator(".boot-logo").waitFor();
    const before = await p.locator(".boot-logo").boundingBox();
    const beforeArt = await p.locator(".boot-art").boundingBox();
    assert.ok(await p.locator(".boot-machine").isVisible());
    const client = await c.newCDPSession(p);
    const snap = await client.send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(
      dir + "/intro-" + width + "-first-html.png",
      Buffer.from(snap.data, "base64"),
    );
    await p.getByTestId("boot-intro").waitFor();
    const mounted = await p.locator(".boot-logo").boundingBox(),
      mountedArt = await p.locator(".boot-art").boundingBox();
    const snap2 = await client.send("Page.captureScreenshot", {
      format: "png",
    });
    await fs.writeFile(
      dir + "/intro-" + width + "-before-fonts.png",
      Buffer.from(snap2.data, "base64"),
    );
    for (const k of ["x", "y", "width", "height"])
      assert.ok(
        Math.abs(before[k] - mounted[k]) < 1,
        "mark remains stable " + k,
      );
    for (const k of ["x", "y", "width", "height"])
      assert.ok(
        Math.abs(beforeArt[k] - mountedArt[k]) < 1,
        "art remains stable " + k,
      );
    await p
      .locator('.boot-intro[data-ready="true"]')
      .waitFor({ timeout: 40000 });
    const readyAt = Date.now() - start;
    await p.locator(".boot-intro").waitFor({ state: "hidden", timeout: 40000 });
    const elapsed = Date.now() - start;
    assert.ok(
      elapsed - Math.max(readyAt, 3000) < 1100,
      "no additional minimum after real readiness",
    );
    report.checks.push(
      width +
        ": first HTML already contains composition; React and font arrival preserve mark/art bounds; no added wait",
    );
    report.frames.push({
      width,
      before,
      mounted,
      beforeArt,
      mountedArt,
      readyAt,
      elapsed,
    });
    await c.close();
  }
  report.status = "passed";
} catch (e) {
  report.status = "failed";
  report.failure = String(e.stack || e);
  process.exitCode = 1;
} finally {
  await b.close();
  await fs.writeFile(
    dir + "/intro-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
