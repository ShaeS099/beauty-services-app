/**
 * Shared category/subcategory taxonomy. Runtime data (not types) — kept out of
 * types.ts, which is documented as type-definitions-only.
 */

export const SERVICE_CATEGORIES = [
  'Hair',
  'Nails',
  'Makeup',
  'Barber',
  'Esthetics',
  'Styling',
  'Bridal',
  'Waxing',
] as const;

export const SUBCATEGORIES: Record<(typeof SERVICE_CATEGORIES)[number], string[]> = {
  Hair: ['Cut & Trim', 'Color & Highlights', 'Braids', 'Extensions', 'Blowout', 'Relaxer', 'Locs'],
  Nails: ['Manicure', 'Pedicure', 'Acrylics', 'Gel', 'Nail Art', 'Dip Powder'],
  Makeup: ['Everyday', 'Glam', 'Special FX', 'Editorial'],
  Barber: ['Fade', 'Beard Trim', 'Line Up', "Kids' Cut", 'Hot Towel Shave'],
  Esthetics: ['Facial', 'Chemical Peel', 'Microdermabrasion', 'Lash Lift', 'Brow Lamination'],
  Styling: ['Updo', 'Blow Dry', 'Silk Press', 'Curls & Waves'],
  Bridal: ['Hair Trial', 'Makeup Trial', 'Day-Of Styling'],
  Waxing: ['Eyebrows', 'Full Face', 'Legs', 'Bikini', 'Full Body'],
};

export function isValidCategory(value: string): value is (typeof SERVICE_CATEGORIES)[number] {
  return (SERVICE_CATEGORIES as readonly string[]).includes(value);
}

export function isValidSubcategory(category: string, subcategory: string): boolean {
  if (!isValidCategory(category)) return false;
  return SUBCATEGORIES[category].includes(subcategory);
}

export function allSubcategories(): string[] {
  return Object.values(SUBCATEGORIES).flat();
}

/**
 * Hair-texture/type taxonomy — a separate dimension from service categories, applied to
 * provider specializations, client interests, and portfolio post tags for precise matching.
 */
export const HAIR_TYPES = [
  '3A',
  '3B',
  '3C',
  '4A',
  '4B',
  '4C',
  'Locs',
  'Braids',
  'Twists',
  'Wigs & Extensions',
  'Natural',
  'Relaxed',
  'Silk Press',
] as const;

export function isValidHairType(value: string): value is (typeof HAIR_TYPES)[number] {
  return (HAIR_TYPES as readonly string[]).includes(value);
}
