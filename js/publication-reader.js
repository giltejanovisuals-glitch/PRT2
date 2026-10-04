/*
 * Editorial & Layout Design — publication library + book reader for
 * pages/editorial-layout.html only. Every other Project Gallery category
 * keeps using its own interface (the shared moving-wall gallery, or the
 * reel player) untouched. It's a plain deferred script, not a module, so
 * the library still renders when the page is opened straight from disk
 * (browsers block module scripts on file://). PDF.js is ES-module-only
 * (pdf.js 6.x, no UMD), so it's pulled in with a dynamic import() the
 * first time a book is opened.
 *
 * gallery-editorial.js is still loaded on this page too, for the header/
 * theme-toggle/mobile-nav/category-text/prev-next-nav logic it shares with
 * every category page — it no-ops safely here since this page has no
 * #editorial-wall or #lightbox element for it to find.
 *
 * Two pieces live here:
 *  1. The library: one CSS-3D book per PDF, side by side, whose cover is
 *     the PDF's own first page (rendered at build time — see
 *     scripts/generate-publication-manifest.js).
 *  2. The reader: selecting a book flies its cover into the centre of a
 *     full-viewport viewer, which then pages through the real PDF. The
 *     cover shows alone (like a closed book), then pages pair into
 *     two-page spreads (2–3, 4–5, …). Each turn is a two-faced "leaf"
 *     rotating around the spine, with the next page revealed underneath,
 *     shading on both faces, and paper stacks on each side that thin or
 *     thicken as you read. Phones show one page at a time.
 *
 * Every page is drawn by PDF.js at its own aspect ratio and fitted inside
 * its slot with object-fit: contain, so nothing is ever cropped or
 * stretched; slots take the publication's most common page size.
 */
