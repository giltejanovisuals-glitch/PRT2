/* Mobile landing coverflow (css/mobile-featured.css). Shows the curated
   slides in js/mobile-featured-data.js (scripts/featured-slides.js) as 4:5
   cards: the active card centred and flat, its neighbours turned in and set
   back so they peek in from the sides. The order is fixed and loops.

   Interaction: horizontal drag (vertical gestures keep scrolling the page,
   touch-action: pan-y) with one-card snapping and a gentle fling of at most
   two cards; horizontal trackpad/wheel scrolling (Shift+wheel too);
   Left/Right arrow keys. Tapping a
   neighbour brings it to the centre; tapping the centred card opens its
   project (reels open the fullscreen viewer). A drag never opens anything.

   Motion: only transform and opacity, eased exponentially towards the
   target (settles in about half a second). Under reduced motion the 3D turn
   and depth are removed and moves snap. Autoplay (6.5s) pauses during
   touch, hover, focus, hidden tabs, offscreen scrolling, and the reel
   viewer; it waits for a reel preview to finish a pass before moving on,
   and stops for the visit after the first manual interaction. It never runs
   under reduced motion or reduced data.

   Media: the active card loads first, then its immediate neighbours; the
   rest load as they come near. Reel previews (light clips) play muted,
   inline, only on the active card while the carousel is on screen, and are
   stopped, rewound, and unloaded when it is left. */
