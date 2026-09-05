// @ts-nocheck
// apps/frontend/src/components/InventoryOverviewCard.js
import Image from 'next/image';
import { getColourDisplayName } from '@/utils/colourDisplayName';

/**
 * Displays shared metadata for the current inventory view (category, colours,
 * pattern, material, gender, total qty, sizes). Only fields that have a value
 * are rendered.
 *
 * Props:
 *  - items          : InventoryBalance[] (baseInventoryData)
 *  - selectedItemType : the selected category-grouped item-type object
 *  - selectedColor  : { colorName } | null
 */
export default function InventoryOverviewCard({ items = [], selectedItemType, selectedColor, isAdmin }) {
    if (!items.length) return null;

    const sample = items[0];
    const itemType = sample?.itemType;

    const imageUrl = itemType?.imageUrl || null;
    const categoryName = selectedItemType?.category?.categoryName || itemType?.category?.categoryName || '';

    const primaryColourName = selectedColor?.colorName || itemType?.primaryColour?.colourName || '';
    const primaryColourHex =
        selectedColor?.colorHex ||
        itemType?.primaryColour?.hexCode ||
        itemType?.primaryColour?.colourHex ||
        itemType?.primaryColour?.hex ||
        itemType?.primaryColour?.hexcode ||
        '';

    const secondaryColourName = itemType?.secondaryColour?.colourName || '';
    const secondaryColourHex =
        itemType?.secondaryColour?.hexCode ||
        itemType?.secondaryColour?.colourHex ||
        itemType?.secondaryColour?.hex ||
        itemType?.secondaryColour?.hexcode ||
        '';

    const isMulticolour =
        primaryColourName.toLowerCase() === 'multicolour' ||
        Boolean(secondaryColourName);

    const displayPrimaryColour = isMulticolour
        ? 'Multicolour'
        : getColourDisplayName(primaryColourName, isAdmin);
    const displaySecondaryColour = getColourDisplayName(secondaryColourName, isAdmin);

    const patternName = itemType?.pattern?.patternName || '';
    const materialName = itemType?.material?.materialName || '';
    const genders = [...new Set(items.map((r) => r.itemType?.gender).filter(Boolean))].sort();
    const gender = genders.join(' / ');

    const sizes = [...new Set(items.map((r) => r.sizeOption?.sizeName).filter(Boolean))].sort();

    // Fallback: map colour name → approximate hex when no hex code is stored
    const colourNameToHex = (name) => {
        const map = {
            white: '#ffffff', black: '#171717', red: '#dc2626', blue: '#3b82f6',
            'light blue': '#93c5fd', 'medium blue': '#3b82f6', 'dark blue': '#1e3a5f',
            green: '#22c55e', 'medium green': '#16a34a', 'dark green': '#15803d',
            yellow: '#eab308', 'medium yellow': '#eab308', orange: '#f97316',
            purple: '#7c3aed', pink: '#ec4899', gray: '#9ca3af', grey: '#9ca3af',
            brown: '#78350f', navy: '#1e3a5f', 'navy blue': '#1e3a5f', maroon: '#7f1d1d',
            teal: '#0d9488', cyan: '#06b6d4', beige: '#d4c5a9', khaki: '#c3b091',
            cream: '#fffdd0', silver: '#c0c0c0', gold: '#ffd700',
        };
        const key = String(name || '').toLowerCase();
        for (const [k, v] of Object.entries(map)) {
            if (key.includes(k)) return v;
        }
        return null;
    };

    const swatchColor = primaryColourHex || colourNameToHex(primaryColourName) || '#9ca3af';
    const secondarySwatchColor = secondaryColourHex || colourNameToHex(secondaryColourName) || null;
    const swatchIsLight = ["#FFFFFF", "#ffffff"].includes(swatchColor);

    const metaFields = [
        {
            label: 'Primary Colour',
            value: primaryColourName ? (
                <div className="flex items-center gap-1.5">
                    <div
                        className="w-4 h-4 rounded-full shrink-0 overflow-hidden"
                        style={{
                            background: secondarySwatchColor
                                ? `linear-gradient(135deg, ${swatchColor} 50%, ${secondarySwatchColor} 50%)`
                                : swatchColor,
                            border: (swatchIsLight || isMulticolour) ? '1px solid rgb(209 213 219)' : undefined,
                        }}
                    />
                    <span className="text-sm font-medium text-gray-800">{displayPrimaryColour}</span>
                </div>
            ) : (
                <span className="text-sm text-gray-400">&mdash;</span>
            ),
        },
        {
            label: 'Secondary Colour',
            value: displaySecondaryColour
                ? <span className="text-sm font-medium text-gray-800">{displaySecondaryColour}</span>
                : <span className="text-sm text-gray-400">&mdash;</span>,
        },
        ...(isAdmin ? [
            {
                label: 'Pattern',
                value: patternName
                    ? <span className="text-sm font-medium text-gray-800">{patternName}</span>
                    : <span className="text-sm text-gray-400">&mdash;</span>,
            },
            {
                label: 'Material',
                value: materialName
                    ? <span className="text-sm font-medium text-gray-800">{materialName}</span>
                    : <span className="text-sm text-gray-400">&mdash;</span>,
            },]
            : []),
        {
            label: 'Gender',
            value: (gender && gender !== 'Unisex')
                ? <span className="text-sm font-medium text-gray-800">{gender}</span>
                : <span className="text-sm text-gray-400">&mdash;</span>,
        },
        {
            label: 'Sizes',
            value: sizes.length > 0
                ? <span className="text-sm text-gray-700">{sizes.join(', ')}</span>
                : <span className="text-sm text-gray-400">&mdash;</span>,
        },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            {/* Category name spans full width at the top */}
            <h3 className="text-xl font-bold text-gray-900 mb-4">{categoryName}</h3>

            <div className="flex flex-col sm:flex-row gap-5">
                {/* Image + Optional Multicolour bar */}
                <div className="flex flex-col shrink-0">
                    <div className="relative w-28 h-28 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                        {imageUrl ? (
                            <Image src={imageUrl} alt={categoryName} fill unoptimized className="object-contain" sizes="112px" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
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
                    {isMulticolour && (
                        <div className="mt-2 flex items-center justify-center gap-1 w-28">
                            <div
                                className="h-2 rounded-full flex-1"
                                style={{ backgroundColor: swatchColor }}
                                title={getColourDisplayName(primaryColourName, isAdmin)}
                            />
                            {secondarySwatchColor && (
                                <div
                                    className="h-2 rounded-full flex-1"
                                    style={{ backgroundColor: secondarySwatchColor }}
                                    title={displaySecondaryColour}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Attribute grid */}
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                        {metaFields.map(({ label, value }) => (
                            <div key={label} className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
                                <div className="text-sm">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}