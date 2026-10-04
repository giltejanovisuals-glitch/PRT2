/*
 * Landing hero image wall (index.html, .hero-parallax; styles in
 * css/hero-parallax.css). A vanilla take on the HeroParallax pattern:
 *
 * - On every visit the three rows are filled with a random pick of
 *   Project Gallery images (window.HOME_GALLERY_PREVIEWS, from
 *   js/home-previews.js, which must load first). Each category is
 *   shuffled and drawn round-robin, so all of them show up. Every card
 *   links to its category page and, on hover/focus, names it; names and
 *   links come from the Project Gallery panels further down the page.
 * - Progress runs 0 → 1 from the section's top reaching the top of the
 *   viewport to its bottom reaching it (framer-motion's
 *   useScroll({ offset: ["start start", "end start"] })).
 * - Over progress 0 → 0.2 the wall untilts (rotateX 15° → 0, rotateZ
 *   20° → 0), fades in (0.2 → 1), and drops from above the intro copy to
 *   below it. Over the whole range, rows 1 and 3 slide right and row 2
 *   slides left.
 * - Every value chases its target through a spring (stiffness 300,
 *   damping 30, mass 1, as in the original), so motion settles softly
 *   instead of tracking the scrollbar rigidly. The loop only runs while
 *   something is still moving.
 * - Distances scale with the viewport (the original's px values are tuned
 *   for roughly 1440 × 900).
 * - prefers-reduced-motion: no motion at all; the CSS shows each row as a
 *   plain horizontal strip instead.
 */
