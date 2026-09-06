// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoleFromSession } from "@/utils/auth";
import { resolveSchool, toSlug, slugToLabel, colorSlugToLabel } from "@/utils/inventoryNav";

import { Box, Typography } from "@mui/material";
import { FaCheck } from "react-icons/fa6";
import { FaChevronLeft } from "react-icons/fa";
import { TbCancel } from "react-icons/tb";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CustomErrorButton from "@/components/ui/CustomErrorButton";
import ItemsDetailView from "@/components/inventory/ItemsDetailView";
import SnackbarAlert from "@/components/SnackbarAlert";
import { getColourDisplayName } from "@/utils/colourDisplayName";

/**
 * Admin items view — /inventory/items/school/[category]/[color]
 * Breadcrumb: Schools / School Name / Category
 */
export default function SchoolCategoryColorContent() {
  const { category: categorySlug, color: colorSlug } = useParams();
  const router = useRouter();

  const [role, setRole] = useState("UNKNOWN");
  const isAdmin = role === "TCC_ADMIN";

  const [school, setSchool] = useState(null);
  const [items, setItems] = useState([]);
  const [colorCount, setColorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const apiUrl = '';
  const categoryLabel = useMemo(() => slugToLabel(categorySlug), [categorySlug]);
  const colorLabel = useMemo(() => getColourDisplayName(colorSlugToLabel(colorSlug), isAdmin), [colorSlug, isAdmin]);

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
      const catRows = (result.balances || result.data || []).filter(
        (row) => toSlug(row?.itemType?.category?.categoryName || "") === categorySlug
      );
      const distinctColors = new Set(
        catRows.map((row) => toSlug(row?.itemType?.primaryColour?.colourName || ""))
      ).size;
      setColorCount(distinctColors);

      const rows = catRows.filter(
        (row) => toSlug(row?.itemType?.primaryColour?.colourName || "") === colorSlug
      );
      setItems(rows);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [school, categorySlug, colorSlug]);

  useEffect(() => {
    if (school?.id) {
      fetchData();
    }
  }, [school, fetchData]);

  const schoolName = school?.schoolName || "";

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <Box sx={{ p: 4 }}>
        <CustomErrorButton onClick={fetchData} />
        <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
      </Box>
    );

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      {/* ── Page title + Add button ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: "var(--color-darker)" }}>
            Inventory by Items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Current Inventory as of {currentDate}
          </Typography>
        </Box>
      </Box>

      {/* ── Breadcrumb: Schools / School Name / Category / Color ── */}
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
          {colorCount > 1 ? (
            <>
              <button
                type="button"
                onClick={() => router.push(`/inventory/items/school/${categorySlug}`)}
                className="cursor-pointer text-[var(--color-main)] hover:underline"
              >
                {categoryLabel}
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-semibold">{colorLabel}</span>
            </>
          ) : (
            <span className="text-gray-900 font-semibold">{categoryLabel}</span>
          )}
        </nav>
      </div>

      {colorCount > 1 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.push(`/inventory/items/school/${categorySlug}`)}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-main)] hover:underline cursor-pointer"
          >
            <FaChevronLeft />
            View all colours
          </button>
        </div>
      )}

      <ItemsDetailView items={items} isAdmin={isAdmin} schoolLogoUrl={school?.logoUrl} />

      {/* ── Modals ── */}
      <SnackbarAlert
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={(e, reason) => { if (reason !== "clickaway") setSnackbar((p) => ({ ...p, open: false })); }}
        message={snackbar.message}
        icon={snackbar.severity === "success" ? <FaCheck /> : <TbCancel />}
        severity={snackbar.severity}
      />
    </Box>
  );
}
