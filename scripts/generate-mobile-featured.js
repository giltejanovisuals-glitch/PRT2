/*
 * Build-time step for the mobile landing carousel (index.html,
 * .mobile-featured; css/mobile-featured.css, js/mobile-featured.js).
 *
 * FEATURED is the manually approved collection — never a random pick from
 * the gallery folders. The first entry is the fixed opening slide; the
 * browser shuffles the other five once per session. Keep one visual per
 * category and brand, and prefer artwork that reads well at phone width.
 *
 * For each entry this writes 480w and 960w WebP copies
 * (assets/images/featured/<id>-<w>.webp, existing files are skipped — delete
 * them to regenerate) and a tiny inline WebP placeholder, then rewrites
 * js/mobile-featured-data.js and the marked first-slide and preload blocks
 * in index.html.
 */
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "assets", "images", "featured");
const WIDTHS = [480, 960];
const WEBP_QUALITY = 80;
const PLACEHOLDER_WIDTH = 24;
const SIZES = "(max-width: 760px) calc(100vw - 40px), 1px";

// Each slide opens its piece directly on its Project Gallery page: the image
// in the fullscreen lightbox, the publication in the reader, or the reel in
// its player (js/print-collateral-showcase.js, js/publication-reader.js).
const openIn = (page, file) => `pages/${page}.html?open=${encodeURIComponent(file)}`;

const FEATURED = [
  {
    id: "hooga-key-visual",
    brand: "Hooga",
    title: "Brand Campaign Key Visual",
    href: openIn("social-media-campaigns", "HOOGA ROCKWELL.png"),
    source: "assets/images/gallery/social-media-campaigns/HOOGA ROCKWELL.png",
    alt: "Hooga “A New Sense of Comfort” key visual: a tan leather sofa beneath glowing circular ceiling lights in a warm walnut-toned room.",
  },
  {
    id: "porta-mobili-brand-deck",
    brand: "Porta Mobili",
    title: "Editorial Brand Deck",
    href: openIn("editorial-layout", "porta-mobili-brand-deck-web.pdf"),
    source: "assets/documents/editorial-layout/pages/porta-mobili-brand-deck-web/page-001.jpg",
    crop: { left: 14 }, // the page render has a thin white edge
    alt: "Porta Mobili brand deck cover: the sculpted curve of a cream chair emerging from deep shadow beside the Porta Mobili wordmark.",
  },
  {
    id: "bw-product-photography",
    brand: "BW",
    title: "Commercial Product Photography",
    href: openIn("commercial-lifestyle-photography", "BW 2025 - 02.jpg"),
    source: "assets/images/gallery/commercial-lifestyle-photography/BW 2025 - 02.jpg",
    alt: "A model dressed in white seated on a curved bouclé sofa beside a polished round side table, photographed for BW furniture.",
  },
  {
    id: "dunlopillo-retail",
    brand: "Dunlopillo",
    title: "Print & Retail Application",
    href: openIn("print-brand-collateral", "36.2.png"),
    source: "assets/images/gallery/print-brand-collateral/36.2.png",
    alt: "Dunlopillo “Your World of Deep Sleep” campaign on a showroom poster and a delivery truck wrap, showing a mattress on a misty forest lake.",
  },
  {
    id: "metal-lite-lighting",
    brand: "Metal-Lite",
    title: "Lighting Campaign Visual",
    href: openIn("social-media-campaigns", "APR-LSAW4S3-astralux-striplight 3.png"),
    source: "assets/images/gallery/social-media-campaigns/APR-LSAW4S3-astralux-striplight 3.png",
    alt: "Metal-Lite Astra Lux strip lighting campaign: warm light tracing a floating timber staircase and dark feature wall in a modern interior.",
  },
  {
    id: "mooni-reel",
    brand: "Mooni",
    title: "Short-Form Reel",
    href: openIn("short-form-video-reels", "MOONI FW20202.3.mp4"),
    source: "assets/videos/short-form-reels/MOONI FW20202.3.jpg",
    alt: "Frame from a Mooni “GRWM to sleep” reel: a woman in green loungewear preparing a mattress in a softly lit bedroom.",
  },
];

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// crop trims source pixels from any edge: { top, right, bottom, left }.
function encode(image, width, quality, crop = {}) {
  const sx = crop.left || 0;
  const sy = crop.top || 0;
  const sw = image.width - sx - (crop.right || 0);
  const sh = image.height - sy - (crop.bottom || 0);
  const scale = Math.min(1, width / sw);
  const canvas = createCanvas(Math.round(sw * scale), Math.round(sh * scale));
  canvas.getContext("2d").drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return { buffer: canvas.toBuffer("image/webp", quality), width: canvas.width, height: canvas.height };
}

