# Short-Form Video & Reels — source videos

This page (`pages/short-form-video-reels.html`) has its own dedicated
two-column video player (`css/reel-gallery.css`, `js/reel-gallery.js`) —
separate from the horizontally auto-scrolling image wall the other four
Project Gallery categories use.

**To add a video:**

1. Drop the video file here — `.mp4`, `.webm`, or `.mov`.
2. Drop a matching poster image alongside it with the **same base name**:
   `.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif`. A poster is required — it's
   what every thumbnail (and the initial preview) shows before a video
   actually loads, so the page never has to fetch every video file just to
   render the grid.

   ```
   mooni-launch-reel.mp4
   mooni-launch-reel.jpg
   ```

3. Run `npm run build` (this also runs automatically on every Vercel
   deploy, via `vercel.json`'s `buildCommand`). It rewrites
   `js/reel-manifest.js` — a plain `window.REEL_MANIFEST` array, one entry
   per video, holding its filename, matched poster filename, and the
   poster's pixel width/height/aspect ratio (read from the poster's own
   header bytes — no dependencies).
4. Optionally add a matching entry to `js/reel-meta.js`, keyed by the video's
   filename, with `title`, `brand`, `type`, `year`, and `alt`. Anything you
   don't set falls back to a title guessed from the filename and empty
   brand/type/year/alt.

**Never hand-edit `js/reel-manifest.js`** — it's overwritten by
`npm run build` every time.

While this folder is empty (as shipped), the page renders 12 placeholder
tiles generated from this category's own entries in
`js/gallery-categories-data.js`, the same fallback convention the other
four categories use. They disappear automatically the moment a real video
+ poster pair is added.

A video's own aspect ratio (usually `9:16` for Reels) is preserved
throughout — never cropped or stretched, in either the large preview or the
grid thumbnails.
