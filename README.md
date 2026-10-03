# Gil Tejano — Portfolio

Static site. Open `index.html` directly or serve the folder root — no build
step is required for anything except the Project Gallery categories'
image manifest (see below), which Vercel runs automatically via
`vercel.json`'s `buildCommand`.

## Structure

```
PRT2/
├── index.html                 Homepage — split-screen hero with the brand
│                               folders, and the Project Gallery showcase
├── pages/
│   ├── porta-mobili.html      Brand case study pages. All four share one
│   ├── hooga.html             template; each resolves its own content
│   ├── dunlopillo.html        from js/projects-data.js by matching its
│   ├── metal-lite.html        own filename (see js/project-gallery.js)
│   │
│   ├── editorial-layout.html  Project Gallery category pages. All five
│   ├── social-media-campaigns.html   share one moving-wall template;
│   ├── print-brand-collateral.html   each resolves its own content
│   ├── commercial-lifestyle-photography.html  from
│   └── short-form-video-reels.html   js/gallery-categories-data.js by
│                                       matching its own filename (see
│                                       js/gallery-editorial.js)
├── scripts/
│   └── generate-gallery-manifest.js  Build step (see below) — scans every
│                                       assets/images/gallery/<category-id>/
│                                       folder and (re)writes
│                                       js/gallery-editorial-manifest.js
├── assets/
│   ├── images/
│   │   ├── about/               About Me portrait (see below)
│   │   ├── hero-folders/       Generated brand visuals for the hero folders (see below)
│   │   ├── gallery/
│   │   │   ├── editorial-layout/                Source images for each
│   │   │   ├── social-media-campaigns/           Project Gallery category
│   │   │   ├── print-brand-collateral/           (see below) — drop files
│   │   │   ├── commercial-lifestyle-photography/ into the matching
│   │   │   └── short-form-video-reels/           category's folder, don't
│   │   │                                          edit the manifest by hand
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
│   │                            nav dock, floating counters
│   ├── gallery-editorial.css   Four of the five Project Gallery category
│   │                             pages: the moving rows, tile hover/
│   │                             caption, and a couple of lightbox
│   │                             additions (see below) — not
│   │                             short-form-video-reels, which has its own
│   │                             css/reel-gallery.css instead
│   └── reel-gallery.css        short-form-video-reels.html only: the
│                                 two-column video-selection interface (see
│                                 "Short-Form Video & Reels player" below)
├── js/
│   ├── script.js                Shared: theme/menu toggles, header
│   ├── hero-folders.js          Homepage: hero brand-folder selector + panel
│   ├── gallery-index.js         Homepage: Project Gallery mobile
│   │                             accordion (desktop hover is CSS-only)
│   ├── project-gallery.js       Brand pages: resolves the project from
│   │                             projects-data.js, builds the gallery,
│   │                             lightbox, prev/next nav
│   ├── gallery-editorial.js     Every category page: resolves the category
│   │                             from gallery-categories-data.js by
│   │                             filename, then the shared eyebrow/title/
│   │                             intro/counter/prev-next-nav text, plus —
│   │                             on the four moving-wall pages only — row
│   │                             distribution, auto-scroll, drag/swipe,
│   │                             hover captions, lightbox
│   └── reel-gallery.js          short-form-video-reels.html only: builds
│                                 the video grid, preview swap/crossfade,
│                                 keyboard nav — see below
├── js/projects-data.js          Single source of truth for all brand
│                                 project copy (title, overview, gallery
│                                 layout, credits, etc.)
├── js/gallery-categories-data.js  Single source of truth for all category
│                                    copy (title, intro, lede, tone,
│                                    numbering, prev/next nav) for all five
│                                    Project Gallery pages
├── js/gallery-editorial-manifest.js  AUTO-GENERATED — do not hand-edit,
│                                       see "Project Gallery moving-wall
│                                       categories" below. Covers the four
│                                       image-wall categories only.
├── js/gallery-editorial-meta.js  Optional hand-authored titles/project/
│                                    type/year/alt text for each of those
│                                    four categories' gallery images, keyed
│                                    by category id then filename
├── js/reel-manifest.js           AUTO-GENERATED — do not hand-edit, see
│                                    "Short-Form Video & Reels player" below
└── js/reel-meta.js               Optional hand-authored titles/brand/type/
                                     year/alt text for reel videos, keyed by
                                     filename
```

## Adding or editing a project

