/* Mobile landing carousel (css/mobile-featured.css). Shows the curated
   groups in js/mobile-featured-data.js (scripts/featured-groups.js) one
   group at a time with a crossfade and a slight drift. The opening group
   is fixed; the others are shuffled once per browsing session, never
   putting two groups with the same layout or family side by side.

   Swipe, the previous/next buttons, and the arrow keys step exactly one
   group. Autoplay (6.5s, longer for groups with reels) pauses during touch,
   focus, hover, the reel viewer, hidden tabs, and offscreen scrolling, and
   stops for good once the visitor steps or opens a piece. It never runs
   under reduced motion or reduced data.

   Reels play as muted inline previews (light clips) only while their group
   is active and the carousel is on screen — at most two at once — and are
   paused, reset, and unloaded when the group is left. Under reduced motion
   or reduced data they stay as still posters. A tap opens the full reel in
   the fullscreen viewer (js/reel-viewer.js); closing it continues to the
   Short-Form Video & Reels page with that reel picked out. */
(() => {
  const hero = document.querySelector('.hero-parallax');
  const root = hero?.querySelector('.mobile-featured');
  const data = window.MOBILE_FEATURED;
  if (!root || !data?.groups?.length) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedData = matchMedia('(prefers-reduced-data: reduce)');
  const connection = navigator.connection;
  const SWIPE_PX = 40;
  const MAX_PLAYING = 2;
  const ORDER_KEY = 'featured-group-order';
  const RETURN_KEY = 'featured-return';
  const REEL_BASE = 'assets/videos/short-form-reels/';
  const REEL_PAGE = 'pages/short-form-video-reels.html';
  const REEL_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"></rect><path d="M10 8.8v6.4l5.2-3.2z" fill="currentColor" stroke="none"></path></svg>';

  const frame = root.querySelector('.featured-frame');
  const stage = root.querySelector('.featured-groups');
  const caption = root.querySelector('.featured-caption');
  const status = root.querySelector('.featured-status');
  const stepButtons = root.querySelectorAll('.featured-step');
  const pad = (n) => String(n).padStart(2, '0');

  const lowData = () => reducedData.matches || !!connection?.saveData || /2g$/.test(connection?.effectiveType || '');
  const autoplayAllowed = () => !reduced.matches && !lowData();
  const previewsAllowed = () => autoplayAllowed() && 'IntersectionObserver' in window;

  // Opening group first, then this session's order of the rest.
  const kind = (group) => group.layout.replace(/-rev$/, '');
  const clash = (a, b) => kind(a) === kind(b) || (!!a.family && a.family === b.family);
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const arrange = (placed, left) => {
    if (!left.length) return placed;
    for (const group of shuffle(left.slice())) {
      if (clash(placed[placed.length - 1], group)) continue;
      const done = arrange([...placed, group], left.filter((other) => other !== group));
      if (done) return done;
    }
    return null;
  };
  const ordered = () => {
    const [first, ...rest] = data.groups;
    const byId = new Map(rest.map((group) => [group.id, group]));
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(ORDER_KEY)); } catch { saved = null; }
    if (Array.isArray(saved) && saved.length === rest.length && saved.every((id) => byId.has(id))) {
      return [first, ...saved.map((id) => byId.get(id))];
    }
    const order = arrange([first], rest) || data.groups;
    try { sessionStorage.setItem(ORDER_KEY, JSON.stringify(order.slice(1).map((group) => group.id))); } catch { /* order holds for this page view */ }
    return order;
  };

  let groups = [];
  let index = 0;
  let built = false;

  const markLoaded = (tile, img) => {
    const done = () => tile.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  };
  const makeTile = (item) => {
    const reel = item.kind === 'reel';
    const tile = document.createElement(reel ? 'button' : 'a');
    tile.className = `featured-tile${item.fill ? ' is-fill' : ''}`;
    tile.style.setProperty('--placeholder', `url('${item.placeholder}')`);
    const img = document.createElement('img');
    img.width = item.width;
    img.height = item.height;
    img.decoding = 'async';
    if (reel) {
      tile.type = 'button';
      tile.setAttribute('aria-label', `Play ${item.label}, ${item.duration}, in the fullscreen viewer. ${item.alt}`);
      img.alt = '';
      tile.append(img);
      const badge = document.createElement('span');
      badge.className = 'featured-reel-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = `${REEL_ICON}${item.duration}`;
      tile.append(badge);
    } else {
      tile.href = item.href;
      img.alt = item.alt;
      tile.append(img);
    }
    return tile;
  };
  const makeGroup = (group) => {
    const el = document.createElement('div');
    el.className = 'featured-group';
    el.dataset.layout = group.layout;
    el.dataset.id = group.id;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-roledescription', 'slide');
    group.items.forEach((item) => el.append(makeTile(item)));
    return el;
  };

  // Sources are given only to the current and next group, so the first
  // visit never downloads the whole collection.
  const load = (i) => {
    groups[i].tiles.forEach(({ tile, img, item }) => {
      // The opening group's <picture> in index.html already chose its sources.
      if (img.srcset || img.closest('picture')) return;
      img.sizes = item.sizes;
      img.srcset = item.srcset;
      markLoaded(tile, img);
    });
  };

  // --- Reel previews ------------------------------------------------------------
  let inView = true;
  let viewerOpen = false;
  const mediaAllowed = () => previewsAllowed() && mobile.matches && inView && !document.hidden && !viewerOpen;
  const ensureVideo = (reel) => {
    if (reel.video) return reel.video;
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
    video.poster = reel.img.currentSrc || '';
    video.addEventListener('playing', () => reel.tile.classList.add('is-playing'));
    video.src = reel.item.clip;
    reel.tile.insertBefore(video, reel.tile.querySelector('.featured-reel-badge'));
    reel.video = video;
    return video;
  };
  // Leaving a group stops, rewinds, and unloads its previews entirely.
  const drop = (reel) => {
    if (!reel.video) return;
    reel.video.pause();
    reel.video.removeAttribute('src');
    reel.video.load();
    reel.video.remove();
    reel.video = null;
    reel.tile.classList.remove('is-playing');
  };
  const syncMedia = () => {
    groups.forEach(({ reels }, i) => {
      reels.forEach((reel, k) => {
        if (i !== index || k >= MAX_PLAYING || !previewsAllowed() || !mobile.matches) drop(reel);
        else if (!mediaAllowed()) reel.video?.pause();
        else ensureVideo(reel).play()?.catch?.(() => { /* the poster stays */ });
      });
    });
  };

  // --- Rendering ------------------------------------------------------------------
  const render = (announce) => {
    const total = groups.length;
    groups.forEach(({ el }, i) => {
      const active = i === index;
      el.classList.toggle('is-active', active);
      if (active) el.classList.remove('is-leaving');
      el.setAttribute('aria-hidden', String(!active));
      el.inert = !active;
    });
    const { group } = groups[index];
    caption.querySelector('.featured-title').textContent = group.title;
    caption.querySelector('.featured-subtitle').textContent = group.subtitle;
    const link = root.querySelector('.featured-link');
    link.href = group.href;
    link.setAttribute('aria-label', `View project: ${group.title}`);
    root.querySelector('.featured-current').textContent = pad(index + 1);
    root.querySelector('.featured-total').textContent = pad(total);
    root.style.setProperty('--progress', String((index + 1) / total));
    load(index);
    load((index + 1) % total);
    syncMedia();
    if (announce) status.textContent = `Group ${index + 1} of ${total}: ${group.title}`;
  };
  const show = (target, direction, announce) => {
    const next = (target + groups.length) % groups.length;
    if (next === index) return;
    root.dataset.direction = direction < 0 ? 'back' : 'forward';
    const leaving = groups[index].el;
    leaving.classList.add('is-leaving');
    window.setTimeout(() => leaving.classList.remove('is-leaving'), 650);
    index = next;
    root.classList.remove('is-swapping');
    void root.offsetWidth; // restart the caption fade
    root.classList.add('is-swapping');
    render(announce);
  };

  const build = () => {
    if (built || !mobile.matches) return;
    built = true;
    const order = ordered();
    const opening = stage.querySelector('.featured-group');
    groups = order.map((group, i) => {
      const el = i === 0 && opening ? opening : stage.appendChild(makeGroup(group));
      el.setAttribute('aria-label', `${i + 1} of ${order.length}: ${group.title}`);
      const tiles = Array.from(el.querySelectorAll('.featured-tile'), (tile, k) => ({ tile, img: tile.querySelector('img'), item: group.items[k] }));
      const reels = tiles.filter(({ item }) => item.kind === 'reel');
      return { el, group, tiles, reels };
    });
    groups[0].tiles.forEach(({ tile, img }) => markLoaded(tile, img));
    // Coming back from a piece opened here: show that group again and keep
    // it still (js/return-trip.js brings the visitor back).
    let returning = null;
    try { returning = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch { /* start at the first group */ }
    const back = groups.findIndex(({ group }) => group.id === returning);
    if (back > 0) { index = back; playing = false; }
    stepButtons.forEach((button) => { button.disabled = false; });
    root.classList.add('is-ready');
    render(false);
  };

  // --- Autoplay -----------------------------------------------------------------------
  let playing = autoplayAllowed();
  let timer;
  const holds = new Set();
  const schedule = () => {
    clearTimeout(timer);
    if (built && playing && !holds.size && mobile.matches) {
      timer = setTimeout(() => { show(index + 1, 1, false); schedule(); }, groups[index].group.dwell);
    }
  };
  const hold = (reason) => { holds.add(reason); clearTimeout(timer); };
  const release = (reason) => { holds.delete(reason); schedule(); };
  const stopAutoplay = () => { playing = false; clearTimeout(timer); };
  const step = (direction) => {
    if (!built) return;
    stopAutoplay();
    show(index + direction, direction, true);
  };

  stepButtons.forEach((button) => button.addEventListener('click', () => step(Number(button.dataset.step))));
  root.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction || !built) return;
    event.preventDefault();
    step(direction);
  });

  root.addEventListener('focusin', () => hold('focus'));
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) release('focus');
  });
  frame.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hold('hover'); });
  frame.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') release('hover'); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hold('hidden'); else release('hidden');
    syncMedia();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) release('offscreen'); else hold('offscreen');
      syncMedia();
    }).observe(frame);
  }
  // The fullscreen reel viewer pauses everything behind it.
  new MutationObserver(() => {
    const open = document.documentElement.classList.contains('reel-viewer-open');
    if (open === viewerOpen) return;
    viewerOpen = open;
    if (open) hold('viewer'); else release('viewer');
    syncMedia();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // --- Swipe ----------------------------------------------------------------------------
  // The first 10px decide the axis. Vertical gestures always scroll the
  // page; a horizontal one of 40px or more steps exactly one group.
  let touch = null;
  let suppressClick = false;
  frame.addEventListener('touchstart', (event) => {
    suppressClick = false;
    if (!built || event.touches.length !== 1) { touch = null; return; }
    touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, axis: null, direction: 0 };
    hold('touch');
  }, { passive: true });
  frame.addEventListener('touchmove', (event) => {
    if (!touch || event.touches.length !== 1) { touch = null; return; }
    const dx = touch.x - event.touches[0].clientX;
    const dy = touch.y - event.touches[0].clientY;
    if (!touch.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (touch.axis === 'y') return;
    event.preventDefault();
    suppressClick = true;
    touch.direction = Math.abs(dx) >= SWIPE_PX ? Math.sign(dx) : 0;
  }, { passive: false });
  frame.addEventListener('touchend', () => {
    if (touch?.direction) step(touch.direction);
    touch = null;
    release('touch');
  }, { passive: true });
  frame.addEventListener('touchcancel', () => { touch = null; suppressClick = false; release('touch'); }, { passive: true });

  // --- Opening a piece --------------------------------------------------------------
  const remember = () => {
    try { sessionStorage.setItem(RETURN_KEY, groups[index].group.id); } catch { /* returns to the first group */ }
  };
  const openReel = (reel) => {
    const file = encodeURIComponent(reel.item.file);
    const page = `${REEL_PAGE}?reel=${file}`;
    reel.viewer = reel.viewer || window.createReelViewer?.([{
      src: REEL_BASE + file,
      poster: reel.img.currentSrc,
      ratio: reel.item.width / reel.item.height,
      title: reel.item.label,
      label: reel.item.label,
      brand: '',
    }], { closeTo: () => page });
    remember();
    if (reel.viewer) reel.viewer.open(0, reel.tile);
    else window.location.href = page;
  };
  frame.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      return;
    }
    const tile = built && event.target.closest('.featured-tile');
    if (!tile) return;
    stopAutoplay();
    const reel = groups[index].reels.find((entry) => entry.tile === tile);
    if (reel) { event.preventDefault(); openReel(reel); } else remember();
  }, true);
  root.querySelector('.featured-actions').addEventListener('click', (event) => {
    if (built && event.target.closest('.featured-link')) remember();
  });
  // Restored from the back/forward cache: the group is already in place,
  // so just keep autoplay from moving it on.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    try { sessionStorage.removeItem(RETURN_KEY); } catch { /* nothing to clear */ }
    stopAutoplay();
    syncMedia();
  });

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
    build();
    if (!autoplayAllowed()) stopAutoplay();
    if (mobile.matches) schedule(); else clearTimeout(timer);
    syncMedia();
    visibility();
  };
  mobile.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  reducedData.addEventListener?.('change', configure);
  connection?.addEventListener?.('change', configure);
  window.addEventListener('scroll', visibility, { passive: true });
  window.addEventListener('resize', visibility);
  configure();
})();
