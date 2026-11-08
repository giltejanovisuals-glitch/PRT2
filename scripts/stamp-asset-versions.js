/*
 * Last build step: stamps every script and stylesheet reference in the
 * site's HTML pages with a hash of that file's current contents:
 *
 *   <script src="js/search.js?v=3a9f12c4"></script>
 *
 * vercel.json serves /js, /css and /data with a one-year immutable cache
 * whenever the URL carries ?v=, so a changed file must get a new URL —
 * this makes that automatic (no more hand-bumped version numbers) and
 * leaves unchanged files on their cached URL. Pages themselves are never
 * long-cached, so visitors always get the current set of URLs.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const PAGES = ["index.html", "cv/index.html", ...fs.readdirSync(path.join(ROOT, "pages")).filter((n) => n.endsWith(".html")).map((n) => `pages/${n}`)];
const REF = /((?:src|href)=")((?:\.\.\/)?(?:js|css|data)\/[^"?#]+\.(?:js|css))(?:\?v=[^"#]*)?(")/g;

const hashes = new Map();
const hashOf = (file) => {
  if (!hashes.has(file)) {
    hashes.set(file, fs.existsSync(file) ? crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8) : null);
  }
  return hashes.get(file);
};

let changed = 0;
let missing = 0;
PAGES.forEach((page) => {
  const pagePath = path.join(ROOT, page);
  if (!fs.existsSync(pagePath)) return;
  const html = fs.readFileSync(pagePath, "utf8");
  const out = html.replace(REF, (whole, open, ref, close) => {
    const file = path.resolve(path.dirname(pagePath), ref);
    const hash = hashOf(file);
    if (!hash) {
      missing += 1;
      console.warn(`[asset-versions] ${page}: ${ref} not found`);
      return whole;
    }
    return `${open}${ref}?v=${hash}${close}`;
  });
  if (out !== html) {
    fs.writeFileSync(pagePath, out);
    changed += 1;
  }
});
console.log(`[asset-versions] ${PAGES.length} pages checked, ${changed} updated${missing ? `, ${missing} missing files` : ""}`);
