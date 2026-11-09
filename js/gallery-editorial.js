(() => {
  const root = document.documentElement;
  const body = document.body;
  const I18N = window.i18n;
  const t = (key, vars, fallback) => (I18N ? I18N.t(key, vars, fallback) : fallback || "");

  // --- Header: theme toggle (same behavior as every other page) ---
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    const updateToggleState = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      const label = isDark ? t("theme.toLight", null, "Switch to light mode") : t("theme.toDark", null, "Switch to dark mode");
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("data-tooltip", label);
    };

    updateToggleState();
    I18N?.onChange(updateToggleState);

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
  const menuClose = document.querySelector(".mobile-nav-close");
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

    menuClose?.addEventListener("click", closeMenu);

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  // --- Category resolution ---
  // Every Project Gallery page (this wall interface included) resolves its
  // own category the same way: from its filename, with ?category= as an
  // explicit override. This is what lets any pages/<id>.html file use this
  // exact script and render its own content — no per-page wiring.
  const categories = window.GALLERY_CATEGORIES || [];
  if (!categories.length) return;

  const params = new URLSearchParams(window.location.search);
  const filenameId = window.location.pathname
    .split("/")
    .pop()
    .replace(/\.html$/, "");
  const requestedId = params.get("category") || filenameId;
  let categoryIndex = categories.findIndex((c) => c.id === requestedId);
  if (categoryIndex < 0) categoryIndex = 0;
  const category = categories[categoryIndex];

  const projectMain = document.querySelector(".project");
  if (projectMain) projectMain.setAttribute("data-category", category.id);

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const total = categories.length;
  const categoryNumber = category.number || String(categoryIndex + 1).padStart(2, "0");

  // Category copy: js/gallery-categories-data.js is the English; the
  // data/locales keys category.<id>.* translate it.
  const copy = (cat, field) => {
    const key = `category.${cat.id}.${field}`;
    return I18N && I18N.lang !== "en" && I18N.has(key) ? I18N.t(key) : cat[field] || "";
  };

  const nextCategory = categories[(categoryIndex + 1) % total];
  const prevCategory = categories[(categoryIndex - 1 + total) % total];

  const setCategoryNavLink = (id, target, key, english) => {
    const el = document.getElementById(id);
    if (!el || !target) return;
    el.href = `${target.id}.html`;
    el.setAttribute("aria-label", t(key, { title: copy(target, "title") }, `${english} ${target.title}`));
  };

  // The header's facts row (brands, role, deliverables, year) and the
  // one-line objective, from js/gallery-categories-data.js. Built once,
  // right after the intro, using the shared .project-meta-row styles; a
  // field with no confirmed value is simply left out.
  const renderCategoryFacts = () => {
    // The intro is its own paragraph, or (editorial page) a span inside one.
    const intro = document.getElementById("category-intro")?.closest("p");
    if (!intro) return;
    const facts = [
      ["brands", "Brands", (category.brands || []).join(", ")],
      ["role", "Role", copy(category, "role")],
      ["deliverables", "Deliverables", copy(category, "deliverables")],
      ["year", "Year", category.year || ""],
    ].filter(([, , value]) => value);
    let row = document.getElementById("category-facts");
    if (!row && facts.length) {
      row = document.createElement("dl");
      row.id = "category-facts";
      row.className = "project-meta-row category-facts";
      intro.after(row);
    }
    if (row) {
      row.replaceChildren(
        ...facts.map(([key, english, value]) => {
          const item = document.createElement("div");
          const label = document.createElement("dt");
          label.className = "project-meta-label";
          label.textContent = t(`category.facts.${key}`, null, english);
          const text = document.createElement("dd");
          text.className = "project-meta-value";
          text.textContent = value;
          item.append(label, text);
          return item;
        })
      );
    }
    const objective = copy(category, "objective");
    let line = document.getElementById("category-objective");
    if (!line && objective) {
      line = document.createElement("p");
      line.id = "category-objective";
      line.className = "project-overview category-objective";
      (row || intro).after(line);
    }
    if (line) line.textContent = objective;
  };

  const renderCategoryText = () => {
    document.title = t("meta.categoryTitle", { title: copy(category, "title") }, `${category.title} | Gil Tejano Culas`);
    setText("category-eyebrow", t("category.eyebrow", { number: categoryNumber }, `Category ${categoryNumber} — Project Gallery`));
    setText("category-title", copy(category, "title"));
    setText("category-intro", copy(category, "intro"));
    renderCategoryFacts();
    setText("category-closing-label", copy(category, "title"));
    // In the editorial header the lede shares the intro's paragraph; with an
    // objective line below, it would only repeat the intro, so it's dropped.
    setText("category-closing-text", category.objective ? "" : copy(category, "lede"));
    setCategoryNavLink("brand-nav-prev", prevCategory, "category.prevLabel", "Previous category:");
    setCategoryNavLink("brand-nav-next", nextCategory, "category.nextLabel", "Next category:");
  };
  renderCategoryText();
  I18N?.onChange(renderCategoryText);

  const counterEl = document.getElementById("project-counter");
  if (counterEl) counterEl.textContent = `${categoryNumber} / ${String(total).padStart(2, "0")}`;

  // --- Gallery data: build-generated manifest + optional hand-authored meta ---
  // Both are keyed by category id so every category folder
  // (assets/images/gallery/<id>/) gets its own manifest/meta slice without
  // needing its own copy of this script.
  const PLACEHOLDER_TARGET_COUNT = 21;

  const flattenCategoryEntries = (cat) => {
    const source = (cat && cat.entries) || [];
    const out = [];
    source.forEach((entry) => {
      const ratio = entry.layout === "portrait" ? 0.72 : entry.layout === "pair" ? 1.3 : 1.55;
      const tileCount = entry.layout === "pair" ? 2 : 1;
      for (let i = 0; i < tileCount; i += 1) {
        const title = entry.type || cat.title;
        out.push({
          ratio,
          src: null,
          title,
          project: entry.brand || "",
          type: entry.type || "",
          alt: `${title} placeholder`,
          isPlaceholder: true,
        });
      }
    });
    return out;
  };

  const buildPlaceholderEntries = (cat, count) => {
    const base = flattenCategoryEntries(cat);
    if (!base.length) return [];
    return Array.from({ length: count }, (_, i) => base[i % base.length]);
  };

  const buildEntries = () => {
    const manifests = window.GALLERY_EDITORIAL_MANIFEST || {};
    const metas = window.GALLERY_EDITORIAL_META || {};
    const manifest = manifests[category.id] || [];
    const meta = metas[category.id] || {};

    if (!manifest.length) return buildPlaceholderEntries(category, PLACEHOLDER_TARGET_COUNT);

    return manifest.map((item) => {
      const info = meta[item.file] || {};
      const title = info.title || item.title || "Untitled";
      const folder = `../assets/images/gallery/${category.id}/`;
      return {
        ratio: item.ratio || item.width / item.height || 1.4,
        width: item.width,
        height: item.height,
        src: `${folder}${item.file}`,
        // Videos carry a same-named poster image (see the manifest script).
        kind: item.kind === "video" ? "video" : "image",
        poster: item.poster ? `${folder}${item.poster}` : "",
        title,
        project: info.project || "",
        type: info.type || "",
        year: info.year ? String(info.year) : "",
        // Never a filename: without hand-written alt text the showcase falls
        // back to the piece's type, and the lightbox to the category title.
        alt: info.alt || "",
        isPlaceholder: false,
      };
    });
  };

  const flatEntries = buildEntries().map((entry, i) => ({ ...entry, flatIndex: i }));

  // Shared with the lightbox below. (The image category pages show their
  // images in the split-screen showcase, js/print-collateral-showcase.js,
  // which reuses this lightbox; the old moving-wall gallery is retired.)
  let lightboxOpen = false;
  let openLightbox = () => {};

  // --- Fullscreen lightbox ---
  {
    const lightbox = document.getElementById("lightbox");
    const lightboxStage = document.getElementById("lightbox-stage");
    const lightboxClose = document.querySelector(".lightbox-close");
    const lightboxPrev = document.querySelector(".lightbox-zone-prev");
    const lightboxNext = document.querySelector(".lightbox-zone-next");
    const lightboxCurrent = document.getElementById("lightbox-current");
    const lightboxTotal = document.getElementById("lightbox-total");
    const lightboxCaption = document.getElementById("lightbox-caption");

    if (lightbox && lightboxStage && flatEntries.length) {
      if (lightboxTotal) lightboxTotal.textContent = String(flatEntries.length).padStart(2, "0");

      const slides = flatEntries.map((entry) => {
        const slide = document.createElement("div");
        if (entry.isPlaceholder) {
          // Placeholders have no real photo to shrink-wrap to, so they keep
          // the shared full-frame tone-gradient surface used elsewhere.
          slide.className = "gallery-image";
          slide.classList.add(category.tone);
        } else if (entry.src && entry.kind === "video") {
          // Videos: the full viewer is a player with native controls. The
          // file loads only when its slide is shown, and plays from there.
          slide.className = "editorial-lightbox-media";
          const video = document.createElement("video");
          video.dataset.src = entry.src;
          video.controls = true;
          video.playsInline = true;
          video.loop = true;
          video.preload = "none";
          if (entry.poster) video.poster = entry.poster;
          video.setAttribute("aria-label", entry.alt || entry.title || t("common.video", null, "Video"));
          video.style.setProperty("--ar", String(entry.ratio || 1));
          if (entry.width) {
            video.width = entry.width;
            video.style.setProperty("--natural-w", `${entry.width}px`);
          }
          if (entry.height) video.height = entry.height;
          slide.appendChild(video);
        } else if (entry.src) {
          // Real photos shrink-wrap to their own intrinsic size instead of
          // filling a fixed-size stage — this class carries no background,
          // so nothing shows behind the image but the lightbox's own scrim.
          slide.className = "editorial-lightbox-media";
          const img = document.createElement("img");
          // Full-size originals load only when shown (or about to be) —
          // setting every src up front downloaded the whole category.
          img.dataset.src = entry.src;
          img.alt = entry.alt || [entry.project, entry.type || copy(category, "title")].filter(Boolean).join(" — ");
          img.decoding = "async";
          if (entry.width) {
            img.width = entry.width;
            img.style.setProperty("--natural-w", `${entry.width}px`);
          }
          if (entry.height) img.height = entry.height;
          slide.appendChild(img);
        }
        lightboxStage.appendChild(slide);
        return slide;
      });

      let activeSlide = 0;
      let lastTrigger = null;

      // Neighbouring images preload; a video's file waits until it is shown.
      const loadSlide = (i, shown = false) => {
        const media = slides[(i + slides.length) % slides.length]?.querySelector("[data-src]");
        if (media && (shown || media.tagName !== "VIDEO")) {
          media.src = media.dataset.src;
          media.removeAttribute("data-src");
        }
      };

      const pauseSlide = (slide) => slide?.querySelector("video")?.pause();

      const showSlide = (i) => {
        loadSlide(i, true);
        [i + 1, i - 1].forEach((n) => loadSlide(n));
        pauseSlide(slides[activeSlide]);
        slides[activeSlide]?.classList.remove("is-active");
        activeSlide = i;
        slides[activeSlide]?.classList.add("is-active");
        const video = slides[activeSlide]?.querySelector("video");
        if (video) {
          const playing = video.play();
          if (playing && playing.catch) playing.catch(() => {});
        }
        if (lightboxCurrent) lightboxCurrent.textContent = String(activeSlide + 1).padStart(2, "0");
        // Campaign/project name when the meta has one, else the category.
        if (lightboxCaption) lightboxCaption.textContent = flatEntries[activeSlide]?.project || copy(category, "title") || "";
      };

      openLightbox = (i, trigger) => {
        lastTrigger = trigger || null;
        showSlide(i);
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        body.classList.add("lightbox-open");
        lightboxOpen = true;
        // A frame later, once the viewer is visible (and so focusable).
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (lightboxOpen) lightboxClose?.focus({ preventScroll: true });
        }));
        growFromSource(i, trigger);
      };

      // The image grows from its thumbnail's place (transform + opacity,
      // ~420ms) when that's practical: the thumbnail is on screen and the
      // full image decodes within a moment. Otherwise the plain fade above.
      const growFromSource = (i, trigger) => {
        if (!trigger || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const img = slides[i]?.querySelector("img");
        const thumb = trigger.querySelector?.("img") || trigger;
        if (!img || !img.animate) return;
        const from = thumb.getBoundingClientRect();
        if (!from.width || from.bottom < 0 || from.top > window.innerHeight) return;
        const opening = activeSlide;
        const settle = img.complete && img.naturalWidth ? Promise.resolve() : img.decode ? img.decode() : Promise.reject();
        const late = new Promise((_, reject) => window.setTimeout(reject, 200));
        Promise.race([settle, late])
          .then(() => {
            if (!lightboxOpen || activeSlide !== opening) return;
            const to = img.getBoundingClientRect();
            if (!to.width) return;
            const dx = from.left + from.width / 2 - (to.left + to.width / 2);
            const dy = from.top + from.height / 2 - (to.top + to.height / 2);
            const scale = Math.max(0.05, Math.min(1, from.width / to.width));
            img.animate(
              [
                { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`, opacity: 0.4 },
                { transform: "none", opacity: 1 },
              ],
              { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
            );
          })
          .catch(() => {});
      };

      const closeLightbox = () => {
        pauseSlide(slides[activeSlide]);
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        body.classList.remove("lightbox-open");
        lightboxOpen = false;
        lastTrigger?.focus({ preventScroll: true });
      };

      // Lets a page-specific gallery (e.g. js/print-collateral-showcase.js)
      // reuse this lightbox and the same entry order instead of its own.
      window.ProjectGalleryLightbox = {
        entries: flatEntries,
        open: (i, trigger) => openLightbox(i, trigger),
      };

      const goNext = () => showSlide((activeSlide + 1) % slides.length);
      const goPrev = () => showSlide((activeSlide - 1 + slides.length) % slides.length);

      lightboxClose?.addEventListener("click", closeLightbox);
      // While pinch-zoomed, a tap is part of panning, not a page turn.
      const zoomedIn = () => Boolean(window.visualViewport && window.visualViewport.scale > 1.01);
      lightboxPrev?.addEventListener("click", () => zoomedIn() || goPrev());
      lightboxNext?.addEventListener("click", () => zoomedIn() || goNext());

      lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) closeLightbox();
      });

      document.addEventListener("keydown", (event) => {
        if (!lightbox.classList.contains("is-open")) return;
        // Keep keyboard focus inside the open viewer.
        if (event.key === "Tab") {
          const stops = Array.from(lightbox.querySelectorAll('button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])')).filter(
            (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden"
          );
          if (!stops.length) return;
          const index = stops.indexOf(document.activeElement);
          const next = index === -1 ? 0 : (index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
          event.preventDefault();
          stops[next].focus({ preventScroll: true });
          return;
        }
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowRight") goNext();
        if (event.key === "ArrowLeft") goPrev();
      });

      // Swipe pages; a pinch (two fingers at any point) or a zoomed-in view
      // never does, so typography can be inspected and panned freely.
      let touchStartX = 0;
      let touchStartY = 0;
      let multiTouch = false;
      lightbox.addEventListener(
        "touchstart",
        (event) => {
          if (event.touches.length > 1) {
            multiTouch = true;
            return;
          }
          multiTouch = false;
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
        },
        { passive: true }
      );

      lightbox.addEventListener(
        "touchmove",
        (event) => {
          if (event.touches.length > 1) multiTouch = true;
        },
        { passive: true }
      );

      lightbox.addEventListener(
        "touchend",
        (event) => {
          if (event.touches.length || multiTouch || zoomedIn()) return;
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
