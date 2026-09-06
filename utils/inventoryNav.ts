// @ts-nocheck
/** All known category slugs — used in generateStaticParams. */
export const CATEGORY_SLUGS = [
  "uniform-shirt",
  "uniform-skirt",
  "skort",
  "pinafore",
  "uniform-shorts",
  "uniform-pants",
  "polo-shirt",
  "house-shirt",
  "pe-shirt",
  "pe-shorts",
  "gym-shorts",
  "belt",
  "tie",
  "cap",
  "others",
];

/**
 * Common school-uniform colour slugs — used in generateStaticParams.
 * Add new slugs here if new colours appear in the database.
 */
export const COLOR_SLUGS = [
  "white",
  "off-white",
  "cream",
  "ivory",
  "black",
  "navy",
  "navy-blue",
  "dark-navy",
  "red",
  "dark-red",
  "maroon",
  "blue",
  "light-blue",
  "sky-blue",
  "royal-blue",
  "dark-blue",
  "green",
  "light-green",
  "dark-green",
  "forest-green",
  "grey",
  "gray",
  "light-grey",
  "dark-grey",
  "charcoal",
  "yellow",
  "gold",
  "orange",
  "purple",
  "pink",
  "brown",
  "khaki",
  "beige",
  "tan",
  "olive",
  "teal",
];

/** 'Uniform Shirt' → 'uniform-shirt' */
export function toSlug(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/** 'uniform-shirt' → 'Uniform Shirt' */
export function slugToLabel(slug) {
  return (slug || "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** 'Sky Blue' → 'sky-blue' */
export function toColorSlug(name) {
  return toSlug(name);
}

/** 'sky-blue' → 'Sky Blue' */
export function colorSlugToLabel(slug) {
  return slugToLabel(slug);
}

/** Group balance rows by primary colour → array of { colorName, colorHex, totalQuantity, items } */
export function buildColorGroups(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const colorName = row?.itemType?.primaryColour?.colourName;
    if (!colorName) return;
    if (!map.has(colorName)) {
      map.set(colorName, {
        colorName,
        colorHex:
          row?.itemType?.primaryColour?.hexcode ||
          row?.itemType?.primaryColour?.hexCode ||
          row?.itemType?.primaryColour?.colourHex ||
          row?.itemType?.primaryColour?.hex ||
          null,
        totalQuantity: 0,
        items: [],
      });
    }
    const entry = map.get(colorName);
    entry.totalQuantity += row.quantity || 0;
    entry.items.push(row);
  });
  return Array.from(map.values());
}

/**
 * Resolve the selected school.
 * Admin: reads from sessionStorage (set by /inventory/items on school-card click).
 * Non-admin: fetches from /api/school/psg.
 */
export async function resolveSchool(apiUrl, isAdmin) {
  if (!isAdmin) {
    let userSchoolId = null;
    try {
      const profile = sessionStorage.getItem("userProfile");
      if (profile) {
        const parsed = JSON.parse(profile);
        userSchoolId = parsed?.school?.id || null;
      }
    } catch (_) {}

    try {
      const stored = sessionStorage.getItem("_invSelectedSchool");
      if (stored) {
        const parsedStored = JSON.parse(stored);
        if (!userSchoolId || String(parsedStored.id) === String(userSchoolId)) {
          return parsedStored;
        }
      }
    } catch (_) {}

    const res = await fetch("/api/school/psg");
    if (!res.ok) throw new Error("Failed to fetch school");
    const result = await res.json();
    const schoolData = result.data || result;
    try {
      sessionStorage.setItem("_invSelectedSchool", JSON.stringify(schoolData));
    } catch (_) {}
    return schoolData;
  }

  try {
    const stored = sessionStorage.getItem("_invSelectedSchool");
    if (stored) return JSON.parse(stored);
  } catch (_) { }

  throw new Error("No school selected. Please go back to Schools and select a school.");
}
