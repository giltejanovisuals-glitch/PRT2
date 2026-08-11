(() => {
  const root = document.documentElement;
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

  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  const body = document.body;

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

  const dots = Array.from(document.querySelectorAll(".dot"));
  const slides = Array.from(document.querySelectorAll(".carousel-slide"));
  const prevZone = document.querySelector(".carousel-zone-prev");
  const nextZone = document.querySelector(".carousel-zone-next");
  const AUTOPLAY_DELAY = 6000;
  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  if (activeIndex < 0) activeIndex = 0;
  let autoplayTimer = null;

  const goToSlide = (index) => {
    if (index === activeIndex || !slides[index]) return;

    slides[activeIndex].classList.remove("is-active");
    slides[activeIndex].setAttribute("aria-hidden", "true");
    dots[activeIndex]?.classList.remove("is-active");
    dots[activeIndex]?.setAttribute("aria-selected", "false");

    activeIndex = index;

    slides[activeIndex].classList.add("is-active");
    slides[activeIndex].setAttribute("aria-hidden", "false");
    dots[activeIndex]?.classList.add("is-active");
    dots[activeIndex]?.setAttribute("aria-selected", "true");
  };

  const restartAutoplay = () => {
    if (autoplayTimer) clearInterval(autoplayTimer);
    if (slides.length < 2) return;
    autoplayTimer = setInterval(() => {
      goToSlide((activeIndex + 1) % slides.length);
    }, AUTOPLAY_DELAY);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      goToSlide(index);
      restartAutoplay();
    });
  });

  if (prevZone) {
    prevZone.addEventListener("click", () => {
      goToSlide((activeIndex - 1 + slides.length) % slides.length);
      restartAutoplay();
    });
  }

  if (nextZone) {
    nextZone.addEventListener("click", () => {
      goToSlide((activeIndex + 1) % slides.length);
      restartAutoplay();
    });
  }

  restartAutoplay();

  const workThumbs = Array.from(document.querySelectorAll(".work-thumb"));
  const workSlides = Array.from(document.querySelectorAll(".work-feature-slide"));
  const workZonePrev = document.querySelector(".work-zone-prev");
  const workZoneNext = document.querySelector(".work-zone-next");
  const workFeatureMedia = document.querySelector(".work-feature-media");
  const workThumbsTrack = document.querySelector(".work-thumbs");
  const workCounter = document.getElementById("work-current");
  const workDetailsTitle = document.querySelector(".work-details-title");
  const workDetailsMeta = document.querySelector(".work-details-meta");
  const workDetailsOverview = document.querySelector(".work-details-overview");
  const workDetailsRole = document.querySelector(".work-details-role");
  const workDetailsDeliverables = document.getElementById("work-details-deliverables-value");
  const workFeatureTitle = document.querySelector(".work-feature-title");
  const workFeatureMeta = document.querySelector(".work-feature-meta");
  const workFeatureLink = document.getElementById("work-feature-link");
  const workDetailsLink = document.getElementById("work-details-link");
  const WORK_AUTOPLAY_DELAY = 7000;

  if (workThumbs.length && workSlides.length) {
    let workActiveIndex = workThumbs.findIndex((thumb) =>
      thumb.classList.contains("is-active")
    );
    if (workActiveIndex < 0) workActiveIndex = 0;
    let workAutoplayTimer = null;

    const updateWorkDetails = (thumb) => {
      const metaText = `${thumb.dataset.category || ""} · ${thumb.dataset.year || ""}`;

      if (workDetailsTitle) workDetailsTitle.textContent = thumb.dataset.title || "";
      if (workDetailsMeta) workDetailsMeta.textContent = metaText;
      if (workDetailsOverview) workDetailsOverview.textContent = thumb.dataset.overview || "";
      if (workDetailsRole) workDetailsRole.textContent = thumb.dataset.role || "";
      if (workDetailsDeliverables) workDetailsDeliverables.textContent = thumb.dataset.deliverables || "";

      if (workFeatureTitle) workFeatureTitle.textContent = thumb.dataset.title || "";
      if (workFeatureMeta) workFeatureMeta.textContent = metaText;

      const projectUrl = thumb.dataset.id ? `pages/${thumb.dataset.id}.html` : "#";
      if (workFeatureLink) workFeatureLink.href = projectUrl;
      if (workDetailsLink) workDetailsLink.href = projectUrl;
    };

    const goToWorkProject = (index) => {
      if (index === workActiveIndex || !workThumbs[index] || !workSlides[index]) return;

      workThumbs[workActiveIndex].classList.remove("is-active");
      workThumbs[workActiveIndex].setAttribute("aria-selected", "false");
      workSlides[workActiveIndex].classList.remove("is-active");
      workSlides[workActiveIndex].setAttribute("aria-hidden", "true");

      workActiveIndex = index;

      const activeThumb = workThumbs[workActiveIndex];
      activeThumb.classList.add("is-active");
      activeThumb.setAttribute("aria-selected", "true");
      workSlides[workActiveIndex].classList.add("is-active");
      workSlides[workActiveIndex].setAttribute("aria-hidden", "false");

      if (workCounter) workCounter.textContent = String(workActiveIndex + 1).padStart(2, "0");
      updateWorkDetails(activeThumb);

      activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    };

    const stopWorkAutoplay = () => {
      if (workAutoplayTimer) {
        clearInterval(workAutoplayTimer);
        workAutoplayTimer = null;
      }
    };

    const startWorkAutoplay = () => {
      if (workThumbs.length < 2) return;
      workAutoplayTimer = setInterval(() => {
        goToWorkProject((workActiveIndex + 1) % workThumbs.length);
      }, WORK_AUTOPLAY_DELAY);
    };

    workThumbs.forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        stopWorkAutoplay();
        goToWorkProject(index);
      });
    });

    if (workZonePrev) {
      workZonePrev.addEventListener("click", () => {
        stopWorkAutoplay();
        goToWorkProject((workActiveIndex - 1 + workThumbs.length) % workThumbs.length);
      });
    }

    if (workZoneNext) {
      workZoneNext.addEventListener("click", () => {
        stopWorkAutoplay();
        goToWorkProject((workActiveIndex + 1) % workThumbs.length);
      });
    }

    // Touch swipe on the featured image
    if (workFeatureMedia) {
      let touchStartX = 0;
      let touchStartY = 0;

      workFeatureMedia.addEventListener(
        "touchstart",
        (event) => {
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
        },
        { passive: true }
      );

      workFeatureMedia.addEventListener(
        "touchend",
        (event) => {
          const deltaX = event.changedTouches[0].clientX - touchStartX;
          const deltaY = event.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;

          stopWorkAutoplay();
          if (deltaX < 0) {
            goToWorkProject((workActiveIndex + 1) % workThumbs.length);
          } else {
            goToWorkProject((workActiveIndex - 1 + workThumbs.length) % workThumbs.length);
          }
        },
        { passive: true }
      );
    }

    // Drag-to-scroll on the thumbnail strip
    if (workThumbsTrack) {
      let isDragging = false;
      let dragMoved = false;
      let dragStartX = 0;
      let dragStartScroll = 0;

      workThumbsTrack.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") return;
        isDragging = true;
        dragMoved = false;
        dragStartX = event.clientX;
        dragStartScroll = workThumbsTrack.scrollLeft;
        workThumbsTrack.classList.add("is-dragging");
        workThumbsTrack.setPointerCapture(event.pointerId);
      });

      workThumbsTrack.addEventListener("pointermove", (event) => {
        if (!isDragging) return;
        const delta = event.clientX - dragStartX;
        if (Math.abs(delta) > 4) {
          dragMoved = true;
          stopWorkAutoplay();
        }
        workThumbsTrack.scrollLeft = dragStartScroll - delta;
      });

      const endDrag = () => {
        isDragging = false;
        workThumbsTrack.classList.remove("is-dragging");
      };

      workThumbsTrack.addEventListener("pointerup", endDrag);
      workThumbsTrack.addEventListener("pointerleave", endDrag);

      // Suppress the click that follows a drag so it doesn't also select a thumb
      workThumbsTrack.addEventListener(
        "click",
        (event) => {
          if (dragMoved) {
            event.stopPropagation();
            event.preventDefault();
          }
        },
        true
      );
    }

    updateWorkDetails(workThumbs[workActiveIndex]);
    startWorkAutoplay();
  }
})();
