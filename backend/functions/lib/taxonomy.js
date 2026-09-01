"use strict";
/**
 * Shared category/subcategory taxonomy. Runtime data (not types) — kept out of
 * types.ts, which is documented as type-definitions-only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HAIR_TYPES = exports.SUBCATEGORIES = exports.SERVICE_CATEGORIES = void 0;
exports.isValidCategory = isValidCategory;
exports.isValidSubcategory = isValidSubcategory;
exports.allSubcategories = allSubcategories;
exports.isValidHairType = isValidHairType;
exports.SERVICE_CATEGORIES = [
    'Hair',
    'Nails',
    'Makeup',
    'Barber',
    'Esthetics',
    'Styling',
    'Bridal',
    'Waxing',
];
exports.SUBCATEGORIES = {
    Hair: ['Cut & Trim', 'Color & Highlights', 'Braids', 'Extensions', 'Blowout', 'Relaxer', 'Locs'],
    Nails: ['Manicure', 'Pedicure', 'Acrylics', 'Gel', 'Nail Art', 'Dip Powder'],
    Makeup: ['Everyday', 'Glam', 'Special FX', 'Editorial'],
    Barber: ['Fade', 'Beard Trim', 'Line Up', "Kids' Cut", 'Hot Towel Shave'],
    Esthetics: ['Facial', 'Chemical Peel', 'Microdermabrasion', 'Lash Lift', 'Brow Lamination'],
    Styling: ['Updo', 'Blow Dry', 'Silk Press', 'Curls & Waves'],
    Bridal: ['Hair Trial', 'Makeup Trial', 'Day-Of Styling'],
    Waxing: ['Eyebrows', 'Full Face', 'Legs', 'Bikini', 'Full Body'],
};
function isValidCategory(value) {
    return exports.SERVICE_CATEGORIES.includes(value);
}
function isValidSubcategory(category, subcategory) {
    if (!isValidCategory(category))
        return false;
    return exports.SUBCATEGORIES[category].includes(subcategory);
}
function allSubcategories() {
    return Object.values(exports.SUBCATEGORIES).flat();
}
/**
 * Hair-texture/type taxonomy — a separate dimension from service categories, applied to
 * provider specializations, client interests, and portfolio post tags for precise matching.
 */
exports.HAIR_TYPES = [
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
];
function isValidHairType(value) {
    return exports.HAIR_TYPES.includes(value);
}
//# sourceMappingURL=taxonomy.js.map