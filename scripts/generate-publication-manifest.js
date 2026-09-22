/*
 * Build-time manifest generator for the Editorial & Layout Design page
 * (pages/editorial-layout.html), which uses its own dedicated publication
 * reader (book/magazine-style, PDF.js-powered) instead of the shared
 * moving-wall gallery the other three image categories use.
 *
 * Scans assets/documents/editorial-layout/ for PDF files, and for each one:
 *   - opens it with pdfjs-dist to read its real page count and every page's
 *     own width/height (points), classifying each page's orientation and
 *     the publication's dominant orientation
 *   - renders page 1 to a JPEG cover image via @napi-rs/canvas
 *   - records the file's size on disk
 * and writes js/publication-manifest.js as a plain
 * `window.PUBLICATION_MANIFEST = [...]` assignment.
 *
 * Run with `npm run build` (wired into vercel.json's buildCommand) or
 * directly with `node scripts/generate-publication-manifest.js`. Brand,
 * year, publication type, role, description, and download permission are
 * kept separately in the hand-authored js/publication-meta.js — this
 * script never touches it.
 */
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const SOURCE_DIR = path.join(__dirname, "..", "assets", "documents", "editorial-layout");
const COVER_DIR = path.join(SOURCE_DIR, "covers");
const PREVIEW_DIR = path.join(SOURCE_DIR, "previews");
const OUTPUT_FILE = path.join(__dirname, "..", "js", "publication-manifest.js");
const COVER_TARGET_WIDTH = 900;
const PREVIEW_TARGET_WIDTH = 520;
const PREVIEW_COUNT = 3;
const PDF_WARNING_BYTES = 25 * 1024 * 1024;
const COMBINED_WARNING_BYTES = 90 * 1024 * 1024;

// Pages within this fractional difference of a 1:1 ratio count as "square"
// rather than a barely-portrait or barely-landscape page.
const SQUARE_TOLERANCE = 0.04;

function classifyOrientation(width, height) {
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= SQUARE_TOLERANCE) return "square";
  return ratio > 1 ? "landscape" : "portrait";
}

function dominantOrientation(pages) {
  const counts = { portrait: 0, landscape: 0, square: 0 };
  pages.forEach((p) => { counts[p.orientation] += 1; });
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length <= 1) return entries[0]?.[0] || "portrait";
  const max = Math.max(...entries.map(([, n]) => n));
  const leaders = entries.filter(([, n]) => n === max);
  if (leaders.length > 1) return "mixed";
  return leaders[0][0];
}

function toTitleCase(text) {
  return text
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

async function renderPageImage(page, targetWidth, quality, outputPath) {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", quality));
}

async function processPdf(pdfjsLib, file) {
  const filePath = path.join(SOURCE_DIR, file);
  const fileSizeBytes = fs.statSync(filePath).size;
  const data = new Uint8Array(fs.readFileSync(filePath));

  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const width = Number(viewport.width.toFixed(2));
    const height = Number(viewport.height.toFixed(2));
    pages.push({ width, height, orientation: classifyOrientation(width, height) });
  }

  // Cover: render page 1 at a fixed target width (device-pixel-ratio-aware
  // sharpness is handled client-side when the real page is opened in the
  // reader — this cover is just the library thumbnail).
  const page1 = await doc.getPage(1);
  const ext = path.extname(file);
  const baseName = path.basename(file, ext);
  const coverFile = `${baseName}.jpg`;
  fs.mkdirSync(COVER_DIR, { recursive: true });
  const coverPath = path.join(COVER_DIR, coverFile);
  await renderPageImage(page1, COVER_TARGET_WIDTH, 82, coverPath);

  if (!fs.existsSync(coverPath)) {
    throw new Error(`cover could not be generated at ${path.relative(process.cwd(), coverPath)}`);
  }

  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const previewImages = [];
  const previewPageCount = Math.min(PREVIEW_COUNT, doc.numPages);
  for (let i = 1; i <= previewPageCount; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = i === 1 ? page1 : await doc.getPage(i);
    const previewFile = `${baseName}-page-${String(i).padStart(2, "0")}.jpg`;
    const previewPath = path.join(PREVIEW_DIR, previewFile);
    // eslint-disable-next-line no-await-in-loop
    await renderPageImage(page, PREVIEW_TARGET_WIDTH, 76, previewPath);
    if (!fs.existsSync(previewPath)) {
      throw new Error(`preview could not be generated at ${path.relative(process.cwd(), previewPath)}`);
    }
    previewImages.push(`previews/${previewFile}`);
  }

  if (typeof doc.cleanup === "function") await doc.cleanup();

  return {
    file,
    title: toTitleCase(baseName),
    pageCount: doc.numPages,
    cover: `covers/${coverFile}`,
    previewImages,
    pages,
    dominantOrientation: dominantOrientation(pages),
    fileSizeBytes,
  };
}

