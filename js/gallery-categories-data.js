/*
 * The five Project Gallery categories (pages/<id>.html and the homepage
 * gallery), in display order. This file is the English copy; the
 * data/locales keys category.<id>.<field> translate it.
 *
 * Copy structure, the same for every category (shown in the page header by
 * js/gallery-editorial.js):
 *   title         — category name
 *   intro         — one-sentence professional introduction
 *   brands        — brands or clients confirmed by the work itself (a logo
 *                   or name visible in it, Gil's own filenames, or
 *                   js/publication-meta.js); never guessed
 *   role          — Gil's role, from his CV and the publication records
 *   deliverables  — the kinds of pieces actually in the folder
 *   year          — only when every piece in the category confirms it
 *   objective     — one sentence on the creative objective or contribution
 *   lede          — one-line summary for the homepage gallery panel and the
 *                   category's closing line
 *
 * Media comes from the build-generated manifests, so new files dropped into
 * a category's folder appear automatically after `npm run build`:
 *   - images: assets/images/gallery/<id>/ (js/gallery-editorial-manifest.js)
 *   - reels:  assets/videos/short-form-reels/ (js/reel-manifest.js)
 *   - PDFs:   assets/documents/editorial-layout/ (js/publication-manifest.js)
 * Manual controls:
 *   - display order and hidden files: scripts/gallery-priority.js
 *   - `featured` below: the opening piece and the homepage previews
 *   - captions (brand), titles, and alt text: js/gallery-editorial-meta.js,
 *     js/reel-meta.js, js/publication-meta.js
 */
