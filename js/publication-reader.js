/*
 * Editorial & Layout Design — curated publication archive for
 * pages/editorial-layout.html only. Every other Project Gallery category
 * keeps using its own interface (the shared moving-wall gallery, or the
 * reel player) untouched. This is a module script (see the <script
 * type="module"> tag in that page) so it can `import` PDF.js directly from
 * the locally vendored build (pdf.js 6.x ships ES-module-only, no UMD).
 *
 * gallery-editorial.js is still loaded on this page too, for the header/
 * theme-toggle/mobile-nav/category-text/prev-next-nav logic it shares with
 * every category page — it no-ops safely here since this page no longer has
 * an #editorial-wall or #lightbox element for it to find.
 *
 * Two independent pieces live here:
 *  1. A shelf of lightweight CSS-3D book mockups, one per publication,
 *     built straight from the manifest/meta data (buildShelf).
 *  2. An immersive full-viewport reader that opens on click and pages
 *     through the real PDF as book spreads (openImmersive / paintSlot),
 *     reusing the same PDF.js render pipeline for every page.
 */
const PDFJS_MODULE_URL = new URL("../assets/vendor/pdfjs/pdf.mjs", import.meta.url);
const PDFJS_WORKER_URL = new URL("../assets/vendor/pdfjs/pdf.worker.mjs", import.meta.url);
const DOCUMENTS_URL = new URL("../assets/documents/editorial-layout/", import.meta.url);
const RECOMMENDED_PDF_BYTES = 25 * 1024 * 1024;

