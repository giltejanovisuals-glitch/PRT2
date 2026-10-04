/* Swipe folders horizontally. Vertical gestures always scroll the page. */
(() => {
  const hero = document.querySelector('.hero-parallax');
  const carousel = hero?.querySelector('.mobile-projects');
  if (!carousel) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const projects = [
    { id: 'porta-mobili', name: 'Porta Mobili', type: 'Campaigns & retail design' },
    { id: 'hooga', name: 'Hooga', type: 'Campaigns & brand collateral' },
    { id: 'dunlopillo', name: 'Dunlopillo', type: 'Print & product communication' },
    { id: 'metal-lite', name: 'Metal-Lite', type: 'Campaigns & lighting communication' },
  ];
  const track = carousel.querySelector('.mobile-folder-track');
  const stage = carousel.querySelector('.mobile-folder-stage');
  let index = 0;
  let locked = false;
  let timer;
  let touch = null;
  let suppressClick = false;
  let wheelBusy = false;
  let wheelTimer;
  let wheelDelta = 0;
  let wheelHandled = false;
  let wheelReleased = false;
  const staticMode = () => reduced.matches || Boolean(connection?.saveData);
  const controlled = () => mobile.matches && !staticMode() &&
    !document.body.classList.contains('menu-open');
  const cards = () => Array.from(track.children);

  // Only construct later folders on mobile. Leave their images without a src
  // until selected, so native lazy loading cannot fetch offscreen slides early.
  const prepare = () => {
    if (!mobile.matches) return;
    if (track.children.length === 1) projects.slice(1).forEach((project, offset) => {
      const link = document.createElement('a');
      link.className = 'mobile-folder';
      link.dataset.brand = project.id;
      link.href = `pages/${project.id}.html`;
      link.setAttribute('aria-label', `Explore ${project.name} projects`);
      link.setAttribute('aria-roledescription', 'slide');
      const tab = document.createElement('span');
      tab.className = 'folder-tab';
      tab.setAttribute('aria-hidden', 'true');
      tab.textContent = `SELECTED WORK / 0${offset + 2}`;
      const preview = document.createElement('span');
      preview.className = 'folder-preview';
      const img = document.createElement('img');
      img.width = 640;
      img.height = 640;
      img.alt = `${project.name} selected design work`;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.dataset.src = `assets/images/hero-folders/${project.id}-1.webp`;
      preview.append(img);
      const front = document.createElement('span');
      front.className = 'folder-front';
      front.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = project.name.toUpperCase();
      const open = document.createElement('small');
      open.textContent = 'Open project ↗';
      front.append(name, open);
      link.append(tab, preview, front);
      track.append(link);
    });
    carousel.classList.toggle('is-static', staticMode());
    render();
  };
  const render = () => {
    cards().forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
      card.classList.toggle('is-previous', i < index);
      card.setAttribute('aria-hidden', String(!staticMode() && i !== index));
      card.tabIndex = staticMode() || i === index ? 0 : -1;
      card.inert = !staticMode() && i !== index;
      if (staticMode()) {
        const image = card.querySelector('img');
        if (image.dataset.src) {
          image.src = image.dataset.src;
          delete image.dataset.src;
        }
      }
    });
    const img = cards()[index].querySelector('img');
    if (img.dataset.src) {
      img.loading = 'eager';
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
    carousel.classList.toggle('is-last', index === 3);
  };
  const advance = (direction) => {
    if (locked) return;
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    const outgoing = cards()[index];
    const wasFocused = outgoing === document.activeElement;
    outgoing.classList.add('is-leaving');
    index = target;
    locked = !staticMode();
    render();
    if (wasFocused) cards()[index].focus({ preventScroll: true });
    clearTimeout(timer);
    timer = setTimeout(() => {
      locked = false;
      cards().forEach(card => card.classList.remove('is-leaving'));
    }, staticMode() ? 0 : 600);
  };

  stage.addEventListener('touchstart', (event) => {
    touch = event.touches.length === 1 && controlled() ? {
      x: event.touches[0].clientX, y: event.touches[0].clientY,
      blocked: locked, direction: 0, axis: null,
    } : null;
    suppressClick = false;
  }, { passive: true });
  stage.addEventListener('touchmove', (event) => {
    if (!touch || event.touches.length !== 1) { touch = null; return; }
    const dy = touch.y - event.touches[0].clientY;
    const dx = touch.x - event.touches[0].clientX;
    if (!touch.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      touch.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (touch.axis === 'vertical') return;
    suppressClick = true;
    const direction = Math.sign(dx);
    // Consume only horizontal movement, including at the end of the track.
    // A gesture begun during a transition stays blocked until its end.
    event.preventDefault();
    if (Math.abs(dx) >= 40) touch.direction = direction;
  }, { passive: false });
  stage.addEventListener('touchend', () => {
    if (touch && !touch.blocked && touch.direction && controlled()) advance(touch.direction);
    touch = null;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touch = null; suppressClick = false; }, { passive: true });
  hero.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') suppressClick = false;
  }, { passive: true });
  hero.addEventListener('click', (event) => {
    // Keyboard and programmatic clicks have detail=0 and remain usable
    // after a swipe that did not produce a synthesized click.
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    suppressClick = false;
  }, true);

  stage.addEventListener('wheel', (event) => {
    if (!controlled() || event.ctrlKey || Math.abs(event.deltaY) >= Math.abs(event.deltaX)) return;
    const direction = Math.sign(event.deltaX);
    if (!direction) return;
    const newGesture = !wheelBusy;
    wheelBusy = true;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelBusy = false; wheelDelta = 0; wheelHandled = false; wheelReleased = false; }, 200);
    if (newGesture) {
      wheelReleased = !locked && ((index === 3 && direction > 0) || (index === 0 && direction < 0));
      wheelHandled = locked;
    }
    if (wheelReleased) return;
    event.preventDefault();
    if (locked || wheelHandled) return;
    const delta = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1);
    wheelDelta += delta;
    if (Math.abs(wheelDelta) >= 35) {
      advance(Math.sign(wheelDelta));
      // Ignore the entire momentum tail until 200ms of input silence.
      wheelHandled = true;
    }
  }, { passive: false });
  stage.addEventListener('keydown', (event) => {
    if (!controlled() || event.target.closest('button') || event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction || (index === 3 && direction > 0) || (index === 0 && direction < 0)) return;
    event.preventDefault();
    advance(direction);
  });
  const visibility = () => {
    const darkSectionAtHeader = ['#gallery', '#capabilities', '#creative-dock', '#creative-timeline', '#foundation'].some(selector => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds && bounds.top < 64 && bounds.bottom > 64;
    });
    const darkSectionVisible = hero.getBoundingClientRect().bottom > 64 ||
      darkSectionAtHeader;
    document.body.classList.toggle('mobile-hero-visible', mobile.matches && darkSectionVisible);
  };
  const configure = () => {
    clearTimeout(timer);
    locked = false;
    touch = null;
    wheelBusy = false;
    wheelDelta = 0;
    wheelHandled = false;
    wheelReleased = false;
    prepare();
    visibility();
  };
  let lastMobile = mobile.matches;
  mobile.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  connection?.addEventListener('change', configure);
  window.addEventListener('scroll', visibility, { passive: true });
  window.addEventListener('resize', () => {
    if (mobile.matches !== lastMobile) {
      lastMobile = mobile.matches;
      configure();
    } else visibility();
  });
  configure();
})();
