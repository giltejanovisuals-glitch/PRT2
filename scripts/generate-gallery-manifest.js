/*
 * Build-time image manifest generator for the Project Gallery's moving-wall
 * pages (pages/<category-id>.html — all five categories share this
 * interface, each sourcing its own images independently).
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
 */
const fs = require("fs");
const path = require("path");

const GALLERY_ROOT = path.join(__dirname, "..", "assets", "images", "gallery");
const OUTPUT_FILE = path.join(__dirname, "..", "js", "gallery-editorial-manifest.js");
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// Every category that uses this gallery wall gets its own source folder.
// Keep in sync with the `id`s in js/gallery-categories-data.js.
const CATEGORY_IDS = [
  "editorial-layout",
  "social-media-campaigns",
  "print-brand-collateral",
  "commercial-lifestyle-photography",
  "short-form-video-reels",
];

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readPngSize(buffer) {
  if (buffer.length < 24) return null;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  const NO_LENGTH = new Set([0xd8, 0xd9, 0x01]);
  for (let marker = 0xd0; marker <= 0xd7; marker += 1) NO_LENGTH.add(marker);
  const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

  let pos = 2;
  while (pos + 1 < buffer.length) {
    if (buffer[pos] !== 0xff) {
      pos += 1;
      continue;
    }
    let markerPos = pos + 1;
    while (markerPos < buffer.length && buffer[markerPos] === 0xff) markerPos += 1;
    if (markerPos >= buffer.length) break;
    const marker = buffer[markerPos];
    pos = markerPos + 1;

    if (NO_LENGTH.has(marker)) continue;
    if (pos + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(pos);

    if (SOF.has(marker)) {
      if (pos + 7 > buffer.length) break;
      const height = buffer.readUInt16BE(pos + 3);
      const width = buffer.readUInt16BE(pos + 5);
      return { width, height };
    }
    if (segmentLength < 2) break;
    pos += segmentLength;
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.length < 30) return null;
  const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
  const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
  if (!isRiff || !isWebp) return null;
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    return { width: readUInt24LE(buffer, 24) + 1, height: readUInt24LE(buffer, 27) + 1 };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

// Minimal ISOBMFF box walker — enough to find meta > iprp > ipco > ispe for
// AVIF's declared display dimensions. Takes the first ispe box it finds,
// which is sufficient for standard single-image AVIF exports; this is not
// a full HEIF item-property-association resolver.
function readBoxes(buffer, start, end) {
  const boxes = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    let headerSize = 8;
    if (size === 1) {
      const high = buffer.readUInt32BE(pos + 8);
      const low = buffer.readUInt32BE(pos + 12);
      size = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < headerSize || pos + size > end) break;
    boxes.push({ type, start: pos + headerSize, end: pos + size });
    pos += size;
  }
  return boxes;
}

function findBox(boxes, type) {
  return boxes.find((box) => box.type === type) || null;
}

function readAvifSize(buffer) {
  if (buffer.length < 16 || buffer.toString("ascii", 4, 8) !== "ftyp") return null;

  const topBoxes = readBoxes(buffer, 0, buffer.length);
  const meta = findBox(topBoxes, "meta");
  if (!meta) return null;

  // 'meta' is a FullBox: 4 bytes of version/flags precede its children.
  const iprp = findBox(readBoxes(buffer, meta.start + 4, meta.end), "iprp");
  if (!iprp) return null;

  const ipco = findBox(readBoxes(buffer, iprp.start, iprp.end), "ipco");
  if (!ipco) return null;

  const ispe = findBox(readBoxes(buffer, ipco.start, ipco.end), "ispe");
  if (!ispe) return null;

  // 'ispe' is also a FullBox: version/flags (4 bytes), then width, height.
  return {
    width: buffer.readUInt32BE(ispe.start + 4),
    height: buffer.readUInt32BE(ispe.start + 8),
  };
}

function readImageSize(filePath, ext) {
  const buffer = fs.readFileSync(filePath);
  if (ext === ".png") return readPngSize(buffer);
  if (ext === ".jpg" || ext === ".jpeg") return readJpegSize(buffer);
  if (ext === ".webp") return readWebpSize(buffer);
  if (ext === ".avif") return readAvifSize(buffer);
  return null;
}

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

  const files = fs
    .readdirSync(sourceDir)
    .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const manifest = [];
  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(sourceDir, file);
    let size = null;
    try {
      size = readImageSize(filePath, ext);
    } catch (error) {
      console.warn(`[gallery-manifest] ${categoryId}: could not read "${file}": ${error.message}`);
    }
    if (!size || !size.width || !size.height) {
      console.warn(`[gallery-manifest] ${categoryId}: skipping "${file}" — could not determine its dimensions.`);
      return;
    }
    manifest.push({
      file,
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
