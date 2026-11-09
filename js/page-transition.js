/*
 * Page transitions, with the overlay markup, critical styles and boot
 * script that scripts/generate-page-transition.js inlines into each page.
 *
 * Arriving: on the first page of a browsing session the overlay (homepage
 * welcome, or the category's number and title) plays in CSS for 900ms and
 * fades away to reveal the page. This removes it from the document once it
 * has finished — or at the latest shortly after, if animationend never
 * comes. It never blocks input, and nothing waits on images or video.
 *
 * Leaving: a click on a link to another page of this site fades a cover in
 * for 200ms — showing the category's title and a teal line when the link
 * opens a Project Gallery page — then navigates; the next page fades in
 * from the same color (no second intro in the same session). External links, new-tab/modified clicks, downloads,
 * mailto:/tel: and same-page anchors are left completely alone, and a
 * second tap while leaving is ignored. Restored from the back/forward
 * cache, the page drops its cover. Scripts that navigate themselves call
 * window.pageTransition.go(url).
 *
 * window.pageTransition.whenRevealed(callback) runs callback once the
 * intro is out of the way (at once if there was none), for effects meant
 * to be seen, like the reels page's highlight.
 */
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const INTRO_DONE_MS = 1000; // after navigation start; the CSS ends at 900ms
  const LEAVE_MS = 200;
  const LEAVE_GIVE_UP_MS = 6000; // navigation never happened: uncover

  // --- Arriving -------------------------------------------------------------

  let revealed = false;
  const waiting = [];

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    document.querySelector(".pt-overlay")?.remove();
    window.__ptEnd?.();
    waiting.splice(0).forEach((callback) => callback());
  };

  const overlay = document.querySelector(".pt-overlay");
  if (!overlay || !root.classList.contains("pt-intro")) {
    reveal();
  } else {
    overlay.addEventListener("animationend", (event) => {
      if (event.target === overlay && event.animationName === "pt-out") reveal();
    });
    window.setTimeout(reveal, Math.max(0, INTRO_DONE_MS - performance.now()));
  }

  const whenRevealed = (callback) => {
    if (revealed) callback();
    else waiting.push(callback);
  };

  // --- Leaving --------------------------------------------------------------

  let leaving = false;
  let cover = null;
  let giveUp = 0;

  const uncover = () => {
    leaving = false;
    window.clearTimeout(giveUp);
    cover?.remove();
    cover = null;
  };

  // The title a cover shows for a Project Gallery page, in the visitor's
  // language (null for any other page).
  const projectTitle = (href) => {
    const match = /\/pages\/([a-z0-9-]+)\.html$/.exec(new URL(href, window.location.href).pathname);
    if (!match) return null;
    const category = (window.GALLERY_CATEGORIES || []).find((entry) => entry.id === match[1]);
    const fallback = category ? category.title : null;
    return window.i18n && window.i18n.has && window.i18n.has(`category.${match[1]}.title`) ? window.i18n.t(`category.${match[1]}.title`) : fallback;
  };

  const go = (href) => {
    if (leaving) return;
    if (reduced.matches) {
      window.location.assign(href);
      return;
    }
    leaving = true;
    cover = document.createElement("div");
    cover.className = "pt-cover";
    cover.setAttribute("aria-hidden", "true");
    const title = projectTitle(href);
    if (title) {
      const inner = document.createElement("div");
      inner.className = "pt-inner";
      const heading = document.createElement("p");
      heading.className = "pt-title pt-title-project";
      heading.textContent = title;
      const line = document.createElement("span");
      line.className = "pt-line";
      inner.append(heading, line);
      cover.appendChild(inner);
    }
    document.body.appendChild(cover);
    // Two frames so the transparent state is painted before it fades in.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => cover?.classList.add("is-visible"));
    });
    window.setTimeout(() => window.location.assign(href), LEAVE_MS);
    giveUp = window.setTimeout(uncover, LEAVE_GIVE_UP_MS);
  };

  const pagePath = (url) => url.pathname.replace(/\/index\.html$/, "/");

  // A same-origin page of this site that isn't the one already open.
  const isOtherPage = (url) =>
    url.origin === window.location.origin &&
    /^https?:$/.test(url.protocol) &&
    /(\/|\.html)$/.test(url.pathname) &&
    (pagePath(url) !== pagePath(window.location) || url.search !== window.location.search);

  // Bubble phase on the document: any component that handles a click itself
  // (lightbox, reel viewer, accordions…) has already called preventDefault.
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link || link.hasAttribute("download")) return;
    if (link.target && link.target.toLowerCase() !== "_self") return;
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (e) {
      return;
    }
    if (!isOtherPage(url)) return;
    event.preventDefault();
    go(url.href);
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) uncover();
  });

  window.pageTransition = { go, whenRevealed };
})();
