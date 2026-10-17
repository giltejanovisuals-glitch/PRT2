/*
 * Placeholder data for the Project Gallery category pages (pages/<id>.html).
 * Mirrors js/projects-data.js's role for the brand pages, but keyed by
 * application type instead of by client. Most entries here are clearly
 * generic placeholders — swap in real projects, images, and copy as they
 * become available; see README.md.
 *
 * Order is ranked strongest-to-weakest as a portfolio category (01 = the
 * strongest, business-connected, most senior-reading work; 05 = solid but
 * more supplementary) — keep this ranking in mind if reordering.
 */
window.GALLERY_CATEGORIES = [
  {
    id: "editorial-layout",
    tone: "showcase-tone-editorial",
    number: "01",
    title: "Editorial & Layout Design",
    lede:
      "Catalogs, lookbooks, brochures, and brand books built on considered grid, typography, and pacing.",
    intro:
      "Editorial systems that organize product and brand storytelling into clear, well-paced layouts — grid, typography, hierarchy, and composition built to hold up across long-form print and digital documents.",
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Product Catalogue", contribution: "Editorial grid and typography system spanning product, lifestyle, and brand-story spreads." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Lookbook" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Brochure" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Brand Book" },
      { layout: "portrait", brand: "Client Name", year: "2024", type: "Product Guide", contribution: "Specification and information layout system across a multi-page product guide." },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Magazine Layout" },
      { layout: "pair", brand: "Client Name", year: "2023", type: "Report" },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Lookbook" },
    ],
  },
  {
    id: "social-media-campaigns",
    tone: "showcase-tone-campaign",
    number: "02",
    title: "Social Media Campaigns & Key Visuals",
    lede:
      "Campaign key visuals developed into full social systems — feed, stories, paid social, and launch content built from one central idea.",
    intro:
      "Campaign key visuals developed into complete social systems — feed, stories, paid social, and launch content — giving products, promotions, and brand stories one clear, consistent presence across digital platforms.",
    // Hand-picked Featured key visuals, in display order (see the
    // commercial-lifestyle-photography entry for how `featured` is used).
    featured: [
      "1 FEATHER RECLINER v2.png", // Dunlopillo — recliner in the forest
      "05125.png", // Hooga — "Design Speaks Many Languages"
      "MARW33.1.png", // Mooni — "Comfort that breaks through"
      "MDG-4.png", // Metal-Lite — contemporary residence at night
      "PORTA-JUNE-3.png", // Porta Mobili — "Furniture with a point of view"
      "DP 7.png", // Dunlopillo — polar bear, "Truly deep sleep"
      "HMS2.png", // Hooga — "Calm comfort" outdoors
      "MOONI-JUNE-CONTENT2.png", // Mooni — "Drift into calm"
      "MW32.png", // Metal-Lite — "The hidden lighting designers love"
      "p08041.png", // Porta Mobili — sunset through a doorway
      "6 DR FLEX v2.png", // Dunlopillo — mattress on glacier ice
      "HOOGA ROCKWELL sq.png", // Hooga — "A new sense of comfort"
      "m08125.png", // Mooni — rainy-night POV
      "APR-LSAW3S1-astralux-mesa.png", // Metal-Lite — track light on artwork
      "DP-CEBU-DAVAO9.png", // Dunlopillo — "Sleep like a king"
      "HOOGA-JUNE-CONTENT7.png", // Hooga — "Made for relaxed, vibrant living"
    ],
    entries: [
      { layout: "landscape", brand: "Mooni", year: "2025", type: "Campaign Key Visual", contribution: "Big-idea concept, key visual, and system adapted across social, digital, and OOH formats." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Social Media Campaign" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Paid Social Ad" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Launch Key Visual" },
      { layout: "portrait", brand: "Client Name", year: "2023", type: "Social Content Series", contribution: "Key-visual system adapted into a feed-ready social content series." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Story / Reel Cover Set" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Campaign Adaptation" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Social Media Campaign" },
    ],
  },
  {
    id: "print-brand-collateral",
    tone: "showcase-tone-presentation",
    number: "03",
    title: "Print & Brand Collateral",
    lede:
      "Brochures, sales sheets, stationery, and branded print materials built to carry a brand consistently off-screen.",
    intro:
      "Brochures, sales materials, stationery, and branded print built to carry a brand consistently off-screen — from billboards and vehicle wraps to pieces held in hand, designed with the same rigor as any digital touchpoint.",
    // Hand-picked Featured key visuals, in display order (see the
    // commercial-lifestyle-photography entry for how `featured` is used).
    featured: [
      "mockup EDSA WALL MURAL.png", // Hooga — wall mural
      "1.2.png", // Dunlopillo — highway billboard
      "34.2.png", // Etro / Porta Mobili — ad and truck wrap
      "23.2.png", // Metal-Lite × Endo — private lunch invitation
      "15.2.png", // Dunlopillo × Hooga — gift voucher
      "28.2.png", // Dunlopillo — Royal Comfort tri-fold brochure
      "22.2.png", // Porta Mobili — tote bag
      "11.2.png", // Hooga — "Her Moment" poster
      "31.2.png", // Dunlopillo — Royal Comfort mall lightbox
      "Porta Mobili Complimentary Drinks Menu.png", // Porta Mobili — table menu
      "Dunlopillo Science of Deeper Sleep Display.png", // Dunlopillo — exhibition booth
      "uptown mall 2.png", // Hooga — mall standee
      "13.2.png", // Metal-Lite — product flyer
      "mockup UPTOWN ART EVENT GREETING CARD.png", // Hooga — event thank-you card
      "9.2.png", // Hooga — "Timeless Design" poster
      "24.2.png", // Dunlopillo — "Your world of deep sleep" poster
    ],
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Brand Brochure", contribution: "Print-ready brand brochure system carrying consistent grid, typography, and messaging across every spread." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Sales Sheet / One-Pager" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Company Profile Booklet" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Business Card & Stationery Set" },
      { layout: "portrait", brand: "Client Name", year: "2023", type: "Presentation Folder", contribution: "Branded presentation folder and insert system designed for client-facing meetings and pitches." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Product Spec Sheet" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Trade-Show Handout" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Infographic Poster" },
    ],
  },
  {
    id: "commercial-lifestyle-photography",
    tone: "showcase-tone-retail",
    number: "04",
    title: "Commercial & Lifestyle Photography",
    lede:
      "Product, showroom, and lifestyle photography styled and directed to support campaigns, catalogs, and retail environments.",
    intro:
      "Product, showroom, and lifestyle photography, styled and art-directed for campaigns, catalogs, and retail environments — with consistent lighting, styling, and color across every shoot.",
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
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Commercial Product Photography", contribution: "Product photography system art-directed for consistent lighting, styling, and color across a full catalogue." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Lifestyle Photoshoot" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Showroom Photography" },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Packaging Photography" },
      { layout: "portrait", brand: "Client Name", year: "2025", type: "Editorial Lifestyle Shoot", contribution: "Lifestyle photo direction staging product within real-world settings for editorial and catalogue use." },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "E-commerce Product Shots" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Campaign Photoshoot" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Event Photography" },
    ],
  },
  {
    id: "short-form-video-reels",
    tone: "showcase-tone-digital",
    number: "05",
    title: "Short-Form Video & Reels",
    lede:
      "Reels, TikToks, and short-form video content built for fast-paced social feeds and campaign launches.",
    intro:
      "Reels, TikToks, and short-form video content built for fast-paced social feeds and campaign launches.",
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Instagram Reel", contribution: "Short-form video concept, shot list, and edit direction for a product-launch Reel series." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "TikTok Video" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Product Demo Reel" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Campaign Teaser" },
      { layout: "portrait", brand: "Client Name", year: "2023", type: "Behind-the-Scenes Video", contribution: "Behind-the-scenes short-form video edited to build anticipation ahead of a campaign launch." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Motion Graphic Short" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Event Recap Video" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Social Video Ad" },
    ],
  },
];
