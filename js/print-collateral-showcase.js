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
 * captured there and never reaches the page. Columns 1 and 3 travel
 * downward while column 2 travels upward, each across its own full length,
 * eased toward the target for controlled inertia (touch flicks glide on).
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
 *             shown in two columns and a tap opens js/reel-viewer.js.
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
  // data-mobile-layout="feed": phones get a featured visual followed by a
  // two-column masonry archive (landscape visuals span both columns)
  // instead of the single stacked column. data-featured names the file
  // shown first; it defaults to the first image.
  const FEED = section.dataset.mobileLayout === "feed";
  const LANDSCAPE_RATIO = 1.2;

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
        width: item.width,
        height: item.height,
        ratio: item.ratio || (item.width && item.height ? item.width / item.height : 9 / 16),
        type: info.type || "",
        // Only hand-written titles are ever shown — never the filename.
        // `label` is what screen readers hear when there's no title.
        alt: info.alt || info.title || `Reel ${i + 1}`,
        title: info.title || "",
        label: info.title || `Reel ${i + 1}`,
        brand: info.brand || info.project || "",
        year: info.year ? String(info.year) : "",
        // Seconds, or "m:ss"; otherwise read from the file's metadata.
        duration: parseDuration(info.duration),
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
  const featuredIndex = Math.max(
    0,
    entries.findIndex((entry) => entry.src.split("/").pop() === section.dataset.featured)
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

  const desktopQuery = window.matchMedia("(min-width: 761px)");
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
  if (categoryEl && category.title) categoryEl.textContent = category.title;

  // Used for thumbnail labels and preview alt text.
  const describe = (entry) => ({ type: entry.type || TYPE_FALLBACK });

  // A small build-time WebP copy, if one exists (videos use their poster).
  const thumbFor = (entry) => {
    if (IS_VIDEO) return "";
    const thumb = thumbs[fileOf(entry.src)];
    return thumb ? `../${encodePath(thumb)}` : "";
  };
  const thumbSrc = (entry) => (IS_VIDEO ? entry.poster : thumbFor(entry) || entry.src);

  // --- Thumbnails ---------------------------------------------------------

  let tiles = []; // by position in `entries`
  let columns = [];
  let selected = 0;

  const createTile = (entry, i, stacked, feed = false) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "pbc-tile";
    tile.dataset.pos = String(i);
    tile.tabIndex = -1;
    tile.setAttribute("aria-pressed", "false");
    tile.setAttribute(
      "aria-label",
      `${IS_VIDEO ? "Play" : "Show"} ${describe(entry).type.toLowerCase()} ${i + 1} of ${entries.length}`
    );
    // Reserve the image's exact natural shape before it loads. The feed
    // leaves that to the img's own width/height attributes (height: auto).
    if (!feed) {
      tile.style.aspectRatio = entry.width && entry.height ? `${entry.width} / ${entry.height}` : String(entry.ratio || 1);
    }

    const img = document.createElement("img");
    img.className = "pbc-tile-img";
    img.alt = "";
    // Desktop tiles sit outside the rail's clip until the columns bring
    // them in, so native lazy-loading only starts each one as it appears.
    // Small WebP thumbnails are cheap enough to load up front (low
    // priority) instead; full-size fallbacks and posters stay lazy.
    const eager = !stacked && Boolean(thumbFor(entry));
    img.loading = eager ? "eager" : "lazy";
    if (eager) img.fetchPriority = "low";
    img.decoding = "async";
    img.draggable = false;
    if (entry.width) img.width = entry.width;
    if (entry.height) img.height = entry.height;
    img.src = thumbSrc(entry);
    // Feed: let the browser pick the 720px WebP or the original by the
    // tile's rendered width (half the screen, or all of it for landscape).
    const thumb = thumbFor(entry);
    if (feed && thumb && entry.width > 720) {
      img.srcset = `${thumb} 720w, ${encodePath(entry.src)} ${entry.width}w`;
      img.sizes = ratioOf(entry) >= LANDSCAPE_RATIO ? "calc(100vw - 40px)" : "calc(50vw - 25px)";
    }
    if (!IS_VIDEO && img.src !== entry.src) {
      img.addEventListener("error", () => {
        img.removeAttribute("srcset");
        img.src = entry.src;
      }, { once: true });
    }
    tile.appendChild(img);

    if (IS_VIDEO) {
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
    if (feedCount) feedCount.textContent = `${entries.length} ${IS_VIDEO ? "reels" : "visuals"}`;

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
  // Durations come from the meta; otherwise each file's header is read as
  // its tile nears the screen (never under data saver) — add `duration` in
  // js/reel-meta.js to skip that request.

  let durationObserver = null;
  const reelViewer =
    IS_VIDEO && FEED && window.createReelViewer
      ? window.createReelViewer(entries, { typeFallback: TYPE_FALLBACK, formatDuration })
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
    if (entry.duration || saveData) return;
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
      caption.append(title, badge);
      tile.appendChild(caption);
      tile.setAttribute("aria-label", `Play ${entry.label}${entry.brand ? `, ${entry.brand}` : ""}`);
      tile.tabIndex = 0;
      grid.appendChild(tile);
    });
    rail.appendChild(grid);
    if (feedCount) feedCount.textContent = `${entries.length} reels`;

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
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = saveData ? "none" : "metadata";
      if (entry.poster) video.poster = entry.poster;
      video.src = entry.src;
      video.setAttribute("aria-label", `${entry.label}${entry.brand ? `, ${entry.brand}` : ""}`);
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

    const img = document.createElement("img");
    img.className = "pbc-shot-img";
    img.alt = entry.alt || describe(entry).type;
    img.decoding = "async";
    // The first preview is the page's lead image: fetch it before the rest.
    if (!activeShot) img.fetchPriority = "high";
    if (entry.width) img.width = entry.width;
    if (entry.height) img.height = entry.height;
    // Show the (usually already cached) thumbnail at once, then swap in the
    // full-resolution original as soon as it has decoded.
    const lowRes = thumbSrc(entry);
    img.src = lowRes;
    if (lowRes !== entry.src) {
      const full = new Image();
      full.decoding = "async";
      full.src = entry.src;
      (full.decode ? full.decode() : Promise.resolve())
        .then(() => {
          if (shot.isConnected) img.src = entry.src;
        })
        .catch(() => {});
    }
    shot.appendChild(img);
    return shot;
  };

  // autoplay is only ever true from a direct click or tap on a video tile,
  // and plays muted (the native controls unmute) — never on page load.
  const showPreview = (entry, autoplay = false) => {
    const next = createShot(entry);
    frame.appendChild(next);
    if (autoplay) {
      const video = next.querySelector("video");
      const playing = video && video.play();
      if (playing && playing.catch) playing.catch(() => {});
    }

    const previous = activeShot;
    activeShot = next;
    if (previous) {
      previous.querySelector("video")?.pause();
      previous.classList.remove("is-active");
      previous.classList.add("is-leaving");
      window.setTimeout(() => previous.remove(), motionAllowed() ? 700 : 0);
    }
    // Two frames so the entering state is painted before it transitions.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => next.classList.add("is-active"));
    });

    if (currentEl) currentEl.textContent = pad(entries.indexOf(entry) + 1);
  };

  // Warm the next/previous originals so stepping through feels instant.
  const prefetched = new Set();
  const prefetch = (i) => {
    if (IS_VIDEO) return;
    const entry = entries[(i + entries.length) % entries.length];
    if (!entry || prefetched.has(entry.src)) return;
    prefetched.add(entry.src);
    const img = new Image();
    img.decoding = "async";
    img.src = entry.src;
  };

  // --- Selection ------------------------------------------------------------

  const select = (i, { focus = false, reveal = false, autoplay = false } = {}) => {
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
  };

  const openFullscreen = (trigger) => {
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
        edge === "start" ? "Start of gallery" : edge === "end" || edge === "all" ? "End of gallery" : `${pct}%`
      );
    }
  };

  // --- Motion mode: virtual scroll with opposed column drift ---------------

  let mode = "";
  let railHeight = 0;
  let range = 0; // virtual scroll length: input pixels from start to end
  let target = 0;
  let current = 0;
  let overshoot = 0; // elastic give past either end, in virtual px
  let tau = SMOOTHING_MS;
  let dragging = false;
  let lastInputAt = 0;
  let rafId = null;
  let lastTime = 0;

  // Columns 1 and 3 begin showing their far end and travel down to their
  // start; column 2 travels up. Each covers its own length over the same
  // virtual range, so every thumbnail is reachable. Unclamped, so the
  // elastic give runs each column a little past its end into its padding.
  const offsetAt = (col, s) => (col.direction > 0 ? -col.travel + s * col.rate : -s * col.rate);

  const paint = () => {
    const s = current + overshoot;
    columns.forEach((col) => {
      col.el.style.transform = `translate3d(0, ${offsetAt(col, s).toFixed(2)}px, 0)`;
    });
    syncProgress(range ? current / range : 1, range > 0);
  };

  const tick = (time) => {
    const dt = Math.min(64, time - (lastTime || time));
    lastTime = time;
    current += (target - current) * (1 - Math.exp(-dt / (dragging ? DRAG_SMOOTHING_MS : tau)));
    if (Math.abs(target - current) < 0.25) current = target;
    if (overshoot && !dragging && performance.now() - lastInputAt > OVERSCROLL_RELEASE_MS) {
      overshoot *= Math.exp(-dt / OVERSCROLL_SPRING_MS);
      if (Math.abs(overshoot) < 0.25) overshoot = 0;
    }
    paint();
    rafId = current === target && overshoot === 0 && !dragging ? null : window.requestAnimationFrame(tick);
  };

  const kick = () => {
    if (rafId !== null) return;
    lastTime = 0;
    rafId = window.requestAnimationFrame(tick);
  };

  // Move the target by `delta` virtual px; whatever would pass an end turns
  // into a resisted elastic give instead.
  const moveBy = (delta) => {
    if (!range) return;
    lastInputAt = performance.now();
    const next = target + delta;
    target = clamp(next, 0, range);
    const excess = next - target;
    if (excess) {
      const give = excess * OVERSCROLL_RESIST * (1 - Math.abs(overshoot) / OVERSCROLL_MAX);
      overshoot = clamp(overshoot + give, -OVERSCROLL_MAX, OVERSCROLL_MAX);
    }
    kick();
  };

  const moveTo = (s) => {
    tau = SMOOTHING_MS;
    target = clamp(s, 0, range);
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
    const ratio = range ? target / range : 0;
    railHeight = rail.clientHeight;
    columns.forEach((col) => {
      col.travel = Math.max(0, col.el.offsetHeight - railHeight);
    });
    const maxTravel = Math.max(0, ...columns.map((c) => c.travel));
    range = Math.round(maxTravel / DRIFT_SPEED);
    columns.forEach((col) => {
      col.rate = range ? col.travel / range : 0;
    });
    // Keep the same relative position across resizes.
    target = current = ratio * range;
    overshoot = 0;
    paint();
  };

  // Scroll the gallery by whole pages, or to either end, in whatever way
  // the current mode moves its thumbnails.
  const pageBy = (dir) => {
    const step = (railHeight || rail.clientHeight) * PAGE_STEP;
    if (mode === "motion") {
      tau = SMOOTHING_MS;
      moveBy((dir * step) / DRIFT_SPEED);
    } else if (mode === "static") {
      rail.scrollTop += dir * step;
    }
  };

  const toEdge = (dir) => {
    if (mode === "motion") moveTo(dir > 0 ? range : 0);
    else if (mode === "static") rail.scrollTop = dir > 0 ? rail.scrollHeight : 0;
  };

  // Bring a thumbnail into view (keyboard focus, lightbox sync).
  const revealTile = (tile) => {
    if (mode === "motion") {
      const col = columns[Number(tile.dataset.column)];
      if (!col || !col.rate) return;
      const top = tile.offsetTop;
      const h = tile.offsetHeight;
      const now = offsetAt(col, target);
      const margin = Math.min(56, railHeight * 0.1);
      if (top + now >= margin && top + h + now <= railHeight - margin) return; // already in view
      const desired = clamp(railHeight / 2 - (top + h / 2), -col.travel, 0);
      moveTo(col.direction > 0 ? (desired + col.travel) / col.rate : -desired / col.rate);
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
    range = target = current = overshoot = 0;
    columns.forEach((col) => {
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
      touchY = event.touches[0].clientY;
      touchTime = event.timeStamp;
      velocity = 0;
      target = current; // catch a glide where it is
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
      target = clamp(target + fling, 0, range);
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
    // A second click on the selected thumbnail opens it fullscreen.
    if (pos === selected && activeShot) openFullscreen(tile);
    else select(pos, { autoplay: IS_VIDEO });
  });

  // Tabbing into the gallery brings the focused thumbnail into view.
  rail.addEventListener("focusin", (event) => {
    const tile = event.target.closest(".pbc-tile");
    if (tile && mode !== "stacked") revealTile(tile);
  });

  // A video preview's clicks belong to its own controls.
  if (!IS_VIDEO) frame.addEventListener("click", () => openFullscreen(frame));

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
  select(featuredIndex);
})();
