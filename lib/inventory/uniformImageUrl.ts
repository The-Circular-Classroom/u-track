/**
 * Utility for resolving uniform graphic image URLs from Supabase Storage.
 *
 * The static assets bucket (`static-assets`) stores uniform images under:
 *   uniform-graphics/general/{category_folder}/{Category_Prefix}_-_{colour_slug}.png
 *
 * This module maps the DB category name and colour name to the correct storage path.
 * Falls back to `null` when no matching asset exists.
 */

/**
 * Maps a DB category name to the storage folder name and file-prefix used
 * inside `uniform-graphics/general/`.
 *
 * folder  – the subfolder inside /general/
 * prefix  – the title-case prefix before "_-_" in the filename
 *            e.g. "PE_Shirt" produces "PE_Shirt_-_{colour}.png"
 */
const CATEGORY_TO_STORAGE: Record<string, { folder: string; prefix: string } | null> = {
  'PE Shirt':       { folder: 'pe_shirt',       prefix: 'PE_Shirt' },
  'PE Shorts':      { folder: 'pe_shorts',       prefix: 'PE_Shorts' },
  'Gym Shorts':     { folder: 'pe_shorts',       prefix: 'PE_Shorts' }, // closest match
  'Pinafore':       { folder: 'pinafore',        prefix: 'Pinafore' },
  'Polo Shirt':     { folder: 'polo_shirt',      prefix: 'Polo_Shirt' },
  'Uniform Shirt':  { folder: 'uniform_shirt',   prefix: 'Uniform_Shirt' },
  'Uniform Shorts': { folder: 'uniform_shorts',  prefix: 'Uniform_Shorts' },
  'Uniform Pants':  { folder: 'uniform_pants',   prefix: 'Uniform_Pants' },
  'Uniform Skirt':  { folder: 'uniform_skirt',   prefix: 'Skirt' },
  'Skort':          { folder: 'uniform_skirt',   prefix: 'Skirt' }, // no dedicated skort folder
  'House Shirt':    { folder: 'uniform_shirt',   prefix: 'Uniform_Shirt' }, // best match
  // These have no graphic assets in storage:
  'Belt':           null,
  'Cap':            null,
  'Tie':            null,
  'Other Shirts':   null,
  'Others':         null,
}

/**
 * Maps a DB colour name to the colour slug used in storage filenames.
 * Storage filenames use lowercase with underscores for spaces.
 */
const COLOUR_TO_STORAGE: Record<string, string | null> = {
  'Beige':       'beige',
  'Black':       'black',
  'Blue':        'dark_blue',
  'Brown':       'brown',
  'Dark Green':  'dark_green',
  'Gold':        null,
  'Green':       'light_green',
  'Grey':        'light_grey',
  'Khaki':       'beige',        // closest match
  'Light Blue':  'light_blue',
  'Maroon':      'maroon',
  'Navy Blue':   'dark_blue',
  'Orange':      null,           // not in storage
  'Pink':        null,
  'Purple':      'purple',
  'Red':         'red',
  'Royal Blue':  'medium_blue',
  'Silver':      null,
  'White':       'white',
  'Yellow':      'yellow',
}

const CATEGORY_COLOUR_FALLBACKS: Record<string, Record<string, string>> = {
  'PE Shorts': {
    'Blue': 'medium_blue',
    'Red': 'dark_red',
    'Grey': 'medium_grey',
  },
  'PE Shirt': {
    'Yellow': 'dark_yellow',
  },
  'Polo Shirt': {
    'Red': 'medium_red',
    'Yellow': 'light_yellow',
  },
  'Uniform Pants': {
    'Red': 'dark_red',
    'Grey': 'dark_grey',
  },
  'Uniform Shorts': {
    'Brown': 'dark_brown',
  },
}

const GENERIC_CATEGORY_FALLBACKS: Record<string, string> = {
  'Belt': '/images/Belt.png',
  'Cap': '/images/Cap.png',
  'Tie': '/images/Tie.png',
  'Others': '/images/Others.png',
  'Gym Shorts': '/images/Gym Shorts.png',
  'Uniform Shirt': '/images/Graphic - Shirt.png',
  'Uniform Shorts': '/images/Graphic - Shorts.png',
  'Uniform Skirt': '/images/Graphic - Skirt.png',
}

/**
 * Builds the public Supabase Storage URL for a uniform graphic or preset asset.
 *
 * @param supabaseUrl  - `process.env.NEXT_PUBLIC_SUPABASE_URL`
 * @param categoryName - The category name from the DB (e.g., "PE Shirt")
 * @param colourName   - The primary colour name from the DB (e.g., "Maroon")
 * @param rawImageUrl  - Optional existing image URL or relative path from DB
 * @returns            - Full public URL or `/images/...` fallback or `null`
 */
export function getUniformImageUrl(
  supabaseUrl: string,
  categoryName?: string | null | undefined,
  colourName?: string | null | undefined,
  rawImageUrl?: string | null | undefined
): string | null {
  if (rawImageUrl && typeof rawImageUrl === 'string' && rawImageUrl.trim() !== '') {
    const trimmed = rawImageUrl.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
    const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
    if (cleanPath.startsWith('images/')) {
      return `/${cleanPath}`
    }
    const baseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    if (baseUrl) {
      return `${baseUrl}/storage/v1/object/public/static-assets/${cleanPath}`
    }
    return `/${cleanPath}`
  }

  if (categoryName && GENERIC_CATEGORY_FALLBACKS[categoryName] && (!colourName || ['Belt', 'Cap', 'Tie', 'Others', 'Gym Shorts'].includes(categoryName))) {
    return GENERIC_CATEGORY_FALLBACKS[categoryName]
  }

  if (!supabaseUrl || !categoryName || !colourName) {
    return categoryName && GENERIC_CATEGORY_FALLBACKS[categoryName] ? GENERIC_CATEGORY_FALLBACKS[categoryName] : null
  }

  const categoryEntry = CATEGORY_TO_STORAGE[categoryName]
  if (!categoryEntry) {
    return GENERIC_CATEGORY_FALLBACKS[categoryName] || null
  }

  const colourSlug =
    CATEGORY_COLOUR_FALLBACKS[categoryName]?.[colourName] ||
    COLOUR_TO_STORAGE[colourName]
  if (!colourSlug) {
    return GENERIC_CATEGORY_FALLBACKS[categoryName] || null
  }

  const storagePath = `uniform-graphics/general/${categoryEntry.folder}/${categoryEntry.prefix}_-_${colourSlug}.png`

  return `${supabaseUrl}/storage/v1/object/public/static-assets/${storagePath}`
}

