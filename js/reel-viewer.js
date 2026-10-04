/*
 * Fullscreen reel viewer for the phone layout of the Short-Form Video &
 * Reels page. js/print-collateral-showcase.js creates it with
 * window.createReelViewer(entries, options) and calls open(index, trigger)
 * when a reel in the library is tapped.
 *
 * One <video> is reused for every reel and is given a source only when a
 * reel is opened, so the page itself loads nothing but posters. Playback
 * starts from the visitor's tap (or swipe), with sound where the browser
 * allows it and muted otherwise. Native controls supply play/pause, mute,
 * progress and the captions toggle (for reels with a `captions` track);
 * the viewer adds the close button, a counter, the project title and
 * previous/next.
 *
 * While open: the page behind is locked in place (body fixed at its scroll
 * offset, so nothing scrolls or jumps), the floating project dock is
 * hidden, other videos on the page are paused, and focus stays inside.
 * Closing stops playback, cancels the download, restores the dock and puts
 * the page back at the exact position it was left at.
 *
 * Keys: Escape closes, ←/→ change reel, Space or K plays/pauses, M mutes.
 * A horizontal swipe on the video changes reel (not on the bottom control
 * strip, which belongs to the native progress bar).
 */
window.createReelViewer = (entries, { formatDuration } = {}) => {
  if (!entries || !entries.length) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let el = null; // built on first open
  let video = null;
  let titleEl = null;
  let currentEl = null;
  let closeBtn = null;
  let index = 0;
  let trigger = null;
  let savedY = 0;
  let isOpen = false;

  const icon = (path) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`;

  const build = () => {
    el = document.createElement("div");
    el.className = "reel-viewer";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Reel viewer");
    el.innerHTML = `
      <div class="reel-viewer-top">
        <p class="reel-viewer-title"></p>
        <button class="reel-viewer-btn reel-viewer-close" type="button" aria-label="Close video">${icon("M6 6l12 12M18 6L6 18")}</button>
      </div>
      <div class="reel-viewer-stage">
        <video class="reel-viewer-video" controls playsinline preload="none"></video>
      </div>
      <div class="reel-viewer-bottom">
        <button class="reel-viewer-btn reel-viewer-prev" type="button" aria-label="Previous reel">${icon("M15 18l-6-6 6-6")}</button>
        <p class="reel-viewer-counter" aria-live="polite"><span class="reel-viewer-current">01</span><span class="reel-viewer-total"> / ${pad(entries.length)}</span></p>
        <button class="reel-viewer-btn reel-viewer-next" type="button" aria-label="Next reel">${icon("M9 6l6 6-6 6")}</button>
      </div>`;
    body.appendChild(el);

    video = el.querySelector("video");
    video.setAttribute("controlsList", "nodownload noplaybackrate noremoteplayback");
    video.disablePictureInPicture = true;
    titleEl = el.querySelector(".reel-viewer-title");
    currentEl = el.querySelector(".reel-viewer-current");
    closeBtn = el.querySelector(".reel-viewer-close");

    closeBtn.addEventListener("click", close);
    el.querySelector(".reel-viewer-prev").addEventListener("click", () => step(-1));
    el.querySelector(".reel-viewer-next").addEventListener("click", () => step(1));
    // On the document, so keys still work if focus lands outside the dialog.
    document.addEventListener("keydown", (event) => {
      if (isOpen) onKey(event);
    });
    bindSwipe(el.querySelector(".reel-viewer-stage"));
  };

  // Play with sound (the visitor asked for it); if the browser refuses,
  // fall back to muted playback rather than nothing.
  const play = () => {
    video.muted = false;
    const playing = video.play();
    if (playing && playing.catch) {
      playing.catch((error) => {
        if (error && error.name === "NotAllowedError" && isOpen) {
          video.muted = true;
          video.play().catch(() => {});
        }
      });
    }
  };

  const show = (i, autoplay) => {
    index = (i + entries.length) % entries.length;
    const entry = entries[index];

    video.pause();
    video.replaceChildren(); // drop the previous reel's caption track
    if (entry.captions) {
      const track = document.createElement("track");
      track.kind = "captions";
      track.srclang = "en";
      track.label = "English";
      track.src = entry.captions;
      track.default = true;
      video.appendChild(track);
    }
    video.style.setProperty("--ar", String(entry.ratio || 9 / 16));
    video.poster = entry.poster || "";
    video.src = entry.src;
    video.setAttribute(
      "aria-label",
      `${entry.label || entry.title}${entry.brand ? `, ${entry.brand}` : ""}${entry.duration && formatDuration ? `, ${formatDuration(entry.duration)}` : ""}`
    );

    // Only hand-written brand/title text — empty when the reel has none.
    titleEl.textContent = [entry.brand, entry.title].filter(Boolean).join(" — ");
    currentEl.textContent = pad(index + 1);
    if (autoplay) play();
  };

  const step = (dir) => {
    if (isOpen) show(index + dir, true);
  };

  // --- Scroll lock: the page is pinned where it is, never scrolled -------

  const lockPage = () => {
    savedY = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `${-savedY}px`;
    body.style.left = "0";
    body.style.right = "0";
    root.classList.add("reel-viewer-open");
  };

  const unlockPage = () => {
    root.classList.remove("reel-viewer-open");
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    // "instant" overrides the site's smooth scroll-behavior.
    window.scrollTo({ top: savedY, left: 0, behavior: "instant" });
  };

  function open(i, from) {
    if (!el) build();
    trigger = from || null;
    // Pause anything else that's playing on the page.
    document.querySelectorAll("video").forEach((other) => {
      if (other !== video) other.pause();
    });
    if (!isOpen) lockPage();
    isOpen = true;
    el.hidden = false;
    // A frame later so the fade-in transition has a starting point.
    window.requestAnimationFrame(() => el.classList.add("is-open"));
    show(i, true); // still inside the tap, so playback is allowed
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    video.pause();
    // Cancel the download instead of just pausing it.
    video.removeAttribute("src");
    video.replaceChildren();
    video.load();
    el.classList.remove("is-open");
    const finish = () => {
      if (!isOpen) el.hidden = true;
    };
    if (reducedMotion.matches) finish();
    else window.setTimeout(finish, 180);
    unlockPage();
    trigger?.focus({ preventScroll: true });
  }

  // --- Keyboard: shortcuts, plus a focus trap ----------------------------

  function onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const onButton = event.target instanceof HTMLButtonElement;
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "ArrowLeft":
      case "ArrowRight":
        // On the video itself the arrows seek; elsewhere they change reel.
        if (event.target === video) return;
        event.preventDefault();
        step(event.key === "ArrowRight" ? 1 : -1);
        return;
      case " ":
      case "k":
      case "K":
        if (onButton && event.key === " ") return; // Space presses buttons
        if (event.target === video && event.key === " ") return; // native toggle
        event.preventDefault();
        if (video.paused) play();
        else video.pause();
        return;
      case "m":
      case "M":
        event.preventDefault();
        video.muted = !video.muted;
        return;
      case "Tab": {
        const stops = [...el.querySelectorAll("button, video")];
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (!el.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      default:
    }
  }

  // --- Swipe ---------------------------------------------------------------

  const CONTROL_STRIP = 64; // px at the bottom of the video owned by its controls

  function bindSwipe(stage) {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    stage.addEventListener(
      "touchstart",
      (event) => {
        tracking = false;
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        const rect = video.getBoundingClientRect();
        if (touch.clientY > rect.bottom - CONTROL_STRIP) return;
        tracking = true;
        startX = touch.clientX;
        startY = touch.clientY;
      },
      { passive: true }
    );
    stage.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length > 1) tracking = false; // pinch, not swipe
      },
      { passive: true }
    );
    stage.addEventListener(
      "touchend",
      (event) => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        step(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  return { open, close };
};