(() => {
  const hero = document.querySelector('.hero-parallax');
  const root = hero?.querySelector('.mobile-featured');
  const data = window.MOBILE_FEATURED;
  if (!root || !data?.slides?.length) return;
  const slides = data.slides;
  const total = slides.length;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedData = matchMedia('(prefers-reduced-data: reduce)');
  const connection = navigator.connection;

  // Coverflow look (see css/mobile-featured.css for card size and perspective).
  const ROTATION = 34; // degrees, reduced on narrow or zoomed screens
  const DEPTH = 0.4; // how far neighbours sit back, in card widths
  const PERSPECTIVE = 4; // viewing distance, in card widths
  const FALLOFF = 0.6; // how quickly a card turns as it leaves the centre
  const FADE = 0.14; // how much neighbours fade towards the page colour
  const SPREAD = 0.6; // neighbour offset, in card widths
  const FAR = 0.22; // extra offset per card beyond the neighbours
  const FLAT_GAP = 16; // px between cards under reduced motion
  const SETTLE_MS = 105; // easing time constant (about 5x to settle)
  const MAX_FLING = 2;
  const DRAG_SLOP = 8;
  const AUTOPLAY_MS = 6500;
  const RETURN_KEY = 'featured-return';
  const REEL_BASE = 'assets/videos/short-form-reels/';
  const REEL_PAGE = 'pages/short-form-video-reels.html';
  const REEL_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"></rect><path d="M10 8.8v6.4l5.2-3.2z" fill="currentColor" stroke="none"></path></svg>';

  const frame = root.querySelector('.featured-frame');
  const track = root.querySelector('.featured-track');
  const status = root.querySelector('.featured-status');
  const titleEl = root.querySelector('.featured-title');
  const subtitleEl = root.querySelector('.featured-subtitle');
  const metaEl = root.querySelector('.featured-meta');
  const mod = (n) => ((n % total) + total) % total;
  const wrap = (d) => d - total * Math.round(d / total); // shortest way round

  // Copy in the active language (js/i18n.js), English otherwise. Brand
  // names and years are never translated.
  const I18N = window.i18n;
  const tr = (key, english) => (I18N && I18N.lang !== 'en' && I18N.has(key) ? I18N.t(key) : english);
  const fmt = (key, vars, english) => (I18N ? I18N.t(key, vars, english) : english);
  const text = (slide, field) => tr(`featured.${slide.id}.${field}`, slide[field] || '');
  const altText = (slide) => tr(`featured.item.${slide.visual}.alt`, slide.alt);
  const reelName = (slide) => tr(`featured.item.${slide.visual}.label`, slide.label);
  const reelLabel = (slide) => fmt('featured.playReel', { label: reelName(slide), duration: slide.duration, alt: altText(slide) }, `Play ${slide.label}, ${slide.duration}, in the fullscreen viewer. ${slide.alt}`);
  const slideLabel = (i) => fmt('featured.slideLabel', { index: i + 1, total, title: text(slides[i], 'title') }, `${i + 1} of ${total}: ${slides[i].title}`);
  const metaLine = (slide) => [slide.brand, text(slide, 'category'), slide.year].filter(Boolean).join(' · ');

  const lowData = () => reducedData.matches || !!connection?.saveData || /2g$/.test(connection?.effectiveType || '');
  const autoplayAllowed = () => !reduced.matches && !lowData();
  const previewsAllowed = () => autoplayAllowed() && 'IntersectionObserver' in window;

  let entries = [];
  let position = 0; // continuous, in cards
  let target = 0; // whole cards, unbounded (the order loops)
  let built = false;
  let destroyed = false;
  let raf = 0;
  let lastFrame = 0;
  let metrics = { card: 260, spacing: 156, far: 57, angle: ROTATION };
  const active = () => mod(target);

  // --- Cards ------------------------------------------------------------------------
  const makeImg = (slide, className) => {
    const img = document.createElement('img');
    img.className = className;
    img.width = slide.width;
    img.height = slide.height;
    img.decoding = 'async';
    img.draggable = false;
    return img;
  };
  const makeSlide = (slide) => {
    const el = document.createElement('div');
    el.className = 'featured-slide';
    el.dataset.id = slide.id;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-roledescription', fmt('a11y.slide', null, 'slide'));
    const video = slide.media === 'video';
    const card = document.createElement(video ? 'button' : 'a');
    card.className = `featured-card${slide.fill ? ' is-fill' : ''}`;
    card.style.setProperty('--placeholder', `url('${slide.placeholder}')`);
    if (video) {
      card.type = 'button';
      card.setAttribute('aria-label', reelLabel(slide));
    } else {
      card.href = slide.href;
    }
    if (slide.fill) {
      const backdrop = makeImg(slide, 'featured-backdrop');
      backdrop.alt = '';
      backdrop.setAttribute('aria-hidden', 'true');
      card.append(backdrop);
    }
    const img = makeImg(slide, 'featured-image');
    img.alt = video ? '' : altText(slide);
    card.append(img);
    if (video) {
      const badge = document.createElement('span');
      badge.className = 'featured-reel-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = `${REEL_ICON}${slide.duration}`;
      card.append(badge);
    }
    const shade = document.createElement('span');
    shade.className = 'featured-shade';
    shade.setAttribute('aria-hidden', 'true');
    card.append(shade);
    el.append(card);
    return el;
  };
  const entryFor = (el, slide, fromHtml) => {
    const card = el.querySelector('.featured-card');
    return {
      el,
      slide,
      card,
      img: card.querySelector('.featured-image'),
      backdrop: card.querySelector('.featured-backdrop'),
      shade: card.querySelector('.featured-shade'),
      requested: fromHtml, // the opening card's <picture> already chose its sources
      video: null,
    };
  };

  const whenLoaded = (entry, callback) => {
    const { img } = entry;
    if (img.complete && img.naturalWidth) callback();
    else img.addEventListener('load', callback, { once: true });
  };
  const markLoaded = (entry) => whenLoaded(entry, () => entry.card.classList.add('is-loaded'));
  const load = (i) => {
    const entry = entries[mod(i)];
    if (entry.requested) return;
    entry.requested = true;
    [entry.backdrop, entry.img].forEach((img) => {
      if (!img) return;
      img.sizes = entry.slide.sizes;
      img.srcset = entry.slide.srcset;
    });
    markLoaded(entry);
  };
  // The active card first; its immediate neighbours once it has arrived.
  const loadAround = () => {
    const i = active();
    load(i);
    whenLoaded(entries[i], () => { load(i - 1); load(i + 1); });
  };

  // --- Layout -------------------------------------------------------------------------
  const measure = () => {
    const card = entries[active()]?.el.offsetWidth || 260;
    const frameWidth = frame.clientWidth || window.innerWidth;
    // Less room (narrow phones, browser zoom): a gentler turn.
    const room = frameWidth / card;
    const angle = room < 1.2 ? 10 : frameWidth < 280 ? 20 : frameWidth < 340 ? 28 : ROTATION;
    metrics = { card, spacing: card * SPREAD, far: card * FAR, angle };
  };
  const layout = () => {
    const flat = reduced.matches;
    const { card, spacing, far, angle } = metrics;
    const perspective = Math.round(card * PERSPECTIVE);
    entries.forEach((entry, i) => {
      const d = wrap(i - position);
      const a = Math.abs(d);
      const sign = Math.sign(d);
      let x;
      let z = 0;
      let turn = 0;
      if (flat) {
        x = d * (card + FLAT_GAP);
      } else {
        x = sign * (Math.min(a, 1) * spacing + Math.max(a - 1, 0) * far);
        turn = sign * angle * Math.min(a, 1) ** FALLOFF;
        z = -DEPTH * card * Math.min(a, 2);
      }
      const opacity = a <= 1 ? 1 : Math.max(0, 1 - (a - 1) / 0.8);
      const style = entry.el.style;
      // Each card gets its own perspective, so it is drawn as a flat layer
      // and stacked by z-index. In one shared 3D space the turning cards'
      // planes would cut through each other mid-move.
      style.transform = `perspective(${perspective}px) translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) rotateY(${turn.toFixed(2)}deg)`;
      style.opacity = opacity.toFixed(3);
      style.visibility = opacity < 0.002 ? 'hidden' : '';
      style.zIndex = String(1000 - Math.round(a * 100));
      entry.shade.style.opacity = (Math.min(a, 1) * (flat ? 0.5 : FADE * 3.6)).toFixed(3);
    });
  };

  // --- Motion ---------------------------------------------------------------------------
  let drag = null;
  let wheel = null;
  const tracking = () => !!(drag?.active || wheel);
  const tick = (now) => {
    raf = 0;
    if (destroyed || !root.isConnected) { destroy(); return; }
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
    lastFrame = now;
    if (!tracking()) {
      const diff = target - position;
      position = Math.abs(diff) < 0.0008 ? target : position + diff * (1 - Math.exp(-dt / SETTLE_MS));
    }
    layout();
    if (tracking() || position !== target) raf = requestAnimationFrame(tick);
    else settle();
  };
  const kick = () => {
    if (raf || destroyed) return;
    lastFrame = 0;
    raf = requestAnimationFrame(tick);
  };
  // At rest: keep the numbers small so the loop never drifts.
  const settle = () => {
    lastFrame = 0;
    if (Math.abs(target) > total * 100) {
      const shift = target - mod(target);
      target -= shift;
      position -= shift;
    }
  };

  // --- Active card ------------------------------------------------------------------------
  const renderCaption = (animate) => {
    const slide = slides[active()];
    titleEl.textContent = text(slide, 'title');
    subtitleEl.textContent = text(slide, 'subtitle');
    if (metaEl) metaEl.textContent = metaLine(slide);
    if (animate) {
      root.classList.remove('is-swapping');
      void root.offsetWidth; // restart the caption crossfade
      root.classList.add('is-swapping');
    }
  };
  // Only the active card is announced and in the tab order; the others stay
  // tappable (a tap brings them to the centre) but are hidden from
  // assistive technology.
  const syncStates = () => {
    const current = active();
    const focusWasOnCard = frame.contains(document.activeElement) && document.activeElement.classList.contains('featured-card');
    entries.forEach((entry, i) => {
      const on = i === current;
      entry.el.classList.toggle('is-active', on);
      if (on) {
        entry.el.removeAttribute('aria-hidden');
        entry.card.removeAttribute('tabindex');
      } else {
        entry.el.setAttribute('aria-hidden', 'true');
        entry.card.tabIndex = -1;
      }
    });
    if (focusWasOnCard) entries[current].card.focus({ preventScroll: true });
  };
  const go = (next, { announce = false } = {}) => {
    const goal = Math.round(next);
    if (goal !== target) {
      target = goal;
      if (reduced.matches) position = target; // snap
      syncStates();
      renderCaption(true);
      loadAround();
      syncMedia();
      schedule();
      if (announce) status.textContent = fmt('featured.status', { index: active() + 1, total, title: text(slides[active()], 'title') }, `Project ${active() + 1} of ${total}: ${slides[active()].title}`);
    }
    kick();
  };

  // --- Reel previews -------------------------------------------------------------------------
  let inView = true;
  let viewerOpen = false;
  const mediaAllowed = () => previewsAllowed() && mobile.matches && inView && !document.hidden && !viewerOpen;
  const ensureVideo = (entry) => {
    if (entry.video) return entry.video;
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.preload = 'metadata';
    video.disablePictureInPicture = true;
    video.tabIndex = -1;
    video.poster = entry.img.currentSrc || '';
    let lastTime = 0;
    video.addEventListener('playing', () => entry.card.classList.add('is-playing'));
    // One full pass of the clip, then autoplay may move on.
    video.addEventListener('timeupdate', () => {
      if (video.currentTime + 0.25 < lastTime) previewLooped(entry);
      lastTime = video.currentTime;
    });
    video.src = entry.slide.clip;
    entry.card.insertBefore(video, entry.card.querySelector('.featured-reel-badge'));
    entry.video = video;
    return video;
  };
  const drop = (entry) => {
    if (!entry.video) return;
    entry.video.pause();
    entry.video.removeAttribute('src');
    entry.video.load();
    entry.video.remove();
    entry.video = null;
    entry.card.classList.remove('is-playing');
  };
  const syncMedia = () => {
    entries.forEach((entry, i) => {
      if (entry.slide.media !== 'video') return;
      if (i !== active() || !previewsAllowed() || !mobile.matches || destroyed) drop(entry);
      else if (!mediaAllowed()) entry.video?.pause();
      else whenLoaded(entry, () => {
        if (i === active() && mediaAllowed()) ensureVideo(entry).play()?.catch?.(() => { /* the poster stays */ });
      });
    });
  };
  const previewPlaying = () => {
    const entry = entries[active()];
    return entry?.slide.media === 'video' && mediaAllowed();
  };

  // --- Autoplay -------------------------------------------------------------------------------
  let playing = autoplayAllowed();
  let timer;
  const holds = new Set();
  const canAdvance = () => built && playing && !holds.size && mobile.matches && !destroyed;
  const schedule = () => {
    clearTimeout(timer);
    if (!canAdvance()) return;
    if (!previewPlaying()) { timer = setTimeout(() => go(target + 1), AUTOPLAY_MS); return; }
    // A reel preview decides for itself (previewLooped) when it has played
    // a full pass; this only rescues a preview that never started.
    const entry = entries[active()];
    timer = setTimeout(() => {
      if (!entry.card.classList.contains('is-playing') && canAdvance()) go(target + 1);
    }, Math.max(AUTOPLAY_MS, (entry.slide.clipLength || 6) * 1000 + 4000));
  };
  const previewLooped = (entry) => {
    if (entry !== entries[active()] || !canAdvance()) return;
    entry.video?.pause();
    go(target + 1);
  };
  const hold = (reason) => { holds.add(reason); clearTimeout(timer); };
  const release = (reason) => { holds.delete(reason); schedule(); };
  const stopAutoplay = () => { playing = false; clearTimeout(timer); };
  const step = (direction) => {
    if (!built) return;
    stopAutoplay();
    go(target + direction, { announce: true });
  };

  root.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !built) return;
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    step(direction);
  });
  root.addEventListener('focusin', () => hold('focus'));
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) release('focus');
  });
  frame.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hold('hover'); });
  frame.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') release('hover'); });
  const onVisibility = () => {
    if (document.hidden) hold('hidden'); else release('hidden');
    syncMedia();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // --- Drag -----------------------------------------------------------------------------------
  // The first few pixels decide: vertical movement is left to the page
  // (the browser then cancels the pointer), horizontal movement drags.
  let suppressClick = false;
  let suppressTimer;
  const dragUnit = () => (reduced.matches ? metrics.card + FLAT_GAP : metrics.spacing);
  const endDrag = (event, cancelled) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { active: moved, samples, from, startX } = drag;
    drag = null;
    frame.classList.remove('is-dragging');
    release('touch');
    if (!moved) return;
    suppressClick = true;
    clearTimeout(suppressTimer);
    suppressTimer = setTimeout(() => { suppressClick = false; }, 80);
    let goal = Math.round(position);
    if (!cancelled) {
      // A flick carries on a little: at most two cards from where it began.
      const first = samples[0];
      const last = samples[samples.length - 1];
      const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0; // px/ms
      goal = Math.round(position - (velocity * 150) / dragUnit());
      const dx = event.clientX - startX;
      if (goal === from && Math.abs(dx) > 30) goal = from - Math.sign(dx);
    }
    goal = Math.max(from - MAX_FLING, Math.min(from + MAX_FLING, goal));
    go(goal, { announce: true });
  };
  frame.addEventListener('pointerdown', (event) => {
    if (!built || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    suppressClick = false;
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, origin: position, from: target, active: false, samples: [{ t: event.timeStamp, x: event.clientX }] };
    hold('touch');
  });
  frame.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLOP) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; release('touch'); return; }
      drag.active = true;
      stopAutoplay();
      frame.classList.add('is-dragging');
      try { frame.setPointerCapture(event.pointerId); } catch { /* still tracked */ }
    }
    event.preventDefault();
    position = drag.origin - dx / dragUnit();
    drag.samples.push({ t: event.timeStamp, x: event.clientX });
    while (drag.samples.length > 2 && event.timeStamp - drag.samples[0].t > 100) drag.samples.shift();
    kick();
  });
  frame.addEventListener('pointerup', (event) => endDrag(event, false));
  frame.addEventListener('pointercancel', (event) => endDrag(event, true));
  // Touch pointers start captured by the touched card; moving the capture
  // to the frame makes that card report a (bubbling) loss — ignore it.
  frame.addEventListener('lostpointercapture', (event) => { if (event.target === frame) endDrag(event, true); });
  frame.addEventListener('dragstart', (event) => event.preventDefault());

  // --- Horizontal scrolling (trackpad swipe, horizontal wheel, Shift+wheel) ---
  // The cards follow the scroll, then snap to the nearest card once it
  // pauses — at most two cards per gesture. Vertical scrolling is left to
  // the page. A trackpad's momentum tail after the snap is swallowed so one
  // swipe never runs on through the whole collection.
  const WHEEL_IDLE_MS = 130;
  let wheelQuietUntil = 0;
  frame.addEventListener('wheel', (event) => {
    if (!built || event.ctrlKey) return; // pinch-zoom
    let dx = event.deltaX;
    if (event.shiftKey && !dx) dx = event.deltaY;
    if (!dx || (!event.shiftKey && Math.abs(dx) <= Math.abs(event.deltaY))) return;
    event.preventDefault();
    const now = event.timeStamp;
    if (!wheel && now < wheelQuietUntil) { wheelQuietUntil = now + WHEEL_IDLE_MS; return; }
    const px = event.deltaMode === 1 ? dx * 16 : event.deltaMode === 2 ? dx * frame.clientWidth : dx;
    if (!wheel) {
      wheel = { from: target, timer: 0 };
      stopAutoplay();
      hold('wheel');
    }
    const reach = MAX_FLING + 0.45;
    position = Math.max(wheel.from - reach, Math.min(wheel.from + reach, position + px / dragUnit()));
    kick();
    clearTimeout(wheel.timer);
    wheel.timer = setTimeout(() => {
      const { from } = wheel;
      wheel = null;
      wheelQuietUntil = performance.now() + WHEEL_IDLE_MS;
      release('wheel');
      go(Math.max(from - MAX_FLING, Math.min(from + MAX_FLING, Math.round(position))), { announce: true });
    }, WHEEL_IDLE_MS);
  }, { passive: false });

  // --- Taps -----------------------------------------------------------------------------------
  const remember = () => {
    try { sessionStorage.setItem(RETURN_KEY, slides[active()].id); } catch { /* returns to the first slide */ }
  };
  const openReel = (entry) => {
    const { slide } = entry;
    const file = encodeURIComponent(slide.file);
    const page = `${REEL_PAGE}?reel=${file}`;
    entry.viewer = entry.viewer || window.createReelViewer?.([{
      src: REEL_BASE + file,
      poster: entry.img.currentSrc,
      ratio: slide.width / slide.height,
      title: reelName(slide),
      label: reelName(slide),
      brand: slide.brand || '',
    }], { closeTo: () => page });
    remember();
    if (entry.viewer) entry.viewer.open(0, entry.card);
    else window.location.href = page;
  };
  frame.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      return;
    }
    const card = built && event.target.closest('.featured-card');
    if (!card) return;
    const i = entries.findIndex((entry) => entry.card === card);
    if (i < 0) return;
    stopAutoplay();
    if (i !== active()) {
      event.preventDefault();
      go(target + wrap(i - target), { announce: true });
      return;
    }
    if (entries[i].slide.media === 'video') { event.preventDefault(); openReel(entries[i]); } else remember();
  }, true);

  // --- Observers ----------------------------------------------------------------------------
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => {
    if (!built) return;
    measure(); // the current card stays put; only distances change
    layout();
  }) : null;
  const viewObserver = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) release('offscreen'); else hold('offscreen');
    syncMedia();
  }) : null;
  viewObserver?.observe(frame);
  // The fullscreen reel viewer pauses everything behind it.
  const viewerObserver = new MutationObserver(() => {
    const open = document.documentElement.classList.contains('reel-viewer-open');
    if (open === viewerOpen) return;
    viewerOpen = open;
    if (open) hold('viewer'); else release('viewer');
    syncMedia();
  });
  viewerObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // --- Build ----------------------------------------------------------------------------------
  const build = () => {
    if (built || !mobile.matches) return;
    built = true;
    const opening = track.querySelector('.featured-slide');
    entries = slides.map((slide, i) => {
      const fromHtml = i === 0 && !!opening;
      const el = fromHtml ? opening : track.appendChild(makeSlide(slide));
      el.setAttribute('aria-label', slideLabel(i));
      return entryFor(el, slide, fromHtml);
    });
    if (opening) markLoaded(entries[0]);
    // Coming back from a piece opened here: show that slide again and keep
    // it still (js/return-trip.js brings the visitor back).
    let returning = null;
    try { returning = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch { /* start at the first slide */ }
    const back = slides.findIndex((slide) => slide.id === returning);
    if (back > 0) { target = back; position = back; playing = false; }
    root.classList.add('is-ready');
    resizeObserver?.observe(frame);
    syncStates();
    renderCaption(false);
    loadAround();
    measure();
    layout();
  };

  // A new language: relabel every slide and card, then the caption. The
  // current slide, its position, and any playing preview stay put.
  I18N?.onChange(() => {
    if (!built) return;
    entries.forEach(({ el, card, img, slide }, i) => {
      el.setAttribute('aria-label', slideLabel(i));
      el.setAttribute('aria-roledescription', fmt('a11y.slide', null, 'slide'));
      if (slide.media === 'video') card.setAttribute('aria-label', reelLabel(slide));
      else if (img && !img.hasAttribute('data-i18n-attr')) img.alt = altText(slide);
    });
    renderCaption(false);
  });

  // Restored from the back/forward cache: the slide is already in place, so
  // just keep autoplay from moving it on.
  const onPageShow = (event) => {
    if (!event.persisted) return;
    try { sessionStorage.removeItem(RETURN_KEY); } catch { /* nothing to clear */ }
    stopAutoplay();
    syncMedia();
  };
  window.addEventListener('pageshow', onPageShow);

  // Keep the fixed header legible over the hero and the dark sections.
  const visibility = () => {
    const darkSectionAtHeader = ['#gallery', '#capabilities', '#creative-dock', '#creative-timeline', '#foundation'].some((selector) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds && bounds.top < 64 && bounds.bottom > 64;
    });
    const visible = hero.getBoundingClientRect().bottom > 64 || darkSectionAtHeader;
    document.body.classList.toggle('mobile-hero-visible', mobile.matches && visible);
  };

  const configure = () => {
    if (destroyed) return;
    build();
    if (!autoplayAllowed()) stopAutoplay();
    if (built) {
      if (reduced.matches) position = target;
      measure();
      layout();
    }
    if (mobile.matches) schedule(); else clearTimeout(timer);
    syncMedia();
    visibility();
  };

  // Everything the carousel set up, undone (page unload or removal).
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(timer);
    clearTimeout(suppressTimer);
    clearTimeout(wheel?.timer);
    entries.forEach(drop);
    resizeObserver?.disconnect();
    viewObserver?.disconnect();
    viewerObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    [mobile, reduced].forEach((query) => query.removeEventListener('change', configure));
    reducedData.removeEventListener?.('change', configure);
    connection?.removeEventListener?.('change', configure);
  }
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) { entries.forEach(drop); clearTimeout(timer); } else destroy();
  });

  mobile.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  reducedData.addEventListener?.('change', configure);
  connection?.addEventListener?.('change', configure);
  window.addEventListener('scroll', visibility, { passive: true });
  window.addEventListener('resize', visibility);
  configure();
})();
