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
    id: "campaign-marketing",
    tone: "showcase-tone-campaign",
    number: "01",
    title: "Campaign & Marketing Design",
    lede:
      "Campaign key visuals developed into full systems — social, digital ads, OOH, and e-commerce executions built from one central idea.",
    intro:
      "Campaigns built from a single big idea through to a key visual and a full system of executions, connecting design decisions to real marketing goals rather than one-off graphics.",
    entries: [
      { layout: "landscape", brand: "Mooni", year: "2025", type: "Campaign Key Visual", contribution: "Big-idea concept, key visual, and system adapted across social, digital, and OOH formats." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Social Media Campaign" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Digital Advertisement" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "OOH / Billboard" },
      { layout: "portrait", brand: "Client Name", year: "2023", type: "Promotional Material", contribution: "Campaign system adapted for in-store and print promotional formats." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Email / E-commerce Graphic" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Campaign Adaptation" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Social Media Campaign" },
    ],
  },
  {
    id: "editorial-layout",
    tone: "showcase-tone-editorial",
    number: "02",
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
    id: "retail-experiential",
    tone: "showcase-tone-retail",
    number: "03",
    title: "Retail, Product & Experiential Design",
    lede:
      "Retail graphics, product displays, packaging, and environmental design built for physical, in-person brand experiences.",
    intro:
      "Design built for physical spaces and products — retail campaigns, point-of-sale materials, packaging, and environmental graphics for booths, windows, and events.",
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Retail Campaign Graphic", contribution: "Retail graphic system adapted across multiple showroom footprints." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Point-of-Sale Material" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Product Display" },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Packaging" },
      { layout: "portrait", brand: "Client Name", year: "2025", type: "Environmental Graphic", contribution: "Wayfinding and environmental graphics for a retail showroom footprint." },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Event Graphic" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Booth / Exhibit" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Window Display" },
    ],
  },
  {
    id: "digital-web",
    tone: "showcase-tone-digital",
    number: "04",
    title: "Digital / Web & Content Design",
    lede:
      "Landing pages, microsites, e-commerce visuals, and social content systems that translate a brand into a complete digital ecosystem.",
    intro:
      "Visual direction for digital environments — landing pages, campaign microsites, e-commerce pages, and content systems built to carry a brand consistently across every digital touchpoint.",
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Landing Page", contribution: "Visual direction and layout system for a campaign landing page." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Campaign Microsite" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "E-commerce Page" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Social Content System" },
      { layout: "portrait", brand: "Client Name", year: "2023", type: "Mobile Adaptation", contribution: "Desktop visual direction adapted into a mobile-first content system." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Digital Banner" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Email Design" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Website Visual Direction" },
    ],
  },
  {
    id: "presentation-information",
    tone: "showcase-tone-presentation",
    number: "05",
    title: "Presentation & Information Design",
    lede:
      "Pitch decks, sales presentations, infographics, and data visualization built to make complex information clear and persuasive.",
    intro:
      "Presentations and information systems designed for visual storytelling — hierarchy, pacing, and narrative flow that turn dense business content into something clear, persuasive, and polished.",
    entries: [
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Pitch Deck", contribution: "Narrative structure, slide system, and visual hierarchy for an investor-facing pitch deck." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Sales Presentation" },
      { layout: "pair", brand: "Client Name", year: "2024", type: "Company Profile" },
      { layout: "landscape", brand: "Client Name", year: "2025", type: "Business Proposal" },
      { layout: "portrait", brand: "Client Name", year: "2023", type: "Infographic", contribution: "Data visualization system translating dense figures into a clear, scannable infographic." },
      { layout: "landscape", brand: "Client Name", year: "2024", type: "Strategy Deck" },
      { layout: "pair", brand: "Client Name", year: "2025", type: "Data Visualization" },
      { layout: "landscape", brand: "Client Name", year: "2023", type: "Event / Conference Presentation" },
    ],
  },
];
