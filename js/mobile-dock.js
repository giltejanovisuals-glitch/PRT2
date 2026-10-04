/* Native radio selection drives the dock and info panel. Only direct
   selection changes the active tool; scrolling never selects or recenters. */
(() => {
  const root = document.querySelector('.mobile-dock');
  if (!root) return;
  const track = root.querySelector('.mobile-dock-track');
  const tools = Array.from(track.querySelectorAll('.mobile-dock-tool'));
  const radios = tools.map(tool => tool.querySelector('input'));
  const updateNeighbors = () => {
    const selected = radios.findIndex(radio => radio.checked);
    tools.forEach((tool, index) => tool.classList.toggle('is-neighbor', Math.abs(selected - index) === 1));
  };
  radios.forEach(radio => radio.addEventListener('change', updateNeighbors));
  let touch = null;
  let moved = false;
  track.addEventListener('touchstart', event => {
    moved = false;
    touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  track.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1) return;
    if (Math.hypot(event.touches[0].clientX - touch.x, event.touches[0].clientY - touch.y) > 8) moved = true;
  }, { passive: true });
  track.addEventListener('touchend', () => { touch = null; }, { passive: true });
  track.addEventListener('touchcancel', () => { touch = null; moved = false; }, { passive: true });
  track.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') moved = false; }, { passive: true });
  track.addEventListener('click', event => {
    if (moved && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    moved = false;
  }, true);
  updateNeighbors();
})();
