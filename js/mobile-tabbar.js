/*
 * Main mobile section bar (css/mobile-tabbar.css). Each item is a plain
 * in-page link, so tapping scrolls to its section (smoothly, via the page's
 * scroll-behavior; instantly under prefers-reduced-motion). As sections
 * pass through the middle of the screen, the matching item becomes current
 * (aria-current="location"). After a tap, the tapped item stays current
 * while the page travels there, so the highlight doesn't flicker through
 * every section on the way.
 */
(() => {
  const bar = document.querySelector(".mobile-tabbar");
  if (!bar || !("IntersectionObserver" in window)) return;

  const items = Array.from(bar.querySelectorAll(".mobile-tabbar-item"));
  const sections = items.map((item) => document.getElementById(item.dataset.section));

  let travelling = false;
  let travelTimer = 0;

  const setCurrent = (id) => {
    items.forEach((item) => {
      if (item.dataset.section === id) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
  };

  const endTravel = () => {
    travelling = false;
    window.clearTimeout(travelTimer);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (travelling) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    },
    // A thin band across the middle of the screen decides the section.
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  sections.forEach((section) => section && observer.observe(section));

  items.forEach((item) => {
    item.addEventListener("click", () => {
      setCurrent(item.dataset.section);
      travelling = true;
      window.clearTimeout(travelTimer);
      // scrollend where supported; a timeout covers the rest.
      travelTimer = window.setTimeout(endTravel, 1200);
    });
  });
  window.addEventListener("scrollend", endTravel);
  // A finger on the screen means the visitor has taken over.
  window.addEventListener("touchstart", endTravel, { passive: true });

  // At the very top, the first section is current.
  setCurrent(items[0].dataset.section);
})();
