/*
 * Build-time step for the mobile landing carousel (index.html,
 * .mobile-featured; css/mobile-featured.css, js/mobile-featured.js).
 *
 * The curated groups live in scripts/featured-groups.js. For each image this
 * writes 480w and 960w WebP copies (assets/images/featured/<id>-<w>.webp;
 * existing files are skipped — delete them to regenerate) and a tiny inline
 * WebP placeholder; reels get the same from the poster frame that
 * scripts/make-featured-clips.js saved beside their preview clip. It then
 * rewrites js/mobile-featured-data.js and the marked first-group, caption,
 * and preload blocks in index.html.
 *
 * Each item also records whether its proportions differ from its slot's:
 * those are shown whole over a blurred copy of themselves (`fill`).
 */
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("@napi-rs/canvas");
const GROUPS = require("./featured-groups");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "assets", "images", "featured");
const CLIP_DIR = "assets/videos/featured";
const REEL_DIR = path.join(ROOT, "assets", "videos", "short-form-reels");
const WIDTHS = [480, 960];
const WEBP_QUALITY = 80;
const PLACEHOLDER_WIDTH = 24;
const AUTOPLAY_MS = 6500;

// Slot proportions (width / height) in the square frame, and the share of
// the frame's width each slot takes (for `sizes`).
const SLOTS = {
  feature: [{ ratio: 0.58, share: 0.58 }, { ratio: 0.84, share: 0.42 }, { ratio: 0.84, share: 0.42 }],
  "feature-rev": [{ ratio: 0.58, share: 0.58 }, { ratio: 0.84, share: 0.42 }, { ratio: 0.84, share: 0.42 }],
  pair: [{ ratio: 0.5, share: 0.5 }, { ratio: 0.5, share: 0.5 }],
  wide: [{ ratio: 2, share: 1 }, { ratio: 1, share: 0.5 }, { ratio: 1, share: 0.5 }],
};
// Within this, the artwork is shown on the plain stage without the blur.
const FILL_TOLERANCE = 0.06;
const sizesFor = (share) => `(max-width: 760px) calc((100vw - 40px) * ${share}), 1px`;

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
    width: large.width,
    height: large.height,
    srcset: WIDTHS.map((w, i) => `assets/images/featured/${id}-${w}.webp ${sizes[i].width}w`).join(", "),
    placeholder: `data:image/webp;base64,${placeholder.buffer.toString("base64")}`,
  };
}

