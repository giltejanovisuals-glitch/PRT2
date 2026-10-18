/*
 * Project navigation — the shared prev / home / next controls on every
 * Project Gallery page, styled as the homepage navbar (css/project-
 * gallery.css). Marks a link that points at the page being viewed with
 * aria-current="page". It runs after the page scripts (all deferred), so
 * the prev/next hrefs they fill in are already set.
 */
(() => {
  const dock = document.querySelector(".nav-dock");
  if (!dock) return;
  const items = [...dock.querySelectorAll(".nav-dock-item")];
  if (!items.length) return;

  // --- Current page ---------------------------------------------------------

  const markCurrent = () => {
    items.forEach((item) => {
      const raw = item.getAttribute("href") || "";
      if (!raw || raw.startsWith("#")) return;
      let url;
      try {
        url = new URL(raw, window.location.href);
      } catch (e) {
        return;
      }
      const here = url.pathname === window.location.pathname && !url.hash;
      if (here) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", markCurrent);
  else markCurrent();
})();
