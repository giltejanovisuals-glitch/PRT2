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
      image.src = preview.src;
      image.sizes = '(max-width: 760px) calc(100vw - 42px), 640px';
      image.srcset = `${preview.src} ${preview.width}w`;
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
        // The full reel plays in the fullscreen viewer right here; closing
        // it continues to the reels page, opened at the gallery with this
        // reel picked out (Back returns to this spot on the homepage).
        const reelPage = `pages/${category.id}.html?reel=${file}`;
        let viewer = null;
        card.addEventListener('click', (event) => {
          if (event.defaultPrevented || !event.target.closest('.mobile-gallery-media')) return;
          viewer = viewer || window.createReelViewer?.([{
            src: REEL_BASE + file,
            poster: preview.src,
            ratio: preview.width / preview.height,
            title: '',
            label: `${category.title} reel`,
            brand: '',
          }], { closeTo: () => reelPage });
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
