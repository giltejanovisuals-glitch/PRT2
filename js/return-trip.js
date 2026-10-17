/*
 * Return trips from the Project Gallery pages back to where the visitor
 * came from on the homepage (paired with js/home-return.js there).
 *
 * 1. "Back to the gallery" links — the dock's Back to Project Gallery
 *    button and the menu's Gallery link (anything pointing at
 *    index.html#gallery) — ask the homepage to restore the visitor's last
 *    scroll position, so they land on the card they opened rather than at
 *    the top of the section. The dock button while it reads "Back to Top"
 *    (js/dock-context.js) is left alone.
 *
 * 2. window.returnOnClose(target, openClass), for pieces opened from the
 *    landing carousel (?open=<file>): watches `target` for `openClass`;
 *    once it has appeared and then gone — the lightbox, reel viewer, or
 *    publication reader closed — steps back in history, or opens the
 *    homepage when there is nothing on this site to go back to.
 */
(() => {
  const RETURN_REQUEST = "home-return";

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest && event.target.closest("a[href]");
      if (!link || link.dataset.context === "top" || event.defaultPrevented) return;
      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (e) {
        return;
      }
      if (url.origin !== window.location.origin || !/\/index\.html$/.test(url.pathname) || url.hash !== "#gallery") return;
      try {
        sessionStorage.setItem(RETURN_REQUEST, "1");
      } catch (e) {
        /* the homepage falls back to the #gallery anchor */
      }
    },
    true
  );

  const cameFromThisSite = () => {
    try {
      return Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  };

  window.returnOnClose = (target, openClass) => {
    if (!target || !("MutationObserver" in window)) return;
    let seenOpen = target.classList.contains(openClass);
    const observer = new MutationObserver(() => {
      const open = target.classList.contains(openClass);
      if (open) {
        seenOpen = true;
        return;
      }
      if (!seenOpen) return;
      observer.disconnect();
      if (cameFromThisSite() && window.history.length > 1) window.history.back();
      else window.location.href = new URL("../index.html", window.location.href).href;
    });
    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
  };
})();
