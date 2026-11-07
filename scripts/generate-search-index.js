/*
 * Build-time generator for the site-wide search (js/search.js).
 *
 * Writes data/search-index.json — one flat list of entries — from:
 *   - js/gallery-categories-data.js  Project Gallery collections
 *   - js/publication-manifest.js     editorial publications that have a
 *     + js/publication-meta.js       hand-written title in the meta
 *   - js/home-previews.js            collection thumbnails
 *   - data/search-content.json       hand-authored sections, capabilities,
 *                                    tools, brands, career, education,
 *                                    shortcuts, and extra keywords
 * so new projects and collections appear in search after `npm run build`
 * without touching the search code.
 *
 * Every entry is checked against the file system: an entry whose page is
 * missing is dropped, and a thumbnail that doesn't exist is left out.
 *
 * Entry shape:
 *   { id, title, group, kind, description, keywords: [], url, thumb?, logo?, l10n? }
 * `group` is projects | brands | capabilities | tools | sections; `url` is
 * relative to the site root (page, optionally with a #section).
 *
 * The index itself stays English. `l10n` names the data/locales keys that
 * translate an entry — { title, description, kind, body, keywords } or, for
 * publications, `parts` joined with " · " — so js/search.js can show and
 * match it in the visitor's language while the English stays searchable.
 * Keys come from `search.entry.<id>.<field>`, an explicit `descriptionKey`,
 * or any en.json string identical to the English (so a section reuses its
 * heading's translation); only keys that exist in en.json are written.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "data", "search-index.json");
const GROUPS = ["projects", "brands", "capabilities", "tools", "sections"];

// Run a browser data file (window.X = …) and return its window object.
function readWindowData(...files) {
  const sandbox = { window: {} };
  files.forEach((file) => {
    const full = path.join(ROOT, "js", file);
    if (fs.existsSync(full)) vm.runInNewContext(fs.readFileSync(full, "utf8"), sandbox);
  });
  return sandbox.window;
}

const exists = (relative) => Boolean(relative) && fs.existsSync(path.join(ROOT, relative.split(/[?#]/)[0]));
const splitList = (text) =>
  String(text || "")
    .split(/[,·|]/)
    .map((part) => part.trim())
    .filter(Boolean);
const unique = (list) => [...new Set(list.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];

const content = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "search-content.json"), "utf8"));
const aliases = content.aliases || {};

// --- Translation keys (data/locales/en.json) --------------------------------------
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "locales", "en.json"), "utf8"));
const slug = (text) => String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const keyIf = (key) => (key && typeof en[key] === "string" ? key : undefined);
// An existing translation of the very same English string.
const byValue = new Map();
Object.keys(en)
  .filter((key) => !key.startsWith("_meta.") && !/\{\w+\}/.test(en[key]) && !key.startsWith("featured."))
  .sort((a, b) => Number(!a.startsWith("search.")) - Number(!b.startsWith("search.")))
  .forEach((key) => {
    if (!byValue.has(en[key])) byValue.set(en[key], key);
  });
const valueKey = (value) => (value ? byValue.get(value) : undefined);
const kindKey = (kind) => keyIf(`search.kind.${slug(kind)}`) || keyIf(`term.${slug(kind)}`);
const compact = (object) => {
  const out = {};
  Object.keys(object).forEach((key) => {
    if (object[key] !== undefined) out[key] = object[key];
  });
  return Object.keys(out).length ? out : undefined;
};
const data = readWindowData(
  "gallery-categories-data.js",
  "publication-manifest.js",
  "publication-meta.js",
  "home-previews.js"
);

const entries = [];

// --- Project Gallery collections -----------------------------------------------
const previews = data.HOME_GALLERY_PREVIEWS || {};
(data.GALLERY_CATEGORIES || []).forEach((category) => {
  const url = `pages/${category.id}.html`;
  entries.push({
    id: `collection-${category.id}`,
    l10n: compact({
      title: keyIf(`category.${category.id}.title`),
      description: keyIf(`category.${category.id}.${category.lede ? "lede" : "intro"}`),
      body: keyIf(`category.${category.id}.intro`),
      kind: kindKey("Gallery collection"),
      keywords: keyIf(`search.collection.${category.id}.keywords`),
    }),
    title: category.title,
    group: "projects",
    kind: "Gallery collection",
    description: category.lede || category.intro,
    keywords: [
      "project gallery",
      ...(category.entries || []).map((entry) => entry.type),
      ...(aliases[url] || []),
    ],
    body: category.intro,
    url,
    thumb: (previews[category.id] || [])[0],
  });
});

// --- Editorial publications (only those with a hand-written title) --------------
const meta = data.PUBLICATION_META || {};
(data.PUBLICATION_MANIFEST || []).forEach((publication) => {
  const info = meta[publication.file];
  if (!info || !info.title) return;
  const url = "pages/editorial-layout.html";
  entries.push({
    id: `publication-${slug(publication.file.replace(/\.pdf$/i, ""))}`,
    l10n: compact({
      kind: kindKey(info.type || "Publication"),
      parts: [info.brand, info.year, publication.pageCount && { key: "pub.pages", count: publication.pageCount }].filter(Boolean),
    }),
    title: info.title,
    group: "projects",
    kind: info.type || "Publication",
    description: [info.brand, info.year, publication.pageCount && `${publication.pageCount} pages`].filter(Boolean).join(" · "),
    keywords: ["editorial", "publication", info.brand, info.type, info.year, ...splitList(info.role)],
    body: info.description || "",
    url,
    thumb: publication.cover ? `assets/documents/editorial-layout/${publication.cover}` : undefined,
  });
});

// --- Hand-authored entries -------------------------------------------------------
(content.entries || []).forEach((entry) => {
  const { descriptionKey, ...rest } = entry;
  entries.push({
    ...rest,
    l10n: compact({
      title: keyIf(`search.entry.${entry.id}.title`) || valueKey(entry.title),
      description: keyIf(descriptionKey) || keyIf(`search.entry.${entry.id}.description`) || valueKey(entry.description),
      kind: kindKey(entry.kind),
      keywords: keyIf(`search.entry.${entry.id}.keywords`),
    }),
  });
});

// --- Validate and write -----------------------------------------------------------
const index = [];
let dropped = 0;
entries.forEach((entry) => {
  if (!GROUPS.includes(entry.group) || !entry.title || !exists(entry.url)) {
    dropped += 1;
    console.warn(`[search-index] dropped "${entry.title}" (${entry.url}): missing page or bad group`);
    return;
  }
  const out = {
    id: entry.id || slug(`${entry.group}-${entry.title}`),
    title: entry.title,
    group: entry.group,
    kind: entry.kind || "",
    description: entry.description || "",
    keywords: unique(entry.keywords || []),
    url: entry.url,
  };
  if (entry.body) out.body = entry.body;
  if (entry.l10n) out.l10n = entry.l10n;
  if (exists(entry.thumb)) {
    out.thumb = entry.thumb;
    if (/\/brands\//.test(entry.thumb)) out.logo = true; // ink logos: inverted in dark mode
  }
  index.push(out);
});

const shortcuts = (content.shortcuts || [])
  .filter((shortcut) => exists(shortcut.url))
  .map((shortcut) => {
    const l10n = compact({ title: valueKey(shortcut.title), kind: kindKey(shortcut.kind) });
    return l10n ? { ...shortcut, l10n } : shortcut;
  });

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
const json = JSON.stringify({ shortcuts, entries: index }, null, 1);
fs.writeFileSync(OUTPUT, `${json}\n`);
// The same index as a script, which loads even when the site is opened
// straight from disk (file://), where browsers block fetch().
const header = [
  "/*",
  " * AUTO-GENERATED by scripts/generate-search-index.js — do not edit by hand.",
  " * Edit data/search-content.json or the project data, then run `npm run build`.",
  " */",
].join("\n");
fs.writeFileSync(OUTPUT.replace(/\.json$/, ".js"), `${header}\nwindow.SEARCH_INDEX = ${json};\n`);
console.log(`[search-index] Wrote ${index.length} entries (${dropped} dropped) to ${path.relative(process.cwd(), OUTPUT)}`);
