// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoleFromSession } from "@/utils/auth";
import { resolveSchool, buildColorGroups, toSlug, slugToLabel, toColorSlug } from "@/utils/inventoryNav";
import { getColourDisplayName } from "@/utils/colourDisplayName";

import { Box, Typography } from "@mui/material";
import ColorCard from "@/components/ColorCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CustomErrorButton from "@/components/ui/CustomErrorButton";

/**
 * Admin colours view — /inventory/items/school/[category]
 * Breadcrumb: Schools / School Name / Category
 */
export default function SchoolCategoryContent() {
  const { category: categorySlug } = useParams();
  const router = useRouter();

  const [role, setRole] = useState("UNKNOWN");
  const isAdmin = role === "TCC_ADMIN";
  const [school, setSchool] = useState(null);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = '';
  const categoryLabel = useMemo(() => slugToLabel(categorySlug), [categorySlug]);

  useEffect(() => { setRole(getRoleFromSession()); }, []);

  useEffect(() => {
    if (role === "UNKNOWN") return;
    resolveSchool(apiUrl, role === "TCC_ADMIN")
      .then(setSchool)
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [role, apiUrl]);

  const fetchData = useCallback(async () => {
    if (!school?.id) return;
    try {
      setLoading(true);
      const url = school.id === 'all'
        ? `/api/inventory/balance`
        : `/api/inventory/balance?schoolId=${school.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch balances");
      const result = await res.json();
      const rows = (result.balances || result.data || []).filter(
        (row) => toSlug(row?.itemType?.category?.categoryName || "") === categorySlug
      );
      const cols = buildColorGroups(rows).map((c) => ({
        ...c,
        displayName: getColourDisplayName(c.colorName, isAdmin),
      }));

      setColors(cols);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, school, categorySlug]);

  useEffect(() => { if (school?.id) fetchData(); }, [school, fetchData]);

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <Box sx={{ p: 4 }}>
        <CustomErrorButton onClick={fetchData} />
        <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
      </Box>
    );

  const schoolName = school?.schoolName || "";

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      {/* ── Page title ── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: "var(--color-darker)" }}>
          Inventory by Items
        </Typography>
      </Box>

      {/* Breadcrumb: Schools / School Name / Category */}
      <div className="mb-4 overflow-x-auto">
        <nav className="flex items-center gap-2 text-sm whitespace-nowrap">
          <button type="button" onClick={() => router.push("/inventory/items")}
            className="cursor-pointer text-[var(--color-main)] hover:underline">
            Schools
          </button>
          <span className="text-gray-400">/</span>
          <button type="button" onClick={() => router.push("/inventory/items/school")}
            className="cursor-pointer text-[var(--color-main)] hover:underline">
            {schoolName}
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-semibold">{categoryLabel}</span>
        </nav>
      </div>

      {colors.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No colours found for this category.</Typography>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {colors.map((color, i) => (
            <ColorCard
              key={i}
              color={color}
              onClick={() => router.push(`/inventory/items/school/${categorySlug}/${toColorSlug(color.colorName)}`)}
            />
          ))}
        </div>
      )}
    </Box>
  );
}
