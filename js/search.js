/*
 * Site-wide portfolio search (css/search.css).
 *
 * Adds a "Search portfolio" button to the shared header on every page and
 * opens a curated navigator over data/search-index.json, which
 * scripts/generate-search-index.js builds from the site's own project data
 * and data/search-content.json. Results never come from raw page text.
 *
 * - Desktop: a centred panel (Ctrl/Cmd + K toggles it). Mobile: a
 *   full-screen sheet with the field fixed at the top.
 * - Results appear from two characters, debounced, grouped as Projects,
 *   Brands, Capabilities, Tools and Sections. Titles outrank keywords,
 *   which outrank kinds and descriptions; every word typed must match
 *   somewhere, and partial words count.
 * - Combobox + listbox semantics: arrows move through results, Enter opens,
 *   Tab cycles the field and its buttons, Escape closes. The number of
 *   results is announced.
 * - Choosing a homepage section while on the homepage closes the search
 *   and scrolls there (with a history entry, so Back works); anything else
 *   is an ordinary navigation.
 */
(() => {
  const header = document.querySelector(".site-header .header-controls");
  if (!header) return;

  const SCRIPT = document.currentScript;
  const ROOT = new URL("..", SCRIPT && SCRIPT.src ? SCRIPT.src : window.location.href);
  const GROUPS = [
    ["projects", "Projects"],
    ["brands", "Brands"],
    ["capabilities", "Capabilities"],
    ["tools", "Tools"],
    ["sections", "Sections"],
  ];
  const MIN_CHARS = 2;
  const PER_GROUP = 4; // before "View all results"
  const DEBOUNCE_MS = 120;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const root = document.documentElement;

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>',
    close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    clear: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M9 9l6 6M15 9l-6 6"></path></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>',
    projects: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="4" width="6.5" height="6.5" rx="1.25"></rect><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.25"></rect><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.25"></rect><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.25"></rect></svg>',
    brands: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9-8-8z"></path><circle cx="8.5" cy="8.5" r="1.5"></circle></svg>',
    capabilities: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"></path></svg>',
    tools: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="12" rx="1.5"></rect><path d="M8.5 20.5h7M12 17v3.5"></path></svg>',
    sections: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M9 4L7 20M17 4l-2 16M4.5 9h16M3.5 15h16"></path></svg>',
  };

  // --- Header button ------------------------------------------------------------

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "search-toggle";
  toggle.setAttribute("aria-label", "Search portfolio");
  toggle.setAttribute("aria-haspopup", "dialog");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-keyshortcuts", isMac ? "Meta+K" : "Control+K");
  toggle.dataset.tooltip = `Search portfolio (${isMac ? "⌘" : "Ctrl "}K)`;
  toggle.innerHTML = ICONS.search;
  header.insertBefore(toggle, header.querySelector(".theme-toggle") || header.querySelector(".menu-toggle"));

  // --- Dialog -------------------------------------------------------------------

  const overlay = document.createElement("div");
  overlay.className = "search";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="search-backdrop" data-search-dismiss></div>
    <div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <h2 class="sr-only" id="search-title">Search portfolio</h2>
      <form class="search-bar" role="search" action="#">
        <span class="search-bar-icon">${ICONS.search}</span>
        <label class="sr-only" for="search-input">Search portfolio</label>
        <input class="search-input" id="search-input" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"
          placeholder="Search projects, brands, skills, or services…"
          role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list" />
        <button class="search-clear" type="button" aria-label="Clear search" hidden>${ICONS.clear}</button>
        <button class="search-close" type="button" aria-label="Close search">${ICONS.close}</button>
      </form>
      <div class="search-results" id="search-results" role="listbox" aria-label="Search results"></div>
      <p class="sr-only" role="status" aria-live="polite" data-search-status></p>
      <p class="search-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></p>
    </div>`;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector(".search-panel");
  const form = overlay.querySelector(".search-bar");
  const input = overlay.querySelector(".search-input");
  const clearButton = overlay.querySelector(".search-clear");
  const closeButton = overlay.querySelector(".search-close");
  const list = overlay.querySelector(".search-results");
  const status = overlay.querySelector("[data-search-status]");

  // --- Index ----------------------------------------------------------------------

  let index = null; // { shortcuts, entries }
  let indexFailed = false;
  const norm = (text) =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9+#]+/g, " ")
      .trim();
  const words = (text) => (text ? text.split(" ") : []);

  const prepare = (data) => {
    data.entries.forEach((entry) => {
      entry.nTitle = norm(entry.title);
      entry.titleWords = words(entry.nTitle);
      entry.nKeys = (entry.keywords || []).map(norm);
      entry.keyWords = entry.nKeys.flatMap(words);
      entry.nKind = norm(entry.kind);
      entry.nDesc = norm(`${entry.description} ${entry.body || ""}`);
      entry.descWords = words(entry.nDesc);
    });
    return data;
  };

  const ready = (data) => {
    index = prepare(data);
    if (!overlay.hidden) update();
  };
  const failed = () => {
    indexFailed = true;
    if (!overlay.hidden) update();
  };

  // The index ships as a script (data/search-index.js), which also loads
  // when the site is opened straight from disk — browsers block fetch() on
  // file:// pages. The JSON copy is the fallback.
  const fetchIndex = () =>
    fetch(new URL("data/search-index.json", ROOT))
      .then((response) => {
        if (!response.ok) throw new Error(response.status);
        return response.json();
      })
      .then(ready)
      .catch(failed);

  const loadIndex = () => {
    if (window.SEARCH_INDEX) {
      ready(window.SEARCH_INDEX);
      return;
    }
    const tag = document.createElement("script");
    tag.src = new URL("data/search-index.js", ROOT).href;
    tag.async = true;
    tag.onload = () => (window.SEARCH_INDEX ? ready(window.SEARCH_INDEX) : fetchIndex());
    tag.onerror = fetchIndex;
    document.head.appendChild(tag);
  };

  // The text index is small: fetch it as soon as the page is idle.
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 600)))(loadIndex);

  // --- Scoring --------------------------------------------------------------------

  const scoreToken = (entry, token) => {
    let score = 0;
    if (entry.titleWords.includes(token)) score += 40;
    else if (entry.titleWords.some((word) => word.startsWith(token))) score += 30;
    else if (entry.nTitle.includes(token)) score += 18;
    if (entry.nKeys.includes(token)) score += 26;
    else if (entry.keyWords.some((word) => word.startsWith(token))) score += 18;
    else if (token.length >= 3 && entry.nKeys.some((key) => key.includes(token))) score += 10;
    if (entry.nKind.includes(token)) score += 8;
    if (token.length >= 3) {
      if (entry.descWords.some((word) => word.startsWith(token))) score += 5;
      else if (entry.nDesc.includes(token)) score += 3;
    }
    return score;
  };

  const search = (query) => {
    const q = norm(query);
    const tokens = words(q);
    if (!tokens.length) return [];
    const order = Object.fromEntries(GROUPS.map(([id], i) => [id, i]));
    return index.entries
      .map((entry) => {
        let total = 0;
        for (const token of tokens) {
          const s = scoreToken(entry, token);
          if (!s) return null; // every word must match somewhere
          total += s;
        }
        if (entry.nTitle === q) total += 100;
        else if (entry.nTitle.startsWith(q)) total += 40;
        if (entry.nKeys.includes(q)) total += 35;
        return { entry, score: total };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || order[a.entry.group] - order[b.entry.group] || a.entry.title.localeCompare(b.entry.title))
      .map((result) => result.entry);
  };

  // --- Rendering ------------------------------------------------------------------

  let options = []; // [{ el, action }]
  let active = -1;
  let showAll = false;
  let lastQuery = "";

  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Text with each typed word wrapped in <mark>, built without innerHTML.
  const highlighted = (text, tokens) => {
    const fragment = document.createDocumentFragment();
    const usable = tokens.filter((token) => token.length >= 2);
    if (!usable.length) {
      fragment.append(text);
      return fragment;
    }
    const pattern = new RegExp(`(${usable.map(escapeRegExp).join("|")})`, "gi");
    text.split(pattern).forEach((part, i) => {
      if (i % 2) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        fragment.append(mark);
      } else if (part) fragment.append(part);
    });
    return fragment;
  };

  const makeOption = ({ title, kind, context, thumb, logo, icon, tokens = [], action, extraClass }) => {
    const el = document.createElement("div");
    el.className = `search-option${extraClass ? ` ${extraClass}` : ""}`;
    el.id = `search-option-${options.length}`;
    el.setAttribute("role", "option");
    el.setAttribute("aria-selected", "false");

    const media = document.createElement("span");
    media.className = "search-option-media";
    media.setAttribute("aria-hidden", "true");
    if (thumb) {
      const img = document.createElement("img");
      img.src = new URL(thumb, ROOT).href;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      if (logo) media.classList.add("is-logo");
      img.addEventListener("error", () => {
        img.remove();
        media.innerHTML = ICONS[icon] || ICONS.sections;
      }, { once: true });
      media.append(img);
    } else {
      media.innerHTML = ICONS[icon] || ICONS.sections;
    }

    const text = document.createElement("span");
    text.className = "search-option-text";
    const titleEl = document.createElement("span");
    titleEl.className = "search-option-title";
    titleEl.append(highlighted(title, tokens));
    text.append(titleEl);
    if (kind || context) {
      const meta = document.createElement("span");
      meta.className = "search-option-meta";
      if (kind) {
        const kindEl = document.createElement("span");
        kindEl.className = "search-option-kind";
        kindEl.textContent = kind;
        meta.append(kindEl);
      }
      if (context) {
        const contextEl = document.createElement("span");
        contextEl.className = "search-option-context";
        contextEl.append(highlighted(context, tokens));
        meta.append(contextEl);
      }
      text.append(meta);
    }

    const go = document.createElement("span");
    go.className = "search-option-go";
    go.setAttribute("aria-hidden", "true");
    go.innerHTML = ICONS.arrow;

    el.append(media, text, go);
    options.push({ el, action });
    return el;
  };

  const makeGroup = (label, children) => {
    const group = document.createElement("div");
    group.className = "search-group";
    group.setAttribute("role", "group");
    const heading = document.createElement("div");
    heading.className = "search-group-label";
    heading.setAttribute("role", "presentation");
    heading.id = `search-group-${label.toLowerCase().replace(/\W+/g, "-")}`;
    heading.textContent = label;
    group.setAttribute("aria-labelledby", heading.id);
    group.append(heading, ...children);
    return group;
  };

  const message = (title, detail) => {
    const box = document.createElement("div");
    box.className = "search-message";
    box.setAttribute("role", "presentation");
    const strong = document.createElement("p");
    strong.className = "search-message-title";
    strong.textContent = title;
    box.append(strong);
    if (detail) {
      const small = document.createElement("p");
      small.className = "search-message-detail";
      small.textContent = detail;
      box.append(small);
    }
    return box;
  };

  // Why this result matched, when the title and description don't show it.
  const contextFor = (entry, tokens) => {
    const visible = `${entry.nTitle} ${norm(entry.description)}`;
    const hidden = tokens.find((token) => !visible.includes(token));
    if (hidden) {
      const keyword = (entry.keywords || []).find((key) => norm(key).includes(hidden));
      if (keyword) return `Matches “${keyword}” · ${entry.description}`;
    }
    return entry.description;
  };

  const setActive = (i, scroll = true) => {
    if (options[active]) options[active].el.setAttribute("aria-selected", "false");
    active = options.length ? (i + options.length) % options.length : -1;
    if (active < 0) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    const { el } = options[active];
    el.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", el.id);
    if (scroll) el.scrollIntoView({ block: "nearest" });
  };

  const render = () => {
    const query = input.value.trim();
    const tokens = words(norm(query));
    options = [];
    active = -1;
    input.removeAttribute("aria-activedescendant");
    list.replaceChildren();
    clearButton.hidden = !input.value;

    if (!index) {
      list.append(message(indexFailed ? "Search is unavailable right now." : "Loading the portfolio index…"));
      input.setAttribute("aria-expanded", "false");
      status.textContent = indexFailed ? "Search is unavailable right now." : "";
      return;
    }

    if (query.length < MIN_CHARS) {
      const shortcuts = (index.shortcuts || []).map((shortcut) =>
        makeOption({
          title: shortcut.title,
          kind: shortcut.kind,
          icon: shortcut.kind === "Section" ? "sections" : "projects",
          action: () => navigate(shortcut.url),
        })
      );
      list.append(makeGroup("Quick links", shortcuts));
      input.setAttribute("aria-expanded", "true");
      status.textContent = query ? "Type at least two characters to search." : "";
      return;
    }

    const results = search(query);
    input.setAttribute("aria-expanded", "true");

    if (!results.length) {
      list.append(message("No matching work found.", "Try another brand, service, software, or project type."));
      list.append(
        makeGroup("Browse", [
          makeOption({ title: "View All Projects", kind: "Project Gallery", icon: "projects", action: () => navigate("index.html#gallery") }),
        ])
      );
      status.textContent = `No matching work found for ${query}.`;
      return;
    }

    let shown = 0;
    GROUPS.forEach(([id, label]) => {
      const inGroup = results.filter((entry) => entry.group === id);
      if (!inGroup.length) return;
      const visible = showAll ? inGroup : inGroup.slice(0, PER_GROUP);
      shown += visible.length;
      list.append(
        makeGroup(
          label,
          visible.map((entry) =>
            makeOption({
              title: entry.title,
              kind: entry.kind,
              context: contextFor(entry, tokens),
              thumb: entry.thumb,
              logo: entry.logo,
              icon: entry.group,
              tokens,
              action: () => navigate(entry.url),
            })
          )
        )
      );
    });

    if (shown < results.length) {
      const more = makeOption({
        title: `View all ${results.length} results`,
        icon: "search",
        extraClass: "search-option-more",
        action: () => {
          showAll = true;
          const keep = active;
          render();
          setActive(Math.min(keep, options.length - 1));
          input.focus({ preventScroll: true });
        },
      });
      list.append(more);
    }

    status.textContent = `${results.length} ${results.length === 1 ? "result" : "results"} for ${query}.`;
    setActive(0, false);
  };

  let debounceTimer = 0;
  const update = () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query !== lastQuery) showAll = false;
    lastQuery = query;
    render();
  };

  // --- Navigation -----------------------------------------------------------------

  const pagePath = (url) => url.pathname.replace(/\/index\.html$/, "/");

  const navigate = (relative) => {
    const target = new URL(relative, ROOT);
    const here = new URL(window.location.href);
    if (pagePath(target) !== pagePath(here)) {
      // Ordinary navigation (Back works), through the page transition.
      if (window.pageTransition) window.pageTransition.go(target.href);
      else window.location.assign(target.href);
      return;
    }
    close({ restoreFocus: !target.hash });
    if (!target.hash) return;
    const section = document.getElementById(decodeURIComponent(target.hash.slice(1)));
    if (!section) return;
    if (here.hash !== target.hash) history.pushState(null, "", target.hash);
    requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    });
  };

  // --- Open / close -----------------------------------------------------------------

  let closeTimer = 0;
  let opener = null;

  // Mobile: size the sheet to the visible viewport so the keyboard never
  // covers the results.
  const fitViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    panel.style.setProperty("--search-vh", `${viewport.height}px`);
    panel.style.setProperty("--search-top", `${viewport.offsetTop}px`);
  };

  const open = () => {
    if (!overlay.hidden) return;
    clearTimeout(closeTimer);
    // The full-screen menu and the search never share the screen.
    if (document.body.classList.contains("menu-open")) document.querySelector(".menu-toggle")?.click();
    opener = document.activeElement;
    overlay.hidden = false;
    root.classList.add("search-open");
    toggle.setAttribute("aria-expanded", "true");
    fitViewport();
    input.focus({ preventScroll: true }); // synchronously, so phones raise the keyboard
    input.select();
    update();
    // Two frames, so the closed state is painted before it transitions.
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-open")));
  };

  const close = ({ restoreFocus = true } = {}) => {
    if (overlay.hidden) return;
    overlay.classList.remove("is-open");
    root.classList.remove("search-open");
    toggle.setAttribute("aria-expanded", "false");
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
    }, reducedMotion.matches ? 0 : 200);
    if (restoreFocus) (opener && opener.isConnected ? opener : toggle).focus({ preventScroll: true });
  };

  // --- Events -------------------------------------------------------------------------

  toggle.addEventListener("click", open);
  closeButton.addEventListener("click", () => close());
  overlay.querySelector("[data-search-dismiss]").addEventListener("click", () => close());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (options[active]) options[active].action();
  });

  input.addEventListener("input", () => {
    clearButton.hidden = !input.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, DEBOUNCE_MS);
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    update();
    input.focus({ preventScroll: true });
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) return;
      setActive(active < 0 ? (event.key === "ArrowDown" ? 0 : -1) : active + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(debounceTimer);
      if (input.value.trim() !== lastQuery) update();
      if (options[active]) options[active].action();
    }
  });

  list.addEventListener("click", (event) => {
    const el = event.target.closest(".search-option");
    const option = options.find((item) => item.el === el);
    if (option) option.action();
  });
  list.addEventListener("mousemove", (event) => {
    const el = event.target.closest(".search-option");
    const i = options.findIndex((item) => item.el === el);
    if (i >= 0 && i !== active) setActive(i, false);
  });
  // Tapping a result shouldn't steal focus from the field (and the keyboard).
  list.addEventListener("mousedown", (event) => event.preventDefault());

  // Keep Tab inside the dialog.
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [input, clearButton, closeButton].filter((el) => !el.hidden);
    const i = focusable.indexOf(document.activeElement);
    event.preventDefault();
    focusable[(i + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (overlay.hidden) open();
        else close();
        return;
      }
      if (event.key === "Escape" && !overlay.hidden) {
        event.preventDefault();
        event.stopPropagation(); // before the menu or lightbox see it
        close();
      }
    },
    true
  );

  window.visualViewport?.addEventListener("resize", () => {
    if (!overlay.hidden) fitViewport();
  });

  // Back to a page restored from the cache with the search left open.
  window.addEventListener("pageshow", () => {
    if (!overlay.hidden) close({ restoreFocus: false });
  });
})();
