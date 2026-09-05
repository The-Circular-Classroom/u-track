// @ts-nocheck
/**
 * categoryOrder.js
 *
 * Frontend mirror of the backend category ordering/grouping logic (formatters.js).
 * Keeps the UI display order in sync with the server without duplicating magic numbers.
 *
 * Canonical order:
 *  1. Uniform Shirt
 *  2. Uniform Skirt / Skort / Pinafore  (grouped into one card)
 *  3. Uniform Shorts
 *  4. Uniform Pants
 *  5. Polo Shirt
 *  6. House Shirt
 *  7. PE Shirt
 *  8. PE Shorts
 *  9. Gym Shorts
 * 10. Belt
 * 11. Tie
 * 12. Cap
 * 13. Others (anything containing the word "other", or unknown types)
 */

export const CATEGORY_ORDER = [
  'uniform_shirt',
  'uniform_skirt_group', // uniform skirt + skort + pinafore
  'uniform_shorts',
  'uniform_pants',
  'polo_shirt',
  'house_shirt',
  'pe_shirt',
  'pe_shorts',
  'tie',
  'belt',
  'cap',
  'others',
];

export const CATEGORY_ROWS = [
  ['uniform_shirt', 'uniform_skirt_group', 'uniform_shorts', 'uniform_pants'],
  ['polo_shirt', 'house_shirt', 'pe_shirt', 'pe_shorts'],
  ['tie', 'belt', 'cap'],
  ['others'],
];

export const CATEGORY_DISPLAY_LABELS = {
  uniform_shirt:       'Uniform Shirt',
  uniform_skirt_group: 'Uniform Skirt / Skort / Pinafore',
  uniform_shorts:      'Uniform Shorts',
  uniform_pants:       'Uniform Pants',
  polo_shirt:          'Polo Shirt',
  house_shirt:         'House Shirt',
  pe_shirt:            'PE Shirt',
  pe_shorts:           'PE Shorts',
  tie:                 'Tie',
  belt:                'Belt',
  cap:                 'Cap',
  others:              'Others',
};

/**
 * Maps a raw categoryName (from the API) to its canonical group key.
 * Matching is case-insensitive. Anything containing "other" → "others".
 *
 * @param {string} categoryName
 * @returns {string} group key
 */
export function groupCategoryName(categoryName) {
  if (!categoryName) return 'others';
  const name = categoryName.trim().toLowerCase();

  if (name === 'uniform_shirt'  || name === 'uniform shirt')  return 'uniform_shirt';
  if (
    name === 'uniform_skirt' || name === 'uniform skirt' ||
    name === 'skort' ||
    name === 'pinafore'
  ) return 'uniform_skirt_group';
  if (name === 'uniform_shorts' || name === 'uniform shorts') return 'uniform_shorts';
  if (name === 'uniform_pants'  || name === 'uniform pants')  return 'uniform_pants';
  if (name === 'polo_shirt'     || name === 'polo shirt')     return 'polo_shirt';
  if (name === 'house_shirt'    || name === 'house shirt')    return 'house_shirt';
  if (name === 'pe_shirt'       || name === 'pe shirt')       return 'pe_shirt';
  if (name === 'pe_shorts'      || name === 'pe shorts')      return 'pe_shorts';
  if (name === 'gym_shorts'     || name === 'gym shorts')     return 'others';
  if (name === 'tie')   return 'tie';
  if (name === 'belt')  return 'belt';
  if (name === 'cap')   return 'cap';

  // Catch-all: anything containing the word "other"
  if (name.includes('other')) return 'others';

  // Unknown categories fall to "others"
  return 'others';
}

/**
 * Returns the sort index (position) for a raw categoryName.
 * Lower index = shown first. Unknown → sorted last.
 *
 * @param {string} categoryName
 * @returns {number}
 */
export function getCategoryOrder(categoryName) {
  // Accept a group key directly (e.g. 'uniform_skirt_group') as well as raw names
  if (CATEGORY_ORDER.includes(categoryName)) {
    return CATEGORY_ORDER.indexOf(categoryName);
  }
  const groupKey = groupCategoryName(categoryName);
  const idx = CATEGORY_ORDER.indexOf(groupKey);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

/**
 * Secondary sort index within a group — used to order items that share the
 * same getCategoryOrder value (e.g. uniform skirt / skort / pinafore).
 *
 * Uniform Skirt → 0, Skort → 1, Pinafore → 2, everything else → 0.
 *
 * @param {string} categoryName
 * @returns {number}
 */
const SUB_ORDER_MAP = {
  'uniform skirt': 0,
  'uniform_skirt':  0,
  'skort':          1,
  'pinafore':       2,
};

export function getSubCategoryOrder(categoryName) {
  if (!categoryName) return 0;
  const name = categoryName.trim().toLowerCase();
  return SUB_ORDER_MAP[name] ?? 0;
}

/**
 * Comparator for Array.prototype.sort — sorts by canonical category order.
 *
 * Usage:
 *   cards.sort(byCategoryOrder(c => c.category?.categoryName))
 *
 * @param {(item: T) => string} getName  - accessor to get the categoryName from an item
 * @returns {(a: T, b: T) => number}
 */
export function byCategoryOrder(getName) {
  return (a, b) => getCategoryOrder(getName(a)) - getCategoryOrder(getName(b));
}
