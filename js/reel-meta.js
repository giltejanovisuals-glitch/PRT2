/*
 * Hand-authored metadata for videos in assets/videos/short-form-reels/,
 * keyed by filename exactly as it appears in that folder, read by the
 * split-screen showcase in video mode (js/print-collateral-showcase.js). On
 * phones each library tile shows `title` and the duration, and the
 * fullscreen viewer (js/reel-viewer.js) shows "brand — title". All fields
 * are optional: nothing derived from the filename is ever shown (no `title`
 * means no title), `type` falls back to "Reel", and `duration` (seconds,
 * or "m:ss") is read from the video file when omitted. `captions` is a
 * WebVTT file in the same folder — add one for any reel with speech.
 *
 * Accuracy rules for this file:
 * - `brand` only when the brand's logo or name is visible in the reel, or
 *   Gil's own filename names it (HOOGA, MOONI, PORTA, Dunlopillo/DP).
 * - `title` only from on-screen text or a product name shown in the reel.
 * - `year` only when the work itself states it (none currently do).
 * - `alt` describes what is actually on screen.
 * Display order and hidden reels: scripts/gallery-priority.js.
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
window.REEL_META = {
  "MOONI FW20202.3.mp4": {
    title: "GRWM to Sleep",
    brand: "Mooni",
    type: "Lifestyle Reel",
    alt: "A woman in green loungewear gets ready for bed beside a Mooni mattress in a softly lit bedroom.",
  },
  "0202 (4).mp4": {
    title: "Wanda Pendant Lights",
    brand: "Metal-Lite",
    type: "Product Reel",
    alt: "Clusters of glowing cube-shaped pendant lights hang above a dark showroom.",
  },
  "HOOGA JR1.mp4": {
    title: "Damari Dining Table & Daxon Dining Chair",
    brand: "Hooga",
    type: "Product Reel",
    alt: "A round dining table with cream upholstered chairs set in a warmly lit Hooga room.",
  },
  "1120JUNE-REELS_Dunlopillo-Dr.Flex.mp4": {
    title: "Dr. Flex",
    brand: "Dunlopillo",
    type: "Showroom Reel",
    alt: "A view through an arched doorway into a Dunlopillo bedroom display with a made-up bed.",
  },
  "MOONI REEL.mp4": {
    title: "A Day with Mooni",
    brand: "Mooni",
    type: "Lifestyle Reel",
    alt: "A woman walks toward the SMX Convention Center under the on-screen title “A day with Mooni.”",
  },
  "0904 4 THOMAS.mp4": {
    title: "Thomas Sofa",
    brand: "Hooga",
    type: "Product Reel",
    alt: "A collage of a grey sofa with chevron-patterned cushions and close-ups of its upholstery.",
  },
  "FRW2.mp4": {
    brand: "Dunlopillo",
    type: "Product Reel",
    alt: "A woman sits on a Dunlopillo mattress in a store under the caption “Ever feel stuck when you sit down?”",
  },
  "MYW16.mp4": {
    title: "Morning",
    type: "Product Reel",
    alt: "A living room lit for a “Morning” scene, with a hand selecting lighting settings on a tablet.",
  },
  "PORTA.mp4": {
    brand: "Porta Mobili",
    type: "Showroom Reel",
    alt: "A cream sofa layered with textured cushions in a softly lit Porta Mobili living room.",
  },
  "h08129.mp4": {
    title: "Tate",
    brand: "Hooga",
    type: "Product Reel",
    alt: "A dark upholstered Tate armchair against a pale grey backdrop beneath the Hooga name.",
  },
  "260429 9.mp4": {
    title: "Meet Alloy",
    type: "Product Reel",
    alt: "A mattress on an upholstered bed frame with the on-screen line “Meet Alloy: Where Comfort Meets Precision.”",
  },
  "HOOGA JR3.mp4": {
    title: "We Live Design",
    brand: "Hooga",
    type: "Event Reel",
    alt: "An event space with rows of black chairs and a “We Live Design” backdrop, branded Hooga and SoFA Design Institute.",
  },
  "MOONI JULY 1.mp4": {
    title: "Still Can't Sleep?",
    brand: "Mooni",
    type: "Lifestyle Reel",
    alt: "Hands hold a Mooni poster reading “Still can't sleep? This is your sign to replace your mattress.”",
  },
  "0624(1).mp4": {
    brand: "BW",
    type: "Showroom Reel",
    alt: "A pale sofa, dried-grass arrangement, and glass coffee table in a dark showroom, with the BW logo on the sofa.",
  },
  "WALL_MINI_JARDIM_LOOP.mp4": {
    title: "Wall Mini Jardim",
    type: "Product Reel",
    alt: "Outdoor wall lights cast soft beams down a dark facade beside a lit window at night.",
  },
  "02 HOOGA DEC.mp4": {
    brand: "Hooga",
    type: "Styling Reel",
    alt: "A woman arranges fruit and greenery on a round black dining table in front of a Hooga sign.",
  },
  "reel2.2.mp4": {
    type: "Process Reel",
    alt: "A hand sketches a chair design in pencil on paper beside material samples.",
  },
  "HOOGA JR2.mp4": {
    title: "Luxurious",
    brand: "Hooga",
    type: "Product Reel",
    alt: "A cream bouclé armchair with a green cushion, captioned “Your home should feel as luxurious as your dreams.”",
  },
  "JUNE-REELS_Dunlopillo-FirmRest.mp4": {
    title: "Firm Rest",
    brand: "Dunlopillo",
    type: "Product Reel",
    alt: "A close view of a Dunlopillo Firm Rest mattress and pillow on a bed.",
  },
  "MOONI JR1.mp4": {
    brand: "Mooni",
    type: "Lifestyle Reel",
    alt: "A woman carrying a shopping bag walks through a mall under the caption “POV: You finally…”",
  },
  "0727(1).mp4": {
    type: "Brand Reel",
    alt: "A warm, blurred abstract frame with the line “Beautiful homes don't just begin with furniture.”",
  },
  "MAY3.mp4": {
    brand: "Mooni",
    type: "Product Reel",
    alt: "A contoured Mooni pillow resting on a mattress.",
  },
  "HOOGA JUL 1.mp4": {
    brand: "Hooga",
    type: "Showroom Reel",
    alt: "A marble-top dining table and chairs under a brass pendant lamp in a Hooga showroom.",
  },
  "0904 6.mp4": {
    title: "Walden Recliner",
    type: "Product Reel",
    alt: "A collage of a tan leather Walden recliner from several angles.",
  },
  "3.mp4": {
    brand: "Hooga",
    type: "Product Reel",
    alt: "A wooden dining table and chair with a woven seat, shown close up beneath the Hooga name.",
  },
  "6.mp4": {
    type: "Product Reel",
    alt: "A close-up of a cream leather dining chair over a marble-look floor.",
  },
  "9.mp4": {
    title: "Radia — The RQ Collection",
    type: "Showroom Reel",
    alt: "A grey sofa and a marble coffee table in a bright showroom, titled “Radia, The RQ Collection.”",
  },
  "0202.mp4": {
    type: "Showroom Reel",
    alt: "A beige modular sofa and a marble coffee table in a showroom with arched mirrors.",
  },
  "0623 (1).mp4": {
    type: "Showroom Reel",
    alt: "A woman smiles while presenting a furniture showroom.",
  },
  "0904  2.mp4": {
    title: "Torino Sofa",
    type: "Product Reel",
    alt: "A collage of a tan Torino sectional sofa in a showroom and close-ups of its cushions.",
  },
  "0904 4.mp4": {
    title: "Taylor Sofa",
    type: "Product Reel",
    alt: "A collage of a curved cream Taylor sofa shown from several angles in a showroom.",
  },
  "0904 8.mp4": {
    title: "Zion Sofa",
    type: "Product Reel",
    alt: "A collage of a textured cream Zion sofa and a round coffee table in a showroom.",
  },
  "0904 9.mp4": {
    type: "Showroom Reel",
    alt: "A woman in a white shirt speaks to camera in a bright showroom.",
  },
  "2601_2 HOOGA REELS.mp4": {
    brand: "Hooga",
    type: "Styling Reel",
    alt: "A split-screen of a man styling a black console with a desk lamp and branches.",
  },
  "2601_3 HOOGA REELS.mp4": {
    brand: "Hooga",
    type: "Product Reel",
    alt: "A textured dining chair beside a grey marble tabletop, seen close up.",
  },
  "260116_Dunlo_FebContentWeek1.2.mp4": {
    brand: "Dunlopillo",
    type: "Lifestyle Reel",
    alt: "Hands smooth crisp white bedding on a bed.",
  },
  "260116_Hooga_Week1Content1.mp4": {
    brand: "Hooga",
    type: "Lifestyle Reel",
    alt: "A person in a white shirt walks past a cream sofa, framed closely from the waist down.",
  },
  "260116_MIM_FebContentWeek1.1.mp4": {
    type: "Showroom Reel",
    alt: "A dim living room with a lit media wall and a low sofa.",
  },
  "260429 3.mp4": {
    type: "Product Reel",
    alt: "A close-up of a mattress's wave-quilted surface.",
  },
  "260429 6.mp4": {
    title: "Alloy Mattress",
    type: "Product Reel",
    alt: "An Alloy mattress on a green upholstered bed with a Union Jack cushion.",
  },
  "DP JR1.mp4": {
    brand: "Dunlopillo",
    type: "Showroom Reel",
    alt: "The blue Dunlopillo sign on a glass wall at the entrance of a showroom.",
  },
  "DP JR2.mp4": {
    title: "Firm Rest",
    brand: "Dunlopillo",
    type: "Product Reel",
    alt: "A Dunlopillo Firm Rest mattress with a branded pillow and tufted headboard.",
  },
  "h08122.mp4": {
    title: "Modern",
    type: "Product Reel",
    alt: "A rounded blue armchair and a small upholstered ottoman on a pale background titled “modern.”",
  },
  "HOOGA JULY 2.mp4": {
    brand: "Hooga",
    type: "Showroom Reel",
    alt: "A cream sectional sofa and a marble coffee table in a Hooga showroom with a wooden slat ceiling.",
  },
  "HOOGA JULY 3.mp4": {
    brand: "Hooga",
    type: "Product Reel",
    alt: "A textured grey sofa photographed low and close on a glossy showroom floor.",
  },
  "hooga july 4.mp4": {
    brand: "Hooga",
    type: "Showroom Reel",
    alt: "Tan leather lounge chairs around a slatted wooden coffee table.",
  },
  "m0904 1.mp4": {
    type: "Lifestyle Reel",
    alt: "The glass facade of the SMX Convention Center seen from across the street.",
  },
  "m08121.mp4": {
    title: "How Is Your Mattress?",
    type: "Lifestyle Reel",
    alt: "A firmness gauge titled “How is your mattress?” above a woman sleeping on a white pillow.",
  },
  "MAY6.mp4": {
    type: "Product Reel",
    alt: "A close-up of a mattress cover's embroidered quilting.",
  },
  "MAY9.mp4": {
    type: "Product Reel",
    alt: "A close-up of a tan upholstered surface.",
  },
  "MIM JR1.mp4": {
    type: "Product Reel",
    alt: "Glowing cube pendant lights hang over a dark showroom lounge.",
  },
  "MOONI.mp4": {
    brand: "Mooni",
    type: "Lifestyle Reel",
    alt: "A woman in a green knit set walks through a mall under the caption “POV: You finally…”",
  },
  "MYW13.mp4": {
    type: "Showroom Reel",
    alt: "A glass chandelier glows above a dining table in a dark showroom.",
  },
  "portajul0624(1).mp4": {
    brand: "Porta Mobili",
    type: "Product Reel",
    alt: "A close-up of a green bouclé armchair's curved back.",
  },
};
