/*
 * Split-screen gallery showcase, shared by four Project Gallery category
 * pages: Print & Brand Collateral, Social Media Campaigns & Key Visuals,
 * Commercial & Lifestyle Photography and Short-Form Video & Reels. It's
 * loaded after gallery-editorial.js, which still runs each page's header,
 * category copy, prev/next nav, and (for images) the shared fullscreen
 * lightbox. The #pbc section configures it:
 *
 *   data-category       gallery category id (defaults to print-brand-collateral)
 *   data-type-fallback  label used when an item has no `type` in its meta
 *   data-kind="video"   Reels: items come from window.REEL_MANIFEST /
 *                       REEL_META, the tiles show each video's poster, and
 *                       the preview is a <video> with native controls;
 *                       fullscreen is the video's own fullscreen.
 *   data-video-base     folder the video and poster files live in
 *
 * Desktop locks the whole interface to the viewport (html.pbc-locked, see
 * the CSS): the header, project information, left preview and category
 * navigation stay put and the document never scrolls. Only the three-column
 * thumbnail gallery on the right moves, driven by its own virtual scroll
 * position — wheel, trackpad, touch and keyboard input over the gallery is
 * captured there and never reaches the page. The columns move alternately,
 * each across its own full length: the column under the cursor (or finger)
 * scrolls the way the wheel goes, like a page, and its neighbours go the
 * opposite way; with no column pointed at, column 2 scrolls like a page and
 * columns 1 and 3 the other way. Movement eases toward the target for
 * controlled inertia (touch flicks glide on).
 * Pushing past either end gives a short elastic give that springs back, and
 * a progress line in the gallery bar marks start and end.
 *
 * Modes:
 *   motion  — desktop, motion allowed: locked viewport + opposed column drift.
 *   static  — desktop, prefers-reduced-motion: locked viewport, but the
 *             thumbnail rail is a plain natively scrolling panel (no
 *             opposed motion, no easing).
 *   stacked — phones: normal page scrolling, preview first, then one
 *             vertical column of thumbnails; a tap opens an image
 *             fullscreen, or plays a video in the preview.
 *   feed    — phones with data-mobile-layout="feed" (all four category
 *             pages): a stacked variant with a full-width featured
 *             visual, then a two-column masonry archive where landscape
 *             visuals span both columns; a tap opens the image in the
 *             lightbox. Reels skip the featured visual: every poster is
 *             shown in two columns, the (up to two) reels clearly in view
 *             play muted inline previews (js/reel-preview.js), and a tap
 *             on either opens it in js/reel-viewer.js.
 *
 * Images come from the category's generated manifest (via
 * window.ProjectGalleryLightbox.entries), so files dropped into
 * assets/images/gallery/<category>/ appear after `npm run build`.
 * Thumbnails use the lightweight WebP copies from
 * scripts/generate-gallery-thumbs.js, falling back to the original file;
 * the preview upgrades to the original once it has loaded.
 */
