/* Select once per visit; never cycle the mobile category previews.
   The reels card's poster plays its reel as a muted inline preview while
   clearly in view (js/reel-preview.js; never under reduced motion or data
   saving), and a tap on it opens that complete reel in the fullscreen
   viewer (js/reel-viewer.js) on this page; closing that continues to the
   reels page with the reel highlighted. The rest of the card opens the
   category page as usual. */
(() => {
  const root = document.querySelector('.mobile-gallery-index');
  if (!root) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const REEL_BASE = 'assets/videos/short-form-reels/';
  const PLAY_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"></path></svg>';
  let initialized = false;
  const initialize = () => {
    if (!mobile.matches || initialized) return;
    initialized = true;
    const categories = window.MOBILE_GALLERY_DATA || [];
    const observer = 'IntersectionObserver' in window && !reduced.matches ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (mobile.matches && !reduced.matches) entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' }) : null;
    categories.forEach(category => {
      const card = root.querySelector(`[data-category="${category.id}"]`);
      if (!card || !category.previews.length) return;
      const image = card.querySelector('.mobile-gallery-preview');
      // Hand-picked categories always lead with their first featured photo.
      const curated = (window.GALLERY_CATEGORIES || []).some(c => c.id === category.id && c.featured?.length);
      const preview = curated ? category.previews[0] : category.previews[Math.floor(Math.random() * category.previews.length)];
      // Apply the real ratio synchronously before starting the request.
      image.width = preview.width;
      image.height = preview.height;
      // AVIF first (scripts/generate-home-previews.js writes one beside each
      // WebP preview; about a quarter of the bytes); the WebP stays the
      // fallback. The <source> goes in before the img gets its src, so only
      // one file is ever fetched.
      const sizes = '(max-width: 760px) calc(100vw - 42px), 640px';
      let avifSource = null;
      if (/\.webp$/.test(preview.src) && image.parentElement?.tagName !== 'PICTURE') {
        const picture = document.createElement('picture');
        avifSource = document.createElement('source');
        avifSource.type = 'image/avif';
        avifSource.sizes = sizes;
        avifSource.srcset = `${preview.src.replace(/\.webp$/, '.avif')} ${preview.width}w`;
        image.before(picture);
        picture.append(avifSource, image);
        // A missing AVIF copy: fall back to the WebP set below.
        image.addEventListener('error', () => avifSource?.remove(), { once: true });
      }
      image.src = preview.src;
      image.sizes = sizes;
      image.srcset = `${preview.src} ${preview.width}w`;
      // A missing image: try the category's other (non-reel) previews in turn
      // rather than leaving the card's picture empty.
      if (!preview.reel) {
        const spares = category.previews.filter(p => p !== preview && !p.reel);
        image.addEventListener('error', function retry() {
          // The AVIF copy failing just falls back to this preview's WebP.
          if (/\.avif(\?|$)/.test(image.currentSrc)) return;
          const next = spares.shift();
          if (!next) { image.removeEventListener('error', retry); return; }
          image.width = next.width;
          image.height = next.height;
          image.srcset = `${next.src} ${next.width}w`;
          image.src = next.src;
        });
      }
      if (preview.reel) {
        const media = image.closest('.mobile-gallery-media');
        const file = encodeURIComponent(preview.reel);
        const play = document.createElement('span');
        play.className = 'mobile-gallery-play';
        play.setAttribute('aria-hidden', 'true');
        play.innerHTML = PLAY_ICON;
        media.appendChild(play);
        // The light preview clip when there is one, else the reel itself.
        const clip = preview.reelPreview ? preview.reelPreview.split('/').map(encodeURIComponent).join('/') : file;
        window.createReelPreviews?.().add(media, REEL_BASE + clip, preview.src);
        // The full reel plays in the fullscreen viewer right here; closing it
        // (or Back) returns to this card, at the same scroll position. The
        // rest of the card still opens the reels page.
        let viewer = null;
        card.addEventListener('click', (event) => {
          if (event.defaultPrevented || !event.target.closest('.mobile-gallery-media')) return;
          viewer = viewer || window.createReelViewer?.([{
            src: REEL_BASE + file,
            poster: preview.src,
            ratio: preview.width / preview.height,
            title: '',
            alt: media.querySelector('img')?.alt || '',
            label: window.i18n && window.i18n.lang !== 'en' ? window.i18n.t(`category.${category.id}.title`, null, `${category.title} reel`) : `${category.title} reel`,
            brand: '',
          }]);
          if (!viewer) return; // falls through to the category page
          event.preventDefault();
          viewer.open(0, card);
        });
      }
      observer?.observe(card);
    });
    reduced.addEventListener('change', () => {
      if (reduced.matches) {
        observer?.disconnect();
        root.querySelectorAll('.is-revealed').forEach(card => card.classList.remove('is-revealed'));
      }
    });
  };
  initialize();
  mobile.addEventListener('change', initialize);
})();
