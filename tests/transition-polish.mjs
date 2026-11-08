import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { spawn } from "node:child_process";
import { once } from "node:events";

const url = process.env.TEST_URL || "http://127.0.0.1:4198/";
const dir = process.env.EVIDENCE_DIR || "evidence/transition-polish";
const sizes = (
  process.env.VIEWPORTS || "1366x768,1536x776,375x667,390x844,1366x600"
)
  .split(",")
  .map((s) => s.split("x").map(Number));
const langs = (process.env.LANGUAGES || "ru,en").split(",");
await fs.mkdir(dir, { recursive: true });
const report = {
  url,
  at: new Date().toISOString(),
  conditions:
    "Chrome Windows, DPR1, desktop and touch-emulated CSS viewports; raw uncut page video capture is requested before navigation and may include browser about:blank. Inspect actual frame0 separately; first-document screenshot and paint timing tracked separately.",
  limits:
    "Pixel captures and video require human review for opaque 3D surfaces and shadow coherence; DOM assertions do not prove these.",
  runs: [],
};
if (process.env.DOCUMENT_RECORDING)
  report.conditions =
    "Chrome Windows DPR1. CDP capture starts after HTTP commit, stable viewport and verified inline intro. Continuous captured frames thereafter, no trimming/cropping. Encoding uses an adaptive fixed timebase with timestamp-derived held frames; encodedFrameRate is not measured capture/rendering fps. Earliest app paint is tested independently.";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const settled = (p, n) =>
  p.locator(`.app[data-settled="${n}"]`).waitFor({ timeout: 30000 });
