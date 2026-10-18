/*
 * Muted inline previews over reel posters, shared by the phone reel library
 * on the Short-Form Video & Reels page (js/print-collateral-showcase.js)
 * and that category's card on the homepage (js/mobile-gallery.js).
 *
 *   const previews = window.createReelPreviews({ onMetadata, max });
 *   previews.add(host, src, poster)   host holds the poster <img>; src is
 *                                     ideally a short, light preview clip
 *   previews.clear()                  forget every host, drop every video
 *   previews.enabled()                false when previews are turned off
 *
 * A host gets its <video> (muted, playsinline, loop, preload="metadata")
 * only while some of it is on screen; once none of it is, the video is
 * removed and its download cancelled. Of the hosts that are clearly
 * visible (VISIBLE of the host, or of the screen for a host taller than
 * it), up to `max` play at once (default 1; the two-column reel library
 * uses 2, so both reels of a row play): those already playing keep their
 * place, the rest are filled nearest the middle of the screen first. A
 * chosen preview is marked `autoplay` and played; it keeps playing until
 * it drops below VISIBLE, the tab is hidden or the reel viewer opens, and
 * is then paused, unmarked and rewound. The poster stays underneath and
 * the video only fades in once frames are actually playing, so a slow or
 * failed load simply leaves the poster.
 *
 * Nothing plays under prefers-reduced-motion, prefers-reduced-data,
 * Save-Data or a 2G connection: the posters stay still, and a tap still
 * opens the full reel.
 */
window.createReelPreviews = ({ onMetadata, max = 1 } = {}) => {
  const VISIBLE = 0.6;
  const THRESHOLDS = Array.from({ length: 11 }, (_, i) => i / 10);
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedData = window.matchMedia("(prefers-reduced-data: reduce)");
  const connection = navigator.connection;

  const hosts = new Map(); // host -> { src, poster, visible, video, failed }
  const playing = new Set(); // hosts whose preview is playing
  let refused = false; // the browser won't autoplay muted video at all

  const enabled = () =>
    "IntersectionObserver" in window &&
    !refused &&
    !reduced.matches &&
    !reducedData.matches &&
    !(connection && (connection.saveData || /2g$/.test(connection.effectiveType || "")));

  // Also held back while the page-transition intro covers the page.
  const blocked = () =>
    document.hidden || root.classList.contains("reel-viewer-open") || root.classList.contains("pt-intro");

  const stop = (host) => {
    playing.delete(host);
    host.classList.remove("is-previewing");
    const video = hosts.get(host)?.video;
    if (!video) return;
    video.autoplay = false;
    video.pause();
    if (video.currentTime) video.currentTime = 0;
  };

  const detach = (host) => {
    stop(host);
    const item = hosts.get(host);
    if (!item || !item.video) return;
    item.video.removeAttribute("src");
    item.video.load(); // cancels the download
    item.video.remove();
    item.video = null;
  };

  const attach = (host) => {
    const item = hosts.get(host);
    if (item.video || item.failed) return;
    const video = document.createElement("video");
    video.className = "reel-preview";
    video.defaultMuted = true; // the `muted` attribute, which iOS needs
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = "metadata";
    if (item.poster) video.poster = item.poster;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.tabIndex = -1;
    video.setAttribute("aria-hidden", "true");
    video.addEventListener("playing", () => {
      if (playing.has(host)) host.classList.add("is-previewing");
    });
    video.addEventListener("loadedmetadata", () => {
      if (onMetadata && Number.isFinite(video.duration) && video.duration > 0) onMetadata(host, video.duration);
    }, { once: true });
    video.addEventListener("error", () => {
      if (item.video !== video) return;
      item.failed = true;
      detach(host);
      update();
    }, { once: true });
    video.src = item.src;
    const poster = host.querySelector("img");
    if (poster) poster.after(video);
    else host.prepend(video);
    item.video = video;
  };

  const start = (host) => {
    attach(host);
    const video = hosts.get(host).video;
    if (!video) return;
    playing.add(host);
    // Only a chosen preview is marked autoplay: on the merely-visible ones
    // it would start them (and fetch whole files) as soon as data arrived.
    video.autoplay = true;
    const started = video.play();
    if (started && started.catch) {
      started.catch((error) => {
        // e.g. iOS Low Power Mode: no muted autoplay anywhere, so stop trying.
        if (error && error.name === "NotAllowedError") refused = true;
        if (playing.has(host)) stop(host);
        if (refused) update();
      });
    }
  };

  // Up to `max` clearly visible hosts: those already playing keep their
  // place (no flicker between equally good candidates), then the nearest
  // to the middle of the screen — a row's two reels sit level, so they
  // fill the slots together.
  const choose = () => {
    const middle = window.innerHeight / 2;
    const distance = (host) => {
      const rect = host.getBoundingClientRect();
      return Math.abs(rect.top + rect.height / 2 - middle);
    };
    const clear = [...hosts].filter(([, item]) => item.visible >= VISIBLE && !item.failed).map(([host]) => host);
    const kept = clear.filter((host) => playing.has(host));
    const others = clear
      .filter((host) => !playing.has(host))
      .map((host) => [host, distance(host)])
      .sort((a, b) => a[1] - b[1])
      .map(([host]) => host);
    return new Set([...kept, ...others].slice(0, max));
  };

  function update() {
    if (!enabled()) {
      hosts.forEach((_, host) => detach(host));
      return;
    }
    hosts.forEach((item, host) => (item.visible > 0 ? attach(host) : detach(host)));
    const next = blocked() ? new Set() : choose();
    playing.forEach((host) => {
      if (!next.has(host)) stop(host);
    });
    next.forEach((host) => {
      if (!playing.has(host)) start(host);
    });
  }

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (seen) => {
            seen.forEach((entry) => {
              const item = hosts.get(entry.target);
              if (!item) return;
              const screen = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;
              const fullHeight = Math.min(entry.boundingClientRect.height, screen) || 1;
              item.visible = entry.isIntersecting ? entry.intersectionRect.height / fullHeight : 0;
            });
            update();
          },
          { threshold: THRESHOLDS }
        )
      : null;

  document.addEventListener("visibilitychange", update);
  reduced.addEventListener?.("change", update);
  reducedData.addEventListener?.("change", update);
  connection?.addEventListener?.("change", update);
  // The reel viewer and the page-transition intro mark <html>.
  if ("MutationObserver" in window) {
    new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ["class"] });
  }
  // Leaving the page (or entering the back/forward cache) stops everything;
  // coming back from the cache picks up where the visitor is now.
  window.addEventListener("pagehide", () => hosts.forEach((_, host) => detach(host)));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) update();
  });

  const add = (host, src, poster) => {
    if (!observer || !host || !src) return;
    hosts.set(host, { src, poster, visible: 0, video: null, failed: false });
    observer.observe(host);
  };

  const clear = () => {
    hosts.forEach((_, host) => {
      detach(host);
      observer.unobserve(host);
    });
    hosts.clear();
    playing.clear();
  };

  return { add, clear, enabled };
};
