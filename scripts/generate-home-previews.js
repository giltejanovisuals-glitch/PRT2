/*
 * Build-time preview generator for the homepage Project Gallery panels
 * (index.html, #gallery). Each of the five panels shows a random static
 * image from its own category and crossfades through more of them on
 * hover (see js/gallery-index.js) — but the category source files are
 * multi-megabyte PNGs, far too heavy to cycle every second, so this script
 * downsizes an evenly spaced sample of each category's own images into
 * small WebP previews.
 *
 * Sources (each category only ever draws from its own folder):
 *   - editorial-layout: the publication page previews rendered by
 *     scripts/generate-publication-manifest.js (so run that one first)
 *   - social-media-campaigns, print-brand-collateral,
 *     commercial-lifestyle-photography: assets/images/gallery/<id>/
 *   - short-form-video-reels: the poster frames in
 *     assets/videos/short-form-reels/
 *
 * Writes assets/images/home-previews/<id>/*.webp and js/home-previews.js
 * (`window.HOME_GALLERY_PREVIEWS = { "<id>": [paths...] }`). Output names
 * include the source file's byte size, so an unchanged source is skipped
 * on rebuild and a replaced one is regenerated.
 */
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");
const { SUPPORTED_EXTENSIONS } = require("./lib/image-size");

const ROOT = path.join(__dirname, "..");
const OUTPUT_ROOT = path.join(ROOT, "assets", "images", "home-previews");
const OUTPUT_FILE = path.join(ROOT, "js", "home-previews.js");

// Max images per category — enough variety for a hover slideshow without
// committing hundreds of previews for the larger categories.
const MAX_PER_CATEGORY = 16;
// Each preview is scaled down to just cover this box (the tallest desktop
// panel at ~1.5x density); smaller sources are never upscaled.
const TARGET_WIDTH = 640;
const TARGET_HEIGHT = 900;
const WEBP_QUALITY = 78;

// Keep in sync with the `id`s in js/gallery-categories-data.js.
const CATEGORY_SOURCES = {
  "editorial-layout": path.join(ROOT, "assets", "documents", "editorial-layout", "previews"),
  "social-media-campaigns": path.join(ROOT, "assets", "images", "gallery", "social-media-campaigns"),
  "print-brand-collateral": path.join(ROOT, "assets", "images", "gallery", "print-brand-collateral"),
  "commercial-lifestyle-photography": path.join(ROOT, "assets", "images", "gallery", "commercial-lifestyle-photography"),
  "short-form-video-reels": path.join(ROOT, "assets", "videos", "short-form-reels"),
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

// Evenly spaced picks across the sorted list, so the sample spans the
// whole category instead of just its first few files.
function sampleEvenly(files, count) {
  if (files.length <= count) return files;
  return Array.from({ length: count }, (_, i) => files[Math.floor((i * files.length) / count)]);
}

async function writePreview(sourcePath, outputPath) {
  const image = await loadImage(fs.readFileSync(sourcePath));
  const scale = Math.min(1, Math.max(TARGET_WIDTH / image.width, TARGET_HEIGHT / image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  fs.writeFileSync(outputPath, canvas.toBuffer("image/webp", WEBP_QUALITY));
}

async function buildCategory(categoryId, sourceDir) {
  const outputDir = path.join(OUTPUT_ROOT, categoryId);
  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.existsSync(sourceDir)
    ? fs
        .readdirSync(sourceDir)
        .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];

  const previews = [];
  for (const file of sampleEvenly(files, MAX_PER_CATEGORY)) {
    const sourcePath = path.join(sourceDir, file);
    const { size } = fs.statSync(sourcePath);
    const outputName = `${slugify(path.basename(file, path.extname(file)))}-${size.toString(36)}.webp`;
    const outputPath = path.join(outputDir, outputName);
    if (!fs.existsSync(outputPath)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await writePreview(sourcePath, outputPath);
      } catch (error) {
        console.warn(`[home-previews] ${categoryId}: skipping "${file}": ${error.message}`);
        continue;
      }
    }
    previews.push(outputName);
  }

  // Drop previews whose source was removed, replaced, or fell out of the sample.
  const keep = new Set(previews);
  fs.readdirSync(outputDir)
    .filter((name) => name.endsWith(".webp") && !keep.has(name))
    .forEach((name) => fs.unlinkSync(path.join(outputDir, name)));

  return previews.map((name) => `assets/images/home-previews/${categoryId}/${name}`);
}

async function build() {
  const manifest = {};
  let total = 0;
  for (const [categoryId, sourceDir] of Object.entries(CATEGORY_SOURCES)) {
    // eslint-disable-next-line no-await-in-loop
    manifest[categoryId] = await buildCategory(categoryId, sourceDir);
    total += manifest[categoryId].length;
  }

  const header = [
    "/*",
    " * AUTO-GENERATED by scripts/generate-home-previews.js — do not edit by hand.",
    " * Regenerate with `npm run build` after changing any category's source images.",
    " */",
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, `${header}\nwindow.HOME_GALLERY_PREVIEWS = ${JSON.stringify(manifest, null, 2)};\n`);
  console.log(
    `[home-previews] Wrote ${total} preview${total === 1 ? "" : "s"} across ${Object.keys(manifest).length} categories to ${path.relative(process.cwd(), OUTPUT_FILE)}`
  );
}

build().catch((error) => {
  console.error(`[home-previews] ${error.stack || error.message}`);
  process.exit(1);
});
