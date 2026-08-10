(() => {
  const root = document.documentElement;
  const body = document.body;

  // Header: theme toggle
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    const updateToggleState = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      const label = isDark ? "Switch to light mode" : "Switch to dark mode";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("data-tooltip", label);
    };

    updateToggleState();

    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      updateToggleState();
    });

    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (event) => {
          let hasStoredPreference = false;
          try {
            hasStoredPreference = Boolean(localStorage.getItem("theme"));
          } catch (e) {}
          if (hasStoredPreference) return;

          root.setAttribute("data-theme", event.matches ? "dark" : "light");
          updateToggleState();
        });
    }
  }

  // Header: mobile nav
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (menuToggle && nav) {
    const closeMenu = () => {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      body.classList.remove("menu-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      body.classList.toggle("menu-open", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  // --- Project data resolution ---
  const projects = window.PROJECTS || [];
  if (!projects.length) return;

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("project");
  let projectIndex = projects.findIndex((p) => p.id === requestedId);
  if (projectIndex < 0) projectIndex = 0;
  const project = projects[projectIndex];

  const spot = (index) => ({
    x: `${15 + ((index * 37) % 70)}%`,
    y: `${15 + ((index * 53) % 70)}%`,
  });

  const applyTone = (el, index) => {
    el.classList.add("gallery-image", project.tone);
    const { x, y } = spot(index);
    el.style.setProperty("--spot-x", x);
    el.style.setProperty("--spot-y", y);
  };

  // --- Header / intro content ---
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const projectNumber = String(projectIndex + 1).padStart(2, "0");

  document.title = `${project.title} ${project.category} | Gil Tejano`;
  setText("project-eyebrow", `Project ${projectNumber} — ${project.category}`);
  setText("project-title", project.title);
  setText("project-year", project.year);
  setText("project-role", project.role);
  setText("project-deliverables", project.deliverables);
  setText("project-overview", project.overview);
  setText("project-counter", `${projectNumber} / ${String(projects.length).padStart(2, "0")}`);

  // --- Hero ---
  const hero = document.getElementById("project-hero");
  if (hero) applyTone(hero, 1);

  // --- Gallery blocks ---
  const galleryRoot = document.getElementById("project-gallery");
  let nextIndex = 2;
  const galleryImages = hero ? [hero] : [];
  const galleryBlocks = [];

  (project.gallery || []).forEach((block) => {
    const section = document.createElement("div");
    section.className = `gallery-block gallery-block--${block.type}`;

    const makeImage = () => {
      const img = document.createElement("div");
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      img.setAttribute("aria-label", "Open image fullscreen");
      img.dataset.galleryIndex = String(nextIndex);
      applyTone(img, nextIndex);
      nextIndex += 1;
      galleryImages.push(img);
      return img;
    };

    if (block.type === "two-col") {
      section.appendChild(makeImage());
      section.appendChild(makeImage());
    } else if (block.type === "edge") {
      section.style.setProperty("--edge-count", String(block.count || 3));
      for (let i = 0; i < (block.count || 3); i += 1) {
        section.appendChild(makeImage());
      }
    } else {
      section.appendChild(makeImage());
      if (block.caption) {
        const caption = document.createElement("p");
        caption.className = "gallery-caption";
        caption.textContent = block.caption;
        section.appendChild(caption);
      }
    }

    galleryBlocks.push(section);
    if (galleryRoot) galleryRoot.appendChild(section);
  });

  // --- Fade-and-rise reveal as gallery blocks scroll into view ---
  if (galleryBlocks.length && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    galleryBlocks.forEach((block) => revealObserver.observe(block));
  } else {
    galleryBlocks.forEach((block) => block.classList.add("is-revealed"));
  }

  // --- Prev / next brand navigation ---
  const nextProject = projects[(projectIndex + 1) % projects.length];
  const prevProject = projects[(projectIndex - 1 + projects.length) % projects.length];

  const setBrandNavLink = (id, target, label) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.href = `project.html?project=${target.id}`;
    el.setAttribute("aria-label", `${label} ${target.title}`);
  };

  setBrandNavLink("brand-nav-prev", prevProject, "Previous brand:");
  setBrandNavLink("brand-nav-next", nextProject, "Next brand:");

  // --- Closing: outcome & credits ---
  setText("project-outcome", project.outcome);
  const creditsRoot = document.getElementById("project-credits");
  if (creditsRoot) {
    (project.credits || []).forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      creditsRoot.appendChild(p);
    });
  }

  // --- Floating gallery index (scroll-tracked) ---
  const galleryIndexEl = document.getElementById("gallery-index");
  const galleryIndexCurrent = document.getElementById("gallery-index-current");
  const galleryIndexTotal = document.getElementById("gallery-index-total");
  const total = galleryImages.length;
  if (galleryIndexTotal) galleryIndexTotal.textContent = String(total).padStart(2, "0");

  if (galleryIndexEl && total) {
    let visibleCount = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleCount += 1;
          } else {
            visibleCount = Math.max(0, visibleCount - 1);
          }
        });

        galleryIndexEl.classList.toggle("is-visible", visibleCount > 0);

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const index = Number(visible.target.dataset.galleryIndex || 1);
          if (galleryIndexCurrent) {
            galleryIndexCurrent.textContent = String(index).padStart(2, "0");
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    galleryImages.forEach((img) => observer.observe(img));
  }

  // --- Lightbox ---
  const lightbox = document.getElementById("lightbox");
  const lightboxStage = document.getElementById("lightbox-stage");
  const lightboxClose = document.querySelector(".lightbox-close");
  const lightboxPrev = document.querySelector(".lightbox-zone-prev");
  const lightboxNext = document.querySelector(".lightbox-zone-next");
  const lightboxCurrent = document.getElementById("lightbox-current");
  const lightboxTotal = document.getElementById("lightbox-total");

  if (lightbox && lightboxStage && total) {
    if (lightboxTotal) lightboxTotal.textContent = String(total).padStart(2, "0");

    const slides = galleryImages.map((img, i) => {
      const slide = document.createElement("div");
      slide.className = `gallery-image ${project.tone}`;
      const { x, y } = spot(i + 1);
      slide.style.setProperty("--spot-x", x);
      slide.style.setProperty("--spot-y", y);
      lightboxStage.appendChild(slide);
      return slide;
    });

    let activeSlide = 0;
    let lastTrigger = null;

    const showSlide = (i) => {
      slides[activeSlide]?.classList.remove("is-active");
      activeSlide = i;
      slides[activeSlide]?.classList.add("is-active");
      if (lightboxCurrent) {
        lightboxCurrent.textContent = String(activeSlide + 1).padStart(2, "0");
      }
    };

    const openLightbox = (i, trigger) => {
      lastTrigger = trigger || null;
      showSlide(i);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      body.classList.add("lightbox-open");
      lightboxClose?.focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      body.classList.remove("lightbox-open");
      lastTrigger?.focus();
    };

    const goNext = () => showSlide((activeSlide + 1) % slides.length);
    const goPrev = () => showSlide((activeSlide - 1 + slides.length) % slides.length);

    galleryImages.forEach((img, i) => {
      img.addEventListener("click", () => openLightbox(i, img));
      img.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(i, img);
        }
      });
    });

    lightboxClose?.addEventListener("click", closeLightbox);
    lightboxPrev?.addEventListener("click", goPrev);
    lightboxNext?.addEventListener("click", goNext);

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    });

    let touchStartX = 0;
    let touchStartY = 0;
    lightbox.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    lightbox.addEventListener(
      "touchend",
      (event) => {
        const deltaX = event.changedTouches[0].clientX - touchStartX;
        const deltaY = event.changedTouches[0].clientY - touchStartY;
        if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
        if (deltaX < 0) goNext();
        else goPrev();
      },
      { passive: true }
    );
  }
})();
