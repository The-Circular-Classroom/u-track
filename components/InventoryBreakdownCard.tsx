// @ts-nocheck
// apps/frontend/src/components/InventoryBreakdownCard.js

import Image from "next/image";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import RecyclingIcon from "@mui/icons-material/Recycling";
import { resolveSchoolLogoUrl } from "@/lib/school/logo";

/** Inline SVG placeholder for a school building (used when logoUrl is absent). */
function SchoolPlaceholder({ size = 24 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-700"
        >
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            <path d="M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    );
}

export default function InventoryBreakdownCard({ items = [], isAdmin, schoolLogoUrl }) {
    if (!items.length) return null;

    const resolvedLogoUrl = resolveSchoolLogoUrl(schoolLogoUrl);

    const schoolStock = items
        .filter((r) => r.itemStatus === "GeneralOffice" && r.storedAt === "School")
        .reduce((s, r) => s + (r.quantity || 0), 0);
    const psgActivities = items
        .filter((r) => r.itemStatus === "ForSale" && r.storedAt === "School")
        .reduce((s, r) => s + (r.quantity || 0), 0);
    const forRepurposing = items
        .filter((r) => r.itemStatus === "ForRepurpose" && r.storedAt === "TCC")
        .reduce((s, r) => s + (r.quantity || 0), 0);
    const total = isAdmin
        ? schoolStock + psgActivities + forRepurposing
        : schoolStock + psgActivities;

    const buckets = [
        {
            label: "Total Pieces",
            value: total,
            bg: "#dbeafe",
            color: "#1d4ed8",
            renderIcon: () => null, // no icon for total
        },
        {
            label: "For School",
            value: schoolStock,
            color: "#15803d",
            renderIcon: () =>
                resolvedLogoUrl ? (
                    <Image
                        src={resolvedLogoUrl}
                        alt="School"
                        width={28}
                        height={28}
                        unoptimized
                        className="object-contain"
                    />
                ) : (
                    <SchoolPlaceholder size={22} />
                ),
        },
        {
            label: "For PSG Activities",
            value: psgActivities,
            bg: "#fef3c7",
            color: "#b45309",
            renderIcon: () => <GroupsOutlinedIcon sx={{ fontSize: 22, color: "#b45309" }} />,
        },
        ...(isAdmin
            ? [
                {
                    label: "For Repurposing",
                    value: forRepurposing,
                    bg: "#ccfbf1",
                    color: "#0f766e",
                    renderIcon: () => (
                        <Image
                            src="/images/Logo-Symbol-green-stem.png"
                            alt="TCC Repurposing"
                            width={28}
                            height={28}
                            className="object-contain"
                        />
                    ),
                },
            ]
            : []),
    ];

    return (
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-6`}>
            {buckets.map(({ label, value, bg, renderIcon }) => {
                const iconNode = renderIcon();
                return (
                    <div
                        key={label}
                        className="rounded-xl border border-gray-100 bg-white shadow-sm p-4"
                    >
                        <div className="flex items-start gap-3">
                            {iconNode && (
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: bg }}
                                >
                                    {iconNode}
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                    {label}
                                </p>
                                <p className="text-2xl font-bold mt-1 text-gray-900">
                                    {value.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}