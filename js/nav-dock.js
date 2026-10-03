/*
 * Floating Mac-style dock — the shared prev / home / next navigation on
 * every brand and Project Gallery page (styles in css/project-gallery.css).
 *
 * - Marks a dock link that points at the page being viewed with
 *   aria-current="page". It runs after the page scripts (all deferred), so
 *   the prev/next hrefs they fill in are already set.
 * - On a fine pointer with motion allowed, magnifies the control nearest
 *   the cursor and, to a lesser degree, its neighbours: each control's
 *   "focus" follows a damped spring toward a target that falls off with
 *   horizontal distance from the cursor. The spring value drives
 *   --dock-scale, --dock-lift and --dock-grow (extra margin matching the
 *   scale, so magnified controls push apart instead of overlapping).
 *   Keyboard focus magnifies the focused control the same way.
 * - Phones, touch-only devices and prefers-reduced-motion get a still dock.
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

  // --- Magnification --------------------------------------------------------

  const MAX_SCALE = 1.16; // the control under the cursor
  const MAX_LIFT = 7; // px it rises
  const RANGE = 150; // px from a control's centre at which its pull fades out
  const FOCUS_NEIGHBOUR = 0.3; // neighbours of a keyboard-focused control
  // Spring: stiff enough to feel immediate, damped to settle with only the
  // slightest overshoot.
  const STIFFNESS = 320;
  const DAMPING = 30;

  const motionQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 761px)");
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const enabled = () => motionQuery.matches && !reducedQuery.matches;

  const state = items.map(() => ({ p: 0, v: 0, target: 0 }));
  let centers = []; // resting centre x of each control, relative to the dock's centre
  let widths = [];
  let pointerX = null; // relative to the dock's resting centre, or null
  let focusIndex = -1;
  let rafId = null;
  let lastTime = 0;

  // Measure at rest (no magnification applied) so cursor maths isn't
  // thrown off by controls that have already grown.
  const measure = () => {
    const saved = items.map((item) => item.getAttribute("style"));
    items.forEach((item) => item.removeAttribute("style"));
    const dockRect = dock.getBoundingClientRect();
    const mid = dockRect.left + dockRect.width / 2;
    centers = items.map((item) => {
      const r = item.getBoundingClientRect();
      return r.left + r.width / 2 - mid;
    });
    widths = items.map((item) => item.offsetWidth);
    items.forEach((item, i) => {
      if (saved[i] !== null) item.setAttribute("style", saved[i]);
    });
  };

  const falloff = (distance) => {
    const t = Math.min(1, Math.abs(distance) / RANGE);
    return (Math.cos(Math.PI * t) + 1) / 2; // 1 at the centre, easing to 0
  };

  const setTargets = () => {
    state.forEach((s, i) => {
      let target = 0;
      if (pointerX !== null) target = falloff(pointerX - centers[i]);
      if (focusIndex >= 0) {
        const d = Math.abs(i - focusIndex);
        target = Math.max(target, d === 0 ? 1 : d === 1 ? FOCUS_NEIGHBOUR : 0);
      }
      s.target = target;
    });
  };

  const apply = (item, p, i) => {
    if (p === 0) {
      item.style.removeProperty("--dock-scale");
      item.style.removeProperty("--dock-lift");
      item.style.removeProperty("--dock-grow");
      return;
    }
    const scale = 1 + (MAX_SCALE - 1) * p;
    item.style.setProperty("--dock-scale", scale.toFixed(4));
    item.style.setProperty("--dock-lift", `${(-MAX_LIFT * p).toFixed(2)}px`);
    item.style.setProperty("--dock-grow", `${(((scale - 1) * widths[i]) / 2).toFixed(2)}px`);
  };

  const tick = (time) => {
    const dt = Math.min(1 / 30, (time - (lastTime || time)) / 1000);
    lastTime = time;
    let moving = false;
    state.forEach((s, i) => {
      const force = STIFFNESS * (s.target - s.p) - DAMPING * s.v;
      s.v += force * dt;
      s.p += s.v * dt;
      if (Math.abs(s.target - s.p) < 0.0005 && Math.abs(s.v) < 0.005) {
        s.p = s.target;
        s.v = 0;
      } else {
        moving = true;
      }
      apply(items[i], Math.max(0, s.p), i);
    });
    rafId = moving ? window.requestAnimationFrame(tick) : null;
  };

  const kick = () => {
    setTargets();
    if (rafId !== null) return;
    lastTime = 0;
    rafId = window.requestAnimationFrame(tick);
  };

  const reset = () => {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
    pointerX = null;
    state.forEach((s, i) => {
      s.p = s.v = s.target = 0;
      apply(items[i], 0, i);
    });
  };

  // Pointer position relative to the dock's resting centre. The dock grows
  // evenly about its centre, so its current centre stays put.
  const relativeX = (clientX) => {
    const r = dock.getBoundingClientRect();
    return clientX - (r.left + r.width / 2);
  };

  dock.addEventListener("pointerenter", (event) => {
    if (!enabled() || event.pointerType !== "mouse") return;
    if (rafId === null && state.every((s) => s.p === 0)) measure();
  });

  dock.addEventListener("pointermove", (event) => {
    if (!enabled() || event.pointerType !== "mouse") return;
    pointerX = relativeX(event.clientX);
    kick();
  });

  dock.addEventListener("pointerleave", () => {
    if (pointerX === null) return;
    pointerX = null;
    kick();
  });

  dock.addEventListener("focusin", (event) => {
    const i = items.indexOf(event.target.closest(".nav-dock-item"));
    if (i < 0 || !enabled() || !event.target.matches(":focus-visible")) return;
    if (rafId === null && state.every((s) => s.p === 0)) measure();
    focusIndex = i;
    kick();
  });

  dock.addEventListener("focusout", () => {
    if (focusIndex < 0) return;
    focusIndex = -1;
    kick();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state.every((s) => s.p === 0)) measure();
    }, 150);
  });

  const onModeChange = () => {
    reset();
    if (enabled()) measure();
  };
  motionQuery.addEventListener("change", onModeChange);
  reducedQuery.addEventListener("change", onModeChange);

  // Fonts change label widths; measure once they're ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => enabled() && measure());
  if (enabled()) measure();
})();
