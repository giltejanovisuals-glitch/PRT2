/*
 * Optional metadata for images in assets/images/gallery/<category-id>/,
 * one object per category, each keyed by filename exactly as it appears in
 * that category's folder. Anything a file doesn't have an entry for falls
 * back to a title guessed from its filename and empty project/type/year/alt
 * fields — see js/gallery-editorial.js.
 *
 * Example:
 * window.GALLERY_EDITORIAL_META = {
 *   "editorial-layout": {
 *     "porta-mobili-catalogue-01.jpg": {
 *       title: "Catalogue Spread",
 *       project: "Porta Mobili",
 *       type: "Product Catalogue",
 *       year: "2024",
 *       alt: "Two-page catalogue spread showing the Porta Mobili living room collection.",
 *     },
 *   },
 * };
 */
window.GALLERY_EDITORIAL_META = {
  "editorial-layout": {},
  "social-media-campaigns": {},
  "print-brand-collateral": {},
  "commercial-lifestyle-photography": {},
  "short-form-video-reels": {}
};
