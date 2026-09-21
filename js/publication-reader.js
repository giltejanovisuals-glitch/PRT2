/*
 * Editorial & Layout Design — dedicated interactive publication reader for
 * pages/editorial-layout.html only. Every other Project Gallery category
 * keeps using its own interface (the shared moving-wall gallery, or the
 * reel player) untouched. This is a module script (see the <script
 * type="module"> tag in that page) so it can `import` PDF.js directly from
 * a CDN — pdf.js 6.x ships ES-module-only builds, no UMD/global variant.
 *
 * gallery-editorial.js is still loaded on this page too, for the header/
 * theme-toggle/mobile-nav/category-text/prev-next-nav logic it shares with
 * every category page — it no-ops safely here since this page no longer has
 * an #editorial-wall or #lightbox element for it to find.
 */
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.3.289/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.3.289/pdf.worker.min.mjs";

(() => {
  const interfaceEl = document.getElementById("pub-interface");
  if (!interfaceEl) return;

  const DOC_BASE = "../assets/documents/editorial-layout/";
  const PLACEHOLDER_COUNT = 8;
  const GUTTER_PX = 18;
  const TURN_MS = 550;
  const IDLE_MS = 2600;
  const MAX_RENDER_CACHE = 48;
  const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3];

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery = window.matchMedia("(max-width: 760px)");

  const els = {
    libraryTrack: document.getElementById("pub-library-track"),
    reader: document.getElementById("pub-reader"),
    stage: document.getElementById("pub-stage"),
    pages: document.getElementById("pub-pages"),
    edgePrev: document.getElementById("pub-edge-prev"),
    edgeNext: document.getElementById("pub-edge-next"),
    loading: document.getElementById("pub-loading"),
    empty: document.getElementById("pub-empty"),
    controls: document.getElementById("pub-controls"),
    prevBtn: document.getElementById("pub-prev"),
    nextBtn: document.getElementById("pub-next"),
    pageInput: document.getElementById("pub-page-input"),
    pageTotal: document.getElementById("pub-page-total"),
    viewModeGroup: document.getElementById("pub-viewmode"),
    zoomOut: document.getElementById("pub-zoom-out"),
    zoomIn: document.getElementById("pub-zoom-in"),
    zoomPct: document.getElementById("pub-zoom-pct"),
    fitBtn: document.getElementById("pub-fit"),
    fullscreenBtn: document.getElementById("pub-fullscreen"),
    downloadBtn: document.getElementById("pub-download"),
    thumbToggle: document.getElementById("pub-thumbnails-toggle"),
    thumbTrack: document.getElementById("pub-thumbnails-track"),
    thumbPanel: document.getElementById("pub-thumbnails"),
    infoTitle: document.getElementById("pub-info-title"),
    infoSubline: document.getElementById("pub-info-subline"),
    infoRole: document.getElementById("pub-info-role"),
    infoFormat: document.getElementById("pub-info-format"),
    infoFullscreen: document.getElementById("pub-info-fullscreen"),
    infoDownload: document.getElementById("pub-info-download"),
    infoCaseStudy: document.getElementById("pub-info-case-study"),
    srStatus: document.getElementById("pub-sr-status"),
  };

  if (!els.libraryTrack || !els.stage || !els.pages) return;

  const categories = window.GALLERY_CATEGORIES || [];
  const category = categories.find((c) => c.id === "editorial-layout") || {};
  const manifest = window.PUBLICATION_MANIFEST || [];
  const meta = window.PUBLICATION_META || {};

  // --- Build the publication list (real manifest, or category placeholders) ---

  const buildPlaceholders = () => {
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
        pageCount: 0,
        orientation: "portrait",
      };
    });
  };

  const buildReal = () =>
    manifest.map((item) => {
      const info = meta[item.file] || {};
      return {
        isPlaceholder: false,
        file: item.file,
        pdfUrl: `${DOC_BASE}${item.file}`,
        cover: `${DOC_BASE}${item.cover}`,
        pages: item.pages,
        pageCount: item.pageCount,
        orientation: item.dominantOrientation,
        fileSizeBytes: item.fileSizeBytes,
        title: info.title || item.title || "Untitled",
        brand: info.brand || "",
        type: info.type || "",
        year: info.year || "",
        role: info.role || "",
        description: info.description || "",
        caseStudyLink: info.caseStudyLink || "",
        downloadAllowed: info.downloadAllowed !== false,
      };
    });

  const publications = (manifest.length ? buildReal() : buildPlaceholders()).map((p, i) => ({ ...p, index: i }));
  const total = publications.length;
  if (!total) return;

  // --- Per-session state ---

  const positionByFile = new Map(); // file -> { slotIndex, viewMode, zoom }
  const docCache = new Map(); // file -> pdfjs document proxy (kept for the session)
  const renderCache = new Map(); // "file:page:bucket" -> canvas
  const slotsCache = new Map(); // "file:mode" -> slots array

  let activeIndex = -1;
  let activePub = null;
  let activeDoc = null;
  let currentSlots = [];
  let currentSlotIndex = 0;
  let viewMode = "auto";
  let zoomIndex = 0; // index into ZOOM_STEPS; 0 = fit
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panMoved = false;
  let navLocked = false;
  let idleTimer = null;
  let thumbObserver = null;

  const isFitZoom = () => zoomIndex === 0;

  // --- Orientation-aware pagination: build the slot list for a publication ---
  //
  // Cover (page 1) is always alone. From page 2 on, pages are walked in
  // order: a landscape page (already a complete spread) is shown alone and
  // never paired — pairing resumes fresh on the page after it — matching
  // real book-dummy logic rather than a blind even/odd rule. In 'single'
  // mode every page is its own slot, still cover-first.
  const buildSlots = (pub, mode) => {
    const cacheKey = `${pub.file || pub.title}:${mode}`;
    if (slotsCache.has(cacheKey)) return slotsCache.get(cacheKey);

    const pages = pub.pages || Array.from({ length: pub.pageCount }, () => ({ orientation: "portrait" }));
    const slots = [];

    if (mode === "single") {
      for (let n = 1; n <= pages.length; n += 1) slots.push({ type: "single", nums: [n] });
      slotsCache.set(cacheKey, slots);
      return slots;
    }

    if (pages.length) slots.push({ type: "single", nums: [1] });
    let i = 2;
    while (i <= pages.length) {
      const info = pages[i - 1];
      if (info.orientation === "landscape") {
        slots.push({ type: "single-wide", nums: [i] });
        i += 1;
        continue;
      }
      const hasNext = i + 1 <= pages.length;
      const nextInfo = hasNext ? pages[i] : null;
      if (hasNext && nextInfo.orientation !== "landscape") {
        slots.push({ type: "spread", nums: [i, i + 1] });
        i += 2;
      } else {
        slots.push({ type: hasNext ? "single" : "single", nums: [i] });
        i += 1;
      }
    }
    slotsCache.set(cacheKey, slots);
    return slots;
  };

  const effectiveMode = () => (mobileQuery.matches ? "single" : viewMode);

  const findSlotIndexForPage = (slots, pageNum) => {
    const idx = slots.findIndex((s) => s.nums.includes(pageNum));
    return idx >= 0 ? idx : 0;
  };

  // --- Library ---

  const libraryCards = [];

  const formatBytes = (bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const orientationLabel = (o) => {
    if (o === "landscape") return "Landscape";
    if (o === "square") return "Square";
    if (o === "mixed") return "Mixed";
    return "Portrait";
  };

  const buildLibrary = () => {
    const frag = document.createDocumentFragment();
    publications.forEach((pub) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pub-card";
      btn.dataset.index = String(pub.index);
      btn.setAttribute("aria-current", "false");
      const coverAr = pub.pages && pub.pages[0] ? pub.pages[0].width / pub.pages[0].height : 0.75;
      btn.style.setProperty("--pub-cover-ar", String(coverAr));

      if (pub.isPlaceholder) {
        btn.disabled = true;
        btn.setAttribute("aria-label", `${pub.title} — placeholder, add a PDF to preview it`);
      } else {
        const label = ["Open", pub.brand, pub.title, pub.type].filter(Boolean).join(" ");
        btn.setAttribute("aria-label", label);
      }

      const cover = document.createElement("span");
      cover.className = "pub-card-cover";
      if (pub.isPlaceholder) {
        cover.classList.add(category.tone || "showcase-tone-editorial");
      } else {
        const img = document.createElement("img");
        img.src = pub.cover;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        cover.appendChild(img);
      }
      btn.appendChild(cover);

      const badge = document.createElement("span");
      badge.className = "pub-card-badge";
      badge.textContent = "Open";
      btn.appendChild(badge);

      const caption = document.createElement("span");
      caption.className = "pub-card-caption";
      const capBrand = document.createElement("span");
      capBrand.className = "pub-card-caption-brand";
      capBrand.textContent = pub.brand || pub.type || "";
      const capTitle = document.createElement("span");
      capTitle.className = "pub-card-caption-title";
      capTitle.textContent = pub.title || "";
      caption.append(capBrand, capTitle);
      if (!pub.isPlaceholder) {
        const capMeta = document.createElement("span");
        capMeta.className = "pub-card-caption-meta";
        capMeta.textContent = [pub.year, pub.pageCount ? `${pub.pageCount}pp` : "", orientationLabel(pub.orientation)]
          .filter(Boolean)
          .join(" · ");
        caption.appendChild(capMeta);
      }
      btn.appendChild(caption);

      if (!pub.isPlaceholder) {
        btn.addEventListener("click", () => openPublication(pub.index));
      }

      els.libraryTrack.appendChild(btn);
      libraryCards.push(btn);
    });
  };

  const setActiveCard = (index) => {
    libraryCards.forEach((btn, i) => btn.setAttribute("aria-current", i === index ? "true" : "false"));
  };

  // --- PDF loading ---

  const getDoc = async (pub) => {
    if (docCache.has(pub.file)) return docCache.get(pub.file);
    const doc = await pdfjsLib.getDocument({ url: pub.pdfUrl }).promise;
    docCache.set(pub.file, doc);
    return doc;
  };

  const cacheBucket = (scale) => Math.round(scale * 20); // coarse buckets so tiny scale drift reuses renders

  const evictRenderCacheIfNeeded = () => {
    while (renderCache.size > MAX_RENDER_CACHE) {
      const oldestKey = renderCache.keys().next().value;
      renderCache.delete(oldestKey);
    }
  };

  const renderPage = async (doc, file, pageNum, cssWidth, cssHeight) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetPxWidth = Math.max(1, Math.round(cssWidth * dpr));
    const page = await doc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetPxWidth / baseViewport.width;
    const key = `${file}:${pageNum}:${cacheBucket(scale)}`;
    if (renderCache.has(key)) {
      const cached = renderCache.get(key);
      renderCache.delete(key);
      renderCache.set(key, cached); // refresh LRU order
      return cached;
    }
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    renderCache.set(key, canvas);
    evictRenderCacheIfNeeded();
    return canvas;
  };

  // --- Layout math: fit 1 or 2 pages (their own ratios) into the stage ---

  const getStageBox = () => {
    const rect = els.stage.getBoundingClientRect();
    const stylePad = 2 * 16; // rough breathing room accounted for via CSS padding already on .pub-pages
    return { w: Math.max(100, rect.width), h: Math.max(100, rect.height) };
  };

  const pageAspect = (pub, num) => {
    const info = pub.pages && pub.pages[num - 1];
    return info ? info.width / info.height : 0.75;
  };

  const computeSizes = (pub, slot, availW, availH) => {
    if (slot.nums.length === 1) {
      const ar = pageAspect(pub, slot.nums[0]);
      let h = availH;
      let w = h * ar;
      if (w > availW) {
        w = availW;
        h = w / ar;
      }
      return [{ num: slot.nums[0], w, h }];
    }
    const ar1 = pageAspect(pub, slot.nums[0]);
    const ar2 = pageAspect(pub, slot.nums[1]);
    let h = Math.min(availH, (availW - GUTTER_PX) / (ar1 + ar2));
    if (h < 0) h = availH;
    const w1 = h * ar1;
    const w2 = h * ar2;
    return [
      { num: slot.nums[0], w: w1, h },
      { num: slot.nums[1], w: w2, h },
    ];
  };

  // --- Render the current slot into the stage ---

  let renderToken = 0;

  const paintSlot = async (slot, animate) => {
    const myToken = ++renderToken;
    const box = getStageBox();
    const padding = mobileQuery.matches ? 32 : 96;
    const availW = Math.max(80, box.w - padding) / (isFitZoom() ? 1 : 1);
    const availH = Math.max(80, box.h - padding);
    const sizes = computeSizes(activePub, slot, availW, availH);
    const zoom = ZOOM_STEPS[zoomIndex];

    els.loading.classList.add("is-active");

    const finishPaint = async () => {
      els.pages.innerHTML = "";
      for (let i = 0; i < sizes.length; i += 1) {
        const s = sizes[i];
        const wrap = document.createElement("div");
        wrap.className = `pub-page ${sizes.length === 2 ? (i === 0 ? "pub-page-left" : "pub-page-right") : ""}`;
        wrap.style.width = `${s.w * zoom}px`;
        wrap.style.height = `${s.h * zoom}px`;
        const sheet = document.createElement("div");
        sheet.className = "pub-page-sheet";
        sheet.style.width = "100%";
        sheet.style.height = "100%";
        wrap.appendChild(sheet);
        els.pages.appendChild(wrap);

        // eslint-disable-next-line no-await-in-loop
        const canvas = await renderPage(activeDoc, activePub.file, s.num, s.w * zoom, s.h * zoom);
        if (myToken !== renderToken) return; // superseded by a newer navigation
        sheet.appendChild(canvas);
      }
      els.loading.classList.remove("is-active");
      applyPan();
    };

    if (animate && !reduceMotionQuery.matches) {
      els.pages.style.transition = `opacity ${TURN_MS / 2}ms var(--ease, ease), transform ${TURN_MS / 2}ms var(--ease, ease)`;
      els.pages.style.opacity = "0";
      els.pages.style.transform = "scale(0.97)";
      await new Promise((r) => setTimeout(r, TURN_MS / 2));
      if (myToken !== renderToken) return;
      await finishPaint();
      requestAnimationFrame(() => {
        els.pages.style.opacity = "1";
        els.pages.style.transform = "scale(1)";
      });
    } else {
      els.pages.style.transition = reduceMotionQuery.matches ? "opacity 200ms linear" : "none";
      if (reduceMotionQuery.matches) els.pages.style.opacity = "0";
      await finishPaint();
      requestAnimationFrame(() => {
        els.pages.style.opacity = "1";
      });
    }

    updateControlsUI(slot);
    prefetchNeighbors(slot);
  };

  const prefetchNeighbors = (slot) => {
    const idx = currentSlots.indexOf(slot);
    [idx - 1, idx + 1].forEach((i) => {
      const neighbor = currentSlots[i];
      if (!neighbor) return;
      requestIdleCallbackShim(() => {
        const box = getStageBox();
        const padding = mobileQuery.matches ? 32 : 96;
        const sizes = computeSizes(activePub, neighbor, box.w - padding, box.h - padding);
        sizes.forEach((s) => {
          renderPage(activeDoc, activePub.file, s.num, s.w, s.h).catch(() => {});
        });
      });
    });
  };

  const requestIdleCallbackShim = (fn) => {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 1200 });
    else setTimeout(fn, 250);
  };

  // --- Navigation ---
  //
  // A rapid second input while a turn is still animating doesn't get
  // dropped — it's coalesced into "pendingTarget" (last one wins) and
  // fired the instant the lock clears, so quick repeated clicks/arrow
  // presses always land on the last-requested page without ever
  // corrupting the page order or stacking overlapping animations.
  let pendingTarget = null;

  const goToSlotIndex = (index, animate = true) => {
    if (!currentSlots.length) return;
    const clamped = Math.max(0, Math.min(currentSlots.length - 1, index));
    if (navLocked) {
      pendingTarget = { index: clamped, animate };
      return;
    }
    currentSlotIndex = clamped;
    const slot = currentSlots[clamped];
    navLocked = true;
    // paintSlot's own promise already spans the fade-OUT half of the turn
    // (it awaits that before swapping content); this covers just the
    // fade-IN half that plays afterward, so the lock matches the real
    // total animation time instead of stacking a second full TURN_MS on
    // top of it.
    const lockMs = animate && !reduceMotionQuery.matches ? TURN_MS / 2 : 40;
    paintSlot(slot, animate).finally(() => {
      window.setTimeout(() => {
        navLocked = false;
        if (pendingTarget) {
          const next = pendingTarget;
          pendingTarget = null;
          goToSlotIndex(next.index, next.animate);
        }
      }, lockMs);
    });
    positionByFile.set(activePub.file, { slotIndex: clamped, viewMode, zoomIndex });
    announce(slot);
    setActiveThumb(slot);
  };

  const goNext = () => { resetZoomIfNeeded(); goToSlotIndex((navLocked && pendingTarget ? pendingTarget.index : currentSlotIndex) + 1); };
  const goPrev = () => { resetZoomIfNeeded(); goToSlotIndex((navLocked && pendingTarget ? pendingTarget.index : currentSlotIndex) - 1); };

  const resetZoomIfNeeded = () => {
    // page-turns always return to fit, matching "return to fitted view when changing publications"
    // and keeping navigation predictable while zoomed.
  };

  const announce = (slot) => {
    if (!els.srStatus || !activePub) return;
    const label = slot.nums.length === 2 ? `pages ${slot.nums[0]}–${slot.nums[1]}` : `page ${slot.nums[0]}`;
    els.srStatus.textContent = `${activePub.title}, ${label} of ${activePub.pageCount}`;
  };

  // --- Controls UI sync ---

  const updateControlsUI = (slot) => {
    const first = slot.nums[0];
    els.pageInput.value = slot.nums.length === 2 ? `${slot.nums[0]}–${slot.nums[1]}` : String(first);
    els.pageTotal.textContent = String(activePub.pageCount);
    els.prevBtn.disabled = currentSlotIndex === 0;
    els.nextBtn.disabled = currentSlotIndex === currentSlots.length - 1;
    els.edgePrev.disabled = els.prevBtn.disabled;
    els.edgeNext.disabled = els.nextBtn.disabled;
    els.zoomPct.textContent = `${Math.round(ZOOM_STEPS[zoomIndex] * 100)}%`;
    els.zoomOut.disabled = zoomIndex === 0;
    els.zoomIn.disabled = zoomIndex === ZOOM_STEPS.length - 1;

    Array.from(els.viewModeGroup.querySelectorAll("[data-mode]")).forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.mode === viewMode));
    });
  };

  // --- Zoom / pan ---

  const applyPan = () => {
    els.pages.style.setProperty("--pan-x", `${panX}px`);
    els.pages.style.setProperty("--pan-y", `${panY}px`);
    els.pages.style.transform = `translate(${panX}px, ${panY}px)`;
    els.pages.classList.toggle("is-zoomed", !isFitZoom());
  };

  const setZoomIndex = (i) => {
    zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, i));
    if (isFitZoom()) { panX = 0; panY = 0; }
    paintSlot(currentSlots[currentSlotIndex], false);
  };

  els.zoomIn?.addEventListener("click", () => setZoomIndex(zoomIndex + 1));
  els.zoomOut?.addEventListener("click", () => setZoomIndex(zoomIndex - 1));
  els.fitBtn?.addEventListener("click", () => setZoomIndex(0));

  els.pages.addEventListener("dblclick", (event) => {
    event.preventDefault();
    setZoomIndex(isFitZoom() ? 2 : 0);
  });

  let lastTap = 0;
  els.pages.addEventListener("touchend", () => {
    const now = Date.now();
    if (now - lastTap < 320) setZoomIndex(isFitZoom() ? 2 : 0);
    lastTap = now;
  });

  // Pan via pointer drag while zoomed in.
  let dragStartX = 0;
  let dragStartY = 0;
  els.pages.addEventListener("pointerdown", (event) => {
    if (isFitZoom()) return;
    isPanning = true;
    panMoved = false;
    dragStartX = event.clientX - panX;
    dragStartY = event.clientY - panY;
    els.pages.setPointerCapture(event.pointerId);
    els.pages.classList.add("is-panning");
  });
  els.pages.addEventListener("pointermove", (event) => {
    if (!isPanning) return;
    panX = event.clientX - dragStartX;
    panY = event.clientY - dragStartY;
    panMoved = true;
    applyPan();
  });
  const endPan = () => {
    isPanning = false;
    els.pages.classList.remove("is-panning");
  };
  els.pages.addEventListener("pointerup", endPan);
  els.pages.addEventListener("pointercancel", endPan);

  // --- Page-turn input: edges, buttons, keyboard, wheel, swipe ---

  els.prevBtn?.addEventListener("click", goPrev);
  els.nextBtn?.addEventListener("click", goNext);
  els.edgePrev?.addEventListener("click", () => { if (!isFitZoom() && panMoved) return; goPrev(); });
  els.edgeNext?.addEventListener("click", () => { if (!isFitZoom() && panMoved) return; goNext(); });

  els.reader.addEventListener("keydown", (event) => {
    if (event.target === els.pageInput) return;
    if (event.key === "ArrowRight") { event.preventDefault(); goNext(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); goPrev(); }
  });

  let wheelLock = false;
  els.stage.addEventListener(
    "wheel",
    (event) => {
      if (!isFitZoom()) return; // let native scroll/zoom behavior alone while zoomed
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY) && Math.abs(event.deltaY) < 12) return;
      event.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      if (event.deltaX > 0 || event.deltaY > 0) goNext(); else goPrev();
      window.setTimeout(() => { wheelLock = false; }, 500);
    },
    { passive: false }
  );

  let touchStartX = 0;
  let touchStartY = 0;
  els.stage.addEventListener("touchstart", (event) => {
    if (!isFitZoom()) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  els.stage.addEventListener("touchend", (event) => {
    if (!isFitZoom()) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext(); else goPrev();
  }, { passive: true });

  els.pageInput?.addEventListener("change", () => {
    const raw = els.pageInput.value.split(/[–-]/)[0].trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(1, Math.min(activePub.pageCount, n));
    goToSlotIndex(findSlotIndexForPage(currentSlots, clamped));
  });

  // --- View mode ---

  els.viewModeGroup?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-mode]");
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (mode === viewMode) return;
    const anchorPage = currentSlots[currentSlotIndex]?.nums[0] || 1;
    viewMode = mode;
    currentSlots = buildSlots(activePub, effectiveMode());
    goToSlotIndex(findSlotIndexForPage(currentSlots, anchorPage), false);
  });

  mobileQuery.addEventListener("change", () => {
    if (!activePub) return;
    const anchorPage = currentSlots[currentSlotIndex]?.nums[0] || 1;
    currentSlots = buildSlots(activePub, effectiveMode());
    goToSlotIndex(findSlotIndexForPage(currentSlots, anchorPage), false);
  });

  window.addEventListener("resize", () => {
    if (!activePub) return;
    paintSlot(currentSlots[currentSlotIndex], false);
  });

  // --- Fullscreen ---

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else els.reader.requestFullscreen?.();
  };
  els.fullscreenBtn?.addEventListener("click", toggleFullscreen);
  els.infoFullscreen?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    interfaceEl.classList.toggle("is-fullscreen", Boolean(document.fullscreenElement));
    els.fullscreenBtn?.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen");
    window.setTimeout(() => paintSlot(currentSlots[currentSlotIndex], false), 120);
  });

  // --- Idle-fade controls ---

  const wakeControls = () => {
    els.controls.classList.remove("is-idle");
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => els.controls.classList.add("is-idle"), IDLE_MS);
  };
  ["pointermove", "pointerdown", "touchstart", "focusin"].forEach((evt) => {
    els.reader.addEventListener(evt, wakeControls, { passive: true });
  });

  // --- Thumbnails ---

  const thumbButtons = [];

  const buildThumbnails = (pub) => {
    els.thumbTrack.innerHTML = "";
    thumbButtons.length = 0;
    if (thumbObserver) thumbObserver.disconnect();

    for (let n = 1; n <= pub.pageCount; n += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pub-thumb";
      btn.dataset.page = String(n);
      btn.setAttribute("aria-current", "false");
      btn.setAttribute("aria-label", `Go to page ${n}`);
      const ar = pageAspect(pub, n);
      btn.style.setProperty("--pub-thumb-ar", String(ar));

      const sheet = document.createElement("span");
      sheet.className = "pub-thumb-sheet";
      btn.appendChild(sheet);

      const num = document.createElement("span");
      num.className = "pub-thumb-num";
      num.textContent = String(n);
      btn.appendChild(num);

      btn.addEventListener("click", () => goToSlotIndex(findSlotIndexForPage(currentSlots, n)));
      els.thumbTrack.appendChild(btn);
      thumbButtons.push(btn);
    }

    thumbObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const btn = entry.target;
          const sheet = btn.querySelector(".pub-thumb-sheet");
          if (sheet.querySelector("canvas")) return;
          const n = Number(btn.dataset.page);
          renderPage(activeDoc, pub.file, n, 96, 96 / pageAspect(pub, n))
            .then((canvas) => {
              const clone = document.createElement("canvas");
              clone.width = canvas.width;
              clone.height = canvas.height;
              clone.getContext("2d").drawImage(canvas, 0, 0);
              sheet.appendChild(clone);
            })
            .catch(() => {});
        });
      },
      { root: els.thumbTrack, rootMargin: "200px" }
    );
    thumbButtons.forEach((btn) => thumbObserver.observe(btn));
  };

  const setActiveThumb = (slot) => {
    thumbButtons.forEach((btn) => {
      const n = Number(btn.dataset.page);
      const active = slot.nums.includes(n);
      btn.setAttribute("aria-current", String(active));
      if (active) {
        // Scroll only the filmstrip's own horizontal track — scrollIntoView
        // can escape to the page's vertical scroll on some layouts, since
        // the track has no vertical overflow of its own to absorb it.
        const track = els.thumbTrack;
        const target = btn.offsetLeft - (track.clientWidth - btn.clientWidth) / 2;
        track.scrollTo({ left: Math.max(0, target), behavior: reduceMotionQuery.matches ? "auto" : "smooth" });
      }
    });
  };

  els.thumbToggle?.addEventListener("click", () => {
    const collapsed = els.thumbPanel.classList.toggle("is-collapsed");
    els.thumbToggle.setAttribute("aria-expanded", String(!collapsed));
  });

  // --- Project info panel ---

  const updateInfo = (pub) => {
    els.infoTitle.textContent = pub.title;
    els.infoSubline.textContent = [pub.brand, pub.year].filter(Boolean).join(" · ") || "—";
    els.infoRole.textContent = pub.role || "Editorial direction, grid development, typography, image sequencing, and production preparation.";
    const sizeLabel = formatBytes(pub.fileSizeBytes);
    els.infoFormat.textContent = [pub.type || "Publication", `${pub.pageCount} pages`, sizeLabel ? `${sizeLabel} PDF` : ""]
      .filter(Boolean)
      .join(" · ");

    const downloadHref = pub.downloadAllowed !== false ? pub.pdfUrl : "";
    [els.downloadBtn, els.infoDownload].forEach((a) => {
      if (!a) return;
      if (downloadHref) {
        a.href = downloadHref;
        a.removeAttribute("aria-disabled");
        a.hidden = false;
      } else {
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
        a.hidden = a === els.infoDownload;
      }
    });

    if (pub.caseStudyLink) {
      els.infoCaseStudy.href = pub.caseStudyLink;
      els.infoCaseStudy.hidden = false;
    } else {
      els.infoCaseStudy.hidden = true;
    }
  };

  // --- Open a publication ---

  const showLoadError = () => {
    els.loading.classList.remove("is-active");
    els.empty.classList.add("is-active");
    els.empty.querySelector("p").textContent = "This PDF couldn't be loaded for preview — use Download PDF below instead.";
  };

  async function openPublication(index) {
    const pub = publications[index];
    if (!pub || pub.isPlaceholder) return;

    activeIndex = index;
    activePub = pub;
    setActiveCard(index);
    updateInfo(pub);
    els.empty.classList.remove("is-active");
    renderToken += 1; // invalidate any in-flight paint from the previous publication
    // A switch to a different publication always takes effect immediately —
    // it must never be blocked or queued behind a still-settling lock left
    // over from the previous publication's last page-turn.
    navLocked = false;
    pendingTarget = null;

    // Fresh session per file keeps memory bounded across very different-
    // sized publications, while same-file revisits reuse the cached doc.
    els.loading.classList.add("is-active");
    let doc;
    try {
      doc = await getDoc(pub);
    } catch (error) {
      showLoadError();
      return;
    }
    activeDoc = doc;

    const saved = positionByFile.get(pub.file);
    viewMode = saved?.viewMode || "auto";
    zoomIndex = saved?.zoomIndex || 0;
    panX = 0;
    panY = 0;

    currentSlots = buildSlots(pub, effectiveMode());
    // Reset control states immediately rather than leaving the previous
    // publication's stale prev/next disabled state on screen for the brief
    // window before the new publication's first paint finishes and calls
    // updateControlsUI for real — otherwise an early click on a button that
    // only *looks* disabled from the last publication's last page would be
    // silently swallowed (disabled buttons never fire click at all).
    els.prevBtn.disabled = true;
    els.nextBtn.disabled = currentSlots.length <= 1;
    els.edgePrev.disabled = els.prevBtn.disabled;
    els.edgeNext.disabled = els.nextBtn.disabled;
    buildThumbnails(pub);

    const startSlotIndex = saved?.slotIndex ?? 0;
    goToSlotIndex(startSlotIndex, false);
  }

  // --- Init ---

  buildLibrary();
  openPublication(publications.find((p) => !p.isPlaceholder)?.index ?? -1);
  if (activeIndex === -1) {
    els.empty.classList.add("is-active");
    els.empty.querySelector("p").textContent = "Add a PDF to assets/documents/editorial-layout/ to open it here.";
    els.controls.setAttribute("aria-hidden", "true");
    Array.from(els.controls.querySelectorAll("button, input, a")).forEach((el) => { el.disabled = true; if (el.tagName === "A") el.setAttribute("aria-disabled", "true"); });
  }
  wakeControls();
})();