(() => {
  const section = document.querySelector(".hero-parallax");
  const wall = section?.querySelector(".hpx-wall");
  if (!section || !wall) return;
  const rowEls = Array.from(wall.querySelectorAll(".hpx-row"));
  const mobileViewport = window.matchMedia("(max-width: 760px)");

  // --- Fill the rows with random gallery images ---

  const PER_ROW = 5;

  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const categoryInfo = (id) => {
    const panel = document.querySelector(`.showcase-panel[data-category="${id}"]`);
    return {
      title: panel?.querySelector(".showcase-panel-name")?.textContent.trim() || id,
      href: panel?.dataset.href || `pages/${id}.html`,
    };
  };

  const pickImages = (count) => {
    const previews = window.HOME_GALLERY_PREVIEWS || {};
    const pools = shuffle(Object.keys(previews))
      .map((id) => ({ id, srcs: shuffle(previews[id] || []) }))
      .filter((pool) => pool.srcs.length);
    const picks = [];
    while (picks.length < count && pools.some((pool) => pool.srcs.length)) {
      pools.forEach((pool) => {
        if (picks.length < count && pool.srcs.length) picks.push({ id: pool.id, src: pool.srcs.pop() });
      });
    }
    return shuffle(picks);
  };

  const makeCard = ({ id, src }) => {
    const { title, href } = categoryInfo(id);
    const card = document.createElement("a");
    card.className = "pc-card";
    card.href = href;
    card.setAttribute("aria-label", `${title} — Project Gallery`);
    const img = document.createElement("img");
    // Size the card to the image's own ratio so it shows uncropped.
    img.addEventListener(
      "load",
      () => {
        if (img.naturalWidth && img.naturalHeight) {
          card.style.setProperty("--pc-ratio", `${img.naturalWidth} / ${img.naturalHeight}`);
        }
      },
      { once: true }
    );
    img.src = src;
    img.alt = "";
    img.decoding = "async";
    const label = document.createElement("span");
    label.className = "pc-title";
    label.setAttribute("aria-hidden", "true");
    const kicker = document.createElement("small");
    kicker.textContent = "Project Gallery";
    label.append(kicker, title);
    card.append(img, label);
    return card;
  };

  let wallReady = false;
  const fillWall = () => {
    if (wallReady || mobileViewport.matches) return;
    const picks = pickImages(rowEls.length * PER_ROW);
    wall.hidden = !picks.length;
    rowEls.forEach((row, r) => {
      picks.slice(r * PER_ROW, (r + 1) * PER_ROW).forEach((pick) => row.append(makeCard(pick)));
    });
    wallReady = true;
  };

  // --- Motion ---

  const rows = rowEls.map((el) => ({
    el,
    direction: Number(el.dataset.direction) || 1,
  }));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const STIFFNESS = 300;
  const DAMPING = 30;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  // useTransform with clamping: map progress p from [a, b] to [from, to].
  const map = (p, a, b, from, to) => from + (to - from) * clamp01((p - a) / (b - a));

  // --- Targets from scroll progress ---

  const targets = () => {
    const rect = section.getBoundingClientRect();
    const p = clamp01(-rect.top / (rect.height || 1));
    const sx = Math.min(1.1, Math.max(0.45, window.innerWidth / 1440));
    const sy = Math.min(1.2, Math.max(0.6, window.innerHeight / 900));
    return {
      x: map(p, 0, 1, 0, 1000 * sx),
      rotateX: map(p, 0, 0.2, 15, 0),
      rotateZ: map(p, 0, 0.2, 20, 0),
      y: map(p, 0, 0.2, -700 * sy, 500 * sy),
      opacity: map(p, 0, 0.2, 0.2, 1),
    };
  };

  // --- Springs ---

  const springs = {};
  const resetSprings = () => {
    const t = targets();
    Object.keys(t).forEach((key) => {
      springs[key] = { value: t[key], velocity: 0 };
    });
  };

  // Semi-implicit Euler in small fixed steps stays stable at this
  // stiffness even when a frame is late.
  const advance = (spring, target, dt) => {
    let remaining = Math.min(dt, 0.064);
    while (remaining > 0) {
      const h = Math.min(remaining, 1 / 240);
      const accel = -STIFFNESS * (spring.value - target) - DAMPING * spring.velocity;
      spring.velocity += accel * h;
      spring.value += spring.velocity * h;
      remaining -= h;
    }
  };

  const paint = () => {
    const s = springs;
    wall.style.transform = `translateY(${s.y.value.toFixed(1)}px) rotateX(${s.rotateX.value.toFixed(3)}deg) rotateZ(${s.rotateZ.value.toFixed(3)}deg)`;
    wall.style.opacity = clamp01(s.opacity.value).toFixed(3);
    rows.forEach((row) => {
      row.el.style.transform = `translate3d(${(row.direction * s.x.value).toFixed(1)}px, 0, 0)`;
    });
  };

  let frame = 0;
  let lastTime = 0;
  const tick = (now) => {
    const dt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    const t = targets();
    let moving = false;
    Object.keys(t).forEach((key) => {
      const spring = springs[key];
      advance(spring, t[key], dt);
      const tolerance = key === "opacity" ? 0.001 : 0.05;
      if (Math.abs(spring.value - t[key]) > tolerance || Math.abs(spring.velocity) > tolerance) {
        moving = true;
      } else {
        spring.value = t[key];
        spring.velocity = 0;
      }
    });
    paint();
    frame = moving ? window.requestAnimationFrame(tick) : 0;
    if (!frame) lastTime = 0;
  };

  const wake = () => {
    if (!frame && section.classList.contains("is-live")) frame = window.requestAnimationFrame(tick);
  };

  // --- Motion on/off ---

  const clearStyles = () => {
    wall.style.transform = "";
    wall.style.opacity = "";
    rows.forEach((row) => {
      row.el.style.transform = "";
    });
  };

  const applyMotion = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (reducedMotion.matches || mobileViewport.matches) {
      section.classList.remove("is-live");
      clearStyles();
      return;
    }
    section.classList.add("is-live");
    resetSprings(); // start at rest on the current scroll position
    paint();
  };

  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", () => { fillWall(); applyMotion(); });
  reducedMotion.addEventListener("change", applyMotion);
  mobileViewport.addEventListener("change", () => { fillWall(); applyMotion(); });

  fillWall();
  applyMotion();
})();
