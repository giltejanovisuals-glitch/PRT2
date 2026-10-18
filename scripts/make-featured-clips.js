/*
 * Light preview clips for the reels in the mobile landing carousel
 * (scripts/featured-groups.js). Run by hand — it needs ffmpeg, which the
 * deploy build doesn't have — and commit what it writes:
 *
 *   assets/videos/featured/<id>.mp4   muted H.264, 540px wide, `length`
 *                                     seconds from `start`, fast-start
 *   assets/videos/featured/<id>.jpg   the clip's first frame, full size —
 *                                     the poster source that
 *                                     scripts/generate-mobile-featured.js
 *                                     turns into WebP
 *
 * Usage: node scripts/make-featured-clips.js [--force]
 * Set FFMPEG to the ffmpeg executable when it isn't on PATH. Existing clips
 * are kept unless --force is passed (or the file is deleted).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const GROUPS = require("./featured-groups");

const ROOT = path.join(__dirname, "..");
const REELS = path.join(ROOT, "assets", "videos", "short-form-reels");
const OUTPUT_DIR = path.join(ROOT, "assets", "videos", "featured");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const force = process.argv.includes("--force");

const ffmpeg = (args) => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const reels = GROUPS.flatMap((group) => group.items.filter((item) => item.kind === "reel"));
for (const reel of reels) {
  const source = path.join(REELS, reel.file);
  if (!fs.existsSync(source)) throw new Error(`missing reel ${reel.file}`);
  const clip = path.join(OUTPUT_DIR, `${reel.id}.mp4`);
  const poster = path.join(OUTPUT_DIR, `${reel.id}.jpg`);
  if (!force && fs.existsSync(clip) && fs.existsSync(poster)) continue;
  const start = String(reel.start || 0);
  ffmpeg([
    "-ss", start, "-i", source, "-t", String(reel.length),
    "-an", "-vf", "scale=540:-2,fps=30",
    "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "27",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", clip,
  ]);
  ffmpeg(["-ss", start, "-i", source, "-frames:v", "1", "-q:v", "2", poster]);
  console.log(`[featured-clips] ${reel.id}.mp4  ${(fs.statSync(clip).size / 1024).toFixed(0)} KB`);
}
console.log(`[featured-clips] ${reels.length} reel previews`);
