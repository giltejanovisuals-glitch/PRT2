/*
 * Page transitions, with the overlay markup, critical styles and boot
 * script that scripts/generate-page-transition.js inlines into each page.
 *
 * Arriving: the overlay (homepage welcome, or the category's number and
 * title) plays in CSS for ~2.4s and fades away to reveal the page. This
 * removes it from the document once it has finished — or at the latest
 * shortly after, if animationend never comes — and releases the scroll
 * lock. Nothing waits on images or video.
 *
 * Leaving: a click on a link to another page of this site fades a plain
 * cover in for 200ms, then navigates; the next page's intro takes over
 * from the same color. External links, new-tab/modified clicks, downloads,
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
  const INTRO_DONE_MS = 2600; // after navigation start; the CSS ends ~2.4s
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
