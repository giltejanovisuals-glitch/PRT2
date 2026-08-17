# Gil Tejano — Portfolio

Static site. Open `index.html` directly or serve the folder root — no build
step is required for anything except the Editorial & Layout Design gallery's
image manifest (see below), which Vercel runs automatically via
`vercel.json`'s `buildCommand`.

## Structure

```
PRT2/
├── index.html                 Homepage — hero carousel, selected work,
│                               and the Project Gallery showcase section
├── pages/
│   ├── porta-mobili.html      Brand case study pages. All four share one
│   ├── hooga.html             template; each resolves its own content
│   ├── dunlopillo.html        from js/projects-data.js by matching its
│   ├── metal-lite.html        own filename (see js/project-gallery.js)
│   │
│   ├── editorial-layout.html  Bespoke moving-gallery page (see its own
│   │                           section below) — does NOT use the shared
│   │                           template the other four categories share.
│   ├── print-brand-collateral.html   Category gallery pages. These four
│   ├── social-media-campaigns.html   share one template; each resolves
│   ├── commercial-lifestyle-photography.html  its own content from
│   └── short-form-video-reels.html   js/gallery-categories-data.js by
│                                       matching its own filename (see
│                                       js/gallery-category.js)
├── scripts/
│   └── generate-gallery-manifest.js  Build step (see below) — scans
│                                       assets/images/gallery/editorial-layout/
│                                       and (re)writes
│                                       js/gallery-editorial-manifest.js
├── assets/
│   ├── images/
│   │   ├── about/               About Me portrait (see below)
│   │   ├── home/               Homepage carousel / work-panel images
│   │   ├── gallery/
│   │   │   └── editorial-layout/  Source images for the Editorial & Layout
│   │   │                           Design gallery (see below) — drop files
│   │   │                           here, don't edit the manifest by hand
│   │   ├── porta-mobili/       10 images, 1920×1080 (16:9), flush stacked
│   │   ├── hooga/
│   │   ├── dunlopillo/
│   │   └── metal-lite/
│   ├── icons/
│   │   └── favicon.png         Linked from every page's <head>
│   ├── fonts/                  Empty — fonts are currently loaded from
│   │                            Google Fonts CDN in each page's <head>.
│   │                            Drop self-hosted font files here if that
│   │                            changes.
│   └── files/
│       └── Gil-Tejano-CV.pdf   Linked from both "Download CV" buttons
│                                in index.html (About Me + closing CTA)
├── css/
│   ├── style.css               Shared: tokens, reset, header/nav, homepage
│   │                            (including the Project Gallery showcase)
│   ├── project-gallery.css     Case-study-only: gallery, lightbox,
│   │                            brand-nav, floating counters, category
│   │                            entry list
│   └── gallery-editorial.css   Editorial & Layout Design page only: the
│                                 moving rows, tile hover/caption, and a
│                                 couple of lightbox additions (see below)
├── js/
│   ├── script.js                Homepage: theme/menu toggles, hero
│   │                             carousel, work panel
│   ├── gallery-index.js         Homepage: Project Gallery mobile
│   │                             accordion (desktop hover is CSS-only)
│   ├── project-gallery.js       Brand pages: resolves the project from
│   │                             projects-data.js, builds the gallery,
│   │                             lightbox, prev/next nav
│   ├── gallery-category.js      The four shared-template category pages:
│   │                             resolves the category from
│   │                             gallery-categories-data.js, builds the
│   │                             entry list, lightbox, prev/next nav
│   └── gallery-editorial.js     Editorial & Layout Design page only: row
│                                 distribution, the auto-scroll loop,
│                                 drag/swipe, hover captions, lightbox
├── js/projects-data.js          Single source of truth for all brand
│                                 project copy (title, overview, gallery
│                                 layout, credits, etc.)
├── js/gallery-categories-data.js  Single source of truth for all
│                                    category copy (titles, numbering,
│                                    prev/next nav) — including Editorial
│                                    & Layout Design's own eyebrow/counter
├── js/gallery-editorial-manifest.js  AUTO-GENERATED — do not hand-edit,
│                                       see "Editorial & Layout Design
│                                       gallery" below
└── js/gallery-editorial-meta.js  Optional hand-authored titles/project/
                                    type/year/alt text for editorial-layout
                                    gallery images, keyed by filename
```

