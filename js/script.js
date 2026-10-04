(() => {
  const root = document.documentElement;

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
    const DOCK_DEFAULT_HTML = dockInfoContent.innerHTML;
    let activeTool = null;
    let fadeTimeout;

    const escapeHtml = (str) =>
      str.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c]));

    const setPanelContent = (html) => {
      clearTimeout(fadeTimeout);
      dockInfoContent.classList.add("is-fading");
      fadeTimeout = setTimeout(() => {
        dockInfoContent.innerHTML = html;
        dockInfoContent.classList.remove("is-fading");
      }, 160);
    };

    const showTool = (tool) => {
      const name = escapeHtml(tool.dataset.name || "");
      const primary = escapeHtml(tool.dataset.primary || "");
      const tags = (tool.dataset.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map(escapeHtml);

      const tagsHtml = tags.length
        ? `<div class="dock-info-section">
            <p class="dock-info-label">Used for</p>
            <p class="dock-info-tags">${tags.join(" &middot; ")}</p>
          </div>`
        : "";

      setPanelContent(`
        <div>
          <p class="dock-info-name">${name}</p>
          <div class="dock-info-section">
            <p class="dock-info-label">Primary use</p>
            <p class="dock-info-text">${primary}</p>
          </div>
        </div>
        ${tagsHtml}
      `);
    };

    const resetPanel = () => {
      if (activeTool) {
        showTool(activeTool);
      } else {
        setPanelContent(DOCK_DEFAULT_HTML);
      }
    };

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

    const PEAK_SCALE = 0.45; // 1 + PEAK_SCALE = ~1.45 at the cursor's nearest icon
    const PEAK_LIFT = 8; // px raise at the nearest icon
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
      if (avgPitch > 0) sigma = avgPitch * 0.9;
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

  const TEMPLATES = {
    new: "Hi Gil, I'm starting a new project and would love your help bringing it to life. It involves [brief description], and I'm hoping to get started around [date]. Could we talk through the creative direction and next steps?",
    existing: "Hi Gil, I'm looking for design support for an existing brand. The project involves [brief description], and I'm hoping to complete it by [date]. Could you help me determine the right creative direction and deliverables?",
    improve: "Hi Gil, I have existing materials I'd like to improve or refresh. This includes [brief description], and I'm hoping to have an updated version by [date]. Could you help assess what would make the biggest difference?",
    ongoing: "Hi Gil, I'm looking for ongoing creative support rather than a one-off project. This would involve [brief description of recurring needs], starting around [date]. Could we discuss how an ongoing collaboration might work?",
    unsure: "Hi Gil, I have a project in mind but I'm not sure exactly what service or deliverables I need. Here's a bit about it: [brief description]. Could you help me figure out the right direction?",
  };

  const templateButtons = Array.from(document.querySelectorAll(".template-btn"));
  const messageField = document.getElementById("inq-message");
  const templateConfirmation = document.getElementById("template-confirmation");
  let pendingTemplate = null;
  const applyTemplate = (btn) => {
    messageField.value = TEMPLATES[btn.dataset.template];
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
      const text = TEMPLATES[btn.dataset.template];
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

      const hasType = mobileContact.matches ? !!mobileType.value : chipInputs.some(chip => chip.checked);
      if (mobileContact.matches) setFieldError(mobileType, 'inq-mobile-type-error', hasType ? '' : 'Please choose an inquiry type.');
      else if (chipError) chipError.hidden = hasType;
      if (!hasType) {
        valid = false;
        firstInvalid = firstInvalid || (mobileContact.matches ? mobileType : chipInputs[0]);
      }

      return { valid, firstInvalid };
    };
    [nameInput, emailInput, messageField].forEach(input => input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) setFieldError(input, `${input.id}-error`, '');
    }));
    mobileType.addEventListener('change', () => setFieldError(mobileType, 'inq-mobile-type-error', ''));
    chipInputs.forEach(input => input.addEventListener('change', () => {
      if (chipError) chipError.hidden = chipInputs.some(chip => chip.checked);
    }));

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
      const selectedTypes = mobileContact.matches ? [mobileType.value] : chipInputs.filter(chip => chip.checked).map(chip => chip.value);
      const templateParams = {
        name,
        email: emailInput.value.trim(),
        company: companyInput.value.trim() || "Not provided",
        inquiry_types: selectedTypes.join(", "),
        message: messageField.value.trim(),
        budget: budgetInput.value.trim() || "Not provided",
        timeline: timelineInput.value.trim() || "Not provided",
      };

      sending = true;
      inquiryForm.setAttribute('aria-busy', 'true');
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = "Sending…";

      submitInquiry(templateParams)
        .then(() => {
          if (successBody) {
            successBody.textContent = "Thanks for sharing your project. I’ll review the details and respond within 1–2 business days.";
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
          sending = false;
          inquiryForm.removeAttribute('aria-busy');
          if (submitBtn) submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = "Send Project Inquiry";
        });
    });

    resetBtn?.addEventListener("click", () => {
      inquiryForm.reset();
      templateButtons.forEach(btn => { btn.classList.remove("is-active"); btn.setAttribute('aria-pressed', 'false'); });
      pendingTemplate = null;
      templateConfirmation.hidden = true;
      inquiryForm.querySelector('.project-scope').open = false;
      if (errorBanner) errorBanner.hidden = true;
      [nameInput, emailInput, messageField, mobileType].forEach(field => field.removeAttribute("aria-invalid"));
      document.querySelectorAll(".form-field-error").forEach((el) => (el.hidden = true));
      if (successPanel) successPanel.hidden = true;
      inquiryForm.hidden = false;
      nameInput.focus();
    });
  }
})();
