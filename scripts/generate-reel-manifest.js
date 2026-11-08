/*
 * Build-time manifest generator for the Short-Form Video & Reels page
 * (pages/short-form-video-reels.html), which uses its own dedicated
 * two-column video player instead of the shared moving-wall gallery the
 * other four Project Gallery categories use (see
 * scripts/generate-gallery-manifest.js for that one).
 *
 * Scans assets/videos/short-form-reels/ for supported video files, pairs
 * each with a poster image of the same basename, reads that poster's own
 * header bytes to recover its pixel width/height (via scripts/lib/image-size,
 * shared with the photo-gallery build script), and writes
 * js/reel-manifest.js as a plain `window.REEL_MANIFEST = [...]` assignment.
 *
 * Run with `npm run build` (wired into vercel.json's buildCommand) or
 * directly with `node scripts/generate-reel-manifest.js`. Titles, brand/
 * project names, years, content types, and alt text are kept separately in
 * the hand-authored js/reel-meta.js — this script never touches it.
 *
 * Order and visibility: reels listed under "short-form-video-reels" in
 * scripts/gallery-priority.js come first, in that order, then the rest by
 * filename; reels in its `hidden` list are left out entirely.
 */
const fs = require("fs");
const path = require("path");
const { SUPPORTED_EXTENSIONS: POSTER_EXTENSIONS, readImageSize } = require("./lib/image-size");
const PRIORITY = require("./gallery-priority");
const { thumbName } = require("./generate-gallery-thumbs");
const { mp4Duration } = require("./lib/mp4-duration");

const CATEGORY_ID = "short-form-video-reels";
// Small poster copies (scripts/generate-gallery-thumbs.js runs first).
const THUMB_DIR = path.join(__dirname, "..", "assets", "images", "gallery-thumbs", CATEGORY_ID);

const SOURCE_DIR = path.join(__dirname, "..", "assets", "videos", "short-form-reels");
// Optional short, light clips for the muted inline previews, same base name
// as their reel (see this folder's README). The full reel is used without one.
const PREVIEW_DIR = path.join(SOURCE_DIR, "previews");
const PREVIEW_EXTENSIONS = [".mp4", ".webm"];
const OUTPUT_FILE = path.join(__dirname, "..", "js", "reel-manifest.js");
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

function toTitleCase(text) {
  return text
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function findPoster(sourceDir, files, baseName) {
  for (const ext of POSTER_EXTENSIONS) {
    const candidate = files.find((name) => name.toLowerCase() === `${baseName}${ext}`.toLowerCase());
    if (candidate) return candidate;
  }
  return null;
}

function build() {
  if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
  }

  const allFiles = fs.readdirSync(SOURCE_DIR).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const hidden = new Set((PRIORITY.hidden || {})[CATEGORY_ID] || []);
  const available = allFiles.filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()) && !hidden.has(name));
  const priority = (PRIORITY[CATEGORY_ID] || []).filter((file) => {
    if (available.includes(file)) return true;
    console.warn(`[reel-manifest] priority file "${file}" not found${hidden.has(file) ? " (it is hidden)" : ""} — skipping.`);
    return false;
  });
  const videoFiles = [...new Set(priority), ...available.filter((file) => !priority.includes(file))];
  if (hidden.size) console.log(`[reel-manifest] ${hidden.size} hidden by scripts/gallery-priority.js`);

  const previewFiles = fs.existsSync(PREVIEW_DIR) ? fs.readdirSync(PREVIEW_DIR) : [];
  const findPreview = (baseName) => {
    for (const ext of PREVIEW_EXTENSIONS) {
      const candidate = previewFiles.find((name) => name.toLowerCase() === `${baseName}${ext}`.toLowerCase());
      if (candidate) return `previews/${candidate}`;
    }
    return null;
  };

  const manifest = [];
  videoFiles.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);
    const posterFile = findPoster(SOURCE_DIR, allFiles, baseName);

    if (!posterFile) {
      console.warn(
        `[reel-manifest] skipping "${file}" — no matching poster image found (expected "${baseName}.jpg", ".png", ".webp", or ".avif" alongside it).`
      );
      return;
    }

    let size = null;
    try {
      size = readImageSize(fs.readFileSync(path.join(SOURCE_DIR, posterFile)), path.extname(posterFile).toLowerCase());
    } catch (error) {
      console.warn(`[reel-manifest] "${file}": could not read poster "${posterFile}": ${error.message}`);
    }
    if (!size || !size.width || !size.height) {
      console.warn(`[reel-manifest] skipping "${file}" — could not determine poster "${posterFile}" dimensions.`);
      return;
    }

    const preview = findPreview(baseName);
    // The poster's small copy (720px WebP; AVIF and 360px variants beside it).
    const thumb = thumbName(posterFile, fs.statSync(path.join(SOURCE_DIR, posterFile)).size);
    const hasThumb = fs.existsSync(path.join(THUMB_DIR, thumb));
    // Read here once, so the page never fetches a reel just for its length.
    const seconds = /\.(mp4|mov)$/i.test(file) ? mp4Duration(path.join(SOURCE_DIR, file)) : 0;
    manifest.push({
      file,
      poster: posterFile,
      ...(hasThumb && { thumb: `assets/images/gallery-thumbs/${CATEGORY_ID}/${thumb}` }),
      ...(seconds > 0 && { duration: Number(seconds.toFixed(2)) }),
      ...(preview && { preview }),
      width: size.width,
      height: size.height,
      ratio: Number((size.width / size.height).toFixed(4)),
      title: toTitleCase(baseName),
    });
  });

  const header = [
    "/*",
    " * AUTO-GENERATED by scripts/generate-reel-manifest.js — do not edit by hand.",
    " * Regenerate with `npm run build` after adding, removing, or renaming",
    " * files in assets/videos/short-form-reels/. Titles, brand/project names,",
    " * years, content types, and alt text belong in js/reel-meta.js instead.",
    " */",
  ].join("\n");

  const output = `${header}\nwindow.REEL_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(
    `[reel-manifest] Wrote ${manifest.length} video${manifest.length === 1 ? "" : "s"} to ${path.relative(process.cwd(), OUTPUT_FILE)}`
  );
}

build();