(() => {
  const section = document.getElementById("pbc");
  const stage = document.getElementById("pbc-stage");
  const frame = document.getElementById("pbc-frame");
  const gallery = document.getElementById("pbc-gallery");
  const rail = document.getElementById("pbc-rail");
  if (!section || !stage || !frame || !gallery || !rail) return;

  const CATEGORY_ID = section.dataset.category || "print-brand-collateral";
  const IS_VIDEO = section.dataset.kind === "video";
  const TYPE_FALLBACK = section.dataset.typeFallback || "Print application";
  // Text in the active language (js/i18n.js). Types are English data terms
  // ("Campaign visual"), translated through term.* keys.
  const I18N = window.i18n;
  const t = (key, vars, fallback) => (I18N ? I18N.t(key, vars, fallback) : fallback);
  const term = (english) => (I18N ? I18N.term(english) : english);
  const lower = (text) => (I18N && I18N.lang !== "en" ? text.toLocaleLowerCase(I18N.lang) : text.toLowerCase());
  // data-mobile-layout="feed": phones get a featured visual followed by a
  // two-column masonry archive (landscape visuals span both columns)
  // instead of the single stacked column. data-featured names the file
  // shown first; it defaults to the category's first `featured` file, then
  // to the first image.
  const FEED = section.dataset.mobileLayout === "feed";
  const LANDSCAPE_RATIO = 1.2;
  // data-hover-preview (Social Media Campaigns & Key Visuals): in the split
  // layout the preview follows the thumbnail under the mouse or keyboard
  // focus, and a click opens the full viewer straight away. Touch has no
  // hover, so there a first tap previews and a second tap on the same
  // thumbnail (or a tap on the preview itself) opens it. The last
  // previewed item stays when the cursor leaves the gallery.
  const HOVER = section.hasAttribute("data-hover-preview");
  // Hover intent: the cursor must rest this long on a thumbnail before the
  // preview changes, so sweeping across the columns doesn't strobe it.
  const HOVER_INTENT_MS = 70;
  // The full-size original replaces the preview's thumbnail only once the
  // item has stayed in the preview this long (hover browsing would
  // otherwise download every original it passes over).
  const HOVER_UPGRADE_MS = 280;

  const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
  // Accepts seconds (24) or "m:ss" ("0:24"); anything else is unknown.
  const parseDuration = (value) => {
    if (typeof value === "number" && value > 0) return value;
    const match = /^(\d+):(\d{1,2})$/.exec(String(value || "").trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  };
  const formatDuration = (seconds) => {
    const s = Math.round(seconds);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  // Data saver: no metadata requests until a reel is actually played.
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  const videoEntries = () => {
    const base = section.dataset.videoBase || "";
    const meta = window.REEL_META || {};
    return (window.REEL_MANIFEST || []).map((item, i) => {
      const info = meta[item.file] || {};
      return {
        src: base + encodeURIComponent(item.file),
        poster: item.poster ? base + encodeURIComponent(item.poster) : "",
        // The poster's small build-time copy (the full frame stays for the viewer).
        thumb: item.thumb ? `../${encodePath(item.thumb)}` : "",
        // Short, light clip for the inline preview (previews/ subfolder),
        // when one has been made; otherwise the preview plays the reel.
        preview: item.preview ? base + encodePath(item.preview) : "",
        width: item.width,
        height: item.height,
        ratio: item.ratio || (item.width && item.height ? item.width / item.height : 9 / 16),
        type: info.type || "",
        // Only hand-written titles are ever shown — never the filename.
        // `label` is what screen readers hear when there's no title.
        alt: info.alt || info.title || `Reel ${i + 1}`,
        title: info.title || "",
        label: info.title || `Reel ${i + 1}`,
        // Untitled reels are announced by number, in the visitor's language.
        reelNumber: info.title ? 0 : i + 1,
        brand: info.brand || info.project || "",
        year: info.year ? String(info.year) : "",
        // Seconds, or "m:ss"; otherwise the build's reading of the file.
        duration: parseDuration(info.duration) || parseDuration(item.duration),
        captions: info.captions ? base + encodePath(info.captions) : "",
      };
    });
  };

  const lightbox = window.ProjectGalleryLightbox;
  const entries = IS_VIDEO
    ? videoEntries()
    : ((lightbox && lightbox.entries) || []).filter((entry) => entry.src && !entry.isPlaceholder);
  if (!entries.length) {
    section.hidden = true;
    return;
  }

  const category = (window.GALLERY_CATEGORIES || []).find((c) => c.id === CATEGORY_ID) || {};
  const thumbs = (window.GALLERY_THUMBS || {})[CATEGORY_ID] || {};
  // data-featured wins; otherwise the category's hand-picked `featured`
  // list (js/gallery-categories-data.js) names the first photo shown.
  const featuredFile = section.dataset.featured || (category.featured || [])[0];
  const featuredIndex = Math.max(
    0,
    entries.findIndex((entry) => entry.src.split("/").pop() === featuredFile)
  );
  const ratioOf = (entry) => (entry.width && entry.height ? entry.width / entry.height : entry.ratio || 1);

  const COLUMN_COUNT = 3;
  // Column pixels moved per pixel of wheel/drag input (for the longest
  // column) — below 1 keeps the drift calm.
  const DRIFT_SPEED = 0.7;
  // Inertia time constants (ms): how quickly the columns catch up with the
  // target. Larger is softer. A flick glides with its own, longer constant
  // so the hand-off from the finger keeps the same speed.
  const SMOOTHING_MS = 150;
  const DRAG_SMOOTHING_MS = 45;
  const GLIDE_MS = 325;
  const MAX_FLING = 1.5; // glide cap, in rail heights
  // Elastic give past either end (virtual px), its resistance, and how long
  // input must pause before it springs back.
  const OVERSCROLL_MAX = 60;
  const OVERSCROLL_RESIST = 0.35;
  const OVERSCROLL_RELEASE_MS = 110;
  const OVERSCROLL_SPRING_MS = 120;
  const PAGE_STEP = 0.85; // Page Up/Down, in rail heights
  const LINE_PX = 40; // wheel deltaMode 1 (lines)

  // The viewport-locked desktop layout needs room for its 30rem stage plus
  // the header and dock. A shorter viewport (a short window, or a desktop
  // zoomed in past ~150%) gets the normal scrolling stacked layout instead,
  // so nothing is clipped where the page can't scroll to it. Keep in step
  // with the stacked media query in css/print-collateral-showcase.css.
  const desktopQuery = window.matchMedia("(min-width: 761px) and (min-height: 680px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  const fileOf = (src) => src.split("/").pop();
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const currentEl = document.getElementById("pbc-current");
  const totalEl = document.getElementById("pbc-total");
  const categoryEl = document.getElementById("pbc-category");
  const progressEl = document.getElementById("pbc-progress");
  const progressFill = document.getElementById("pbc-progress-fill");

  if (totalEl) totalEl.textContent = pad(entries.length);
  const categoryTitle = () => (I18N && I18N.lang !== "en" && I18N.has(`category.${CATEGORY_ID}.title`) ? I18N.t(`category.${CATEGORY_ID}.title`) : category.title);
  if (categoryEl && category.title) categoryEl.textContent = categoryTitle();
  const labelOf = (entry) => (entry.reelNumber ? t("showcase.reelNumber", { number: entry.reelNumber }, entry.label) : entry.label);

  // Used for thumbnail labels and preview alt text.
  const describe = (entry) => ({ type: term(entry.type || TYPE_FALLBACK) });

  // A video inside an image gallery (a manifest entry with kind "video" and
  // a same-named poster image) — distinct from the all-video Reels page.
  const isClip = (entry) => !IS_VIDEO && entry.kind === "video";
  // The still that represents an entry: the photo itself, or a clip's poster.
  const stillOf = (entry) => (isClip(entry) ? entry.poster : entry.src);

  // The build-time WebP copy (≤720px; AVIF and 360px variants beside it —
  // js/image-variants.js), if one exists. Reels use their poster's copy.
  const thumbFor = (entry) => {
    if (IS_VIDEO) return entry.thumb || "";
    const thumb = thumbs[fileOf(stillOf(entry))];
    return thumb ? `../${encodePath(thumb)}` : "";
  };
  const thumbSrc = (entry) => thumbFor(entry) || (IS_VIDEO ? entry.poster : stillOf(entry));
  const VARIANTS = window.imageVariants || null;
  // Rendered widths, shared with the build's preload hints
  // (scripts/generate-category-headers.js) so preload and image match.
  const PHONE_FRAME_SIZES = "calc(100vw - 40px)";

  // --- Thumbnails ---------------------------------------------------------

  // Desktop tiles: image sources are held back (data-*) until the tile comes
  // within a rail height of the rail's visible area, in either direction.
  let nearObserver = null;
  const restoreSources = (tile) => {
    tile.querySelectorAll("[data-held-srcset], [data-held-src]").forEach((el) => {
      if (el.dataset.heldSizes) el.sizes = el.dataset.heldSizes;
      if (el.dataset.heldSrcset) el.srcset = el.dataset.heldSrcset;
      if (el.dataset.heldSrc) el.src = el.dataset.heldSrc;
      delete el.dataset.heldSrcset;
      delete el.dataset.heldSrc;
      delete el.dataset.heldSizes;
    });
  };
  const loadWhenNear = (tile, media) => {
    if (!("IntersectionObserver" in window)) return;
    [media, ...(media.querySelectorAll ? media.querySelectorAll("source, img") : [])].forEach((el) => {
      if (!el.getAttribute) return;
      ["srcset", "src", "sizes"].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (!value) return;
        el.dataset[`held${attr[0].toUpperCase()}${attr.slice(1)}`] = value;
        el.removeAttribute(attr);
      });
    });
    if (!nearObserver) {
      nearObserver = new IntersectionObserver(
        (seen) => seen.forEach((item) => {
          if (!item.isIntersecting) return;
          nearObserver.unobserve(item.target);
          restoreSources(item.target);
        }),
        { root: rail, rootMargin: "100% 0px", threshold: 0 }
      );
    }
    nearObserver.observe(tile);
  };

  let tiles = []; // by position in `entries`
  let columns = [];
  let selected = 0;

  const tileLabel = (entry, i) => {
    const type = isClip(entry) ? term("video") : lower(describe(entry).type);
    const english = `${IS_VIDEO ? "Play" : "Show"} ${isClip(entry) ? "video" : (entry.type || TYPE_FALLBACK).toLowerCase()} ${i + 1} of ${entries.length}`;
    return t(IS_VIDEO ? "showcase.tilePlay" : "showcase.tileShow", { type, index: i + 1, total: entries.length }, english);
  };
  const countText = (kind) => (I18N ? I18N.plural(`showcase.count.${kind}`, entries.length) : `${entries.length} ${kind}`);
  const reelTileLabel = (entry) => {
    // Same order as the tile shows it (title, duration), then the brand.
    const label = `${labelOf(entry)}${entry.duration && typeof formatDuration === "function" ? ` ${formatDuration(entry.duration)}` : ""}${entry.brand ? `, ${entry.brand}` : ""}`;
    return t("showcase.play", { label }, `Play ${label}`);
  };

  const createTile = (entry, i, stacked, feed = false) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "pbc-tile";
    tile.dataset.pos = String(i);
    tile.tabIndex = -1;
    tile.setAttribute("aria-pressed", "false");
    tile.setAttribute("aria-label", tileLabel(entry, i));
    // Reserve the image's exact natural shape before it loads. The feed
    // leaves that to the img's own width/height attributes (height: auto).
    if (!feed) {
      tile.style.aspectRatio = entry.width && entry.height ? `${entry.width} / ${entry.height}` : String(entry.ratio || 1);
    }

    const img = document.createElement("img");
    img.className = "pbc-tile-img";
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    if (entry.width) img.width = entry.width;
    if (entry.height) img.height = entry.height;
    // Build-time copies only (AVIF, WebP fallback), sized to how wide the
    // tile renders: half the phone screen in the two-column feed, all of
    // it for a landscape visual or the single column, about a sixth of
    // the window in the desktop columns. Originals load only fullscreen.
    const thumb = thumbFor(entry);
    const sizes = !stacked
      ? "17vw"
      : feed && !(ratioOf(entry) >= LANDSCAPE_RATIO && !IS_VIDEO)
        ? "calc(50vw - 25px)"
        : "calc(100vw - 40px)";
    const media = thumb && VARIANTS ? VARIANTS.apply(img, thumb, entry.width, sizes) : img;
    if (media === img) img.src = thumbSrc(entry);
    if (thumb) {
      img.addEventListener("error", () => {
        media.querySelector?.("source")?.remove();
        img.removeAttribute("srcset");
        img.src = IS_VIDEO ? entry.poster : stillOf(entry);
      }, { once: true });
    }
    // Phones: native lazy-loading. Desktop: the columns move tiles in and
    // out of the rail's clip, so the rail observer loads each tile a rail
    // height before it arrives instead of every thumbnail up front.
    if (stacked) img.loading = "lazy";
    else loadWhenNear(tile, media);
    tile.appendChild(media);

    if (IS_VIDEO || isClip(entry)) {
      const play = document.createElement("span");
      play.className = "pbc-tile-play";
      play.setAttribute("aria-hidden", "true");
      play.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
      tile.appendChild(play);
    }
    return tile;
  };

  // Each feed tile fades in once, the first time it scrolls into view.
  let revealObserver = null;
  const feedCount = document.getElementById("pbc-feed-count");

  // A new language: relabel what is already on screen — nothing is rebuilt,
  // so the selection, scroll positions and any playing video stay as they are.
  I18N?.onChange(() => {
    if (categoryEl && category.title) categoryEl.textContent = categoryTitle();
    tiles.forEach((tile, i) => {
      if (tile) tile.setAttribute("aria-label", "reelTile" in tile.dataset ? reelTileLabel(entries[i]) : tileLabel(entries[i], i));
    });
    if (feedCount && feedCount.textContent) feedCount.textContent = countText(IS_VIDEO ? "reels" : "visuals");
    section.querySelectorAll("img[data-type-alt]").forEach((img) => {
      img.alt = term(img.dataset.typeAlt);
    });
    lastPct = -1; // the progress bar's spoken value follows on the next update
  });

  // Phones, feed layout: the featured visual sits above, so the archive is
  // everything else. Runs of square/portrait visuals fill two columns
  // (each tile goes to the shorter column); a landscape visual breaks the
  // run and spans the full width.
  const buildFeed = () => {
    const feed = document.createElement("div");
    feed.className = "pbc-feed";
    let pair = null;
    let heights = [0, 0];
    // A landscape visual waits until both columns are level (within a
    // fifth of a tile) so it never leaves a gap beside the shorter one;
    // anything still waiting goes at the end.
    let waiting = [];
    const level = () => !pair || Math.abs(heights[0] - heights[1]) < 0.2;
    const placeWide = (tile) => {
      pair = null;
      const wide = document.createElement("div");
      wide.className = "pbc-feed-wide";
      wide.appendChild(tile);
      feed.appendChild(wide);
    };
    const flushWide = () => {
      waiting.forEach(placeWide);
      waiting = [];
    };
    entries.forEach((entry, i) => {
      if (i === featuredIndex) return;
      const tile = tiles[i];
      if (ratioOf(entry) >= LANDSCAPE_RATIO) {
        if (level()) placeWide(tile);
        else waiting.push(tile);
        return;
      }
      if (!pair) {
        pair = document.createElement("div");
        pair.className = "pbc-feed-pair";
        pair.append(document.createElement("div"), document.createElement("div"));
        feed.appendChild(pair);
        heights = [0, 0];
      }
      const col = heights[0] <= heights[1] ? 0 : 1;
      pair.children[col].appendChild(tile);
      heights[col] += 1 / ratioOf(entry);
      if (waiting.length && level()) flushWide();
    });
    flushWide();
    rail.appendChild(feed);
    if (feedCount) feedCount.textContent = countText(IS_VIDEO ? "reels" : "visuals");

    if (motionAllowed() && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (seen) => {
          seen.forEach((item) => {
            if (!item.isIntersecting) return;
            item.target.classList.add("is-in");
            revealObserver.unobserve(item.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px" }
      );
      feed.querySelectorAll(".pbc-tile").forEach((tile) => revealObserver.observe(tile));
    } else {
      feed.querySelectorAll(".pbc-tile").forEach((tile) => tile.classList.add("is-in"));
    }
    // Every tile is a plain tab stop here (no roving selection).
    tiles.forEach((tile) => {
      tile.tabIndex = 0;
    });
  };

  // --- Phones, video feed: reel library -------------------------------------
  //
  // Every reel at once in a two-column grid of posters at their natural
  // ratio, each with its title and duration laid subtly over the bottom of
  // the poster. A tap opens js/reel-viewer.js fullscreen over the page.
  // The (at most two) reels clearly in view play a muted, looping preview
  // over their posters (js/reel-preview.js) — the light clip from the
  // manifest's `preview` when there is one — never under reduced motion or
  // data saving. Durations come from the meta; otherwise from a preview
  // that plays the full reel, or each file's header is read as its tile
  // nears the screen (never under data saver) — add `duration` in
  // js/reel-meta.js to skip that request.

  let durationObserver = null;
  // Phones' feed opens reels in it; so does the desktop hover preview.
  const reelViewer =
    IS_VIDEO && (FEED || HOVER) && window.createReelViewer
      ? window.createReelViewer(entries, { typeFallback: TYPE_FALLBACK, formatDuration })
      : null;
  const reelPreviews =
    IS_VIDEO && FEED && window.createReelPreviews
      ? window.createReelPreviews({
          max: 2, // both reels of a row
          onMetadata: (tile, seconds) => {
            const entry = entries[Number(tile.dataset.pos)];
            // A preview clip's length isn't the reel's.
            if (entry && !entry.duration && !entry.preview) rememberDuration(entry, seconds);
          },
        })
      : null;

  const rememberDuration = (entry, seconds) => {
    entry.duration = seconds;
    const badge = tiles[entries.indexOf(entry)]?.querySelector(".pbc-tile-duration");
    if (badge) {
      badge.textContent = formatDuration(seconds);
      badge.hidden = false;
    }
  };

  const readDuration = (entry) => {
    // A playing preview reports its own duration; don't fetch it twice.
    if (entry.duration || saveData || (reelPreviews?.enabled() && !entry.preview)) return;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) rememberDuration(entry, probe.duration);
      probe.removeAttribute("src");
      probe.load();
    }, { once: true });
    probe.src = entry.src;
  };

  const buildReelLibrary = () => {
    const grid = document.createElement("div");
    grid.className = "pbc-reels";
    entries.forEach((entry, i) => {
      const tile = tiles[i];
      const caption = document.createElement("span");
      caption.className = "pbc-tile-caption";
      const title = document.createElement("span");
      title.className = "pbc-tile-title";
      title.textContent = entry.title;
      const badge = document.createElement("span");
      badge.className = "pbc-tile-duration";
      badge.hidden = !entry.duration;
      badge.textContent = entry.duration ? formatDuration(entry.duration) : "";
      caption.append(title, " ", badge); // the space only separates words for assistive tech (flex ignores it)
      tile.appendChild(caption);
      // The name includes everything the tile shows (title and duration).
      tile.setAttribute("aria-label", reelTileLabel(entry));
      tile.dataset.reelTile = "";
      tile.tabIndex = 0;
      grid.appendChild(tile);
      // The light preview clip (scripts/make-reel-previews.js) over the
      // tile's small poster copy; the full reel loads only in the viewer.
      reelPreviews?.add(tile, entry.preview || entry.src, VARIANTS && thumbFor(entry) ? VARIANTS.small(thumbFor(entry), entry.width) : thumbSrc(entry));
    });
    rail.appendChild(grid);
    if (feedCount) feedCount.textContent = countText("reels");

    if (!saveData && "IntersectionObserver" in window) {
      durationObserver = new IntersectionObserver(
        (seen) => {
          seen.forEach((item) => {
            if (!item.isIntersecting) return;
            durationObserver.unobserve(item.target);
            readDuration(entries[Number(item.target.dataset.pos)]);
          });
        },
        { rootMargin: "200px 0px" }
      );
      tiles.forEach((tile) => durationObserver.observe(tile));
    }
  };

  const build = () => {
    const stacked = !desktopQuery.matches;
    const feed = stacked && FEED;
    section.toggleAttribute("data-feed", feed);
    revealObserver?.disconnect();
    revealObserver = null;
    durationObserver?.disconnect();
    durationObserver = null;
    reelPreviews?.clear();
    nearObserver?.disconnect();
    nearObserver = null;
    rail.replaceChildren();
    tiles = entries.map((entry, i) => createTile(entry, i, stacked, feed));

    if (feed && IS_VIDEO) {
      buildReelLibrary();
      columns = [];
    } else if (feed) {
      buildFeed();
      columns = [];
    } else if (stacked) {
      // Phones: a single vertical column in manifest order.
      const col = document.createElement("div");
      col.className = "pbc-col pbc-col-flow";
      tiles.forEach((tile) => col.appendChild(tile));
      rail.appendChild(col);
      columns = [];
    } else {
      // Greedy fill by relative height (1/ratio per unit width) so the three
      // columns end up close in length — that keeps their travel, and so
      // their speed, nearly identical. Manifest order is kept per column.
      const filled = new Array(COLUMN_COUNT).fill(0);
      columns = Array.from({ length: COLUMN_COUNT }, (_, i) => {
        const col = document.createElement("div");
        col.className = "pbc-col";
        col.dataset.direction = i % 2 === 0 ? "down" : "up";
        rail.appendChild(col);
        return { el: col, direction: i % 2 === 0 ? 1 : -1, travel: 0, rate: 0 };
      });
      entries.forEach((entry, i) => {
        let target = 0;
        for (let c = 1; c < COLUMN_COUNT; c += 1) if (filled[c] < filled[target]) target = c;
        filled[target] += 1 / (entry.ratio || 1) + 0.05;
        columns[target].el.appendChild(tiles[i]);
        tiles[i].dataset.column = String(target);
      });
    }

    tiles[selected].tabIndex = 0;
    tiles[selected].classList.add("is-selected");
    tiles[selected].setAttribute("aria-pressed", "true");
    observeColumns();
  };

  // --- Preview --------------------------------------------------------------

  // The sharper copy for the preview frame: the 1440px AVIF when the frame
  // needs more pixels than the 720px thumbnail has and the browser decodes
  // AVIF; otherwise nothing (the thumbnail stays).
  const largeFor = (entry, box) => {
    const thumb = thumbFor(entry);
    const url = thumb && VARIANTS ? VARIANTS.large(thumb, entry.width) : "";
    if (!url) return Promise.resolve("");
    const r = box ? box.getBoundingClientRect() : null;
    const needed = Math.max(r ? r.width : 0, r ? r.height * ratioOf(entry) : 0) * (window.devicePixelRatio || 1);
    if (needed && needed <= 720 * 1.15) return Promise.resolve("");
    return VARIANTS.avif.then((ok) => (ok ? url : ""));
  };

  let activeShot = null;

  const motionAllowed = () => !reducedMotionQuery.matches;

  const createShot = (entry) => {
    const shot = document.createElement("div");
    shot.className = "pbc-shot";
    shot.style.setProperty("--ar", String(entry.width && entry.height ? entry.width / entry.height : entry.ratio || 1));
    if (entry.width) shot.style.setProperty("--nw", `${entry.width}px`);

    if (IS_VIDEO) {
      const video = document.createElement("video");
      video.className = "pbc-shot-img pbc-shot-video";
      video.muted = true;
      video.playsInline = true;
      if (entry.poster) video.poster = thumbSrc(entry);
      if (HOVER) {
        // Hover preview: a silent, looping, inline clip (the light preview
        // file when there is one); a click opens the reel viewer for sound
        // and controls.
        video.defaultMuted = true;
        video.loop = true;
        video.setAttribute("playsinline", "");
        video.disablePictureInPicture = true;
        video.preload = saveData || !motionAllowed() ? "none" : "auto";
        video.src = entry.preview || entry.src;
        shot.dataset.clip = "";
      } else {
        video.controls = true;
        video.preload = saveData ? "none" : "metadata";
        video.src = entry.src;
      }
      video.setAttribute("aria-label", `${labelOf(entry)}${entry.brand ? `, ${entry.brand}` : ""}`);
      // The written description of what's on screen (reel-meta `alt`).
      if (entry.alt && entry.alt !== entry.title) {
        const desc = document.createElement("p");
        desc.className = "sr-only";
        desc.id = `pbc-shot-desc-${entry.flatIndex ?? Math.random().toString(36).slice(2)}`;
        desc.textContent = entry.alt;
        video.setAttribute("aria-describedby", desc.id);
        shot.appendChild(desc);
      }
      if (entry.captions) {
        const track = document.createElement("track");
        track.kind = "captions";
        track.srclang = "en";
        track.label = "English";
        track.src = entry.captions;
        track.default = true;
        video.appendChild(track);
      }
      // Black behind the player only for non-vertical sources.
      shot.dataset.vertical = String(ratioOf(entry) < 1);
      shot.appendChild(video);
      return shot;
    }

    if (isClip(entry)) {
      // A clip in an image gallery previews silently: muted, looping,
      // inline, no controls (a click opens the full player). The poster
      // holds the frame until the first frame arrives. Under reduced motion
      // it stays on the poster.
      const video = document.createElement("video");
      video.className = "pbc-shot-img pbc-shot-video";
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.disablePictureInPicture = true;
      video.preload = motionAllowed() ? "auto" : "none";
      if (entry.poster) video.poster = thumbSrc(entry);
      video.setAttribute("aria-label", entry.alt || entry.title || t("common.video", null, "Video"));
      video.src = entry.src;
      shot.dataset.clip = "";
      shot.appendChild(video);
      return shot;
    }

    // Phone feed: a blurred, enlarged copy fills the 4:5 frame behind the
    // complete photo (css: "Featured frame"). It is only shown — and, being
    // lazy, only fetched — there; the small thumbnail is plenty under blur.
    const backdrop = document.createElement("img");
    backdrop.className = "pbc-shot-backdrop";
    backdrop.alt = "";
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.loading = "lazy"; // only shown in the phone feed; desktop never fetches it
    backdrop.decoding = "async";
    backdrop.draggable = false;
    // Under heavy blur the 360px copy is indistinguishable from larger ones
    // (and, being small, it never competes with the photo for the page's
    // Largest Contentful Paint).
    backdrop.src = thumbFor(entry) && VARIANTS ? VARIANTS.small(thumbFor(entry), entry.width) : thumbSrc(entry);
    shot.appendChild(backdrop);

    const img = document.createElement("img");
    img.className = "pbc-shot-img";
    img.alt = entry.alt || describe(entry).type;
    if (!entry.alt) img.dataset.typeAlt = entry.type || TYPE_FALLBACK;
    img.decoding = "async";
    // The first preview is the page's lead image: fetch it before the rest.
    if (!activeShot) img.fetchPriority = "high";
    if (entry.width) img.width = entry.width;
    if (entry.height) img.height = entry.height;
    // Phones: the featured frame is the page's first big image (its Largest
    // Contentful Paint), always shown full width — so it picks the right
    // copy straight away from the AVIF/WebP sets (the same set the page
    // preloads, scripts/generate-category-headers.js), with no swap.
    const thumbForShot = thumbFor(entry);
    if (!desktopQuery.matches && thumbForShot && VARIANTS) {
      shot.appendChild(VARIANTS.apply(img, thumbForShot, entry.width, PHONE_FRAME_SIZES));
      return shot;
    }
    // Desktop: show the (usually already cached) thumbnail at once, then —
    // only when the frame is big enough to tell — swap in the 1440px AVIF
    // copy once it has decoded. The original is only ever loaded fullscreen.
    const lowRes = thumbSrc(entry);
    img.src = lowRes;
    if (lowRes !== entry.src) {
      const upgrade = () => {
        largeFor(entry, frame).then((url) => {
          if (!url) return;
          const full = new Image();
          full.decoding = "async";
          full.src = url;
          (full.decode ? full.decode() : Promise.resolve())
            .then(() => {
              if (shot.isConnected) img.src = url;
            })
            .catch(() => {});
        });
      };
      // Hover browsing: only for an item that stays in the preview.
      if (HOVER && activeShot) {
        window.setTimeout(() => {
          if (shot === activeShot) upgrade();
        }, HOVER_UPGRADE_MS);
      } else {
        upgrade();
      }
    }
    shot.appendChild(img);
    return shot;
  };

  // Stops a preview clip and frees its decoder and download.
  const releaseVideo = (shot) => {
    const video = shot && shot.querySelector("video");
    if (!video) return;
    video.pause();
    if (shot.dataset.clip !== undefined) {
      video.removeAttribute("src");
      video.load();
    }
  };

  const playClip = (shot) => {
    const video = shot && shot.dataset.clip !== undefined && shot.querySelector("video");
    if (!video || !motionAllowed() || lightboxIsOpen()) return;
    const playing = video.play();
    if (playing && playing.catch) playing.catch(() => {});
  };

  const lightboxIsOpen = () =>
    document.body.classList.contains("lightbox-open") || root.classList.contains("reel-viewer-open");

  // autoplay is only ever true from a direct click or tap on a video tile,
  // and plays muted (the native controls unmute) — never on page load.
  const showPreview = (entry, autoplay = false) => {
    // The outgoing clip stops before the next item starts loading.
    // The first time, the outgoing shot is the build-written opening image
    // (phones), which this crossfades away from — same picture, no change.
    const previous = activeShot || frame.querySelector(".pbc-shot-static");
    if (previous) previous.querySelector("video")?.pause();

    const next = createShot(entry);
    frame.appendChild(next);
    if (autoplay) {
      const video = next.querySelector("video");
      const playing = video && video.play();
      if (playing && playing.catch) playing.catch(() => {});
    }
    // Nothing plays on page load — only once the visitor picks something
    // (the build-written opening image doesn't count as a pick).
    if (activeShot) playClip(next);

    activeShot = next;
    if (previous) {
      previous.classList.remove("is-active");
      previous.classList.add("is-leaving");
      window.setTimeout(() => {
        // A clip keeps its last frame through the fade, then lets go.
        if (previous.dataset.clip !== undefined) releaseVideo(previous);
        previous.remove();
      }, motionAllowed() ? (HOVER ? 400 : 700) : 0);
    }
    // Commit the entering state (opacity 0) with a forced style/layout
    // flush, then activate so it transitions. Unlike waiting two animation
    // frames, this can't leave the new shot stuck invisible when frames are
    // throttled or paused (background tabs, some mobile browsers).
    void next.offsetWidth;
    next.classList.add("is-active");

    if (currentEl) currentEl.textContent = pad(entries.indexOf(entry) + 1);
  };

  // Warm the next/previous originals so stepping through feels instant.
  const prefetched = new Set();
  const prefetch = (i) => {
    // Hover previews jump around the columns, so manifest neighbours
    // aren't the likely next pick there.
    if (IS_VIDEO || HOVER) return;
    const entry = entries[(i + entries.length) % entries.length];
    if (!entry || isClip(entry) || prefetched.has(entry.src)) return;
    prefetched.add(entry.src);
    // Warm what the preview would show: the thumbnail, and the large copy
    // when the frame would upgrade to it — never the original.
    const warm = (url) => {
      if (!url) return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    };
    warm(thumbSrc(entry));
    largeFor(entry, frame).then(warm);
  };

  // --- Selection ------------------------------------------------------------

  // Told about every selection the visitor makes (not the slideshow's own).
  let onManualSelect = null;

  const select = (i, { focus = false, reveal = false, autoplay = false, auto = false } = {}) => {
    i = (i + entries.length) % entries.length;
    const changed = i !== selected || !activeShot;

    const prevTile = tiles[selected];
    if (prevTile) {
      prevTile.classList.remove("is-selected");
      prevTile.setAttribute("aria-pressed", "false");
      prevTile.tabIndex = FEED && mode === "stacked" ? 0 : -1;
    }
    selected = i;
    const tile = tiles[i];
    tile.classList.add("is-selected");
    tile.setAttribute("aria-pressed", "true");
    tile.tabIndex = 0;

    // Phone reels have no preview (the viewer plays them), so nothing is
    // fetched for it; desktop builds it when the layout switches.
    if (changed && !(IS_VIDEO && FEED && mode === "stacked")) {
      showPreview(entries[i], autoplay);
      prefetch(i + 1);
      prefetch(i - 1);
    }
    if (reveal) revealTile(tile);
    if (focus) tile.focus({ preventScroll: true });
    if (!auto && onManualSelect) onManualSelect(i);
  };

  const openFullscreen = (trigger) => {
    if (IS_VIDEO && HOVER && reelViewer) {
      activeShot?.querySelector("video")?.pause();
      reelViewer.open(selected, trigger || frame);
      return;
    }
    if (IS_VIDEO) {
      const video = activeShot && activeShot.querySelector("video");
      if (!video) return;
      if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen) {
        // iPhone: throws until metadata has loaded, so retry once it has.
        try {
          video.webkitEnterFullscreen();
        } catch (e) {
          video.addEventListener("loadedmetadata", () => {
            try {
              video.webkitEnterFullscreen();
            } catch (err) {}
          }, { once: true });
        }
      }
      const playing = video.play();
      if (playing && playing.catch) playing.catch(() => {});
      return;
    }
    if (lightbox) lightbox.open(entries[selected].flatIndex, trigger || frame);
  };

  // --- Gallery progress -----------------------------------------------------

  let lastPct = -1;
  let lastEdge = null;

  const syncProgress = (p, scrollable) => {
    p = clamp(p, 0, 1);
    if (progressFill) progressFill.style.transform = `scaleX(${p.toFixed(4)})`;
    const pct = Math.round(p * 100);
    const edge = !scrollable ? "all" : p <= 0.001 ? "start" : p >= 0.999 ? "end" : "";
    if (pct === lastPct && edge === lastEdge) return;
    lastPct = pct;
    lastEdge = edge;

    gallery.dataset.edge = edge;
    if (progressEl) {
      progressEl.setAttribute("aria-valuenow", String(pct));
      progressEl.setAttribute(
        "aria-valuetext",
        edge === "start" ? t("showcase.start", null, "Start of gallery") : edge === "end" || edge === "all" ? t("showcase.end", null, "End of gallery") : `${pct}%`
      );
    }
  };

  // --- Motion mode: virtual scroll with opposed column drift ---------------
  //
  // Every column keeps its own scroll position (`tgt`/`cur`, 0 = its top in
  // view, `travel` = its bottom in view). Input moves all of them at once,
  // alternately: by default column 2 scrolls like a page (wheel down →
  // content moves up) and columns 1 and 3 go the other way. With the cursor
  // (or a finger) over a column, that column follows the wheel like a page
  // and the pattern alternates out from it — so the column being looked at
  // always moves the expected way. Each column covers its own length over
  // the same virtual range, so their speeds stay matched.

  let mode = "";
  let railHeight = 0;
  let range = 0; // virtual input px for every column to cross its length
  let tau = SMOOTHING_MS;
  let dragging = false;
  let lastInputAt = 0;
  let rafId = null;
  let lastTime = 0;
  let anchor = null; // index of the column under the cursor for this input

  // Every column begins halfway along its length, so whichever column the
  // cursor is on can scroll either way from the first wheel turn.
  const startFrac = () => 0.5;
  // The column the progress line describes: the one last pointed at
  // (column 2 until then).
  let progressCol = 1;
  // +1: moves like a page for the input; -1: the opposite way.
  const senseOf = (col, i) => {
    if (anchor === null) return col.direction > 0 ? -1 : 1;
    return i % 2 === anchor % 2 ? 1 : -1;
  };

  // Which column a viewport x falls in (the nearest across a gap), or null
  // outside the rail.
  const columnAt = (x) => {
    const railRect = rail.getBoundingClientRect();
    if (x < railRect.left || x > railRect.right) return null;
    let best = null;
    let bestDist = Infinity;
    columns.forEach((col, i) => {
      const r = col.el.getBoundingClientRect();
      const dist = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  };

  const paint = () => {
    columns.forEach((col) => {
      // Unclamped, so the elastic give runs a column a little past its end.
      col.el.style.transform = `translate3d(0, ${(-(col.cur + col.over)).toFixed(2)}px, 0)`;
    });
    // Progress: how far down its own length the pointed-at column is.
    const col = columns[Math.min(progressCol, columns.length - 1)];
    syncProgress(col && col.travel ? col.cur / col.travel : 1, Boolean(col && col.travel));
  };

  const tick = (time) => {
    const dt = Math.min(64, time - (lastTime || time));
    lastTime = time;
    const k = 1 - Math.exp(-dt / (dragging ? DRAG_SMOOTHING_MS : tau));
    const release = !dragging && performance.now() - lastInputAt > OVERSCROLL_RELEASE_MS;
    let moving = dragging;
    columns.forEach((col) => {
      col.cur += (col.tgt - col.cur) * k;
      if (Math.abs(col.tgt - col.cur) < 0.25) col.cur = col.tgt;
      if (col.over && release) {
        col.over *= Math.exp(-dt / OVERSCROLL_SPRING_MS);
        if (Math.abs(col.over) < 0.25) col.over = 0;
      }
      if (col.cur !== col.tgt || col.over) moving = true;
    });
    paint();
    rafId = moving ? window.requestAnimationFrame(tick) : null;
  };

  const kick = () => {
    if (rafId !== null) return;
    lastTime = 0;
    rafId = window.requestAnimationFrame(tick);
  };

  // Move every column by `delta` virtual px in its own sense; whatever would
  // carry a column past an end turns into a resisted elastic give instead.
  const moveBy = (delta, elastic = true) => {
    if (!range) return;
    lastInputAt = performance.now();
    const maxGive = OVERSCROLL_MAX * DRIFT_SPEED;
    columns.forEach((col, i) => {
      const next = col.tgt + delta * col.rate * senseOf(col, i);
      col.tgt = clamp(next, 0, col.travel);
      const excess = next - col.tgt;
      if (excess && elastic) {
        const give = excess * OVERSCROLL_RESIST * (1 - Math.abs(col.over) / maxGive);
        col.over = clamp(col.over + give, -maxGive, maxGive);
      }
    });
    kick();
  };

  const measure = () => {
    if (mode === "static") {
      railHeight = rail.clientHeight;
      const max = rail.scrollHeight - railHeight;
      syncProgress(max > 0 ? rail.scrollTop / max : 1, max > 0);
      return;
    }
    if (mode !== "motion") return;
    railHeight = rail.clientHeight;
    columns.forEach((col) => {
      // Keep each column at the same relative position across resizes.
      const frac = col.travel ? col.tgt / col.travel : col.frac ?? startFrac(col);
      col.travel = Math.max(0, col.el.offsetHeight - railHeight);
      col.frac = frac;
      col.tgt = col.cur = frac * col.travel;
      col.over = 0;
    });
    const maxTravel = Math.max(0, ...columns.map((c) => c.travel));
    range = Math.round(maxTravel / DRIFT_SPEED);
    columns.forEach((col) => {
      col.rate = range ? col.travel / range : 0;
    });
    paint();
  };

  // Scroll the gallery by whole pages, or to either end, in whatever way
  // the current mode moves its thumbnails (keyboard: the default pattern).
  const pageBy = (dir) => {
    const step = (railHeight || rail.clientHeight) * PAGE_STEP;
    if (mode === "motion") {
      anchor = null;
      tau = SMOOTHING_MS;
      moveBy((dir * step) / DRIFT_SPEED);
    } else if (mode === "static") {
      rail.scrollTop += dir * step;
    }
  };

  const toEdge = (dir) => {
    if (mode === "motion") {
      anchor = null;
      tau = SMOOTHING_MS;
      columns.forEach((col, i) => {
        col.tgt = senseOf(col, i) * dir > 0 ? col.travel : 0;
      });
      kick();
    } else if (mode === "static") rail.scrollTop = dir > 0 ? rail.scrollHeight : 0;
  };

  // Bring a thumbnail into view (keyboard focus, lightbox sync) by moving
  // only its own column.
  const revealTile = (tile) => {
    if (mode === "motion") {
      const col = columns[Number(tile.dataset.column)];
      if (!col || !col.travel) return;
      const top = tile.offsetTop;
      const h = tile.offsetHeight;
      const now = -col.tgt;
      const margin = Math.min(56, railHeight * 0.1);
      if (top + now >= margin && top + h + now <= railHeight - margin) return; // already in view
      const desired = clamp(railHeight / 2 - (top + h / 2), -col.travel, 0);
      tau = SMOOTHING_MS;
      col.tgt = -desired;
      kick();
      return;
    }
    if (mode === "static") {
      const railRect = rail.getBoundingClientRect();
      const rect = tile.getBoundingClientRect();
      if (rect.top >= railRect.top && rect.bottom <= railRect.bottom) return;
      rail.scrollTop += rect.top - railRect.top - (railRect.height - rect.height) / 2;
      return;
    }
    tile.scrollIntoView({ block: "nearest", inline: "nearest", behavior: motionAllowed() ? "smooth" : "auto" });
  };

  const resetMotion = () => {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
    dragging = false;
    anchor = null;
    progressCol = 1;
    range = 0;
    columns.forEach((col) => {
      col.travel = col.rate = col.tgt = col.cur = col.over = 0;
      col.frac = startFrac(col);
      col.el.style.transform = "";
    });
    rail.scrollTop = 0;
  };

  const applyMode = () => {
    mode = !desktopQuery.matches ? "stacked" : reducedMotionQuery.matches ? "static" : "motion";
    section.dataset.mode = mode;
    const locked = mode !== "stacked";
    root.classList.toggle("pbc-locked", locked);
    if (locked) window.scrollTo(0, 0);
    resetMotion();
    lastPct = -1;
    lastEdge = null;
    measure();
  };

  // --- Input: wheel, trackpad, touch ---------------------------------------

  gallery.addEventListener(
    "wheel",
    (event) => {
      if (mode !== "motion" || event.ctrlKey) return; // ctrl+wheel is pinch-zoom
      event.preventDefault();
      const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? railHeight : 1;
      const raw = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      anchor = columnAt(event.clientX);
      if (anchor !== null) progressCol = anchor;
      tau = SMOOTHING_MS;
      moveBy(raw * unit);
    },
    { passive: false }
  );

  let touchY = 0;
  let touchTime = 0;
  let velocity = 0; // virtual px per ms

  gallery.addEventListener(
    "touchstart",
    (event) => {
      if (mode !== "motion" || event.touches.length !== 1) {
        dragging = false;
        return;
      }
      dragging = true;
      // The column under the finger follows it.
      anchor = columnAt(event.touches[0].clientX);
      if (anchor !== null) progressCol = anchor;
      touchY = event.touches[0].clientY;
      touchTime = event.timeStamp;
      velocity = 0;
      columns.forEach((col) => {
        col.tgt = col.cur; // catch a glide where it is
      });
      kick();
    },
    { passive: true }
  );

  gallery.addEventListener(
    "touchmove",
    (event) => {
      if (!dragging) return;
      if (event.touches.length !== 1) {
        dragging = false;
        return;
      }
      event.preventDefault();
      const y = event.touches[0].clientY;
      const dy = touchY - y;
      const dt = Math.max(1, event.timeStamp - touchTime);
      velocity = 0.8 * (dy / dt) + 0.2 * velocity;
      touchY = y;
      touchTime = event.timeStamp;
      moveBy(dy);
    },
    { passive: false }
  );

  const endTouch = (event) => {
    if (!dragging) return;
    dragging = false;
    if (event.timeStamp - touchTime > 80) velocity = 0; // finger rested before lifting
    const cap = railHeight * MAX_FLING;
    const fling = clamp(velocity * GLIDE_MS, -cap, cap);
    if (Math.abs(fling) > 2) {
      tau = GLIDE_MS;
      moveBy(fling, false);
    }
    kick();
  };
  gallery.addEventListener("touchend", endTouch);
  gallery.addEventListener("touchcancel", endTouch);

  // Static mode scrolls natively; just mirror its position.
  rail.addEventListener(
    "scroll",
    () => {
      if (mode === "static") measure();
      else if (mode === "motion" && rail.scrollTop) rail.scrollTop = 0; // focus can't scroll the clip
    },
    { passive: true }
  );

  // The locked page must never move, even if focus or find-in-page tries.
  window.addEventListener(
    "scroll",
    () => {
      if (root.classList.contains("pbc-locked") && window.scrollY) window.scrollTo(0, 0);
    },
    { passive: true }
  );

  // --- Clicks and keyboard --------------------------------------------------

  rail.addEventListener("click", (event) => {
    const tile = event.target.closest(".pbc-tile");
    if (!tile) return;
    const pos = Number(tile.dataset.pos);
    // Feed: images open in the lightbox and the featured visual stays put;
    // reels open in the fullscreen reel viewer, which plays from this tap
    // and leaves the page exactly where it was.
    if (mode === "stacked" && FEED) {
      if (IS_VIDEO) {
        select(pos);
        section.classList.add("has-watched"); // outline only once watched
        reelViewer?.open(pos, tile);
      } else if (lightbox) {
        lightbox.open(entries[pos].flatIndex, tile);
      }
      return;
    }
    if (mode === "stacked") {
      if (IS_VIDEO) {
        // Phones: play it in the preview above and bring that into view.
        select(pos, { autoplay: true });
        frame.scrollIntoView({ block: "center", behavior: motionAllowed() ? "smooth" : "auto" });
        return;
      }
      // Phones: the preview is off-screen above, so a tap goes straight to
      // fullscreen (and keeps the preview in step for later).
      select(pos);
      openFullscreen(tile);
      return;
    }
    if (HOVER) {
      cancelHover();
      // Touch: the first tap previews, a second tap on it opens it.
      if (lastPointerType === "touch" && (pos !== selected || !activeShot)) {
        select(pos);
        return;
      }
      // Mouse, pen and keyboard: the preview already shows it, so open it.
      if (pos !== selected || !activeShot) select(pos);
      openFullscreen(tile);
      return;
    }
    // A second click on the selected thumbnail opens it fullscreen.
    if (pos === selected && activeShot) openFullscreen(tile);
    else select(pos, { autoplay: IS_VIDEO });
  });

  // Which kind of pointer pressed last ("" after keyboard use), so a click
  // can tell a touch tap from a mouse click or Enter/Space.
  let lastPointerType = "";
  section.addEventListener("pointerdown", (event) => {
    lastPointerType = event.pointerType;
  }, { capture: true, passive: true });
  section.addEventListener("keydown", () => {
    lastPointerType = "";
  }, { capture: true });

  // --- Hover preview (data-hover-preview) ---------------------------------

  let hoverTimer = 0;
  let hoverTile = null;
  const cancelHover = () => {
    window.clearTimeout(hoverTimer);
    hoverTimer = 0;
    hoverTile = null;
  };

  if (HOVER) {
    // Delegated pointerover/out, so it survives the rail being rebuilt.
    // Leaving a thumbnail (or the gallery) only cancels a pending change:
    // the preview keeps the last item, so it never flickers back.
    rail.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch" || mode === "stacked") return;
      const tile = event.target.closest(".pbc-tile");
      if (!tile || tile === hoverTile) return;
      window.clearTimeout(hoverTimer);
      hoverTile = tile;
      const pos = Number(tile.dataset.pos);
      if (pos === selected && activeShot) return;
      hoverTimer = window.setTimeout(() => {
        hoverTimer = 0;
        if (hoverTile === tile && tile.isConnected) select(pos);
      }, HOVER_INTENT_MS);
    });
    rail.addEventListener("pointerout", (event) => {
      if (event.pointerType === "touch") return;
      const from = event.target.closest(".pbc-tile");
      const to = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(".pbc-tile") : null;
      if (from && from !== to) cancelHover();
    });
  }

  const focusVisible = (el) => {
    try {
      return el.matches(":focus-visible");
    } catch (e) {
      return lastPointerType === "";
    }
  };

  // Tabbing into the gallery brings the focused thumbnail into view (and,
  // with hover previews, into the preview). Focus that comes from a tap or
  // click isn't keyboard focus and leaves the preview to the click handler.
  rail.addEventListener("focusin", (event) => {
    const tile = event.target.closest(".pbc-tile");
    if (!tile || mode === "stacked") return;
    revealTile(tile);
    if (HOVER && focusVisible(tile)) {
      const pos = Number(tile.dataset.pos);
      if (pos !== selected || !activeShot) select(pos);
    }
  });

  // A video preview's clicks belong to its own controls (hover previews
  // have none, so there a click opens the viewer).
  if (!IS_VIDEO || HOVER) frame.addEventListener("click", () => openFullscreen(frame));

  if (HOVER) {
    // The preview clip rests while the full viewer (the image lightbox, or
    // the reel viewer) is open, and picks up again once it closes.
    if ("MutationObserver" in window) {
      let wasOpen = false;
      const sync = () => {
        const open = lightboxIsOpen();
        if (open === wasOpen) return;
        wasOpen = open;
        if (open) activeShot?.querySelector("video")?.pause();
        else playClip(activeShot);
      };
      const watcher = new MutationObserver(sync);
      watcher.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      watcher.observe(root, { attributes: true, attributeFilter: ["class"] });
    }
  }

  section.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const inRail = rail.contains(event.target);
    const inPreview = event.target === frame;
    if (!inRail && !inPreview) return;
    if (FEED && mode === "stacked") return; // feed tiles are plain buttons

    let next = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = selected + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = selected - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = entries.length - 1;
        break;
      case "PageDown":
      case "PageUp":
        if (mode === "stacked") return;
        event.preventDefault();
        pageBy(event.key === "PageDown" ? 1 : -1);
        return;
      case "f":
      case "F":
        event.preventDefault();
        openFullscreen(inRail ? tiles[selected] : frame);
        return;
      default:
        return;
    }
    event.preventDefault();
    select(next, { focus: inRail, reveal: true });
  });

  // With nothing focused, the usual page-scrolling keys drive the gallery,
  // since the locked page itself can't scroll.
  document.addEventListener("keydown", (event) => {
    if (mode === "stacked" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target !== document.body && event.target !== root && event.target !== document) return;
    if (document.body.classList.contains("lightbox-open") || document.body.classList.contains("menu-open")) return;
    switch (event.key) {
      case "PageDown":
      case "ArrowDown":
        pageBy(event.key === "PageDown" ? 1 : 0.25);
        break;
      case "PageUp":
      case "ArrowUp":
        pageBy(event.key === "PageUp" ? -1 : -0.25);
        break;
      case " ":
        pageBy(event.shiftKey ? -1 : 1);
        break;
      case "Home":
        toEdge(-1);
        break;
      case "End":
        toEdge(1);
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  // Keep the preview (and the gallery) in step when the fullscreen view is
  // paged through.
  const lightboxCurrent = document.getElementById("lightbox-current");
  const lightboxEl = document.getElementById("lightbox");
  if (!IS_VIDEO && lightboxCurrent && lightboxEl && "MutationObserver" in window) {
    new MutationObserver(() => {
      if (!lightboxEl.classList.contains("is-open") || (FEED && mode === "stacked")) return;
      const flat = Number(lightboxCurrent.textContent) - 1;
      const pos = entries.findIndex((entry) => entry.flatIndex === flat);
      if (pos >= 0 && pos !== selected) select(pos, { reveal: mode !== "stacked" });
    }).observe(lightboxCurrent, { childList: true, characterData: true, subtree: true });
  }

  // --- Layout changes -------------------------------------------------------

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 120);
  });

  // Rail height changes with the viewport; column lengths as thumbnails
  // lay out.
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => measure()) : null;
  function observeColumns() {
    if (!ro) return;
    ro.disconnect();
    ro.observe(rail);
    ro.observe(stage);
    columns.forEach((col) => ro.observe(col.el));
  }

  desktopQuery.addEventListener("change", () => {
    build();
    applyMode();
    if (!activeShot && mode !== "stacked") showPreview(entries[selected]);
  });
  reducedMotionQuery.addEventListener("change", applyMode);

  build();
  applyMode();
  select(featuredIndex, { auto: true });

  // --- Deep link: ?open=<file> ---------------------------------------------
  //
  // The landing carousel links straight to one piece (an image's file name,
  // or a reel's .mp4). It opens at once in the fullscreen lightbox or, for
  // a reel, the reel viewer (on every screen size, so there is always a
  // close button). Closing it returns the visitor to the page they came
  // from (js/return-trip.js). The parameter is dropped from the address
  // so a reload or a shared link to the page itself doesn't reopen it.
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("open");
  const spotlight = params.get("reel");
  const decodeFile = (name) => {
    try {
      return decodeURIComponent(name);
    } catch (e) {
      return name;
    }
  };
  const linkedPos = requested ? entries.findIndex((entry) => decodeFile(fileOf(entry.src)) === requested) : -1;
  if (requested || spotlight) {
    params.delete("open");
    params.delete("reel");
    const query = params.toString();
    history.replaceState(history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }
  if (linkedPos >= 0) {
    const stackedFeed = mode === "stacked" && FEED;
    if (!stackedFeed) select(linkedPos, { reveal: mode !== "stacked" });
    if (IS_VIDEO) {
      const viewer = reelViewer || (window.createReelViewer
        ? window.createReelViewer(entries, { typeFallback: TYPE_FALLBACK, formatDuration })
        : null);
      if (viewer) {
        window.returnOnClose?.(root, "reel-viewer-open");
        viewer.open(linkedPos, tiles[linkedPos]);
      } else {
        frame.scrollIntoView({ block: "center" });
      }
    } else if (lightbox) {
      window.returnOnClose?.(document.body, "lightbox-open");
      if (stackedFeed) lightbox.open(entries[linkedPos].flatIndex, tiles[linkedPos]);
      else openFullscreen(frame);
    }
  }

  // --- Arrival from a reel watched on the homepage: ?reel=<file> ---------
  //
  // The homepage's reel viewer continues here when closed. That reel is the
  // selected item, the gallery opens at it, and it's briefly highlighted
  // (then keeps the "last watched" outline) so the visitor can carry on
  // exploring. Back still returns to the homepage, where they left it.
  const spotPos = spotlight ? entries.findIndex((entry) => decodeFile(fileOf(entry.src)) === spotlight) : -1;
  if (spotPos >= 0 && linkedPos < 0) {
    const tile = tiles[spotPos];
    select(spotPos, { reveal: mode !== "stacked" });
    section.classList.add("has-watched");
    if (mode === "stacked") tile.scrollIntoView({ block: "center", behavior: "instant" });
    tile.focus({ preventScroll: true });
    // The pulse waits until the page-transition intro has cleared.
    const pulse = () => {
      tile.classList.add("is-spotlit");
      window.setTimeout(() => tile.classList.remove("is-spotlit"), 2400);
    };
    if (window.pageTransition) window.pageTransition.whenRevealed(pulse);
    else pulse();
  }

  // --- Featured slideshow ---------------------------------------------------
  //
  // With a hand-picked `featured` list, the preview crossfades through those
  // photos every SLIDE_MS — no controls. It waits while the preview is off
  // screen, the tab is hidden, the mouse or focus is on the photo, or the
  // fullscreen view or menu is open. Once the visitor picks a photo
  // themselves the preview is theirs and the slideshow stops. Under
  // prefers-reduced-motion it never starts.
  const SLIDE_MS = 3500;
  const slidePositions = IS_VIDEO
    ? []
    : [...new Set((category.featured || []).map((file) => entries.findIndex((entry) => fileOf(entry.src) === file)))]
        .filter((i) => i >= 0);
  if (slidePositions.length < 2) return;

  let slide = Math.max(0, slidePositions.indexOf(selected));
  let playing = false;
  let held = false; // mouse or keyboard focus on the photo
  let frameInView = true;
  let slideTimer = 0;

  const blocked = () =>
    document.body.classList.contains("lightbox-open") || document.body.classList.contains("menu-open");

  const schedule = () => {
    window.clearTimeout(slideTimer);
    if (!playing || !frameInView || held || document.hidden) return;
    slideTimer = window.setTimeout(() => {
      if (blocked()) {
        schedule();
        return;
      }
      slide = (slide + 1) % slidePositions.length;
      select(slidePositions[slide], { auto: true });
      schedule();
    }, SLIDE_MS);
  };

  const setPlaying = (on) => {
    playing = on;
    schedule();
  };

  onManualSelect = () => setPlaying(false);

  frame.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    held = true;
    schedule();
  });
  frame.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse" || document.activeElement === frame) return;
    held = false;
    schedule();
  });
  // Only keyboard focus holds the slide: a tap also focuses the frame (and
  // closing the fullscreen view hands focus back to it), which must not
  // freeze the slideshow on phones.
  frame.addEventListener("focus", () => {
    let keyboard = true;
    try {
      keyboard = frame.matches(":focus-visible");
    } catch (e) {}
    if (keyboard) held = true;
    schedule();
  });
  frame.addEventListener("blur", () => {
    held = frame.matches(":hover");
    schedule();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([item]) => {
        frameInView = item.isIntersecting;
        schedule();
      },
      { threshold: 0.4 }
    ).observe(frame);
  }
  document.addEventListener("visibilitychange", schedule);
  reducedMotionQuery.addEventListener("change", () => {
    if (reducedMotionQuery.matches) setPlaying(false);
  });

  // A linked piece stays in the preview; the slideshow never takes it over.
  const start = () => setPlaying(!reducedMotionQuery.matches && linkedPos < 0);
  if (desktopQuery.matches) {
    start();
  } else {
    // Phones: the opening visual holds until the visitor starts using the
    // page (a scroll, tap or key). It stays the first thing they see — and
    // the page's Largest Contentful Paint — and nobody who leaves at once
    // downloads the rest of the slideshow.
    const events = ["scroll", "pointerdown", "keydown"];
    const begin = () => {
      events.forEach((type) => window.removeEventListener(type, begin, true));
      start();
    };
    events.forEach((type) => window.addEventListener(type, begin, { capture: true, passive: true }));
  }
})();
