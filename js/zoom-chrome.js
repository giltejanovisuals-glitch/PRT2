/*
 * Tuck-away bottom bars for short viewports (css/zoom-resilience.css).
 *
 * When the viewport is 480px tall or less (a desktop zoomed past ~200%, or
 * a phone held sideways) the homepage tab bar and the project pages' dock
 * would cover a large share of the screen. Scrolling down tucks them away
 * (html.chrome-tucked); scrolling up, reaching the end of the page, or
 * moving keyboard focus into a bar brings them back. Taller viewports never
 * get the class, so nothing changes there.
 */
(() => {
  const root = document.documentElement;
  const short = window.matchMedia("(max-height: 480px)");
  const THRESHOLD = 8; // px of travel before a direction counts
  let lastY = window.scrollY;
  let ticking = false;

  const setTucked = (tucked) => root.classList.toggle("chrome-tucked", tucked);

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    if (!short.matches) {
      setTucked(false);
      lastY = y;
      return;
    }
    const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
    if (y <= 0 || atEnd) setTucked(false);
    else if (y - lastY > THRESHOLD) setTucked(true);
    else if (lastY - y > THRESHOLD) setTucked(false);
    else return; // small jitter: keep the current state and reference point
    lastY = y;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  short.addEventListener("change", update);
  // A bar receiving keyboard focus always shows (CSS :focus-within also
  // keeps it visible); clear the state so it stays put after focus leaves.
  document.addEventListener("focusin", (event) => {
    if (event.target.closest?.(".mobile-tabbar, .nav-dock")) setTucked(false);
  });
})();
