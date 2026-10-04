/* Native details works without scripts. Enhance its state announcements
   and add optional arrow-key navigation between the five summary rows. */
(() => {
  const root = document.querySelector('.mobile-capabilities');
  if (!root) return;
  const items = Array.from(root.querySelectorAll('details'));
  const summaries = items.map(item => item.querySelector('summary'));
  const synchronize = () => items.forEach((item, index) => {
    summaries[index].setAttribute('aria-expanded', String(item.open));
  });
  items.forEach(item => {
    item.addEventListener('toggle', () => {
      // Also enforce exclusivity in browsers without details[name] support.
      if (item.open) items.forEach(other => { if (other !== item) other.open = false; });
      synchronize();
    });
  });
  root.addEventListener('keydown', event => {
    const index = summaries.indexOf(event.target);
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % summaries.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + summaries.length) % summaries.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = summaries.length - 1;
    else return;
    event.preventDefault();
    summaries[next].focus();
  });
  synchronize();
})();
