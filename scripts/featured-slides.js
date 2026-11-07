/*
 * The mobile landing coverflow's curated slides (index.html, .mobile-featured),
 * shared by scripts/generate-mobile-featured.js (images, data, opening
 * slide's markup) and scripts/make-featured-clips.js (light reel preview
 * clips and their posters).
 *
 * Hand-picked — never a random pick from the gallery folders. Rules:
 * - The first slide is the opening slide: the strongest visual, image only.
 * - One visual per slide; no visual appears twice, and neighbouring slides
 *   never share a brand.
 * - Cards are 4:5. Artwork with other proportions is shown whole over a
 *   blurred, darkened copy of itself — never stretched or cropped.
 * - `brand` and `year` are shown as written (official names are never
 *   translated). Leave `year` empty unless the work itself, its file, or its
 *   publication record states it.
 *
 * Slide: { id, title, subtitle, category, brand, year, href, visual }
 *   href   — where the centred card and "View Project" lead.
 *   visual — { id, source, alt, crop? }                    image
 *            { id, kind: "reel", file, start, length, alt, label }
 *     file   — the full reel in assets/videos/short-form-reels/, played in
 *              the fullscreen viewer when the centred card is tapped;
 *     start  — seconds into the reel where the preview clip begins;
 *     length — preview clip seconds.
 *     Run scripts/make-featured-clips.js after adding or changing a reel.
 */
const openIn = (page, file) => `pages/${page}.html?open=${encodeURIComponent(file)}`;
const reelPage = (file) => `pages/short-form-video-reels.html?reel=${encodeURIComponent(file)}`;
const GALLERY = "assets/images/gallery";
const BRAND_DECK = "assets/documents/editorial-layout/pages/porta-mobili-brand-deck-web";

module.exports = [
  {
    id: "social-campaigns",
    title: "Social Media Campaigns & Key Visuals",
    subtitle: "Recliner event key visual",
    category: "Key Visual",
    brand: "Hooga",
    year: "2026", // printed on the artwork
    href: openIn("social-media-campaigns", "HOOGA ROCKWELL.png"),
    visual: {
      id: "hooga-key-visual",
      source: `${GALLERY}/social-media-campaigns/HOOGA ROCKWELL.png`,
      alt: "Hooga “A New Sense of Comfort” key visual: a tan leather sofa beneath glowing circular ceiling lights in a warm walnut-toned room.",
    },
  },
  {
    id: "brand-identity",
    title: "Brand Identity & Visual Systems",
    subtitle: "Identity applied to branded merchandise",
    category: "Brand Merchandise",
    brand: "Porta Mobili",
    year: "",
    href: openIn("print-brand-collateral", "22.2.png"),
    visual: {
      id: "porta-tote",
      source: `${GALLERY}/print-brand-collateral/22.2.png`,
      alt: "Black Porta Mobili tote bag printed with the vertical wordmark and monogram.",
    },
  },
  {
    id: "print-collateral",
    title: "Print & Brand Collateral",
    subtitle: "Royal Comfort tri-fold brochure",
    category: "Brochure",
    brand: "Dunlopillo",
    year: "",
    href: openIn("print-brand-collateral", "28.2.png"),
    visual: {
      id: "dunlopillo-brochure",
      source: `${GALLERY}/print-brand-collateral/28.2.png`,
      alt: "Dunlopillo Royal Comfort tri-fold brochure in deep navy, showing mattress details and bedroom scenes, open and folded.",
    },
  },
  {
    id: "photography",
    title: "Commercial & Lifestyle Photography",
    subtitle: "Lifestyle furniture photography",
    category: "Photography",
    brand: "BW",
    year: "2025", // from the file name
    href: openIn("commercial-lifestyle-photography", "BW 2025 - 02.jpg"),
    visual: {
      id: "bw-product-photography",
      source: `${GALLERY}/commercial-lifestyle-photography/BW 2025 - 02.jpg`,
      alt: "A model dressed in white seated on a curved bouclé sofa beside a polished round side table, photographed for BW furniture.",
    },
  },
  {
    id: "reels",
    title: "Short-Form Video & Reels",
    subtitle: "“GRWM to sleep” lifestyle reel",
    category: "Reel",
    brand: "Mooni",
    year: "",
    href: reelPage("MOONI FW20202.3.mp4"),
    visual: {
      id: "mooni-grwm-reel",
      kind: "reel",
      file: "MOONI FW20202.3.mp4",
      start: 0.4,
      length: 7,
      label: "Mooni “GRWM to sleep” reel",
      alt: "A woman in green loungewear dances, then dives into bed under a grey blanket in a softly lit bedroom.",
    },
  },
  {
    id: "editorial",
    title: "Editorial & Layout Design",
    subtitle: "Brand deck design and layout",
    category: "Brand Deck",
    brand: "Porta Mobili",
    year: "2026", // js/publication-meta.js
    href: openIn("editorial-layout", "porta-mobili-brand-deck-web.pdf"),
    visual: {
      id: "porta-mobili-brand-deck",
      source: `${BRAND_DECK}/page-001.jpg`,
      crop: { left: 14 }, // the page render has a thin white edge
      alt: "Porta Mobili brand deck cover: the sculpted curve of a cream chair emerging from deep shadow beside the Porta Mobili wordmark.",
    },
  },
  {
    id: "retail",
    title: "Furniture & Retail Applications",
    subtitle: "Mall roadshow exhibition booth",
    category: "Exhibition Booth",
    brand: "Dunlopillo",
    year: "",
    href: openIn("print-brand-collateral", "Dunlopillo Science of Deeper Sleep Display.png"),
    visual: {
      id: "dunlopillo-booth",
      source: `${GALLERY}/print-brand-collateral/Dunlopillo Science of Deeper Sleep Display.png`,
      alt: "Dunlopillo “The Science of Deeper Sleep” exhibition booth with a backdrop banner and a made-up bed on display in a mall.",
    },
  },
  {
    id: "multi-brand",
    title: "Selected Multi-Brand Campaign",
    subtitle: "Showroom launch standee and poster",
    category: "Retail Standee",
    brand: "Hooga × Porta Mobili",
    year: "",
    href: openIn("print-brand-collateral", "uptown mall 2.png"),
    visual: {
      id: "hooga-mall-standee",
      source: `${GALLERY}/print-brand-collateral/uptown mall 2.png`,
      alt: "Hooga “A new sense of comfort is now in Hooga” standee and poster in a mall corridor.",
    },
  },
  {
    id: "creative-direction",
    title: "Creative Direction Highlights",
    subtitle: "Atmosphere-led lighting reel",
    category: "Art Direction",
    brand: "Metal-Lite",
    year: "",
    href: reelPage("0202 (4).mp4"),
    visual: {
      id: "metal-lite-wanda-reel",
      kind: "reel",
      file: "0202 (4).mp4",
      start: 0,
      length: 6,
      label: "Metal-Lite Wanda pendant lights reel",
      alt: "Clusters of glowing cube-shaped pendant lights hang above a dark showroom as the camera drifts beneath them.",
    },
  },
];
