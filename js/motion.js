/*
 * Shared motion layer, loaded on every page (written into each <head> by
 * scripts/generate-page-transition.js). Tokens live in css/style.css
 * (--motion-fast / -standard / -slow, --motion-ease, --motion-rise,
 * --motion-stagger); the matching styles are under "Motion system" there.
 *
 * 1. Section reveals. Elements still below the fold when the page opens rise
 *    16px (12px on phones) and fade in once as they enter the viewport;
 *    items of one group stagger 70ms apart, at most four steps. Nothing is
 *    hidden unless this script runs, nothing already on screen is hidden,
 *    and the reveal classes are removed afterwards so each element's own
 *    hover and focus transitions are untouched. Sections with their own
 *    entrance (About, the timeline, the phone-only modules) are left alone.
 *
 * 2. The desktop nav's active-section indicator: one teal line that glides
 *    (transform only) to whichever link is current.
 *
 * Off for reduced motion and data saving (reveals) — content simply shows.
 */
(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedData = window.matchMedia("(prefers-reduced-data: reduce)");
  const phone = window.matchMedia("(max-width: 760px)");
  const lite = () => reducedMotion.matches || reducedData.matches || Boolean(navigator.connection && navigator.connection.saveData);

  // --- 1. Section reveals ------------------------------------------------------

  // [selector, desktop only?]. Each match of a selector containing a space
  // after a container is one stagger group (children of the same parent).
  const TARGETS = [
    [".showcase-intro", false],
    [".showcase-panels", true],
    [".profile-block-head", false],
    [".cap-track > .cap-card", true],
    [".dock-body", true],
    [".brands-track", true],
    [".found-body > .found-item", true],
    [".cta-build > .cta-label, .cta-build > .cta-heading, .cta-build > .cta-actions", false],
  ];
  const STEP_MS = 70;
  const MAX_STEPS = 4;
  // Items inside a horizontal scroller reveal together when the scroller
  // enters the viewport (cards beyond its visible edge never would).
  const SCROLLERS = ".cap-track, .brands-track";

  const setUpReveals = () => {
    if (lite() || !("IntersectionObserver" in window)) return;
    const fold = window.innerHeight;
    const pending = [];
    const triggers = new Map(); // observed element → elements it reveals
    TARGETS.forEach(([selector, desktopOnly]) => {
      if (desktopOnly && phone.matches) return;
      const counts = new Map();
      document.querySelectorAll(selector).forEach((el) => {
        // Not rendered (other layout) or already on screen: leave it be.
        if (!el.getClientRects().length || el.getBoundingClientRect().top < fold) return;
        const group = el.parentElement;
        const index = counts.get(group) || 0;
        counts.set(group, index + 1);
        el.style.setProperty("--rv-delay", `${Math.min(index, MAX_STEPS) * STEP_MS}ms`);
        el.classList.add("rv");
        pending.push(el);
        const trigger = el.parentElement.closest(SCROLLERS) || el;
        if (!triggers.has(trigger)) triggers.set(trigger, []);
        triggers.get(trigger).push(el);
      });
    });
    if (!pending.length) return;

    const finish = (el) => {
      el.classList.remove("rv", "is-in");
      el.style.removeProperty("--rv-delay");
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          (triggers.get(entry.target) || []).forEach((el) => {
            el.classList.add("is-in");
            const done = (event) => {
              if (event && (event.target !== el || event.propertyName !== "opacity")) return;
              el.removeEventListener("transitionend", done);
              finish(el);
            };
            el.addEventListener("transitionend", done);
            window.setTimeout(done, 1200); // in case transitionend never comes
          });
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    triggers.forEach((_, trigger) => observer.observe(trigger));
    // Printing, or a jump link landing mid-page: show everything at once.
    window.addEventListener("beforeprint", () => pending.forEach(finish));
  };

  // --- 2. Desktop nav indicator ----------------------------------------------------

  const setUpNavIndicator = () => {
    const nav = document.querySelector(".floating-nav");
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll(".mobile-nav-links a"));
    if (!links.length) return;
    const bar = document.createElement("span");
    bar.className = "nav-indicator";
    bar.setAttribute("aria-hidden", "true");
    nav.appendChild(bar);

    let frame = 0;
    const place = () => {
      frame = 0;
      const current = links.find((link) => link.classList.contains("is-current") || link.getAttribute("aria-current") === "page");
      if (!current || phone.matches || !current.getClientRects().length) {
        bar.classList.remove("is-on");
        return;
      }
      const navBox = nav.getBoundingClientRect();
      const box = current.getBoundingClientRect();
      bar.style.transform = `translate3d(${(box.left - navBox.left).toFixed(1)}px, 0, 0) scaleX(${box.width.toFixed(1)})`;
      bar.classList.add("is-on");
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(place);
    };
    const observer = new MutationObserver(schedule);
    links.forEach((link) => observer.observe(link, { attributes: true, attributeFilter: ["class", "aria-current"] }));
    window.addEventListener("resize", schedule, { passive: true });
    window.i18n?.onChange?.(schedule); // labels change width with the language
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  };

  const start = () => {
    setUpReveals();
    setUpNavIndicator();
  };
  // After every deferred page script (and any restored scroll position).
  if (document.readyState !== "complete") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
