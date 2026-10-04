/* The grid and external links remain native. Reveal only once on mobile. */
(() => {
  const track = document.querySelector('#supported-brands .brands-track');
  if (!track) return;
  const mobile = window.matchMedia('(max-width: 760px)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const logos = Array.from(track.querySelectorAll('.brand-logo'));
  const synchronize = () => {
    if (mobile.matches) track.removeAttribute('tabindex');
    else track.setAttribute('tabindex', '0');
  };
  mobile.addEventListener('change', synchronize);
  synchronize();
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || !mobile.matches || motion.matches) return;
      const logo = entry.target;
      logo.classList.add('is-revealing');
      logo.addEventListener('animationend', () => logo.classList.remove('is-revealing'), { once: true });
      // Also clear the class if focus or a motion preference cancels the reveal.
      window.setTimeout(() => logo.classList.remove('is-revealing'), 340);
      observer.unobserve(logo);
    });
  }, { threshold: .1 });
  logos.forEach((logo, index) => {
    logo.style.setProperty('--brand-delay', `${(index % 2) * 60}ms`);
    observer.observe(logo);
  });
})();