const assert = (run, ok, label) => {
  run.checks.push({ label, pass: !!ok });
  if (!ok) throw Error(label);
};
async function startDocumentRecording(context, p, width, height, run) {
  const client = await context.newCDPSession(p),
    frames = [];
  const start = await p.evaluate(() => ({
    time: performance.now(),
    url: location.href,
    width: innerWidth,
    height: innerHeight,
    logo: !!document.querySelector(".boot-logo"),
  }));
  assert(
    run,
    start.width === width && start.height === height && start.logo,
    "CDP recording starts on HTTP intro at requested viewport",
  );
  client.on("Page.screencastFrame", (event) => {
    frames.push({
      data: Buffer.from(event.data, "base64"),
      timestamp: event.metadata.timestamp,
      width: event.metadata.deviceWidth,
      height: event.metadata.deviceHeight,
    });
    client
      .send("Page.screencastFrameAck", { sessionId: event.sessionId })
      .catch(() => {});
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 94,
    maxWidth: width,
    maxHeight: height,
    everyNthFrame: 1,
  });
  run.captureStart = {
    ...start,
    method:
      "CDP Page.startScreencast started after HTTP commit, stable viewport and first inline-intro screenshot. Continuous thereafter; no captured frames trimmed. JPEG frames encoded with holds from CDP timestamps. App earliest paint tested independently.",
  };
  return async (file) => {
    await client.send("Page.stopScreencast");
    assert(
      run,
      frames.length > 1,
      "Document recording captured multiple frames",
    );
    await fs.writeFile(file + ".first.jpg", frames[0].data);
    let fps = 60;
    const duration = frames.at(-1).timestamp - frames[0].timestamp;
    for (const rate of [60, 120, 240, 480]) {
      let count = 0;
      for (let i = 0; i < frames.length; i++) {
        const end =
          i + 1 < frames.length
            ? frames[i + 1].timestamp
            : frames[i].timestamp + 1 / rate;
        count = Math.max(
          count + 1,
          Math.round((end - frames[0].timestamp) * rate),
        );
      }
      fps = rate;
      if (Math.abs(count / rate - duration) <= 2 / rate) break;
    }
    const frameDir = file + ".frames";
    await fs.mkdir(frameDir, { recursive: true });
    for (let i = 0; i < frames.length; i++)
      await fs.writeFile(
        path.join(frameDir, String(i).padStart(5, "0") + ".jpg"),
        frames[i].data,
      );
    await fs.writeFile(
      file + ".timestamps.json",
      JSON.stringify(
        {
          fps,
          frames: frames.map(({ timestamp, width, height }) => ({
            timestamp,
            width,
            height,
          })),
        },
        null,
        2,
      ),
    );
    const encoder =
      process.env.FFMPEG_PATH ||
      path.join(
        process.env.USERPROFILE,
        "AppData",
        "Local",
        "ms-playwright",
        "ffmpeg-1013",
        "ffmpeg-win64.exe",
      );
    const proc = spawn(
      encoder,
      [
        "-y",
        "-f",
        "image2pipe",
        "-r",
        String(fps),
        "-c:v",
        "mjpeg",
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libvpx-vp9",
        "-deadline",
        "realtime",
        "-cpu-used",
        "4",
        "-b:v",
        "0",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        file,
      ],
      { windowsHide: true },
    );
    let errors = "";
    proc.stderr.on("data", (d) => (errors += d.toString()));
    proc.stdin.on("error", (e) => {
      errors += "\n" + e.message;
    });
    const done = once(proc, "close");
    let written = 0;
    for (let i = 0; i < frames.length; i++) {
      const end =
        i + 1 < frames.length
          ? frames[i + 1].timestamp
          : frames[i].timestamp + 1 / fps;
      const target = Math.max(
        written + 1,
        Math.round((end - frames[0].timestamp) * fps),
      );
      while (written < target) {
        if (!proc.stdin.write(frames[i].data)) await once(proc.stdin, "drain");
        written++;
      }
    }
    proc.stdin.end();
    const [code] = await done;
    if (code) throw Error("CDP video encoding failed: " + errors.slice(-1800));
    run.captureSummary = {
      sourceFrames: frames.length,
      encodedFrames: written,
      encodedFrameRate: fps,
      sourceDurationSeconds: duration,
      encodedDurationSeconds: written / fps,
      firstFrameViewport: { width: frames[0].width, height: frames[0].height },
    };
    assert(
      run,
      Math.abs(written / fps - duration) <= 2 / fps,
      "Encoded duration follows CDP timestamps within two timebase frames; no cumulative slowdown",
    );
  };
}
async function capture(p, r, name) {
  const file = path.join(dir, `${r.label}-${name}.png`);
  const screenshot =
    !process.env.CLEAN_RECORDING || name === "first-http-document";
  if (screenshot) await p.screenshot({ path: file });
  const metrics = await p.evaluate(() => {
    const read = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    return {
      canvas: read(".scene canvas"),
      gameRegion: read(".game-region"),
      info: read(".world-info"),
      sceneOpen: getComputedStyle(
        document.querySelector(".main") || document.body,
      ).getPropertyValue("--scene-open"),
      scenePlay: getComputedStyle(
        document.querySelector(".main") || document.body,
      ).getPropertyValue("--scene-play"),
      scrollY,
      time: performance.now(),
    };
  });
  r.frames.push({ name, ...(screenshot ? { file } : {}), ...metrics });
}
async function directClick(p, r, selector, label) {
  const data = await p.locator(selector).evaluate((el) => {
    const b = el.getBoundingClientRect(),
      x = b.x + b.width / 2,
      y = b.y + b.height / 2,
      t = document.elementFromPoint(x, y);
    let a = 1;
    for (let n = el; n; n = n.parentElement)
      a *= Number(getComputedStyle(n).opacity);
    return {
      x,
      y,
      hit: !!t && (el === t || el.contains(t)),
      inside:
        b.x >= 0 &&
        b.y >= 0 &&
        b.right <= innerWidth &&
        b.bottom <= innerHeight,
      opacity: a,
    };
  });
  assert(
    r,
    data.inside && data.hit && data.opacity > 0.5,
    label + " directly visible/clickable without scrolling",
  );
  await p.mouse.click(data.x, data.y);
}
async function transition(p, r, name, action, target) {
  let t = Date.now();
  await action();
  for (const ms of [100, 260, 440, 650, 850]) {
    await p.waitForTimeout(Math.max(0, ms - (Date.now() - t)));
    await capture(p, r, `${name}-${ms}ms`);
  }
  await settled(p, target);
  await capture(p, r, `${name}-settled`);
}
async function instrument(p, lang) {
  await p.addInitScript((l) => {
    localStorage.setItem("save-slot:lang", l);
    window.__handoff = [];
    const rect = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      let alpha = 1;
      for (let n = e; n; n = n.parentElement) {
        const c = getComputedStyle(n);
        alpha *= +c.opacity;
        if (c.visibility === "hidden" || c.display === "none") alpha = 0;
      }
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, alpha };
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now(),
        gap = now - last;
      last = now;
      const a = rect(".hero-copy"),
        b = rect(".backbar");
      if (a && b) {
        const area =
          Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) *
          Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
        window.__handoff.push({
          time: now,
          gap,
          stage: document.querySelector(".app")?.dataset.stage,
          sceneOpen: getComputedStyle(
            document.querySelector(".main"),
          ).getPropertyValue("--scene-open"),
          hero: a.alpha,
          back: b.alpha,
          area,
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, lang);
}
try {
  for (const [width, height] of sizes)
    for (const lang of langs) {
      const r = {
        label: `${width}x${height}-${lang}`,
        checks: [],
        frames: [],
        errors: [],
        consoleErrors: [],
      };
      report.runs.push(r);
      const c = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        hasTouch: width < 701,
        reducedMotion: process.env.REDUCED_MOTION ? "reduce" : "no-preference",
        ...(!process.env.DOCUMENT_RECORDING
          ? {
              recordVideo: {
                dir: path.join(dir, "raw"),
                size: { width, height },
              },
            }
          : {}),
      });
      const p = await c.newPage(),
        video = p.video();
      let finishDocumentRecording;
      p.on("pageerror", (e) => r.errors.push(e.message));
      p.on("console", (m) => {
        if (
          m.type() === "error" ||
          /shader.*error|framebuffer.*incomplete/i.test(m.text())
        )
          r.consoleErrors.push(m.text());
      });
      try {
        await instrument(p, lang);
        const t = Date.now();
        await p.goto(url, { waitUntil: "commit" });
        r.httpCommittedMs = Date.now() - t;
        await p.locator(".boot-logo").waitFor();
        await capture(p, r, "first-http-document");
        const raw = await sharp(r.frames.at(-1).file)
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        let white = 0;
        for (let i = 0; i < raw.data.length; i += raw.info.channels)
          if (
            raw.data[i] > 245 &&
            raw.data[i + 1] > 245 &&
            raw.data[i + 2] > 245
          )
            white++;
        r.firstDocumentWhiteFraction = white / (width * height);
        assert(
          r,
          r.firstDocumentWhiteFraction < 0.6,
          "First captured HTTP document is not a white screen",
        );
        r.paintEntries = await p.evaluate(() =>
          performance
            .getEntriesByType("paint")
            .map((x) => ({ name: x.name, startTime: x.startTime })),
        );
        if (process.env.DOCUMENT_RECORDING)
          finishDocumentRecording = await startDocumentRecording(
            c,
            p,
            width,
            height,
            r,
          );
        await p
          .locator(".boot-intro")
          .waitFor({ state: "hidden", timeout: 45000 });
        if (!process.env.FALLBACK)
          await p
            .locator('.scene[data-resource-ready="true"]')
            .waitFor({ timeout: 45000 });
        await p
          .locator(".world-picks")
          .getByRole("button", { name: "ORBIT ZERO", exact: true })
          .click();
        await p.waitForTimeout(750);
        await capture(p, r, "shelf");
        await transition(
          p,
          r,
          "open",
          () => directClick(p, r, "[data-open-box]", "Open ORBIT"),
          1,
        );
        await transition(
          p,
          r,
          "insert",
          () => directClick(p, r, ".insert-button", "Insert ORBIT"),
          2,
        );
        await p.keyboard.down("ArrowUp");
        await p.waitForTimeout(300);
        await p.keyboard.up("ArrowUp");
        const enlarge = p.getByRole("button", {
          name: lang === "ru" ? "Увеличить экран игры" : "Larger game screen",
          exact: true,
        });
        await enlarge.click();
        await p.locator(".app.large-mode").waitFor();
        await p.waitForTimeout(1000);
        await capture(p, r, "actually-enlarged");
        const game = await p.locator(".game-region").evaluate((el) => {
          const b = el.getBoundingClientRect();
          return {
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            right: b.right,
            bottom: b.bottom,
            canvas: !!el.querySelector("canvas"),
          };
        });
        r.enlargedGame = game;
        assert(
          r,
          game.canvas &&
            game.width > 0 &&
            game.height > 0 &&
            game.x >= 0 &&
            game.y >= 0 &&
            game.right <= width + 1 &&
            game.bottom <= height + 1,
          "Enlarged canvas is inside viewport",
        );
        const info = await p.locator(".world-info").boundingBox();
        const area = info
          ? Math.max(
              0,
              Math.min(game.right, info.x + info.width) -
                Math.max(game.x, info.x),
            ) *
            Math.max(
              0,
              Math.min(game.bottom, info.y + info.height) -
                Math.max(game.y, info.y),
            )
          : 0;
        assert(
          r,
          area < 1,
          "Enlarged game canvas does not overlap HTML information/controls",
        );
        assert(
          r,
          (await p.locator(".app.large-mode").count()) === 1,
          "Still enlarged immediately before Back",
        );
        await transition(
          p,
          r,
          "enlarged-return",
          () => directClick(p, r, ".backbar .back", "Back while enlarged"),
          0,
        );
        assert(
          r,
          (await p.locator(".app.large-mode").count()) === 0,
          "Back clears enlarged mode",
        );
        assert(
          r,
          await p.evaluate(() => scrollY === 0),
          "Back resets scroll to top",
        );
        if (!process.env.SHORT_RECORDING) {
          await directClick(
            p,
            r,
            "[data-open-box]",
            "Reopen after enlarged Back",
          );
          await p.waitForTimeout(80);
          await p.keyboard.press("Escape");
          await settled(p, 0);
          await directClick(p, r, "[data-open-box]", "Open again");
          await settled(p, 1);
          await directClick(p, r, ".insert-button", "Play again");
          await p.waitForTimeout(80);
          await directClick(
            p,
            r,
            ".backbar .back",
            "Interrupt insertion with Back",
          );
          await settled(p, 0);
          await directClick(p, r, "[data-open-box]", "Final reopen");
          await settled(p, 1);
          await directClick(p, r, ".insert-button", "Final play");
          await settled(p, 2);
          const toggle = p.locator(".game-actions .secondary").nth(1);
          for (let i = 0; i < 3; i++) {
            await toggle.click();
            await p.waitForTimeout(50);
          }
          assert(
            r,
            (await p.locator(".app.large-mode").count()) === 1,
            "Rapid enlarge/shrink/enlarge preserves latest intent",
          );
          await directClick(p, r, ".backbar .back", "Rapid enlarged Back");
          await settled(p, 0);
          await directClick(p, r, "[data-open-box]", "Recovery open");
          await settled(p, 1);
          await directClick(p, r, ".insert-button", "Recovery play");
          await settled(p, 2);
          assert(
            r,
            (await p.locator(".game-region").isVisible()) &&
              (await p.locator(".game-region canvas").count()) === 1 &&
              (process.env.FALLBACK ||
                (await p.locator(".scene canvas").isVisible())),
            "Projected game region and source canvas recover after rapid enlarged return",
          );
          await toggle.click();
          assert(
            r,
            await p.locator(".game-region canvas").isVisible(),
            "Standalone canvas recovers on re-enlarge",
          );
          await capture(p, r, "recovered-enlarged");
          await directClick(p, r, ".backbar .back", "Recovery Back");
          await settled(p, 0);
          await capture(p, r, "quick-actions-recovered");
        }
        const baseline = process.env.FALLBACK
          ? null
          : JSON.parse(
              await fs.readFile(
                "evidence/composition-public/report.json",
                "utf8",
              ),
            ).runs.find((v) => v.label === r.label);
        r.endpointComparisons = [];
        if (baseline)
          for (const [current, prior] of [
            ["shelf", "orbit-shelf"],
            ["open-settled", "orbit-open-settled"],
            ["insert-settled", "orbit-insert-settled"],
            ["enlarged-return-settled", "orbit-return-settled"],
          ]) {
            const a = r.frames.find((f) => f.name === current),
              b = baseline.frames.find((f) => f.name === prior);
            if (!a || !b) continue;
            for (const key of ["canvas", "gameRegion"])
              if (a[key] && b[key]) {
                const deltas = Object.fromEntries(
                  ["x", "y", "width", "height"].map((k) => [
                    k,
                    Math.abs(a[key][k] - b[key][k]),
                  ]),
                );
                r.endpointComparisons.push({ current, prior, key, deltas });
                assert(
                  r,
                  Object.values(deltas).every((d) => d <= 2),
                  `${current}: accepted ${key} endpoint unchanged within 2px`,
                );
              }
          }
        r.handoff = await p.evaluate(() => window.__handoff);
        const overlap = r.handoff.filter(
          (s) => s.hero > 0.025 && s.back > 0.025 && s.area > 1,
        );
        r.overlapSamples = overlap;
        r.largestRafGaps = r.handoff
          .toSorted((a, b) => b.gap - a.gap)
          .slice(0, 8);
        assert(
          r,
          !overlap.length,
          "No visible top heading/Back overlap in dense rAF samples",
        );
        assert(r, !r.errors.length, "No browser page errors");
        assert(
          r,
          !r.consoleErrors.length,
          "No console/shader/framebuffer errors",
        );
      } catch (e) {
        r.failure = String(e.stack || e);
        r.failureState = await p
          .evaluate(() => ({
            app: document.querySelector(".app")?.outerHTML.slice(0, 700),
            url: location.href,
            scrollY,
          }))
          .catch(() => null);
        await capture(p, r, "failure").catch(() => {});
      } finally {
        r.video = path.join(dir, r.label + "-continuous.webm");
        if (finishDocumentRecording) await finishDocumentRecording(r.video);
        await c.close();
        if (video) await video.saveAs(r.video);
      }
      console.log(r.label, r.failure ? "FAIL " + r.failure : "PASS");
      await fs.writeFile(
        path.join(dir, "report.json"),
        JSON.stringify(report, null, 2),
      );
    }
} finally {
  await browser.close();
  report.status = report.runs.some((r) => r.failure) ? "failed" : "passed";
  await fs.writeFile(
    path.join(dir, "report.json"),
    JSON.stringify(report, null, 2),
  );
  if (report.status === "failed") process.exitCode = 1;
}
