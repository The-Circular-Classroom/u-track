// @ts-nocheck
import { useState } from 'react';
import Image from 'next/image';

/**
 * Card used on the Uniform Overview page.
 *
 * Supports two modes driven by the `itemType` (really a group entry) shape:
 *
 *  - Single category  (isMulti = false):
 *      shows one image + one label below, e.g. "Uniform Shirt"
 *
 *  - Multi sub-category (isMulti = true):
 *      shows a split image area with one image per sub-category (or placeholder),
 *      and lists each sub-category name stacked below, e.g.:
 *        Uniform Skirt
 *        Skort
 *        Pinafore
 *
 * The card is NOT clickable (onClick is intentionally commented out).
 */
// ── Shared placeholder SVG ────────────────────────────────────────────────
function Placeholder() {
  return (
    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

export default function UniformOverviewCard({ itemType, onClick }) {
  const isMulti = itemType?.isMulti ?? false;
  const subCategories = itemType?.subCategories ?? [];
  const [imageError, setImageError] = useState(false);

  // ── Single-category helpers ───────────────────────────────────────────────
  const singleLabel = itemType?.displayLabel || itemType?.category?.categoryName || 'Unknown';
  const singleImageUrl = itemType?.imageUrl || null;

  // ── MULTI sub-category card ───────────────────────────────────────────────
  if (isMulti) {

    // Use the first available imageUrl across all sub-categories, or fall back to placeholder
    const multiImageUrl = subCategories.find((s) => s.imageUrl)?.imageUrl || null;

    return (
      <div
        onClick={onClick}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer"
      >
        {/* Single image (first available or placeholder) */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          {multiImageUrl && !imageError ? (
            <Image
              src={multiImageUrl}
              alt={itemType?.displayLabel || ''}
              fill
              unoptimized
              className="object-contain p-6 bg-white"
              onError={() => setImageError(true)}
            />
          ) : (
            <Placeholder />
          )}
        </div>

        {/* Label block — each sub-category on its own line */}
        <div className="px-2.5 py-2 border-t border-gray-100 flex flex-col gap-0.5 text-center">
          {subCategories.map((sub, i) => (
            <span
              key={sub.rawName || i}
              className={`text-sm text-gray-900 leading-snug ${i === 0 ? 'font-semibold' : 'font-normal text-gray-600'}`}
            >
              {toDisplayName(sub.rawName)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── SINGLE category card ──────────────────────────────────────────────────
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Item Image */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        {singleImageUrl && !imageError ? (
          <Image
            src={singleImageUrl}
            alt={singleLabel}
            fill
            unoptimized
            className="object-contain p-6 bg-white"
            onError={() => setImageError(true)}
          />
        ) : (
          <Placeholder />
        )}
      </div>

      {/* Label */}
      <div className="px-2.5 py-2 border-t border-gray-100 flex flex-col gap-1.5 text-center">
        <h3 className="font-semibold text-sm text-gray-900 truncate" title={singleLabel}>
          {singleLabel}
        </h3>
      </div>
    </div>
  );
}

/**
 * Convert a raw DB categoryName into a human-readable label for display
 * inside a merged card (e.g. "uniform_skirt" → "Uniform Skirt").
 */
function toDisplayName(rawName) {
  if (!rawName) return '';
  return rawName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
