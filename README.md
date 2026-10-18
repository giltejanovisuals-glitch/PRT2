# Gil Tejano — Portfolio

Static site. Open `index.html` directly or serve the folder root — no build
step is required for anything except the Project Gallery categories'
image manifest (see below), which Vercel runs automatically via
`vercel.json`'s `buildCommand`.

## Structure

```
PRT2/
├── index.html                 Homepage — image-wall hero (desktop) or
│                               featured carousel (mobile), and the
│                               Project Gallery showcase
├── pages/
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
│   │   ├── featured/           Generated mobile carousel images (see below)
│   │   ├── gallery/
│   │   │   ├── editorial-layout/                Source images for each
│   │   │   ├── social-media-campaigns/           Project Gallery category
│   │   │   ├── print-brand-collateral/           (see below) — drop files
│   │   │   ├── commercial-lifestyle-photography/ into the matching
│   │   │   └── short-form-video-reels/           category's folder, don't
│   │   │                                          edit the manifest by hand
│   ├── icons/
│   │   └── favicon.png         Linked from every page's <head>
│   ├── fonts/                  Empty — fonts are currently loaded from
│   │                            Google Fonts CDN in each page's <head>.
│   │                            Drop self-hosted font files here if that
│   │                            changes.
├── cv/
│   ├── index.html              /cv/ — the CV preview every "View CV" link
│   │                            opens (styles: css/cv-viewer.css).
│   │                            noindex, no framing
│   │                            (vercel.json). No download or print.
│   └── pages/                  Watermarked, redacted page images made by
│                                scripts/render-cv-preview.ps1 — the only
│                                CV files published. The original PDF stays
│                                in private/cv/ (ignored by git and Vercel);
│                                copies go out only on approved requests
│                                (the contact form's "CV Request" type).
├── css/
│   ├── style.css               Shared: tokens, reset, header/nav, homepage
│   │                            (including the Project Gallery showcase)
│   ├── project-gallery.css     Category pages: lightbox, nav dock,
│   │                            floating counters
│   ├── gallery-editorial.css   Image category pages: the (now unused)
│   │                             moving rows and the lightbox additions
│   └── print-collateral-showcase.css  Split-screen gallery showcase used by
│                                 Social, Print, Photography and Reels (see
│                                 "Split-screen gallery showcase" below)
├── js/
│   ├── script.js                Shared: theme/menu toggles, header
│   ├── hero-parallax.js         Homepage: scroll-driven folder wall (hero)
│   ├── gallery-index.js         Homepage: Project Gallery mobile
│   │                             accordion (desktop hover is CSS-only)
│   ├── gallery-editorial.js     Every category page: resolves the category
│   │                             from gallery-categories-data.js by
│   │                             filename, then the shared eyebrow/title/
│   │                             intro/counter/prev-next-nav text, plus —
│   │                             on the four moving-wall pages only — row
│   │                             distribution, auto-scroll, drag/swipe,
│   │                             hover captions, lightbox
│   ├── print-collateral-showcase.js  Split-screen showcase (images, or
│   │                             videos on the Reels page) — see below
│   └── nav-dock.js              Bottom dock: magnification, current page
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

The brand case-study pages (Porta Mobili, Hooga, Dunlopillo, Metal-Lite —
"Brand Identity & Guidelines") have been retired; their work is shown
through the Project Gallery categories instead.

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
   its own id from its filename.

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
`commercial-lifestyle-photography`) share one data pipeline. The three
image categories (`social-media-campaigns`, `print-brand-collateral`,
`commercial-lifestyle-photography`) show their images in the split-screen
showcase (see "Split-screen gallery showcase" below), and so does
`short-form-video-reels`, in video mode. The original default, a wall of
2–3 horizontally auto-scrolling rows of mixed-aspect-ratio images
(`css/gallery-editorial.css`, `js/gallery-editorial.js`), is no longer used
by any page but still works for a page that includes `#editorial-wall`. Each page resolves
its own category from its filename and
sources its images through a generated manifest instead of hand-written
`<img>` tags, so a plain drag-and-drop of files into that category's folder
is enough to populate it — no HTML/JS edits needed, even for a brand-new
category page.

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

