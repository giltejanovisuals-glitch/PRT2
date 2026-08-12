(() => {
  const panels = document.querySelectorAll(".showcase-panel");
  if (!panels.length) return;

  panels[0].classList.add("is-expanded");

  const mobileQuery = window.matchMedia("(max-width: 760px)");

  panels.forEach((panel) => {
    panel.addEventListener("click", (event) => {
      if (!mobileQuery.matches) return;
      if (panel.classList.contains("is-expanded")) return;

      event.preventDefault();
      panels.forEach((p) => p.classList.remove("is-expanded"));
      panel.classList.add("is-expanded");
    });
  });
})();