(async () => {
  const interfaceEl = document.getElementById("pub-interface");
  if (!interfaceEl) return;

  const PLACEHOLDER_COUNT = 6;
  const GUTTER_PX = 18;
  const TURN_MS = 620;
  const FLIP_DEG = 13;
  const IDLE_MS = 2600;
  const MAX_RENDER_CACHE = 48;

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery = window.matchMedia("(max-width: 760px)");

  const els = {
    shelf: document.getElementById("pub-shelf"),
    archiveCount: document.getElementById("pub-archive-count"),
    immersive: document.getElementById("pub-immersive"),
    immersiveBackdrop: document.getElementById("pub-immersive-backdrop"),
    reader: document.getElementById("pub-reader"),
    closeBtn: document.getElementById("pub-immersive-close"),
    bar: document.getElementById("pub-controls"),
    footer: document.querySelector(".pub-immersive-footer"),
    stage: document.getElementById("pub-stage"),
    pages: document.getElementById("pub-pages"),
    edgePrev: document.getElementById("pub-edge-prev"),
    edgeNext: document.getElementById("pub-edge-next"),
    loading: document.getElementById("pub-loading"),
    empty: document.getElementById("pub-empty"),
    prevBtn: document.getElementById("pub-prev"),
    nextBtn: document.getElementById("pub-next"),
    pageCurrent: document.getElementById("pub-page-current"),
    pageTotal: document.getElementById("pub-page-total"),
    fullscreenBtn: document.getElementById("pub-fullscreen"),
    thumbToggle: document.getElementById("pub-thumbnails-toggle"),
    thumbTrack: document.getElementById("pub-thumbnails-track"),
    infoIndex: document.getElementById("pub-info-index"),
    infoTitle: document.getElementById("pub-info-title"),
    infoSubline: document.getElementById("pub-info-subline"),
    infoRole: document.getElementById("pub-info-role"),
    infoDownload: document.getElementById("pub-info-download"),
    infoCaseStudy: document.getElementById("pub-info-case-study"),
    srStatus: document.getElementById("pub-sr-status"),
  };

  if (!els.shelf || !els.immersive || !els.stage || !els.pages) return;

  const showShelfMessage = (message) => {
    els.shelf.innerHTML = "";
    const p = document.createElement("p");
    p.className = "pub-archive-empty";
    p.textContent = message;
    els.shelf.appendChild(p);
    if (els.archiveCount) els.archiveCount.textContent = "";
  };

  const showLoadError = (kind, error, url) => {
    const messages = {
      "manifest-missing": "The publication manifest could not be loaded. Run npm run build to regenerate it.",
      "manifest-empty": "No publications are available. Add optimized PDFs and run npm run build to regenerate the manifest.",
      "pdfjs-module": "The PDF preview module could not be loaded. Check the local PDF.js vendor files and run npm run build.",
      "pdf-worker": "The PDF worker could not be loaded. Check the local PDF.js worker file and run npm run build.",
      "pdf-404": "This publication could not be loaded. Check that the PDF exists in the publication folder and run npm run build.",
      "pdf-too-large": "This PDF is larger than the recommended web preview limit. Use View Full PDF while the preview asset is optimized.",
      "pdf-parse": "This publication could not be parsed. Check the PDF file and run npm run build to regenerate its manifest.",
      "cover-missing": "This publication cover could not be loaded. Run npm run build to regenerate its cover.",
      "page-render": "This page could not be rendered. Try another page or use View Full PDF.",
    };
    console.error(`[publication-reader] ${kind}`, { url, error });
    els.loading?.classList.remove("is-active");
    if (els.pages) els.pages.innerHTML = "";
    els.empty?.classList.add("is-active");
    els.empty?.setAttribute("aria-hidden", "false");
    const text = els.empty?.querySelector("p");
    const message = messages[kind] || "This publication could not be loaded.";
    if (text) text.textContent = message;
    if (els.srStatus) els.srStatus.textContent = message;
  };

  const encodeAssetPath = (assetPath) => String(assetPath).split("/").map(encodeURIComponent).join("/");
  const documentUrl = (assetPath) => new URL(encodeAssetPath(assetPath), DOCUMENTS_URL).href;

  const verifyUrl = async (url, label) => {
    let response;
    try {
      response = await fetch(url, { method: "HEAD", cache: "no-store" });
    } catch (error) {
      error.url = url;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(`${label} returned ${response.status}`);
      error.status = response.status;
      error.url = url;
      throw error;
    }
    return response;
  };

  const categories = window.GALLERY_CATEGORIES || [];
  const category = categories.find((c) => c.id === "editorial-layout") || {};
  const manifestMissing = !Array.isArray(window.PUBLICATION_MANIFEST);
  const manifest = manifestMissing ? [] : window.PUBLICATION_MANIFEST;
  const meta = window.PUBLICATION_META || {};

  if (manifestMissing) {
    showShelfMessage("The publication manifest could not be loaded. Run npm run build to regenerate it.");
    return;
  }

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
        pdfUrl: documentUrl(item.file),
        cover: documentUrl(item.cover),
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
  const realCount = publications.filter((p) => !p.isPlaceholder).length;

  if (!total) {
    showShelfMessage("Add a PDF to assets/documents/editorial-layout/ to open it here.");
    return;
  }

  // --- Shelf: build the 3D book mockups ---

  const orientationLabel = (o) => {
    if (o === "landscape") return "Landscape";
    if (o === "square") return "Square";
    if (o === "mixed") return "Mixed";
    return "Portrait";
  };

  const bookCards = [];

  const buildShelf = () => {
    if (els.archiveCount) {
      els.archiveCount.textContent = realCount
        ? `${String(realCount).padStart(2, "0")} Publication${realCount === 1 ? "" : "s"}`
        : "";
    }

    const frag = document.createDocumentFragment();
    publications.forEach((pub, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pub-book";
      btn.dataset.index = String(pub.index);
      btn.dataset.size = i % 3 === 0 ? "feature" : "standard";
      btn.style.setProperty("--book-delay", `${Math.min(i, 6) * 90}ms`);

      const coverAr = pub.pages && pub.pages[0] ? pub.pages[0].width / pub.pages[0].height : 0.72;
      btn.style.setProperty("--book-ar", String(coverAr));
      const spineWidth = pub.pageCount ? Math.max(6, Math.min(20, Math.round(pub.pageCount / 5))) : 8;
      btn.style.setProperty("--book-spine", `${spineWidth}px`);

      if (pub.isPlaceholder) {
        btn.disabled = true;
        btn.setAttribute("aria-label", `${pub.title} — placeholder, add a PDF to preview it`);
      } else {
        const label = ["Open", pub.brand, pub.title, pub.type].filter(Boolean).join(" ");
        btn.setAttribute("aria-label", label);
      }

      const figure = document.createElement("span");
      figure.className = "pub-book-figure";

      const shadow = document.createElement("span");
      shadow.className = "pub-book-shadow";
      shadow.setAttribute("aria-hidden", "true");
      figure.appendChild(shadow);

      const block = document.createElement("span");
      block.className = "pub-book-block";

      const spine = document.createElement("span");
      spine.className = "pub-book-spine";
      spine.setAttribute("aria-hidden", "true");
      block.appendChild(spine);

      const pagesEdge = document.createElement("span");
      pagesEdge.className = "pub-book-pages-edge";
      pagesEdge.setAttribute("aria-hidden", "true");
      block.appendChild(pagesEdge);

      const cover = document.createElement("span");
      cover.className = "pub-book-cover";
      if (pub.isPlaceholder) {
        cover.classList.add(category.tone || "showcase-tone-editorial");
      } else {
        const img = document.createElement("img");
        img.src = pub.cover;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.onerror = () => {
          console.error("[publication-reader] cover-missing", { url: pub.cover });
          cover.textContent = "Cover unavailable";
          cover.classList.add("is-missing");
        };
        cover.appendChild(img);
        const sheen = document.createElement("span");
        sheen.className = "pub-book-sheen";
        sheen.setAttribute("aria-hidden", "true");
        cover.appendChild(sheen);
      }
      block.appendChild(cover);
      figure.appendChild(block);

      if (!pub.isPlaceholder) {
        const openTag = document.createElement("span");
        openTag.className = "pub-book-open";
        openTag.setAttribute("aria-hidden", "true");
        openTag.textContent = "Open ↗";
        figure.appendChild(openTag);
      }

      btn.appendChild(figure);

      const caption = document.createElement("span");
      caption.className = "pub-book-caption";

      const number = document.createElement("span");
      number.className = "pub-book-number";
      number.textContent = `${category.number || ""}${category.number ? "." : ""}${String(i + 1).padStart(2, "0")}`.replace(/^\./, "");
      caption.appendChild(number);

      if (pub.brand || pub.type) {
        const brandEl = document.createElement("span");
        brandEl.className = "pub-book-brand";
        brandEl.textContent = pub.brand || pub.type;
        caption.appendChild(brandEl);
      }

      const titleEl = document.createElement("span");
      titleEl.className = "pub-book-title";
      titleEl.textContent = pub.title || "";
      caption.appendChild(titleEl);

      if (!pub.isPlaceholder) {
        const metaEl = document.createElement("span");
        metaEl.className = "pub-book-meta";
        metaEl.textContent = [pub.year, pub.pageCount ? `${pub.pageCount}pp` : "", orientationLabel(pub.orientation)]
          .filter(Boolean)
          .join(" · ");
        caption.appendChild(metaEl);
      }

      btn.appendChild(caption);

      if (!pub.isPlaceholder) {
        btn.addEventListener("click", () => openImmersive(pub.index));
      }

      els.shelf.appendChild(btn);
      bookCards.push(btn);
    });
    els.shelf.appendChild(frag);
  };

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );

  const armReveal = () => {
    if (reduceMotionQuery.matches) {
      bookCards.forEach((btn) => btn.classList.add("is-revealed"));
      return;
    }
    bookCards.forEach((btn) => revealObserver.observe(btn));
  };

  // --- PDF.js setup (only needed once a book is actually opened) ---

  let pdfjsLib = null;
  let pdfjsReady = null;

  const ensurePdfjs = async () => {
    if (pdfjsLib) return pdfjsLib;
    if (!pdfjsReady) {
      pdfjsReady = (async () => {
        const lib = await import(PDFJS_MODULE_URL.href);
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL.href;
        await verifyUrl(PDFJS_WORKER_URL.href, "PDF worker");
        pdfjsLib = lib;
        return lib;
      })();
    }
    return pdfjsReady;
  };

  // --- Per-session state ---

  const positionByFile = new Map(); // file -> slotIndex
  const docCache = new Map(); // file -> pdfjs document proxy (kept for the session)
  const renderCache = new Map(); // "file:page:bucket" -> canvas
  const slotsCache = new Map(); // "file:mode" -> slots array

  let activeIndex = -1;
  let activePub = null;
  let activeDoc = null;
  let currentSlots = [];
  let currentSlotIndex = 0;
  let navLocked = false;
  let idleTimer = null;
  let thumbObserver = null;
  let modalOpen = false;
  let lastFocused = null;

  // --- Orientation-aware pagination: build the slot list for a publication ---
  //
  // Cover (page 1) is always alone. From page 2 on, pages are walked in
  // order: a landscape page (already a complete spread) is shown alone and
  // never paired — pairing resumes fresh on the page after it — matching
  // real book-dummy logic rather than a blind even/odd rule. Mobile always
  // shows single pages, cover-first.
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
        slots.push({ type: "single", nums: [i] });
        i += 1;
      }
    }
    slotsCache.set(cacheKey, slots);
    return slots;
  };

  const effectiveMode = () => (mobileQuery.matches ? "single" : "auto");

  const findSlotIndexForPage = (slots, pageNum) => {
    const idx = slots.findIndex((s) => s.nums.includes(pageNum));
    return idx >= 0 ? idx : 0;
  };

  // --- PDF loading ---

  const verifyPublicationAssets = async (pub) => {
    if (pub.fileSizeBytes > RECOMMENDED_PDF_BYTES) {
      const error = new Error(`${pub.file} is ${(pub.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`);
      error.kind = "pdf-too-large";
      error.url = pub.pdfUrl;
      throw error;
    }
    try {
      await verifyUrl(pub.pdfUrl, "PDF");
    } catch (error) {
      error.kind = error.status === 404 ? "pdf-404" : "pdf-parse";
      throw error;
    }
    try {
      await verifyUrl(pub.cover, "Cover image");
    } catch (error) {
      error.kind = "cover-missing";
      throw error;
    }
  };

  const getDoc = async (pub) => {
    if (docCache.has(pub.file)) return docCache.get(pub.file);
    const lib = await ensurePdfjs();
    const doc = await lib.getDocument({ url: pub.pdfUrl }).promise;
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

  // --- Render the current slot into the stage, with a lightweight CSS 3D
  // page-flip between turns: the outgoing spread rotates away around its
  // spine edge, the new spread swaps in mid-rotation and continues the
  // same rotational sweep back to flat, with a soft light sweep overlay. ---

  let renderToken = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const paintSlot = async (slot, animate, direction = "jump") => {
    const myToken = ++renderToken;
    const box = getStageBox();
    const padding = mobileQuery.matches ? 32 : 96;
    const availW = Math.max(80, box.w - padding);
    const availH = Math.max(80, box.h - padding);
    const sizes = computeSizes(activePub, slot, availW, availH);

    els.loading.classList.add("is-active");

    const finishPaint = async () => {
      els.pages.innerHTML = "";
      for (let i = 0; i < sizes.length; i += 1) {
        const s = sizes[i];
        const wrap = document.createElement("div");
        wrap.className = `pub-page ${sizes.length === 2 ? (i === 0 ? "pub-page-left" : "pub-page-right") : ""}`;
        wrap.style.width = `${s.w}px`;
        wrap.style.height = `${s.h}px`;
        const sheet = document.createElement("div");
        sheet.className = "pub-page-sheet";
        sheet.style.width = "100%";
        sheet.style.height = "100%";
        wrap.appendChild(sheet);
        els.pages.appendChild(wrap);

        // eslint-disable-next-line no-await-in-loop
        const canvas = await renderPage(activeDoc, activePub.file, s.num, s.w, s.h);
        if (myToken !== renderToken) return; // superseded by a newer navigation
        sheet.appendChild(canvas);
      }
      els.loading.classList.remove("is-active");
    };

    if (animate && !reduceMotionQuery.matches) {
      const originSide = direction === "prev" ? "right" : "left";
      const sign = direction === "prev" ? 1 : -1;
      els.pages.style.transformOrigin = `${originSide} center`;
      els.pages.classList.add("is-flipping");
      els.pages.style.transition = `opacity ${TURN_MS / 2}ms var(--ease), transform ${TURN_MS / 2}ms var(--ease)`;
      els.pages.style.opacity = "0.15";
      els.pages.style.transform = `rotateY(${sign * FLIP_DEG}deg) scale(0.94)`;
      await wait(TURN_MS / 2);
      if (myToken !== renderToken) return;
      await finishPaint();
      // Jump to the mirrored pre-rotation instantly (no transition), then
      // animate back to flat — this keeps the rotation moving the same
      // direction all the way through the turn instead of springing back.
      els.pages.style.transition = "none";
      els.pages.style.transform = `rotateY(${-sign * (FLIP_DEG - 4)}deg) scale(0.96)`;
      // eslint-disable-next-line no-unused-expressions
      els.pages.offsetHeight; // force reflow so the jump above isn't itself animated
      requestAnimationFrame(() => {
        els.pages.style.transition = `opacity ${TURN_MS / 2}ms var(--ease), transform ${TURN_MS / 2}ms var(--ease)`;
        els.pages.style.opacity = "1";
        els.pages.style.transform = "rotateY(0deg) scale(1)";
        window.setTimeout(() => els.pages.classList.remove("is-flipping"), TURN_MS / 2);
      });
    } else {
      els.pages.style.transition = reduceMotionQuery.matches ? "opacity 200ms linear" : "none";
      els.pages.style.transform = "none";
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

  const goToSlotIndex = (index, animate = true, direction = "jump") => {
    if (!currentSlots.length) return;
    const clamped = Math.max(0, Math.min(currentSlots.length - 1, index));
    if (navLocked) {
      pendingTarget = { index: clamped, animate, direction };
      return;
    }
    currentSlotIndex = clamped;
    const slot = currentSlots[clamped];
    navLocked = true;
    const lockMs = animate && !reduceMotionQuery.matches ? TURN_MS / 2 : 40;
    paintSlot(slot, animate, direction)
      .catch((error) => {
        showLoadError("page-render", error, error?.url);
      })
      .finally(() => {
        window.setTimeout(() => {
          navLocked = false;
          if (pendingTarget) {
            const next = pendingTarget;
            pendingTarget = null;
            goToSlotIndex(next.index, next.animate, next.direction);
          }
        }, lockMs);
      });
    positionByFile.set(activePub.file, clamped);
    announce(slot);
    setActiveThumb(slot);
  };

  const goNext = () => {
    const from = navLocked && pendingTarget ? pendingTarget.index : currentSlotIndex;
    goToSlotIndex(from + 1, true, "next");
  };
  const goPrev = () => {
    const from = navLocked && pendingTarget ? pendingTarget.index : currentSlotIndex;
    goToSlotIndex(from - 1, true, "prev");
  };

  const announce = (slot) => {
    if (!els.srStatus || !activePub) return;
    const label = slot.nums.length === 2 ? `pages ${slot.nums[0]}–${slot.nums[1]}` : `page ${slot.nums[0]}`;
    els.srStatus.textContent = `${activePub.title}, ${label} of ${activePub.pageCount}`;
  };

  // --- Controls UI sync ---

  const updateControlsUI = (slot) => {
    const first = slot.nums[0];
    if (els.pageCurrent) {
      els.pageCurrent.textContent = slot.nums.length === 2 ? `${slot.nums[0]}–${slot.nums[1]}` : String(first);
    }
    if (els.pageTotal) els.pageTotal.textContent = String(activePub.pageCount);
    els.prevBtn.disabled = currentSlotIndex === 0;
    els.nextBtn.disabled = currentSlotIndex === currentSlots.length - 1;
    els.edgePrev.disabled = els.prevBtn.disabled;
    els.edgeNext.disabled = els.nextBtn.disabled;
  };

  // --- Page-turn input: edges, buttons, keyboard, wheel, swipe ---

  els.prevBtn?.addEventListener("click", goPrev);
  els.nextBtn?.addEventListener("click", goNext);
  els.edgePrev?.addEventListener("click", goPrev);
  els.edgeNext?.addEventListener("click", goNext);

  document.addEventListener("keydown", (event) => {
    if (!modalOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeImmersive();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
  });

  let wheelLock = false;
  els.stage.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY) && Math.abs(event.deltaY) < 12) return;
      event.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      if (event.deltaX > 0 || event.deltaY > 0) goNext();
      else goPrev();
      window.setTimeout(() => {
        wheelLock = false;
      }, 500);
    },
    { passive: false }
  );

  let touchStartX = 0;
  let touchStartY = 0;
  els.stage.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );
  els.stage.addEventListener(
    "touchend",
    (event) => {
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) goNext();
      else goPrev();
    },
    { passive: true }
  );

  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (!activePub || !modalOpen) return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => paintSlot(currentSlots[currentSlotIndex], false));
  });

  mobileQuery.addEventListener("change", () => {
    if (!activePub) return;
    const anchorPage = currentSlots[currentSlotIndex]?.nums[0] || 1;
    currentSlots = buildSlots(activePub, effectiveMode());
    goToSlotIndex(findSlotIndexForPage(currentSlots, anchorPage), false);
  });

  // --- Fullscreen ---

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else els.reader.requestFullscreen?.();
  };
  els.fullscreenBtn?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    els.fullscreenBtn?.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen");
    window.setTimeout(() => {
      if (activePub && modalOpen) paintSlot(currentSlots[currentSlotIndex], false);
    }, 120);
  });

  // --- Idle-fade chrome ---

  const wakeControls = () => {
    els.bar?.classList.remove("is-idle");
    els.footer?.classList.remove("is-idle");
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      els.bar?.classList.add("is-idle");
      els.footer?.classList.add("is-idle");
    }, IDLE_MS);
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

      btn.addEventListener("click", () => goToSlotIndex(findSlotIndexForPage(currentSlots, n), true, "jump"));
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
          renderPage(activeDoc, pub.file, n, 40, 40 / pageAspect(pub, n))
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
        const track = els.thumbTrack;
        const target = btn.offsetLeft - (track.clientWidth - btn.clientWidth) / 2;
        track.scrollTo({ left: Math.max(0, target), behavior: reduceMotionQuery.matches ? "auto" : "smooth" });
      }
    });
  };

  // --- Header info ---

  const updateInfo = (pub, index) => {
    if (els.infoIndex) {
      els.infoIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${String(realCount).padStart(2, "0")}`;
    }
    els.infoTitle.textContent = pub.title;
    els.infoSubline.textContent = [pub.brand, pub.type, pub.year].filter(Boolean).join(" · ") || "—";

    if (els.infoRole) {
      if (pub.role) {
        els.infoRole.textContent = pub.role;
        els.infoRole.hidden = false;
      } else {
        els.infoRole.hidden = true;
      }
    }

    if (els.infoDownload) {
      if (pub.downloadAllowed !== false) {
        els.infoDownload.href = pub.pdfUrl;
        els.infoDownload.hidden = false;
      } else {
        els.infoDownload.removeAttribute("href");
        els.infoDownload.hidden = true;
      }
    }

    if (els.infoCaseStudy) {
      if (pub.caseStudyLink) {
        els.infoCaseStudy.href = pub.caseStudyLink;
        els.infoCaseStudy.hidden = false;
      } else {
        els.infoCaseStudy.hidden = true;
      }
    }
  };

  // --- Open / close the immersive reader ---

  async function openPublication(index) {
    const pub = publications[index];
    if (!pub || pub.isPlaceholder) return;

    activeIndex = index;
    activePub = pub;
    updateInfo(pub, index);
    els.empty.classList.remove("is-active");
    els.empty.setAttribute("aria-hidden", "true");
    renderToken += 1;
    navLocked = false;
    pendingTarget = null;

    els.loading.classList.add("is-active");
    try {
      await verifyPublicationAssets(pub);
    } catch (error) {
      showLoadError(error.kind || "pdf-404", error, error.url);
      return;
    }

    let doc;
    try {
      doc = await getDoc(pub);
    } catch (error) {
      showLoadError("pdf-parse", error, pub.pdfUrl);
      return;
    }
    if (!modalOpen || activePub !== pub) return; // closed or switched while loading
    activeDoc = doc;

    const savedSlotIndex = positionByFile.get(pub.file) ?? 0;

    currentSlots = buildSlots(pub, effectiveMode());
    els.prevBtn.disabled = true;
    els.nextBtn.disabled = currentSlots.length <= 1;
    els.edgePrev.disabled = els.prevBtn.disabled;
    els.edgeNext.disabled = els.nextBtn.disabled;
    buildThumbnails(pub);

    goToSlotIndex(savedSlotIndex, false);
  }

  async function openImmersive(index) {
    const pub = publications[index];
    if (!pub || pub.isPlaceholder) return;

    lastFocused = document.activeElement;
    modalOpen = true;
    els.immersive.classList.add("is-open");
    els.immersive.setAttribute("aria-hidden", "false");
    document.body.classList.add("pub-immersive-open");
    els.pages.innerHTML = "";
    wakeControls();
    els.reader.focus({ preventScroll: true });

    await openPublication(index);
  }

  function closeImmersive() {
    if (!modalOpen) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    modalOpen = false;
    renderToken += 1;
    els.immersive.classList.remove("is-open");
    els.immersive.setAttribute("aria-hidden", "true");
    document.body.classList.remove("pub-immersive-open");
    activePub = null;
    activeDoc = null;
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  els.closeBtn?.addEventListener("click", closeImmersive);
  els.immersiveBackdrop?.addEventListener("click", closeImmersive);

  // --- Init ---

  buildShelf();
  armReveal();
})();
