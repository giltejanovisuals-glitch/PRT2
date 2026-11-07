/*
 * Build-time step for the mobile landing coverflow (index.html,
 * .mobile-featured; css/mobile-featured.css, js/mobile-featured.js).
 *
 * The curated slides live in scripts/featured-slides.js. For each visual this
 * writes 480w and 960w WebP copies (assets/images/featured/<id>-<w>.webp;
 * existing files are skipped — delete them to regenerate) and a tiny inline
 * WebP placeholder; reels get the same from the poster frame that
 * scripts/make-featured-clips.js saved beside their preview clip. It then
 * rewrites js/mobile-featured-data.js and the marked opening-slide, caption,
 * and preload blocks in index.html.
 *
 * Each slide also records whether its visual's proportions differ from the
 * 4:5 card (`fill`): those are shown whole over a blurred copy of themselves.
 */
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");
const SLIDES = require("./featured-slides");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "assets", "images", "featured");
const CLIP_DIR = "assets/videos/featured";
const REEL_DIR = path.join(ROOT, "assets", "videos", "short-form-reels");
const WIDTHS = [480, 960];
const WEBP_QUALITY = 80;
const PLACEHOLDER_WIDTH = 24;
const CARD_RATIO = 4 / 5;
// Within this, the artwork is shown on the plain card without the blur.
const FILL_TOLERANCE = 0.06;
// The card is clamp(190px, 68vw, 300px) wide (css/mobile-featured.css).
const SIZES = "(max-width: 279px) 190px, (max-width: 441px) 68vw, (max-width: 760px) 300px, 1px";

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

// Duration of an MP4 in seconds, from its mvhd box.
function mp4Duration(file) {
  const fd = fs.openSync(file, "r");
  const read = (pos, len) => {
    const buffer = Buffer.alloc(len);
    fs.readSync(fd, buffer, 0, len, pos);
    return buffer;
  };
  const walk = (start, end) => {
    for (let pos = start; pos + 8 <= end; ) {
      const head = read(pos, 16);
      let length = head.readUInt32BE(0);
      const type = head.toString("latin1", 4, 8);
      let header = 8;
      if (length === 1) { length = Number(head.readBigUInt64BE(8)); header = 16; }
      if (length === 0) length = end - pos;
      if (type === "moov") return walk(pos + header, pos + length);
      if (type === "mvhd") {
        const box = read(pos + header, 32);
        return box[0] === 1 ? Number(box.readBigUInt64BE(24)) / box.readUInt32BE(20) : box.readUInt32BE(16) / box.readUInt32BE(12);
      }
      pos += length;
    }
    return 0;
  };
  try { return walk(0, fs.fstatSync(fd).size); } finally { fs.closeSync(fd); }
}
const clock = (seconds) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

async function webp(id, sourcePath, crop) {
  const outputs = WIDTHS.map((w) => path.join(OUTPUT_DIR, `${id}-${w}.webp`));
  let source = null;
  const sizes = [];
  for (let i = 0; i < WIDTHS.length; i += 1) {
    if (fs.existsSync(outputs[i])) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await loadImage(fs.readFileSync(outputs[i]));
      sizes.push({ width: existing.width, height: existing.height });
      continue;
    }
    if (!source) {
      const file = path.join(ROOT, sourcePath);
      if (!fs.existsSync(file)) throw new Error(`missing source ${sourcePath}`);
      // eslint-disable-next-line no-await-in-loop
      source = await loadImage(fs.readFileSync(file));
    }
    const result = encode(source, WIDTHS[i], WEBP_QUALITY, crop);
    fs.writeFileSync(outputs[i], result.buffer);
    sizes.push({ width: result.width, height: result.height });
    console.log(`[mobile-featured] ${path.basename(outputs[i])}  ${result.width}x${result.height}`);
  }
  // The placeholder comes from the small copy, so cached builds stay fast.
  const small = await loadImage(fs.readFileSync(outputs[0]));
  const placeholder = encode(small, PLACEHOLDER_WIDTH, 50);
  const large = sizes[sizes.length - 1];
  return {
    src: `assets/images/featured/${id}-${WIDTHS[WIDTHS.length - 1]}.webp`,
    srcset: WIDTHS.map((w, i) => `assets/images/featured/${id}-${w}.webp ${sizes[i].width}w`).join(", "),
    sizes: SIZES,
    width: large.width,
    height: large.height,
    placeholder: `data:image/webp;base64,${placeholder.buffer.toString("base64")}`,
  };
}

const metaLine = (slide) => [slide.brand, slide.category, slide.year].filter(Boolean).join(" · ");

