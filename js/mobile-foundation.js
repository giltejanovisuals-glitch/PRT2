/* Content is visible by default; each entry gets one optional mobile reveal. */
(() => {
  const entries = document.querySelectorAll('#foundation .found-item');
  if (!entries.length || !('IntersectionObserver' in window)) return;
  const mobile = window.matchMedia('(max-width: 760px)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(changes => {
    changes.forEach(change => {
      if (!change.isIntersecting || !mobile.matches) return;
      const entry = change.target;
      observer.unobserve(entry);
      if (motion.matches) return;
      entry.classList.add('is-revealing');
      entry.addEventListener('animationend', () => entry.classList.remove('is-revealing'), { once: true });
      window.setTimeout(() => entry.classList.remove('is-revealing'), 340);
    });
  }, { threshold: .1 });
  entries.forEach(entry => observer.observe(entry));
})();
