/* Mobile landing carousel (css/mobile-featured.css). Shows the approved
   featured collection (js/mobile-featured-data.js) one slide at a time with
   a crossfade. The opening slide is fixed; the other five are shuffled once
   per browsing session. Swipe and arrow keys step one slide, and dots at
   the bottom of the image mark the position, as in an Instagram carousel.
   Autoplay pauses during touch, focus, hover, hidden tabs, and offscreen
   scrolling, and stops for good after a manual step. */
(() => {
  const hero = document.querySelector('.hero-parallax');
  const root = hero?.querySelector('.mobile-featured');
  const data = window.MOBILE_FEATURED;
  if (!root || !data?.slides?.length) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const AUTOPLAY_MS = 5500;
  const SWIPE_PX = 40;
  const ORDER_KEY = 'featured-order';
  const RETURN_KEY = 'featured-return';

  const frame = root.querySelector('.featured-frame');
  const brand = root.querySelector('.featured-brand');
  const title = root.querySelector('.featured-title');
  const dots = root.querySelector('.featured-dots');
  const status = root.querySelector('.featured-status');

  // Opening slide first, then the remaining slides in this session's order.
  const ordered = () => {
    const [first, ...rest] = data.slides;
    const ids = rest.map(slide => slide.id);
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(ORDER_KEY)); } catch { saved = null; }
    const valid = Array.isArray(saved) && saved.length === ids.length && ids.every(id => saved.includes(id));
    const order = valid ? saved : ids.slice();
    if (!valid) {
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      try { sessionStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* order stays for this page view */ }
    }
    return [first, ...order.map(id => rest.find(slide => slide.id === id))];
  };

  let slides = [];
  let index = 0;
  let built = false;

  const markLoaded = (el, img) => {
    const done = () => el.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  };
  const makeSlide = (slide) => {
    const el = document.createElement('div');
    el.className = 'featured-slide';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-roledescription', 'slide');
    el.dataset.id = slide.id;
    el.style.setProperty('--placeholder', `url('${slide.placeholder}')`);
    const media = document.createElement('a');
    media.className = 'featured-media';
    media.href = slide.href;
    const img = document.createElement('img');
    img.width = slide.width;
    img.height = slide.height;
    img.alt = slide.alt;
    img.decoding = 'async';
    img.sizes = data.sizes;
    media.append(img);
    el.append(media);
    return el;
  };
  // Later slides get their sources only when they are current or next, so
  // the first visit never downloads the whole collection.
  const load = (i) => {
    const { el, img, slide } = slides[i];
    // The opening slide's <picture> in index.html already chose its source.
    if (img.srcset || img.closest('picture')) return;
    img.srcset = slide.srcset;
    markLoaded(el, img);
  };

  const build = () => {
    if (built || !mobile.matches) return;
    built = true;
    const order = ordered();
    const opening = frame.querySelector('.featured-slide');
    slides = order.map((slide, i) => {
      const el = i === 0 && opening ? opening : makeSlide(slide);
      if (el !== opening) frame.insertBefore(el, dots);
      el.setAttribute('aria-label', `${i + 1} of ${order.length}`);
      return { el, img: el.querySelector('img'), slide, dot: dots.appendChild(document.createElement('span')) };
    });
    if (opening) markLoaded(opening, slides[0].img);
    // Coming back from a piece opened here: show that slide again and keep
    // it still (js/return-on-close.js brings the visitor back).
    let returning = null;
    try { returning = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch { /* start at the first slide */ }
    const back = slides.findIndex(({ slide }) => slide.id === returning);
    if (back > 0) { index = back; playing = false; }
    root.classList.add('is-ready');
    render(false);
  };

  const render = (announce) => {
    slides.forEach(({ el, dot }, i) => {
      const active = i === index;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
      el.inert = !active;
      dot.classList.toggle('is-active', active);
    });
    const { slide } = slides[index];
    brand.textContent = slide.brand;
    title.textContent = slide.title;
    load(index);
    load((index + 1) % slides.length);
    if (announce) status.textContent = `Slide ${index + 1} of ${slides.length}: ${slide.brand}, ${slide.title}`;
  };
  const show = (target, announce) => {
    const next = (target + slides.length) % slides.length;
    if (next === index) return;
    index = next;
    root.classList.remove('is-swapping');
    void root.offsetWidth; // restart the caption fade
    root.classList.add('is-swapping');
    render(announce);
  };

  // Autoplay: on unless motion is reduced or data saving is requested; any
  // manual step turns it off for the rest of the visit.
  const autoplayAllowed = () => !reduced.matches && !connection?.saveData;
  let playing = autoplayAllowed();
  let timer;
  const holds = new Set();
  const schedule = () => {
    clearTimeout(timer);
    if (built && playing && !holds.size && mobile.matches) {
      timer = setTimeout(() => { show(index + 1, false); schedule(); }, AUTOPLAY_MS);
    }
  };
  const hold = (reason) => { holds.add(reason); clearTimeout(timer); };
  const release = (reason) => { holds.delete(reason); schedule(); };
  const step = (direction) => {
    playing = false;
    clearTimeout(timer);
    show(index + direction, true);
  };

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
  document.addEventListener('visibilitychange', () => (document.hidden ? hold('hidden') : release('hidden')));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? release('offscreen') : hold('offscreen')))
      .observe(frame);
  }

  // Swipe: the first 10px decide the axis. Vertical gestures always scroll
  // the page; a horizontal one of 40px or more steps exactly one slide.
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
  const endTouch = () => {
    if (touch?.direction) step(touch.direction);
    touch = null;
    release('touch');
  };
  frame.addEventListener('touchend', endTouch, { passive: true });
  frame.addEventListener('touchcancel', () => { touch = null; suppressClick = false; release('touch'); }, { passive: true });
  frame.addEventListener('click', (event) => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
    else if (built && event.target.closest('.featured-media')) {
      try { sessionStorage.setItem(RETURN_KEY, slides[index].slide.id); } catch { /* returns to the first slide */ }
    }
    suppressClick = false;
  }, true);
  // Restored from the back/forward cache: the slide is already in place, so
  // just keep autoplay from moving it on.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    try { sessionStorage.removeItem(RETURN_KEY); } catch { /* nothing to clear */ }
    playing = false;
    clearTimeout(timer);
  });

  // Keep the fixed header legible over the hero and the dark sections.
  const visibility = () => {
    const darkSectionAtHeader = ['#gallery', '#capabilities', '#creative-dock', '#creative-timeline', '#foundation'].some(selector => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds && bounds.top < 64 && bounds.bottom > 64;
    });
    const visible = hero.getBoundingClientRect().bottom > 64 || darkSectionAtHeader;
    document.body.classList.toggle('mobile-hero-visible', mobile.matches && visible);
  };

  const configure = () => {
    build();
    if (!autoplayAllowed()) playing = false;
    if (mobile.matches) schedule(); else clearTimeout(timer);
    visibility();
  };
  mobile.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  connection?.addEventListener?.('change', configure);
  window.addEventListener('scroll', visibility, { passive: true });
  window.addEventListener('resize', visibility);
  configure();
})();
