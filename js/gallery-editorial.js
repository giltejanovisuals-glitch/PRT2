(() => {
  const root = document.documentElement;
  const body = document.body;

  // --- Header: theme toggle (same behavior as every other page) ---
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    const updateToggleState = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      const label = isDark ? "Switch to light mode" : "Switch to dark mode";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("data-tooltip", label);
    };

    updateToggleState();

    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      updateToggleState();
    });

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
        let hasStoredPreference = false;
        try {
          hasStoredPreference = Boolean(localStorage.getItem("theme"));
        } catch (e) {}
        if (hasStoredPreference) return;
        root.setAttribute("data-theme", event.matches ? "dark" : "light");
        updateToggleState();
      });
    }
  }

  // --- Header: mobile nav (same behavior as every other sub-page) ---
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (menuToggle && nav) {
    const closeMenu = () => {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      body.classList.remove("menu-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      body.classList.toggle("menu-open", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  // --- Category chrome: eyebrow, counter, prev/next nav ---
  // Sourced from the same window.GALLERY_CATEGORIES used by the shared
  // grid-template pages, so this page can never drift out of sync with the
  // rest of the Project Gallery's numbering or titles.
  const categories = window.GALLERY_CATEGORIES || [];
  const categoryIndex = categories.findIndex((c) => c.id === "editorial-layout");
  const category = categoryIndex >= 0 ? categories[categoryIndex] : null;

  if (category) {
    const total = categories.length;
    const categoryNumber = category.number || String(categoryIndex + 1).padStart(2, "0");

    const eyebrowEl = document.getElementById("category-eyebrow");
    if (eyebrowEl) eyebrowEl.textContent = `Category ${categoryNumber} — Project Gallery`;

    const counterEl = document.getElementById("project-counter");
    if (counterEl) counterEl.textContent = `${categoryNumber} / ${String(total).padStart(2, "0")}`;

    const nextCategory = categories[(categoryIndex + 1) % total];
    const prevCategory = categories[(categoryIndex - 1 + total) % total];

    const setCategoryNavLink = (id, target, label) => {
      const el = document.getElementById(id);
      if (!el || !target) return;
      el.href = `${target.id}.html`;
      el.setAttribute("aria-label", `${label} ${target.title}`);
    };

    setCategoryNavLink("brand-nav-prev", prevCategory, "Previous category:");
    setCategoryNavLink("brand-nav-next", nextCategory, "Next category:");
  }

  // --- Gallery data: build-generated manifest + optional hand-authored meta ---
  const PLACEHOLDER_KINDS = [
    { ratio: 1.5, type: "Landscape Spread" },
    { ratio: 0.8, type: "Portrait Page" },
    { ratio: 1, type: "Square Panel" },
    { ratio: 2.3, type: "Catalogue Spread" },
    { ratio: 0.62, type: "Vertical Page" },
  ];
  const PLACEHOLDER_TITLES = [
    "Product Catalogue",
    "Lookbook",
    "Brand Book",
    "Product Guide",
    "Magazine Layout",
    "Editorial Report",
    "Brochure System",
    "Portfolio Page",
  ];

  const buildPlaceholderEntries = (count) =>
    Array.from({ length: count }, (_, i) => {
      const kind = PLACEHOLDER_KINDS[i % PLACEHOLDER_KINDS.length];
      const title = PLACEHOLDER_TITLES[i % PLACEHOLDER_TITLES.length];
      return {
        ratio: kind.ratio,
        src: null,
        title,
        project: "Client Name",
        type: kind.type,
        alt: `${title} placeholder`,
        isPlaceholder: true,
      };
    });

  const buildEntries = () => {
    const manifest = window.GALLERY_EDITORIAL_MANIFEST || [];
    const meta = window.GALLERY_EDITORIAL_META || {};

    if (!manifest.length) return buildPlaceholderEntries(21);

    return manifest.map((item) => {
      const info = meta[item.file] || {};
      const title = info.title || item.title || "Untitled";
      return {
        ratio: item.ratio || item.width / item.height || 1.4,
        width: item.width,
        height: item.height,
        src: `../assets/images/gallery/editorial-layout/${item.file}`,
        title,
        project: info.project || "",
        type: info.type || "",
        alt: info.alt || title,
        isPlaceholder: false,
      };
    });
  };

  const flatEntries = buildEntries().map((entry, i) => ({ ...entry, flatIndex: i }));

  const galleryWall = document.getElementById("editorial-wall");
  const rowEls = [0, 1, 2].map((i) => document.getElementById(`editorial-row-${i}`));
  const trackEls = [0, 1, 2].map((i) => document.getElementById(`editorial-row-track-${i}`));

  if (galleryWall && flatEntries.length && rowEls.every(Boolean) && trackEls.every(Boolean)) {
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;

    const ROW_DURATIONS_MS = [42000, 38000, 46000];
    let rowStates = [];
    let lightboxOpen = false;

    const distribute = (entries, rowCount) => {
      const groups = Array.from({ length: rowCount }, () => []);
      entries.forEach((entry, i) => groups[i % rowCount].push(entry));
      return groups;
    };

    const createTile = (entry, isClone) => {
      const tile = document.createElement("div");
      tile.className = "editorial-tile";
      tile.style.setProperty("--ar", String(entry.ratio || 1.4));
      tile.dataset.flatIndex = String(entry.flatIndex);

      if (entry.isPlaceholder) {
        tile.classList.add("showcase-tone-editorial");
      } else if (entry.src) {
        const img = document.createElement("img");
        img.className = "editorial-tile-img";
        img.src = entry.src;
        img.alt = entry.alt || "";
        if (entry.width) img.width = entry.width;
        if (entry.height) img.height = entry.height;
        img.loading = "lazy";
        img.decoding = "async";
        tile.appendChild(img);
      }

      const overlay = document.createElement("div");
      overlay.className = "editorial-tile-overlay";
      tile.appendChild(overlay);

      const caption = document.createElement("div");
      caption.className = "editorial-tile-caption";
      caption.setAttribute("aria-hidden", "true");

      const titleEl = document.createElement("span");
      titleEl.className = "editorial-tile-title";
      titleEl.textContent = entry.title || "";
      caption.appendChild(titleEl);

      const typeText = [entry.type, entry.project].filter(Boolean).join(" · ");
      if (typeText) {
        const typeEl = document.createElement("span");
        typeEl.className = "editorial-tile-type";
        typeEl.textContent = typeText;
        caption.appendChild(typeEl);
      }
      tile.appendChild(caption);

      if (isClone) {
        tile.setAttribute("aria-hidden", "true");
        tile.tabIndex = -1;
      } else {
        tile.setAttribute("role", "button");
        tile.tabIndex = 0;
        tile.setAttribute("aria-label", `Open “${entry.title || "image"}” fullscreen`);
      }

      return tile;
    };

    const renderRow = (rowEl, trackEl, entries, rowIndex) => {
      trackEl.innerHTML = "";
      const fragment = document.createDocumentFragment();
      entries.forEach((entry) => fragment.appendChild(createTile(entry, false)));
      entries.forEach((entry) => fragment.appendChild(createTile(entry, true)));
      trackEl.appendChild(fragment);

      return {
        el: rowEl,
        track: trackEl,
        direction: rowIndex % 2 === 0 ? 1 : -1,
        durationMs: ROW_DURATIONS_MS[rowIndex % ROW_DURATIONS_MS.length],
        halfWidth: 0,
        paused: { hover: false, focus: false, drag: false },
      };
    };

    const measureRows = () => {
      requestAnimationFrame(() => {
        rowStates.forEach((row) => {
          row.halfWidth = row.track.scrollWidth / 2;
          row.el.scrollLeft = row.direction > 0 ? 0 : row.halfWidth;
        });
      });
    };

    const buildRows = () => {
      const rowCount = mobileQuery.matches ? 2 : 3;
      const groups = distribute(flatEntries, rowCount);

      rowStates = [];
      rowEls.forEach((rowEl, i) => {
        if (i < rowCount) {
          rowEl.classList.remove("is-hidden-row");
          rowStates.push(renderRow(rowEl, trackEls[i], groups[i], i));
        } else {
          rowEl.classList.add("is-hidden-row");
          trackEls[i].innerHTML = "";
        }
      });

      measureRows();
    };

    // --- Per-row interaction: pause on hover/focus, drag/swipe to browse ---
    // Bound once to the stable .editorial-row containers (buildRows only
    // replaces their track contents, never the containers themselves), and
    // resolved against the current rowStates by index on every event so a
    // rebuild (e.g. crossing the mobile breakpoint) never reads stale state.
    rowEls.forEach((rowEl, rowIndex) => {
      const getState = () => rowStates[rowIndex];
      let isDown = false;
      let startX = 0;
      let startScroll = 0;
      let pointerId = null;

      rowEl.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "mouse") return;
        const state = getState();
        if (state) state.paused.hover = true;
      });

      rowEl.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "mouse") {
          const state = getState();
          if (state) state.paused.hover = false;
        }
        if (isDown) endDrag();
      });

      rowEl.addEventListener("focusin", () => {
        const state = getState();
        if (state) state.paused.focus = true;
      });

      rowEl.addEventListener("focusout", () => {
        const state = getState();
        if (state) state.paused.focus = false;
      });

      rowEl.addEventListener("pointerdown", (event) => {
        const state = getState();
        if (state) state.paused.drag = true;
        if (event.pointerType === "touch") return; // native touch scroll takes over
        isDown = true;
        startX = event.clientX;
        startScroll = rowEl.scrollLeft;
        rowEl.classList.add("is-dragging");
      });

      rowEl.addEventListener("pointermove", (event) => {
        if (!isDown) return;
        const delta = event.clientX - startX;
        if (Math.abs(delta) <= 4) return;
        if (pointerId === null) {
          pointerId = event.pointerId;
          rowEl.setPointerCapture(pointerId);
        }
        rowEl.scrollLeft = startScroll - delta;
      });

      const endDrag = () => {
        isDown = false;
        rowEl.classList.remove("is-dragging");
        const state = getState();
        if (state) state.paused.drag = false;
        if (pointerId !== null) {
          if (rowEl.hasPointerCapture?.(pointerId)) rowEl.releasePointerCapture(pointerId);
          pointerId = null;
        }
      };

      rowEl.addEventListener("pointerup", endDrag);
      rowEl.addEventListener("pointercancel", endDrag);
    });

    // --- Lightbox click/keyboard triggers, delegated on the stable tracks ---
    let openLightbox = () => {};

    trackEls.forEach((trackEl) => {
      trackEl.addEventListener("click", (event) => {
        const tile = event.target.closest(".editorial-tile[data-flat-index]");
        if (tile) openLightbox(Number(tile.dataset.flatIndex), tile);
      });
      trackEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const tile = event.target.closest(".editorial-tile[data-flat-index]");
        if (!tile) return;
        event.preventDefault();
        openLightbox(Number(tile.dataset.flatIndex), tile);
      });
    });

    // --- Seamless auto-scroll loop (delta-time based, single shared rAF) ---
    let rafId = null;
    let lastTimestamp = null;

    const tick = (timestamp) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaMs = Math.min(timestamp - lastTimestamp, 100);
      lastTimestamp = timestamp;

      rowStates.forEach((row) => {
        if (!row.halfWidth || lightboxOpen) return;
        if (row.paused.hover || row.paused.focus || row.paused.drag) return;
        const distance = (row.halfWidth / row.durationMs) * deltaMs;
        row.el.scrollLeft += row.direction * distance;
        if (row.direction > 0 && row.el.scrollLeft >= row.halfWidth) {
          row.el.scrollLeft -= row.halfWidth;
        } else if (row.direction < 0 && row.el.scrollLeft <= 0) {
          row.el.scrollLeft += row.halfWidth;
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafId !== null) return;
      lastTimestamp = null;
      rafId = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    };

    reducedMotionQuery.addEventListener("change", (event) => {
      reducedMotion = event.matches;
      if (reducedMotion) stopLoop();
      else startLoop();
    });

    // --- Responsive: rebuild on 2↔3 row breakpoint, remeasure on resize ---
    mobileQuery.addEventListener("change", buildRows);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        rowStates.forEach((row) => {
          const newHalf = row.track.scrollWidth / 2;
          if (!newHalf) return;
          const ratio = row.halfWidth ? row.el.scrollLeft / row.halfWidth : 0;
          row.halfWidth = newHalf;
          row.el.scrollLeft = ratio * newHalf;
        });
      }, 150);
    });

    buildRows();
    if (!reducedMotion) startLoop();

    // --- Fullscreen lightbox ---
    const lightbox = document.getElementById("lightbox");
    const lightboxStage = document.getElementById("lightbox-stage");
    const lightboxClose = document.querySelector(".lightbox-close");
    const lightboxPrev = document.querySelector(".lightbox-zone-prev");
    const lightboxNext = document.querySelector(".lightbox-zone-next");
    const lightboxCurrent = document.getElementById("lightbox-current");
    const lightboxTotal = document.getElementById("lightbox-total");
    const lightboxCaption = document.getElementById("lightbox-caption");

    if (lightbox && lightboxStage) {
      if (lightboxTotal) lightboxTotal.textContent = String(flatEntries.length).padStart(2, "0");

      const slides = flatEntries.map((entry) => {
        const slide = document.createElement("div");
        slide.className = "gallery-image";
        if (entry.isPlaceholder) {
          slide.classList.add("showcase-tone-editorial");
        } else if (entry.src) {
          const img = document.createElement("img");
          img.src = entry.src;
          img.alt = entry.alt || "";
          img.decoding = "async";
          slide.appendChild(img);
        }
        lightboxStage.appendChild(slide);
        return slide;
      });

      let activeSlide = 0;
      let lastTrigger = null;

      const renderCaption = (entry) => {
        if (!lightboxCaption) return;
        lightboxCaption.innerHTML = "";
        const titleEl = document.createElement("span");
        titleEl.className = "lightbox-caption-title";
        titleEl.textContent = entry.title || "";
        lightboxCaption.appendChild(titleEl);

        const typeText = [entry.type, entry.project].filter(Boolean).join(" · ");
        if (typeText) {
          const typeEl = document.createElement("span");
          typeEl.className = "lightbox-caption-type";
          typeEl.textContent = typeText;
          lightboxCaption.appendChild(typeEl);
        }
      };

      const showSlide = (i) => {
        slides[activeSlide]?.classList.remove("is-active");
        activeSlide = i;
        slides[activeSlide]?.classList.add("is-active");
        if (lightboxCurrent) lightboxCurrent.textContent = String(activeSlide + 1).padStart(2, "0");
        renderCaption(flatEntries[activeSlide]);
      };

      openLightbox = (i, trigger) => {
        lastTrigger = trigger || null;
        showSlide(i);
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        body.classList.add("lightbox-open");
        lightboxOpen = true;
        lightboxClose?.focus();
      };

      const closeLightbox = () => {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        body.classList.remove("lightbox-open");
        lightboxOpen = false;
        lastTrigger?.focus();
      };

      const goNext = () => showSlide((activeSlide + 1) % slides.length);
      const goPrev = () => showSlide((activeSlide - 1 + slides.length) % slides.length);

      lightboxClose?.addEventListener("click", closeLightbox);
      lightboxPrev?.addEventListener("click", goPrev);
      lightboxNext?.addEventListener("click", goNext);

      lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) closeLightbox();
      });

      document.addEventListener("keydown", (event) => {
        if (!lightbox.classList.contains("is-open")) return;
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowRight") goNext();
        if (event.key === "ArrowLeft") goPrev();
      });

      let touchStartX = 0;
      let touchStartY = 0;
      lightbox.addEventListener(
        "touchstart",
        (event) => {
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
        },
        { passive: true }
      );

      lightbox.addEventListener(
        "touchend",
        (event) => {
          const deltaX = event.changedTouches[0].clientX - touchStartX;
          const deltaY = event.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
          if (deltaX < 0) goNext();
          else goPrev();
        },
        { passive: true }
      );
    }
  }
})();
