/*
 * Print & Brand Collateral — split-screen showcase for
 * pages/print-brand-collateral.html only (loaded after gallery-editorial.js,
 * which still runs this page's header, category copy, prev/next nav, and
 * the shared fullscreen lightbox).
 *
 * Left: a sticky preview of the selected visual at its own natural ratio,
 * with the category title, the image's application type, and a counter.
 * Right: three narrow thumbnail columns driven by the page's own scroll
 * (wheel, trackpad, or touch — nothing is intercepted). While the section
 * is pinned, columns 1 and 3 travel downward and column 2 upward, each
 * across its own full length, eased toward the scroll position for a
 * gentle inertial feel. Movement is bounded by the section's height, so it
 * starts and stops with the page; nothing runs on its own.
 *
 * Modes:
 *   motion  — desktop, motion allowed: pinned stage + opposed column drift.
 *   static  — desktop, prefers-reduced-motion: same split, but the
 *             thumbnail rail is a plain natively scrolling panel.
 *   stacked — phones: preview first (pinned under the header), then one
 *             vertically scrolling gallery.
 *
 * Images come from the category's generated manifest (via
 * window.ProjectGalleryLightbox.entries), so files dropped into
 * assets/images/gallery/print-brand-collateral/ appear after `npm run
 * build`. Thumbnails use the lightweight WebP copies from
 * scripts/generate-gallery-thumbs.js, falling back to the original file;
 * the preview upgrades to the original once it has loaded.
 */
