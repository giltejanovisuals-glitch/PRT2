/* Page-transition boot. Inlined into every page's <head> by
   scripts/generate-page-transition.js (edit here, then `npm run build`), so
   it runs before the overlay is parsed.

   - Marks <html class="js">: styles that hide content until a script
     reveals it are scoped to it, so nothing stays hidden if scripts fail.
   - The branded intro (<html class="pt-intro">, about 2s, CSS only) plays
     once per browsing session: never again on later pages, never for
     Back/Forward, ?open= links straight to a piece, reduced motion or
     data saving. It never blocks input; the overlay ignores the pointer.
   - Arriving at a Project Gallery page from another page of this site
     afterwards, its overlay holds the number, title and line the leaving
     page's cover brought in (<html class="pt-intro pt-continue">, ~1.4s).
   - Arriving at any other page from this site, the page fades in briefly
     (<html class="pt-arrive">) from the leaving page's cover. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var backForward = nav && nav.type === "back_forward";
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var seen = false;
  try {
    seen = sessionStorage.getItem("pt-seen") === "1";
    sessionStorage.setItem("pt-seen", "1");
  } catch (e) {}
  var internal = false;
  try {
    internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch (e) {}
  var direct = backForward || /[?&]open=/.test(location.search) || reduced || saveData;
  var project = /\/pages\/[a-z0-9-]+\.html$/.test(location.pathname);
  var resume = !direct && seen && internal && project;
  if (direct || (seen && !resume)) {
    root.classList.add("pt-skip");
    if (internal && !backForward && !reduced) root.classList.add("pt-arrive");
    return;
  }
  root.classList.add("pt-intro");
  if (resume) root.classList.add("pt-continue");
  // pt-continue stays: dropping it mid-animation (a late first paint) would
  // restart the overlay's timing and replay the entrance.
  window.__ptEnd = function () {
    root.classList.remove("pt-intro");
  };
  setTimeout(window.__ptEnd, resume ? 1500 : 2300);
})();
