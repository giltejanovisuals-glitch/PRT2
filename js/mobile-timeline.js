/* Each role expands independently; native details also works without JS. */
(() => {
  const root = document.querySelector('.mobile-timeline');
  if (!root) return;
  const entries = Array.from(root.querySelectorAll('details'));
  const summaries = entries.map(entry => entry.querySelector('summary'));
  entries.forEach((entry, index) => {
    const synchronize = () => summaries[index].setAttribute('aria-expanded', String(entry.open));
    entry.addEventListener('toggle', synchronize);
    synchronize();
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
})();
