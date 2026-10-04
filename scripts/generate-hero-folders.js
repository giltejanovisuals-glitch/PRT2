/*
 * Build-time image step for the landing hero's brand folders (index.html,
 * .hero-parallax; css/hero-parallax.css). Each folder reveals a few of
 * that brand's own visuals, hand-picked below from the gallery folders.
 * The sources are multi-megabyte PNGs, so this writes small WebP copies
 * with stable names (assets/images/hero-folders/<brand>-<n>.webp) that the
 * hero markup references directly.
 *
 * To change a folder's visuals, edit SOURCES and delete the matching
 * output files (existing outputs are skipped), then run `npm run build`.
 */
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");

const ROOT = path.join(__dirname, "..");
const GALLERY = path.join(ROOT, "assets", "images", "gallery");
const OUTPUT_DIR = path.join(ROOT, "assets", "images", "hero-folders");
const TARGET_WIDTH = 640;
const WEBP_QUALITY = 80;

// Order matters: the first image is the one in front when a folder opens.
const SOURCES = {
  "porta-mobili": [
    "social-media-campaigns/PORTA-JUNE-1.png",
    "social-media-campaigns/PORTA-JUNE-3.png",
    "commercial-lifestyle-photography/PORTA.png",
  ],
  hooga: [
    "social-media-campaigns/HOOGA ROCKWELL.png",
    "social-media-campaigns/HOOGA-JUNE-CONTENT1.png",
    "print-brand-collateral/11.2.png",
  ],
  dunlopillo: [
    "print-brand-collateral/24.2.png",
    "print-brand-collateral/1.2.png",
    "print-brand-collateral/3.2.png",
  ],
  "metal-lite": [
    "social-media-campaigns/6 JADE PENDANT LAMP.png",
    "social-media-campaigns/APR-LSAW4S1-archi-linear-light.png",
    "social-media-campaigns/APR-LSAW4S3-astralux-striplight 1.png",
  ],
};

async function build() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let made = 0;
  let total = 0;
  for (const [brand, files] of Object.entries(SOURCES)) {
    for (let i = 0; i < files.length; i += 1) {
      total += 1;
      const outputPath = path.join(OUTPUT_DIR, `${brand}-${i + 1}.webp`);
      if (fs.existsSync(outputPath)) continue;
      const sourcePath = path.join(GALLERY, files[i]);
      if (!fs.existsSync(sourcePath)) {
        console.warn(`[hero-folders] missing source ${files[i]} — ${brand} folder will show one fewer visual`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const image = await loadImage(fs.readFileSync(sourcePath));
      const scale = Math.min(1, TARGET_WIDTH / image.width);
      const canvas = createCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      fs.writeFileSync(outputPath, canvas.toBuffer("image/webp", WEBP_QUALITY));
      made += 1;
      console.log(`[hero-folders] ${brand}-${i + 1}.webp  ${canvas.width}x${canvas.height}  ← ${files[i]}`);
    }
  }
  console.log(`[hero-folders] ${total} visuals (${made} new)`);
}

build().catch((error) => {
  console.error(`[hero-folders] ${error.stack || error.message}`);
  process.exit(1);
});
