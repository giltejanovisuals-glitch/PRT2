/*
 * Hand-authored metadata for images in assets/images/gallery/<category-id>/,
 * one object per category, each keyed by filename exactly as it appears in
 * that category's folder (js/gallery-editorial.js reads it).
 *   title   — short name for the piece (screen-reader labels)
 *   project — brand or client; shown as the fullscreen caption
 *   type    — kind of piece; also the alt text when `alt` is missing
 *   year    — only when the work itself states it
 *   alt     — what is actually in the image
 * Images without an entry still show; they fall back to the category's
 * type (e.g. "Campaign visual") for alt text and the category title for
 * the caption — never a filename.
 *
 * Accuracy rules: `project` only when the brand's logo or name is visible
 * in the work, or Gil's own filename names it; `year` only when printed on
 * the work or in its filename. Display order, featured pieces, and hidden
 * files live in scripts/gallery-priority.js and js/gallery-categories-data.js.
 */
window.GALLERY_EDITORIAL_META = {
  "editorial-layout": {},
  "social-media-campaigns": {
    "1 FEATHER RECLINER v2.png": {
      title: "Find Your Sanctuary",
      project: "Dunlopillo",
      type: "Social Key Visual",
      alt: "A white recliner in a misty forest clearing with the Dunlopillo line “Find your sanctuary. The perfect blend of comfort & nature.”",
    },
    "05125.png": {
      title: "Design Speaks Many Languages",
      project: "Hooga",
      type: "Social Key Visual",
      alt: "A woman reads in a rattan armchair beside a side table in a sunlit room, with the Hooga line “Design Speaks Many Languages.”",
    },
    "MARW33.1.png": {
      project: "Mooni",
      type: "Social Key Visual",
      alt: "Overhead view of a woman reading on a Mooni mattress beside grey velvet pillows embroidered with the Mooni logo.",
    },
    "MDG-4.png": {
      title: "Contemporary Modern Living",
      project: "Metal-Lite",
      type: "Social Key Visual",
      alt: "A contemporary residence lit at night between palm trees, titled “Contemporary Modern Living” under the Metal-Lite logo.",
    },
    "PORTA-JUNE-3.png": {
      title: "Furniture With a Point of View",
      project: "Porta Mobili",
      type: "Social Key Visual",
      alt: "A woman in white seated on a curved bouclé sofa beside a mirrored side table, with the Porta Mobili line “Furniture With a Point of View.”",
    },
    "DP 7.png": {
      title: "Truly Deep Sleep",
      project: "Dunlopillo",
      type: "Social Key Visual",
      alt: "A polar bear asleep on a Dunlopillo mattress on cracked ice beneath snowy mountains, titled “Truly Deep Sleep.”",
    },
    "HMS2.png": {
      title: "Calm Comfort",
      project: "Hooga",
      type: "Social Key Visual",
      alt: "A cream outdoor lounge chair and wooden side table on a seaside terrace, with the Hooga line “Calm comfort for open-air living.”",
    },
    "MOONI-JUNE-CONTENT2.png": {
      title: "Drift Into Calm",
      project: "Mooni",
      type: "Social Key Visual",
      alt: "A woman sleeps on a pillow atop large Mooni letters in a flower meadow at sunrise, titled “Drift Into Calm.”",
    },
    "MW32.png": {
      title: "The Hidden Lighting Designers Love",
      project: "Metal-Lite",
      type: "Social Key Visual",
      alt: "A dark modern living room and kitchen outlined by concealed linear lighting, titled “The hidden lighting designers love.”",
    },
    "p08041.png": {
      type: "Social Key Visual",
      alt: "A tall doorway in a dark wall opens onto a sunset over the sea, casting warm light across the floor.",
    },
    "6 DR FLEX v2.png": {
      title: "A Sleep So Cool",
      project: "Dunlopillo",
      type: "Social Key Visual",
      alt: "A Dunlopillo mattress on a block of ice before snow-covered peaks, with the line “Experience a sleep so cool.”",
    },
    "HOOGA ROCKWELL sq.png": {
      title: "A New Sense of Comfort",
      project: "Hooga",
      type: "Event Key Visual",
      year: "2026",
      alt: "A tan leather sofa beneath glowing circular ceiling lights in a walnut-panelled room, announcing the Hooga Rockwell event on September 18–20, 2026.",
    },
    "m08125.png": {
      title: "POV: It's Pouring Outside",
      project: "Mooni",
      type: "Social Key Visual",
      alt: "A bedroom overlooking a rainy city at night, captioned “POV: It's pouring outside, which mattress would you cozy up in?”",
    },
    "APR-LSAW3S1-astralux-mesa.png": {
      title: "Astralux Mesa",
      project: "Metal-Lite",
      type: "Product Key Visual",
      alt: "Black track lights wash a framed portrait painting on a dark gallery wall.",
    },
    "DP-CEBU-DAVAO9.png": {
      title: "Sleep Like a King",
      project: "Dunlopillo",
      type: "Social Key Visual",
      alt: "A man in a crown and ermine-trimmed robe sprawls across a Dunlopillo mattress, titled “Sleep like a king.”",
    },
    "HOOGA-JUNE-CONTENT7.png": {
      title: "Made for Relaxed, Vibrant Living",
      project: "Hooga",
      type: "Product Key Visual",
      alt: "A turquoise woven outdoor egg chair beneath a stone arch, with the Hooga line “Made for Relaxed, Vibrant Living.”",
    },
  },
  "print-brand-collateral": {
    "mockup EDSA WALL MURAL.png": {
      title: "Make Space for Living Well",
      project: "Hooga",
      type: "Wall Mural",
      alt: "A Hooga wall mural of a woman relaxing on a leather sofa in a desert canyon, shown flat and installed above a showroom.",
    },
    "1.2.png": {
      title: "Wake Up Refreshed, Every Day",
      project: "Dunlopillo",
      type: "Billboard",
      alt: "A highway billboard of a woman stretching on her bed, with the Dunlopillo line “Wake up refreshed, every day,” shown in place and flat.",
    },
    "34.2.png": {
      project: "Etro Home Interiors",
      type: "Print Ad & Truck Wrap",
      alt: "An Etro Home Interiors advertisement of a lounge set before a pool view, repeated as a wrap on a delivery truck.",
    },
    "23.2.png": {
      title: "Welcome Lunch",
      project: "Endo × Metal-Lite",
      type: "Event Invitation",
      year: "2026",
      alt: "A welcome-lunch invitation card for an Endo and Metal-Lite private event dated April 13, 2026, shown flat and framed.",
    },
    "15.2.png": {
      title: "A Gift of Moments",
      project: "Dunlopillo × Hooga",
      type: "Gift Voucher",
      alt: "A PHP 5,000 Dunlopillo and Hooga gift voucher shown front and back with its terms and conditions.",
    },
    "28.2.png": {
      title: "Royal Comfort",
      project: "Dunlopillo",
      type: "Tri-Fold Brochure",
      alt: "A navy Dunlopillo Royal Comfort tri-fold brochure shown open and folded, with mattress details and bedroom scenes.",
    },
    "22.2.png": {
      project: "Porta Mobili",
      type: "Branded Tote",
      alt: "A black tote bag printed with the vertical Porta Mobili wordmark and monogram.",
    },
    "11.2.png": {
      title: "Her Moment",
      project: "Hooga",
      type: "Event Poster",
      alt: "A Hooga “Her Moment” Women's Month poster of a woman seated on a leather sofa, shown flat and on an easel in a mall.",
    },
    "31.2.png": {
      title: "Royal Comfort",
      project: "Dunlopillo",
      type: "Mall Lightbox",
      alt: "A Dunlopillo Royal Comfort poster of a polar bear asleep on a mattress in snow, shown flat and in a mall lightbox.",
    },
    "Porta Mobili Complimentary Drinks Menu.png": {
      title: "Complimentary Drinks",
      project: "Porta Mobili",
      type: "Table Menu",
      alt: "A tall grey Porta Mobili complimentary drinks menu card, shown flat and standing on a table beside a coffee cup.",
    },
    "Dunlopillo Science of Deeper Sleep Display.png": {
      title: "The Science of Deeper Sleep",
      project: "Dunlopillo",
      type: "Exhibition Booth",
      alt: "A Dunlopillo “The Science of Deeper Sleep” roadshow backdrop with a made-up bed on display in a mall.",
    },
    "uptown mall 2.png": {
      title: "A New Sense of Comfort",
      project: "Hooga",
      type: "Mall Standee",
      alt: "A Hooga “A new sense of comfort is now in Hooga” standee for its Uptown showroom, shown flat and in a mall corridor.",
    },
    "13.2.png": {
      title: "MINI50",
      project: "Metal-Lite × Endo",
      type: "Product Flyer",
      alt: "A Metal-Lite and Endo product flyer for the MINI50 light, shown flat and as a printed sheet.",
    },
    "mockup UPTOWN ART EVENT GREETING CARD.png": {
      title: "Thank You",
      project: "Hooga × Galerie Joaquin",
      type: "Event Greeting Card",
      alt: "A cream thank-you card for a Hooga and Galerie Joaquin art event, shown flat and folded on a table.",
    },
    "9.2.png": {
      title: "Timeless Design. Everyday Living.",
      project: "Hooga",
      type: "Showroom Poster",
      alt: "A Hooga “Timeless Design. Everyday Living.” poster of a living room set, shown flat and on an easel in a showroom.",
    },
    "24.2.png": {
      title: "Your World of Deep Sleep Starts Here",
      project: "Dunlopillo",
      type: "Poster",
      alt: "A dark Dunlopillo poster of a mattress in a misty forest, “Your world of deep sleep starts here,” shown flat and on a wall.",
    },
  },
  "commercial-lifestyle-photography": {
    "BW 2025 - 02.jpg": {
      project: "BW",
      type: "Lifestyle Photography",
      year: "2025",
      alt: "A model in white seated on a curved bouclé sofa beside a polished round side table.",
    },
    "_DSF2269-HDR.webp のコピー.jpg": {
      type: "Interior Photography",
      alt: "A wide living room with lounge chairs, a grand piano, and a cove-lit ceiling.",
    },
    "2.5.png": {
      type: "Product Photography",
      alt: "A deep-green bouclé lounge chair on a dark wooden base, lit warmly.",
    },
    "DSCF7388-HDR.jpg": {
      type: "Architectural Photography",
      alt: "A modern timber-and-glass residence glowing at dusk across a lawn.",
    },
    "8.3.png": {
      type: "Detail Photography",
      alt: "A close-up of a round marble-top cabinet with an open curved drawer.",
    },
    "ENEA-VELVET-NUBOLA-TECHWALL-2025.jpg": {
      type: "Interior Photography",
      year: "2025",
      alt: "A bright dining room with a marble table, upholstered chairs, pendant lights, and a wall shelving system.",
    },
    "9.png": {
      type: "Product Photography",
      alt: "A rattan hooded lounge chair beside a small side table under two wooden pendant lamps.",
    },
    "_DSF2375.webp のコピー.jpg": {
      type: "Interior Photography",
      alt: "A round dining table with white orchids at its centre in a softly lit dining room.",
    },
    "3.png": {
      type: "Product Photography",
      alt: "A rust leather sofa with a slim side table on a textured rug.",
    },
    "_DSF2401.webp のコピー.jpg": {
      type: "Interior Photography",
      alt: "A marimba below a large portrait artwork in a dark, wood-panelled room.",
    },
    "DSCF7424.jpg": {
      type: "Interior Photography",
      alt: "A kitchen with a stone-topped island, counter stools, and timber cabinetry.",
    },
    "7.7.png": {
      type: "Product Photography",
      alt: "A tan leather swivel chair on a dark base in a bright room.",
    },
    "_DSF2331-HDR.webp のコピー.jpg": {
      type: "Interior Photography",
      alt: "A round foyer table with a tall floral arrangement before a living room.",
    },
    "Etro 14.jpg": {
      project: "Etro",
      type: "Lifestyle Photography",
      alt: "Two red floral armchairs and a gold side table on a green marble floor before a wood-panelled wall.",
    },
    "4.5.png": {
      type: "Detail Photography",
      alt: "A close-up of a cream upholstered seat on a curved walnut base.",
    },
    "_DSF2317-HDR.webp のコピー.jpg": {
      type: "Interior Photography",
      alt: "A cove-lit living room seen through open glass doors.",
    },
  },
  "short-form-video-reels": {},
};
