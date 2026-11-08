/*
 * Responsive copies of a gallery image, as written by the build
 * (scripts/generate-gallery-thumbs.js; naming rules in
 * scripts/lib/image-variants.js — keep the two in step).
 *
 * Given the thumbnail URL (<base>.webp, at most 720px wide) and the
 * source's pixel width:
 *
 *   imageVariants.sets(thumb, width)
 *     -> { avif: "… 360w, … 720w, … 1440w", webp: "… 360w, … 720w", stem }
 *   imageVariants.apply(img, thumb, width, sizes)
 *     wraps the <img> in a <picture> with an AVIF <source>; the img keeps
 *     the WebP set (browsers without AVIF) and the thumbnail as src.
 *   imageVariants.large(thumb, width) -> the 1440px AVIF URL, or ""
 *   imageVariants.small(thumb, width) -> the 360px WebP URL, or the thumb
 *   imageVariants.avif -> Promise<boolean> (can this browser decode AVIF?)
 *
 * Widths never exceed the source, so a variant that would be an upscale
 * simply isn't listed.
 */
(() => {
  const THUMB = 720;
  const stemOf = (thumb) => (thumb && /\.webp$/i.test(thumb) ? thumb.replace(/\.webp$/i, "") : "");

  const sets = (thumb, width) => {
    const stem = stemOf(thumb);
    if (!stem) return null;
    const w = Number(width) || 0;
    if (!w) return { stem, avif: `${stem}.avif`, webp: thumb, sized: false };
    const base = Math.min(THUMB, w);
    const avif = [];
    const webp = [];
    if (w > 360) {
      avif.push(`${stem}-360.avif 360w`);
      webp.push(`${stem}-360.webp 360w`);
    }
    avif.push(`${stem}.avif ${base}w`);
    webp.push(`${thumb} ${base}w`);
    if (w > THUMB) avif.push(`${stem}-1440.avif ${Math.min(1440, w)}w`);
    return { stem, avif: avif.join(", "), webp: webp.join(", "), sized: true };
  };

  const apply = (img, thumb, width, sizes) => {
    const s = sets(thumb, width);
    if (!s) return img;
    const picture = document.createElement("picture");
    const source = document.createElement("source");
    source.type = "image/avif";
    source.srcset = s.avif;
    if (s.sized && sizes) source.sizes = sizes;
    picture.appendChild(source);
    if (s.sized) {
      img.srcset = s.webp;
      if (sizes) img.sizes = sizes;
    }
    img.src = thumb;
    picture.appendChild(img);
    return picture;
  };

  const large = (thumb, width) => {
    const stem = stemOf(thumb);
    return stem && Number(width) > THUMB ? `${stem}-1440.avif` : "";
  };
  const small = (thumb, width) => {
    const stem = stemOf(thumb);
    return stem && Number(width) > 360 ? `${stem}-360.webp` : thumb;
  };

  // A 1×1 AVIF; decodes only where AVIF is supported.
  const avif = new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(probe.width > 0);
    probe.onerror = () => resolve(false);
    probe.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  });

  window.imageVariants = { sets, apply, large, small, avif };
})();
