# Editorial & Layout Design — source publications

This page (`pages/editorial-layout.html`) has its own dedicated
book/magazine-style publication reader — separate from the horizontally
auto-scrolling image wall the other three Project Gallery image categories
use.

**To add a publication:**

1. Drop the PDF here — `.pdf` only.
2. Run `npm run build` (this also runs automatically on every Vercel
   deploy, via `vercel.json`'s `buildCommand`). It rewrites
   `js/publication-manifest.js` — a plain `window.PUBLICATION_MANIFEST`
   array, one entry per PDF, holding its filename, real page count, every
   page's own width/height and orientation (portrait/landscape/square),
   the publication's dominant orientation, file size, and a cover JPEG
   rendered from page 1 (written to `covers/<filename>.jpg` alongside it).
3. Optionally add a matching entry to `js/publication-meta.js`, keyed by
   the PDF's filename, with `title`, `brand`, `type`, `year`, `role`,
   `description`, `caseStudyLink`, and `downloadAllowed`. Anything you
   don't set falls back to a title guessed from the filename, empty
   brand/type/role/description/caseStudyLink, and `downloadAllowed: true`.

**Never hand-edit `js/publication-manifest.js`** or anything in
`covers/` — both are overwritten by `npm run build` every time.

While this folder is empty (as shipped), the page renders placeholder
publication cards from this category's own entries in
`js/gallery-categories-data.js`, the same fallback convention the other
categories use. They disappear automatically the moment a real PDF is
added.

Every page's real aspect ratio is preserved throughout the reader — pages
are never cropped, stretched, or forced into a fixed frame, and the
book/spread pagination adapts automatically to each publication's actual
mix of portrait, landscape, and square pages.
