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
  const workDetailsBlock = document.querySelector(".work-details");
  const workDetailsTitle = document.querySelector(".work-details-title");
  const workDetailsMeta = document.querySelector(".work-details-meta");
  const workDetailsOverview = document.querySelector(".work-details-overview");
  const workDetailsLink = document.getElementById("work-details-link");
  const WORK_AUTOPLAY_DELAY = 7000;
  const WORK_SWAP_FADE_MS = 200;

  if (workThumbs.length && workSlides.length) {
    let workActiveIndex = workThumbs.findIndex((thumb) =>
      thumb.classList.contains("is-active")
    );
    if (workActiveIndex < 0) workActiveIndex = 0;
    let workAutoplayTimer = null;
    let workSwapTimer = null;

    const updateWorkDetails = (thumb, index) => {
      const metaText = `${thumb.dataset.category || ""} · ${thumb.dataset.year || ""}`;

      if (workCounter) workCounter.textContent = String(index + 1).padStart(2, "0");
      if (workDetailsTitle) workDetailsTitle.textContent = thumb.dataset.title || "";
      if (workDetailsMeta) workDetailsMeta.textContent = metaText;
      if (workDetailsOverview) workDetailsOverview.textContent = thumb.dataset.overview || "";

      const projectUrl = thumb.dataset.id ? `pages/${thumb.dataset.id}.html` : "#";
      if (workDetailsLink) workDetailsLink.href = projectUrl;
    };

    // Text and the CTA hold their fixed position and only crossfade —
    // the featured image is the only thing that actually animates/moves.
    const swapWorkDetails = (thumb, index) => {
      if (!workDetailsBlock) {
        updateWorkDetails(thumb, index);
        return;
      }

      if (workSwapTimer) clearTimeout(workSwapTimer);
      workDetailsBlock.classList.add("is-swapping");
      workSwapTimer = window.setTimeout(() => {
        updateWorkDetails(thumb, index);
        workDetailsBlock.classList.remove("is-swapping");
      }, WORK_SWAP_FADE_MS);
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

      swapWorkDetails(activeThumb, workActiveIndex);

      // Scroll only the horizontal thumb strip itself — scrollIntoView()
      // would also walk up to the page's vertical scroll (the strip has
      // no vertical overflow of its own), yanking the whole page down
      // whenever autoplay advances off-screen.
      if (workThumbsTrack) {
        const trackWidth = workThumbsTrack.clientWidth;
        const target =
          activeThumb.offsetLeft - (trackWidth - activeThumb.offsetWidth) / 2;
        workThumbsTrack.scrollTo({ left: target, behavior: "smooth" });
      }
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

    updateWorkDetails(workThumbs[workActiveIndex], workActiveIndex);
    startWorkAutoplay();
  }
})();

