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

  // --- Category data resolution ---
  const categories = window.GALLERY_CATEGORIES || [];
  if (!categories.length) return;

  const params = new URLSearchParams(window.location.search);
  const filenameId = window.location.pathname
    .split("/")
    .pop()
    .replace(/\.html$/, "");
  const requestedId = params.get("category") || filenameId;
  let categoryIndex = categories.findIndex((c) => c.id === requestedId);
  if (categoryIndex < 0) categoryIndex = 0;
  const category = categories[categoryIndex];

  const projectMain = document.querySelector(".project");
  if (projectMain) projectMain.setAttribute("data-category", category.id);

  const spot = (index) => ({
    x: `${15 + ((index * 37) % 70)}%`,
    y: `${15 + ((index * 53) % 70)}%`,
  });

  const applyTone = (el, index) => {
    el.classList.add("gallery-image", category.tone);
    const { x, y } = spot(index);
    el.style.setProperty("--spot-x", x);
    el.style.setProperty("--spot-y", y);
  };

  // --- Header / intro content ---
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const categoryNumber = String(categoryIndex + 1).padStart(2, "0");
  const total = categories.length;

  document.title = `${category.title} | Gil Tejano Culas`;
  setText("category-eyebrow", `Category ${categoryNumber} — Project Gallery`);
  setText("category-title", category.title);
  setText("category-intro", category.intro);
  setText("category-stat", `${category.entries.length} Selected Works`);
  setText("project-counter", `${categoryNumber} / ${String(total).padStart(2, "0")}`);

  // --- Entries: each renders 1-2 gallery tiles plus a caption ---
  const entriesRoot = document.getElementById("category-entries");
  let nextIndex = 1;
  const galleryImages = [];
  const revealBlocks = [];

  category.entries.forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "category-entry gallery-block";

    const media = document.createElement("div");
    media.className = "category-entry-media";
    if (entry.layout === "pair") media.classList.add("is-pair");
    if (entry.layout === "portrait") media.classList.add("is-portrait");

    const tileCount = entry.layout === "pair" ? 2 : 1;
    for (let t = 0; t < tileCount; t += 1) {
      const tile = document.createElement("div");
      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("aria-label", "Open image fullscreen");
      tile.dataset.galleryIndex = String(nextIndex);
      applyTone(tile, nextIndex);
      nextIndex += 1;
      galleryImages.push(tile);
      media.appendChild(tile);
    }

    const caption = document.createElement("div");
    caption.className = "category-entry-caption";

    const meta = document.createElement("p");
    meta.className = "category-entry-meta";
    const brandSpan = document.createElement("span");
    brandSpan.className = "category-entry-brand";
    brandSpan.textContent = entry.brand;
    meta.appendChild(brandSpan);
    meta.appendChild(document.createTextNode(` · ${entry.year} · ${entry.type}`));
    caption.appendChild(meta);

    if (entry.contribution) {
      const contribution = document.createElement("p");
      contribution.className = "category-entry-contribution";
      contribution.textContent = entry.contribution;
      caption.appendChild(contribution);
    }

    wrapper.appendChild(media);
    wrapper.appendChild(caption);
    revealBlocks.push(wrapper);
    if (entriesRoot) entriesRoot.appendChild(wrapper);
  });

  // --- Fade-and-rise reveal as entries scroll into view ---
  if (revealBlocks.length && "IntersectionObserver" in window) {
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
    revealBlocks.forEach((block) => revealObserver.observe(block));
  } else {
    revealBlocks.forEach((block) => block.classList.add("is-revealed"));
  }

  // --- Prev / next category navigation ---
  const nextCategory = categories[(categoryIndex + 1) % categories.length];
  const prevCategory = categories[(categoryIndex - 1 + categories.length) % categories.length];

  const setCategoryNavLink = (id, target, label) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.href = `${target.id}.html`;
    el.setAttribute("aria-label", `${label} ${target.title}`);
  };

  setCategoryNavLink("brand-nav-prev", prevCategory, "Previous category:");
  setCategoryNavLink("brand-nav-next", nextCategory, "Next category:");

  // --- Floating gallery index (scroll-tracked) ---
  const galleryIndexEl = document.getElementById("gallery-index");
  const galleryIndexCurrent = document.getElementById("gallery-index-current");
  const galleryIndexTotal = document.getElementById("gallery-index-total");
  const imageTotal = galleryImages.length;
  if (galleryIndexTotal) galleryIndexTotal.textContent = String(imageTotal).padStart(2, "0");

  if (galleryIndexEl && imageTotal) {
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

  if (lightbox && lightboxStage && imageTotal) {
    if (lightboxTotal) lightboxTotal.textContent = String(imageTotal).padStart(2, "0");

    const slides = galleryImages.map((img, i) => {
      const slide = document.createElement("div");
      slide.className = `gallery-image ${category.tone}`;
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
