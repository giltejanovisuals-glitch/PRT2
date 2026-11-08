# Performance notes

How the portfolio delivers media, what was slow, what changed, and how to
keep it fast. Last measured November 2026.

## How it was measured

- **Lighthouse 12, mobile preset** (the same engine as Chrome DevTools'
  Lighthouse panel): simulated slow 4G and a 4× slower CPU, each page run
  twice and the better run kept.
- **Before:** the deployed `main` commit (`e9c934f`). **After:** this working
  copy. Both were served the same way, with gzip, HTTP range requests and
  the `vercel.json` cache rules, so the numbers compare like for like.
  Lighthouse on the live site (prt-2.vercel.app) gave the same "before"
  picture.
- Lab tests can't measure INP (it needs real taps), so **Total Blocking
  Time** stands in for it. Targets: LCP ≈ 2.5 s, CLS < 0.1, INP < 200 ms.

## Results

| Page | Score | LCP | CLS | TBT | Page weight | Video on load |
|---|---|---|---|---|---|---|
| Home | 82 → **94** | 4.50 s → **2.72 s** | 0.005 → 0.005 | 4 → 0 ms | 706 → **412 KB** | 0 |
| Social Media Campaigns | 75 → **95** | 4.01 s → **2.26 s** | 0.165 → **0.001** | 200 → 129 ms | 3.7 MB → **445 KB** | 0 |
| Short-Form Video & Reels | 59 → **94** | 6.03 s → **2.75 s** | 0.347 → **0.014** | 0 → 1 ms | 14.8 MB → **621 KB** | 10.5 MB → **229 KB** |
| Editorial & Layout | 95 → **97** | 1.97 s → 1.96 s | 0.100 → **0.002** | 0 → 0 ms | 354 → 359 KB | 0 |
| Commercial & Lifestyle Photography | 79 → **97** | 3.87 s → **2.12 s** | 0.165 → **0.001** | 94 → 20 ms | 1.9 MB → **402 KB** | 0 |
| Print & Brand Collateral | 73 → **94** | 5.53 s → **2.71 s** | 0.126 → **0.001** | 6 → 0 ms | 8.1 MB → **551 KB** | 0 |

CLS is under 0.1 and TBT under 200 ms on every page. LCP is at or near
2.5 s. The floor on most pages is the **welcome intro** (the page-transition
overlay, about 2.4 s on a fresh visit), which is a deliberate part of the
design. Back/Forward and links that open a specific piece skip it.

## The largest problems found

1. **Reel previews streamed whole reels.** Each visible preview played the
   full file (5–6 MB each), so the reels page pulled 10–12 MB of video on
   load. The page was also fetching every reel's metadata just to show its
   length.
2. **Pages showed original files.** The large preview loaded the original
   (up to 1.7 MB PNGs) and pre-fetched its neighbours' originals. The
   phone slideshow cycled through originals too: 7.9 MB of images on the
   print page.
3. **Every desktop gallery tile loaded at once.** That's about 440
   thumbnails (up to 20 MB) on the social page, because the moving columns
   defeated the browser's own lazy loading.
4. **Category headers jumped.** The header copy arrived as "—" placeholders
   and a script filled it in after load, pushing the gallery down
   (CLS 0.13–0.35).
5. **The main image waited for scripts.** On phones the first big image
   only appeared after ~100 KB of scripts ran. The homepage's opening card
   also stayed invisible until its script revealed it.
6. **Long-term caching wasn't possible.** Every file was served with
   `max-age=0`, and many script and style URLs had no version.

## What changed

**Images**
- The build (`scripts/generate-gallery-thumbs.js`) writes responsive copies
  of every gallery image and reel poster: AVIF at 360/720/1440 px and WebP
  at 360/720 px, never wider than the source. Originals are never changed.
- Pages pick the right copy with `<picture>`, `srcset` and `sizes`
  (`js/image-variants.js`). **Originals load only in the fullscreen
  viewer.**
- Desktop gallery tiles load a rail-height before they scroll into view.
  Phone tiles use native lazy loading.
- The homepage carousel and gallery cards prefer AVIF, so the opening card
  dropped from 47 KB to 12 KB.
- Logo images have `width`/`height`, and every gallery image keeps its
  natural ratio.

**First paint and layout stability**
- The category header copy, the facts row and the phone's opening featured
  image are written into each page at build time
  (`scripts/generate-category-headers.js`). They're preloaded with
  `fetchpriority="high"` and appear without waiting for scripts.
- The reel page ships its phone layout state (`data-feed`) in the HTML, so
  nothing moves when its script starts.
- On phones the featured slideshow starts at the first scroll or tap,
  keeping the opening visual steady. Desktop is unchanged.
- The missing-media safety net (`js/media-fallback.js`) is now deferred;
  it was adding a whole request before first paint.

**Reels and video**
- Every reel has a light preview clip (`assets/videos/short-form-reels/previews/`,
  5 s, 480 px, no audio, ~240 KB on average), made by
  `npm run reel-previews` (needs ffmpeg).
- Inline previews already play only while visible (two at a time on
  phones), pause when the tab is hidden or the viewer opens, and stay off
  under reduced motion, reduced data, Save-Data or 2G. They now play the
  light clip; the full reel loads only in the fullscreen viewer, with sound
  only once the visitor asks.
- Reel durations and poster copies are recorded in the manifest at build
  time.

**PDF reader**
- PDF.js and a book's PDF already loaded only when a book opens, and book
  covers are pre-built images. Now, renders for pages the reader has turned
  past are cancelled, renders for the same page are shared, and closing
  cancels everything.

**Scripts and styles**
- Removed retired code: the old reel gallery and social showcase (four
  files that no page loaded) and the moving-wall gallery (about 250 lines
  of script and 100 lines of CSS).
- Every script and stylesheet is versioned with a hash of its contents
  (`scripts/stamp-asset-versions.js`, the last build step), so long-term
  caching is safe.

**Caching (`vercel.json`)**
- Versioned scripts, styles and data (`?v=`), plus the hashed image copies
  in `gallery-thumbs/` and `home-previews/`: one year, immutable.
- Everything else under `/assets` (originals, reels, PDFs, icons): 1 hour,
  then served instantly while re-checking in the background (up to a day),
  so a replaced file shows up within the hour.
- HTML pages: always re-checked (Vercel's default).

## Keeping it fast

- **New gallery images or reels:** drop the files in their folders and run
  `npm run build` (Vercel does this on deploy). New reels also need
  `npm run reel-previews` once, then commit the clip.
- **Don't hand-edit `?v=` numbers.** The build stamps them.
- **Very large originals are fine:** they're only downloaded fullscreen.
- **Heavy builds happen once:** AVIF encoding takes about a second per
  image. Copies that already exist are skipped, so only new files cost
  build time.
