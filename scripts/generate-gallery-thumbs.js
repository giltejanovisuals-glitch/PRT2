/*
 * Build-time responsive copies of every Project Gallery image and reel
 * poster. The sources are multi-megabyte originals (never changed here);
 * pages show these copies and keep the original for the fullscreen viewer.
 *
 * For each source image this writes, at the same aspect ratio:
 *   <base>.webp          up to 720px wide (the classic thumbnail)
 *   <base>.avif          the same size in AVIF
 *   <base>-360.webp/.avif  for phones' two-column tiles
 *   <base>-1440.avif     the large preview (sources wider than 720px)
 * See scripts/lib/image-variants.js for the exact rules; widths never
 * exceed the source.
 *
 * Sources:
 *   assets/images/gallery/<id>/            (the three image categories)
 *   assets/videos/short-form-reels/*.jpg   (reel posters)
 * Output: assets/images/gallery-thumbs/<id>/ and js/gallery-thumbs.js
 * (`window.GALLERY_THUMBS = { "<id>": { "<source file>": "<thumb path>" } }`;
 * the path is the <base>.webp copy, from which the variants are named).
 * Names include the source's byte size, so unchanged sources are skipped on
 * rebuild (only missing copies are made) and replaced ones regenerate.
 */
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");
const { SUPPORTED_EXTENSIONS } = require("./lib/image-size");
const { THUMB_WIDTH, variantsFor } = require("./lib/image-variants");

const ROOT = path.join(__dirname, "..");
const THUMB_ROOT = path.join(ROOT, "assets", "images", "gallery-thumbs");
const OUTPUT_FILE = path.join(ROOT, "js", "gallery-thumbs.js");

const SOURCES = {
  "social-media-campaigns": path.join(ROOT, "assets", "images", "gallery", "social-media-campaigns"),
  "print-brand-collateral": path.join(ROOT, "assets", "images", "gallery", "print-brand-collateral"),
  "commercial-lifestyle-photography": path.join(ROOT, "assets", "images", "gallery", "commercial-lifestyle-photography"),
  "short-form-video-reels": path.join(ROOT, "assets", "videos", "short-form-reels"),
};
const WEBP_QUALITY = 80;
const AVIF = { quality: 55, speed: 6 };

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

// The thumbnail's name for a source file (stable: other scripts rely on it).
function thumbName(file, size, used) {
  const ext = path.extname(file);
  let name = `${slugify(path.basename(file, ext))}-${slugify(ext)}-${size.toString(36)}.webp`;
  if (used && used.has(name)) name = `${slugify(file)}-${size.toString(36)}.webp`;
  return name;
}

const resized = (image, width) => {
  const w = Math.max(1, Math.round(Math.min(width, image.width)));
  const h = Math.max(1, Math.round((image.height * w) / image.width));
  const canvas = createCanvas(w, h);
  canvas.getContext("2d").drawImage(image, 0, 0, w, h);
  return canvas;
};

// Writes whatever copies of one source are missing; returns how many.
async function writeCopies(sourcePath, outputDir, baseName) {
  const base = baseName.replace(/\.webp$/, "");
  let image = null;
  const load = async () => (image = image || (await loadImage(fs.readFileSync(sourcePath))));
  let made = 0;
  const thumbPath = path.join(outputDir, baseName);
  if (!fs.existsSync(thumbPath)) {
    await load();
    fs.writeFileSync(thumbPath, resized(image, THUMB_WIDTH).toBuffer("image/webp", WEBP_QUALITY));
    made += 1;
  }
  // Variants need the source width; read it from the thumbnail when it was
  // already there (a thumbnail narrower than 720px is the source width).
  let sourceWidth = image ? image.width : null;
  if (!sourceWidth) {
    const thumb = await loadImage(fs.readFileSync(thumbPath));
    sourceWidth = thumb.width < THUMB_WIDTH ? thumb.width : null;
  }
  const missing = (width) => variantsFor(width).filter((v) => !fs.existsSync(path.join(outputDir, `${base}${v.suffix}.${v.ext}`)));
  if (!sourceWidth || missing(sourceWidth).length) {
    await load();
    sourceWidth = image.width;
    for (const v of missing(sourceWidth)) {
      const canvas = resized(image, v.width);
      // eslint-disable-next-line no-await-in-loop
      const buffer = v.ext === "avif" ? await canvas.encode("avif", AVIF) : canvas.toBuffer("image/webp", WEBP_QUALITY);
      fs.writeFileSync(path.join(outputDir, `${base}${v.suffix}.${v.ext}`), buffer);
      made += 1;
    }
  }
  return made;
}

async function buildCategory(categoryId) {
  const sourceDir = SOURCES[categoryId];
  const outputDir = path.join(THUMB_ROOT, categoryId);
  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir).filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    : [];

  const map = {};
  const used = new Set();
  let made = 0;
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const { size } = fs.statSync(sourcePath);
    const outputName = thumbName(file, size, used);
    used.add(outputName);
    try {
      // eslint-disable-next-line no-await-in-loop
      made += await writeCopies(sourcePath, outputDir, outputName);
    } catch (error) {
      console.warn(`[gallery-thumbs] ${categoryId}: skipping "${file}": ${error.message}`);
      continue;
    }
    map[file] = `assets/images/gallery-thumbs/${categoryId}/${outputName}`;
  }

  // Drop copies whose source was removed or replaced.
  const keep = new Set(Object.values(map).map((p) => path.basename(p).replace(/\.webp$/, "")));
  fs.readdirSync(outputDir)
    .filter((name) => /\.(webp|avif)$/.test(name) && !keep.has(name.replace(/(-360|-1440)?\.(webp|avif)$/, "")))
    .forEach((name) => fs.unlinkSync(path.join(outputDir, name)));

  console.log(`[gallery-thumbs] ${categoryId}: ${Object.keys(map).length} sources (${made} new files)`);
  return map;
}

async function build() {
  const all = {};
  for (const id of Object.keys(SOURCES)) {
    // eslint-disable-next-line no-await-in-loop
    all[id] = await buildCategory(id);
  }
  const header = [
    "/*",
    " * AUTO-GENERATED by scripts/generate-gallery-thumbs.js — do not edit by hand.",
    " * Regenerate with `npm run build` after changing a category's source images.",
    " */",
  ].join("\n");
  fs.writeFileSync(OUTPUT_FILE, `${header}\nwindow.GALLERY_THUMBS = ${JSON.stringify(all, null, 2)};\n`);
}

if (require.main === module) {
  build().catch((error) => {
    console.error(`[gallery-thumbs] ${error.stack || error.message}`);
    process.exit(1);
  });
}

module.exports = { thumbName };