window.GALLERY_CATEGORIES = [
  {
    id: "editorial-layout",
    tone: "showcase-tone-editorial",
    number: "01",
    title: "Editorial & Layout Design",
    intro:
      "Product catalogues, collection books, and brand documents designed on clear grids with consistent typography and steady pacing.",
    brands: ["Porta Mobili", "Dunlopillo", "Hooga", "Endo"],
    role: "Editorial layout, typography, and production preparation",
    deliverables: "Product and collection catalogues, brand book, brand deck",
    year: "2026",
    objective:
      "Turn large product ranges into well-ordered pages that stay consistent from cover to cover and are ready for print and digital distribution.",
    lede:
      "Catalogues, collection books, and brand documents built on considered grids, typography, and pacing.",
  },
  {
    id: "social-media-campaigns",
    tone: "showcase-tone-campaign",
    number: "02",
    title: "Social Media Campaigns & Key Visuals",
    intro:
      "Key visuals and social content for furniture, bedding, and lighting brands, composed for consistent and recognisable feeds.",
    brands: ["Dunlopillo", "Hooga", "Mooni", "Metal-Lite", "Porta Mobili"],
    role: "Key visual design, photo manipulation, and social layouts",
    deliverables: "Key visuals, event announcements, Instagram carousels",
    objective:
      "Give each brand a distinct visual voice that stays consistent across recurring posts, promotions, and event announcements.",
    lede:
      "Key visuals adapted across social posts, carousels, and promotions, each built around one clear idea.",
    // Hand-picked Featured key visuals, in display order (filenames in
    // assets/images/gallery/<id>/). The first is the page's opening visual
    // and the homepage preview; the rest are its slideshow. Used as-is —
    // never sampled or shuffled. Rebuild (`npm run build`) after editing.
    featured: [
      "1 FEATHER RECLINER v2.png", // Dunlopillo — recliner in the forest
      "05125.png", // Hooga — "Design Speaks Many Languages"
      "MARW33.1.png", // Mooni — reading on the mattress
      "MDG-4.png", // Metal-Lite — contemporary residence at night
      "PORTA-JUNE-3.png", // Porta Mobili — "Furniture with a point of view"
      "DP 7.png", // Dunlopillo — polar bear, "Truly deep sleep"
      "HMS2.png", // Hooga — "Calm comfort" outdoors
      "MOONI-JUNE-CONTENT2.png", // Mooni — "Drift into calm"
      "MW32.png", // Metal-Lite — "The hidden lighting designers love"
      "p08041.png", // sunset through a doorway
      "6 DR FLEX v2.png", // Dunlopillo — mattress on glacier ice
      "HOOGA ROCKWELL sq.png", // Hooga — "A new sense of comfort"
      "m08125.png", // Mooni — rainy-night POV
      "APR-LSAW3S1-astralux-mesa.png", // Metal-Lite — track light on artwork
      "DP-CEBU-DAVAO9.png", // Dunlopillo — "Sleep like a king"
      "HOOGA-JUNE-CONTENT7.png", // Hooga — "Made for relaxed, vibrant living"
    ],
  },
  {
    id: "print-brand-collateral",
    tone: "showcase-tone-presentation",
    number: "03",
    title: "Print & Brand Collateral",
    intro:
      "Out-of-home, retail, and event print that carries brand campaigns into streets, malls, and showrooms.",
    brands: ["Hooga", "Dunlopillo", "Porta Mobili", "Etro Home Interiors", "Metal-Lite", "Endo"],
    role: "Print and collateral design, production-ready artwork",
    deliverables: "Billboards, murals, posters, brochures, event and retail print",
    objective:
      "Extend each campaign's look from screen to print with production-ready files sized for every format, from a tote bag to a highway billboard.",
    lede:
      "Billboards, posters, brochures, and event pieces that carry a brand consistently off-screen.",
    // Hand-picked Featured pieces, in display order (see the
    // social-media-campaigns entry for how `featured` is used).
    featured: [
      "mockup EDSA WALL MURAL.png", // Hooga — wall mural
      "1.2.png", // Dunlopillo — highway billboard
      "34.2.png", // Etro Home Interiors — ad and truck wrap
      "23.2.png", // Endo × Metal-Lite — private lunch invitation
      "15.2.png", // Dunlopillo × Hooga — gift voucher
      "28.2.png", // Dunlopillo — Royal Comfort tri-fold brochure
      "22.2.png", // Porta Mobili — tote bag
      "11.2.png", // Hooga — "Her Moment" poster
      "31.2.png", // Dunlopillo — Royal Comfort mall lightbox
      "Porta Mobili Complimentary Drinks Menu.png", // Porta Mobili — table menu
      "Dunlopillo Science of Deeper Sleep Display.png", // Dunlopillo — exhibition booth
      "uptown mall 2.png", // Hooga — mall standee
      "13.2.png", // Metal-Lite × Endo — product flyer
      "mockup UPTOWN ART EVENT GREETING CARD.png", // Hooga × Galerie Joaquin — thank-you card
      "9.2.png", // Hooga — "Timeless Design" poster
      "24.2.png", // Dunlopillo — "Your world of deep sleep" poster
    ],
  },
  {
    id: "commercial-lifestyle-photography",
    tone: "showcase-tone-retail",
    number: "04",
    title: "Commercial & Lifestyle Photography",
    intro:
      "Product, interior, and lifestyle photography of furniture, lighting, and residential spaces.",
    brands: ["BW", "Etro"],
    role: "Photography and image editing",
    deliverables: "Product, detail, interior, and lifestyle photography",
    objective:
      "Show materials, proportions, and light as they are, in images ready for catalogues, social posts, and campaign layouts.",
    lede:
      "Product, interior, and lifestyle photography made for catalogues, campaigns, and social content.",
    // Hand-picked Featured Photos, in display order (filenames in
    // assets/images/gallery/<id>/). The first is the page's featured
    // photograph and the homepage preview; the rest are the homepage
    // slideshow. Used as-is — never sampled or shuffled. Rebuild
    // (`npm run build`) after editing so the homepage previews follow.
    featured: [
      "BW 2025 - 02.jpg", // lifestyle — model on sculpted sofa
      "_DSF2269-HDR.webp のコピー.jpg", // interior — living room and piano
      "2.5.png", // product — bouclé lounge chair
      "DSCF7388-HDR.jpg", // environmental — residence at dusk
      "8.3.png", // detail — marble-top drawer
      "ENEA-VELVET-NUBOLA-TECHWALL-2025.jpg", // interior — dining and shelving system
      "9.png", // lifestyle product — rattan lounge chair
      "_DSF2375.webp のコピー.jpg", // interior — dining room with orchids
      "3.png", // product — leather sofa
      "_DSF2401.webp のコピー.jpg", // detail — artwork and marimba
      "DSCF7424.jpg", // interior — kitchen island
      "7.7.png", // product — leather swivel chair
      "_DSF2331-HDR.webp のコピー.jpg", // interior — foyer floral table
      "Etro 14.jpg", // lifestyle — Etro armchairs, marble floor
      "4.5.png", // detail — walnut base and upholstery
      "_DSF2317-HDR.webp のコピー.jpg", // environmental — view through glass doors
    ],
  },
  {
    id: "short-form-video-reels",
    tone: "showcase-tone-digital",
    number: "05",
    title: "Short-Form Video & Reels",
    intro:
      "Vertical short-form videos of products, showrooms, and everyday comfort, made for social feeds.",
    brands: ["Hooga", "Mooni", "Dunlopillo", "Porta Mobili", "Metal-Lite", "BW"],
    role: "Video capture and editing",
    deliverables: "Product, showroom, lifestyle, and event reels",
    objective:
      "Present each product or space in a few seconds of clear, well-paced footage that holds attention in a scrolling feed.",
    lede:
      "Short vertical videos that present products and spaces for fast-moving social feeds.",
    // Poster frames (assets/videos/short-form-reels/*.jpg) of the reels the
    // homepage previews show, in order. Display order on the reels page
    // itself is set in scripts/gallery-priority.js.
    featured: [
      "MOONI FW20202.3.jpg", // Mooni — "GRWM to sleep"
      "0202 (4).jpg", // Metal-Lite — Wanda pendant lights
      "HOOGA JR1.jpg", // Hooga — Damari dining table
      "1120JUNE-REELS_Dunlopillo-Dr.Flex.jpg", // Dunlopillo — Dr. Flex
      "MOONI REEL.jpg", // Mooni — "A day with Mooni"
      "0904 4 THOMAS.jpg", // Hooga — Thomas sofa
      "FRW2.jpg", // Dunlopillo — store
      "MYW16.jpg", // smart lighting, "Morning"
      "PORTA.jpg", // Porta Mobili — living room
      "h08129.jpg", // Hooga — Tate armchair
      "260429 9.jpg", // "Meet Alloy"
      "HOOGA JR3.jpg", // Hooga × SoFA Design Institute event
      "MOONI JULY 1.jpg", // Mooni — "Still can't sleep?"
      "0624(1).jpg", // BW — sofa
      "WALL_MINI_JARDIM_LOOP.jpg", // outdoor wall lights
      "reel2.2.jpg", // chair sketch
    ],
  },
];
