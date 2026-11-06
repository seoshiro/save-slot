import { chromium } from "@playwright/test";
import fs from "node:fs";
import { createHash } from "node:crypto";
const url = process.env.TEST_URL || "https://seoshiro.github.io/save-slot/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { url, at: new Date().toISOString(), checks: [], errors: [] };
const ok = (v, n) => {
  if (!v) throw Error(n);
  report.checks.push(n);
};
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("pageerror", (e) => report.errors.push(e.message));
  const asset = new Promise((res, rej) =>
    p.on("response", async (r) => {
      if (new URL(r.url()).pathname.endsWith("/console.glb")) {
        try {
          const raw = await r.body();
          res({
            url: r.url(),
            status: r.status(),
            bytes: raw.length,
            sha256: createHash("sha256")
              .update(raw)
              .digest("hex")
              .toUpperCase(),
            gitBlob: createHash("sha1")
              .update(`blob ${raw.length}\0`)
              .update(raw)
              .digest("hex"),
          });
        } catch (e) {
          rej(e);
        }
      }
    }),
  );
  await p.goto(url);
  await p.getByRole("button", { name: "MOSS SIGNAL", exact: true }).click();
  await p.getByRole("button", { name: /OPEN BOX/ }).click();
  await p.locator(".world-info.arrived").waitFor();
  report.asset = await asset;
  const local = createHash("sha256")
    .update(fs.readFileSync("public/media/console.glb"))
    .digest("hex")
    .toUpperCase();
  ok(
    report.asset.sha256 === local,
    "Actual browser GLB matches cleaned local GLB by SHA256",
  );
  ok(
    report.asset.gitBlob === "9d3abcec543fb2974cc852d1780c3e52ead29c8d",
    "Actual browser GLB matches confirmed Git blob",
  );
  ok(report.asset.bytes === 1003836, "Actual browser GLB is 1,003,836 bytes");
  await p.screenshot({ path: "evidence/console-angle-public.png" });
  await p.getByRole("button", { name: "INSERT & START", exact: true }).click();
  await p.waitForTimeout(320);
  await p.screenshot({ path: "evidence/console-cartridge-public.png" });
  await p.locator(".game-region").waitFor({ state: "visible" });
  await p.waitForTimeout(150);
  await p.screenshot({ path: "evidence/console-front-public.png" });
  ok(
    (await p.locator(".scene canvas").count()) === 1,
    "One WebGL scene through opening and insertion",
  );
  await p
    .getByRole("button", { name: /Back to shelf/ })
    .first()
    .click();
  await p.waitForTimeout(1700);
  ok(
    (await p.locator(".app").getAttribute("data-stage")) === "shelf",
    "Cleaned console returns to shelf",
  );
  report.browser = await browser.version();
  report.viewport = "1440x1000";
  report.headless = true;
} finally {
  await browser.close();
  fs.writeFileSync(
    "evidence/clean-model-qa.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