1. Edit its entry in `js/projects-data.js` (or add a new one — order there
   sets each page's "Project 0N" numbering). The homepage hero's folders
   are hand-written in `index.html` — see "Homepage hero" below.
2. Drop that project's images into `assets/images/<id>/`.
3. If it's a new project, copy any file in `pages/` to `pages/<id>.html` —
   the page needs no edits; it resolves its own id from its filename.

Currently no real photography is wired in yet — all gallery tiles render as
CSS placeholder gradients (see the `project-<id>` tone classes in
`css/style.css`) until real `<img>`/background assets are dropped into
`assets/images/`.

## Adding or editing a Project Gallery category

1. Edit its entry in `js/gallery-categories-data.js` (title, lede, intro,
   tone, and its `entries` array — each entry is one placeholder item with
   a `layout` of `landscape`, `pair`, or `portrait`, plus placeholder
   `brand`/`year`/`type`/`contribution` copy). This one file drives every
   category page's eyebrow/title/intro/closing copy and prev-next nav, and
   also seeds each page's placeholder tiles until real images replace them
   (see "Project Gallery moving-wall categories" below).
2. The five homepage showcase panels in `index.html` (`#gallery`) are
   hand-written, not generated — update a panel's copy there to match if
   you change a category's title or description.
3. If it's a new category, copy any file in `pages/` (e.g.
   `pages/print-brand-collateral.html`) to `pages/<id>.html` — it resolves
   its own id from its filename, same as the brand pages.

All category copy is currently placeholder ("Client Name", generic
project types) and every tile renders as a CSS gradient (the
`showcase-tone-*` classes in `css/style.css`) until real project entries
and images replace them.

### Homepage showcase previews

Each homepage panel shows a random static image drawn only from its own
category, and crossfades through more of them (every 800–1200ms) while a
mouse hovers it. Touch devices and `prefers-reduced-motion` users get the
static image only. The images come from `js/home-previews.js`, written by
`scripts/generate-home-previews.js` (part of `npm run build`), which
downsizes up to 16 evenly spaced images per category into
`assets/images/home-previews/<id>/`:

- Editorial & Layout — the publication page previews in `assets/documents/editorial-layout/previews/`
- Social, Print, Photography — `assets/images/gallery/<id>/`
- Short-Form Video & Reels — the poster frames in `assets/videos/short-form-reels/`

Nothing to hand-edit: add or remove source images and rebuild. If a
category has no images, its panel falls back to the tone gradient.

To shift a category's crop away from dead-center, tune `object-position`
via its tone class, e.g.:

```css
.showcase-tone-retail .showcase-panel-img { object-position: center 30%; }
```

## Project Gallery moving-wall categories

Four of the five `pages/<category-id>.html` pages (`editorial-layout`,
`social-media-campaigns`, `print-brand-collateral`,
`commercial-lifestyle-photography`) share one data pipeline. Two of them
swap the default wall for their own layout on top of it:
`social-media-campaigns` (scroll-led showcase,
`js/social-campaign-showcase.js`) and `print-brand-collateral` (see
"Print & Brand Collateral split-screen" below). The default is a wall of 2–3
horizontally auto-scrolling rows of mixed-aspect-ratio images
(`css/gallery-editorial.css`, `js/gallery-editorial.js`). Each page resolves
its own category from its filename (same pattern as the brand pages) and
sources its images through a generated manifest instead of hand-written
`<img>` tags, so a plain drag-and-drop of files into that category's folder
is enough to populate it — no HTML/JS edits needed, even for a brand-new
category page.

The fifth, `short-form-video-reels`, has its own dedicated two-column video
player instead — see "Short-Form Video & Reels player" below.

**To add images to a category:**

1. Drop `.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif` files into that
   category's own folder: `assets/images/gallery/<category-id>/`.
2. Run `npm run build` (this also runs automatically on every Vercel
   deploy, via `vercel.json`'s `buildCommand`). It rewrites
   `js/gallery-editorial-manifest.js` — a plain
   `window.GALLERY_EDITORIAL_MANIFEST` object, one array per category id,
   each entry holding a file's name, pixel width/height, and aspect ratio,
   read directly from the image's own header bytes (no dependencies, no
   browser directory access).
3. Optionally add a matching entry to `js/gallery-editorial-meta.js` under
   that category's id, keyed by filename, with `title`, `project`, `type`,
   `year`, and `alt` — see the example already in that file. Anything you
   don't set falls back to a title guessed from the filename and empty
   project/type/year/alt.

**Never hand-edit `js/gallery-editorial-manifest.js`** — it's overwritten
by `npm run build` every time.

While a category's source folder is empty (as shipped, for all four),
that page renders 21 placeholder tiles generated from its own
`js/gallery-categories-data.js` entries — reusing each entry's
`layout`/`brand`/`type` so the placeholders read as that category's kind
of work (not generic captions) and are tinted with that category's own
`showcase-tone-*` — see `buildPlaceholderEntries` in
`js/gallery-editorial.js`. A category's placeholders disappear
automatically the moment its manifest has at least one real image.

Row count (3 desktop / 2 mobile), scroll speed (35–50s per loop, tuned per
row in `ROW_DURATIONS_MS`), pause-on-hover/focus/drag/lightbox, and
`prefers-reduced-motion` handling all live in that same file if they need
tuning — shared by these four categories.

