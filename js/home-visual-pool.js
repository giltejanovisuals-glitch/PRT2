/*
 * Every lightweight landing-page visual across all Project Gallery
 * categories, for a fresh random pick on each visit (js/hero-parallax.js on
 * desktop, js/mobile-featured.js on phones). Built at runtime from the
 * generated manifests, so new work joins the pool after `npm run build`
 * with nothing to curate here:
 *
 *   - social-media-campaigns, print-brand-collateral,
 *     commercial-lifestyle-photography: every thumbnail in
 *     window.GALLERY_THUMBS (js/gallery-thumbs.js)
 *   - short-form-video-reels: every poster frame in window.REEL_MANIFEST
 *     (js/reel-manifest.js)
 *   - editorial-layout: every preview page in window.PUBLICATION_MANIFEST
 *     (js/publication-manifest.js), with names from window.PUBLICATION_META
 *
 * Falls back to window.HOME_GALLERY_PREVIEWS (js/home-previews.js) for a
 * category whose manifest isn't loaded.
 *
 * window.homeVisualPool.pick(count, { exclude, around }) returns up to
 * `count` items, drawn round-robin from shuffled categories (so every
 * category shows up evenly) and ordered so neighbours never share a
 * category where that can be avoided (`around`: the category of a fixed
 * item on either side, e.g. a looping deck's opening slide). Each item:
 * { key, category, src, href, title?, brand?, year? }; reels add
 * { file, video, width, height }.
 *
 * window.homeVisualPool.PREVIEW_SECONDS: how much of a reel the landing
 * page loops as its preview (the full reel streams, so this keeps each
 * preview's download small).
 */
(() => {
  const PAGES = 'pages/';
  const openIn = (category, file) => `${PAGES}${category}.html?open=${encodeURIComponent(file)}`;

  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  let cache = null;
  const build = () => {
    if (cache) return cache;
    const pools = {};
    const add = (category, item) => {
      (pools[category] = pools[category] || []).push({ category, key: `${category}:${item.src}`, ...item });
    };

    const thumbsOf = window.GALLERY_THUMBS || {};
    Object.entries(thumbsOf).forEach(([category, files]) => {
      if (category === 'short-form-video-reels') return; // poster copies; the reels come from the manifest below
      Object.entries(files || {}).forEach(([file, src]) => add(category, { src, href: openIn(category, file) }));
    });

    const posterThumbs = thumbsOf['short-form-video-reels'] || {};
    (window.REEL_MANIFEST || []).forEach((reel) => {
      if (!reel.poster) return;
      add('short-form-video-reels', {
        // The small poster copy when the build made one; the full frame otherwise.
        src: posterThumbs[reel.poster] || `assets/videos/short-form-reels/${encodeURIComponent(reel.poster)}`,
        href: `${PAGES}short-form-video-reels.html?reel=${encodeURIComponent(reel.file)}`,
        file: reel.file,
        // The light preview clip (scripts/make-reel-previews.js) when there
        // is one; the full reel otherwise. The viewer always plays the full reel.
        video: reel.preview
          ? `assets/videos/short-form-reels/${reel.preview.split('/').map(encodeURIComponent).join('/')}`
          : `assets/videos/short-form-reels/${encodeURIComponent(reel.file)}`,
        width: reel.width,
        height: reel.height,
      });
    });

    const pubMeta = window.PUBLICATION_META || {};
    (window.PUBLICATION_MANIFEST || []).forEach((pub) => {
      const meta = pubMeta[pub.file] || {};
      (pub.previewImages || []).forEach((preview) => {
        add('editorial-layout', {
          src: `assets/documents/editorial-layout/${preview}`,
          href: openIn('editorial-layout', pub.file),
          title: meta.title || '',
          brand: meta.brand || '',
          year: meta.year || '',
        });
      });
    });

    Object.entries(window.HOME_GALLERY_PREVIEWS || {}).forEach(([category, srcs]) => {
      if (pools[category]?.length) return;
      (srcs || []).forEach((src) => add(category, { src, href: `${PAGES}${category}.html` }));
    });

    cache = pools;
    return pools;
  };

  // Reorder so neighbours differ in category: each step takes an item from
  // the category with the most left (other than the previous one), which
  // never corners itself unless one category outnumbers all the rest.
  // `around`: the category of a fixed item before the first and after the
  // last (a looping deck's opening slide), which neither end should match.
  const spread = (items, around) => {
    const rest = items.slice();
    const out = [];
    while (rest.length) {
      const prev = out.length ? out[out.length - 1].category : around;
      const left = {};
      rest.forEach((item) => { left[item.category] = (left[item.category] || 0) + 1; });
      let best = -1;
      rest.forEach((item, i) => {
        if (item.category === prev) return;
        if (best < 0 || left[item.category] > left[rest[best].category]) best = i;
      });
      out.push(rest.splice(best < 0 ? 0 : best, 1)[0]);
    }
    // The last one matches `around`: swap it with an earlier one that fits.
    const n = out.length;
    if (around && n > 2 && out[n - 1].category === around) {
      const ok = (i, item) => item.category !== (i ? out[i - 1].category : around) && item.category !== (i + 1 < n ? out[i + 1].category : around);
      for (let i = 0; i < n - 1; i += 1) {
        const a = out[i];
        const b = out[n - 1];
        out[i] = b;
        out[n - 1] = a;
        if (ok(i, b) && ok(n - 1, a)) break;
        out[i] = a;
        out[n - 1] = b;
      }
    }
    return out;
  };

  const pick = (count, { exclude = [], around } = {}) => {
    const skip = new Set(exclude);
    const queues = shuffle(Object.keys(build()))
      .map((category) => shuffle(build()[category].filter((item) => !skip.has(item.key) && !skip.has(item.src))))
      .filter((queue) => queue.length);
    const picks = [];
    while (picks.length < count && queues.some((queue) => queue.length)) {
      queues.forEach((queue) => {
        if (picks.length < count && queue.length) picks.push(queue.pop());
      });
    }
    return spread(shuffle(picks), around);
  };

  window.homeVisualPool = { pick, shuffle, PREVIEW_SECONDS: 8 };
})();
