/*
 * The mobile landing carousel's curated collection (index.html,
 * .mobile-featured), shared by scripts/generate-mobile-featured.js (images,
 * data, first group's markup) and scripts/make-featured-clips.js (light reel
 * preview clips and their posters).
 *
 * Hand-picked — never a random pick from the gallery folders. Rules:
 * - The first group is the fixed opening group; the browser shuffles the
 *   others once per session, never putting two groups with the same layout
 *   family or the same `family` tag side by side.
 * - No visual appears in more than one group, and each group mixes formats,
 *   brands, or subjects rather than near-identical compositions.
 * - Layouts (square frame): "feature" — one tall visual left, two stacked
 *   right; "feature-rev" — the same mirrored; "pair" — two equal verticals;
 *   "wide" — one wide visual above two squares. Items fill the slots in
 *   order. Pick artwork whose proportions suit its slot; anything that
 *   doesn't is shown whole over a blurred copy of itself.
 * - At most two reels per group (both may play at once).
 *
 * Items:
 *   { id, source, alt, href, crop? }            image (crop trims source px)
 *   { id, kind: "reel", file, start, length, alt, label }
 *     file   — the full reel in assets/videos/short-form-reels/, played in
 *              the fullscreen viewer when tapped;
 *     start  — seconds into the reel where the preview clip begins (pick a
 *              visually engaging moment); length — clip seconds.
 *     Run scripts/make-featured-clips.js after adding or changing a reel.
 */
const openIn = (page, file) => `pages/${page}.html?open=${encodeURIComponent(file)}`;
const GALLERY = "assets/images/gallery";
const BRAND_BOOK = "assets/documents/editorial-layout/pages/porta-brand-book-web";
const BRAND_DECK = "assets/documents/editorial-layout/pages/porta-mobili-brand-deck-web";

