// @ts-nocheck
import { useState } from 'react';
import Image from 'next/image';

export default function ItemTypeCard({ itemType, isAdmin, onClick }) {
  const [imageError, setImageError] = useState(false);
  const totalQuantity = itemType?.totalQuantity || 0;
  const categoryName = itemType?.category?.categoryName || 'Unknown Category';
  const displayTotal = isAdmin
    ? (itemType?.schoolStock || 0) + (itemType?.psgActivities || 0) + (itemType?.forRepurposing || 0)
    : (itemType?.schoolStock || 0) + (itemType?.psgActivities || 0);

  /**
   * After page.js change, itemType should contain:
   * - itemType.colorOptions: [{ colorName, colorHex? }, ...]
   * - itemType.colorCount: number
   *
   * Fallback: derive from items if colorOptions isn't present.
   */
  const derivedColorsFromItems = itemType?.items
    ? Array.from(
      new Map(
        itemType.items
          .map((row) => {
            const colorName = row?.itemType?.primaryColour?.colourName;
            const colorHex =
              row?.itemType?.primaryColour?.hexcode ||
              row?.itemType?.primaryColour?.hexCode ||
              row?.itemType?.primaryColour?.colourHex ||
              row?.itemType?.primaryColour?.hex;
            if (!colorName) return null;
            return [String(colorName), { colorName, colorHex }];
          })
          .filter(Boolean)
      ).values()
    )
    : [];

  const colorOptions = Array.isArray(itemType?.colorOptions) ? itemType.colorOptions : derivedColorsFromItems;

  // De-dupe by colorName and keep stable-ish ordering (alphabetical)
  const uniqueColors = Array.from(
    new Map((colorOptions || []).filter((c) => c?.colorName).map((c) => [String(c.colorName), c])).values()
  ).sort((a, b) => String(a.colorName).localeCompare(String(b.colorName)));

  const colorCount = Number.isFinite(itemType?.colorCount) ? itemType.colorCount : uniqueColors.length;

  // Always show at least 1 dot if a color exists (even when colorCount === 1)
  const showColorDots = uniqueColors.length > 0;

  const visibleColors = uniqueColors.slice(0, 3);
  const remainingColors = colorCount > 3 ? colorCount - 3 : 0;

  // Fallback mapping when hex isn't provided
  const getColorClass = (colorName) => {
    const colorMap = {
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      orange: 'bg-orange-500',
      black: 'bg-black',
      white: 'bg-white border border-gray-300',
      gray: 'bg-gray-500',
      grey: 'bg-gray-500',
      brown: 'bg-amber-700',
      navy: 'bg-blue-900',
      maroon: 'bg-red-900',
      teal: 'bg-teal-500',
      cyan: 'bg-cyan-500',
    };

    const normalizedColor = String(colorName || '').toLowerCase();
    for (const [key, className] of Object.entries(colorMap)) {
      if (normalizedColor.includes(key)) return className;
    }
    return 'bg-gray-400';
  };

  const dotStyle = (c) => {
    const hex = c?.colorHex;
    if (!hex) return undefined;

    const norm = String(hex).trim();
    const isWhite =
      norm.toLowerCase() === '#fff' ||
      norm.toLowerCase() === '#ffffff' ||
      norm.toLowerCase() === 'white';

    return {
      backgroundColor: norm,
      border: isWhite ? '1px solid rgb(209 213 219)' : undefined, // gray-300
    };
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer hover:border-gray-200 p-4 flex items-center gap-4"
    >
      {/* Item Image - Left Side */}
      <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center relative">
        {itemType?.imageUrl && !imageError ? (
          <Image
            src={itemType.imageUrl}
            alt={categoryName}
            fill
            unoptimized
            className="object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base text-gray-900 truncate mb-1">{categoryName}</h3>
        <div className="text-xs text-gray-500 mb-2 space-y-0.5">
          <p>Total pieces: {displayTotal.toLocaleString()}</p>
          <p>For School: {(itemType?.schoolStock || 0).toLocaleString()}</p>
          <p>For PSG Activities: {(itemType?.psgActivities || 0).toLocaleString()}</p>
          {isAdmin && (
            <>
              <p>For Repurposing: {(itemType?.forRepurposing || 0).toLocaleString()}</p>
            </>
          )}
        </div>

        {/* Color dots */}
        {showColorDots && (
          <div className="flex items-center gap-1.5">
            {visibleColors.map((c, index) => (
              <div
                key={`${c.colorName}-${index}`}
                className={`w-5 h-5 rounded-full ${c?.colorHex ? '' : getColorClass(c.colorName)}`}
                style={dotStyle(c)}
                title={c.colorName}
              />
            ))}
            {remainingColors > 0 && <span className="text-xs font-medium text-gray-500">+{remainingColors}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