(() => {
  // Shared pointer drag-to-scroll for horizontal tracks (capabilities,
  // brands). Mirrors the work-thumbs drag behavior in the IIFE above.
  const enableDragScroll = (track) => {
    if (!track) return;
    let isDragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      isDragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartScroll = track.scrollLeft;
      track.classList.add("is-dragging");
      track.setPointerCapture(event.pointerId);
    });

    track.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      const delta = event.clientX - dragStartX;
      if (Math.abs(delta) > 4) dragMoved = true;
      track.scrollLeft = dragStartScroll - delta;
    });

    const endDrag = () => {
      isDragging = false;
      track.classList.remove("is-dragging");
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointerleave", endDrag);

    track.addEventListener(
      "click",
      (event) => {
        if (dragMoved) {
          event.stopPropagation();
          event.preventDefault();
        }
      },
      true
    );
  };

  // About Me — reveal label/headline, body copy, then portrait once on
  // scroll into view (see .about.is-inview in style.css for the stagger)
  const aboutSection = document.querySelector(".about");

  if (aboutSection && "IntersectionObserver" in window) {
    const aboutObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            aboutSection.classList.add("is-inview");
            aboutObserver.unobserve(aboutSection);
          }
        });
      },
      { threshold: 0.2 }
    );
    aboutObserver.observe(aboutSection);
  } else if (aboutSection) {
    aboutSection.classList.add("is-inview");
  }

  // 1. Creative Capabilities — prev/next arrows, drag scroll, keyboard nav
  const capTrack = document.getElementById("cap-track");
  const capPrev = document.querySelector(".cap-arrow-prev");
  const capNext = document.querySelector(".cap-arrow-next");

  if (capTrack) {
    enableDragScroll(capTrack);

    const updateCapArrows = () => {
      const maxScroll = capTrack.scrollWidth - capTrack.clientWidth;
      if (capPrev) capPrev.disabled = capTrack.scrollLeft <= 1;
      if (capNext) capNext.disabled = capTrack.scrollLeft >= maxScroll - 1;
    };

    const scrollCapBy = (direction) => {
      const card = capTrack.querySelector(".cap-card");
      const step = card ? card.getBoundingClientRect().width + 16 : capTrack.clientWidth * 0.8;
      capTrack.scrollBy({ left: direction * step, behavior: "smooth" });
    };

    capPrev?.addEventListener("click", () => scrollCapBy(-1));
    capNext?.addEventListener("click", () => scrollCapBy(1));

    capTrack.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollCapBy(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollCapBy(-1);
      }
    });

    capTrack.addEventListener("scroll", updateCapArrows, { passive: true });
    window.addEventListener("resize", updateCapArrows);
    updateCapArrows();
  }

  // 2. My Creative Dock — fixed description panel updates on hover/focus
  const dockTools = Array.from(document.querySelectorAll(".dock-tool"));
  const dockNow = document.getElementById("dock-now");
  const DOCK_DEFAULT_TEXT = dockNow ? dockNow.textContent : "";

  if (dockTools.length && dockNow) {
    const showTool = (tool) => {
      const name = tool.dataset.name || "";
      const use = tool.dataset.use || "";
      dockNow.innerHTML = `<span class="dock-now-name">${name}</span> — ${use}`;
    };

    const resetTool = () => {
      dockNow.textContent = DOCK_DEFAULT_TEXT;
    };

    dockTools.forEach((tool) => {
      tool.addEventListener("mouseenter", () => showTool(tool));
      tool.addEventListener("focus", () => showTool(tool));
      tool.addEventListener("mouseleave", resetTool);
      tool.addEventListener("blur", resetTool);
    });
  }

  // 3. Creative Timeline — reveal the line and stagger the entries in once
  const tlTrack = document.getElementById("tl-track");

  if (tlTrack && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tlTrack.classList.add("is-inview");
            observer.unobserve(tlTrack);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(tlTrack);
  } else if (tlTrack) {
    tlTrack.classList.add("is-inview");
  }

  // 4. Brands I've Supported — drag scroll on the logo strip
  const brandsTrack = document.getElementById("brands-track");
  if (brandsTrack) enableDragScroll(brandsTrack);

  // 5. Start a Creative Build — inquiry form: reveal/collapse, message
  // templates, inline validation, and a real EmailJS submit (see the
  // EMAILJS_* constants right below — fill them in with your own EmailJS
  // account values; see README.md for the exact setup steps).
  const EMAILJS_PUBLIC_KEY = "Py2NgnHRb3qyLJN_l";
  const EMAILJS_SERVICE_ID = "service_prt2";
  const EMAILJS_TEMPLATE_OWNER = "template_jye0baj";
  const EMAILJS_TEMPLATE_CLIENT = ""; // optional — leave blank to skip the client confirmation copy

  if (window.emailjs && EMAILJS_PUBLIC_KEY) {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  const startTrigger = document.getElementById("cta-start-trigger");
  const formWrap = document.getElementById("cta-form-wrap");
  const inquiryForm = document.getElementById("inquiry-form");

  if (startTrigger && formWrap) {
    const openForm = () => {
      formWrap.classList.add("is-open");
      startTrigger.setAttribute("aria-expanded", "true");
      window.requestAnimationFrame(() => {
        formWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      window.setTimeout(() => {
        document.getElementById("inq-name")?.focus();
      }, 350);
    };

    const closeForm = () => {
      formWrap.classList.remove("is-open");
      startTrigger.setAttribute("aria-expanded", "false");
    };

    startTrigger.addEventListener("click", () => {
      if (formWrap.classList.contains("is-open")) {
        closeForm();
      } else {
        openForm();
      }
    });
  }

  const TEMPLATES = {
    new: "Hi Gil, I'm starting a new project and would love your help bringing it to life. It involves [brief description], and I'm hoping to get started around [date]. Could we talk through the creative direction and next steps?",
    existing: "Hi Gil, I'm looking for design support for an existing brand. The project involves [brief description], and I'm hoping to complete it by [date]. Could you help me determine the right creative direction and deliverables?",
    improve: "Hi Gil, I have existing materials I'd like to improve or refresh. This includes [brief description], and I'm hoping to have an updated version by [date]. Could you help assess what would make the biggest difference?",
    ongoing: "Hi Gil, I'm looking for ongoing creative support rather than a one-off project. This would involve [brief description of recurring needs], starting around [date]. Could we discuss how an ongoing collaboration might work?",
    unsure: "Hi Gil, I have a project in mind but I'm not sure exactly what service or deliverables I need. Here's a bit about it: [brief description]. Could you help me figure out the right direction?",
  };

  const templateButtons = Array.from(document.querySelectorAll(".template-btn"));
  const messageField = document.getElementById("inq-message");

  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = TEMPLATES[btn.dataset.template];
      if (messageField && text) {
        messageField.value = text;
        messageField.focus();
      }
      templateButtons.forEach((other) => other.classList.toggle("is-active", other === btn));
    });
  });

  if (inquiryForm) {
    const nameInput = document.getElementById("inq-name");
    const emailInput = document.getElementById("inq-email");
    const companyInput = document.getElementById("inq-company");
    const budgetInput = document.getElementById("inq-budget");
    const timelineInput = document.getElementById("inq-timeline");
    const chipInputs = Array.from(document.querySelectorAll(".chip-input"));
    const chipError = document.getElementById("inquiry-type-error");
    const submitBtn = document.getElementById("inquiry-submit-btn");
    const submitLabel = submitBtn?.querySelector(".form-submit-label");
    const errorBanner = document.getElementById("inquiry-error-banner");
    const successPanel = document.getElementById("inquiry-success");
    const successBody = document.getElementById("inquiry-success-body");
    const resetBtn = document.getElementById("inquiry-reset-btn");

    const setFieldError = (input, errorId, message) => {
      const errorEl = document.getElementById(errorId);
      if (message) {
        input.setAttribute("aria-invalid", "true");
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        }
      } else {
        input.removeAttribute("aria-invalid");
        if (errorEl) {
          errorEl.textContent = "";
          errorEl.hidden = true;
        }
      }
    };

    const validate = () => {
      let valid = true;
      let firstInvalid = null;

      if (!nameInput.value.trim()) {
        setFieldError(nameInput, "inq-name-error", "Please enter your name.");
        valid = false;
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError(nameInput, "inq-name-error", "");
      }

      if (!emailInput.value.trim() || !emailInput.checkValidity()) {
        setFieldError(emailInput, "inq-email-error", "Please enter a valid email address.");
        valid = false;
        firstInvalid = firstInvalid || emailInput;
      } else {
        setFieldError(emailInput, "inq-email-error", "");
      }

      if (!messageField.value.trim()) {
        setFieldError(messageField, "inq-message-error", "Please share a few details about the project.");
        valid = false;
        firstInvalid = firstInvalid || messageField;
      } else {
        setFieldError(messageField, "inq-message-error", "");
      }

      const hasChip = chipInputs.some((chip) => chip.checked);
      if (chipError) chipError.hidden = hasChip;
      if (!hasChip) {
        valid = false;
        firstInvalid = firstInvalid || chipInputs[0];
      }

      return { valid, firstInvalid };
    };

    // Sends the owner-notification email via EmailJS, then best-effort
    // fires the optional client-confirmation template (its failure never
    // fails the inquiry — the owner copy is the one that must succeed).
    const submitInquiry = (templateParams) => {
      if (!window.emailjs || !EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_OWNER) {
        return Promise.reject(
          new Error("EmailJS is not configured yet — set EMAILJS_PUBLIC_KEY/SERVICE_ID/TEMPLATE_OWNER in js/script.js.")
        );
      }

      const ownerSend = window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_OWNER, templateParams);

      if (EMAILJS_TEMPLATE_CLIENT) {
        ownerSend.then(() => {
          window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, templateParams).catch(() => {});
        });
      }

      return ownerSend;
    };

    inquiryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (errorBanner) errorBanner.hidden = true;

      const { valid, firstInvalid } = validate();
      if (!valid) {
        firstInvalid?.focus();
        return;
      }

      const name = nameInput.value.trim();
      const selectedTypes = chipInputs.filter((chip) => chip.checked).map((chip) => chip.value);
      const templateParams = {
        name,
        email: emailInput.value.trim(),
        company: companyInput.value.trim() || "Not provided",
        inquiry_types: selectedTypes.join(", "),
        message: messageField.value.trim(),
        budget: budgetInput.value.trim() || "Not provided",
        timeline: timelineInput.value.trim() || "Not provided",
      };

      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = "Sending…";

      submitInquiry(templateParams)
        .then(() => {
          if (successBody) {
            successBody.textContent = `Thank you for sharing your project, ${name}. I'll review the details and get back to you within 1-2 business days.`;
          }
          inquiryForm.hidden = true;
          if (successPanel) {
            successPanel.hidden = false;
            successPanel.focus();
          }
        })
        .catch((error) => {
          console.error("Inquiry form send failed:", error);
          if (errorBanner) errorBanner.hidden = false;
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = "Send Project Inquiry";
        });
    });

    resetBtn?.addEventListener("click", () => {
      inquiryForm.reset();
      templateButtons.forEach((btn) => btn.classList.remove("is-active"));
      [nameInput, emailInput, messageField].forEach((field) => field.removeAttribute("aria-invalid"));
      document.querySelectorAll(".form-field-error").forEach((el) => (el.hidden = true));
      if (successPanel) successPanel.hidden = true;
      inquiryForm.hidden = false;
      nameInput.focus();
    });
  }
})();
