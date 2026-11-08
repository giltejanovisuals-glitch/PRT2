/*
 * Light preview clips for the muted inline reel previews (js/reel-preview.js,
 * used on the Short-Form Video & Reels page and the homepage reels card).
 * Without one, a visible preview streams the full reel (several MB each).
 *
 * Run by hand — it needs ffmpeg, which the deploy build doesn't have — then
 * commit what it writes and run `npm run build`, which adds each clip to
 * js/reel-manifest.js as `preview`:
 *
 *   assets/videos/short-form-reels/previews/<same base name>.mp4
 *     the first PREVIEW_SECONDS, 480px wide, no audio, H.264 (main), CRF 28,
 *     fast-start (so preload="metadata" fetches only a small header)
 *
 * The source reels are only read, never changed. Reels in the `hidden` list
 * of scripts/gallery-priority.js are skipped. Existing clips are kept unless
 * --force is passed (or the clip is deleted).
 *
 * Usage: node scripts/make-reel-previews.js [--force]
 * Set FFMPEG to the ffmpeg executable when it isn't on PATH.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const PRIORITY = require("./gallery-priority");

const ROOT = path.join(__dirname, "..");
const REELS = path.join(ROOT, "assets", "videos", "short-form-reels");
const OUTPUT_DIR = path.join(REELS, "previews");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const PREVIEW_SECONDS = 5;
const WIDTH = 480;
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const force = process.argv.includes("--force");

const hidden = new Set((PRIORITY.hidden || {})["short-form-video-reels"] || []);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const reels = fs
  .readdirSync(REELS)
  .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()) && !hidden.has(name));

let made = 0;
let kept = 0;
let sourceBytes = 0;
let clipBytes = 0;
for (const file of reels) {
  const base = path.basename(file, path.extname(file));
  const clip = path.join(OUTPUT_DIR, `${base}.mp4`);
  const source = path.join(REELS, file);
  sourceBytes += fs.statSync(source).size;
  if (!force && fs.existsSync(clip)) {
    kept += 1;
    clipBytes += fs.statSync(clip).size;
    continue;
  }
  execFileSync(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", source,
      "-t", String(PREVIEW_SECONDS),
      "-an",
      "-vf", `scale=${WIDTH}:-2`,
      "-c:v", "libx264", "-crf", "28", "-preset", "slow",
      "-profile:v", "main", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      clip,
    ],
    { stdio: "inherit" }
  );
  made += 1;
  clipBytes += fs.statSync(clip).size;
  console.log(`[reel-previews] ${base}.mp4  ${Math.round(fs.statSync(clip).size / 1024)} KB`);
}
console.log(
  `[reel-previews] ${made} made, ${kept} kept; ${reels.length} previews total ${Math.round(clipBytes / 1024)} KB ` +
    `(the full reels are ${Math.round(sourceBytes / 1024 / 1024)} MB)`
);
