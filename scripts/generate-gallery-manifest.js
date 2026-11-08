/*
 * Build-time image manifest generator for the Project Gallery's moving-wall
 * pages (pages/<category-id>.html — three of the five categories share this
 * interface, each sourcing its own images independently. short-form-video-
 * reels has its own dedicated video player and manifest instead — see
 * scripts/generate-reel-manifest.js — and editorial-layout has its own
 * dedicated publication reader and manifest — see
 * scripts/generate-publication-manifest.js).
 *
 * Scans every assets/images/gallery/<category-id>/ folder for supported
 * image files, reads each file's own header bytes to determine its pixel
 * width/height (no image-processing dependency), and writes
 * js/gallery-editorial-manifest.js as a plain
 * `window.GALLERY_EDITORIAL_MANIFEST = { "<category-id>": [...], ... }`
 * assignment so it loads with a normal <script> tag like the rest of this
 * site's data files.
 *
 * Run with `npm run build` (wired into vercel.json's buildCommand) or
 * directly with `node scripts/generate-gallery-manifest.js`. Titles,
 * project names, years, and alt text are kept separately in the
 * hand-authored js/gallery-editorial-meta.js — this script never touches it.
 *
 * Videos: an .mp4/.webm/.mov/.m4v dropped in beside a poster image of the
 * same base name becomes one `kind: "video"` entry sized by that poster.
 *
 * Order: files listed in scripts/gallery-priority.js come first, in that
 * order; everything else follows sorted by filename. Files in its `hidden`
 * list are left out.
 */
const fs = require("fs");
const path = require("path");
const { SUPPORTED_EXTENSIONS, readImageSize } = require("./lib/image-size");
const PRIORITY = require("./gallery-priority");

const GALLERY_ROOT = path.join(__dirname, "..", "assets", "images", "gallery");
const OUTPUT_FILE = path.join(__dirname, "..", "js", "gallery-editorial-manifest.js");
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

// Every category that uses this gallery wall gets its own source folder.
// Keep in sync with the `id`s in js/gallery-categories-data.js.
const CATEGORY_IDS = [
  "social-media-campaigns",
  "print-brand-collateral",
  "commercial-lifestyle-photography",
];

function toTitleCase(text) {
  return text
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function buildCategoryManifest(categoryId) {
  const sourceDir = path.join(GALLERY_ROOT, categoryId);
  if (!fs.existsSync(sourceDir)) {
    fs.mkdirSync(sourceDir, { recursive: true });
  }

  const allFiles = fs.readdirSync(sourceDir);

  // Videos (.mp4/.webm/.mov/.m4v) sit beside a poster image of the same
  // base name ("launch.mp4" + "launch.jpg"), as in the reels folder. The
  // poster gives the entry its size and thumbnail and isn't listed on its
  // own; a video without one is skipped.
  const posters = new Map();
  allFiles
    .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .forEach((video) => {
      const base = path.basename(video, path.extname(video)).toLowerCase();
      const poster = allFiles.find(
        (name) =>
          SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()) &&
          path.basename(name, path.extname(name)).toLowerCase() === base
      );
      if (poster) posters.set(video, poster);
      else console.warn(`[gallery-manifest] ${categoryId}: skipping "${video}" — add a poster image named "${path.basename(video, path.extname(video))}.jpg" (or .png/.webp).`);
    });
  const posterFiles = new Set(posters.values());

  const hidden = new Set((PRIORITY.hidden || {})[categoryId] || []);
  const available = allFiles
    .filter(
      (name) =>
        ((SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()) && !posterFiles.has(name)) || posters.has(name)) &&
        !hidden.has(name)
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const priority = (PRIORITY[categoryId] || []).filter((file) => {
    if (available.includes(file)) return true;
    console.warn(`[gallery-manifest] ${categoryId}: priority file "${file}" not found — skipping.`);
    return false;
  });
  const files = [...new Set(priority), ...available.filter((file) => !priority.includes(file))];

  const manifest = [];
  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const poster = posters.get(file);
    const sizeFile = poster || file;
    let size = null;
    try {
      size = readImageSize(fs.readFileSync(path.join(sourceDir, sizeFile)), path.extname(sizeFile).toLowerCase());
    } catch (error) {
      console.warn(`[gallery-manifest] ${categoryId}: could not read "${sizeFile}": ${error.message}`);
    }
    if (!size || !size.width || !size.height) {
      console.warn(`[gallery-manifest] ${categoryId}: skipping "${file}" — could not determine its dimensions.`);
      return;
    }
    manifest.push({
      file,
      ...(poster ? { kind: "video", poster } : {}),
      width: size.width,
      height: size.height,
      ratio: Number((size.width / size.height).toFixed(4)),
      title: toTitleCase(path.basename(file, ext)),
    });
  });

  return manifest;
}

function build() {
  const manifestsByCategory = {};
  let total = 0;

  CATEGORY_IDS.forEach((categoryId) => {
    const manifest = buildCategoryManifest(categoryId);
    manifestsByCategory[categoryId] = manifest;
    total += manifest.length;
  });

  const header = [
    "/*",
    " * AUTO-GENERATED by scripts/generate-gallery-manifest.js — do not edit by hand.",
    " * Regenerate with `npm run build` after adding or removing files in any",
    " * assets/images/gallery/<category-id>/ folder. Titles, project names,",
    " * years, and alt text belong in js/gallery-editorial-meta.js instead.",
    " */",
  ].join("\n");

  const output = `${header}\nwindow.GALLERY_EDITORIAL_MANIFEST = ${JSON.stringify(manifestsByCategory, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(
    `[gallery-manifest] Wrote ${total} image${total === 1 ? "" : "s"} across ${CATEGORY_IDS.length} categories to ${path.relative(process.cwd(), OUTPUT_FILE)}`
  );
}

build();
