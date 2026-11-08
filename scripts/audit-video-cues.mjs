import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

// Review recorded pixels, never replay or modify game state. Clock-based overlay
// observations are approximate because Playwright's encoder has its own PTS.
const out = process.env.AUDIT_OUT;
if (!out)
  throw Error("Set AUDIT_OUT to the completed audit evidence directory");
const report = JSON.parse(
  fs.readFileSync(path.join(out, "report.json"), "utf8"),
);
const videoPath = path.resolve(out, "touch-uncut.webm");
const clockOverrides = JSON.parse(process.env.CUE_CLOCK_OVERRIDES || "{}");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const cues = {
  video: videoPath,
  method:
    "Seek and inspect decoded uncut video pixels. Locate first blue victory-overlay button near the independently observed victory event; verify adjacent extracted frames.",
  searchClockOverrides: clockOverrides,
  games: [],
};
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(videoPath).href);
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
  );
  cues.metadata = await page.locator("video").evaluate((v) => {
    v.pause();
    v.controls = false;
    return { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
  });
  const seek = async (time) => {
    await page.locator("video").evaluate(
      (v, time) =>
        new Promise((resolve) => {
          v.addEventListener("seeked", () => resolve(), { once: true });
          v.currentTime = time;
        }),
      time,
    );
    // Inspect an ordinary screenshot. Do not relax file-origin/browser security
    // settings to make a local-video canvas readable.
    const { data, info } = await sharp(await page.locator("video").screenshot())
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let blue = 0;
    for (let y = 130; y < 360; y++)
      for (let x = 30; x < 360; x++) {
        const i = (y * info.width + x) * 4;
        if (
          data[i] < 70 &&
          data[i + 1] > 25 &&
          data[i + 1] < 125 &&
          data[i + 2] > 210
        )
          blue++;
      }
    return { blue, currentTime: time };
  };
  for (const run of report.runs.filter((r) => r.mode === "touch" && r.passed)) {
    const searchClock = clockOverrides[run.id] ?? run.videoWinSeconds;
    let lo = Math.max(0, searchClock - 1),
      hi = searchClock + 2;
    if ((await seek(lo)).blue > 500)
      throw Error(run.id + ": lower cue already contains overlay");
    if ((await seek(hi)).blue <= 500)
      throw Error(run.id + ": upper cue lacks overlay");
    while (hi - lo > 0.025) {
      const mid = (lo + hi) / 2;
      if ((await seek(mid)).blue > 500) hi = mid;
      else lo = mid;
    }
    const cue = {
      id: run.id,
      observedClockSeconds: run.videoWinSeconds,
      searchClockSeconds: searchClock,
      screenshotCapturedClockSeconds: run.videoWinCapturedSeconds,
      firstOverlayFrameSeconds: Number(hi.toFixed(3)),
      previousNonOverlayFrameSeconds: Number(lo.toFixed(3)),
      recommendedExcerptStartSeconds: Number((hi - 7).toFixed(3)),
      recommendedExcerptEndSeconds: Number((hi + 3).toFixed(3)),
    };
    await seek(hi - 1);
    await page
      .locator("video")
      .screenshot({ path: path.join(out, run.id + "-video-before-win.png") });
    await seek(hi + 0.16);
    await page
      .locator("video")
      .screenshot({ path: path.join(out, run.id + "-video-win.png") });
    cues.games.push(cue);
    console.log(JSON.stringify(cue));
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    path.join(out, "video-cues.json"),
    JSON.stringify(cues, null, 2),
  );
}
