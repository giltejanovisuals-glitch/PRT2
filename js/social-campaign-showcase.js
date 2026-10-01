(() => {
  const initialiseSocialShowcase = () => {
    const wall = document.getElementById("editorial-wall");
    if (!wall || document.querySelector(".social-showcase-scroll")) return;

    const shell = document.createElement("div");
    shell.className = "social-showcase-scroll";
    shell.setAttribute("aria-label", "Scroll to explore campaign work");
    wall.parentNode.insertBefore(shell, wall);
    shell.appendChild(wall);

    const rows = Array.from(wall.querySelectorAll(".editorial-row"));
    const tracks = rows.map((row) => row.querySelector(".editorial-row-track"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");

    let frame = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const mix = (from, to, progress) => from + (to - from) * progress;

    const render = () => {
      frame = 0;

      if (reducedMotion.matches || mobile.matches) {
        wall.style.removeProperty("--social-tilt");
        wall.style.removeProperty("--social-scale");
        tracks.forEach((track) => {
          if (track) track.style.transform = "";
        });
        return;
      }

      const rect = shell.getBoundingClientRect();
      const travel = Math.max(shell.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-rect.top / travel, 0, 1);
      const settle = clamp(progress / 0.48, 0, 1);
      const galleryProgress = clamp((progress - 0.24) / 0.76, 0, 1);

      wall.style.setProperty("--social-tilt", `${mix(66, 0, settle).toFixed(2)}deg`);
      wall.style.setProperty("--social-scale", mix(1.14, 1, settle).toFixed(4));

      const ranges = [
        [-12, 5],
        [16, -6],
        [-10, 4],
      ];

      tracks.forEach((track, index) => {
        if (!track) return;
        const range = ranges[index % ranges.length];
        const y = mix(range[0], range[1], galleryProgress);
        track.style.transform = `translate3d(0, ${y.toFixed(3)}%, 0)`;
      });
    };

    const requestRender = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(render);
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);
    reducedMotion.addEventListener?.("change", requestRender);
    mobile.addEventListener?.("change", requestRender);

    wall.querySelectorAll(".editorial-tile").forEach((tile) => {
      tile.addEventListener("pointerenter", () => tile.closest(".editorial-row")?.classList.add("has-active-tile"));
      tile.addEventListener("pointerleave", () => tile.closest(".editorial-row")?.classList.remove("has-active-tile"));
    });

    requestRender();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseSocialShowcase, { once: true });
  } else {
    initialiseSocialShowcase();
  }
})();
