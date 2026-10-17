/*
 * Brings visitors back to the spot they left on the homepage.
 *
 * The page opts out of the browser's own scroll restoration (see the inline
 * script in index.html's <head>), so this remembers the scroll position
 * whenever the visitor leaves for a Project Gallery page, and restores it
 * when they come back with the browser's Back button, or through a "back
 * to the gallery" link on those pages (js/return-trip.js). Any other
 * arrival — a fresh visit, the header's Work/About/Contact links — starts
 * where it normally would. Pages restored whole from the back/forward
 * cache already keep their position, so they're left alone.
 */
(() => {
  const POSITION = "home-scroll";
  const RETURN_REQUEST = "home-return";

  const save = () => {
    try {
      sessionStorage.setItem(POSITION, String(Math.round(window.scrollY)));
    } catch (e) {
      /* nothing to restore later */
    }
  };
  window.addEventListener("pagehide", save);
  // Also on the click itself, before anything else can move the page.
  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest && event.target.closest('a[href^="pages/"]')) save();
    },
    true
  );

  let requested = false;
  let saved = null;
  try {
    requested = sessionStorage.getItem(RETURN_REQUEST) === "1";
    sessionStorage.removeItem(RETURN_REQUEST);
    saved = sessionStorage.getItem(POSITION);
  } catch (e) {
    return;
  }
  const navigation = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  const backForward = navigation && navigation.type === "back_forward";
  const y = Number(saved);
  if ((!requested && !backForward) || saved === null || !Number.isFinite(y)) return;

  // Layout settles in steps (scripts building sections, then images), so
  // the position is applied again on load — unless the visitor has
  // started scrolling themselves by then.
  let touched = false;
  const stop = () => {
    touched = true;
  };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) =>
    window.addEventListener(type, stop, { passive: true, once: true })
  );
  const restore = () => {
    if (!touched) window.scrollTo({ top: y, left: 0, behavior: "instant" });
  };
  restore();
  window.requestAnimationFrame(restore);
  if (document.readyState === "complete") window.setTimeout(restore, 0);
  else window.addEventListener("load", () => window.requestAnimationFrame(restore), { once: true });
})();
