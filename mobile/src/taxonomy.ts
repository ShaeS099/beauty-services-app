import { ServiceCategory } from "./types";

/** Mirror of backend/functions/src/taxonomy.ts */
export const SUBCATEGORIES: Record<ServiceCategory, string[]> = {
  Hair: ["Cut & Trim", "Color & Highlights", "Braids", "Extensions", "Blowout", "Relaxer", "Locs"],
  Nails: ["Manicure", "Pedicure", "Acrylics", "Gel", "Nail Art", "Dip Powder"],
  Makeup: ["Everyday", "Glam", "Special FX", "Editorial"],
  Barber: ["Fade", "Beard Trim", "Line Up", "Kids' Cut", "Hot Towel Shave"],
  Esthetics: ["Facial", "Chemical Peel", "Microdermabrasion", "Lash Lift", "Brow Lamination"],
  Styling: ["Updo", "Blow Dry", "Silk Press", "Curls & Waves"],
  Bridal: ["Hair Trial", "Makeup Trial", "Day-Of Styling"],
  Waxing: ["Eyebrows", "Full Face", "Legs", "Bikini", "Full Body"],
};

/**
 * Hair-texture/type taxonomy — a separate dimension from service categories, applied to
 * provider specializations, client interests, and portfolio post tags for precise matching.
 * Mirror of backend/functions/src/taxonomy.ts
 */
export const HAIR_TYPES = [
  "3A",
  "3B",
  "3C",
  "4A",
  "4B",
  "4C",
  "Locs",
  "Braids",
  "Twists",
  "Wigs & Extensions",
  "Natural",
  "Relaxed",
  "Silk Press",
] as const;