(() => {
  const section = document.getElementById("pbc");
  const stage = document.getElementById("pbc-stage");
  const frame = document.getElementById("pbc-frame");
  const rail = document.getElementById("pbc-rail");
  if (!section || !stage || !frame || !rail) return;

  const lightbox = window.ProjectGalleryLightbox;
  const entries = ((lightbox && lightbox.entries) || []).filter((entry) => entry.src && !entry.isPlaceholder);
  if (!entries.length) {
    section.hidden = true;
    return;
  }

  const CATEGORY_ID = "print-brand-collateral";
  const category = (window.GALLERY_CATEGORIES || []).find((c) => c.id === CATEGORY_ID) || {};
  const meta = (window.GALLERY_EDITORIAL_META || {})[CATEGORY_ID] || {};
  const thumbs = (window.GALLERY_THUMBS || {})[CATEGORY_ID] || {};

  const COLUMN_COUNT = 3;
  // Column pixels moved per pixel of page scroll — below 1 keeps the drift
  // calm and gives the pinned stage a little more scroll to play out over.
  const DRIFT_SPEED = 0.7;
  // Inertia time constant (ms): how quickly the columns catch up with the
  // scroll position. Larger is softer.
  const SMOOTHING_MS = 140;
  const TYPE_FALLBACK = "Print application";

  const desktopQuery = window.matchMedia("(min-width: 761px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
  const fileOf = (src) => src.split("/").pop();
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const currentEl = document.getElementById("pbc-current");
  const totalEl = document.getElementById("pbc-total");
  const categoryEl = document.getElementById("pbc-category");
  const typeEl = document.getElementById("pbc-type");
  const titleEl = document.getElementById("pbc-title");
  const detailEl = document.getElementById("pbc-detail");
  const captionEl = document.getElementById("pbc-caption");
  const expandBtn = document.getElementById("pbc-expand");

  if (totalEl) totalEl.textContent = pad(entries.length);
  if (categoryEl) categoryEl.textContent = category.title || "Print & Brand Collateral";

  const describe = (entry) => {
    const info = meta[fileOf(entry.src)] || {};
    return {
      title: info.title || entry.project || category.title || "Print & Brand Collateral",
      type: entry.type || TYPE_FALLBACK,
      detail: [info.title ? entry.project : "", info.year].filter(Boolean).join(" · "),
    };
  };

  const thumbSrc = (entry) => {
    const thumb = thumbs[fileOf(entry.src)];
    return thumb ? `../${encodePath(thumb)}` : entry.src;
  };

  // --- Thumbnails ---------------------------------------------------------

  let tiles = []; // by position in `entries`
  let columns = [];
  let selected = 0;

  const createTile = (entry, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "pbc-tile";
    tile.dataset.pos = String(i);
    tile.tabIndex = -1;
    tile.setAttribute("aria-pressed", "false");
    tile.setAttribute("aria-label", `Show ${describe(entry).type.toLowerCase()} ${i + 1} of ${entries.length}`);
    // Reserve the image's exact natural shape before it loads.
    tile.style.aspectRatio = entry.width && entry.height ? `${entry.width} / ${entry.height}` : String(entry.ratio || 1);

    const img = document.createElement("img");
    img.className = "pbc-tile-img";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    if (entry.width) img.width = entry.width;
    if (entry.height) img.height = entry.height;
    img.src = thumbSrc(entry);
    if (img.src !== entry.src) {
      img.addEventListener("error", () => {
        img.src = entry.src;
      }, { once: true });
    }
    tile.appendChild(img);
    return tile;
  };

  const build = () => {
    const stacked = !desktopQuery.matches;
    rail.replaceChildren();
    tiles = entries.map(createTile);

    if (stacked) {
      // Phones: a single gallery, manifest order, laid out by CSS columns.
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
        return { el: col, direction: i % 2 === 0 ? 1 : -1, height: 0, travel: 0 };
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
  };

  // --- Preview --------------------------------------------------------------

  let activeShot = null;
  let captionTimer = null;

  const motionAllowed = () => !reducedMotionQuery.matches;

  const createShot = (entry) => {
    const shot = document.createElement("div");
    shot.className = "pbc-shot";
    shot.style.setProperty("--ar", String(entry.width && entry.height ? entry.width / entry.height : entry.ratio || 1));
    if (entry.width) shot.style.setProperty("--nw", `${entry.width}px`);

    const img = document.createElement("img");
    img.className = "pbc-shot-img";
    img.alt = entry.alt || describe(entry).type;
    img.decoding = "async";
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

  const showPreview = (entry) => {
    const next = createShot(entry);
    frame.appendChild(next);

    const previous = activeShot;
    activeShot = next;
    if (previous) {
      previous.classList.remove("is-active");
      previous.classList.add("is-leaving");
      window.setTimeout(() => previous.remove(), motionAllowed() ? 700 : 0);
    }
    // Two frames so the entering state is painted before it transitions.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => next.classList.add("is-active"));
    });

    const info = describe(entry);
    const applyCaption = () => {
      if (typeEl) typeEl.textContent = info.type;
      if (titleEl) titleEl.textContent = info.title;
      if (detailEl) {
        detailEl.textContent = info.detail;
        detailEl.hidden = !info.detail;
      }
      captionEl?.classList.remove("is-switching");
    };
    window.clearTimeout(captionTimer);
    if (captionEl && motionAllowed() && previous) {
      captionEl.classList.add("is-switching");
      captionTimer = window.setTimeout(applyCaption, 180);
    } else {
      applyCaption();
    }
    if (currentEl) currentEl.textContent = pad(entries.indexOf(entry) + 1);
  };

  // Warm the next/previous originals so stepping through feels instant.
  const prefetched = new Set();
  const prefetch = (i) => {
    const entry = entries[(i + entries.length) % entries.length];
    if (!entry || prefetched.has(entry.src)) return;
    prefetched.add(entry.src);
    const img = new Image();
    img.decoding = "async";
    img.src = entry.src;
  };

  // --- Selection ------------------------------------------------------------

  const select = (i, { focus = false, reveal = false } = {}) => {
    i = (i + entries.length) % entries.length;
    const changed = i !== selected || !activeShot;

    const prevTile = tiles[selected];
    if (prevTile) {
      prevTile.classList.remove("is-selected");
      prevTile.setAttribute("aria-pressed", "false");
      prevTile.tabIndex = -1;
    }
    selected = i;
    const tile = tiles[i];
    tile.classList.add("is-selected");
    tile.setAttribute("aria-pressed", "true");
    tile.tabIndex = 0;

    if (changed) {
      showPreview(entries[i]);
      prefetch(i + 1);
      prefetch(i - 1);
    }
    if (reveal) revealTile(tile);
    if (focus) tile.focus({ preventScroll: true });
  };

  const openFullscreen = (trigger) => {
    if (lightbox) lightbox.open(entries[selected].flatIndex, trigger || frame);
  };

  // --- Motion mode: scroll-linked opposed drift -----------------------------

  let mode = "";
  let railHeight = 0;
  let scrollLength = 0; // page pixels the pinned stage plays out over
  let pinTop = 0; // document Y at which the stage pins
  let targetP = 0;
  let currentP = 0;
  let rafId = null;
  let lastTime = 0;

  const stickyOffset = () => parseFloat(getComputedStyle(stage).top) || 0;

  const measure = () => {
    if (mode !== "motion") return;
    railHeight = rail.clientHeight;
    columns.forEach((col) => {
      col.height = col.el.offsetHeight;
      col.travel = Math.max(0, col.height - railHeight);
    });
    const maxTravel = Math.max(0, ...columns.map((c) => c.travel));
    scrollLength = Math.round(maxTravel / DRIFT_SPEED);
    section.style.height = `${stage.offsetHeight + scrollLength}px`;
    pinTop = section.getBoundingClientRect().top + window.scrollY - stickyOffset();
    readScroll();
    currentP = targetP;
    paint();
  };

  const readScroll = () => {
    targetP = scrollLength ? clamp((window.scrollY - pinTop) / scrollLength, 0, 1) : 0;
  };

  // Columns 1 and 3 begin showing their far end and travel down to their
  // start; column 2 travels up. Each covers its own length over the same
  // scroll span, so every thumbnail is reachable.
  const offsetFor = (col, p) => (col.direction > 0 ? -col.travel * (1 - p) : -col.travel * p);

  const paint = () => {
    columns.forEach((col) => {
      col.el.style.transform = `translate3d(0, ${offsetFor(col, currentP).toFixed(2)}px, 0)`;
    });
  };

  const tick = (time) => {
    const dt = Math.min(64, time - (lastTime || time));
    lastTime = time;
    const ease = 1 - Math.exp(-dt / SMOOTHING_MS);
    currentP += (targetP - currentP) * ease;
    if (Math.abs(targetP - currentP) * Math.max(1, scrollLength) < 0.25) currentP = targetP;
    paint();
    rafId = currentP === targetP ? null : window.requestAnimationFrame(tick);
  };

  const kick = () => {
    if (rafId !== null) return;
    lastTime = 0;
    rafId = window.requestAnimationFrame(tick);
  };

  const onScroll = () => {
    if (mode !== "motion") return;
    readScroll();
    kick();
  };

  // Bring a thumbnail into view (keyboard / lightbox sync), in whatever way
  // the current mode moves its thumbnails.
  const revealTile = (tile) => {
    if (mode === "motion") {
      const col = columns[Number(tile.dataset.column)];
      if (!col || !col.travel) return;
      const top = tile.offsetTop;
      const h = tile.offsetHeight;
      const now = offsetFor(col, targetP);
      const margin = Math.min(48, railHeight * 0.08);
      if (top + now >= margin && top + h + now <= railHeight - margin) return; // already in view
      const desired = clamp(railHeight / 2 - (top + h / 2), -col.travel, 0);
      const p = col.direction > 0 ? 1 + desired / col.travel : -desired / col.travel;
      window.scrollTo({ top: pinTop + clamp(p, 0, 1) * scrollLength, behavior: "auto" });
      return;
    }
    tile.scrollIntoView({ block: "nearest", inline: "nearest", behavior: motionAllowed() ? "smooth" : "auto" });
  };

  const resetMotion = () => {
    section.style.height = "";
    columns.forEach((col) => {
      col.el.style.transform = "";
    });
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
  };

  const applyMode = () => {
    const nextMode = !desktopQuery.matches ? "stacked" : reducedMotionQuery.matches ? "static" : "motion";
    mode = nextMode;
    section.dataset.mode = mode;
    resetMotion();
    if (mode === "motion") measure();
  };

  // --- Events ---------------------------------------------------------------

  rail.addEventListener("click", (event) => {
    const tile = event.target.closest(".pbc-tile");
    if (!tile) return;
    const pos = Number(tile.dataset.pos);
    // A second click on the selected thumbnail opens it fullscreen.
    if (pos === selected && activeShot) openFullscreen(tile);
    else select(pos);
  });

  frame.addEventListener("click", () => openFullscreen(frame));
  expandBtn?.addEventListener("click", () => openFullscreen(expandBtn));

  section.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const inRail = rail.contains(event.target);
    const inPreview = event.target === frame;
    if (!inRail && !inPreview) return;

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

  // Keep the preview in step when the fullscreen view is paged through.
  const lightboxCurrent = document.getElementById("lightbox-current");
  const lightboxEl = document.getElementById("lightbox");
  if (lightboxCurrent && lightboxEl && "MutationObserver" in window) {
    new MutationObserver(() => {
      if (!lightboxEl.classList.contains("is-open")) return;
      const flat = Number(lightboxCurrent.textContent) - 1;
      const pos = entries.findIndex((entry) => entry.flatIndex === flat);
      if (pos >= 0 && pos !== selected) select(pos);
    }).observe(lightboxCurrent, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 120);
  });

  // Column lengths change as thumbnails lay out and the viewport resizes.
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => measure());
    ro.observe(rail);
    ro.observe(stage);
  }

  desktopQuery.addEventListener("change", () => {
    build();
    applyMode();
  });
  reducedMotionQuery.addEventListener("change", applyMode);

  build();
  applyMode();
  select(0);
})();
