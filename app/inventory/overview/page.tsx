// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getRoleFromSession } from "@/utils/auth";
import { getCategoryOrder } from "@/utils/categoryOrder";

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from "@mui/material";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CustomErrorButton from "@/components/ui/CustomErrorButton";
import {
  fetchSchoolCollectionOverview,
  fetchSchoolInventoryByItem,
  buildSchoolCollectionOverview,
  buildSchoolInventoryByItem,
} from "@/utils/analytics";

const CORE_COLORS = {
  schoolStock: "#639922",
  psg: "#378ADD",
  repurposing: "#BA7517",
  waste: "#888780",
};

const toTitleCase = (str) => {
  if (!str) return str;
  return str.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
};

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 100000 ? 1 : 2,
  }).format(Number(value) || 0);
}

export default function InventoryOverviewPage() {
  const [role, setRole] = useState("UNKNOWN");
  const isAdmin = role === "TCC_ADMIN";

  const coreConfig = useMemo(() => {
    const base = [
      {
        key: "schoolStock",
        label: "For School",
        bg: "bg-green-50",
        text: "text-green-900",
        sub: "text-green-600",
        border: "border-green-200",
      },
      {
        key: "psg",
        label: "For PSG Activities",
        bg: "bg-blue-50",
        text: "text-blue-900",
        sub: "text-blue-600",
        border: "border-blue-200",
      },
    ];
    if (isAdmin) {
      base.push({
        key: "repurposing",
        label: "For Repurposing",
        bg: "bg-amber-50",
        text: "text-amber-900",
        sub: "text-amber-600",
        border: "border-amber-200",
      });
    }
    return base;
  }, [isAdmin]);

  // School list / selection (sourced from inventory balances, same as the
  // other inventory pages).
  const [rows, setRows] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  // Analytics-sourced figures for the selected school.
  const [collectionOverview, setCollectionOverview] = useState(null);
  const [inventoryByItem, setInventoryByItem] = useState(null);

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  const inventoryApiUrl = '';
  const analyticsApiUrl = '';

  useEffect(() => {
    setRole(getRoleFromSession());
  }, []);

  // 1) Resolve the school context.
  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${inventoryApiUrl}/api/inventory/balance`);
      if (!response.ok) throw new Error("Failed to fetch inventory data");

      const result = await response.json();
      setRows(result.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [inventoryApiUrl]);

  useEffect(() => {
    if (role === "UNKNOWN") return;
    fetchSchools();
  }, [role, fetchSchools]);

  const schools = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const school = row?.itemType?.school;
      if (school?.id && !map.has(school.id)) {
        map.set(school.id, { id: school.id, schoolName: school.schoolName });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      String(a.schoolName || "").localeCompare(String(b.schoolName || "")),
    );
  }, [rows]);

  useEffect(() => {
    if (schools.length === 1 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  const showSchoolSelector = isAdmin && schools.length > 1;

  // 2) Load the analytics figures for the selected school.
  const loadSchoolData = useCallback(
    async (schoolId) => {
      try {
        setDataLoading(true);

        const [overviewRaw, byItemRaw] = await Promise.all([
          fetchSchoolCollectionOverview(analyticsApiUrl, schoolId),
          fetchSchoolInventoryByItem(
            analyticsApiUrl,
            schoolId,
            { isAdmin },
          ),
        ]);

        setCollectionOverview(buildSchoolCollectionOverview(overviewRaw));
        setInventoryByItem(buildSchoolInventoryByItem(byItemRaw));
        setError(null);
      } catch (err) {
        console.error("Error fetching inventory overview:", err);
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    },
    [analyticsApiUrl, isAdmin],
  );

  useEffect(() => {
    if (!selectedSchoolId) {
      setCollectionOverview(null);
      setInventoryByItem(null);
      return;
    }
    loadSchoolData(selectedSchoolId);
  }, [selectedSchoolId, loadSchoolData]);

  const selectedSchoolName = useMemo(() => {
    if (selectedSchoolId === "all") return "All Schools";
    return (
      schools.find((s) => String(s.id) === String(selectedSchoolId))
        ?.schoolName || ""
    );
  }, [schools, selectedSchoolId]);

  // Weight apportioned by piece share of the total collection (mirrors the
  // analytics school view, which has no true per-piece weight).
  const kgFor = useCallback(
    (key) => {
      const o = collectionOverview;
      if (!o || !o.totalPieces) return 0;
      return ((o[key] || 0) / o.totalPieces) * o.totalWeightKg;
    },
    [collectionOverview],
  );

  const piecesDonut = useMemo(() => {
    if (!collectionOverview) return [];
    return coreConfig.map((c) => ({
      name: c.label,
      value: collectionOverview[c.key] || 0,
      color: CORE_COLORS[c.key],
    })).filter((d) => d.value > 0);
  }, [collectionOverview, coreConfig]);

  const weightDonut = useMemo(() => {
    if (!collectionOverview) return [];
    return coreConfig.map((c) => ({
      name: c.label,
      value: Number(kgFor(c.key).toFixed(2)),
      color: CORE_COLORS[c.key],
    })).filter((d) => d.value > 0);
  }, [collectionOverview, kgFor, coreConfig]);

  // Totals relative to the shown categories.
  const available = useMemo(() => {
    const o = collectionOverview;
    if (!o) return null;
    const pieces = coreConfig.reduce((s, c) => s + (o[c.key] || 0), 0);
    const kg = coreConfig.reduce((s, c) => s + kgFor(c.key), 0);
    return { pieces, kg };
  }, [collectionOverview, kgFor, coreConfig]);

  // ── Inventory by item, grouped by category (one row per uniform) ─────────
  const itemRows = useMemo(() => {
    const items = inventoryByItem?.items || [];
    const map = new Map();

    items.forEach((it) => {
      let catName = it.categoryName || "Unknown";
      if (catName.toLowerCase() === "gym shorts") {
        catName = "Others";
      }

      const key = it.categoryId ?? catName;
      if (!map.has(key)) {
        map.set(key, {
          key,
          categoryName: catName,
          imageUrl: it.imageUrl || null,
          schoolStock: 0,
          psg: 0,
          repurposing: 0,
        });
      }
      const entry = map.get(key);
      entry.schoolStock += it.schoolStock || 0;
      entry.psg += it.psg || 0;
      if (isAdmin) {
        entry.repurposing += it.repurposing || 0;
      }
      if (!entry.imageUrl && it.imageUrl) entry.imageUrl = it.imageUrl;
    });

    // Sort by canonical category display order
    return Array.from(map.values()).sort((a, b) => {
      return getCategoryOrder(a.categoryName) - getCategoryOrder(b.categoryName);
    });
  }, [inventoryByItem, isAdmin]);

  if (loading) {
    return <LoadingSpinner message="Loading inventory overview..." />;
  }

  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Inventory Overview"
        message={error}
        onRetry={() => {
          setError(null);
          if (selectedSchoolId) loadSchoolData(selectedSchoolId);
          else fetchSchools();
        }}
      />
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ color: "var(--color-darker)" }}
        >
          Inventory Overview
        </Typography>
      </Box>

      {showSchoolSelector && (
        <div className="mb-6">
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="school-label">School</InputLabel>
            <Select
              labelId="school-label"
              label="School"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
            >
              <MenuItem value="all">All Schools</MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {toTitleCase(s.schoolName)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      )}

      {showSchoolSelector && !selectedSchoolId && (
        <Typography variant="body2" color="text.secondary">
          Select a school to view its inventory overview.
        </Typography>
      )}

      {selectedSchoolId && dataLoading && (
        <LoadingSpinner message="Loading inventory overview..." />
      )}

      {selectedSchoolId && !dataLoading && collectionOverview && (
        <>
          {/* School name */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {toTitleCase(selectedSchoolName)}
          </h2>

          {/* ── Current Inventory ───────────────────────────────────────── */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Current Inventory as of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 mb-6">
            {/* Category cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total available pieces */}
              <div className="rounded-xl border border-[var(--color-main)]/20 bg-[var(--color-main)]/5 p-3 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 leading-tight">
                  Total Pieces Available
                </p>
                <p className="text-2xl font-bold text-[var(--color-main)]">
                  {available.pieces.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatCompactNumber(available.kg)} kg
                </p>
              </div>

              {coreConfig.map((cfg) => (
                <div
                  key={cfg.key}
                  className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 flex flex-col items-center text-center`}
                >
                  <span
                    className="w-3 h-3 rounded-full mb-2 flex-shrink-0"
                    style={{ background: CORE_COLORS[cfg.key] }}
                  />
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${cfg.sub} mb-2 leading-tight`}
                  >
                    {cfg.label}
                  </p>

                  {/* # pieces */}
                  <div className="w-full rounded-lg bg-white/70 px-2 py-2 mb-2 flex-1 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">
                      #
                    </p>
                    <p className={`text-xl font-bold ${cfg.text}`}>
                      {(collectionOverview[cfg.key] || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* kg */}
                  <div className="w-full rounded-lg bg-white/70 px-2 py-2 flex-1 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">
                      KG
                    </p>
                    <p className={`text-xl font-bold ${cfg.text}`}>
                      {formatCompactNumber(kgFor(cfg.key))} kg
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Donuts + shared legend */}
            <div className="flex flex-row lg:flex-col gap-4 justify-center items-center">
              <DonutChart
                title="# Pieces"
                data={piecesDonut}
                center={formatCompactNumber(available.pieces)}
              />
              <DonutChart
                title="KG"
                data={weightDonut}
                center={formatCompactNumber(available.kg)}
              />

              <div className="flex flex-col gap-1">
                {coreConfig.map((cfg) => (
                  <span
                    key={cfg.key}
                    className="flex items-center gap-1.5 text-xs text-gray-500"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: CORE_COLORS[cfg.key] }}
                    />
                    {cfg.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Inventory by Item ───────────────────────────────────────── */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Inventory by Item
          </h3>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            {coreConfig.map((cfg) => (
              <span key={cfg.key} className="flex items-center gap-2 text-xs text-gray-500">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: CORE_COLORS[cfg.key] }}
                />
                {cfg.label}
              </span>
            ))}
          </div>

          {itemRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No uniform items found.
            </Typography>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {itemRows.map((row) => (
                <StackedBar key={row.key} row={row} />
              ))}
            </div>
          )}
        </>
      )}
    </Box>
  );
}

/** A small donut with a centred total label. */
function DonutChart({ title, data, center }) {
  const hasData = data.length > 0;
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {title}
      </p>
      <div className="relative w-36 h-36">
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-gray-700">{center}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A single row in the Inventory by Item list.
 * Layout: [category name — fixed width left] [stacked bar — fills right]
 */
function StackedBar({ row }) {
  const repurposing = row.repurposing || 0;
  const total = (row.schoolStock || 0) + (row.psg || 0) + repurposing;
  const schoolPct = total ? (row.schoolStock / total) * 100 : 0;
  const psgPct = total ? (row.psg / total) * 100 : 0;
  const repurposingPct = total ? (repurposing / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {/* Category name — fixed left column */}
      <div className="w-36 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {row.categoryName}
        </p>
      </div>

      {/* Bar — flex-1 so ALL bars stretch to the same width */}
      <div className="flex-1 min-w-0">
        {total > 0 ? (
          <div className="flex items-center gap-3">
            {/* Bar container: flex-1 ensures equal length across every row */}
            <div className="flex-1 h-6 rounded-lg overflow-hidden bg-gray-100 flex">
              {schoolPct > 0 && (
                <div
                  className="h-full flex items-center justify-center overflow-hidden"
                  style={{ width: `${schoolPct}%`, background: CORE_COLORS.schoolStock }}
                  title={`For School: ${row.schoolStock.toLocaleString()}`}
                >
                  <span className="px-1 text-xs font-semibold text-white whitespace-nowrap">
                    {row.schoolStock.toLocaleString()}
                  </span>
                </div>
              )}
              {psgPct > 0 && (
                <div
                  className="h-full flex items-center justify-center overflow-hidden"
                  style={{ width: `${psgPct}%`, background: CORE_COLORS.psg }}
                  title={`For PSG Activities: ${row.psg.toLocaleString()}`}
                >
                  <span className="px-1 text-xs font-semibold text-white whitespace-nowrap">
                    {row.psg.toLocaleString()}
                  </span>
                </div>
              )}
              {repurposingPct > 0 && (
                <div
                  className="h-full flex items-center justify-center overflow-hidden"
                  style={{ width: `${repurposingPct}%`, background: CORE_COLORS.repurposing }}
                  title={`For Repurposing: ${repurposing.toLocaleString()}`}
                >
                  <span className="px-1 text-xs font-semibold text-white whitespace-nowrap">
                    {repurposing.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {/* Total — fixed width so it never pushes the bar */}
            <span className="w-20 flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
              {total.toLocaleString()} total
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No items</span>
        )}
      </div>
    </div>
  );
}
