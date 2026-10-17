/*
 * Contextual dock button, shared by every brand and Project Gallery page.
 * The dock's home link (marked data-context in the page — Project Gallery
 * or Brand Applications) stays a real link, so it works without scripts.
 * While the page intro (.project-header) is on screen it keeps its own
 * "Back to …" label; once the intro has scrolled above the viewport its
 * icon and label turn into "Back to Top" (css/project-gallery.css) and a tap
 * returns to the page header — smoothly, or instantly under
 * prefers-reduced-motion. During that return it stays "Back to Top" until
 * the top is reached, then becomes the home link again. Pages locked to
 * the viewport never scroll, so there it simply stays the home link.
 */
(() => {
  const button = document.querySelector(".nav-dock-item[data-context]");
  const intro = document.querySelector(".project-header");
  if (!button || !intro || !("IntersectionObserver" in window)) return;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const LABELS = { gallery: button.getAttribute("aria-label"), top: "Back to top of page" };

  let introPassed = false;
  let returning = false; // scrolling back up after a "Back to Top" tap
  let returnTimer = 0;

  const render = () => {
    const state = introPassed || returning ? "top" : "gallery";
    if (button.dataset.context === state) return;
    button.dataset.context = state;
    button.setAttribute("aria-label", LABELS[state]);
    // As "Back to Top" it acts on the page rather than navigating.
    if (state === "top") button.setAttribute("role", "button");
    else button.removeAttribute("role");
  };

  const finishReturn = () => {
    window.clearTimeout(returnTimer);
    returning = false;
    render();
  };

  new IntersectionObserver(([entry]) => {
    introPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    render();
  }).observe(intro);

  window.addEventListener(
    "scroll",
    () => {
      if (returning && window.scrollY <= 2) finishReturn();
    },
    { passive: true }
  );

  const backToTop = () => {
    returning = true;
    render();
    // Fallback in case the scroll is interrupted before reaching the top.
    window.clearTimeout(returnTimer);
    returnTimer = window.setTimeout(finishReturn, 1600);
    window.scrollTo({ top: 0, behavior: reducedMotionQuery.matches ? "auto" : "smooth" });
    if (window.scrollY <= 2) finishReturn();
    const brand = document.querySelector(".site-header .brand");
    if (brand) brand.focus({ preventScroll: true });
  };

  button.addEventListener("click", (event) => {
    if (button.dataset.context !== "top") return; // follow the gallery link
    event.preventDefault();
    backToTop();
  });

  // role="button" promises Space activation too.
  button.addEventListener("keydown", (event) => {
    if (event.key !== " " || button.dataset.context !== "top") return;
    event.preventDefault();
    backToTop();
  });

  render();
})();
