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
      "Campaigns built from a single big idea through to a key visual and a full system of social executions, connecting design decisions to real marketing goals rather than one-off graphics.",
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
      "Print-first collateral designed to represent a brand in hand — brochures, sales materials, stationery, and presentation pieces built with the same rigor as any digital touchpoint.",
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
      "Photography direction for commercial and lifestyle contexts — product shots, showroom sets, and lifestyle scenes styled and art-directed to support campaigns, catalogs, and retail environments.",
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
      "Short-form video direction for social-first content — reels, product demos, and campaign teasers edited for pacing, hook, and platform-native storytelling.",
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
