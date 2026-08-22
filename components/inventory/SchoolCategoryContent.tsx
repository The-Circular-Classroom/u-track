// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getRoleFromSession } from "@/utils/auth";
import { getCategoryOrder, getSubCategoryOrder } from "@/utils/categoryOrder";
import { getUniformImageUrl } from "@/lib/inventory/uniformImageUrl";

import { Box, Typography } from "@mui/material";
import { FaCheck } from "react-icons/fa6";
import { TbCancel } from "react-icons/tb";

import ItemTypeCard from "@/components/ItemTypeCard";
import SnackbarAlert from "@/components/SnackbarAlert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CustomErrorButton from "@/components/ui/CustomErrorButton";

function toSlug(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export default function SchoolItemTypesContent() {
  const router = useRouter();

  const [role, setRole] = useState("UNKNOWN");
  const isAdmin = role === "TCC_ADMIN";

  const [school, setSchool] = useState(null);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const apiUrl = '';

  useEffect(() => {
    setRole(getRoleFromSession());
  }, []);

  // Read school from sessionStorage
  useEffect(() => {
    if (role === "UNKNOWN") return;
    try {
      const stored = sessionStorage.getItem("_invSelectedSchool");
      if (stored) {
        setSchool(JSON.parse(stored));
        return;
      }
    } catch (_) {}
    router.replace("/inventory/items");
  }, [role, router]);

  const fetchItemTypes = useCallback(async () => {
    if (!school?.id) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/inventory/balance?schoolId=${school.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch item types");

      const result = await res.json();
      const rows = result.balances || result.data || [];

      // Client-side fallback: enrich imageUrl if the API didn't set it
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      rows.forEach((row) => {
        const itemType = row?.itemType;
        if (itemType) {
          const categoryName = itemType.category?.categoryName ?? null;
          const colourName = itemType.primaryColour?.colourName ?? null;
          itemType.imageUrl = getUniformImageUrl(supabaseUrl, categoryName, colourName, itemType.imageUrl);
        }
      });

      const categoryMap = new Map();
      rows.forEach((row) => {
        const category = row?.itemType?.category;
        const categoryId = category?.id ?? row?.itemType?.categoryId;
        if (!categoryId) return;

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            id: categoryId,
            category,
            schoolStock: 0,
            psgActivities: 0,
            forRepurposing: 0,
            recyclingDisposal: 0,
            items: [],
            colors: new Map(),
          });
        }
        const entry = categoryMap.get(categoryId);

        if (row.itemStatus === "GeneralOffice" && row.storedAt === "School")
          entry.schoolStock += row.quantity;
        if (row.itemStatus === "ForSale" && row.storedAt === "School")
          entry.psgActivities += row.quantity;
        if (row.itemStatus === "ForRepurpose" && row.storedAt === "TCC")
          entry.forRepurposing += row.quantity;
        if (row.itemStatus === "Disposed" && row.storedAt === "Exited")
          entry.recyclingDisposal += row.quantity;
        entry.items.push(row);

        const colorName = row?.itemType?.primaryColour?.colourName;
        const colorHex =
          row?.itemType?.primaryColour?.hexcode ||
          row?.itemType?.primaryColour?.hexCode ||
          row?.itemType?.primaryColour?.colourHex ||
          row?.itemType?.primaryColour?.hex;
        if (colorName && !entry.colors.has(colorName))
          entry.colors.set(colorName, { colorName, colorHex });
      });

      const grouped = Array.from(categoryMap.values())
        .map((g) => ({
          ...g,
          totalQuantity:
            g.schoolStock +
            g.psgActivities +
            g.forRepurposing +
            g.recyclingDisposal,
          colorOptions: Array.from(g.colors.values()),
          colorCount: g.colors.size,
          imageUrl: g.items[0]?.itemType?.imageUrl || null,
          schoolLogoUrl: school?.logoUrl || (school?.id ? `/api/school/${school.id}/logo` : null),
        }))
        .sort((a, b) => {
          const primary =
            getCategoryOrder(a.category?.categoryName) -
            getCategoryOrder(b.category?.categoryName);
          return primary !== 0
            ? primary
            : getSubCategoryOrder(a.category?.categoryName) -
                getSubCategoryOrder(b.category?.categoryName);
        });

      setItemTypes(grouped);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    if (school?.id) {
      fetchItemTypes();
    }
  }, [school, fetchItemTypes]);

  const schoolName = school?.schoolName || "";

  if (loading) return <LoadingSpinner message="Loading items..." />;
  if (error)
    return (
      <Box sx={{ p: 4 }}>
        <CustomErrorButton onClick={fetchItemTypes} />
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      </Box>
    );

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Box sx={{ p: 4 }}>
      {/* ── Page title + Add button ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: "var(--color-darker)" }}
          >
            Inventory by Items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Current Inventory as of {currentDate}
          </Typography>
        </Box>
      </Box>

      {/* ── Breadcrumb: Schools / School Name ── */}
      <div className="mb-4 overflow-x-auto">
        <nav className="flex items-center gap-2 text-sm whitespace-nowrap">
          <button
            type="button"
            onClick={() => router.push("/inventory/items")}
            className="cursor-pointer text-[var(--color-main)] hover:underline"
          >
            Schools
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-semibold">{schoolName}</span>
        </nav>
      </div>

      {/* ── Item types grid ── */}
      {itemTypes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No items found for this school.
        </Typography>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {itemTypes.map((itemType, index) => (
            <ItemTypeCard
              key={itemType.id || index}
              itemType={itemType}
              isAdmin={isAdmin}
              onClick={() => {
                const slug = toSlug(itemType.category?.categoryName);
                if (
                  itemType.colorCount === 1 &&
                  itemType.colorOptions?.[0]?.colorName
                ) {
                  // Single colour → skip colours page, go directly to items
                  const colorSlug = toSlug(itemType.colorOptions[0].colorName);
                  router.push(`/inventory/items/school/${slug}/${colorSlug}`);
                } else {
                  router.push(`/inventory/items/school/${slug}`);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <SnackbarAlert
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={(e, reason) => {
          if (reason !== "clickaway")
            setSnackbar((p) => ({ ...p, open: false }));
        }}
        message={snackbar.message}
        icon={snackbar.severity === "success" ? <FaCheck /> : <TbCancel />}
        severity={snackbar.severity}
      />
    </Box>
  );
}