(async () => {
  // Resolve asset paths against this script's own URL (captured before the
  // first await, while document.currentScript is still this script).
  const SCRIPT_URL = (document.currentScript && document.currentScript.src) || window.location.href;
  const PDFJS_MODULE_URL = new URL("../assets/vendor/pdfjs/pdf.mjs", SCRIPT_URL);
  const PDFJS_WORKER_URL = new URL("../assets/vendor/pdfjs/pdf.worker.mjs", SCRIPT_URL);
  const DOCUMENTS_URL = new URL("../assets/documents/editorial-layout/", SCRIPT_URL);
  const RECOMMENDED_PDF_BYTES = 25 * 1024 * 1024;
  // Browsers refuse to fetch PDFs or load PDF.js from file:// pages.
  const OPENED_FROM_DISK = window.location.protocol === "file:";

  const interfaceEl = document.getElementById("pub-interface");
  if (!interfaceEl) return;

  const PLACEHOLDER_COUNT = 2;
  const TURN_MS = 1050;
  const QUICK_TURN_MS = 560;
  const FLY_MS = 760;
  const FLY_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  const ZOOM_STEPS = [1, 1.5, 2, 3];
  const IDLE_MS = 2600;
  const MAX_RENDER_CACHE = 60;
  const MAX_CANVAS_PX = 4096;
  const STACK_MAX_LAYERS = 7;

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const singlePageQuery = window.matchMedia("(max-width: 760px)");
  const thumbsDefaultQuery = window.matchMedia("(min-width: 981px)");
  const reducedMotion = () => reduceMotionQuery.matches;

  const els = {
    shelf: document.getElementById("pub-shelf"),
    archiveCount: document.getElementById("pub-archive-count"),
    immersive: document.getElementById("pub-immersive"),
    immersiveBackdrop: document.getElementById("pub-immersive-backdrop"),
    reader: document.getElementById("pub-reader"),
    backBtn: document.getElementById("pub-back"),
    closeBtn: document.getElementById("pub-immersive-close"),
    bar: document.getElementById("pub-controls"),
    footer: document.querySelector(".pub-immersive-footer"),
    stage: document.getElementById("pub-stage"),
    scroll: document.getElementById("pub-scroll"),
    canvas: document.getElementById("pub-canvas"),
    book: document.getElementById("pub-book"),
    edgePrev: document.getElementById("pub-edge-prev"),
    edgeNext: document.getElementById("pub-edge-next"),
    loading: document.getElementById("pub-loading"),
    empty: document.getElementById("pub-empty"),
    prevBtn: document.getElementById("pub-prev"),
    nextBtn: document.getElementById("pub-next"),
    pageCurrent: document.getElementById("pub-page-current"),
    pageTotal: document.getElementById("pub-page-total"),
    progressBar: document.getElementById("pub-progress-bar"),
    zoomIn: document.getElementById("pub-zoom-in"),
    zoomOut: document.getElementById("pub-zoom-out"),
    zoomLevel: document.getElementById("pub-zoom-level"),
    fullscreenBtn: document.getElementById("pub-fullscreen"),
    thumbToggle: document.getElementById("pub-thumbnails-toggle"),
    thumbTrack: document.getElementById("pub-thumbnails-track"),
    infoIndex: document.getElementById("pub-info-index"),
    infoTitle: document.getElementById("pub-info-title"),
    infoSubline: document.getElementById("pub-info-subline"),
    infoDownload: document.getElementById("pub-info-download"),
    infoCaseStudy: document.getElementById("pub-info-case-study"),
    srStatus: document.getElementById("pub-sr-status"),
  };

  if (!els.shelf || !els.immersive || !els.stage || !els.book) return;

  const slotEls = {
    left: els.book.querySelector(".pub-slot-left"),
    right: els.book.querySelector(".pub-slot-right"),
  };
  const sheetOf = (side) => slotEls[side].querySelector(".pub-sheet");
  const stackOf = (side) => slotEls[side].querySelector(".pub-stack");
  const castOf = (side) => slotEls[side].querySelector(".pub-cast");

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
      "pdf-too-large": "This PDF is larger than the recommended web preview limit. Use Download PDF while the preview asset is optimized.",
      "pdf-parse": "This publication could not be parsed. Check the PDF file and run npm run build to regenerate its manifest.",
      "cover-missing": "This publication cover could not be loaded. Run npm run build to regenerate its cover.",
      "page-render": "This page could not be rendered. Try another page or download the PDF.",
      "file-protocol":
        "Browsers block PDF previews on pages opened straight from disk. Run npm run dev and open http://localhost:3000/pages/editorial-layout.html instead.",
    };
    console.error(`[publication-reader] ${kind}`, { url, error });
    setLoading(false);
    els.book.hidden = true;
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

  // The slot size for a publication is its most common page size, so a
  // stray odd-sized page never changes the shape of the whole book.
  const dominantRatio = (pages) => {
    const counts = new Map();
    let best = null;
    (pages || []).forEach((p) => {
      const key = `${p.width}x${p.height}`;
      const n = (counts.get(key) || 0) + 1;
      counts.set(key, n);
      if (!best || n > best.n) best = { n, ratio: p.width / p.height };
    });
    return best ? best.ratio : 0.75;
  };

  const buildReal = () =>
    manifest.map((item) => {
      const info = meta[item.file] || {};
      return {
        isPlaceholder: false,
        file: item.file,
        pdfUrl: documentUrl(item.file),
        pageImages: (item.pageImages || []).map(documentUrl),
        cover: documentUrl(item.cover),
        pages: item.pages,
        pageCount: item.pageCount,
        ratio: dominantRatio(item.pages),
        orientation: item.dominantOrientation,
        fileSizeBytes: item.fileSizeBytes,
        title: info.title || item.title || "Untitled",
        brand: info.brand || "",
        type: info.type || "",
        year: info.year || "",
        description: info.description || "",
        caseStudyLink: info.caseStudyLink || "",
        downloadAllowed: info.downloadAllowed === true,
      };
    });

  const publications = (manifest.length ? buildReal() : buildPlaceholders()).map((p, i) => ({ ...p, index: i }));
  const total = publications.length;
  const realCount = publications.filter((p) => !p.isPlaceholder).length;

  if (!total) {
    showShelfMessage("Add a PDF to assets/documents/editorial-layout/ to open it here.");
    return;
  }

  // --- Library: one 3D book per publication, side by side ---

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

    publications.forEach((pub, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pub-book-card";
      btn.dataset.index = String(pub.index);
      btn.dataset.orientation = pub.orientation === "landscape" ? "landscape" : "portrait";
      btn.style.setProperty("--book-delay", `${Math.min(i, 6) * 120}ms`);

      const coverAr = pub.pages && pub.pages[0] ? pub.pages[0].width / pub.pages[0].height : 0.72;
      btn.style.setProperty("--book-ar", String(coverAr));
      const spineWidth = pub.pageCount ? Math.max(5, Math.min(18, Math.round(pub.pageCount / 5))) : 8;
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
        openTag.textContent = "Open";
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
        metaEl.textContent = [pub.type, pub.year, pub.pageCount ? `${pub.pageCount} pages` : "", orientationLabel(pub.orientation)]
          .filter(Boolean)
          .join(" · ");
        caption.appendChild(metaEl);
        btn.addEventListener("click", () => openReader(pub.index));
      }

      btn.appendChild(caption);
      els.shelf.appendChild(btn);
      bookCards.push(btn);
    });
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
    if (reducedMotion()) {
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

  const docCache = new Map(); // file -> pdfjs document proxy (kept for the session)
  const renderCache = new Map(); // "file:page:bucket" -> canvas

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
  };

  const getDoc = async (pub) => {
    if (docCache.has(pub.file)) return docCache.get(pub.file);
    const lib = await ensurePdfjs();
    const doc = await lib.getDocument({ url: pub.pdfUrl }).promise;
    docCache.set(pub.file, doc);
    return doc;
  };

  const cacheBucket = (scale) => Math.round(scale * 20); // coarse buckets so tiny scale drift reuses renders

  // Opened from disk, the "doc" is just the build-time page images (see
  // scripts/generate-publication-manifest.js); each is decoded once and
  // drawn into a canvas, so the rest of the reader can't tell the difference.
  const imageCache = new Map(); // url -> Promise<HTMLImageElement>
  const loadPageImage = (url) => {
    if (!imageCache.has(url)) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      imageCache.set(url, img.decode().then(() => img));
    }
    return imageCache.get(url);
  };

  const renderImagePage = async (doc, file, pageNum, cssWidth) => {
    const url = doc.imageUrls[pageNum - 1];
    if (!url) throw new Error(`No page image for page ${pageNum}`);
    const img = await loadPageImage(url);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = Math.max(1, Math.min(img.naturalWidth, Math.round(cssWidth * dpr)));
    const key = `${file}:img:${pageNum}:${width}`;
    if (renderCache.has(key)) return renderCache.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, Math.round((width * img.naturalHeight) / img.naturalWidth));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    renderCache.set(key, canvas);
    while (renderCache.size > MAX_RENDER_CACHE) renderCache.delete(renderCache.keys().next().value);
    return canvas;
  };

  const renderPage = async (doc, file, pageNum, cssWidth) => {
    if (doc.imageUrls) return renderImagePage(doc, file, pageNum, cssWidth);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const page = await doc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const longest = Math.max(baseViewport.width, baseViewport.height);
    const targetPx = Math.max(1, Math.round(cssWidth * dpr));
    const scale = Math.min(targetPx / baseViewport.width, MAX_CANVAS_PX / longest);
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
    await page.render({ canvasContext: canvas.getContext("2d"), viewport, canvas }).promise;
    renderCache.set(key, canvas);
    while (renderCache.size > MAX_RENDER_CACHE) renderCache.delete(renderCache.keys().next().value);
    return canvas;
  };

  // A cached canvas can only live in one place in the DOM, so a page that's
  // already showing somewhere (e.g. a thumbnail, or the other face of a
  // turning leaf) gets a cheap pixel copy instead.
  const placeableCanvas = (canvas) => {
    if (!canvas.isConnected) return canvas;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext("2d").drawImage(canvas, 0, 0);
    return copy;
  };

  // --- Reader state ---

  let activePub = null;
  let activeDoc = null;
  let spreads = [];
  let spreadIndex = 0;
  let zoom = 1;
  let layout = null;
  let modalOpen = false;
  let lastFocused = null;
  let turning = false;
  let pendingIndex = null;
  let runningAnimations = [];
  let sessionToken = 0;
  let idleTimer = null;
  let thumbObserver = null;
  const thumbButtons = [];

  // Cover alone, then 2–3, 4–5, … ; an even page count ends on a lone back
  // page on the left. Phones read one page per view.
  const buildSpreads = (pageCount, single) => {
    const list = [];
    if (single) {
      for (let n = 1; n <= pageCount; n += 1) list.push({ left: null, right: n });
      return list;
    }
    if (pageCount) list.push({ left: null, right: 1 });
    for (let n = 2; n <= pageCount; n += 2) list.push({ left: n, right: n + 1 <= pageCount ? n + 1 : null });
    return list;
  };

  const spreadIndexForPage = (pageNum) => {
    const idx = spreads.findIndex((s) => s.left === pageNum || s.right === pageNum);
    return idx >= 0 ? idx : 0;
  };

  // --- Layout: size the book to the stage, then position it ---

  const computeLayout = () => {
    const rect = els.stage.getBoundingClientRect();
    const single = singlePageQuery.matches;
    const padX = single ? 18 : Math.min(110, Math.max(56, rect.width * 0.07));
    const padY = single ? 18 : Math.min(64, Math.max(28, rect.height * 0.08));
    const availW = Math.max(80, rect.width - padX * 2);
    const availH = Math.max(80, rect.height - padY * 2);
    const ratio = activePub ? activePub.ratio : 0.75;
    const baseH = single ? Math.min(availH, availW / ratio) : Math.min(availH, availW / (2 * ratio));
    const baseW = baseH * ratio;
    return {
      single,
      padX,
      padY,
      stageW: rect.width,
      stageH: rect.height,
      pageW: baseW * zoom,
      pageH: baseH * zoom,
    };
  };

  // Horizontal shift that centres whatever is visible: a lone cover sits in
  // the right slot, a lone back page in the left, a spread straddles the spine.
  const offsetFor = (spread) => {
    if (!layout || !spread) return 0;
    if (layout.single || !spread.left) return -layout.pageW / 2;
    if (!spread.right) return layout.pageW / 2;
    return 0;
  };

  const applyLayout = () => {
    layout = computeLayout();
    const { pageW, pageH, stageW, stageH, padX, padY } = layout;
    const visibleW = layout.single ? pageW : pageW * 2;
    const canvasW = Math.max(stageW, visibleW + padX * 2);
    const canvasH = Math.max(stageH, pageH + padY * 2);
    els.canvas.style.width = `${canvasW}px`;
    els.canvas.style.height = `${canvasH}px`;
    els.book.style.width = `${pageW * 2}px`;
    els.book.style.height = `${pageH}px`;
    els.book.style.left = `${canvasW / 2 - pageW}px`;
    els.book.style.top = `${(canvasH - pageH) / 2}px`;
    els.book.style.setProperty("--page-w", `${pageW}px`);
    els.book.style.setProperty("--page-h", `${pageH}px`);
    els.book.classList.toggle("is-single", layout.single);
    els.book.style.transform = `translateX(${offsetFor(spreads[spreadIndex])}px)`;
    els.stage.classList.toggle("is-zoomed", zoom > 1);
  };

  // Rect (viewport coordinates) the cover occupies when the book is closed —
  // the flight target on open and the flight origin on close.
  const closedCoverRect = () => {
    const stageRect = els.stage.getBoundingClientRect();
    const base = computeLayout();
    const w = base.pageW / zoom;
    const h = base.pageH / zoom;
    return {
      left: stageRect.left + (stageRect.width - w) / 2,
      top: stageRect.top + (stageRect.height - h) / 2,
      width: w,
      height: h,
    };
  };

  // --- Page canvases ---

  const pagesForSpread = (spread) => (spread ? [spread.left, spread.right].filter(Boolean) : []);

  const ensureCanvases = async (nums) => {
    const map = new Map();
    const width = layout.pageW;
    await Promise.all(
      [...new Set(nums.filter(Boolean))].map(async (n) => {
        map.set(n, await renderPage(activeDoc, activePub.file, n, width));
      })
    );
    return map;
  };

  const fillSheet = (sheet, num, canvases) => {
    sheet.replaceChildren();
    sheet.dataset.page = num ? String(num) : "";
    if (!num) return;
    const canvas = canvases && canvases.get(num);
    if (canvas) sheet.appendChild(placeableCanvas(canvas));
  };

  // Paper stacks on the outer edges: the left grows with pages read, the
  // right with pages still to come (layered box-shadows, no extra DOM).
  const stackShadow = (layers, side) => {
    const dir = side === "left" ? -1 : 1;
    const parts = [];
    for (let i = 1; i <= layers; i += 1) {
      parts.push(`${dir * i * 1.4}px ${i * 0.8}px 0 ${i % 2 ? "#e9e6de" : "#cfcbc0"}`);
    }
    parts.push(`${dir * (layers * 1.4 + 6)}px ${layers * 0.8 + 16}px 30px rgba(0, 0, 0, 0.5)`);
    return parts.join(", ");
  };

  const updateStacks = (spread) => {
    const count = activePub.pageCount;
    const before = Math.max(0, (spread.left || spread.right) - 1);
    const after = Math.max(0, count - (spread.right || spread.left));
    const layersFor = (n) => (n <= 0 ? 0 : Math.max(1, Math.round((n / Math.max(1, count - 1)) * STACK_MAX_LAYERS)));
    stackOf("left").style.boxShadow = spread.left ? stackShadow(layersFor(before), "left") : "none";
    stackOf("right").style.boxShadow = spread.right ? stackShadow(layersFor(after), "right") : "none";
  };

  const showSpread = (spread, canvases) => {
    fillSheet(sheetOf("left"), layout.single ? null : spread.left, canvases);
    fillSheet(sheetOf("right"), spread.right, canvases);
    slotEls.left.hidden = layout.single || !spread.left;
    slotEls.right.hidden = !spread.right;
    els.book.classList.toggle("is-cover", !spread.left && !layout.single);
    els.book.classList.toggle("is-back", !spread.right && !layout.single);
    els.book.style.transform = `translateX(${offsetFor(spread)}px)`;
    updateStacks(spread);
  };

  let loadingTimer = null;
  const setLoading = (on) => {
    window.clearTimeout(loadingTimer);
    if (on) loadingTimer = window.setTimeout(() => els.loading.classList.add("is-active"), 160);
    else els.loading.classList.remove("is-active");
  };

  // Paint the current spread at the current size (open, resize, zoom).
  const paintCurrent = async () => {
    const token = sessionToken;
    const spread = spreads[spreadIndex];
    if (!spread || !activeDoc) return; // still loading — openReader paints once the doc arrives
    setLoading(true);
    try {
      const canvases = await ensureCanvases(pagesForSpread(spread));
      if (token !== sessionToken || spread !== spreads[spreadIndex] || turning) return;
      showSpread(spread, canvases);
    } catch (error) {
      if (token === sessionToken) showLoadError("page-render", error);
    } finally {
      setLoading(false);
    }
    afterChange();
  };

  const prefetchAround = () => {
    const token = sessionToken;
    [spreadIndex + 1, spreadIndex - 1, spreadIndex + 2].forEach((i) => {
      const spread = spreads[i];
      if (!spread) return;
      idle(() => {
        if (token !== sessionToken || !activeDoc) return;
        pagesForSpread(spread).forEach((n) => renderPage(activeDoc, activePub.file, n, layout.pageW).catch(() => {}));
      });
    });
  };

  const idle = (fn) => {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 1200 });
    else window.setTimeout(fn, 200);
  };

  // --- Page turning ---

  const track = (animation) => {
    runningAnimations.push(animation);
    return animation.finished.catch(() => {});
  };

  const finishAnimations = () => {
    runningAnimations.forEach((a) => {
      try {
        a.finish();
      } catch {
        /* already finished */
      }
    });
    runningAnimations = [];
  };

  // A turning page is a chain of thin vertical strips, each hinged on the
  // previous one and angled a little further, so the sheet bends into a
  // smooth curl instead of swinging as one rigid board. Every frame sets
  // each strip's angle, lights it by how steeply it faces away, adds a soft
  // highlight along the fold, and moves a contact shadow across the pages
  // underneath to follow the curling edge.

  const PAPER = "#f4f2ec";
  const STRIP_OVERLAP = 1; // px each strip overlaps the next, hiding hairline seams
  const CURL_DEG = 100; // how far the outer edge leads the spine side mid-turn

  const easeTurn = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // rAF tween with the same finished/finish/cancel shape as a Web Animation,
  // so track() and finishAnimations() handle both.
  const tween = (duration, onFrame) => {
    let raf = 0;
    let start = null;
    let done = false;
    let resolve;
    const finished = new Promise((r) => {
      resolve = r;
    });
    const end = (jumpToEnd) => {
      if (done) return;
      done = true;
      window.cancelAnimationFrame(raf);
      if (jumpToEnd) onFrame(1);
      resolve();
    };
    const tick = (now) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      onFrame(easeTurn(t));
      if (t < 1) raf = window.requestAnimationFrame(tick);
      else end(false);
    };
    raf = window.requestAnimationFrame(tick);
    return { finished, finish: () => end(true), cancel: () => end(false) };
  };

  // The page as it sits in its slot (contain-fitted on paper), at device
  // resolution, ready to be cut into strips. A null page is blank paper.
  const faceCanvas = (num, canvases, pxW, pxH) => {
    const canvas = document.createElement("canvas");
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, pxW, pxH);
    const src = num && canvases.get(num);
    if (src) {
      const s = Math.min(pxW / src.width, pxH / src.height);
      const dw = src.width * s;
      const dh = src.height * s;
      ctx.drawImage(src, (pxW - dw) / 2, (pxH - dh) / 2, dw, dh);
    }
    return canvas;
  };

  const sliceCanvas = (face, sx, sw, scale) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = face.height;
    const from = Math.max(0, sx);
    const to = Math.min(face.width / scale, sx + sw);
    if (to > from) {
      canvas
        .getContext("2d")
        .drawImage(face, from * scale, 0, (to - from) * scale, face.height, (from - sx) * scale, 0, (to - from) * scale, face.height);
    }
    return canvas;
  };

  const shadeColor = (v) => (v >= 0 ? `rgba(0,0,0,${v.toFixed(3)})` : `rgba(255,255,255,${(-v).toFixed(3)})`);

  // side "right": hinged on its left edge (the spine), turns leftwards.
  // side "left": hinged on its right edge, turns rightwards.
  const buildCurlLeaf = (side, frontNum, backNum, canvases) => {
    const { pageW, pageH } = layout;
    const count = layout.single ? 12 : 16;
    const w = pageW / count;
    const sw = w + STRIP_OVERLAP;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const pxW = Math.max(1, Math.round(pageW * scale));
    const pxH = Math.max(1, Math.round(pageH * scale));
    const front = faceCanvas(frontNum, canvases, pxW, pxH);
    const back = faceCanvas(backNum, canvases, pxW, pxH);

    const leaf = document.createElement("div");
    leaf.className = `pub-leaf pub-leaf-${side}`;
    leaf.setAttribute("aria-hidden", "true");

    const strips = [];
    let parent = leaf;
    for (let k = 0; k < count; k += 1) {
      const strip = document.createElement("div");
      strip.className = "pub-strip";
      strip.style.width = `${sw}px`;
      if (side === "right") {
        strip.style.left = k === 0 ? "0px" : `${w}px`;
        strip.style.transformOrigin = "0 50%";
      } else {
        strip.style.left = k === 0 ? `${pageW - w}px` : `${-w}px`;
        strip.style.transformOrigin = `${w}px 50%`;
      }

      // Which column of each page this strip shows (worked out so the back
      // face reads correctly once the strip has flipped over the spine).
      const frontX = side === "right" ? k * w : pageW - (k + 1) * w;
      const backX = side === "right" ? pageW - (k + 1) * w - STRIP_OVERLAP : k * w - STRIP_OVERLAP;

      const faces = {};
      ["front", "back"].forEach((which) => {
        const face = document.createElement("div");
        face.className = `pub-strip-face pub-strip-${which}`;
        face.appendChild(sliceCanvas(which === "front" ? front : back, which === "front" ? frontX : backX, sw, scale));
        const shade = document.createElement("span");
        shade.className = "pub-strip-shade";
        face.appendChild(shade);
        strip.appendChild(face);
        faces[which] = shade;
      });

      parent.appendChild(strip);
      strips.push({ el: strip, frontShade: faces.front, backShade: faces.back });
      parent = strip;
    }

    els.book.appendChild(leaf);
    return { leaf, strips, w, side };
  };

  // Angles (0 = flat where it started, 180 = flat on the other side) for
  // every strip at turn progress p.
  const curlAngles = (p, count) => {
    const base = 180 * p;
    const curl = CURL_DEG * Math.sin(Math.PI * p);
    const angles = [];
    for (let k = 0; k < count; k += 1) {
      const t = (k + 0.5) / count;
      angles.push(Math.max(0, Math.min(180, base + curl * (Math.pow(t, 1.4) - 0.42))));
    }
    return angles;
  };

  // Light falls off as a strip turns edge-on to the viewer.
  const shadeFor = (deg) => 0.5 * (1 - Math.abs(Math.cos((deg * Math.PI) / 180)));

  const paintCurl = (curlLeaf, p) => {
    const { strips, side } = curlLeaf;
    const angles = curlAngles(p, strips.length);
    const deltas = angles.map((a, k) => (k === 0 ? a : a - angles[k - 1]));
    const maxDelta = Math.max(1e-3, ...deltas.slice(1));
    const sign = side === "right" ? -1 : 1;

    strips.forEach((strip, k) => {
      strip.el.style.transform = `rotateY(${sign * deltas[k]}deg)`;

      const here = shadeFor(angles[k]);
      const near = k === 0 ? here : (shadeFor(angles[k - 1]) + here) / 2;
      const far = k === strips.length - 1 ? here : (shadeFor(angles[k + 1]) + here) / 2;
      const gloss = k === 0 ? 0 : 0.12 * (deltas[k] / maxDelta) * Math.sin(Math.PI * p);
      const n = shadeColor(near - gloss);
      const f = shadeColor(far - gloss);
      // Gradient runs left→right in each face's own frame; which end is the
      // spine side flips between faces and between left/right leaves.
      const nearFirstFront = side === "right";
      strip.frontShade.style.background = `linear-gradient(to right, ${nearFirstFront ? n : f}, ${nearFirstFront ? f : n})`;
      strip.backShade.style.background = `linear-gradient(to right, ${nearFirstFront ? f : n}, ${nearFirstFront ? n : f})`;
    });

    // Where the curling edge appears, measured from the spine
    // (positive = still over the side it started on).
    const edge = angles.reduce((sum, a) => sum + curlLeaf.w * Math.cos((a * Math.PI) / 180), 0);
    const lift = Math.sin(Math.PI * p);
    return { edge, lift };
  };

  // Soft shadow the lifted page throws onto the page beneath, just beyond
  // its edge, fading away from it.
  const setContactShadow = (castEl, fromSpinePct, strength, spreadPct, towards) => {
    if (!castEl) return;
    const e = Math.max(0, Math.min(100, fromSpinePct));
    const end = Math.min(100, e + spreadPct);
    castEl.style.opacity = "1";
    castEl.style.background = `linear-gradient(${towards}, rgba(0,0,0,${(strength * 0.25).toFixed(3)}) 0%, rgba(0,0,0,${(strength * 0.12).toFixed(3)}) ${e}%, rgba(0,0,0,${strength.toFixed(3)}) ${e}%, rgba(0,0,0,0) ${end}%)`;
  };

  const clearContactShadows = () => {
    ["left", "right"].forEach((side) => {
      const cast = castOf(side);
      cast.style.opacity = "";
      cast.style.background = "";
    });
  };

  const animateTurn = async (from, to, forward, duration, canvases) => {
    const single = layout.single;
    const pageW = layout.pageW;
    let curlLeaf;
    let reverse = false; // play the curl backwards (single-page "previous")

    if (single) {
      // One page per view: the current page curls away to the left
      // (forward), or the previous page curls back in over it.
      fillSheet(sheetOf("right"), forward ? to.right : from.right, canvases);
      slotEls.right.hidden = false;
      curlLeaf = buildCurlLeaf("right", forward ? from.right : to.right, null, canvases);
      reverse = !forward;
    } else if (forward) {
      // Right-hand page turns over the spine: its front is the current right
      // page, its back the next spread's left page; the next right page is
      // already lying underneath.
      fillSheet(sheetOf("left"), from.left, canvases);
      fillSheet(sheetOf("right"), to.right, canvases);
      slotEls.left.hidden = !from.left;
      slotEls.right.hidden = !to.right;
      curlLeaf = buildCurlLeaf("right", from.right, to.left, canvases);
    } else {
      fillSheet(sheetOf("left"), to.left, canvases);
      fillSheet(sheetOf("right"), from.right, canvases);
      slotEls.left.hidden = !to.left;
      slotEls.right.hidden = !from.right;
      curlLeaf = buildCurlLeaf("left", from.left, to.right, canvases);
    }

    // The book glides so the new view ends up centred (cover → first spread,
    // last spread → back page).
    const fromX = offsetFor(from);
    const toX = offsetFor(to);
    const startSide = curlLeaf.side; // the side the leaf lifts from
    const otherSide = startSide === "right" ? "left" : "right";
    const awayFromSpine = (side) => (side === "right" ? "to right" : "to left");

    const frame = (eased) => {
      const p = reverse ? 1 - eased : eased;
      const { edge, lift } = paintCurl(curlLeaf, p);
      const strength = 0.34 * lift + 0.06;
      const spread = 8 + 24 * lift;
      if (edge >= 0) {
        setContactShadow(castOf(startSide), (edge / pageW) * 100, strength, spread, awayFromSpine(startSide));
        castOf(otherSide).style.opacity = "0";
      } else {
        setContactShadow(castOf(otherSide), (-edge / pageW) * 100, strength, spread, awayFromSpine(otherSide));
        castOf(startSide).style.opacity = "0";
      }
      // Single-page view: the page fades as it leaves the visible page area.
      if (single) curlLeaf.leaf.style.opacity = String(p > 0.62 ? Math.max(0, 1 - (p - 0.62) / 0.3) : 1);
      if (fromX !== toX) els.book.style.transform = `translateX(${fromX + (toX - fromX) * eased}px)`;
    };

    frame(0);
    els.book.classList.add("is-turning");
    await track(tween(duration, frame));
    runningAnimations = [];
    curlLeaf.leaf.remove();
    clearContactShadows();
    els.book.style.transform = `translateX(${toX}px)`;
    els.book.classList.remove("is-turning");
  };

  const turnTo = async (target, quick = false) => {
    if (!spreads.length || !activeDoc) return;
    const index = Math.max(0, Math.min(spreads.length - 1, target));
    if (turning) {
      pendingIndex = index;
      return;
    }
    if (index === spreadIndex) return;

    const token = sessionToken;
    const from = spreads[spreadIndex];
    const to = spreads[index];
    const forward = index > spreadIndex;
    turning = true;
    setLoading(true);

    try {
      const canvases = await ensureCanvases([...pagesForSpread(from), ...pagesForSpread(to)]);
      setLoading(false);
      if (token !== sessionToken) return;
      spreadIndex = index;
      afterChange();

      if (reducedMotion()) {
        await track(els.book.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: "linear" }));
        showSpread(to, canvases);
        await track(els.book.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "linear" }));
        runningAnimations = [];
      } else {
        await animateTurn(from, to, forward, quick ? QUICK_TURN_MS : TURN_MS, canvases);
        if (token !== sessionToken) return;
        showSpread(to, canvases);
      }
    } catch (error) {
      if (token === sessionToken) showLoadError("page-render", error);
    } finally {
      setLoading(false);
      if (token === sessionToken) {
        turning = false;
        if (pendingIndex !== null) {
          const next = pendingIndex;
          pendingIndex = null;
          if (next !== spreadIndex) turnTo(next, true);
        }
      }
    }
  };

  // Rapid presses queue up: each one moves the pending target one step on
  // from the last requested spread, and the queue plays out as quick turns.
  const step = (delta) => {
    const base = turning && pendingIndex !== null ? pendingIndex : spreadIndex;
    const target = Math.max(0, Math.min(spreads.length - 1, base + delta));
    if (turning) {
      if (target !== spreadIndex) pendingIndex = target;
      return;
    }
    turnTo(target);
  };
  const goNext = () => step(1);
  const goPrev = () => step(-1);

  // --- After every change: counter, buttons, progress, thumbs, a11y ---

  const afterChange = () => {
    const spread = spreads[spreadIndex];
    if (!spread || !activePub) return;
    const nums = pagesForSpread(spread);
    els.pageCurrent.textContent = nums.length === 2 ? `${nums[0]}–${nums[1]}` : String(nums[0]);
    els.pageTotal.textContent = String(activePub.pageCount);
    const atStart = spreadIndex === 0;
    const atEnd = spreadIndex === spreads.length - 1;
    els.prevBtn.disabled = atStart;
    els.nextBtn.disabled = atEnd;
    els.edgePrev.disabled = atStart;
    els.edgeNext.disabled = atEnd;
    if (els.progressBar) {
      const pct = spreads.length > 1 ? (spreadIndex / (spreads.length - 1)) * 100 : 100;
      els.progressBar.style.width = `${pct}%`;
    }
    if (els.srStatus) {
      const label = nums.length === 2 ? `pages ${nums[0]} and ${nums[1]}` : `page ${nums[0]}`;
      els.srStatus.textContent = `${activePub.title}, ${label} of ${activePub.pageCount}`;
    }
    setActiveThumbs(nums);
    prefetchAround();
  };

  // --- Zoom ---

  const setZoom = (next) => {
    const z = Math.max(ZOOM_STEPS[0], Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], next));
    if (!activePub || z === zoom) return;
    finishAnimations();
    const sc = els.scroll;
    const cx = (sc.scrollLeft + sc.clientWidth / 2) / Math.max(1, sc.scrollWidth);
    const cy = (sc.scrollTop + sc.clientHeight / 2) / Math.max(1, sc.scrollHeight);
    zoom = z;
    applyLayout();
    sc.scrollLeft = cx * sc.scrollWidth - sc.clientWidth / 2;
    sc.scrollTop = cy * sc.scrollHeight - sc.clientHeight / 2;
    updateZoomUI();
    paintCurrent(); // re-render crisp at the new size; CSS scales the old canvases meanwhile
  };

  const zoomBy = (dir) => {
    const idx = ZOOM_STEPS.findIndex((s) => s >= zoom - 0.001);
    const nextIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (idx < 0 ? 0 : idx) + dir));
    setZoom(ZOOM_STEPS[nextIdx]);
  };

  const updateZoomUI = () => {
    if (els.zoomLevel) els.zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
    if (els.zoomOut) els.zoomOut.disabled = zoom <= ZOOM_STEPS[0];
    if (els.zoomIn) els.zoomIn.disabled = zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1];
  };

  els.zoomIn?.addEventListener("click", () => zoomBy(1));
  els.zoomOut?.addEventListener("click", () => zoomBy(-1));
  els.zoomLevel?.addEventListener("click", () => setZoom(1));

  // --- Input: arrows, clicks on the pages, keys, wheel, swipe, drag-pan ---

  els.prevBtn.addEventListener("click", goPrev);
  els.nextBtn.addEventListener("click", goNext);
  els.edgePrev.addEventListener("click", goPrev);
  els.edgeNext.addEventListener("click", goNext);

  // At 100%, clicking a page turns it: left of the spine goes back, right
  // goes forward (on phones, the left third of the page goes back). When
  // zoomed, the mouse drags to pan instead.
  let dragState = null;
  let suppressClick = false;

  els.scroll.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragState = { x: event.clientX, y: event.clientY, left: els.scroll.scrollLeft, top: els.scroll.scrollTop, moved: false };
  });
  window.addEventListener("pointermove", (event) => {
    if (!dragState) return;
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragState.moved = true;
    if (zoom > 1 && dragState.moved) {
      els.scroll.scrollLeft = dragState.left - dx;
      els.scroll.scrollTop = dragState.top - dy;
      els.stage.classList.add("is-panning");
    }
  });
  window.addEventListener("pointerup", () => {
    if (!dragState) return;
    suppressClick = dragState.moved;
    dragState = null;
    els.stage.classList.remove("is-panning");
  });

  els.scroll.addEventListener("click", (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (zoom > 1 || !layout || !activeDoc) return;
    const bookRect = els.book.getBoundingClientRect();
    if (layout.single) {
      const pageLeft = bookRect.left + layout.pageW;
      if (event.clientX < pageLeft + layout.pageW / 3) goPrev();
      else goNext();
      return;
    }
    const spineX = bookRect.left + layout.pageW;
    if (event.clientX < spineX) goPrev();
    else goNext();
  });

  const isTypingTarget = (el) => el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

  document.addEventListener("keydown", (event) => {
    if (!modalOpen || isTypingTarget(event.target)) return;
    const key = event.key;
    if (key === "Escape") {
      event.preventDefault();
      closeReader();
    } else if (key === "Tab") {
      trapFocus(event);
    } else if (key === "ArrowRight" || key === "PageDown") {
      event.preventDefault();
      goNext();
    } else if (key === "ArrowLeft" || key === "PageUp") {
      event.preventDefault();
      goPrev();
    } else if (key === "Home") {
      event.preventDefault();
      turnTo(0);
    } else if (key === "End") {
      event.preventDefault();
      turnTo(spreads.length - 1);
    } else if (key === "+" || key === "=") {
      event.preventDefault();
      zoomBy(1);
    } else if (key === "-" || key === "_") {
      event.preventDefault();
      zoomBy(-1);
    } else if (key === "0") {
      event.preventDefault();
      setZoom(1);
    } else if ((key === "f" || key === "F") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      toggleFullscreen();
    }
  });

  const trapFocus = (event) => {
    const focusables = [...els.reader.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")].filter(
      (el) => !el.disabled && !el.hidden && el.offsetParent !== null
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !els.reader.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  let wheelLock = false;
  els.scroll.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        if (wheelLock) return;
        wheelLock = true;
        zoomBy(event.deltaY < 0 ? 1 : -1);
        window.setTimeout(() => {
          wheelLock = false;
        }, 220);
        return;
      }
      if (zoom > 1) return; // zoomed: native scroll pans
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

  let touchStart = null;
  els.scroll.addEventListener(
    "touchstart",
    (event) => {
      touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    },
    { passive: true }
  );
  els.scroll.addEventListener(
    "touchend",
    (event) => {
      if (!touchStart || zoom > 1) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 400);
      if (dx < 0) goNext();
      else goPrev();
    },
    { passive: true }
  );

  let resizeTimer = null;
  const relayout = () => {
    if (!activePub || !modalOpen) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      finishAnimations();
      applyLayout();
      paintCurrent();
    }, 120);
  };
  window.addEventListener("resize", relayout);

  singlePageQuery.addEventListener("change", () => {
    if (!activePub || !modalOpen) return;
    const anchor = pagesForSpread(spreads[spreadIndex])[0] || 1;
    finishAnimations();
    spreads = buildSpreads(activePub.pageCount, singlePageQuery.matches);
    spreadIndex = spreadIndexForPage(anchor);
    applyLayout();
    paintCurrent();
  });

  // --- Fullscreen ---

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else els.immersive.requestFullscreen?.().catch(() => {});
  };
  els.fullscreenBtn?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    const on = Boolean(document.fullscreenElement);
    els.fullscreenBtn?.setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen");
    els.fullscreenBtn?.classList.toggle("is-active", on);
    relayout();
  });

  // --- Idle-fade chrome ---

  const wakeControls = () => {
    els.reader.classList.remove("is-idle");
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => els.reader.classList.add("is-idle"), IDLE_MS);
  };
  ["pointermove", "pointerdown", "touchstart", "focusin", "keydown"].forEach((evt) => {
    els.reader.addEventListener(evt, wakeControls, { passive: true });
  });

  // --- Thumbnails ---

  const setThumbsOpen = (open) => {
    els.footer.classList.toggle("is-thumbs-open", open);
    els.thumbToggle.setAttribute("aria-expanded", String(open));
    if (modalOpen) relayout();
  };
  els.thumbToggle?.addEventListener("click", () => setThumbsOpen(!els.footer.classList.contains("is-thumbs-open")));

  const buildThumbnails = (pub) => {
    els.thumbTrack.innerHTML = "";
    thumbButtons.length = 0;
    if (thumbObserver) thumbObserver.disconnect();

    for (let n = 1; n <= pub.pageCount; n += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pub-thumb";
      btn.dataset.page = String(n);
      btn.setAttribute("aria-label", `Go to page ${n}`);
      const info = pub.pages && pub.pages[n - 1];
      btn.style.setProperty("--pub-thumb-ar", String(info ? info.width / info.height : pub.ratio));
      // Pair thumbnails visually the way the spreads pair (cover alone).
      if (n > 1 && n % 2 === 0) btn.classList.add("is-spread-start");

      const sheet = document.createElement("span");
      sheet.className = "pub-thumb-sheet";
      const num = document.createElement("span");
      num.className = "pub-thumb-num";
      num.textContent = String(n);
      btn.append(sheet, num);

      btn.addEventListener("click", () => turnTo(spreadIndexForPage(n)));
      els.thumbTrack.appendChild(btn);
      thumbButtons.push(btn);
    }

    const token = sessionToken;
    thumbObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || token !== sessionToken) return;
          const btn = entry.target;
          thumbObserver.unobserve(btn);
          const sheet = btn.querySelector(".pub-thumb-sheet");
          const n = Number(btn.dataset.page);
          renderPage(activeDoc, pub.file, n, 96)
            .then((canvas) => {
              if (token === sessionToken) sheet.appendChild(placeableCanvas(canvas));
            })
            .catch(() => {});
        });
      },
      { root: els.thumbTrack, rootMargin: "0px 300px" }
    );
    thumbButtons.forEach((btn) => thumbObserver.observe(btn));
  };

  const setActiveThumbs = (nums) => {
    let first = null;
    thumbButtons.forEach((btn) => {
      const active = nums.includes(Number(btn.dataset.page));
      btn.setAttribute("aria-current", active ? "page" : "false");
      if (active && !first) first = btn;
    });
    if (first && els.footer.classList.contains("is-thumbs-open")) {
      const trackEl = els.thumbTrack;
      const target = first.offsetLeft - (trackEl.clientWidth - first.clientWidth * nums.length) / 2;
      trackEl.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? "auto" : "smooth" });
    }
  };

  // --- Header info ---

  const updateInfo = (pub, index) => {
    if (els.infoIndex) {
      els.infoIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${String(realCount).padStart(2, "0")}`;
    }
    els.infoTitle.textContent = pub.title;
    els.infoSubline.textContent = [pub.brand, pub.type, pub.year, `${pub.pageCount} pages`].filter(Boolean).join(" · ");

    if (els.infoDownload) {
      if (pub.downloadAllowed) {
        els.infoDownload.href = pub.pdfUrl;
        els.infoDownload.setAttribute("download", pub.file);
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

  // --- Cover flight between the library and the reader ---

  const flyCover = (pub, fromRect, toRect, { rotateFrom = 0, rotateTo = 0 } = {}) => {
    const flyer = document.createElement("div");
    flyer.className = "pub-flyer";
    flyer.setAttribute("aria-hidden", "true");
    Object.assign(flyer.style, {
      left: `${toRect.left}px`,
      top: `${toRect.top}px`,
      width: `${toRect.width}px`,
      height: `${toRect.height}px`,
    });
    const img = document.createElement("img");
    img.src = pub.cover;
    img.alt = "";
    flyer.appendChild(img);
    document.body.appendChild(flyer);

    // Same aspect ratio at both ends, so a uniform scale keeps the cover undistorted.
    const scale = fromRect.width / toRect.width;
    const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
    const animation = flyer.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) perspective(1600px) rotateY(${rotateFrom}deg) scale(${scale})` },
        { transform: `translate(0, 0) perspective(1600px) rotateY(${rotateTo}deg) scale(1)` },
      ],
      { duration: FLY_MS, easing: FLY_EASE, fill: "forwards" }
    );
    return { flyer, finished: animation.finished.catch(() => {}) };
  };

  const shelfCoverOf = (index) => bookCards[index]?.querySelector(".pub-book-cover");

  // --- Open / close ---

  async function openReader(index) {
    const pub = publications[index];
    if (!pub || pub.isPlaceholder || modalOpen) return;

    sessionToken += 1;
    const token = sessionToken;
    lastFocused = document.activeElement;
    modalOpen = true;
    activePub = pub;
    activeDoc = null;
    zoom = 1;
    turning = false;
    pendingIndex = null;
    spreads = buildSpreads(pub.pageCount, singlePageQuery.matches);
    spreadIndex = 0; // always open on the cover, alone

    updateInfo(pub, index);
    updateZoomUI();
    els.empty.classList.remove("is-active");
    els.empty.setAttribute("aria-hidden", "true");
    els.book.hidden = false;
    els.thumbTrack.innerHTML = "";
    thumbButtons.length = 0;
    setThumbsOpen(thumbsDefaultQuery.matches);

    // Placeholder cover (the build-time cover image) until PDF.js has the page.
    fillSheet(sheetOf("left"), null);
    const coverSheet = sheetOf("right");
    coverSheet.replaceChildren();
    const coverImg = document.createElement("img");
    coverImg.src = pub.cover;
    coverImg.alt = "";
    coverSheet.appendChild(coverImg);

    els.immersive.classList.add("is-open");
    els.immersive.setAttribute("aria-hidden", "false");
    document.body.classList.add("pub-immersive-open");
    els.scroll.scrollTo(0, 0);
    applyLayout();
    showSpreadChrome();
    wakeControls();

    const shelfCover = shelfCoverOf(index);
    let flight = null;
    if (!reducedMotion() && shelfCover) {
      const fromRect = shelfCover.getBoundingClientRect();
      els.book.classList.add("is-arriving");
      bookCards[index].classList.add("is-away");
      flight = flyCover(pub, fromRect, closedCoverRect(), { rotateFrom: -14 });
      flight.finished.then(() => {
        els.book.classList.remove("is-arriving");
        flight.flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" }).finished.then(() => flight.flyer.remove());
      });
    } else if (shelfCover) {
      bookCards[index].classList.add("is-away");
    }
    els.scroll.focus({ preventScroll: true });

    if (OPENED_FROM_DISK) {
      if (!pub.pageImages.length) {
        showLoadError("file-protocol", null, pub.pdfUrl);
        return;
      }
      activeDoc = { imageUrls: pub.pageImages };
      buildThumbnails(pub);
      await paintCurrent();
      return;
    }

    setLoading(true);
    try {
      await verifyPublicationAssets(pub);
    } catch (error) {
      if (token === sessionToken) showLoadError(error.kind || "pdf-404", error, error.url);
      return;
    }

    let doc;
    try {
      doc = await getDoc(pub);
    } catch (error) {
      if (token === sessionToken) showLoadError("pdf-parse", error, pub.pdfUrl);
      return;
    }
    if (token !== sessionToken) return; // closed or switched while loading
    activeDoc = doc;
    buildThumbnails(pub);
    await paintCurrent();
  }

  // Slot visibility for the current spread before any canvas is ready.
  const showSpreadChrome = () => {
    const spread = spreads[spreadIndex];
    if (!spread) return;
    slotEls.left.hidden = layout.single || !spread.left;
    slotEls.right.hidden = !spread.right;
    els.book.classList.toggle("is-cover", !spread.left && !layout.single);
    els.book.classList.remove("is-back");
    stackOf("left").style.boxShadow = "none";
    stackOf("right").style.boxShadow = activePub ? stackShadow(STACK_MAX_LAYERS, "right") : "none";
    afterChange();
  };

  function closeReader() {
    if (!modalOpen) return;
    const pub = activePub;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});

    const fromRect = closedCoverRect();
    finishAnimations();
    sessionToken += 1;
    modalOpen = false;
    turning = false;
    pendingIndex = null;
    setLoading(false);
    if (thumbObserver) thumbObserver.disconnect();

    els.immersive.classList.remove("is-open");
    els.immersive.setAttribute("aria-hidden", "true");
    document.body.classList.remove("pub-immersive-open");

    const card = bookCards[pub.index];
    const shelfCover = shelfCoverOf(pub.index);
    const restore = () => card?.classList.remove("is-away");

    // The book closes back onto its cover and flies home to the library.
    if (!reducedMotion() && shelfCover && card) {
      const toRect = shelfCover.getBoundingClientRect();
      const inView = toRect.bottom > 0 && toRect.top < window.innerHeight;
      if (inView) {
        const flight = flyCover(pub, fromRect, toRect, { rotateTo: -14 });
        flight.finished.then(() => {
          restore();
          flight.flyer.remove();
        });
      } else {
        restore();
      }
    } else {
      restore();
    }

    activePub = null;
    activeDoc = null;
    zoom = 1;
    els.stage.classList.remove("is-zoomed");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  els.closeBtn?.addEventListener("click", closeReader);
  els.backBtn?.addEventListener("click", closeReader);
  els.immersiveBackdrop?.addEventListener("click", closeReader);

  // --- Init ---

  updateZoomUI();
  buildShelf();
  armReveal();
})();
