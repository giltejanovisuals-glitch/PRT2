/*
 * Optional hand-authored metadata for videos in
 * assets/videos/short-form-reels/, keyed by filename exactly as it appears
 * in that folder, read by the split-screen showcase in video mode
 * (js/print-collateral-showcase.js). On phones each library tile shows
 * `title` and the duration, and the fullscreen viewer (js/reel-viewer.js)
 * shows "brand — title". All fields are optional:
 * nothing derived from the filename is ever shown (no `title` means no
 * title), `type` falls back to "Reel", and `duration`
 * (seconds, or "m:ss") is read from the video file when omitted.
 * `captions` is a WebVTT file in the same folder — add one for any reel
 * with speech.
 *
 * Example:
 * window.REEL_META = {
 *   "mooni-launch-reel.mp4": {
 *     title: "Product Launch Reel",
 *     brand: "Mooni",
 *     type: "Product Reel",
 *     year: "2026",
 *     duration: "0:24",
 *     captions: "mooni-launch-reel.vtt",
 *     alt: "Mooni product launch Reel, close-up shots cut to a fast beat.",
 *   },
 * };
 */
window.REEL_META = {};
