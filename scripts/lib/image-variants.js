/*
 * Responsive variants of a gallery thumbnail, shared by the build
 * (scripts/generate-gallery-thumbs.js writes them) and documented for the
 * browser code that builds srcsets from them (js/image-variants.js mirrors
 * this naming exactly).
 *
 * Every thumbnail `<base>.webp` (at most 720px wide) may have, next to it:
 *   <base>-360.webp   <base>-360.avif   360px wide   (source wider than 360)
 *   <base>.avif                         same width as <base>.webp
 *   <base>-1440.avif                    min(1440, source) wide (source wider than 720)
 * Widths never exceed the source, so nothing is upscaled. Each name carries
 * the source's byte size (inside <base>), so a replaced source gets new
 * names: safe for long-term caching.
 */
const THUMB_WIDTH = 720;

function variantsFor(sourceWidth) {
  const base = Math.min(THUMB_WIDTH, sourceWidth);
  const out = [{ suffix: "", ext: "avif", width: base }];
  if (sourceWidth > 360) {
    out.push({ suffix: "-360", ext: "webp", width: 360 });
    out.push({ suffix: "-360", ext: "avif", width: 360 });
  }
  if (sourceWidth > THUMB_WIDTH) out.push({ suffix: "-1440", ext: "avif", width: Math.min(1440, sourceWidth) });
  return out;
}

module.exports = { THUMB_WIDTH, variantsFor };
