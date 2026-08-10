(() => {
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

  const indexButtons = Array.from(document.querySelectorAll(".index-button"));
  const slides = Array.from(document.querySelectorAll(".project-visual"));
  const currentSlideLabel = document.getElementById("current-slide");
  const AUTOPLAY_DELAY = 6000;
  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  if (activeIndex < 0) activeIndex = 0;
  let autoplayTimer = null;

  const formatIndex = (index) => String(index + 1).padStart(2, "0");

  const goToSlide = (index) => {
    if (index === activeIndex || !slides[index]) return;

    slides[activeIndex].classList.remove("is-active");
    slides[activeIndex].setAttribute("aria-hidden", "true");
    indexButtons[activeIndex]?.classList.remove("is-active");
    indexButtons[activeIndex]?.setAttribute("aria-selected", "false");

    activeIndex = index;

    slides[activeIndex].classList.add("is-active");
    slides[activeIndex].setAttribute("aria-hidden", "false");
    indexButtons[activeIndex]?.classList.add("is-active");
    indexButtons[activeIndex]?.setAttribute("aria-selected", "true");

    if (currentSlideLabel) {
      currentSlideLabel.textContent = formatIndex(activeIndex);
    }
  };

  const restartAutoplay = () => {
    if (autoplayTimer) clearInterval(autoplayTimer);
    if (slides.length < 2) return;
    autoplayTimer = setInterval(() => {
      goToSlide((activeIndex + 1) % slides.length);
    }, AUTOPLAY_DELAY);
  };

  indexButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      goToSlide(index);
      restartAutoplay();
    });
  });

  restartAutoplay();
})();
