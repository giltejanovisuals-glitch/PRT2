# Short-Form Video & Reels — source videos

This page (`pages/short-form-video-reels.html`) uses the shared Project
Gallery showcase (`js/print-collateral-showcase.js`) in video mode: a
two-column reel library on phones and a preview + moving columns on
desktop, with the fullscreen viewer (`js/reel-viewer.js`).

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

3. Run `npm run reel-previews` (needs ffmpeg; see below), then
   `npm run build` (this also runs automatically on every Vercel deploy,
   via `vercel.json`'s `buildCommand`). The build makes small AVIF/WebP
   copies of the poster (`assets/images/gallery-thumbs/short-form-video-reels/`)
   and rewrites `js/reel-manifest.js` — a plain `window.REEL_MANIFEST`
   array, one entry per video, holding its filename, poster, the poster's
   copy and pixel size, the preview clip, and the reel's duration (read
   from the files at build time, so the page never fetches a reel just
   for that).
4. Display order and hidden reels: `scripts/gallery-priority.js`.
5. Optionally add a matching entry to `js/reel-meta.js`, keyed by the video's
   filename, with `title`, `brand`, `type`, `year`, and `alt`. Anything you
   don't set falls back to a title guessed from the filename and empty
   brand/type/year/alt.

**Never hand-edit `js/reel-manifest.js`** — it's overwritten by
`npm run build` every time.

**Lightweight preview clips:** on phones, the reels in view play muted
inline previews (`js/reel-preview.js`), up to two at a time. Without a
clip, a preview streams the full reel (several MB each). Every reel here
has one; for a new reel run `npm run reel-previews`
(`scripts/make-reel-previews.js`, set `FFMPEG` to ffmpeg's path if it
isn't on PATH), which writes a clip with the reel's **same base name** to
`previews/`:

```text
previews/mooni-launch-reel.mp4
```

`npm run build` adds it to the manifest as `preview`, and the previews (on
this page and the homepage) use it; tapping still opens the full reel.
The script's settings — 5 seconds, 480px wide, no audio, about 240 KB on
average — are the equivalent of:

```sh
ffmpeg -i "mooni-launch-reel.mp4" -t 5 -an -vf "scale=480:-2" -c:v libx264 -crf 28 -preset slow -profile:v main -pix_fmt yuv420p -movflags +faststart "previews/mooni-launch-reel.mp4"
```

Keep `-movflags +faststart` so `preload="metadata"` only fetches a small
header.

A video's own aspect ratio (usually `9:16` for Reels) is preserved
throughout — never cropped or stretched, in either the large preview or the
grid thumbnails.