## Adding or editing a project

1. Edit its entry in `js/projects-data.js` (or add a new one — order there
   sets homepage thumbnail order and the "Project 0N" numbering).
2. Drop that project's images into `assets/images/<id>/`.
3. If it's a new project, copy any file in `pages/` to `pages/<id>.html` —
   the page needs no edits; it resolves its own id from its filename.

Currently no real photography is wired in yet — all gallery tiles render as
CSS placeholder gradients (see the `project-<id>` tone classes in
`css/style.css`) until real `<img>`/background assets are dropped into
`assets/images/`.

## Adding or editing a Project Gallery category

1. Edit its entry in `js/gallery-categories-data.js` (title, lede, intro,
   and its `entries` array — each entry is one gallery item with a
   `layout` of `landscape`, `pair`, or `portrait`, plus placeholder
   `brand`/`year`/`type`/`contribution` copy). This file also drives
   Editorial & Layout Design's eyebrow/counter/prev-next nav even though
   that page doesn't use its `entries`.
2. The five homepage showcase panels in `index.html` (`#gallery`) are
   hand-written, not generated — update a panel's copy there to match if
   you change a category's title or description.
3. If it's a new category (other than Editorial & Layout Design — see its
   own section below), copy any file in `pages/print-brand-collateral.html`
   etc. to `pages/<id>.html` — it resolves its own id from its filename,
   same as the brand pages.

All category copy is currently placeholder ("Client Name", generic
project types) and every tile renders as a CSS gradient (the
`showcase-tone-*` classes in `css/style.css`) until real project entries
and images replace them.

### Dropping in the five showcase cover images

Each homepage panel already has real `<picture>`/`<img>` markup pointing at
files that don't exist yet, so nothing needs to change in the HTML/CSS —
just add files at these exact paths and they'll appear automatically (the
gradient stays as a silent fallback if a file is ever missing or fails to
load):

```
assets/images/gallery/editorial-layout-cover.{avif,webp,jpg}
assets/images/gallery/social-media-campaigns-cover.{avif,webp,jpg}
assets/images/gallery/print-brand-collateral-cover.{avif,webp,jpg}
assets/images/gallery/commercial-lifestyle-photography-cover.{avif,webp,jpg}
assets/images/gallery/short-form-video-reels-cover.{avif,webp,jpg}
```