function warnLargePdf(file, bytes) {
  if (bytes <= PDF_WARNING_BYTES) return;
  console.warn(
    [
      "[publication-manifest] WARNING:",
      `${file} exceeds the recommended 25 MB web limit (${(bytes / (1024 * 1024)).toFixed(1)} MB).`,
    ].join("\n")
  );
}

function removeOrphanCovers(expectedCovers) {
  if (!fs.existsSync(COVER_DIR)) return;

  const coverFiles = fs
    .readdirSync(COVER_DIR)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name));

  for (const cover of coverFiles) {
    if (expectedCovers.has(cover)) continue;
    const coverPath = path.join(COVER_DIR, cover);
    fs.unlinkSync(coverPath);
    console.log(`[publication-manifest] Removed orphan cover ${path.relative(process.cwd(), coverPath)}`);
  }
}

function removeOrphanPreviews(expectedPreviews) {
  if (!fs.existsSync(PREVIEW_DIR)) return;

  const previewFiles = fs
    .readdirSync(PREVIEW_DIR)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name));

  for (const preview of previewFiles) {
    if (expectedPreviews.has(preview)) continue;
    const previewPath = path.join(PREVIEW_DIR, preview);
    fs.unlinkSync(previewPath);
    console.log(`[publication-manifest] Removed orphan preview ${path.relative(process.cwd(), previewPath)}`);
  }
}

async function build() {
  if (!fs.existsSync(SOURCE_DIR)) fs.mkdirSync(SOURCE_DIR, { recursive: true });

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => path.extname(name).toLowerCase() === ".pdf")
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const manifest = [];
  let totalPdfBytes = 0;
  const expectedCovers = new Set();
  const expectedPreviews = new Set();

  for (const file of files) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const entry = await processPdf(pdfjsLib, file);
      warnLargePdf(file, entry.fileSizeBytes);
      totalPdfBytes += entry.fileSizeBytes;
      expectedCovers.add(path.basename(entry.cover));
      entry.previewImages.forEach((preview) => expectedPreviews.add(path.basename(preview)));
      manifest.push(entry);
    } catch (error) {
      console.error(
        [
          "[publication-manifest] ERROR:",
          `${file} could not be processed.`,
          "",
          error && error.stack ? error.stack : String(error),
        ].join("\n")
      );
      process.exitCode = 1;
      return;
    }
  }

  if (totalPdfBytes > COMBINED_WARNING_BYTES) {
    console.warn(
      [
        "[publication-manifest] WARNING:",
        `Combined publication PDFs are ${(totalPdfBytes / (1024 * 1024)).toFixed(1)} MB. Keep this comfortably below the deployment source-upload limit.`,
      ].join("\n")
    );
  }

  removeOrphanCovers(expectedCovers);
  removeOrphanPreviews(expectedPreviews);

  const header = [
    "/*",
    " * AUTO-GENERATED by scripts/generate-publication-manifest.js — do not edit by hand.",
    " * Regenerate with `npm run build` after adding, removing, or renaming PDFs in",
    " * assets/documents/editorial-layout/. Brand, year, publication type, role,",
    " * description, case-study link, and download permission belong in",
    " * js/publication-meta.js instead.",
    " */",
  ].join("\n");

  const output = `${header}\nwindow.PUBLICATION_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(
    `[publication-manifest] Wrote ${manifest.length} publication${manifest.length === 1 ? "" : "s"} to ${path.relative(process.cwd(), OUTPUT_FILE)}`
  );
}

build().catch((error) => {
  console.error("[publication-manifest] build failed:", error);
  process.exitCode = 1;
});