module.exports = [
  {
    id: "social-campaigns",
    title: "Social Media Campaigns & Key Visuals",
    subtitle: "Campaign key visuals across brands",
    href: "pages/social-media-campaigns.html",
    layout: "feature",
    items: [
      {
        id: "hooga-key-visual",
        source: `${GALLERY}/social-media-campaigns/HOOGA ROCKWELL.png`,
        href: openIn("social-media-campaigns", "HOOGA ROCKWELL.png"),
        alt: "Hooga “A New Sense of Comfort” key visual: a tan leather sofa beneath glowing circular ceiling lights in a warm walnut-toned room.",
      },
      {
        id: "dunlopillo-recliner",
        source: `${GALLERY}/social-media-campaigns/1 FEATHER RECLINER v2.png`,
        href: openIn("social-media-campaigns", "1 FEATHER RECLINER v2.png"),
        alt: "Dunlopillo “Find your sanctuary” key visual: a white leather recliner in a misty, sunlit forest.",
      },
      {
        id: "mooni-overhead",
        source: `${GALLERY}/social-media-campaigns/MARW33.1.png`,
        href: openIn("social-media-campaigns", "MARW33.1.png"),
        alt: "Mooni campaign visual seen from above: a woman in a grey robe stretched across a Mooni mattress, her face hidden behind a book.",
      },
    ],
  },
  {
    id: "brand-identity",
    family: "porta",
    title: "Brand Identity & Visual Systems",
    subtitle: "The Porta Mobili identity system",
    href: openIn("editorial-layout", "porta-brand-book-web.pdf"),
    layout: "wide",
    items: [
      {
        id: "porta-brand-book",
        source: `${BRAND_BOOK}/page-001.jpg`,
        href: openIn("editorial-layout", "porta-brand-book-web.pdf"),
        alt: "Porta Mobili brand book cover: the Porta Mobili wordmark beside a dim, warmly lit corridor.",
      },
      {
        id: "porta-tote",
        source: `${GALLERY}/print-brand-collateral/22.2.png`,
        href: openIn("print-brand-collateral", "22.2.png"),
        alt: "Black Porta Mobili tote bag printed with the vertical wordmark and monogram.",
      },
      {
        id: "porta-drinks-menu",
        source: `${GALLERY}/print-brand-collateral/Porta Mobili Complimentary Drinks Menu.png`,
        href: openIn("print-brand-collateral", "Porta Mobili Complimentary Drinks Menu.png"),
        alt: "Porta Mobili complimentary drinks menu in a grey table stand beside a coffee cup in a showroom lounge.",
      },
    ],
  },
  {
    id: "print-collateral",
    title: "Print & Brand Collateral",
    subtitle: "Wall murals and print brochures",
    href: "pages/print-brand-collateral.html",
    layout: "pair",
    items: [
      {
        id: "hooga-wall-mural",
        source: `${GALLERY}/print-brand-collateral/mockup EDSA WALL MURAL.png`,
        href: openIn("print-brand-collateral", "mockup EDSA WALL MURAL.png"),
        alt: "Hooga “Make space for living well” wall mural: a man reclining on a leather sofa against red desert cliffs, shown on a building wall and in a showroom.",
      },
      {
        id: "dunlopillo-brochure",
        source: `${GALLERY}/print-brand-collateral/28.2.png`,
        href: openIn("print-brand-collateral", "28.2.png"),
        alt: "Dunlopillo Royal Comfort tri-fold brochure in deep navy, showing mattress details and bedroom scenes, open and folded.",
      },
    ],
  },
  {
    id: "photography",
    title: "Commercial & Lifestyle Photography",
    subtitle: "Selected product and interior imagery",
    href: "pages/commercial-lifestyle-photography.html",
    layout: "feature-rev",
    items: [
      {
        id: "bw-product-photography",
        source: `${GALLERY}/commercial-lifestyle-photography/BW 2025 - 02.jpg`,
        href: openIn("commercial-lifestyle-photography", "BW 2025 - 02.jpg"),
        alt: "A model dressed in white seated on a curved bouclé sofa beside a polished round side table, photographed for BW furniture.",
      },
      {
        id: "boucle-lounge-chair",
        source: `${GALLERY}/commercial-lifestyle-photography/2.5.png`,
        href: openIn("commercial-lifestyle-photography", "2.5.png"),
        alt: "Green bouclé lounge chair on a dark wooden base, photographed in soft, warm light.",
      },
      {
        id: "marble-drawer-detail",
        source: `${GALLERY}/commercial-lifestyle-photography/8.3.png`,
        href: openIn("commercial-lifestyle-photography", "8.3.png"),
        alt: "Close-up of a marble-topped side table with its curved drawer slid open.",
      },
    ],
  },
  {
    id: "reels",
    family: "reels",
    title: "Short-Form Video & Reels",
    subtitle: "Lifestyle and product reels for social",
    href: "pages/short-form-video-reels.html",
    layout: "pair",
    items: [
      {
        id: "mooni-grwm-reel",
        kind: "reel",
        file: "MOONI FW20202.3.mp4",
        start: 0.4,
        length: 7,
        label: "Mooni “GRWM to sleep” reel",
        alt: "A woman in green loungewear dances, then dives into bed under a grey blanket in a softly lit bedroom.",
      },
      {
        id: "metal-lite-wanda-reel",
        kind: "reel",
        file: "0202 (4).mp4",
        start: 0,
        length: 6,
        label: "Metal-Lite Wanda pendant lights reel",
        alt: "Clusters of glowing cube-shaped pendant lights hang above a dark showroom as the camera drifts beneath them.",
      },
    ],
  },
  {
    id: "editorial",
    family: "porta",
    title: "Editorial & Layout Design",
    subtitle: "Porta Mobili brand deck spreads",
    href: openIn("editorial-layout", "porta-mobili-brand-deck-web.pdf"),
    layout: "wide",
    items: [
      {
        id: "porta-deck-etro-spread",
        source: `${BRAND_DECK}/page-027.jpg`,
        href: openIn("editorial-layout", "porta-mobili-brand-deck-web.pdf"),
        alt: "Porta Mobili brand deck spread: colourful Etro interiors with patterned sofas, rugs, and plants.",
      },
      {
        id: "porta-mobili-brand-deck",
        source: `${BRAND_DECK}/page-001.jpg`,
        crop: { left: 14 }, // the page render has a thin white edge
        href: openIn("editorial-layout", "porta-mobili-brand-deck-web.pdf"),
        alt: "Porta Mobili brand deck cover: the sculpted curve of a cream chair emerging from deep shadow beside the Porta Mobili wordmark.",
      },
      {
        id: "porta-deck-design-classic",
        source: `${BRAND_DECK}/page-049.jpg`,
        href: openIn("editorial-layout", "porta-mobili-brand-deck-web.pdf"),
        alt: "Porta Mobili brand deck spread titled “Design Classic”: a black-and-white photograph of a woman lying across a white bed.",
      },
    ],
  },
  {
    id: "retail",
    title: "Product & Retail Applications",
    subtitle: "Booths, standees, and mall lightboxes",
    href: "pages/print-brand-collateral.html",
    layout: "wide",
    items: [
      {
        id: "dunlopillo-lightbox",
        source: `${GALLERY}/print-brand-collateral/31.2.png`,
        href: openIn("print-brand-collateral", "31.2.png"),
        alt: "Dunlopillo Royal Comfort campaign on a snowy forest scene, shown as a printed poster and a backlit mall lightbox.",
      },
      {
        id: "dunlopillo-booth",
        source: `${GALLERY}/print-brand-collateral/Dunlopillo Science of Deeper Sleep Display.png`,
        href: openIn("print-brand-collateral", "Dunlopillo Science of Deeper Sleep Display.png"),
        alt: "Dunlopillo “The Science of Deeper Sleep” exhibition booth with a backdrop banner and a made-up bed on display in a mall.",
      },
      {
        id: "hooga-mall-standee",
        source: `${GALLERY}/print-brand-collateral/uptown mall 2.png`,
        href: openIn("print-brand-collateral", "uptown mall 2.png"),
        alt: "Hooga “A new sense of comfort is now in Hooga” standee and poster in a mall corridor.",
      },
    ],
  },
  {
    id: "cross-brand",
    family: "reels",
    title: "Selected Cross-Brand Highlights",
    subtitle: "Motion, lighting, and sleep campaigns",
    href: "pages/social-media-campaigns.html",
    layout: "feature",
    items: [
      {
        id: "hooga-motion-reel",
        kind: "reel",
        file: "h08122.mp4",
        start: 0,
        length: 7,
        label: "Hooga motion reel",
        alt: "Blue lounge chairs and wooden chairs float across a cream background with the words modern, aesthetic, and stylish.",
      },
      {
        id: "metal-lite-hidden-lighting",
        source: `${GALLERY}/social-media-campaigns/MW32.png`,
        href: openIn("social-media-campaigns", "MW32.png"),
        alt: "Metal-Lite “The hidden lighting designers love” visual: a dark living room and kitchen traced with warm concealed LED lighting.",
      },
      {
        id: "dunlopillo-sleep-like-a-king",
        source: `${GALLERY}/social-media-campaigns/DP-CEBU-DAVAO9.png`,
        href: openIn("social-media-campaigns", "DP-CEBU-DAVAO9.png"),
        alt: "Dunlopillo “Sleep like a king” visual: a man in a crown and royal robe asleep on a Dunlopillo mattress.",
      },
    ],
  },
];