async function build() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const ids = new Set();
  const groups = [];
  for (const group of GROUPS) {
    const slots = SLOTS[group.layout];
    if (!slots) throw new Error(`${group.id}: unknown layout ${group.layout}`);
    if (group.items.length !== slots.length) throw new Error(`${group.id}: ${group.layout} takes ${slots.length} items`);
    if (group.items.filter((item) => item.kind === "reel").length > 2) throw new Error(`${group.id}: at most two reels`);
    const items = [];
    for (let i = 0; i < group.items.length; i += 1) {
      const item = group.items[i];
      if (ids.has(item.id)) throw new Error(`${item.id} appears twice`);
      ids.add(item.id);
      const reel = item.kind === "reel";
      if (reel && !fs.existsSync(path.join(ROOT, CLIP_DIR, `${item.id}.mp4`))) {
        throw new Error(`missing ${CLIP_DIR}/${item.id}.mp4 — run scripts/make-featured-clips.js`);
      }
      // eslint-disable-next-line no-await-in-loop
      const image = await webp(item.id, reel ? `${CLIP_DIR}/${item.id}.jpg` : item.source, item.crop);
      const fill = Math.abs(Math.log(image.width / image.height / slots[i].ratio)) > FILL_TOLERANCE;
      const base = { id: item.id, alt: item.alt, ...image, sizes: sizesFor(slots[i].share), fill };
      if (reel) {
        items.push({
          ...base,
          kind: "reel",
          label: item.label,
          file: item.file,
          clip: `${CLIP_DIR}/${item.id}.mp4`,
          duration: clock(mp4Duration(path.join(REEL_DIR, item.file))),
        });
      } else {
        items.push({ ...base, kind: "image", href: item.href });
      }
    }
    // A group with reel previews stays up for one full pass of its clips.
    const clipMs = Math.max(0, ...group.items.filter((item) => item.kind === "reel").map((item) => item.length * 1000 + 500));
    groups.push({
      id: group.id,
      title: group.title,
      subtitle: group.subtitle,
      href: group.href,
      layout: group.layout,
      family: group.family || "",
      dwell: Math.max(AUTOPLAY_MS, clipMs),
      items,
    });
  }

  // The opening group is rendered into index.html. Its sources sit on a
  // <source> that only matches phones, so desktop never downloads them.
  const first = groups[0];
  if (first.items.some((item) => item.kind === "reel")) throw new Error("the opening group must be images only");
  const tiles = first.items
    .map((item, i) => `<a class="featured-tile${item.fill ? " is-fill" : ""}" href="${item.href}" style="--placeholder: url('${item.placeholder}')">
                <picture><source media="(max-width: 760px)" type="image/webp" srcset="${item.srcset}" sizes="${item.sizes}" /><img width="${item.width}" height="${item.height}" alt="${escape(item.alt)}" decoding="async"${i === 0 ? ' fetchpriority="high"' : ""} /></picture>
              </a>`)
    .join("\n              ");
  const groupBlock = `<!-- MOBILE FEATURED START -->
            <div class="featured-group is-active" data-layout="${first.layout}" data-id="${first.id}" role="group" aria-roledescription="slide" aria-label="1 of ${groups.length}: ${escape(first.title)}">
              ${tiles}
            </div>
            <!-- MOBILE FEATURED END -->`;
  const captionBlock = `<!-- MOBILE FEATURED CAPTION START -->
            <p class="featured-title">${escape(first.title)}</p>
            <p class="featured-subtitle">${escape(first.subtitle)}</p>
            <!-- MOBILE FEATURED CAPTION END -->`;
  const countBlock = `<!-- MOBILE FEATURED COUNT START --><span class="featured-current">01</span> / <span class="featured-total">${String(groups.length).padStart(2, "0")}</span><!-- MOBILE FEATURED COUNT END -->`;
  const linkBlock = `<!-- MOBILE FEATURED LINK START --><a class="featured-link" href="${first.href}">View Project <span aria-hidden="true">&rarr;</span></a><!-- MOBILE FEATURED LINK END -->`;
  const lead = first.items[0];
  const preloadBlock = `<!-- MOBILE FEATURED PRELOAD START --><link rel="preload" as="image" type="image/webp" media="(max-width: 760px)" imagesrcset="${lead.srcset}" imagesizes="${lead.sizes}" fetchpriority="high" /><!-- MOBILE FEATURED PRELOAD END -->`;

  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const replaceBlock = (name, block) => {
    const label = `MOBILE FEATURED ${name ? `${name} ` : ""}`;
    const pattern = new RegExp(`<!-- ${label}START -->[\\s\\S]*?<!-- ${label}END -->`);
    if (!pattern.test(html)) throw new Error(`index.html is missing the ${label}markers`);
    html = html.replace(pattern, () => block);
  };
  replaceBlock("", groupBlock);
  replaceBlock("CAPTION", captionBlock);
  replaceBlock("COUNT", countBlock);
  replaceBlock("LINK", linkBlock);
  replaceBlock("PRELOAD", preloadBlock);
  fs.writeFileSync(indexPath, html);

  fs.writeFileSync(
    path.join(ROOT, "js", "mobile-featured-data.js"),
    `/* Generated by scripts/generate-mobile-featured.js — edit scripts/featured-groups.js. */\nwindow.MOBILE_FEATURED = ${JSON.stringify({ groups }, null, 2)};\n`
  );
  console.log(`[mobile-featured] ${groups.length} featured groups, ${ids.size} visuals`);
}

build().catch((error) => {
  console.error(`[mobile-featured] ${error.stack || error.message}`);
  process.exit(1);
});
