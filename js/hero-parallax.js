/*
 * Landing hero image wall (index.html, .hero-parallax; styles in
 * css/hero-parallax.css). A vanilla take on the HeroParallax pattern:
 *
 * - On every visit the three rows are filled with a random pick from every
 *   project in the Project Gallery (js/home-visual-pool.js, which must
 *   load first; js/home-previews.js is the fallback). Each category is
 *   shuffled and drawn round-robin, so all of them show up, and no image
 *   repeats. Every card opens its piece on the category page and, on
 *   hover/focus, names the category; names come from the Project Gallery
 *   panels further down the page.
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

  // Five cards fill a row at 100% zoom on a typical laptop. A wider CSS
  // viewport (a large screen, or the browser zoomed out) gets more, so the
  // sliding rows never run out and leave a bare edge. Cards are roughly
  // 24rem wide, and the rows travel up to ~1100px sideways.
  const perRow = () => Math.max(5, Math.min(12, Math.round((window.innerWidth + 1100) / 500)));

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

  // Drawn from every project (js/home-visual-pool.js); the older sampled
  // previews are only a fallback if that file isn't loaded.
  const shown = [];
  const pickImages = (count) => {
    if (window.homeVisualPool) {
      const picks = window.homeVisualPool.pick(count, { exclude: shown });
      shown.push(...picks.map((pick) => pick.key));
      return picks.map((pick) => ({ id: pick.category, src: pick.src, href: pick.href, video: pick.video }));
    }
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

  // Card labels in the active language (js/i18n.js); English otherwise.
  const I18N = window.i18n;
  const cardTitle = (id) => (I18N && I18N.has(`category.${id}.title`) ? I18N.t(`category.${id}.title`) : categoryInfo(id).title);
  const kickerText = () => (I18N ? I18N.t("gallery.title", null, "Project Gallery") : "Project Gallery");
  const cardLabel = (title) => (I18N ? I18N.t("hero.cardLabel", { title }, `${title} — Project Gallery`) : `${title} — Project Gallery`);
  const labelCard = (card) => {
    const title = cardTitle(card.dataset.category);
    card.setAttribute("aria-label", cardLabel(title));
    const label = card.querySelector(".pc-title");
    if (label) label.replaceChildren(Object.assign(document.createElement("small"), { textContent: kickerText() }), title);
  };
  I18N?.onChange(() => document.querySelectorAll(".pc-card[data-category]").forEach(labelCard));

  // --- Reel previews ---
  // A reel card streams its reel muted over the poster and loops the
  // opening seconds while the card is on screen; it pauses off screen, in a
  // hidden tab, and never runs under reduced motion or reduced data.
  const PREVIEW_SECONDS = window.homeVisualPool?.PREVIEW_SECONDS || 8;
  const connection = navigator.connection;
  const reducedData = window.matchMedia("(prefers-reduced-data: reduce)");
  const previewsAllowed = () =>
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !reducedData.matches &&
    !connection?.saveData &&
    !/2g$/.test(connection?.effectiveType || "") &&
    !mobileViewport.matches &&
    !document.hidden;
  const reelVideos = new Set();
  const syncReel = (video) => {
    if (video.dataset.inView === "1" && previewsAllowed()) {
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      video.play()?.catch?.(() => { /* the poster stays */ });
    } else {
      video.pause();
    }
  };
  const syncReels = () => reelVideos.forEach(syncReel);
  const reelObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const video = entry.target.querySelector("video");
            if (!video) return;
            video.dataset.inView = entry.isIntersecting ? "1" : "0";
            syncReel(video);
          });
        })
      : null;
  document.addEventListener("visibilitychange", syncReels);

  const addReel = (card, src, poster) => {
    if (!reelObserver) return;
    const video = document.createElement("video");
    video.className = "pc-reel";
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.preload = "none";
    video.poster = poster;
    video.disablePictureInPicture = true;
    video.tabIndex = -1;
    video.dataset.src = src;
    video.addEventListener("playing", () => card.classList.add("is-playing"));
    video.addEventListener("timeupdate", () => {
      if (video.currentTime >= PREVIEW_SECONDS) video.currentTime = 0;
    });
    card.insertBefore(video, card.querySelector(".pc-title"));
    reelVideos.add(video);
    reelObserver.observe(card);
  };

  const makeCard = ({ id, src, href: deepLink, video }) => {
    const href = deepLink || categoryInfo(id).href;
    const title = cardTitle(id);
    const card = document.createElement("a");
    card.className = "pc-card";
    card.href = href;
    card.dataset.category = id;
    card.setAttribute("aria-label", cardLabel(title));
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
    kicker.textContent = kickerText();
    label.append(kicker, title);
    card.append(img, label);
    if (video) addReel(card, video, src);
    return card;
  };

  // Fills the rows on first run; later calls (a resize, or zooming out) only
  // top each row up to the count the new width needs, never removing cards.
  let filledPerRow = 0;
  const fillWall = () => {
    if (mobileViewport.matches) return;
    const want = perRow();
    if (want <= filledPerRow) return;
    const missing = want - filledPerRow;
    const picks = pickImages(rowEls.length * missing);
    if (!filledPerRow) wall.hidden = !picks.length;
    rowEls.forEach((row, r) => {
      picks.slice(r * missing, (r + 1) * missing).forEach((pick) => row.append(makeCard(pick)));
    });
    filledPerRow = want;
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

  // --- Pointer depth (desktop mouse only) ---
  // The wall drifts up to ~10px horizontally and ~7px vertically toward the
  // pointer, the middle row a little less, for gentle depth; the headline
  // never moves. Touch and pen input are ignored.
  const PARALLAX_X = 10;
  const PARALLAX_Y = 7;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const pointer = { x: 0, y: 0 };

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
      px: pointer.x * PARALLAX_X,
      py: pointer.y * PARALLAX_Y,
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
    wall.style.transform = `translate3d(${s.px.value.toFixed(2)}px, ${(s.y.value + s.py.value).toFixed(1)}px, 0) rotateX(${s.rotateX.value.toFixed(3)}deg) rotateZ(${s.rotateZ.value.toFixed(3)}deg)`;
    wall.style.opacity = clamp01(s.opacity.value).toFixed(3);
    rows.forEach((row, i) => {
      // The middle row sits slightly "further back": it follows the pointer less.
      const depth = i === 1 ? -0.35 * s.px.value : 0;
      row.el.style.transform = `translate3d(${(row.direction * s.x.value + depth).toFixed(1)}px, 0, 0)`;
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

  section.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse" || !finePointer.matches) return;
      const rect = section.getBoundingClientRect();
      const height = Math.min(rect.height, window.innerHeight) || 1;
      pointer.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / (rect.width || 1) - 0.5) * 2));
      pointer.y = Math.max(-1, Math.min(1, ((event.clientY - Math.max(rect.top, 0)) / height - 0.5) * 2));
      wake();
    },
    { passive: true }
  );
  section.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    wake();
  });
  window.addEventListener("resize", () => { fillWall(); applyMotion(); });
  reducedMotion.addEventListener("change", () => { applyMotion(); syncReels(); });
  mobileViewport.addEventListener("change", () => { fillWall(); applyMotion(); syncReels(); });

  fillWall();
  applyMotion();
})();
