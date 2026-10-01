/*
 * Landing hero brand folders (index.html, .hero; styles in
 * css/hero-folders.css). A horizontally scrollable row of brand folders
 * on the left stage drives the charcoal information panel on the right.
 *
 * - The row is a native scroll-snap scroller, so trackpad scrolling and
 *   touch swiping work as-is; mouse dragging, the panel's prev/next
 *   arrows, and arrow/Home/End keys on the tabs are added here.
 * - Every scroll frame, each folder's depth (scale, slight turn, blur,
 *   dimming) is set from its distance to the row's centre, so neighbours
 *   recede smoothly as the selected folder comes forward.
 * - When a folder settles in the centre it becomes the selected tab: it
 *   opens (CSS, .is-active) and the panel crossfades to its brand. The
 *   panel's text blocks reserve their own height, so nothing shifts.
 * - Clicking the already-open folder goes to that brand's project page.
 * - prefers-reduced-motion: no blur/turn, instant scrolling, and the CSS
 *   drops the open/fan/crossfade transitions.
 */
(() => {
  const track = document.getElementById("hf-track");
  if (!track) return;
  const folders = Array.from(track.querySelectorAll(".hf-folder"));
  if (!folders.length) return;

  const els = {
    panel: document.getElementById("hero-panel"),
    swap: document.getElementById("hp-swap"),
    number: document.getElementById("hp-number"),
    title: document.getElementById("hp-title"),
    summary: document.getElementById("hp-summary"),
    role: document.getElementById("hp-role"),
    deliverables: document.getElementById("hp-deliverables"),
    cta: document.getElementById("hp-cta"),
    current: document.getElementById("hp-current"),
    prev: document.getElementById("hp-prev"),
    next: document.getElementById("hp-next"),
    status: document.getElementById("hp-status"),
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pad = (n) => String(n).padStart(2, "0");
  let active = Math.max(0, folders.findIndex((f) => f.classList.contains("is-active")));

  // --- Geometry ---

  const centreOf = (folder) => folder.offsetLeft + folder.offsetWidth / 2;
  const scrollLeftFor = (index) => centreOf(folders[index]) - track.clientWidth / 2;
  const stepWidth = () =>
    folders.length > 1 ? Math.abs(centreOf(folders[1]) - centreOf(folders[0])) : folders[0].offsetWidth;

  const nearestIndex = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    folders.forEach((folder, i) => {
      if (Math.abs(centreOf(folder) - mid) < Math.abs(centreOf(folders[best]) - mid)) best = i;
    });
    return best;
  };

  // --- Depth: restrained perspective, scale, blur, and dimming by distance ---

  const paintDepth = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    const step = stepWidth() || 1;
    const calm = reducedMotion.matches;
    folders.forEach((folder) => {
      const d = (centreOf(folder) - mid) / step;
      const a = Math.min(Math.abs(d), 1.8);
      const scale = 1 - a * 0.15;
      if (calm) {
        folder.style.transform = `scale(${scale.toFixed(3)})`;
        folder.style.filter = "";
      } else {
        const turn = Math.max(-1.4, Math.min(1.4, d)) * -14;
        folder.style.transform = `perspective(1400px) translateZ(${(-a * 90).toFixed(1)}px) rotateY(${turn.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        const blur = Math.min(a, 1) * 1.6;
        folder.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px) brightness(${(1 - Math.min(a, 1.2) * 0.12).toFixed(3)})` : "";
      }
      folder.style.opacity = (1 - Math.min(a, 1.6) * 0.3).toFixed(3);
      folder.style.zIndex = String(100 - Math.round(a * 10));
    });
  };

  // --- Selection + panel ---

  let swapTimer = null;
  const updatePanel = (folder, index) => {
    const d = folder.dataset;
    els.number.textContent = pad(index + 1);
    els.current.textContent = pad(index + 1);
    els.title.textContent = d.title || "";
    els.summary.textContent = d.summary || "";
    els.role.textContent = d.role || "";
    els.deliverables.textContent = d.deliverables || "";
    els.cta.href = d.href || "#";
    els.cta.setAttribute("aria-label", `Explore the ${d.title} project`);
    els.panel.setAttribute("aria-labelledby", folder.id);
  };

  const select = (index, { focus = false } = {}) => {
    if (index === active && folders[index].classList.contains("is-active")) {
      if (focus) folders[index].focus({ preventScroll: true });
      return;
    }
    folders.forEach((folder, i) => {
      const on = i === index;
      folder.classList.toggle("is-active", on);
      folder.setAttribute("aria-selected", String(on));
      folder.tabIndex = on ? 0 : -1;
    });
    active = index;
    const folder = folders[index];
    if (focus) folder.focus({ preventScroll: true });
    if (els.status) els.status.textContent = `${folder.dataset.title}, ${index + 1} of ${folders.length}`;

    window.clearTimeout(swapTimer);
    if (reducedMotion.matches || !els.swap) {
      updatePanel(folder, index);
      return;
    }
    els.swap.classList.add("is-swapping");
    swapTimer = window.setTimeout(() => {
      updatePanel(folders[active], active);
      els.swap.classList.remove("is-swapping");
    }, 220);
  };

  const goTo = (index, opts = {}) => {
    const i = (index + folders.length) % folders.length;
    track.scrollTo({ left: scrollLeftFor(i), behavior: reducedMotion.matches ? "auto" : "smooth" });
    select(i, opts);
  };

  // --- Scroll: depth every frame, selection once a folder settles ---

  let rafPending = false;
  let settleTimer = null;
  track.addEventListener(
    "scroll",
    () => {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(() => {
          rafPending = false;
          paintDepth();
        });
      }
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (!dragging) select(nearestIndex());
      }, 90);
    },
    { passive: true }
  );

  // --- Mouse drag (touch and trackpads use native scrolling) ---

  let dragging = false;
  let dragStart = null;
  let suppressClick = false;

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragStart = { x: event.clientX, left: track.scrollLeft, id: event.pointerId };
  });

  track.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    if (!dragging && Math.abs(dx) > 5) {
      dragging = true;
      track.classList.add("is-dragging");
      track.setPointerCapture(dragStart.id);
    }
    if (dragging) track.scrollLeft = dragStart.left - dx;
  });

  const endDrag = () => {
    if (!dragStart) return;
    const wasDragging = dragging;
    dragStart = null;
    dragging = false;
    if (!wasDragging) return;
    suppressClick = true;
    track.classList.remove("is-dragging");
    goTo(nearestIndex());
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("lostpointercapture", endDrag);

  // --- Clicks, keys, arrows ---

  folders.forEach((folder, i) => {
    folder.addEventListener("click", (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      if (i === active && folder.classList.contains("is-active")) {
        window.location.href = folder.dataset.href;
        return;
      }
      goTo(i);
    });
  });

  track.addEventListener("keydown", (event) => {
    const keys = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: folders.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    goTo(keys[event.key], { focus: true });
  });

  els.prev?.addEventListener("click", () => goTo(active - 1));
  els.next?.addEventListener("click", () => goTo(active + 1));

  // --- Layout changes ---

  const recentre = () => {
    track.scrollTo({ left: scrollLeftFor(active), behavior: "auto" });
    paintDepth();
  };

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(recentre, 120);
  });
  reducedMotion.addEventListener("change", paintDepth);

  recentre();
})();
