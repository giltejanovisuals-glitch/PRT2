/*
 * Writes the welcome / page-transition overlay into every page:
 *
 *   <head>  between PAGE TRANSITION HEAD START/END — the critical styles
 *           (scripts/templates/page-transition.css) and boot script
 *           (scripts/templates/page-transition-boot.js) inlined, so the
 *           overlay paints with the first frame, plus js/page-transition.js
 *           (and, on the homepage, a preload for the GT monogram).
 *   <body>  between PAGE TRANSITION OVERLAY START/END, first thing in the
 *           body — the overlay itself: the personal introduction on the
 *           homepage, the category's number and title on each project page
 *           (from js/gallery-categories-data.js, so a new category picks up
 *           its own once its page exists and this runs).
 *
 * Edit the templates or the text here, then `npm run build`.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8").trim();
const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const indent = (text, spaces) => text.split("\n").map((line) => (line ? " ".repeat(spaces) + line : line)).join("\n");

const css = read("scripts/templates/page-transition.css");
const boot = read("scripts/templates/page-transition-boot.js");

const sandbox = { window: {} };
vm.runInNewContext(read("js/gallery-categories-data.js"), sandbox);
const categories = sandbox.window.GALLERY_CATEGORIES || [];

const headBlock = (prefix, isHome) =>
  [
    "<!-- PAGE TRANSITION HEAD START -->",
    ...(isHome ? [`<link rel="preload" as="image" href="${prefix}assets/icons/logo.png" crossorigin />`] : []),
    `<style>\n${indent(css, 2)}\n</style>`,
    `<script>\n${indent(boot, 2)}\n</script>`,
    `<script src="${prefix}js/page-transition.js?v=3" defer></script>`,
    "<!-- PAGE TRANSITION HEAD END -->",
  ].join("\n");

const homeOverlay = (prefix) => `<div class="pt-overlay" aria-hidden="true" inert>
  <div class="pt-inner">
    <span class="pt-mark" style="--pt-logo: url('${prefix}assets/icons/logo.png')"></span>
    <p class="pt-title pt-title-home">Gil Tejano Culas</p>
    <p class="pt-sub"><span>Senior Graphic Designer /</span> <span>Creative Specialist</span></p>
    <span class="pt-line"></span>
  </div>
</div>`;

const projectOverlay = (category) => `<div class="pt-overlay" aria-hidden="true" inert>
  <div class="pt-inner">
    <p class="pt-number">${escape(category.number)}</p>
    <p class="pt-title pt-title-project">${escape(category.title)}</p>
    <span class="pt-line"></span>
  </div>
</div>`;

const bodyBlock = (overlay) =>
  ["<!-- PAGE TRANSITION OVERLAY START -->", overlay, "<!-- PAGE TRANSITION OVERLAY END -->"].join("\n");

const HEAD_RE = /[ \t]*<!-- PAGE TRANSITION HEAD START -->[\s\S]*?<!-- PAGE TRANSITION HEAD END -->\n?/;
const BODY_RE = /[ \t]*<!-- PAGE TRANSITION OVERLAY START -->[\s\S]*?<!-- PAGE TRANSITION OVERLAY END -->\n?/;

// Replaces an existing block, or inserts it after the first match of `anchor`.
const place = (html, re, block, anchor, file) => {
  const text = indent(block, 4) + "\n";
  if (re.test(html)) return html.replace(re, () => text);
  const match = anchor.exec(html);
  if (!match) throw new Error(`${file}: no place for the page transition (${anchor})`);
  const at = match.index + match[0].length;
  return html.slice(0, at) + "\n" + text + html.slice(at).replace(/^\n/, "");
};

const pages = [
  { file: "index.html", prefix: "", overlay: homeOverlay(""), isHome: true },
  { file: "cv/index.html", prefix: "../", overlay: projectOverlay({ number: "CV", title: "Curriculum Vitae" }), isHome: false },
  ...categories
    .filter((category) => fs.existsSync(path.join(ROOT, "pages", `${category.id}.html`)))
    .map((category) => ({ file: `pages/${category.id}.html`, prefix: "../", overlay: projectOverlay(category), isHome: false })),
];

pages.forEach(({ file, prefix, overlay, isHome }) => {
  const full = path.join(ROOT, file);
  const original = fs.readFileSync(full, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  let html = original.replace(/\r\n/g, "\n");
  // After the theme script, so the overlay's colors match from the start.
  html = place(html, HEAD_RE, headBlock(prefix, isHome), /<script>\s*\(function \(\) \{[\s\S]*?<\/script>/, file);
  html = place(html, BODY_RE, bodyBlock(overlay), /<body[^>]*>/, file);
  fs.writeFileSync(full, html.replace(/\n/g, newline));
});

console.log(`[page-transition] Updated ${pages.length} pages`);