async function build() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const ids = new Set();
  const slides = [];
  for (const slide of SLIDES) {
    const { visual } = slide;
    if (!visual) throw new Error(`${slide.id}: no visual`);
    if (ids.has(slide.id) || ids.has(visual.id)) throw new Error(`${slide.id}/${visual.id} appears twice`);
    ids.add(slide.id).add(visual.id);
    const reel = visual.kind === "reel";
    if (reel && !fs.existsSync(path.join(ROOT, CLIP_DIR, `${visual.id}.mp4`))) {
      throw new Error(`missing ${CLIP_DIR}/${visual.id}.mp4 — run scripts/make-featured-clips.js`);
    }
    // eslint-disable-next-line no-await-in-loop
    const image = await webp(visual.id, reel ? `${CLIP_DIR}/${visual.id}.jpg` : visual.source, visual.crop);
    const fill = Math.abs(Math.log(image.width / image.height / CARD_RATIO)) > FILL_TOLERANCE;
    const entry = {
      id: slide.id,
      visual: visual.id,
      media: reel ? "video" : "image",
      title: slide.title,
      subtitle: slide.subtitle,
      category: slide.category,
      brand: slide.brand,
      year: slide.year || "",
      href: slide.href,
      alt: visual.alt,
      ...image,
      fill,
    };
    if (reel) {
      Object.assign(entry, {
        label: visual.label,
        file: visual.file,
        clip: `${CLIP_DIR}/${visual.id}.mp4`,
        clipLength: visual.length,
        duration: clock(mp4Duration(path.join(REEL_DIR, visual.file))),
      });
    }
    slides.push(entry);
  }
  for (let i = 0; i < slides.length; i += 1) {
    const next = slides[(i + 1) % slides.length];
    if (slides.length > 2 && slides[i].brand === next.brand) console.warn(`[mobile-featured] ${slides[i].id} and ${next.id} share a brand side by side`);
  }

  // The language switcher (js/i18n.js) translates this copy by key; the
  // English in data/locales/en.json has to say the same as featured-slides.js.
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "locales", "en.json"), "utf8"));
  const expect = (key, value) => {
    if (value && en[key] !== value) console.warn(`[mobile-featured] data/locales/en.json ${key} should be: ${value}`);
  };
  slides.forEach((slide) => {
    ["title", "subtitle", "category"].forEach((field) => expect(`featured.${slide.id}.${field}`, slide[field]));
    expect(`featured.item.${slide.visual}.alt`, slide.alt);
    expect(`featured.item.${slide.visual}.label`, slide.label);
  });

  // The opening slide is rendered into index.html. Its sources sit on a
  // <source> that only matches phones, so desktop never downloads them.
  const first = slides[0];
  if (first.media !== "image") throw new Error("the opening slide must be an image");
  const picture = (backdrop) => `<picture><source media="(max-width: 760px)" type="image/webp" srcset="${first.srcset}" sizes="${first.sizes}" /><img ${backdrop ? 'class="featured-backdrop" alt="" aria-hidden="true"' : `class="featured-image" alt="${escape(first.alt)}" fetchpriority="high" data-i18n-attr="alt:featured.item.${first.visual}.alt"`} width="${first.width}" height="${first.height}" decoding="async" /></picture>`;
  const slideBlock = `<!-- MOBILE FEATURED START -->
            <div class="featured-slide is-active" data-id="${first.id}" role="group" aria-roledescription="slide" aria-label="1 of ${slides.length}: ${escape(first.title)}" data-i18n-attr="aria-roledescription:a11y.slide">
              <a class="featured-card${first.fill ? " is-fill" : ""}" href="${first.href}" style="--placeholder: url('${first.placeholder}')">
                ${first.fill ? `${picture(true)}\n                ` : ""}${picture(false)}
                <span class="featured-shade" aria-hidden="true"></span>
              </a>
            </div>
            <!-- MOBILE FEATURED END -->`;
  const captionBlock = `<!-- MOBILE FEATURED CAPTION START -->
            <p class="featured-title">${escape(first.title)}</p>
            <p class="featured-subtitle">${escape(first.subtitle)}</p>
            <p class="featured-meta">${escape(metaLine(first))}</p>
            <!-- MOBILE FEATURED CAPTION END -->`;
  const preloadBlock = `<!-- MOBILE FEATURED PRELOAD START --><link rel="preload" as="image" type="image/webp" media="(max-width: 760px)" imagesrcset="${first.srcset}" imagesizes="${first.sizes}" fetchpriority="high" /><!-- MOBILE FEATURED PRELOAD END -->`;

  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const replaceBlock = (name, block) => {
    const label = `MOBILE FEATURED ${name ? `${name} ` : ""}`;
    const pattern = new RegExp(`<!-- ${label}START -->[\\s\\S]*?<!-- ${label}END -->`);
    if (!pattern.test(html)) throw new Error(`index.html is missing the ${label}markers`);
    html = html.replace(pattern, () => block);
  };
  replaceBlock("", slideBlock);
  replaceBlock("CAPTION", captionBlock);
  replaceBlock("PRELOAD", preloadBlock);
  fs.writeFileSync(indexPath, html);

  fs.writeFileSync(
    path.join(ROOT, "js", "mobile-featured-data.js"),
    `/* Generated by scripts/generate-mobile-featured.js — edit scripts/featured-slides.js. */\nwindow.MOBILE_FEATURED = ${JSON.stringify({ slides }, null, 2)};\n`
  );
  console.log(`[mobile-featured] ${slides.length} featured slides`);
}

build().catch((error) => {
  console.error(`[mobile-featured] ${error.stack || error.message}`);
  process.exit(1);
});
