/*
 * Search-engine and link-preview metadata. Part of `npm run build`.
 *
 * For every page listed in site.config.json "indexed" (the homepage and the
 * five Project Gallery categories) it rewrites the block between
 *   <!-- SEO START -->  …  <!-- SEO END -->
 * in the page's <head>: <title>, meta description, canonical URL, robots,
 * Open Graph, X (Twitter) card, and JSON-LD (Person + WebSite + ProfilePage
 * on the homepage; CollectionPage + BreadcrumbList + CreativeWork items on
 * category pages). Then it writes sitemap.xml and robots.txt.
 *
 * Sources — only facts the site itself shows:
 *   site.config.json              name, title, homepage copy, profiles,
 *                                 share image, current employer, region
 *   js/gallery-categories-data.js category titles, descriptions, brands
 *   js/publication-meta.js        publication titles, brands, years
 *   js/gallery-editorial-meta.js  titled gallery pieces
 *   js/reel-meta.js               titled reels
 *   js/i18n.js (LANGUAGES)        which languages are published
 *
 * The production origin comes from SITE_URL, else site.config.json
 * "origin", else Vercel's VERCEL_PROJECT_PRODUCTION_URL (set during Vercel
 * builds, preview builds included, so previews still point canonical URLs
 * at production). With no origin (a local build before the domain is
 * known), everything that needs an absolute URL — canonical, og:url,
 * og:image, JSON-LD, sitemap.xml — is left out instead of guessed, and a
 * warning is printed.
 *
 * Languages: translation happens in the browser on the same URL, so there
 * are no per-language URLs for hreflang to point at. While English is the
 * only published language no hreflang is written; if another language is
 * published before per-language URLs exist, the build says so.
 *
 * Not indexed: /cv/ (noindex in its HTML and in vercel.json) and anything
 * not listed in "indexed".
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));

// --- Origin -------------------------------------------------------------------------
const rawOrigin =
  process.env.SITE_URL ||
  config.origin ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
const ORIGIN = rawOrigin.replace(/\/+$/, "");
if (ORIGIN && !/^https:\/\/[^/]+$/.test(ORIGIN)) {
  console.error(`[seo] origin must look like https://example.com — got "${ORIGIN}"`);
  process.exit(1);
}
if (!ORIGIN) {
  console.warn("[seo] no production origin (set site.config.json \"origin\" or SITE_URL) — canonical, og:url, og:image, JSON-LD and sitemap.xml left out");
}

// --- Data -----------------------------------------------------------------------------
const readWindowData = (...files) => {
  const sandbox = { window: {} };
  files.forEach((file) => {
    const full = path.join(ROOT, "js", file);
    if (fs.existsSync(full)) vm.runInNewContext(fs.readFileSync(full, "utf8"), sandbox);
  });
  return sandbox.window;
};
const data = readWindowData("gallery-categories-data.js", "publication-manifest.js", "publication-meta.js", "gallery-editorial-meta.js", "reel-meta.js");
const categories = data.GALLERY_CATEGORIES || [];

const i18nSource = fs.readFileSync(path.join(ROOT, "js", "i18n.js"), "utf8");
const published = [...i18nSource.matchAll(/code: "([^"]+)"[^}]*published: true/g)].map((m) => m[1]);
if (published.some((code) => code !== "en")) {
  console.warn(`[seo] published languages ${published.join(", ")} share one URL per page — add per-language URLs before hreflang can list them`);
}

// --- Helpers --------------------------------------------------------------------------
const abs = (relative) => `${ORIGIN}/${String(relative).replace(/^\/+/, "")}`;
const pageUrl = (file) => (file === "index.html" ? `${ORIGIN}/` : abs(file));
const encodePath = (relative) => relative.split("/").map(encodeURIComponent).join("/");
const attr = (text) => String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const jsonLd = (object) => JSON.stringify(object, null, 0).replace(/</g, "\\u003c");
const lastModified = (file) => {
  try {
    const date = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  } catch (error) {
    return "";
  }
};

const PERSON_ID = `${ORIGIN}/#person`;
const WEBSITE_ID = `${ORIGIN}/#website`;
const share = config.shareImage;

const person = () => ({
  "@type": "Person",
  "@id": PERSON_ID,
  name: config.name,
  jobTitle: config.jobTitle,
  url: `${ORIGIN}/`,
  image: abs(config.portrait),
  sameAs: config.sameAs,
  worksFor: config.worksFor ? { "@type": "Organization", name: config.worksFor } : undefined,
  address: config.location ? { "@type": "PostalAddress", ...config.location } : undefined,
  knowsAbout: config.knowsAbout,
});
const website = () => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${ORIGIN}/`,
  name: config.name,
  description: config.home.description,
  inLanguage: "en",
  publisher: { "@id": PERSON_ID },
});
const brand = (name) => ({ "@type": "Brand", name });

// CreativeWork items each category page actually shows, with their titles.
const worksFor = (category) => {
  const url = abs(`pages/${category.id}.html`);
  const creator = { "@id": PERSON_ID };
  if (category.id === "editorial-layout") {
    const meta = data.PUBLICATION_META || {};
    return (data.PUBLICATION_MANIFEST || [])
      .filter((pub) => meta[pub.file] && meta[pub.file].title)
      .map((pub) => {
        const info = meta[pub.file];
        return {
          "@type": "CreativeWork",
          name: info.title,
          genre: info.type || undefined,
          creator,
          about: info.brand ? brand(info.brand) : undefined,
          dateCreated: info.year || undefined,
          image: pub.cover ? abs(encodePath(`assets/documents/editorial-layout/${pub.cover}`)) : undefined,
          url: `${url}?open=${encodeURIComponent(pub.file)}`,
        };
      });
  }
  if (category.id === "short-form-video-reels") {
    const meta = data.REEL_META || {};
    return Object.keys(meta)
      .filter((file) => meta[file].title && fs.existsSync(path.join(ROOT, "assets", "videos", "short-form-reels", file)))
      .slice(0, 12)
      .map((file) => ({
        "@type": "CreativeWork",
        name: meta[file].title,
        genre: meta[file].type || undefined,
        description: meta[file].alt || undefined,
        creator,
        about: meta[file].brand ? brand(meta[file].brand) : undefined,
        url: `${url}?reel=${encodeURIComponent(file)}`,
      }));
  }
  const meta = (data.GALLERY_EDITORIAL_META || {})[category.id] || {};
  const featured = category.featured || [];
  return featured
    .filter((file) => meta[file] && meta[file].title && fs.existsSync(path.join(ROOT, "assets", "images", "gallery", category.id, file)))
    .map((file) => ({
      "@type": "CreativeWork",
      name: meta[file].title,
      genre: meta[file].type || undefined,
      description: meta[file].alt || undefined,
      creator,
      about: meta[file].project ? brand(meta[file].project) : undefined,
      image: abs(encodePath(`assets/images/gallery/${category.id}/${file}`)),
      url: `${url}?open=${encodeURIComponent(file)}`,
    }));
};

// --- Per-page block -------------------------------------------------------------------
const pageInfo = (file) => {
  if (file === "index.html") {
    return {
      title: config.home.title,
      titleAttrs: ' data-i18n="meta.home.title"',
      description: config.home.description,
      descriptionKey: "meta.home.description",
      graph: () => [
        person(),
        website(),
        {
          "@type": "ProfilePage",
          "@id": `${ORIGIN}/#webpage`,
          url: `${ORIGIN}/`,
          name: config.home.title,
          description: config.home.description,
          inLanguage: "en",
          isPartOf: { "@id": WEBSITE_ID },
          mainEntity: { "@id": PERSON_ID },
          primaryImageOfPage: abs(share.path),
        },
      ],
    };
  }
  const id = path.basename(file, ".html");
  const category = categories.find((entry) => entry.id === id);
  if (!category) throw new Error(`[seo] ${file}: no category "${id}" in js/gallery-categories-data.js`);
  if (!category.description) throw new Error(`[seo] ${file}: category "${id}" has no description`);
  const url = pageUrl(file);
  return {
    title: `${category.title} | ${config.name}`,
    titleAttrs: "",
    description: category.description,
    descriptionKey: `category.${id}.description`,
    graph: () => {
      const parts = worksFor(category);
      return [
        {
          "@type": "CollectionPage",
          "@id": `${url}#webpage`,
          url,
          name: category.title,
          description: category.description,
          inLanguage: "en",
          isPartOf: { "@id": WEBSITE_ID },
          author: { "@id": PERSON_ID },
          about: (category.brands || []).map(brand),
          breadcrumb: { "@id": `${url}#breadcrumb` },
          hasPart: parts.length ? parts : undefined,
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${url}#breadcrumb`,
          itemListElement: [
            { "@type": "ListItem", position: 1, name: config.name, item: `${ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: category.title, item: url },
          ],
        },
        // The Person and WebSite the @ids above refer to.
        person(),
        website(),
      ];
    },
  };
};

const block = (file) => {
  const info = pageInfo(file);
  const lines = [
    "<!-- SEO START — written by scripts/generate-seo.js from site.config.json and js/gallery-categories-data.js; edit those, then `npm run build`. -->",
    `<title${info.titleAttrs}>${text(info.title)}</title>`,
    `<meta name="description" content="${attr(info.description)}" data-i18n-attr="content:${info.descriptionKey}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
  ];
  if (ORIGIN) lines.push(`<link rel="canonical" href="${attr(pageUrl(file))}" />`);
  lines.push(
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${attr(config.name)}" />`,
    '<meta property="og:locale" content="en_US" />',
    `<meta property="og:title" content="${attr(info.title)}" />`,
    `<meta property="og:description" content="${attr(info.description)}" />`
  );
  if (ORIGIN) {
    lines.push(
      `<meta property="og:url" content="${attr(pageUrl(file))}" />`,
      `<meta property="og:image" content="${attr(abs(share.path))}" />`,
      '<meta property="og:image:type" content="image/jpeg" />',
      `<meta property="og:image:width" content="${share.width}" />`,
      `<meta property="og:image:height" content="${share.height}" />`,
      `<meta property="og:image:alt" content="${attr(share.alt)}" />`
    );
  }
  lines.push(
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${attr(info.title)}" />`,
    `<meta name="twitter:description" content="${attr(info.description)}" />`
  );
  if (ORIGIN) {
    lines.push(
      `<meta name="twitter:image" content="${attr(abs(share.path))}" />`,
      `<meta name="twitter:image:alt" content="${attr(share.alt)}" />`,
      `<script type="application/ld+json">${jsonLd({ "@context": "https://schema.org", "@graph": info.graph() })}</script>`
    );
  }
  lines.push("<!-- SEO END -->");
  return lines.join("\n    ");
};

// --- Write pages ----------------------------------------------------------------------
const MARKERS = /<!-- SEO START[\s\S]*?<!-- SEO END -->/;
let updated = 0;
config.indexed.forEach((file) => {
  const full = path.join(ROOT, file);
  const source = fs.readFileSync(full, "utf8");
  if (!MARKERS.test(source)) {
    console.error(`[seo] ${file} has no <!-- SEO START --> / <!-- SEO END --> markers in its <head>`);
    process.exitCode = 1;
    return;
  }
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const next = source.replace(MARKERS, () => block(file).replace(/\n/g, eol));
  if (next !== source) {
    fs.writeFileSync(full, next);
    updated += 1;
  }
});

// --- sitemap.xml and robots.txt -------------------------------------------------------
const sitemapFile = path.join(ROOT, "sitemap.xml");
if (ORIGIN) {
  const urls = config.indexed.map((file) => {
    const lastmod = lastModified(file);
    return `  <url>\n    <loc>${text(pageUrl(file))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
  });
  fs.writeFileSync(sitemapFile, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
} else if (fs.existsSync(sitemapFile)) {
  fs.rmSync(sitemapFile);
}

const robots = [
  "# Written by scripts/generate-seo.js — edit there.",
  "User-agent: *",
  "Allow: /",
  // Build tooling, never pages. /cv/ stays crawlable so its noindex is seen.
  "Disallow: /scripts/",
  "Disallow: /node_modules/",
];
if (ORIGIN) robots.push("", `Sitemap: ${ORIGIN}/sitemap.xml`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `${robots.join("\n")}\n`);

console.log(`[seo] ${updated} pages updated; ${ORIGIN ? `sitemap.xml (${config.indexed.length} URLs) and robots.txt for ${ORIGIN}` : "robots.txt only (no origin)"}`);
