/* Select once per visit; never cycle the mobile category previews. */
(() => {
  const root = document.querySelector('.mobile-gallery-index');
  if (!root) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
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
      const preview = category.previews[Math.floor(Math.random() * category.previews.length)];
      // Apply the real ratio synchronously before starting the request.
      image.width = preview.width;
      image.height = preview.height;
      image.src = preview.src;
      image.sizes = '(max-width: 760px) calc(100vw - 42px), 640px';
      image.srcset = `${preview.src} ${preview.width}w`;
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
