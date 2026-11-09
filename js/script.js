(() => {
  const root = document.documentElement;
  const I18N = window.i18n;
  const t = (key, vars, fallback) => (I18N ? I18N.t(key, vars, fallback) : fallback || "");

  // Header: measure real height into --header-h so sections can offset
  // themselves correctly, then track scroll position so the fixed nav's
  // blur-gradient backdrop can deepen once content starts passing under it.
  const siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    const setHeaderHeight = () => {
      root.style.setProperty("--header-h", `${siteHeader.offsetHeight}px`);
    };
    setHeaderHeight();
    window.addEventListener("resize", setHeaderHeight);

    // Landing-page exception: over the hero, the backdrop starts fully
    // invisible and eases in 1:1 with scroll position, fully in by the
    // time the hero is scrolled past. Other pages have no hero and skip
    // this, so their backdrop is present from the first frame as before.
    const hero = document.querySelector(".hero");
    const heroFade = Boolean(hero && document.querySelector(".nav-backdrop"));
    if (heroFade) {
      root.style.setProperty("--nav-fade", "0");
    }

    const SCROLL_THRESHOLD = 20;
    let scrollTicking = false;
    const updateScrollState = () => {
      const y = window.scrollY;
      document.body.classList.toggle("is-scrolled", y > SCROLL_THRESHOLD);
      if (heroFade) {
        // Measured from the hero's on-screen position, and over at most one
        // viewport: the parallax hero is several screens tall and its
        // folders pass under the nav well before it ends.
        const fadeDistance = Math.min(hero.offsetHeight, window.innerHeight) || window.innerHeight;
        const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / fadeDistance));
        root.style.setProperty("--nav-fade", String(progress));
      }
      scrollTicking = false;
    };
    updateScrollState();
    window.addEventListener(
      "scroll",
      () => {
        if (!scrollTicking) {
          window.requestAnimationFrame(updateScrollState);
          scrollTicking = true;
        }
      },
      { passive: true }
    );
    if (heroFade) {
      window.addEventListener("resize", updateScrollState);
    }
  }

  const themeToggle = document.querySelector(".theme-toggle");

  if (themeToggle) {
    const updateToggleState = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      const label = isDark ? t("theme.toLight", null, "Switch to light mode") : t("theme.toDark", null, "Switch to dark mode");
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("data-tooltip", label);
    };

    updateToggleState();
    I18N?.onChange(updateToggleState);

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
  const menuClose = document.querySelector(".mobile-nav-close");
  const nav = document.getElementById("primary-nav");
  const body = document.body;

  if (menuToggle && nav) {
    const closeMenu = () => {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      body.classList.remove("menu-open");
      root.classList.remove("menu-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      body.classList.toggle("menu-open", isOpen);
      root.classList.toggle("menu-open", isOpen);
    });

    menuClose?.addEventListener("click", closeMenu);

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    // Highlight the nav row for whichever section is currently in view
    const navLinks = Array.from(nav.querySelectorAll(".mobile-nav-links a"));
    const navSections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (navSections.length && "IntersectionObserver" in window) {
      const setCurrentSection = (id) => {
        navLinks.forEach((link) => {
          link.classList.toggle("is-current", link.getAttribute("href") === `#${id}`);
        });
      };

      const sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setCurrentSection(entry.target.id);
          });
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );

      navSections.forEach((section) => sectionObserver.observe(section));
    }
  }
})();

