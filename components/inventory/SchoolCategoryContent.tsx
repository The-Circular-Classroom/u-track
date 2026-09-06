// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getRoleFromSession, getUserSchoolFromSession } from "@/utils/auth";
import { getCategoryOrder, getSubCategoryOrder } from "@/utils/categoryOrder";
import { getUniformImageUrl } from "@/lib/inventory/uniformImageUrl";
import { resolveSchoolLogoUrl } from "@/lib/school/logo";

import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
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
  const [schools, setSchools] = useState([]);
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

  // Fetch all schools for admin
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/inventory/balance')
      .then((res) => res.json())
      .then((data) => {
        const rows = data.balances || data.data || [];
        const map = new Map();
        rows.forEach((r) => {
          const s = r?.itemType?.school;
          if (s?.id && !map.has(s.id)) {
            map.set(s.id, {
              id: s.id,
              schoolName: s.schoolName,
              logoUrl: resolveSchoolLogoUrl(s.logoUrl, s.id),
            });
          }
        });
        const list = Array.from(map.values()).sort((a, b) =>
          String(a.schoolName || '').localeCompare(String(b.schoolName || ''))
        );
        setSchools(list);
      })
      .catch(console.error);
  }, [isAdmin]);

  // Read school from sessionStorage
  useEffect(() => {
    if (role === "UNKNOWN") return;
    try {
      const stored = sessionStorage.getItem("_invSelectedSchool");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!isAdmin) {
          const userSchool = getUserSchoolFromSession();
          if (userSchool?.id && String(parsed.id) !== String(userSchool.id)) {
            router.replace("/inventory/items");
            return;
          }
        }
        setSchool(parsed);
        return;
      }
    } catch (_) {}
    router.replace("/inventory/items");
  }, [role, router, isAdmin]);

  const fetchItemTypes = useCallback(async () => {
    if (!school?.id) return;
    try {
      setLoading(true);
      const url = school.id === 'all'
        ? `/api/inventory/balance`
        : `/api/inventory/balance?schoolId=${school.id}`;
      const res = await fetch(url);
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
          totalQuantity: isAdmin
            ? g.schoolStock + g.psgActivities + g.forRepurposing
            : g.schoolStock + g.psgActivities,
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
            View quantities of individual uniform items
          </Typography>
        </Box>
      </Box>

      {/* ── Admin School Selector ── */}
      {isAdmin && schools.length > 1 && (
        <div className="mb-4">
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="school-select-label">School</InputLabel>
            <Select
              labelId="school-select-label"
              label="School"
              value={school?.id ? String(school.id) : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  const allObj = { id: 'all', schoolName: 'All Schools' };
                  setSchool(allObj);
                  sessionStorage.setItem('_invSelectedSchool', JSON.stringify(allObj));
                  window.dispatchEvent(new CustomEvent('school-changed', {
                    detail: { logoUrl: null, schoolName: 'All Schools' },
                  }));
                  return;
                }
                const s = schools.find((x) => String(x.id) === String(val));
                if (s) {
                  setSchool(s);
                  sessionStorage.setItem('_invSelectedSchool', JSON.stringify(s));
                  window.dispatchEvent(new CustomEvent('school-changed', {
                    detail: { logoUrl: s.logoUrl, schoolName: s.schoolName },
                  }));
                }
              }}
            >
              <MenuItem value="all">All Schools</MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.schoolName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      )}

      {/* ── School Name & Logo ── */}
      <div className="flex items-center gap-3 mb-4">
        {school?.id !== 'all' && school?.logoUrl && (
          <img src={resolveSchoolLogoUrl(school.logoUrl, school.id)} alt="School Logo" className="h-8 w-auto object-contain" />
        )}
        <h2 className="text-xl font-bold text-gray-900">
          {school?.id === 'all' ? 'All Schools' : schoolName}
        </h2>
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
