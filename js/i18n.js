/*
 * Site-wide language system (styles: css/i18n.css; README "Languages").
 *
 * Loaded render-blocking in every page's <head> — it is small — so the
 * document language is decided and set on <html lang> before the first
 * paint. Then:
 *
 * - Dictionaries are data/locales/<code>.json, compiled to <code>.js by
 *   scripts/build-locales.js (a script also loads from file://, where
 *   browsers block fetch). English is always present: every page includes
 *   data/locales/en.js as its first deferred script, so the page scripts
 *   can call i18n.t() synchronously. The active language, when it isn't
 *   English, is requested at once from here.
 * - Static markup is connected through attributes, never duplicated:
 *     data-i18n="key"             text content
 *     data-i18n-html="key"        markup (trusted locale files only)
 *     data-i18n-attr="alt:key;aria-label:key2"
 *     data-i18n-vars='{"name":"Adobe Photoshop","title":"@other.key"}'
 *                                 {placeholders}; "@key" values are looked up
 *     data-i18n-count="441"       plural: key.one / key.other via Intl
 *   The English shown is always the page's own markup, cached on first use,
 *   so English never depends on a dictionary.
 * - Scripts that write text themselves call i18n.t() / i18n.plural() and
 *   re-render from i18n.onChange(); a change only rewrites text, so
 *   carousels, filters, open media and scroll position are untouched.
 * - A missing key falls back to English, never to an empty label or the
 *   raw key. In development (localhost, file:, or ?i18n-debug) missing keys
 *   are logged and listed by i18n.missing().
 *
 * Languages are offered only once their file is marked reviewed
 * (_meta.status "reviewed") and complete — scripts/build-locales.js writes
 * that into the LANGUAGES block below. Draft languages stay available for
 * review on localhost or with ?lang-preview=1 (?lang-preview=0 ends it).
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var script = document.currentScript;
  var SITE_ROOT = new URL("..", script && script.src ? script.src : window.location.href);
  var STORAGE_KEY = "lang";
  var PREVIEW_KEY = "lang-preview";
  var CJK_FONTS = { "zh-CN": "Noto+Sans+SC", ja: "Noto+Sans+JP", ko: "Noto+Sans+KR" };
  var LOADING_TIMEOUT_MS = 2500;

  /* LANGUAGES START — written by scripts/build-locales.js; do not edit by hand. */
  var VERSION = "f8ec87d3ad";
  var LANGUAGES = [
    { code: "en", short: "EN", name: "English", published: true },
    { code: "fil", short: "FIL", name: "Filipino", published: false },
    { code: "es", short: "ES", name: "Español", published: false },
    { code: "zh-CN", short: "ZH-CN", name: "简体中文", published: false },
    { code: "ja", short: "JA", name: "日本語", published: false },
    { code: "ko", short: "KO", name: "한국어", published: false }
  ];
  /* LANGUAGES END */

  // --- Storage ---------------------------------------------------------------

  var store = function (area) {
    return {
      get: function (key) {
        try {
          return window[area].getItem(key);
        } catch (e) {
          return null;
        }
      },
      set: function (key, value) {
        try {
          if (value === null) window[area].removeItem(key);
          else window[area].setItem(key, value);
        } catch (e) {}
      },
    };
  };
  var local = store("localStorage");
  var session = store("sessionStorage");

  // --- Which languages are offered -------------------------------------------

  var params = new URLSearchParams(window.location.search);
  var DEV =
    window.location.protocol === "file:" ||
    /^(localhost|127(?:\.\d+){3}|\[::1\]|0\.0\.0\.0)$/.test(window.location.hostname) ||
    params.has("i18n-debug");

  if (params.has(PREVIEW_KEY)) session.set(PREVIEW_KEY, params.get(PREVIEW_KEY) === "0" ? null : "1");
  var PREVIEW = DEV || session.get(PREVIEW_KEY) === "1";
  var available = LANGUAGES.filter(function (lang) {
    return lang.published || PREVIEW;
  });

  var byCode = function (code) {
    var wanted = String(code || "").toLowerCase();
    for (var i = 0; i < available.length; i += 1) {
      if (available[i].code.toLowerCase() === wanted) return available[i];
    }
    return null;
  };

  // A browser language tag → one of ours. Chinese matches Simplified only
  // (zh, zh-CN, zh-SG, zh-Hans…), never Traditional (zh-TW, zh-HK, zh-Hant).
  // Tagalog (tl) is offered Filipino.
  var matchTag = function (tag) {
    var parts = String(tag || "").toLowerCase().split(/[-_]/);
    var primary = parts[0];
    if (!primary) return null;
    if (primary === "zh") {
      var traditional = parts.indexOf("hant") > -1 || parts.indexOf("tw") > -1 || parts.indexOf("hk") > -1 || parts.indexOf("mo") > -1;
      return traditional ? null : byCode("zh-CN");
    }
    if (primary === "tl") primary = "fil";
    return byCode(primary);
  };

  var detect = function () {
    // ?lang=xx (handy for review links) counts as a manual choice; the
    // parameter is then dropped so every page keeps one canonical URL.
    var fromUrl = params.get("lang");
    if (fromUrl) {
      params.delete("lang");
      var query = params.toString();
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
      } catch (e) {}
      var chosen = byCode(fromUrl);
      if (chosen) {
        local.set(STORAGE_KEY, chosen.code);
        return chosen.code;
      }
    }
    var saved = byCode(local.get(STORAGE_KEY));
    if (saved) return saved.code;
    var tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < tags.length; i += 1) {
      var match = matchTag(tags[i]);
      if (match) return match.code;
    }
    return "en";
  };

  var current = detect();
  root.setAttribute("lang", current);

  // --- Dictionaries ------------------------------------------------------------

  window.I18N_LOCALES = window.I18N_LOCALES || {};
  var dicts = {};
  var pending = {};
  var domReady = document.readyState === "complete";
  document.addEventListener("DOMContentLoaded", function () {
    domReady = true;
  });
  var whenDomReady = function (fn) {
    if (domReady) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  };

  var dictFor = function (code) {
    return dicts[code] || window.I18N_LOCALES[code] || null;
  };

  var localeUrl = function (code, ext) {
    return new URL("data/locales/" + code + "." + ext + "?v=" + VERSION, SITE_ROOT).href;
  };

  var load = function (code) {
    if (dictFor(code)) {
      dicts[code] = dictFor(code);
      return Promise.resolve(dicts[code]);
    }
    if (pending[code]) return pending[code];
    pending[code] = new Promise(function (resolve, reject) {
      var inject = function () {
        if (window.I18N_LOCALES[code]) return resolve(window.I18N_LOCALES[code]);
        var tag = document.createElement("script");
        tag.src = localeUrl(code, "js");
        tag.async = true;
        tag.onload = function () {
          if (window.I18N_LOCALES[code]) resolve(window.I18N_LOCALES[code]);
          else reject(new Error("empty locale " + code));
        };
        // The compiled script missing (e.g. the build step hasn't run): the
        // JSON source works too, over http.
        tag.onerror = function () {
          fetch(localeUrl(code, "json"))
            .then(function (response) {
              if (!response.ok) throw new Error(response.status);
              return response.json();
            })
            .then(resolve, reject);
        };
        (document.head || root).appendChild(tag);
      };
      // English arrives with the page (its deferred script); only fetch it
      // separately if that tag is missing.
      if (code === "en" && !domReady) whenDomReady(inject);
      else inject();
    }).then(
      function (dict) {
        dicts[code] = dict;
        delete pending[code];
        return dict;
      },
      function (error) {
        delete pending[code];
        throw error;
      }
    );
    return pending[code];
  };

  // --- Lookup ------------------------------------------------------------------

  var missing = {};
  var missingTimer = 0;
  var noteMissing = function (key, code) {
    var list = missing[code] || (missing[code] = {});
    if (list[key]) return;
    list[key] = true;
    if (!DEV) return;
    window.clearTimeout(missingTimer);
    missingTimer = window.setTimeout(function () {
      Object.keys(missing).forEach(function (lang) {
        var keys = Object.keys(missing[lang]);
        if (keys.length) console.warn("[i18n] " + keys.length + " missing key(s) in " + lang + " — showing English:", keys);
      });
    }, 400);
  };

  var own = function (dict, key) {
    return dict && Object.prototype.hasOwnProperty.call(dict, key) && typeof dict[key] === "string" && dict[key] !== "" ? dict[key] : undefined;
  };

  // The string for `key` in the active language, else English.
  var lookup = function (key) {
    var value;
    if (current !== "en" && dicts[current]) {
      value = own(dicts[current], key);
      if (value === undefined) noteMissing(key, current);
    }
    if (value === undefined) value = own(dictFor("en"), key);
    if (value === undefined) noteMissing(key, "en");
    return value;
  };

  var has = function (key) {
    return own(dicts[current], key) !== undefined || own(dictFor("en"), key) !== undefined;
  };

  var resolveVars = function (vars) {
    if (!vars) return vars;
    var out = {};
    Object.keys(vars).forEach(function (name) {
      var value = vars[name];
      out[name] = typeof value === "string" && value.charAt(0) === "@" ? t(value.slice(1)) : value;
    });
    return out;
  };

  var format = function (text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return vars[name] === undefined || vars[name] === null ? match : String(vars[name]);
    });
  };

  // t("search.viewAll", { count: 12 }). `fallback` is shown only if even
  // English lacks the key (a bug, logged in development).
  function t(key, vars, fallback) {
    var value = lookup(key);
    if (value === undefined) return fallback === undefined ? "" : String(fallback);
    return format(value, resolveVars(vars));
  }

  var pluralRules = {};
  var numberFormats = {};
  var pluralCategory = function (count) {
    try {
      if (!pluralRules[current]) pluralRules[current] = new Intl.PluralRules(current);
      return pluralRules[current].select(count);
    } catch (e) {
      return count === 1 ? "one" : "other";
    }
  };
  var formatNumber = function (n) {
    try {
      if (!numberFormats[current]) numberFormats[current] = new Intl.NumberFormat(current);
      return numberFormats[current].format(n);
    } catch (e) {
      return String(n);
    }
  };

  // plural("gallery.count.images", 441) → key.one / key.other (+ {count}).
  function plural(key, count, vars) {
    var all = resolveVars(vars) || {};
    if (all.count === undefined) all.count = formatNumber(count); // callers may pass a padded "08"
    var category = pluralCategory(Number(count));
    var value = own(dicts[current], key + "." + category) || own(dicts[current], key + ".other");
    if (current === "en" || value === undefined) {
      if (current !== "en" && dicts[current]) noteMissing(key + ".other", current);
      var en = dictFor("en");
      value = own(en, key + "." + (Number(count) === 1 ? "one" : "other")) || own(en, key + ".other");
    }
    return value === undefined ? String(count) : format(value, all);
  }

  // A data-driven English term ("Product Catalogue") → term.product-catalogue.
  var slug = function (text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };
  function term(english) {
    if (!english) return "";
    var key = "term." + slug(english);
    return has(key) ? t(key) : english;
  }

  // --- Static markup -------------------------------------------------------------

  var originals = typeof WeakMap === "function" ? new WeakMap() : null;
  var originalOf = function (el) {
    var o = originals && originals.get(el);
    if (!o) {
      o = { text: null, html: null, attrs: {} };
      if (originals) originals.set(el, o);
    }
    return o;
  };

  var varsOf = function (el) {
    var raw = el.getAttribute("data-i18n-vars");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (DEV) console.warn("[i18n] bad data-i18n-vars", el);
      return null;
    }
  };

  // Localized value for an element's key, or undefined (keep English).
  var localized = function (key, el) {
    var count = el.getAttribute("data-i18n-count");
    if (count !== null) {
      var dict = dicts[current];
      if (!own(dict, key + ".other")) {
        noteMissing(key + ".other", current);
        return undefined;
      }
      return plural(key, Number(count), varsOf(el));
    }
    var value = own(dicts[current], key);
    if (value === undefined) {
      noteMissing(key, current);
      return undefined;
    }
    return format(value, resolveVars(varsOf(el)));
  };

  var applyTo = function (el) {
    var o = originalOf(el);
    var english = current === "en" || !dicts[current];
    var key = el.getAttribute("data-i18n");
    if (key) {
      if (o.text === null) o.text = el.textContent;
      var text = english ? o.text : localized(key, el);
      if (text === undefined) text = o.text;
      if (el.textContent !== text) el.textContent = text;
    }
    key = el.getAttribute("data-i18n-html");
    if (key) {
      if (o.html === null) o.html = el.innerHTML;
      var html = english ? o.html : localized(key, el);
      if (html === undefined) html = o.html;
      if (el.innerHTML !== html) el.innerHTML = html;
    }
    var spec = el.getAttribute("data-i18n-attr");
    if (spec) {
      spec.split(";").forEach(function (pair) {
        var at = pair.indexOf(":");
        if (at < 1) return;
        var name = pair.slice(0, at).trim();
        var attrKey = pair.slice(at + 1).trim();
        if (!(name in o.attrs)) o.attrs[name] = el.getAttribute(name);
        var value = english ? o.attrs[name] : localized(attrKey, el);
        if (value === undefined) value = o.attrs[name];
        if (value === null) el.removeAttribute(name);
        else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
      });
    }
  };

  function apply(scope) {
    var base = scope || document;
    if (base.nodeType === 1 && base.matches("[data-i18n],[data-i18n-html],[data-i18n-attr]")) applyTo(base);
    var els = base.querySelectorAll("[data-i18n],[data-i18n-html],[data-i18n-attr]");
    for (var i = 0; i < els.length; i += 1) applyTo(els[i]);
  }

  // --- Change events -----------------------------------------------------------------

  var EVENT = "i18n:change";
  function onChange(fn) {
    document.addEventListener(EVENT, function (event) {
      try {
        fn(event.detail);
      } catch (error) {
        console.error("[i18n] change handler failed", error);
      }
    });
  }
  var emit = function (previous, initial) {
    document.dispatchEvent(new CustomEvent(EVENT, { detail: { lang: current, previous: previous, initial: Boolean(initial) } }));
  };

  // --- Fonts -----------------------------------------------------------------------------

  var fontsLoaded = {};
  var loadFonts = function (code) {
    var family = CJK_FONTS[code];
    if (!family || fontsLoaded[code]) return;
    fontsLoaded[code] = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + family + ":wght@400;500&display=swap";
    link.setAttribute("data-i18n-font", code);
    document.head.appendChild(link);
  };

  // --- Keeping the reader's place -------------------------------------------------------

  var reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  // Whatever sits just under the header before the swap stays at the same
  // height after it, however much the text above it grew or shrank.
  var captureAnchor = function () {
    var header = document.querySelector(".site-header");
    var probeY = Math.min(window.innerHeight - 1, (header ? header.getBoundingClientRect().bottom : 0) + 24);
    var hit = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.max(0, Math.round(probeY)));
    if (!hit || hit === document.body || hit === root) return null;
    var el = (hit.closest && hit.closest("[data-i18n-html]")) || hit;
    return { el: el, top: el.getBoundingClientRect().top, scrollY: window.scrollY };
  };
  var restoreAnchor = function (anchor) {
    if (!anchor || !anchor.el.isConnected) return;
    var delta = anchor.el.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) < 1) return;
    window.scrollTo({ top: window.scrollY + delta, left: window.scrollX, behavior: "instant" });
  };

  // --- Switching -----------------------------------------------------------------------------

  var ui = null; // the language control, once built
  var announceTimer = 0;
  var announce = function (text, lang) {
    if (!ui) return;
    ui.status.textContent = "";
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(function () {
      ui.status.setAttribute("lang", lang || current);
      ui.status.textContent = text;
    }, 60);
  };

  var swap = function (code, options) {
    var previous = current;
    current = code;
    root.setAttribute("lang", code);
    apply(document);
    emit(previous, options && options.initial);
    if (ui) ui.sync();
  };

  function setLanguage(code, options) {
    options = options || {};
    var lang = byCode(code);
    if (!lang) return Promise.reject(new Error("language not offered: " + code));
    if (!options.silent) local.set(STORAGE_KEY, lang.code);
    if (lang.code === current) return Promise.resolve(current);
    if (ui) ui.setBusy(true);
    return load(lang.code).then(
      function () {
        if (ui) ui.setBusy(false);
        loadFonts(lang.code);
        var anchor = captureAnchor();
        var run = function () {
          swap(lang.code);
          restoreAnchor(anchor);
        };
        var animate = !options.instant && !reducedMotion.matches && typeof document.startViewTransition === "function";
        if (animate) {
          root.classList.add("lang-switching");
          var transition = document.startViewTransition(run);
          var done = function () {
            root.classList.remove("lang-switching");
          };
          transition.finished.then(done, done);
        } else {
          run();
        }
        if (!options.silent) announce(t("lang.changed", { language: lang.name }), lang.code);
        return current;
      },
      function (error) {
        if (ui) ui.setBusy(false);
        console.error("[i18n] could not load " + lang.code, error);
        announce(t("lang.loadFailed"));
        throw error;
      }
    );
  }

  // Another tab changed the language: follow quietly.
  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY || !event.newValue || event.newValue === current) return;
    if (byCode(event.newValue)) setLanguage(event.newValue, { instant: true, silent: true }).catch(function () {});
  });

  // --- First paint ------------------------------------------------------------------------------

  var reveal = function () {
    root.classList.remove("i18n-loading");
  };

  if (current !== "en") {
    root.classList.add("i18n-loading");
    var guard = window.setTimeout(reveal, LOADING_TIMEOUT_MS);
    loadFonts(current);
    load(current).then(
      function () {
        whenDomReady(function () {
          var code = current;
          current = "en"; // swap() moves from the markup's English
          swap(code, { initial: true });
          window.clearTimeout(guard);
          reveal();
        });
      },
      function (error) {
        console.error("[i18n] could not load " + current + " — showing English", error);
        current = "en";
        root.setAttribute("lang", "en");
        window.clearTimeout(guard);
        reveal();
      }
    );
  }

  // The language a visitor is most likely to switch to, fetched while idle.
  var preloadLikely = function () {
    var tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    var target = null;
    for (var i = 0; i < tags.length && !target; i += 1) {
      var match = matchTag(tags[i]);
      if (match && match.code !== current) target = match.code;
    }
    if (!target && current === "en" && byCode("fil")) target = "fil";
    if (target && target !== "en") load(target).catch(function () {});
  };

  // --- The language control -----------------------------------------------------------------------

  var GLOBE =
    '<svg class="lang-globe" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"></path></svg>';
  var CHECK =
    '<svg class="lang-option-check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
  var CLOSE =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

  var buildControl = function () {
    if (available.length < 2) return; // nothing to choose between yet
    var controls = document.querySelector(".site-header .header-controls");
    if (!controls) return;

    var make = function (tag, className) {
      var el = document.createElement(tag);
      if (className) el.className = className;
      return el;
    };

    // Shared description: which language is active.
    var desc = make("span", "sr-only");
    desc.id = "lang-current";
    desc.hidden = true;

    var makeToggle = function (className) {
      var button = make("button", "lang-toggle " + className);
      button.type = "button";
      button.setAttribute("aria-haspopup", "listbox");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", "lang-list");
      button.setAttribute("aria-describedby", "lang-current");
      button.innerHTML =
        GLOBE + '<span class="lang-toggle-name" aria-hidden="true"></span><span class="lang-toggle-code" aria-hidden="true"></span>';
      return button;
    };

    // Desktop: in the header, between search and theme. Phones: in the
    // full-screen menu's bottom row, clear of the header's name and buttons
    // (pages whose menu has no bottom row get one).
    var desktopToggle = makeToggle("lang-toggle-header");
    controls.insertBefore(desktopToggle, controls.querySelector(".theme-toggle") || controls.querySelector(".menu-toggle"));
    var toggles = [desktopToggle];
    var nav = document.getElementById("primary-nav");
    if (nav && nav.querySelector(".mobile-nav-links")) {
      var foot = nav.querySelector(".mobile-nav-foot");
      if (!foot) {
        foot = make("div", "mobile-nav-foot");
        nav.appendChild(foot);
      }
      var menuToggle = makeToggle("lang-toggle-menu");
      foot.insertBefore(menuToggle, foot.firstChild);
      toggles.push(menuToggle);
    }

    var menu = make("div", "lang-menu");
    menu.hidden = true;
    menu.innerHTML =
      '<div class="lang-menu-backdrop" data-lang-dismiss></div>' +
      '<div class="lang-menu-panel">' +
      '<div class="lang-menu-head"><p class="lang-menu-title" id="lang-title"></p>' +
      '<button class="lang-menu-close" type="button" data-lang-dismiss>' + CLOSE + "</button></div>" +
      '<ul class="lang-list" id="lang-list" role="listbox" tabindex="-1" aria-labelledby="lang-title"></ul>' +
      "</div>";
    var list = menu.querySelector(".lang-list");
    var title = menu.querySelector(".lang-menu-title");
    var closeButton = menu.querySelector(".lang-menu-close");

    var options = available.map(function (lang) {
      var li = make("li", "lang-option");
      li.id = "lang-option-" + lang.code;
      li.setAttribute("role", "option");
      li.setAttribute("lang", lang.code);
      li.dataset.lang = lang.code;
      var name = make("span", "lang-option-name");
      name.textContent = lang.name;
      var code = make("span", "lang-option-code");
      code.setAttribute("aria-hidden", "true");
      code.textContent = lang.short;
      li.appendChild(name);
      li.appendChild(code);
      li.insertAdjacentHTML("beforeend", CHECK);
      list.appendChild(li);
      return li;
    });

    var status = make("p", "sr-only");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.body.appendChild(desc);
    document.body.appendChild(menu);
    document.body.appendChild(status);

    var opener = null;
    var active = 0;
    var closeTimer = 0;
    var phone = window.matchMedia("(max-width: 760px)");

    var setActive = function (i) {
      active = (i + options.length) % options.length;
      options.forEach(function (option, k) {
        option.classList.toggle("is-active", k === active);
      });
      list.setAttribute("aria-activedescendant", options[active].id);
      options[active].scrollIntoView({ block: "nearest" });
    };

    var position = function () {
      if (!opener) return;
      var rect = opener.getBoundingClientRect();
      menu.style.setProperty("--lang-top", Math.round(rect.bottom + 10) + "px");
      menu.style.setProperty("--lang-right", Math.max(12, Math.round(window.innerWidth - rect.right)) + "px");
    };

    var onKeyCapture = function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation(); // the menu and search mustn't also close
        close();
      }
    };

    var open = function (button, focusLast) {
      if (!menu.hidden) return;
      window.clearTimeout(closeTimer);
      opener = button;
      position();
      menu.hidden = false;
      menu.classList.toggle("is-sheet", phone.matches);
      root.classList.add("lang-open");
      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-expanded", String(toggle === button));
      });
      var selected = 0;
      options.forEach(function (option, k) {
        if (option.dataset.lang === current) selected = k;
      });
      setActive(focusLast ? options.length - 1 : selected);
      list.focus({ preventScroll: true });
      document.addEventListener("keydown", onKeyCapture, true);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          menu.classList.add("is-open");
        });
      });
    };

    function close(restoreFocus) {
      if (menu.hidden) return;
      menu.classList.remove("is-open");
      root.classList.remove("lang-open");
      document.removeEventListener("keydown", onKeyCapture, true);
      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-expanded", "false");
      });
      closeTimer = window.setTimeout(function () {
        menu.hidden = true;
      }, reducedMotion.matches ? 0 : 200);
      if (restoreFocus !== false && opener && opener.isConnected) opener.focus({ preventScroll: true });
    }

    var choose = function (i) {
      var code = options[i].dataset.lang;
      close();
      setLanguage(code).catch(function () {});
    };

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        if (menu.hidden) open(toggle);
        else close();
      });
      toggle.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          open(toggle, event.key === "ArrowUp");
        }
      });
    });

    list.addEventListener("keydown", function (event) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActive(active + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActive(active - 1);
          break;
        case "Home":
          event.preventDefault();
          setActive(0);
          break;
        case "End":
          event.preventDefault();
          setActive(options.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          choose(active);
          break;
        case "Tab":
          event.preventDefault();
          close();
          break;
        default:
          break;
      }
    });
    list.addEventListener("click", function (event) {
      var option = event.target.closest(".lang-option");
      if (option) choose(options.indexOf(option));
    });
    list.addEventListener("mousemove", function (event) {
      var option = event.target.closest(".lang-option");
      var i = options.indexOf(option);
      if (i > -1 && i !== active) setActive(i);
    });
    menu.addEventListener("click", function (event) {
      if (event.target.closest("[data-lang-dismiss]")) close();
    });
    window.addEventListener("resize", function () {
      if (menu.hidden) return;
      position();
      menu.classList.toggle("is-sheet", phone.matches);
    });
    // The full-screen menu closing (or the page being left) takes the
    // selector with it.
    window.addEventListener("pageshow", function () {
      close(false);
    });
    if (nav && window.MutationObserver) {
      new MutationObserver(function () {
        if (!nav.classList.contains("is-open") && opener && opener.classList.contains("lang-toggle-menu")) close(false);
      }).observe(nav, { attributes: true, attributeFilter: ["class"] });
    }

    var sync = function () {
      var lang = byCode(current) || available[0];
      var label = t("lang.select");
      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-label", label);
        toggle.querySelector(".lang-toggle-code").textContent = lang.short;
        var name = toggle.querySelector(".lang-toggle-name");
        name.textContent = lang.name;
        name.setAttribute("lang", lang.code);
      });
      desktopToggle.dataset.tooltip = label;
      desc.textContent = t("lang.current", { language: lang.name });
      title.textContent = t("lang.title");
      closeButton.setAttribute("aria-label", t("lang.close"));
      options.forEach(function (option) {
        var selected = option.dataset.lang === current;
        option.setAttribute("aria-selected", String(selected));
        option.classList.toggle("is-selected", selected);
      });
    };

    var setBusy = function (busy) {
      toggles.forEach(function (toggle) {
        toggle.classList.toggle("is-busy", busy);
        if (busy) toggle.setAttribute("aria-busy", "true");
        else toggle.removeAttribute("aria-busy");
      });
    };

    ui = { sync: sync, setBusy: setBusy, status: status };
    sync();
  };

  // --- Public API -------------------------------------------------------------------------------------

  window.i18n = {
    get lang() {
      return current;
    },
    languages: available.slice(),
    dev: DEV,
    t: t,
    plural: plural,
    term: term,
    has: has,
    format: format,
    apply: apply,
    onChange: onChange,
    setLanguage: setLanguage,
    missing: function (code) {
      return Object.keys(missing[code || current] || {});
    },
  };

  whenDomReady(function () {
    buildControl();
    (window.requestIdleCallback || function (fn) {
      return window.setTimeout(fn, 1500);
    })(preloadLikely);
  });
})();
