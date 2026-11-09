/*
 * The 1200 × 630 link-preview image (Open Graph / X) used by every indexed
 * page: assets/images/share/gil-tejano-culas-portfolio.jpg.
 *
 * Name, professional title, and four pieces of real work — one each from
 * Social Media Campaigns, Editorial, Print, and Photography (the 960w
 * featured copies in assets/images/featured/). Dark brand background, teal
 * accent, headline face as on the site (Helvetica Neue / Arial).
 *
 * Part of `npm run build`, but it only draws when the file is missing (or
 * with --force), because the build server may not have the fonts used here.
 * Commit the result. To change the visuals, edit VISUALS and run
 *   node scripts/generate-share-image.js --force
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "images", "share", "gil-tejano-culas-portfolio.jpg");
const FORCE = process.argv.includes("--force");
const W = 1200;
const H = 630;
const VISUALS = [
  "assets/images/featured/hooga-key-visual-960.webp",
  "assets/images/featured/porta-deck-design-classic-960.webp",
  "assets/images/featured/dunlopillo-booth-960.webp",
  "assets/images/featured/boucle-lounge-chair-960.webp",
];
const COLORS = { bg: "#151515", text: "#f2f0ea", muted: "#b8c1bd", accent: "#3fac9f" };

if (fs.existsSync(OUT) && !FORCE) {
  console.log(`[share-image] ${path.relative(ROOT, OUT)} exists (use --force to redraw)`);
  process.exit(0);
}

let canvasLib;
try {
  canvasLib = require("@napi-rs/canvas");
} catch (error) {
  console.warn(`[share-image] @napi-rs/canvas unavailable (${error.message}); share image not drawn`);
  process.exit(0);
}
const { createCanvas, loadImage } = canvasLib;

const cover = (ctx, img, x, y, w, h) => {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
};

(async () => {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Work: a 2 × 2 grid filling the right side.
  const gridX = 640;
  const gap = 6;
  const cellW = (W - gridX - gap) / 2;
  const cellH = (H - gap) / 2;
  const images = await Promise.all(VISUALS.map((file) => loadImage(path.join(ROOT, file))));
  images.forEach((img, i) => {
    cover(ctx, img, gridX + (i % 2) * (cellW + gap), Math.floor(i / 2) * (cellH + gap), cellW, cellH);
  });

  // Logo mark, tinted teal.
  const logo = await loadImage(path.join(ROOT, "assets", "icons", "logo.png"));
  const logoW = 92;
  const logoH = (logo.height / logo.width) * logoW;
  const mark = createCanvas(Math.ceil(logoW), Math.ceil(logoH));
  const mctx = mark.getContext("2d");
  mctx.drawImage(logo, 0, 0, logoW, logoH);
  mctx.globalCompositeOperation = "source-in";
  mctx.fillStyle = COLORS.accent;
  mctx.fillRect(0, 0, logoW, logoH);
  const left = 72;
  ctx.drawImage(mark, left, 84);

  const font = (size, weight = 400) => `${weight} ${size}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLORS.accent;
  ctx.font = font(17, 700);
  ctx.letterSpacing = "4px";
  ctx.fillText("PORTFOLIO", left, 232);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(64);
  ctx.letterSpacing = "-1px";
  ctx.fillText("Gil Tejano", left, 310);
  ctx.fillText("Culas", left, 382);

  ctx.fillStyle = COLORS.muted;
  ctx.font = font(25);
  ctx.letterSpacing = "0px";
  ctx.fillText("Senior Graphic Designer /", left, 440);
  ctx.fillText("Creative Specialist", left, 474);

  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(left, 520, 64, 2);

  ctx.fillStyle = COLORS.muted;
  ctx.font = font(18);
  ctx.fillText("Editorial · Campaigns · Print · Photography · Reels", left, 560);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, await canvas.encode("jpeg", 86));
  console.log(`[share-image] Wrote ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
})().catch((error) => {
  console.warn(`[share-image] not drawn: ${error.message}`);
});
