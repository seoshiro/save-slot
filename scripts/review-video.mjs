import { spawnSync } from "node:child_process";
import fs from "node:fs";
import sharp from "sharp";
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const times = [0, 1, 2, 3, 4, 5, 8, 15, 24, 30, 33, 36];
await fs.promises.mkdir("evidence/frames", { recursive: true });
const layers = [];
for (let i = 0; i < times.length; i++) {
  const output = `evidence/frames/frame-${i}.png`;
  const r = spawnSync(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    String(times[i]),
    "-i",
    "evidence/desktop-full-scenario.webm",
    "-frames:v",
    "1",
    "-vf",
    "scale=480:-1",
    output,
  ]);
  if (r.status) throw Error(String(r.stderr));
  layers.push({
    input: output,
    left: (i % 4) * 480,
    top: Math.floor(i / 4) * 334,
  });
}
await sharp({
  create: { width: 1920, height: 1002, channels: 3, background: "#eee6d7" },
})
  .composite(layers)
  .png()
  .toFile("evidence/desktop-contact-sheet.png");
