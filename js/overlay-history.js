/*
 * Browser Back closes whatever overlay is open, instead of leaving the page.
 * Loaded on every page; works with each overlay's existing code by watching
 * the state it already exposes and closing it with its own close control,
 * so scroll locking, focus return, and media pausing stay where they are.
 *
 *   overlay         open while                      closed with
 *   menu            #primary-nav.is-open            .mobile-nav-close
 *   search          html.search-open                .search-close
 *   language        html.lang-open                  .lang-menu-close
 *   image viewer    body.lightbox-open              .lightbox-close
 *   reel viewer     html.reel-viewer-open           .reel-viewer-close
 *   book reader     body.pub-immersive-open         #pub-immersive-close
 *
 * - Opening an overlay adds one history entry; Back closes the top overlay.
 * - Closing it any other way (its button, Escape, a backdrop tap) removes
 *   that entry again, so Back never needs a wasted press.
 * - A link inside an overlay that navigates (a menu item jumping to a
 *   section) keeps its own history entry; nothing is undone.
 * - An overlay that opens as another closes (search from the open menu)
 *   reuses the closed one's entry.
 */
(() => {
  if (!window.history || !history.pushState) return;
  const root = document.documentElement;
  const body = document.body;
  const nav = document.getElementById("primary-nav");

  const OVERLAYS = [
    { name: "menu", isOpen: () => !!nav && nav.classList.contains("is-open"), close: ".mobile-nav-close" },
    { name: "search", isOpen: () => root.classList.contains("search-open"), close: ".search-close" },
    { name: "language", isOpen: () => root.classList.contains("lang-open"), close: ".lang-menu-close" },
    { name: "image", isOpen: () => body.classList.contains("lightbox-open"), close: ".lightbox-close" },
    { name: "reel", isOpen: () => root.classList.contains("reel-viewer-open"), close: ".reel-viewer:not([hidden]) .reel-viewer-close" },
    { name: "reader", isOpen: () => body.classList.contains("pub-immersive-open"), close: "#pub-immersive-close" },
  ];

  const KEY = "__overlay";
  const stack = []; // names, oldest first
  const closingFromHistory = new Set();
  let ownBacks = 0; // history.back() calls of ours whose popstate to ignore
  let pending = null; // an overlay closed by its UI, about to drop its entry

  // While an overlay is open, the browser must not restore scroll positions
  // itself: overlays that pin the page (body position: fixed) record 0 for
  // the entry beneath them, and each overlay already puts the page back
  // where it was when it closes. Automatic restoration returns once every
  // overlay is closed and its history step has settled.
  const settle = () =>
    window.setTimeout(() => {
      if (!stack.length && !ownBacks && !pending) history.scrollRestoration = "auto";
    }, 120);

  const stateWith = (name) => {
    const state = Object.assign({}, history.state || {});
    if (name) state[KEY] = name;
    else delete state[KEY];
    return state;
  };
  const top = () => (history.state || {})[KEY];

  const opened = (name) => {
    if (stack.includes(name)) return;
    history.scrollRestoration = "manual";
    if (pending && top() === pending) {
      // One overlay replaced another: reuse its entry.
      history.replaceState(stateWith(name), "");
      pending = null;
    } else {
      history.pushState(stateWith(name), "");
    }
    stack.push(name);
  };

  const closed = (name) => {
    const i = stack.indexOf(name);
    if (i < 0) return;
    stack.splice(i, 1);
    if (closingFromHistory.delete(name)) return settle(); // Back did it; the entry is gone
    if (top() !== name) return settle(); // a link inside it navigated on; keep that history
    pending = name;
    // After this event: a link's navigation or another overlay may follow.
    window.setTimeout(() => {
      if (pending !== name) return;
      pending = null;
      if (top() !== name) return settle();
      ownBacks += 1;
      history.back();
    }, 0);
  };

  window.addEventListener("popstate", () => {
    if (ownBacks) {
      ownBacks -= 1;
      settle();
      return;
    }
    // Back (or Forward) left the newest overlay's entry: close it.
    const name = stack[stack.length - 1];
    if (!name) return;
    const overlay = OVERLAYS.find((o) => o.name === name);
    if (!overlay || !overlay.isOpen()) {
      stack.pop();
      return;
    }
    closingFromHistory.add(name);
    const button = document.querySelector(overlay.close);
    if (button) button.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    if (overlay.isOpen()) closingFromHistory.delete(name); // couldn't close; leave it
    settle();
  });

  // Watch the state each overlay already sets.
  const state = new Map(OVERLAYS.map((o) => [o.name, o.isOpen()]));
  const sync = () => {
    const changes = OVERLAYS.map((o) => [o, o.isOpen()]).filter(([o, open]) => open !== state.get(o.name));
    // Closings first, so an overlay that replaces another can reuse its entry.
    changes.sort((a, b) => Number(a[1]) - Number(b[1]));
    changes.forEach(([o, open]) => {
      state.set(o.name, open);
      if (open) opened(o.name);
      else closed(o.name);
    });
  };
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  observer.observe(body, { attributes: true, attributeFilter: ["class"] });
  if (nav) observer.observe(nav, { attributes: true, attributeFilter: ["class"] });
})();
