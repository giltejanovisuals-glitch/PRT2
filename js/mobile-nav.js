/*
 * Mobile full-screen menu (#primary-nav), shared by every page. The page
 * scripts still open and close it; this adds:
 * - a sun/moon theme switch beside the close button. It presses the
 *   header's .theme-toggle, so the theme, its saved preference and the
 *   header button's own label all stay handled in one place; this switch
 *   just mirrors the icon, aria-pressed and aria-label.
 * - a brief, smooth colour transition whenever the theme changes.
 * - aria-current and the teal marker on the link for the page being viewed
 *   (sub-pages: the section their dock's home link returns to).
 * - background scroll lock (html + body .menu-open) while the menu is open.
 */
(() => {
  const nav = document.getElementById("primary-nav");
  const head = nav && nav.querySelector(".mobile-nav-head");
  const close = head && head.querySelector(".mobile-nav-close");
  if (!nav || !head || !close) return;

  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const headerToggle = document.querySelector(".site-header .theme-toggle");

  // --- Theme switch -----------------------------------------------------------

  if (headerToggle) {
    let fadeTimer = 0;
    // Colours ease for a moment instead of snapping (css: .theme-transition).
    headerToggle.addEventListener("click", () => {
      if (reducedMotionQuery.matches) return;
      root.classList.add("theme-transition");
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => root.classList.remove("theme-transition"), 450);
    });

    const themeSwitch = document.createElement("button");
    themeSwitch.type = "button";
    themeSwitch.className = "mobile-nav-theme";
    headerToggle.querySelectorAll(".theme-icon").forEach((icon) => themeSwitch.appendChild(icon.cloneNode(true)));

    const actions = document.createElement("div");
    actions.className = "mobile-nav-actions";
    close.replaceWith(actions);
    actions.append(themeSwitch, close);

    const sync = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      themeSwitch.setAttribute("aria-pressed", String(isDark));
      themeSwitch.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    };
    sync();
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    themeSwitch.addEventListener("click", () => headerToggle.click());
  }

  // --- Current page -------------------------------------------------------------

  const links = Array.from(nav.querySelectorAll(".mobile-nav-links a"));
  const home = document.querySelector(".nav-dock-item-home");
  if (home) {
    // Sub-pages: Project Gallery categories belong to #gallery, brand pages
    // to #work.
    const hash = new URL(home.getAttribute("href"), window.location.href).hash;
    links.forEach((link) => {
      if (!hash || !link.getAttribute("href").endsWith(hash)) return;
      link.classList.add("is-current");
      link.setAttribute("aria-current", "page");
    });
  } else {
    // Homepage: js/script.js marks the section in view with .is-current.
    const mirror = (link) => {
      if (link.classList.contains("is-current")) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    };
    const observer = new MutationObserver((records) => records.forEach((record) => mirror(record.target)));
    links.forEach((link) => {
      mirror(link);
      observer.observe(link, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // --- Scroll lock and menu button label ----------------------------------------

  // The header's round menu button stays above the open menu and doubles as
  // its close control, so its accessible name follows the state.
  const menuToggle = document.querySelector(".menu-toggle");
  new MutationObserver(() => {
    const open = nav.classList.contains("is-open");
    root.classList.toggle("menu-open", open);
    document.body.classList.toggle("menu-open", open);
    if (menuToggle) menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }).observe(nav, { attributes: true, attributeFilter: ["class"] });

  // --- Header backdrop ------------------------------------------------------------

  // Clear at the very top; once the page scrolls, the phone header's backdrop
  // turns to a soft blur (css: .header-scrolled).
  let scrollFrame = 0;
  const syncScrolled = () => {
    scrollFrame = 0;
    root.classList.toggle("header-scrolled", window.scrollY > 8);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(syncScrolled);
    },
    { passive: true }
  );
  syncScrolled();
})();