**Display order:** `scripts/gallery-priority.js` lists each category's
strongest visuals in the order they should appear; the first one is the
visual the page opens on. The build puts those first, then every other
image by filename. New uploads land after the curated list — add a file's
name there (and rebuild) to move it up. Listed files that no longer exist
are skipped with a build warning.

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

### Split-screen gallery showcase

Print & Brand Collateral, Social Media Campaigns & Key Visuals, Commercial &
Lifestyle Photography and Short-Form Video & Reels all use one interface
(`css/print-collateral-showcase.css`, `js/print-collateral-showcase.js`).
Each page's `#pbc` section sets which category it shows with
`data-category`, the label used when an item has no `type` with
`data-type-fallback`, and, for Reels, `data-kind="video"` plus
`data-video-base`. To give another category this interface, copy the `#pbc`
section from one of those pages and change those attributes. If a category
has no real images (or videos), the section hides itself.

It locks the whole interface to the
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
from `scripts/generate-gallery-thumbs.js` (both run in `npm run build`;
its `CATEGORY_IDS` lists the categories it covers). Until a category's
thumbnails exist, its tiles fall back to the full-size originals, loaded
lazily. Thumbnail labels and the preview's alt text use `type` from
`js/gallery-editorial-meta.js`, falling back to the page's
`data-type-fallback`. Drift speed, inertia and the elastic
bounce are tuned by `DRIFT_SPEED`, `SMOOTHING_MS`, `GLIDE_MS` and
`OVERSCROLL_*` at the top of the script.

## Short-Form Video & Reels player

`pages/short-form-video-reels.html` uses the split-screen showcase above in
video mode: the three drifting columns show each video's poster with a play
mark, and the preview is a `<video>` with native controls. It follows the
same generated-manifest pattern as the image categories, just for video
files instead of images.

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

If `assets/videos/short-form-reels/` is empty, the gallery section hides
itself.

Clicking (or pressing Enter on) a thumbnail swaps the preview and plays it
muted — nothing autoplays on page load, and stepping with the arrow keys
swaps without playing. Clicking the selected thumbnail again, or pressing
`F`, plays it fullscreen. On phones, a tap plays it in the preview above
and scrolls that into view. Only the selected video ever gets a `<video>`
element; every other thumbnail is just its poster image, so adding more
videos never front-loads their weight.

`js/reel-gallery.js` and `css/reel-gallery.css` (the earlier two-column
player) and `js/social-campaign-showcase.js` /
`css/social-campaign-showcase.css` are no longer loaded by any page.

### Homepage hero

On screens wider than 760px, the landing hero (`index.html`, `.hero-parallax`; `css/hero-parallax.css`,
`js/hero-parallax.js`) is a scroll-driven wall of Project Gallery images
under the intro copy, after the HeroParallax pattern: the wall starts
tilted and faint, springs upright and fades in over the first part of the
scroll, then its three rows slide sideways in alternating directions. With
`prefers-reduced-motion` each row is a plain swipeable strip.

- **Images** are a fresh random pick on every visit: 15 (five per row)
  drawn round-robin across the categories in `js/home-previews.js`
  (`window.HOME_GALLERY_PREVIEWS`, regenerated by `npm run build`), so
  every category is represented. That file must load before
  `js/hero-parallax.js`.
- **Each card** links to its category page and shows the category name on
  hover/focus; names and links are read from the Project Gallery panels
  (`.showcase-panel[data-category]`) further down `index.html`.
- On mobile (up to 760px), `css/mobile-featured.css` and
  `js/mobile-featured.js` replace the wall with a label, headline,
  supporting line, a 4:5 carousel of six featured visuals, and a brand and
  title caption. Each image links to its project. The desktop image wall
  is not populated on mobile.
