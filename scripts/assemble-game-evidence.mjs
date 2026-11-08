import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { once } from "node:events";
const manifestPath = process.argv[2];
if (!manifestPath)
  throw Error("Usage: node scripts/assemble-game-evidence.mjs manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const ffmpeg =
  process.env.FFMPEG_PATH ||
  path.join(
    process.env.LOCALAPPDATA,
    "ms-playwright",
    "ffmpeg-1013",
    "ffmpeg-win64.exe",
  );
const output = path.resolve(manifest.output),
  width = manifest.width || 1366,
  height = manifest.height || 900,
  fps = 25;
fs.mkdirSync(path.dirname(output), { recursive: true });
const encoder = spawn(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-y",
    "-f",
    "image2pipe",
    "-framerate",
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
    "6",
    "-crf",
    "33",
    "-b:v",
    "0",
    output,
  ],
  { stdio: ["pipe", "ignore", "pipe"] },
);
let errors = "",
  encoderFailure = null,
  frames = 0,
  total = 0;
encoder.stderr.on("data", (d) => (errors += d));
encoder.stdin.on("error", () => {});
const encoded = new Promise((resolve, reject) => {
  encoder.on("error", reject);
  encoder.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(Error("Encode failed " + code + " " + errors)),
  );
});
void encoded.catch((e) => {
  encoderFailure = e;
});
try {
  for (const clip of manifest.clips) {
    if (!fs.existsSync(clip.file) || !(clip.duration > 0) || !(clip.start >= 0))
      throw Error("Invalid clip " + JSON.stringify(clip));
    console.log("Excerpt:", clip.label, clip.start, clip.duration);
    const filter =
      "scale=w='min(iw," +
      width +
      ")':h='min(ih," +
      height +
      ")':force_original_aspect_ratio=decrease,pad=" +
      width +
      ":" +
      height +
      ":(ow-iw)/2:(oh-ih)/2:color=0xeee6d7";
    const frameDir = fs.mkdtempSync(
      path.join(path.dirname(output), "clip-frames-"),
    );
    const decoder = spawn(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-ss",
        String(clip.start),
        "-t",
        String(clip.duration),
        "-i",
        path.resolve(clip.file),
        "-an",
        "-vf",
        filter,
        "-r",
        String(fps),
        "-c:v",
        "png",
        "-f",
        "image2",
        path.join(frameDir, "frame-%06d.png"),
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let decodeError = "";
    decoder.stderr.on("data", (d) => (decodeError += d));
    const decoded = new Promise((resolve, reject) => {
      decoder.on("error", reject);
      decoder.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(
              Error(
                "Decode failed " + clip.label + " " + code + " " + decodeError,
              ),
            ),
      );
    });
    void decoded.catch(() => {});
    try {
      await decoded;
      for (const file of fs
        .readdirSync(frameDir)
        .filter((f) => /^frame-\d+\.png$/.test(f))
        .sort()) {
        const png = fs.readFileSync(path.join(frameDir, file));
        if (encoderFailure) throw encoderFailure;
        const jpeg = await sharp(png)
          .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
          .toBuffer();
        if (!encoder.stdin.write(jpeg)) await once(encoder.stdin, "drain");
        frames++;
        fs.unlinkSync(path.join(frameDir, file));
      }
      fs.rmdirSync(frameDir);
    } catch (e) {
      decoder.kill();
      throw e;
    }
    total += clip.duration;
  }
  encoder.stdin.end();
  await encoded;
  const proof = {
    ...manifest,
    fps,
    encodedFrames: frames,
    encodedDurationSeconds: frames / fps,
    requestedExcerptSeconds: total,
    method:
      "Explicitly edited excerpts from actual browser recordings, original speed. Letterboxed only; no interpolated gameplay, synthetic victories or state substitution.",
  };
  fs.writeFileSync(output + ".manifest.json", JSON.stringify(proof, null, 2));
  console.log(
    JSON.stringify({
      output,
      bytes: fs.statSync(output).size,
      frames,
      duration: frames / fps,
    }),
  );
} catch (e) {
  encoder.stdin.end();
  encoder.kill();
  throw e;
}
