<<<<<<< HEAD
(() => {
  const initialiseSocialShowcase = () => {
    const wall = document.getElementById("editorial-wall");
    if (!wall || document.querySelector(".social-showcase-scroll")) return;

    const shell = document.createElement("div");
    shell.className = "social-showcase-scroll";
    shell.setAttribute("aria-label", "Scroll to explore campaign work");
    wall.parentNode.insertBefore(shell, wall);
    shell.appendChild(wall);

    const rows = Array.from(wall.querySelectorAll(".editorial-row"));
    const tracks = rows.map((row) => row.querySelector(".editorial-row-track"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");

    let frame = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const mix = (from, to, progress) => from + (to - from) * progress;

    const render = () => {
      frame = 0;

      if (reducedMotion.matches || mobile.matches) {
        wall.style.removeProperty("--social-tilt");
        wall.style.removeProperty("--social-scale");
        tracks.forEach((track) => {
          if (track) track.style.transform = "";
        });
        return;
      }

      const rect = shell.getBoundingClientRect();
      const travel = Math.max(shell.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-rect.top / travel, 0, 1);
      const settle = clamp(progress / 0.48, 0, 1);
      const galleryProgress = clamp((progress - 0.24) / 0.76, 0, 1);

      wall.style.setProperty("--social-tilt", `${mix(66, 0, settle).toFixed(2)}deg`);
      wall.style.setProperty("--social-scale", mix(1.14, 1, settle).toFixed(4));

      const ranges = [
        [-12, 5],
        [16, -6],
        [-10, 4],
      ];

      tracks.forEach((track, index) => {
        if (!track) return;
        const range = ranges[index % ranges.length];
        const y = mix(range[0], range[1], galleryProgress);
        track.style.transform = `translate3d(0, ${y.toFixed(3)}%, 0)`;
      });
    };

    const requestRender = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(render);
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);
    reducedMotion.addEventListener?.("change", requestRender);
    mobile.addEventListener?.("change", requestRender);

    wall.querySelectorAll(".editorial-tile").forEach((tile) => {
      tile.addEventListener("pointerenter", () => tile.closest(".editorial-row")?.classList.add("has-active-tile"));
      tile.addEventListener("pointerleave", () => tile.closest(".editorial-row")?.classList.remove("has-active-tile"));
    });

    requestRender();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseSocialShowcase, { once: true });
  } else {
    initialiseSocialShowcase();
  }
=======
/*
 * Social Media Campaigns & Key Visuals — scroll-led showcase for
 * pages/social-media-campaigns.html only (loaded after gallery-editorial.js,
 * which still runs this page's header, category copy, prev/next nav, and
 * the shared fullscreen lightbox).
 *
 * Every image in the category's manifest is laid out in three columns
 * (two on phones), each tile at its image's own aspect ratio. On desktop
 * the whole wall starts tilted back in perspective and straightens as you
 * scroll into it; once flat, the columns drift at slightly different
 * speeds and directions as the page scrolls past. Everything is tied to
 * the scroll position — nothing moves on its own. Phones and
 * prefers-reduced-motion get the plain, static columns.
 *
 * Tiles show the lightweight WebP copies from scripts/generate-gallery-
 * thumbs.js (falling back to the original file); clicking one opens the
 * original in the shared lightbox via window.ProjectGalleryLightbox.
 */
(() => {
  const section = document.getElementById("scs");
  const plane = document.getElementById("scs-plane");
  if (!section || !plane) return;

  const lightbox = window.ProjectGalleryLightbox;
  const entries = ((lightbox && lightbox.entries) || []).filter((entry) => entry.src && !entry.isPlaceholder);
  if (!entries.length) {
    section.hidden = true;
    return;
  }

  const CATEGORY_ID = "social-media-campaigns";
  const thumbs = (window.GALLERY_THUMBS || {})[CATEGORY_ID] || {};

  // Desktop columns get different lengths on purpose: the longest scrolls
  // with the page and the shorter ones drift down against it, which is what
  // gives the layered, different-speed movement.
  const DESKTOP_WEIGHTS = [0.86, 1, 0.93];
  const MOBILE_WEIGHTS = [1, 1];
  const TILT_X_DEG = 46;
  const TILT_Z_DEG = -7;
  const START_SCALE = 0.8;

  const desktopQuery = window.matchMedia("(min-width: 761px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
  const fileOf = (src) => src.split("/").pop();

  let columns = [];
  let columnHeights = [];
  let tallest = 0;
  let sectionDocTop = 0;
  let motionOn = false;

  const createTile = (entry) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "scs-tile";
    tile.dataset.index = String(entry.flatIndex);
    tile.setAttribute("aria-label", `Open “${entry.title || "image"}” fullscreen`);
    // Reserve the image's exact natural shape before it loads.
    if (entry.width && entry.height) tile.style.aspectRatio = `${entry.width} / ${entry.height}`;
    else tile.style.aspectRatio = String(entry.ratio || 1);

    const img = document.createElement("img");
    img.className = "scs-img";
    img.alt = entry.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    if (entry.width) img.width = entry.width;
    if (entry.height) img.height = entry.height;
    const thumb = thumbs[fileOf(entry.src)];
    img.src = thumb ? `../${encodePath(thumb)}` : entry.src;
    if (thumb) {
      img.addEventListener("error", () => {
        img.src = entry.src;
      }, { once: true });
    }
    tile.appendChild(img);
    return tile;
  };

  const build = () => {
    const weights = desktopQuery.matches ? DESKTOP_WEIGHTS : MOBILE_WEIGHTS;
    plane.replaceChildren();
    columns = weights.map(() => {
      const col = document.createElement("div");
      col.className = "scs-col";
      plane.appendChild(col);
      return col;
    });

    // Greedy fill by relative height (1/ratio per unit width), each column
    // aiming for its own weight; manifest order is kept within a column.
    const filled = weights.map(() => 0);
    const fragments = weights.map(() => document.createDocumentFragment());
    entries.forEach((entry) => {
      let target = 0;
      for (let i = 1; i < weights.length; i += 1) {
        if (filled[i] / weights[i] < filled[target] / weights[target]) target = i;
      }
      filled[target] += 1 / (entry.ratio || 1) + 0.04;
      fragments[target].appendChild(createTile(entry));
    });
    fragments.forEach((fragment, i) => columns[i].appendChild(fragment));
    measure();
  };

  const measure = () => {
    columnHeights = columns.map((col) => col.offsetHeight);
    tallest = Math.max(0, ...columnHeights);
    sectionDocTop = section.getBoundingClientRect().top + window.scrollY;
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const resetMotion = () => {
    plane.style.transform = "";
    columns.forEach((col) => {
      col.style.transform = "";
    });
  };

  const update = () => {
    if (!motionOn) return;
    const vh = window.innerHeight;
    const y = window.scrollY;

    // 1) Tilt → flat over roughly the first viewport of scrolling into the wall.
    const tiltStart = Math.max(0, sectionDocTop - vh);
    const tiltEnd = Math.max(sectionDocTop - vh * 0.1, tiltStart + vh * 0.9);
    const tilt = clamp01((y - tiltStart) / (tiltEnd - tiltStart));
    const eased = tilt * tilt * (3 - 2 * tilt); // smoothstep: gentle start and finish
    const rest = 1 - eased;
    plane.style.transform =
      rest > 0.0005
        ? `rotateX(${(TILT_X_DEG * rest).toFixed(2)}deg) rotateZ(${(TILT_Z_DEG * rest).toFixed(2)}deg) scale(${(START_SCALE + (1 - START_SCALE) * eased).toFixed(4)})`
        : "";

    // 2) Column drift across the whole wall: shorter columns slide down
    // against the longest one (so they travel slower), lining every
    // column's top up at the start and its bottom up at the end.
    const progress = clamp01((y - sectionDocTop) / Math.max(1, tallest - vh));
    columns.forEach((col, i) => {
      const offset = (tallest - columnHeights[i]) * progress;
      col.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  };

  let rafPending = false;
  const requestUpdate = () => {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(() => {
      rafPending = false;
      update();
    });
  };

  const applyMode = () => {
    motionOn = desktopQuery.matches && !reducedMotionQuery.matches;
    section.classList.toggle("is-motion", motionOn);
    if (!motionOn) resetMotion();
    else {
      measure();
      update();
    }
  };

  plane.addEventListener("click", (event) => {
    const tile = event.target.closest(".scs-tile");
    if (!tile || !lightbox) return;
    lightbox.open(Number(tile.dataset.index), tile);
  });

  window.addEventListener("scroll", requestUpdate, { passive: true });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      requestUpdate();
    }, 120);
  });

  // Column lengths change as the viewport (and so the column width) changes.
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      measure();
      requestUpdate();
    }).observe(plane);
  }

  desktopQuery.addEventListener("change", () => {
    build();
    applyMode();
  });
  reducedMotionQuery.addEventListener("change", applyMode);

  build();
  applyMode();
>>>>>>> 7d369f4 (Update portfolio)
})();