- **Featured collection** is hand-approved in `FEATURED` in
  `scripts/generate-mobile-featured.js` (one visual per category and
  brand). The first entry is always the opening slide; the other five are
  shuffled once per browsing session (`sessionStorage`) and never reorder
  mid-visit. To change a slide, edit its entry, delete its files in
  `assets/images/featured/`, and run `npm run build`. The script writes
  480w/960w WebP copies, an inline placeholder per slide,
  `js/mobile-featured-data.js`, the opening slide's markup, and its
  `<link rel="preload">` (between the `MOBILE FEATURED` markers in
  `index.html`). An optional `crop` trims source edges.
- **Images** are shown whole (`object-fit: contain`) over an enlarged,
  blurred, darkened copy of the placeholder, so other ratios never stretch,
  crop, or show flat bars. Only the current and next slides receive image
  sources; the placeholder shows until each full image loads.
- **Interaction**: swipe (the first 10px choose the axis; vertical always
  scrolls the page, 40px horizontal steps one slide) and left/right arrow
  keys. Instagram-style dots over the bottom of the image mark the
  position. Slides crossfade over 600ms with a slight 1.5% settle.
  Autoplay advances every 5.5s, pauses during touch, focus, hover, hidden
  tabs, and while offscreen, and stops for the visit after any manual
  step. Reduced motion or data saving disables autoplay and transitions.
- **Accessibility**: each slide is a labelled group ("2 of 6"); manual
  steps are announced through a polite live region; hidden slides are
  `inert`. Without JavaScript only the opening slide and its links show.
- **Links**: each slide opens its piece directly on its Project Gallery
  page via `?open=<file name>` (`openIn()` in the generator). The showcase
  pages (`js/print-collateral-showcase.js`) open that image in the
  fullscreen lightbox, or that reel in the phone reel viewer or desktop
  preview; the editorial page (`js/publication-reader.js`) opens that PDF
  in the reader. The parameter is then removed from the address bar.
  Linked reels use the reel viewer on every screen size. Closing a piece
  opened this way (close button or Escape) returns the visitor to the page
  they came from (`js/return-trip.js`, loaded on the five gallery
  pages), or to the homepage if they arrived another way. The carousel
  then shows the same slide again, with autoplay paused.

### Returning to the homepage

The homepage turns off the browser's own scroll restoration, so
`js/home-return.js` remembers where the visitor was when they left for a
Project Gallery page. Coming back with the browser's Back button, or
through any "back to the gallery" link on those pages (the dock's Back to
Project Gallery button or the menu's Gallery link, anything pointing at
`index.html#gallery`; flagged by `js/return-trip.js`), restores that exact
position on phones and desktop. Other links (Work, About, Contact…) and
fresh visits behave as before.

### Mobile Project Gallery

At widths up to 760px, Project Gallery is a single column of five native
category links with natural-ratio WebP previews, short descriptions, and
counts from the actual image, publication, and video manifests. There is
no accordion or image cycling on mobile. The first preview loads eagerly;
the others use native lazy loading. Each random selection stays fixed for
the visit. Cards reveal with a 420ms fade and rise; reduced motion disables
the effect. With JavaScript disabled, native links and fallback images
remain available.

`scripts/generate-mobile-gallery.js` runs after preview generation in
`npm run build`, updating `js/mobile-gallery-data.js` and the marked mobile
gallery block in `index.html` with dimensions, counts, and fallback images.

### Mobile Creative Capabilities

At widths up to 760px, `css/mobile-capabilities.css` replaces the horizontal
track with five native disclosure rows covering direction, brand/editorial,
photography, motion, and 3D/presentation/digital design. The first row is
open by default; the named details group keeps only one row open. Each
contains a concise description and three subskills, with links to related
work where available and a final link to Project Gallery.

`js/mobile-capabilities.js` synchronizes `aria-expanded` and adds Up/Down,
Home, and End focus navigation. Enter and Space use native disclosure
behavior. Height and opacity transitions last 350ms; reduced motion
disables them. Native disclosure interaction remains available without
JavaScript. Desktop keeps its existing capabilities track.

### Mobile Creative Dock