(() => {
  const I18N = window.i18n;
  const t = (key, vars, fallback) => (I18N ? I18N.t(key, vars, fallback) : fallback || "");

  // Shared pointer drag-to-scroll for horizontal tracks (capabilities,
  // brands).
  const enableDragScroll = (track) => {
    if (!track) return;
    let isDragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let activePointerId = null;

    track.addEventListener("pointerdown", (event) => {
      if (track.id === "brands-track" && window.matchMedia('(max-width: 760px)').matches) return;
      if (event.pointerType === "touch") return;
      isDragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartScroll = track.scrollLeft;
      activePointerId = event.pointerId;
    });

    track.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      const delta = event.clientX - dragStartX;
      if (!dragMoved && Math.abs(delta) > 4) {
        dragMoved = true;
        track.classList.add("is-dragging");
        if (activePointerId !== null) track.setPointerCapture(activePointerId);
      }
      if (dragMoved) track.scrollLeft = dragStartScroll - delta;
    });

    const endDrag = () => {
      isDragging = false;
      track.classList.remove("is-dragging");
      if (activePointerId !== null && track.hasPointerCapture?.(activePointerId)) {
        track.releasePointerCapture(activePointerId);
      }
      activePointerId = null;
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointerleave", endDrag);
    track.addEventListener("pointercancel", endDrag);

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

  // One-time About reveal. Mobile starts when the section enters view;
  // its portrait follows the headline, with the full stagger under 650ms.
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
      { threshold: window.matchMedia('(max-width: 760px)').matches ? 0 : 0.2 }
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

  // 2. My Creative Dock — fixed-size info panel crossfades its content on
  // hover/focus; a click/tap "pins" a tool so the panel keeps showing it
  // (this is what drives the tap-to-activate behavior on mobile).
  const dockTools = Array.from(document.querySelectorAll(".dock-tool"));
  const dockInfoContent = document.getElementById("dock-info-content");

  if (dockTools.length && dockInfoContent) {
    // The resting panel, in the active language. The markup's own copy is
    // the English (and the no-script) version.
    const ENGLISH_DEFAULT_HTML = dockInfoContent.innerHTML;
    const defaultHtml = () =>
      !I18N || I18N.lang === "en"
        ? ENGLISH_DEFAULT_HTML
        : `<p class="dock-info-default">${escapeHtml(t("dock.default"))}</p>
              <p class="dock-info-cue">${escapeHtml(t("dock.cue"))}</p>`;
    let activeTool = null;
    let fadeTimeout;

    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c]));
    }

    const setPanelContent = (html) => {
      clearTimeout(fadeTimeout);
      dockInfoContent.classList.add("is-fading");
      fadeTimeout = setTimeout(() => {
        dockInfoContent.innerHTML = html;
        dockInfoContent.classList.remove("is-fading");
      }, 160);
    };

    // data-primary and data-tags are translated in place (data-i18n-attr);
    // tags are comma-separated in every language.
    const toolHtml = (tool) => {
      const name = escapeHtml(tool.dataset.name || "");
      const primary = escapeHtml(tool.dataset.primary || "");
      const tags = (tool.dataset.tags || "")
        .split(/[,，、]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map(escapeHtml);

      const tagsHtml = tags.length
        ? `<div class="dock-info-section">
            <p class="dock-info-label">${escapeHtml(t("dock.usedFor", null, "Used for"))}</p>
            <p class="dock-info-tags">${tags.join(" &middot; ")}</p>
          </div>`
        : "";

      return `
        <div>
          <p class="dock-info-name">${name}</p>
          <div class="dock-info-section">
            <p class="dock-info-label">${escapeHtml(t("dock.primaryUse", null, "Primary use"))}</p>
            <p class="dock-info-text">${primary}</p>
          </div>
        </div>
        ${tagsHtml}
      `;
    };
    const showTool = (tool) => setPanelContent(toolHtml(tool));

    const resetPanel = () => {
      if (activeTool) {
        showTool(activeTool);
      } else {
        setPanelContent(defaultHtml());
      }
    };

    // New language: redraw whatever the panel shows, without the fade.
    I18N?.onChange(() => {
      clearTimeout(fadeTimeout);
      dockInfoContent.classList.remove("is-fading");
      const shown = dockTools.find((tool) => tool.matches(":hover, :focus")) || activeTool;
      dockInfoContent.innerHTML = shown ? toolHtml(shown) : defaultHtml();
    });

    dockTools.forEach((tool) => {
      tool.setAttribute("aria-pressed", "false");
      tool.addEventListener("mouseenter", () => showTool(tool));
      tool.addEventListener("focus", () => showTool(tool));
      tool.addEventListener("mouseleave", resetPanel);
      tool.addEventListener("blur", resetPanel);
      tool.addEventListener("click", () => {
        if (activeTool === tool) {
          activeTool.classList.remove("is-active");
          activeTool.setAttribute("aria-pressed", "false");
          activeTool = null;
          resetPanel();
          return;
        }
        if (activeTool) {
          activeTool.classList.remove("is-active");
          activeTool.setAttribute("aria-pressed", "false");
        }
        activeTool = tool;
        tool.classList.add("is-active");
        tool.setAttribute("aria-pressed", "true");
        showTool(tool);
      });
    });
  }

  // 2b. Dock magnification — a macOS-dock-style continuous scale/lift
  // driven by cursor distance to each icon, isolated per category row so
  // hovering Design never touches Motion & Video. Pointer Events let a
  // single check (event.pointerType) skip the effect on touch, where
  // there's no reliable hover to drive it from.
  document.querySelectorAll(".dock-row").forEach((row) => {
    const tools = Array.from(row.querySelectorAll(".dock-tool"));
    const badges = tools.map((tool) => tool.querySelector(".dock-tool-badge"));
    if (!tools.length) return;

    const PEAK_SCALE = 0.36; // ~1.36 at the cursor's icon, ~1.16 next to it, ~1.0 beyond
    const PEAK_LIFT = 6; // px raise at the nearest icon
    let sigma = 70;
    let rafId = null;
    let pendingX = null;

    const measureSigma = () => {
      if (tools.length < 2) return;
      const centers = tools.map((tool) => {
        const rect = tool.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
      let total = 0;
      for (let i = 1; i < centers.length; i++) {
        total += centers[i] - centers[i - 1];
      }
      const avgPitch = total / (centers.length - 1);
      if (avgPitch > 0) sigma = avgPitch * 0.8;
    };

    const applyMagnification = (clientX) => {
      tools.forEach((tool, i) => {
        const rect = tool.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = clientX - center;
        const t = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        badges[i].style.setProperty("--dock-scale", (1 + PEAK_SCALE * t).toFixed(3));
        badges[i].style.setProperty("--dock-lift", `${(-PEAK_LIFT * t).toFixed(2)}px`);
      });
    };

    const resetMagnification = () => {
      badges.forEach((badge) => {
        badge.style.removeProperty("--dock-scale");
        badge.style.removeProperty("--dock-lift");
      });
    };

    measureSigma();
    window.addEventListener("resize", measureSigma);

    row.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      pendingX = event.clientX;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingX !== null) applyMagnification(pendingX);
      });
    });

    row.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      resetMagnification();
    });

    // Keyboard focus mirrors the hovered-icon peak state — only the
    // focused icon enlarges, since there's no cursor position to spread
    // magnification to its neighbors from.
    tools.forEach((tool, i) => {
      tool.addEventListener("focus", () => {
        resetMagnification();
        badges[i].style.setProperty("--dock-scale", (1 + PEAK_SCALE).toFixed(3));
        badges[i].style.setProperty("--dock-lift", `${-PEAK_LIFT}px`);
      });
      tool.addEventListener("blur", () => {
        badges[i].style.removeProperty("--dock-scale");
        badges[i].style.removeProperty("--dock-lift");
      });
    });
  });

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
  let openInquiryForm = null; // set below; used by the ?inquiry=cv-request link

  if (startTrigger && formWrap) {
    const openForm = () => {
      formWrap.classList.add("is-open");
      formWrap.inert = false;
      formWrap.setAttribute("aria-hidden", "false");
      startTrigger.setAttribute("aria-expanded", "true");
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.requestAnimationFrame(() => {
        formWrap.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "nearest" });
      });
      window.setTimeout(() => {
        const target = inquiryForm?.hidden ? document.getElementById("inquiry-success") : document.getElementById("inq-name");
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
      }, reduced ? 0 : 350);
    };

    openInquiryForm = openForm;

    const closeForm = () => {
      formWrap.classList.remove("is-open");
      formWrap.inert = true;
      formWrap.setAttribute("aria-hidden", "true");
      startTrigger.setAttribute("aria-expanded", "false");
    };

    startTrigger.addEventListener("click", () => {
      if (formWrap.classList.contains("is-open") && !window.matchMedia('(max-width: 760px)').matches) {
        closeForm();
      } else {
        openForm();
      }
    });
  }

  // Message starters (data/locales: form.tpl.*), in the visitor's language.
  const templateText = (name) => t(`form.tpl.${name}`);

  const templateButtons = Array.from(document.querySelectorAll(".template-btn"));
  const messageField = document.getElementById("inq-message");
  const templateConfirmation = document.getElementById("template-confirmation");
  let pendingTemplate = null;
  const applyTemplate = (btn) => {
    messageField.value = templateText(btn.dataset.template);
    messageField.dispatchEvent(new Event('input', { bubbles: true }));
    messageField.focus();
    templateButtons.forEach(other => {
      other.classList.toggle("is-active", other === btn);
      other.setAttribute('aria-pressed', String(other === btn));
    });
    if (templateConfirmation) templateConfirmation.hidden = true;
    pendingTemplate = null;
  };

  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = templateText(btn.dataset.template);
      if (messageField && text) {
        if (messageField.value.trim()) {
          pendingTemplate = btn;
          templateConfirmation.hidden = false;
          document.getElementById('template-keep')?.focus();
        } else applyTemplate(btn);
      }
    });
  });
  document.getElementById('template-replace')?.addEventListener('click', () => {
    if (pendingTemplate) applyTemplate(pendingTemplate);
  });
  document.getElementById('template-keep')?.addEventListener('click', () => {
    pendingTemplate = null;
    templateConfirmation.hidden = true;
    messageField.focus();
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
    const mobileType = document.getElementById('inq-mobile-type');
    const mobileContact = window.matchMedia('(max-width: 760px)');
    let sending = false;
    let sentAsCv = false;
    const successText = () => (sentAsCv ? t("form.successBodyCv") : t("form.successBody"));

    // --- CV requests --------------------------------------------------------
    // Choosing "CV Request" (or arriving from the CV page's "Request CV
    // Copy", ?inquiry=cv-request) turns the form into a request form: name,
    // company, professional email, role and reason are required, the
    // project-only parts step aside, and the request is sent for manual
    // review — no document is ever sent automatically.
    const CV_TYPE = "CV Request";
    const roleField = inquiryForm.querySelector(".field-role");
    const roleInput = document.getElementById("inq-role");
    const cvNote = document.getElementById("form-cv-note");
    const cvChip = chipInputs.find((chip) => chip.value === CV_TYPE);
    // Labels that change with the request mode: [project key, CV key].
    const MODE_LABELS = {
      "inq-email": ["form.email", "form.emailCv"],
      "inq-company": ["form.company", "form.companyCv"],
      "inq-message": ["form.message", "form.messageCv"],
    };
    const cvLabels = Array.from(inquiryForm.querySelectorAll("label[data-cv-label]")).map((label) => ({ label, html: label.innerHTML }));
    const isCvRequest = () => (mobileContact.matches ? mobileType.value === CV_TYPE : Boolean(cvChip && cvChip.checked));
    const submitText = () => (isCvRequest() ? t("form.submitCv", null, "Send CV Request") : t("form.submit", null, "Send Project Inquiry"));

    const applyRequestMode = () => {
      const cv = isCvRequest();
      inquiryForm.dataset.mode = cv ? "cv" : "project";
      if (roleField) roleField.hidden = !cv;
      if (cvNote) cvNote.hidden = !cv;
      roleInput?.toggleAttribute("required", cv);
      companyInput.toggleAttribute("required", cv);
      const english = !I18N || I18N.lang === "en";
      cvLabels.forEach(({ label, html }) => {
        const keys = MODE_LABELS[label.htmlFor];
        if (cv) label.textContent = keys ? t(keys[1], null, label.dataset.cvLabel) : label.dataset.cvLabel;
        else label.innerHTML = keys && !english ? t(keys[0]) : html; // locale markup is trusted
      });
      if (!cv) {
        [companyInput, roleInput].forEach((input) => input && setFieldError(input, `${input.id}-error`, ""));
      }
      if (submitLabel && !sending) submitLabel.textContent = submitText();
    };

    // Keeps both inquiry-type controls (desktop chips, phone select) in step.
    const selectCvRequest = () => {
      if (cvChip) cvChip.checked = true;
      mobileType.value = CV_TYPE;
      if (chipError) chipError.hidden = true;
      applyRequestMode();
    };

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
        setFieldError(nameInput, "inq-name-error", t("form.err.name"));
        valid = false;
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError(nameInput, "inq-name-error", "");
      }

      if (!emailInput.value.trim() || !emailInput.checkValidity()) {
        setFieldError(emailInput, "inq-email-error", t("form.err.email"));
        valid = false;
        firstInvalid = firstInvalid || emailInput;
      } else {
        setFieldError(emailInput, "inq-email-error", "");
      }

      if (isCvRequest()) {
        [
          [companyInput, t("form.err.company")],
          [roleInput, t("form.err.role")],
        ].forEach(([input, message]) => {
          if (!input) return;
          const missing = !input.value.trim();
          setFieldError(input, `${input.id}-error`, missing ? message : "");
          if (missing) {
            valid = false;
            firstInvalid = firstInvalid || input;
          }
        });
      }

      if (!messageField.value.trim()) {
        setFieldError(
          messageField,
          "inq-message-error",
          isCvRequest() ? t("form.err.messageCv") : t("form.err.message")
        );
        valid = false;
        firstInvalid = firstInvalid || messageField;
      } else {
        setFieldError(messageField, "inq-message-error", "");
      }

      const hasType = mobileContact.matches ? !!mobileType.value : chipInputs.some(chip => chip.checked);
      if (mobileContact.matches) setFieldError(mobileType, 'inq-mobile-type-error', hasType ? '' : t("form.err.type"));
      else if (chipError) chipError.hidden = hasType;
      if (!hasType) {
        valid = false;
        firstInvalid = firstInvalid || (mobileContact.matches ? mobileType : chipInputs[0]);
      }

      return { valid, firstInvalid };
    };
    [nameInput, emailInput, messageField, companyInput, roleInput].filter(Boolean).forEach(input => input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) setFieldError(input, `${input.id}-error`, '');
    }));
    mobileType.addEventListener('change', () => {
      setFieldError(mobileType, 'inq-mobile-type-error', '');
      if (cvChip) cvChip.checked = mobileType.value === CV_TYPE;
      applyRequestMode();
    });
    chipInputs.forEach(input => input.addEventListener('change', () => {
      if (chipError) chipError.hidden = chipInputs.some(chip => chip.checked);
      if (input === cvChip && !mobileContact.matches) mobileType.value = cvChip.checked ? CV_TYPE : (mobileType.value === CV_TYPE ? '' : mobileType.value);
      applyRequestMode();
    }));
    mobileContact.addEventListener('change', applyRequestMode);

    // Sends the owner-notification email via EmailJS, then best-effort
    // fires the optional client-confirmation template (its failure never
    // fails the inquiry — the owner copy is the one that must succeed).
    const submitInquiry = (templateParams) => {
      if (!window.emailjs || !EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_OWNER) {
        return Promise.reject(
          new Error("EmailJS is not configured yet — set EMAILJS_PUBLIC_KEY/SERVICE_ID/TEMPLATE_OWNER in js/script.js.")
        );
      }

      const options = { publicKey: EMAILJS_PUBLIC_KEY };
      const ownerSend = Promise.resolve().then(() => window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_OWNER, templateParams, options));

      if (EMAILJS_TEMPLATE_CLIENT) {
        ownerSend.then(() => {
          window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, templateParams, options).catch(() => {});
        });
      }

      return ownerSend;
    };

    inquiryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (sending || inquiryForm.hidden) return;
      if (errorBanner) errorBanner.hidden = true;

      const { valid, firstInvalid } = validate();
      if (!valid) {
        firstInvalid?.focus();
        return;
      }

      const name = nameInput.value.trim();
      const cvRequest = isCvRequest();
      const selectedTypes = mobileContact.matches ? [mobileType.value] : chipInputs.filter(chip => chip.checked).map(chip => chip.value);
      const role = roleInput ? roleInput.value.trim() : "";
      const company = companyInput.value.trim();
      const reason = messageField.value.trim();
      const templateParams = {
        name,
        email: emailInput.value.trim(),
        company: company || "Not provided",
        inquiry_types: selectedTypes.join(", "),
        // A CV request carries its role and reason in the message too, so it
        // reads in full with the existing EmailJS template.
        message: cvRequest
          ? `CV REQUEST (review before sharing a copy)\nName: ${name}\nCompany: ${company}\nRole: ${role}\nProfessional email: ${emailInput.value.trim()}\nReason: ${reason}`
          : reason,
        role: role || "Not provided",
        request_reason: cvRequest ? reason : "Not applicable",
        budget: cvRequest ? "Not applicable" : budgetInput.value.trim() || "Not provided",
        timeline: cvRequest ? "Not applicable" : timelineInput.value.trim() || "Not provided",
        // The language the visitor used the site in (the email itself stays
        // English; inquiry types are always sent by their English names).
        site_language: I18N ? I18N.lang : "en",
      };

      sending = true;
      inquiryForm.setAttribute('aria-busy', 'true');
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = t("form.sending", null, "Sending…");

      submitInquiry(templateParams)
        .then(() => {
          sentAsCv = cvRequest;
          if (successBody) successBody.textContent = successText();
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
          sending = false;
          inquiryForm.removeAttribute('aria-busy');
          if (submitBtn) submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = submitText();
        });
    });

    resetBtn?.addEventListener("click", () => {
      inquiryForm.reset();
      templateButtons.forEach(btn => { btn.classList.remove("is-active"); btn.setAttribute('aria-pressed', 'false'); });
      pendingTemplate = null;
      templateConfirmation.hidden = true;
      inquiryForm.querySelector('.project-scope').open = false;
      if (errorBanner) errorBanner.hidden = true;
      [nameInput, emailInput, messageField, mobileType, companyInput, roleInput].filter(Boolean).forEach(field => field.removeAttribute("aria-invalid"));
      document.querySelectorAll(".form-field-error").forEach((el) => (el.hidden = true));
      if (successPanel) successPanel.hidden = true;
      inquiryForm.hidden = false;
      applyRequestMode();
      nameInput.focus();
    });

    applyRequestMode();

    // A new language: labels and the submit button follow, messages already
    // on screen are redone in the new language, and what the visitor typed
    // stays as it is.
    I18N?.onChange(() => {
      applyRequestMode();
      const errorsShown = inquiryForm.querySelector('[aria-invalid="true"]') || (chipError && !chipError.hidden);
      if (errorsShown && !inquiryForm.hidden) validate();
      if (successPanel && !successPanel.hidden && successBody) successBody.textContent = successText();
    });

    // Arriving from the CV page: ?inquiry=cv-request opens the form as a CV
    // request. The parameter is then dropped, so a reload doesn't repeat it.
    const params = new URLSearchParams(window.location.search);
    if (params.get("inquiry") === "cv-request") {
      params.delete("inquiry");
      const query = params.toString();
      history.replaceState(history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      selectCvRequest();
      openInquiryForm?.();
    }
  }
})();