- Only the `.jpg` is required (it's the `<img src>` fallback); `.avif`/
  `.webp` are optional but preferred — the browser picks the first format
  it supports.
- Target roughly 200–350 KB per image, landscape, at least 1200px on the
  short edge (panels can grow to `clamp(440px, 60vh, 620px)` tall).
- If an image's important content sits somewhere other than dead-center,
  tune `object-position` for that one image via its tone class, e.g.:
  ```css
  .showcase-tone-retail .showcase-panel-img { object-position: center 30%; }
  ```

## Editorial & Layout Design gallery

`pages/editorial-layout.html` is a bespoke page, not an instance of the
shared category template: a wall of 2–3 horizontally auto-scrolling rows of
mixed-aspect-ratio images (`css/gallery-editorial.css`,
`js/gallery-editorial.js`). It sources images through a generated manifest
instead of hand-written `<img>` tags, so a plain drag-and-drop of files is
enough to populate it.

**To add images:**

1. Drop `.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif` files into
   `assets/images/gallery/editorial-layout/`.
2. Run `npm run build` (this also runs automatically on every Vercel
   deploy, via `vercel.json`'s `buildCommand`). It rewrites
   `js/gallery-editorial-manifest.js` — a plain
   `window.GALLERY_EDITORIAL_MANIFEST` array with each file's name, pixel
   width/height, and aspect ratio, read directly from the image's own
   header bytes (no dependencies, no browser directory access).
3. Optionally add a matching entry to `js/gallery-editorial-meta.js`,
   keyed by filename, with `title`, `project`, `type`, `year`, and `alt` —
   see the example already in that file. Anything you don't set falls back
   to a title guessed from the filename and empty project/type/year/alt.

**Never hand-edit `js/gallery-editorial-manifest.js`** — it's overwritten
by `npm run build` every time.

While the source folder is empty (as shipped), the gallery renders 21
generated placeholder tiles cycling through five aspect ratios (landscape,
portrait, square, catalogue-spread, vertical-page) with generic captions —
see `buildPlaceholderEntries` in `js/gallery-editorial.js`. They disappear
automatically the moment the manifest has at least one real image.

Row count (3 desktop / 2 mobile), scroll speed (35–50s per loop, tuned per
row in `ROW_DURATIONS_MS`), pause-on-hover/focus/drag/lightbox, and
`prefers-reduced-motion` handling all live in that same file if they need
tuning.

### Dropping in the About Me portrait

The homepage's About Me section (`index.html`, `#about`) already has real
`<picture>`/`<img>` markup pointing at a file that doesn't exist yet:

```
assets/images/about/portrait.{avif,webp,jpg}
```

- Only the `.jpg` is required; `.avif`/`.webp` are optional but preferred.
- Vertical `4:5` crop, natural/soft lighting, mostly monochrome or subtly
  desaturated so it sits inside the site's palette.
- Until the file exists (or if it ever fails to load), the `<img>`'s
  `onerror` hides it and a "GT" monogram placeholder (`.about-portrait-mark`
  in `css/style.css`) reads through instead.

## Dropping in the "Brands I've Supported" logos

The homepage's Brands strip (`index.html`, inside the profile section)
already has real `<img>` markup for each brand, pointing at files that
don't exist yet — add files at these exact paths and they'll appear
automatically:

```
assets/images/brands/porta-mobili.svg
assets/images/brands/etro.svg
assets/images/brands/stoneleaf.svg
assets/images/brands/hooga.svg
assets/images/brands/mooni.svg
assets/images/brands/bw.svg
assets/images/brands/dunlopillo.svg
assets/images/brands/metal-lite.svg
```

- SVG is preferred (crisp at any size, tiny file size). If you only have a
  PNG, rename the `src` in `index.html` for that one brand to `.png` — the
  `<img>` and its `onerror` fallback don't care about format.
- Until a file exists (or if one ever fails to load), that logo's `onerror`
  hides the broken image and reveals a typographic fallback instead — this
  is why every brand still shows as text right now.
- Each logo renders at a fixed height (not fixed width) via
  `.brand-logo-img { height: 100% }` inside a `1.85rem`-tall `.brand-logo`
  box, so mismatched logo proportions still sit level in the row. Prefer
  a version with tight/no internal padding so the visual weight matches
  its neighbors.
- Logos render grayscale at rest and switch to full color on hover/focus.
  If a mark is a single flat color already (not literally grayscale), pick
  a source file with transparent (not white) background so it isn't boxed
  in against the page background in dark mode.

## Wiring up the "Start a Creative Build" inquiry form

`index.html`'s closing section (`#inquiry-form`, inside `.cta-build`) is a
full client-side inquiry form — chips, message templates, validation,
success/error states — that sends through
[EmailJS](https://www.emailjs.com) (loaded via CDN in `index.html`'s
`<head>`). It ships with empty credentials, so submitting currently fails
with a console error and the on-page error banner until you fill in your
own values.

1. Sign up free at emailjs.com and add an **Email Service** connected to
   `giltejano.visuals@gmail.com` (or whichever inbox should receive
   inquiries). Note its **Service ID**.
2. Create an **Email Template** for the owner notification. It receives
   these variables from the form, so reference them in the template body
   as `{{name}}`, `{{email}}`, `{{company}}`, `{{inquiry_types}}`,
   `{{message}}`, `{{budget}}`, `{{timeline}}`. Note its **Template ID**.
3. Optionally create a second template that auto-replies to `{{email}}`
   with a short "I've received your inquiry" confirmation for the client
   — same variables available. Note its **Template ID**. Skip this step
   (leave the constant blank) if you don't want an automatic client copy;
   the owner notification is the only one required for the form to work.
4. Copy your **Public Key** from Account → General.
5. Paste all four values into the `EMAILJS_*` constants near the top of
   the "5. Start a Creative Build" section in `js/script.js`:
   ```js
   const EMAILJS_PUBLIC_KEY = "";
   const EMAILJS_SERVICE_ID = "";
   const EMAILJS_TEMPLATE_OWNER = "";
   const EMAILJS_TEMPLATE_CLIENT = ""; // optional
   ```

Once those are filled in, submissions send for real — no other code
changes needed. The client-confirmation template (if configured) is
sent best-effort after the owner notification succeeds; its failure
never blocks the inquiry from being reported as sent to the visitor.