### Print & Brand Collateral split-screen

`pages/print-brand-collateral.html` (`css/print-collateral-showcase.css`,
`js/print-collateral-showcase.js`) locks the whole interface to the
viewport on desktop (`100dvh`, no document scroll). The header, the project
intro, the preview of the selected visual (at its own ratio, with an image
counter) and the category nav stay fixed.
Only the three thumbnail columns on the right move. Wheel, trackpad and
touch input over them drives a virtual scroll position that never reaches
the page: columns 1 and 3 drift down and column 2 drifts up, eased for
controlled inertia (touch flicks glide on). A progress line in the
gallery bar shows the position and marks the start and end, and
pushing past either end gives a short elastic bounce.

Click a thumbnail to preview it. Click it again, click the preview, or
press `F` to open it fullscreen. Arrow keys, `Home` and `End` step through
the images, and `Page Up` / `Page Down` scroll the gallery. With nothing
focused, `Space`, the arrow keys, `Home` and `End` scroll the gallery too.
Phones scroll the page normally: the preview comes first, then one vertical
column of thumbnails, and tapping one opens it fullscreen. With
`prefers-reduced-motion`, the desktop columns are a plain scrolling panel
(no opposed drift) and there are no transitions.

Images come from the same manifest as above. Thumbnails are WebP copies
from `scripts/generate-gallery-thumbs.js` (both run in `npm run build`).
Thumbnail labels and the preview's alt text use `type` from
`js/gallery-editorial-meta.js`, falling back to "Print application". Drift speed, inertia and the elastic
bounce are tuned by `DRIFT_SPEED`, `SMOOTHING_MS`, `GLIDE_MS` and
`OVERSCROLL_*` at the top of the script.

## Short-Form Video & Reels player

`pages/short-form-video-reels.html` doesn't use the moving-wall interface
above — it's a two-column video selector instead: a large selected-video
preview on the left (`~42%` width) and a scrollable `3×2` thumbnail grid on
the right (`~58%`), both sharing the same top/bottom bounds
(`css/reel-gallery.css`, `js/reel-gallery.js`). It follows the same
generated-manifest pattern as the image categories, just for video files
instead of images.

**To add a video:**

1. Drop the video file — `.mp4`, `.webm`, or `.mov` — into
   `assets/videos/short-form-reels/`, plus a poster image of the same base
   name alongside it (`.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif` — a
   poster is required, since it's what every thumbnail and the initial
   preview show before any video actually loads). E.g.
   `mooni-launch-reel.mp4` + `mooni-launch-reel.jpg`.
2. Run `npm run build` (also runs automatically on every Vercel deploy).
   It rewrites `js/reel-manifest.js` — a plain `window.REEL_MANIFEST`
   array, one entry per video, holding its filename, matched poster
   filename, and the poster's pixel width/height/aspect ratio.
3. Optionally add a matching entry to `js/reel-meta.js`, keyed by the
   video's filename, with `title`, `brand`, `type`, `year`, and `alt`.
   Anything you don't set falls back to a title guessed from the filename
   and empty brand/type/year/alt.

**Never hand-edit `js/reel-manifest.js`** — it's overwritten by
`npm run build` every time.

While `assets/videos/short-form-reels/` is empty (as shipped), the page
renders 12 placeholder tiles from this category's own
`js/gallery-categories-data.js` entries, the same fallback convention the
four image categories use — see `buildPlaceholderEntries` in
`js/reel-gallery.js`. They disappear automatically the moment a real video
+ poster pair is added.

Selecting a thumbnail swaps the preview (a ~300ms crossfade), autoplays it
muted, and updates its metadata — nothing autoplays on page load. Only the
active video ever gets a `<video>` element; every other thumbnail is just
its poster image until selected, so adding more videos never front-loads
their weight. Keyboard: arrow keys move focus across the grid, Enter/Space
selects.

### Homepage hero

The landing hero (`index.html`, `.hero`; `css/hero-folders.css`,
`js/hero-folders.js`) is a split screen: the intro copy and a horizontally
scrollable row of brand folders on the left, and a charcoal panel on the
right showing the selected brand's name, summary, role, deliverables,
number, and **Explore Project →** link.

- **Folder copy** lives on each folder's `data-*` attributes in
  `index.html` (`data-title`, `data-summary`, `data-role`,
  `data-deliverables`, `data-href`); the first folder's copy is also
  written into the panel so it shows before any script runs.
- **Folder visuals** are three per brand, picked in
  `scripts/generate-hero-folders.js` (`SOURCES`) from the gallery folders
  and written as small WebPs to `assets/images/hero-folders/<brand>-<n>.webp`
  by `npm run build`. To swap one, edit `SOURCES`, delete that output file,
  and rebuild.
- **Logos** on the folder fronts are the SVGs in `assets/images/brands/`,
  recoloured with a CSS mask and sized inline at equal visual area.

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
