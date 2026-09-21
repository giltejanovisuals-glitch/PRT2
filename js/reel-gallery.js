/*
 * Short-Form Video & Reels — dedicated interactive video-selection
 * interface for pages/short-form-video-reels.html only. Every other
 * Project Gallery category keeps using the shared moving-wall gallery in
 * js/gallery-editorial.js (still loaded on this page for the header/
 * theme-toggle/mobile-nav/category-text/prev-next-nav logic it shares with
 * every category page — it no-ops safely here since this page no longer has
 * an #editorial-wall or #lightbox element for it to find).
 */
(() => {
  const grid = document.getElementById("reel-grid");
  if (!grid) return;

  const videoEl = document.getElementById("reel-video");
  const playerEl = document.getElementById("reel-player");
  const counterEl = document.getElementById("reel-counter");
  const projectEl = document.getElementById("reel-meta-project");
  const titleEl = document.getElementById("reel-meta-title");
  const lineEl = document.getElementById("reel-meta-line");
  const progressFill = document.getElementById("reel-progress-fill");
  const fadeEl = document.getElementById("reel-grid-fade");
  const srStatus = document.getElementById("reel-sr-status");

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const VIDEO_BASE = "../assets/videos/short-form-reels/";
  const PLACEHOLDER_COUNT = 12;
  const CROSSFADE_MS = 300;

  const PLAY_ICON_SVG =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';

  const categories = window.GALLERY_CATEGORIES || [];
  const category = categories.find((c) => c.id === "short-form-video-reels") || {};
  const manifest = window.REEL_MANIFEST || [];
  const meta = window.REEL_META || {};

  const buildMetaLine = (entry) => {
    const parts = ["Reel", entry.type, entry.year].filter(Boolean);
    return parts.join(" · ");
  };

  const buildPlaceholderEntries = () => {
    const base = category.entries || [];
    if (!base.length) return [];
    return Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => {
      const src = base[i % base.length];
      return {
        isPlaceholder: true,
        title: src.type || category.title || "Untitled",
        brand: src.brand && src.brand !== "Client Name" ? src.brand : "",
        type: src.type || "",
        year: src.year || "",
        alt: `${src.type || "Video"} placeholder`,
      };
    });
  };

  const buildRealEntries = () =>
    manifest.map((item) => {
      const info = meta[item.file] || {};
      return {
        isPlaceholder: false,
        file: item.file,
        src: `${VIDEO_BASE}${item.file}`,
        poster: item.poster ? `${VIDEO_BASE}${item.poster}` : "",
        title: info.title || item.title || "Untitled",
        brand: info.brand || "",
        type: info.type || "",
        year: info.year || "",
        alt: info.alt || info.title || item.title || "Video",
      };
    });

  const entries = (manifest.length ? buildRealEntries() : buildPlaceholderEntries()).map((entry, i) => ({
    ...entry,
    index: i,
  }));

  const total = entries.length;
  if (!total) return;

  // --- Build the grid of thumbnail buttons ---

  const thumbs = [];
  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reel-thumb";
    btn.dataset.index = String(entry.index);
    btn.tabIndex = entry.index === 0 ? 0 : -1;
    btn.setAttribute("aria-current", "false");

    if (entry.isPlaceholder) {
      btn.disabled = true;
      btn.setAttribute("aria-label", `${entry.title} — placeholder, add a video to preview it`);
    } else {
      const label = ["Play", entry.brand, entry.title, entry.type].filter(Boolean).join(" ");
      btn.setAttribute("aria-label", label);
    }

    const media = document.createElement("span");
    media.className = "reel-thumb-media";
    if (entry.isPlaceholder) {
      // Tone class alone (not the shared .gallery-image), since
      // .gallery-image's own background would win the cascade over the
      // tone gradient here — reel-gallery.css loads after project-gallery.css.
      media.classList.add("reel-thumb-media-placeholder", category.tone || "showcase-tone-digital");
    } else {
      const img = document.createElement("img");
      img.className = "reel-thumb-img";
      img.src = entry.poster;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
    }
    btn.appendChild(media);

    if (!entry.isPlaceholder) {
      const play = document.createElement("span");
      play.className = "reel-thumb-play";
      play.innerHTML = PLAY_ICON_SVG;
      btn.appendChild(play);

      const badge = document.createElement("span");
      badge.className = "reel-thumb-badge";
      badge.textContent = "Now Playing";
      btn.appendChild(badge);

      const caption = document.createElement("span");
      caption.className = "reel-thumb-caption";
      const capBrand = document.createElement("span");
      capBrand.className = "reel-thumb-caption-brand";
      capBrand.textContent = entry.brand || entry.type || "";
      const capTitle = document.createElement("span");
      capTitle.className = "reel-thumb-caption-title";
      capTitle.textContent = entry.title || "";
      caption.append(capBrand, capTitle);
      btn.appendChild(caption);

      btn.addEventListener("click", () => selectEntry(entry.index));
      btn.addEventListener("focus", () => setRovingTabIndex(entry.index));
    }

    fragment.appendChild(btn);
    thumbs.push(btn);
  });

  grid.appendChild(fragment);

  // --- Roving tabindex + arrow-key movement across the grid ---

  const setRovingTabIndex = (activeIdx) => {
    thumbs.forEach((btn, i) => {
      btn.tabIndex = i === activeIdx ? 0 : -1;
    });
  };

  const getColumnCount = () => {
    const columns = window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean);
    return columns.length || 3;
  };

  grid.addEventListener("keydown", (event) => {
    const currentBtn = document.activeElement && document.activeElement.closest(".reel-thumb");
    if (!currentBtn) return;
    const idx = Number(currentBtn.dataset.index);
    const cols = getColumnCount();

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectEntry(idx);
      return;
    }

    let nextIdx = null;
    if (event.key === "ArrowRight") nextIdx = Math.min(idx + 1, total - 1);
    else if (event.key === "ArrowLeft") nextIdx = Math.max(idx - 1, 0);
    else if (event.key === "ArrowDown") nextIdx = Math.min(idx + cols, total - 1);
    else if (event.key === "ArrowUp") nextIdx = Math.max(idx - cols, 0);
    else return;

    event.preventDefault();
    if (nextIdx !== idx) thumbs[nextIdx].focus();
  });

  // --- Bottom fade toggling ---

  const updateFade = () => {
    if (!fadeEl) return;
    const scrollable = grid.scrollHeight > grid.clientHeight + 1;
    const atBottom = grid.scrollHeight - grid.clientHeight - grid.scrollTop <= 2;
    fadeEl.classList.toggle("is-hidden", !scrollable || atBottom);
  };

  grid.addEventListener("scroll", updateFade, { passive: true });
  window.addEventListener("resize", updateFade);

  // --- Preview + metadata ---

  let activeIndex = -1;

  const applyMeta = (entry) => {
    if (projectEl) projectEl.textContent = entry.brand || entry.type || "—";
    if (titleEl) titleEl.textContent = entry.title || "Untitled";
    if (lineEl) lineEl.textContent = buildMetaLine(entry);
    if (counterEl) {
      counterEl.textContent = `${String(entry.index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    }
    if (progressFill) {
      const pct = total > 1 ? (entry.index / (total - 1)) * 100 : 100;
      progressFill.style.width = `${pct}%`;
    }
  };

  const setActiveThumb = (index) => {
    thumbs.forEach((btn, i) => {
      btn.setAttribute("aria-current", i === index ? "true" : "false");
    });
  };

  const applyVideo = (entry, autoplay) => {
    videoEl.pause();
    if (entry.isPlaceholder) {
      playerEl.classList.add("is-placeholder");
      videoEl.removeAttribute("src");
      videoEl.load();
      return;
    }
    playerEl.classList.remove("is-placeholder");
    videoEl.poster = entry.poster;
    videoEl.setAttribute("aria-label", entry.alt || entry.title || "");
    if (videoEl.getAttribute("src") !== entry.src) {
      videoEl.src = entry.src;
      videoEl.load();
    }
    if (autoplay) {
      videoEl.muted = true;
      const playPromise = videoEl.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
    }
  };

  const announce = (entry) => {
    if (!srStatus) return;
    srStatus.textContent = entry.isPlaceholder
      ? `Selected ${entry.title}`
      : `Now playing: ${entry.title}${entry.brand ? ", " + entry.brand : ""}`;
  };

  // autoplay: only ever called from a real user gesture (click / Enter /
  // Space on a thumbnail) — never on initial page load, matching "do not
  // autoplay with sound" / "do not autoplay during page loading".
  const selectEntry = (index, autoplay = true) => {
    const entry = entries[index];
    if (!entry || entry.isPlaceholder || index === activeIndex) {
      thumbs[index]?.focus();
      return;
    }

    activeIndex = index;
    setActiveThumb(index);
    setRovingTabIndex(index);
    applyMeta(entry);
    announce(entry);

    const finishSwap = () => {
      applyVideo(entry, autoplay);
      requestAnimationFrame(() => playerEl.classList.remove("is-switching"));
    };

    if (reduceMotionQuery.matches) {
      finishSwap();
    } else {
      playerEl.classList.add("is-switching");
      window.setTimeout(finishSwap, CROSSFADE_MS / 2);
    }

    thumbs[index]?.scrollIntoView({
      block: "nearest",
      behavior: reduceMotionQuery.matches ? "auto" : "smooth",
    });
  };

  // --- Initial state: first entry shown, nothing autoplaying ---

  activeIndex = 0;
  setActiveThumb(0);
  setRovingTabIndex(0);
  applyMeta(entries[0]);
  applyVideo(entries[0], false);
  updateFade();
})();
