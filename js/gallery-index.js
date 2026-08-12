(() => {
  const panelsRoot = document.querySelector(".showcase-panels");
  if (!panelsRoot) return;

  const panels = Array.from(panelsRoot.querySelectorAll(".showcase-panel"));
  if (!panels.length) return;

  const desktopQuery = window.matchMedia("(min-width: 900px)");

  // --- Accordion state (used below the 900px desktop breakpoint) ---
  const setExpanded = (panel, expanded) => {
    panel.classList.toggle("is-expanded", expanded);
    panel
      .querySelector(".showcase-panel-trigger")
      ?.setAttribute("aria-expanded", String(expanded));
  };

  const collapseAll = () => panels.forEach((panel) => setExpanded(panel, false));

  // Keep the first category open by default, but only in accordion mode —
  // .is-expanded's visual effect (summary fade-in) isn't width-gated in
  // CSS, since it's shared with the desktop :hover/:focus-within reveal,
  // so it must never be set on desktop or panel 1 shows its summary at
  // rest while the other four don't.
  const applyDefaultExpansion = () => {
    if (desktopQuery.matches) {
      collapseAll();
    } else if (!panels.some((panel) => panel.classList.contains("is-expanded"))) {
      setExpanded(panels[0], true);
    }
  };

  applyDefaultExpansion();
  desktopQuery.addEventListener("change", applyDefaultExpansion);

  // --- Click behavior ---
  // Desktop (>=900px): hover/focus already drives the visual expand via
  // CSS; a click anywhere on the panel navigates immediately, keeping the
  // whole expanded panel clickable.
  // Below 900px: there's no separate CTA, so the panel itself is the
  // accordion header — tapping a collapsed panel opens it (revealing the
  // summary); tapping it again while already open navigates.
  panels.forEach((panel) => {
    panel.addEventListener("click", (event) => {
      if (desktopQuery.matches) {
        const href = panel.dataset.href;
        if (href) window.location.href = href;
        return;
      }

      if (!event.target.closest(".showcase-panel-trigger")) return;

      const alreadyOpen = panel.classList.contains("is-expanded");
      if (alreadyOpen) {
        const href = panel.dataset.href;
        if (href) window.location.href = href;
        return;
      }

      event.preventDefault();
      collapseAll();
      setExpanded(panel, true);
    });
  });
})();
