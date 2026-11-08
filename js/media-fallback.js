/*
 * Missing-media safety net, loaded (deferred, so it never delays the first
 * paint) on every page, so a file that fails to load never shows the
 * browser's broken-image icon, its alt text, or an empty dark tile. Images
 * that already failed before it ran are caught by a sweep at start-up.
 *
 * - Any <img> that fails is hidden (visibility only, so layout never jumps).
 *   If a page script then retries it with another file (the showcases fall
 *   back from a thumbnail to the original, for example) and that loads, it
 *   is shown again.
 * - A tile that exists only to show that one image (MEDIA_TILES) is taken
 *   out of the layout instead, so no empty space is left behind.
 * - Elements that handle their own failure keep doing so: brand logos swap
 *   to their text name, publication covers show a quiet label, and the
 *   mobile carousel and gallery cards swap in another picture.
 * - Missing files are logged to the console in development only (file://,
 *   localhost, or any page with ?debug); visitors never see a message.
 */
(() => {
  const DEV =
    location.protocol === "file:" ||
    /^(localhost|127(?:\.\d+){3}|\[::1\]|0\.0\.0\.0)$/.test(location.hostname) ||
    /[?&]debug\b/.test(location.search);

  // Tiles whose whole purpose is one image: removed when it is missing.
  const MEDIA_TILES = ".pc-card, .pbc-tile";

  const style = document.createElement("style");
  style.textContent =
    "img[data-media-missing]{visibility:hidden!important}" +
    ":is(" + MEDIA_TILES + "):has(img[data-media-missing]){display:none!important}";
  document.head.appendChild(style);

  const srcOf = (el) => el.currentSrc || el.getAttribute("src") || "";
  const logged = new Set();
  const report = (el) => {
    if (!DEV) return;
    const url = srcOf(el);
    if (!url || logged.has(url)) return;
    logged.add(url);
    console.warn("[media] missing file:", url, el);
  };

  document.addEventListener(
    "error",
    (event) => {
      const el = event.target;
      if (!(el instanceof HTMLImageElement)) {
        if (el instanceof HTMLVideoElement || el instanceof HTMLSourceElement) report(el);
        return;
      }
      // An <img> with no source yet (filled in later by a script) is not missing.
      if (!el.getAttribute("src") && !el.getAttribute("srcset")) return;
      el.setAttribute("data-media-missing", "");
      report(el);
    },
    true
  );

  document.addEventListener(
    "load",
    (event) => {
      const el = event.target;
      if (el instanceof HTMLImageElement && el.hasAttribute("data-media-missing")) el.removeAttribute("data-media-missing");
    },
    true
  );

  // Deferred: images that failed while the page was still parsing.
  Array.prototype.forEach.call(document.images, (img) => {
    if (img.complete && img.naturalWidth === 0 && (img.getAttribute("src") || img.getAttribute("srcset"))) {
      img.setAttribute("data-media-missing", "");
      report(img);
    }
  });

  window.mediaFallback = { dev: DEV, report };
})();