At widths up to 760px, `css/mobile-dock.css` replaces the desktop software
grid with all 23 desktop tools, in the desktop order, in a native
horizontal dock. Mobile variants in `assets/icons/tools/mobile/` omit
background tiles and use cropped visible bounds for consistent 44px icon
sizing; tools whose desktop icon is already a bare logo (CorelDRAW,
Upscayl, Microsoft 365, Figma, Gemini, Firefly) reuse it, and Capture One
is a 132px WebP render of its heavy raster SVG. Single-colour logos
(Affinity, Canva, CapCut, Runway, ChatGPT) are drawn dark and carry
`class="is-mono"`, which inverts them in dark mode so they stay visible
in both themes. Each tool needs a matching `:has()` selector in
`css/mobile-dock.css` to show its panel. Native radio inputs
select a single tool, show its name and teal indicator, and update a fixed
220px information panel. The dock never automatically scrolls or cycles.

`js/mobile-dock.js` gently scales the immediate neighbors and suppresses
clicks produced by a swipe. Native keyboard and radio interaction also
work without JavaScript. Reduced motion disables icon movement and the
160ms description fade. Desktop icons and magnification remain unchanged.

### Mobile Creative Timeline

At widths up to 760px, `css/mobile-timeline.css` presents six career periods
as a vertical journey, newest first. Native `details` entries keep the
latest two roles open initially; earlier roles expand independently. Dates,
roles, and company names remain visible when collapsed. Only Metal-lite
receives the current-position highlight, including the supplied approximate
40% production-cost result. Existing dates and the GJF senior title remain.

The section uses 20px margins, a line at 14px, 36px content indentation,
48px spacing between entries, and a "View Full CV" link to the /cv/ preview.
`js/mobile-timeline.js` synchronizes `aria-expanded` and adds arrow-key,
Home, and End navigation. Native disclosure remains usable without scripts;
350ms expansion transitions are disabled for reduced motion. The desktop
timeline retains its original content and layout.

### Mobile supported brands

At widths up to 760px, `css/mobile-brands.css` turns the existing ten-brand
strip into a two-column grid with 96px rows, 20px page margins, transparent
alignment areas, and thin dividers. Existing SVG logos retain their natural
ratios within 28px-high image areas. Brand names remain visible without
hover; mobile omits arrow icons and visit captions. Theme colors and dark-mode logo inversion preserve
contrast; tap and focus brighten linked logos and gently scale them.

The nine external destinations retain native new-tab navigation with
`noopener noreferrer`; BW stays a noninteractive span. Mobile disables
desktop drag scrolling. `js/mobile-brands.js` removes the strip's extra focus
stop and applies a one-time 260ms reveal with a 60ms column stagger. Reduced
motion removes movement; the grid and links remain usable without scripts.
Desktop retains its existing horizontal strip.

### Mobile Foundation

At widths up to 760px, `css/mobile-foundation.css` stacks the three education
entries on a charcoal surface with 20px margins, 80px section padding,
36px gaps, and thin separators. Each entry includes a teal number and date,
qualification, institution, plain specialization label, and one concise
relevance statement. A connecting statement closes the section.

The Information Technology qualification is explicitly labeled
`BS Information Technology — Undergraduate` on both mobile and desktop,
reflecting the confirmed incomplete program. The desktop three-column
layout remains. `js/mobile-foundation.js` adds one optional 320ms reveal
per entry; content is always visible without scripts and reduced motion
disables the reveal. There are no disclosures or hidden education details.

### Dropping in the About Me portrait

The homepage's About Me section (`index.html`, `#about`) uses the existing
1080 × 1350 portrait with explicit dimensions and descriptive alt text:

```
assets/images/about/portrait.webp
```

On mobile, `css/mobile-about.css` places the full-width 4:5 portrait after
the concise headline, followed by two paragraphs, three divided strength
rows, the quote, and a native link to the experience timeline. It uses
20px side margins, 80px section padding, and 16px body copy. The portrait
has mild desaturation, without decorative framing or parallax. The
one-time reveal sequence ends at 620ms; reduced motion disables it and
mobile content stays visible when JavaScript is disabled. Desktop copy
and layout are retained.

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
