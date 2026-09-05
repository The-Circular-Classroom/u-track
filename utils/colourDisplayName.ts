/**
 * Utility to map colour names based on user role (Admin vs User/School).
 * Admin views (TCC) see nuanced colours (e.g., "Medium Blue", "Dark Red", "Light Grey").
 * School/User views see simplified colours (e.g., "Blue", "Red", "Grey").
 */

const NUANCED_TO_SIMPLE_MAP: Record<string, string> = {
  'Medium Red': 'Red',
  'Light Red': 'Red',
  'Dark Red': 'Red',
  'Medium Blue': 'Blue',
  'Light Blue': 'Blue',
  'Dark Blue': 'Blue',
  'Medium Yellow': 'Yellow',
  'Light Yellow': 'Yellow',
  'Dark Yellow': 'Yellow',
  'Medium Green': 'Green',
  'Light Green': 'Green',
  'Dark Green': 'Green',
  'Medium Grey': 'Grey',
  'Light Grey': 'Grey',
  'Dark Grey': 'Grey',
  'Medium Orange': 'Orange',
  'Light Orange': 'Orange',
  'Dark Orange': 'Orange',
  'Medium Purple': 'Purple',
  'Light Purple': 'Purple',
  'Dark Purple': 'Purple',
  'Turqoise': 'Turquoise',
};

/**
 * Returns the display name for a colour based on the user's role.
 *
 * @param colourName - Raw colour name (e.g. from DB)
 * @param isAdmin - True if the current user has Admin role
 * @returns Formatted display name
 */
export function getColourDisplayName(
  colourName: string | null | undefined,
  isAdmin: boolean = false
): string {
  if (!colourName) return '';
  if (isAdmin) return colourName;

  const trimmed = colourName.trim();
  if (NUANCED_TO_SIMPLE_MAP[trimmed]) {
    return NUANCED_TO_SIMPLE_MAP[trimmed];
  }

  // Fallback: strip leading "Medium ", "Light ", "Dark "
  return trimmed.replace(/^(Medium|Light|Dark)\s+/i, '');
}
