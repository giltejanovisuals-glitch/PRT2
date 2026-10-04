/*
 * Content protection — deters casual saving of images, video, and pages.
 *
 * Blocks the right-click / long-press menu, image and video dragging,
 * the save-page / view-source / print shortcuts, and native video
 * download / picture-in-picture options. Form fields keep their normal
 * menu so visitors can still paste into the contact form.
 *
 * Note: this is a deterrent, not DRM. Anything a browser can display can
 * still be captured (screenshots, dev tools, network inspection).
 */
(() => {
  const isEditable = (el) =>
    el instanceof Element && !!el.closest("input, textarea, select, [contenteditable='true']");

  document.addEventListener("contextmenu", (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, { capture: true });

  document.addEventListener("dragstart", (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, { capture: true });

  document.addEventListener("keydown", (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    // Save page, view source, print.
    if (mod && (key === "s" || key === "u" || key === "p")) {
      event.preventDefault();
    }
  }, { capture: true });

  const protectVideo = (video) => {
    video.setAttribute("controlsList", "nodownload noplaybackrate noremoteplayback");
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
  };

  const protectTree = (root) => {
    if (!(root instanceof Element)) return;
    if (root.tagName === "VIDEO") protectVideo(root);
    root.querySelectorAll("video").forEach(protectVideo);
    root.querySelectorAll("img").forEach((img) => img.setAttribute("draggable", "false"));
    if (root.tagName === "IMG") root.setAttribute("draggable", "false");
  };

  const start = () => {
    protectTree(document.body);
    new MutationObserver((mutations) => {
      mutations.forEach((m) => m.addedNodes.forEach(protectTree));
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