async function build() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const slides = [];
  for (const item of FEATURED) {
    const outputs = WIDTHS.map((w) => path.join(OUTPUT_DIR, `${item.id}-${w}.webp`));
    let source = null;
    const sourceImage = async () => {
      if (!source) {
        const file = path.join(ROOT, item.source);
        if (!fs.existsSync(file)) throw new Error(`missing source ${item.source}`);
        // eslint-disable-next-line no-await-in-loop
        source = await loadImage(fs.readFileSync(file));
      }
      return source;
    };
    const sizes = [];
    for (let i = 0; i < WIDTHS.length; i += 1) {
      if (fs.existsSync(outputs[i])) {
        // eslint-disable-next-line no-await-in-loop
        const existing = await loadImage(fs.readFileSync(outputs[i]));
        sizes.push({ width: existing.width, height: existing.height });
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const result = encode(await sourceImage(), WIDTHS[i], WEBP_QUALITY, item.crop);
      fs.writeFileSync(outputs[i], result.buffer);
      sizes.push({ width: result.width, height: result.height });
      console.log(`[mobile-featured] ${path.basename(outputs[i])}  ${result.width}x${result.height}`);
    }
    // The placeholder comes from the small copy, so cached builds stay fast.
    // eslint-disable-next-line no-await-in-loop
    const small = await loadImage(fs.readFileSync(outputs[0]));
    const placeholder = encode(small, PLACEHOLDER_WIDTH, 50);
    const large = sizes[sizes.length - 1];
    slides.push({
      id: item.id,
      brand: item.brand,
      title: item.title,
      href: item.href,
      alt: item.alt,
      width: large.width,
      height: large.height,
      srcset: WIDTHS.map((w, i) => `assets/images/featured/${item.id}-${w}.webp ${sizes[i].width}w`).join(", "),
      placeholder: `data:image/webp;base64,${placeholder.buffer.toString("base64")}`,
    });
  }

  const first = slides[0];
  const slideBlock = `<!-- MOBILE FEATURED START -->
          <div class="featured-slide is-active" role="group" aria-roledescription="slide" aria-label="1 of ${slides.length}" data-id="${first.id}" style="--placeholder: url('${first.placeholder}')">
            <a class="featured-media" href="${first.href}">
              <picture><source media="(max-width: 760px)" type="image/webp" srcset="${first.srcset}" sizes="${SIZES}" /><img width="${first.width}" height="${first.height}" alt="${escape(first.alt)}" decoding="async" fetchpriority="high" /></picture>
            </a>
          </div>
          <!-- MOBILE FEATURED END -->`;
  const captionBlock = `<!-- MOBILE FEATURED CAPTION START -->
          <p class="featured-brand">${escape(first.brand)}</p>
          <p class="featured-title">${escape(first.title)}</p>
          <!-- MOBILE FEATURED CAPTION END -->`;
  const preloadBlock = `<!-- MOBILE FEATURED PRELOAD START --><link rel="preload" as="image" type="image/webp" media="(max-width: 760px)" imagesrcset="${first.srcset}" imagesizes="${SIZES}" fetchpriority="high" /><!-- MOBILE FEATURED PRELOAD END -->`;

  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const replaceBlock = (name, block) => {
    const pattern = new RegExp(`<!-- MOBILE FEATURED ${name ? `${name} ` : ""}START -->[\\s\\S]*?<!-- MOBILE FEATURED ${name ? `${name} ` : ""}END -->`);
    if (!pattern.test(html)) throw new Error(`index.html is missing the MOBILE FEATURED ${name || "slide"} markers`);
    html = html.replace(pattern, () => block);
  };
  replaceBlock("", slideBlock);
  replaceBlock("CAPTION", captionBlock);
  replaceBlock("PRELOAD", preloadBlock);
  fs.writeFileSync(indexPath, html);

  fs.writeFileSync(
    path.join(ROOT, "js", "mobile-featured-data.js"),
    `/* Generated by scripts/generate-mobile-featured.js — edit FEATURED there. */\nwindow.MOBILE_FEATURED = ${JSON.stringify({ sizes: SIZES, slides }, null, 2)};\n`
  );
  console.log(`[mobile-featured] ${slides.length} featured slides`);
}

build().catch((error) => {
  console.error(`[mobile-featured] ${error.stack || error.message}`);
  process.exit(1);
});
