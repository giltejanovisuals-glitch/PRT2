/* Page-transition boot. Inlined into every page's <head> by
   scripts/generate-page-transition.js (edit here, then `npm run build`), so
   it runs before the overlay is parsed. Skips the intro for Back/Forward,
   ?open= links straight to a piece, and reduced motion; otherwise marks
   <html class="pt-intro"> and blocks scroll input until the overlay is done
   (js/page-transition.js calls __ptEnd; a timeout guarantees it). */
(function () {
  var root = document.documentElement;
  var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ((nav && nav.type === "back_forward") || /[?&]open=/.test(location.search) || reduced) {
    root.classList.add("pt-skip");
    return;
  }
  root.classList.add("pt-intro");
  var keys = { " ": 1, ArrowUp: 1, ArrowDown: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1 };
  var types = ["wheel", "touchmove", "keydown"];
  var options = { passive: false, capture: true };
  var block = function (event) {
    if (event.type !== "keydown" || keys[event.key]) event.preventDefault();
  };
  types.forEach(function (type) {
    window.addEventListener(type, block, options);
  });
  var ended = false;
  window.__ptEnd = function () {
    if (ended) return;
    ended = true;
    root.classList.remove("pt-intro");
    types.forEach(function (type) {
      window.removeEventListener(type, block, options);
    });
  };
  setTimeout(window.__ptEnd, 3000);
})();
