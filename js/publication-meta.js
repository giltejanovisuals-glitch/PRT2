/*
 * Optional hand-authored metadata for publications in
 * assets/documents/editorial-layout/, keyed by filename exactly as it
 * appears in that folder. Anything a file doesn't have an entry for falls
 * back to a title guessed from its filename and empty brand/type/role/
 * description/caseStudyLink, with downloadAllowed defaulting to true —
 * see js/publication-reader.js.
 *
 * Example:
 * window.PUBLICATION_META = {
 *   "porta-mobili-catalogue-2025.pdf": {
 *     title: "Living Collection 2025",
 *     brand: "Porta Mobili",
 *     type: "Product Catalogue",
 *     year: "2025",
 *     role: "Editorial direction, grid development, typography, image sequencing, and production preparation.",
 *     description: "A full-line catalogue spanning living, dining, and bedroom collections.",
 *     caseStudyLink: "porta-mobili.html",
 *     downloadAllowed: true,
 *   },
 * };
 */
window.PUBLICATION_META = {
  "porta-brand-book-web.pdf": {
    title: "Porta Brand Book",
    brand: "Porta Mobili",
    type: "Brand Book",
    year: "2026",
    role: "Editorial direction, layout development, typography, image sequencing, and production preparation.",
    downloadAllowed: true,
  },

  "porta-mobili-brand-deck-web.pdf": {
    title: "Porta Mobili Brand Deck",
    brand: "Porta Mobili",
    type: "Brand Presentation",
    year: "2026",
    role: "Presentation structure, editorial layout, typography, and visual storytelling.",
    downloadAllowed: true,
  },
};
