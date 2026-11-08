/*
 * Build step: writes each Project Gallery page's header copy straight into
 * its HTML (pages/<id>.html), from js/gallery-categories-data.js — the
 * category title, intro, the facts row (brands, role, deliverables, year)
 * and the objective line.
 *
 * Without this the header arrives as "—" placeholders that
 * js/gallery-editorial.js fills in after load, and the growing text pushes
 * the gallery down (a layout shift, scored by Core Web Vitals as CLS). The
 * script still re-renders the same header for other languages; in English
 * it now finds exactly what it would have written.
 *
 * The facts row and objective live between
 *   <!-- CATEGORY FACTS START --> … <!-- CATEGORY FACTS END -->
 * markers (added on the first run), so reruns replace them cleanly.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const sandbox = { window: {} };
["gallery-categories-data.js", "gallery-thumbs.js", "gallery-editorial-manifest.js", "reel-manifest.js", "gallery-editorial-meta.js"].forEach((name) => {
  const file = path.join(ROOT, "js", name);
  if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox);
});
const categories = sandbox.window.GALLERY_CATEGORIES || [];
const THUMBS = sandbox.window.GALLERY_THUMBS || {};
const MANIFEST = sandbox.window.GALLERY_EDITORIAL_MANIFEST || {};
const REELS = sandbox.window.REEL_MANIFEST || [];

// Phone preload hints for each page's first big image (its Largest
// Contentful Paint): the same AVIF set and sizes the page will request
// (js/image-variants.js, js/print-collateral-showcase.js), so the browser
// starts fetching before any script has run. media= keeps desktop out of it.
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const avifSet = (thumb, width) => {
  const stem = `../${encodePath(thumb)}`.replace(/\.webp$/, "");
  const set = [];
  if (width > 360) set.push(`${stem}-360.avif 360w`);
  set.push(`${stem}.avif ${Math.min(720, width)}w`);
  if (width > 720) set.push(`${stem}-1440.avif ${Math.min(1440, width)}w`);
  return set.join(", ");
};
const preloadLink = (thumb, width, sizes) =>
  `<link rel="preload" as="image" type="image/avif" media="(max-width: 760px)" imagesrcset="${escape(avifSet(thumb, width))}" imagesizes="${sizes}" fetchpriority="high" />`;
const lcpPreloads = (cat) => {
  if (cat.id === "short-form-video-reels") {
    // The first row of the two-column reel library.
    return REELS.slice(0, 2).filter((r) => r.thumb && r.width).map((r) => preloadLink(r.thumb, r.width, "calc(50vw - 25px)"));
  }
  const f = featuredOf(cat);
  return f ? [preloadLink(f.thumb, f.item.width, "calc(100vw - 40px)")] : [];
};

// The page's opening (first featured) image, when it has a build-time copy.
function featuredOf(cat) {
  const file = (cat.featured || [])[0];
  const thumb = file && (THUMBS[cat.id] || {})[file];
  const item = file && (MANIFEST[cat.id] || []).find((m) => m.file === file);
  return thumb && item ? { file, thumb, item } : null;
}

// Phones' featured frame, written into the HTML so the first big image needs
// no script: the same responsive sets the script uses, behind
// media="(max-width: 760px)" sources so desktop downloads nothing. The
// script crossfades from it to its own (identical) shot.
const staticShot = (cat) => {
  const f = featuredOf(cat);
  if (!f) return "";
  const { width, height } = f.item;
  const meta = ((sandbox.window.GALLERY_EDITORIAL_META || {})[cat.id] || {})[f.file] || {};
  const stem = `../${encodePath(f.thumb)}`.replace(/\.webp$/, "");
  const webpSet = [...(width > 360 ? [`${stem}-360.webp 360w`] : []), `${stem}.webp ${Math.min(720, width)}w`].join(", ");
  const sizes = "calc(100vw - 40px)";
  const backdrop = width > 360 ? `${stem}-360.webp` : `${stem}.webp`;
  return (
    `<div class="pbc-shot pbc-shot-static is-active" style="--ar: ${(width / height).toFixed(4)}; --nw: ${width}px">` +
    `<picture><source media="(max-width: 760px)" srcset="${escape(backdrop)}" /><img class="pbc-shot-backdrop" alt="" aria-hidden="true" decoding="async" /></picture>` +
    `<picture><source media="(max-width: 760px)" type="image/avif" srcset="${escape(avifSet(f.thumb, width))}" sizes="${sizes}" />` +
    `<source media="(max-width: 760px)" srcset="${escape(webpSet)}" sizes="${sizes}" />` +
    `<img class="pbc-shot-img" alt="${escape(meta.alt || "")}" width="${width}" height="${height}" decoding="async" fetchpriority="high" /></picture>` +
    `</div>`
  );
};

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const replaceInner = (html, idPattern, value) => {
  const re = new RegExp(`(<(\\w+)\\b[^>]*\\bid="${idPattern}"[^>]*>)([\\s\\S]*?)(</\\2>)`);
  if (!re.test(html)) return { html, found: false };
  return { html: html.replace(re, (_, open, tag, inner, close) => `${open}${escape(value)}${close}`), found: true };
};

let updated = 0;
categories.forEach((cat) => {
  const file = path.join(ROOT, "pages", `${cat.id}.html`);
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const eol = html.includes("\r\n") ? "\r\n" : "\n";

  let r = replaceInner(html, "category-title", cat.title);
  html = r.html;
  r = replaceInner(html, "category-intro", cat.intro);
  html = r.html;
  // Editorial header: the lede shares the intro's paragraph; with an
  // objective line below it only repeats the intro (as the script does).
  r = replaceInner(html, "category-closing-text", cat.objective ? "" : cat.lede || "");
  html = r.html;

  // The facts row and objective, right after the intro's paragraph.
  const facts = [
    ["brands", "Brands", (cat.brands || []).join(", ")],
    ["role", "Role", cat.role],
    ["deliverables", "Deliverables", cat.deliverables],
    ["year", "Year", cat.year],
  ].filter(([, , value]) => value);
  const introLine = html.match(/^([ \t]*)<p\b[^>]*>(?:(?!<\/p>)[\s\S])*id="category-intro"[\s\S]*?<\/p>[^\S\r\n]*\r?\n/m)
    || html.match(/^([ \t]*)<p\b[^>]*id="category-intro"[^>]*>[\s\S]*?<\/p>[^\S\r\n]*\r?\n/m);
  if (!introLine) {
    console.warn(`[category-headers] ${cat.id}: intro paragraph not found`);
    return;
  }
  const indent = introLine[1];
  const block = [
    `${indent}<!-- CATEGORY FACTS START -->`,
    ...(facts.length
      ? [
          `${indent}<dl id="category-facts" class="project-meta-row category-facts">`,
          ...facts.map(([key, label, value]) => `${indent}  <div><dt class="project-meta-label" data-i18n="category.facts.${key}">${label}</dt><dd class="project-meta-value">${escape(value)}</dd></div>`),
          `${indent}</dl>`,
        ]
      : []),
    ...(cat.objective ? [`${indent}<p id="category-objective" class="project-overview category-objective">${escape(cat.objective)}</p>`] : []),
    `${indent}<!-- CATEGORY FACTS END -->`,
  ].join(eol) + eol;

  const marked = /^[ \t]*<!-- CATEGORY FACTS START -->[\s\S]*?<!-- CATEGORY FACTS END -->[^\S\r\n]*\r?\n/m;
  if (marked.test(html)) html = html.replace(marked, () => block);
  else {
    const at = introLine.index + introLine[0].length;
    html = html.slice(0, at) + block + html.slice(at);
  }

  // The opening shot inside the featured frame (pages with one).
  if (/data-featured-frame/.test(html)) {
    const shot = staticShot(cat);
    const frameRe = /(<button class="pbc-frame" id="pbc-frame"[^>]*>)([\s\S]*?)(<\/button>)/;
    if (frameRe.test(html)) {
      html = html.replace(frameRe, (_, open, inner, close) => `${open}${shot ? `<!-- STATIC SHOT -->${shot}<!-- /STATIC SHOT -->` : ""}${close}`);
    }
  }

  // LCP preload, in <head> before the first stylesheet.
  const links = lcpPreloads(cat);
  const preloadMarked = /^[ \t]*<!-- LCP PRELOAD START -->[\s\S]*?<!-- LCP PRELOAD END -->[^\S\r\n]*\r?\n/m;
  html = html.replace(preloadMarked, "");
  if (links.length) {
    const firstSheet = html.match(/^([ \t]*)<link rel="stylesheet"/m);
    if (firstSheet) {
      const ind = firstSheet[1];
      const preload = [`${ind}<!-- LCP PRELOAD START -->`, ...links.map((l) => `${ind}${l}`), `${ind}<!-- LCP PRELOAD END -->`].join(eol) + eol;
      html = html.slice(0, firstSheet.index) + preload + html.slice(firstSheet.index);
    }
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
});
console.log(`[category-headers] ${updated} page${updated === 1 ? "" : "s"} updated`);
