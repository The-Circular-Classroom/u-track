// @ts-nocheck
// apps/frontend/src/app/analytics/assembly/page.js
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StyledModal from '@/components/ui/StyledModal';
import { getRoleFromSession } from '@/utils/auth';

const PALETTE = ['#69aa56', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

// ─── Shared UI components ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <Paper elevation={0} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4" sx={{ flex: 1, minWidth: 0 }}>
      <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconBg || '#f3f4f6' }}>
        <Icon sx={{ fontSize: 22, color: 'var(--icon-color, #6b7280)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </Paper>
  );
}

function Section({ title, subtitle, children, action }) {
  return (
    <Paper elevation={0} className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{title}</Typography>
          {subtitle && <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.8rem', mt: 0.5 }}>{subtitle}</Typography>}
        </div>
        {action}
      </div>
      {children}
    </Paper>
  );
}

function BarChart({ data, valueKey, labelKey, colorFn }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-44 shrink-0 truncate text-right">{item[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(item[valueKey] / max) * 100}%`, backgroundColor: colorFn ? colorFn(i) : '#69aa56' }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-10 text-right shrink-0">{item[valueKey].toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function getProductOptionSummary(product) {
  const styles = product.productStyles ?? [];
  const ingredientNames = [];
  const recipeNames = [];
  const seen = new Set();
  const seenRecipes = new Set();

  for (const style of styles) {
    for (const recipe of style.productRecipes ?? []) {
      if (!seenRecipes.has(recipe.recipeName)) {
        seenRecipes.add(recipe.recipeName);
        recipeNames.push(recipe.recipeName);
      }

      for (const ingredient of recipe.recipeIngredients ?? []) {
        const ingredientName = ingredient.itemType?.category?.categoryName ?? `Item Type ${ingredient.itemTypeId}`;
        const label = ingredient.sizeClass ? `${ingredientName} (${ingredient.sizeClass})` : ingredientName;

        if (!seen.has(label)) {
          seen.add(label);
          ingredientNames.push(label);
        }
      }
    }
  }

  const ingredientSummary = ingredientNames.length > 0
    ? ingredientNames.slice(0, 4).join(', ') + (ingredientNames.length > 4 ? ` +${ingredientNames.length - 4} more` : '')
    : 'No ingredients configured';

  const recipeSummary = recipeNames.length > 0
    ? recipeNames.slice(0, 3).join(', ') + (recipeNames.length > 3 ? ` +${recipeNames.length - 3} more` : '')
    : 'No recipes configured';

  return {
    styleCount: styles.length,
    recipeCount: recipeNames.length,
    ingredientSummary,
    recipeSummary,
  };
}

// ─── Plan builder components ───────────────────────────────────────────────────

function ProductPlanRow({ item, products, takenProductIds, onUpdate, onRemove }) {
  const available = products.filter((p) => p.id === item.productId || !takenProductIds.includes(p.id));

  return (
    <div className="flex items-center gap-3">
      <Select
        size="small"
        value={item.productId}
        onChange={(e) => onUpdate({ ...item, productId: e.target.value })}
        displayEmpty
        sx={{ flex: 1, fontSize: '0.875rem', minWidth: 0 }}
      >
        <MenuItem value="" disabled><em>Select product</em></MenuItem>
        {available.map((p) => {
          const summary = getProductOptionSummary(p);

          return (
            <MenuItem key={p.id} value={p.id} sx={{ alignItems: 'center', whiteSpace: 'normal' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.1, py: 0.25, flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                  {p.productName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', lineHeight: 1.2 }}>
                  {summary.styleCount} style{summary.styleCount !== 1 ? 's' : ''} · {summary.recipeCount} recipe{summary.recipeCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}
      </Select>
      <TextField
        size="small"
        type="number"
        label="Target Qty"
        value={item.targetQuantity}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onUpdate({ ...item, targetQuantity: isNaN(val) || val < 1 ? '' : val });
        }}
        inputProps={{ min: 1 }}
        sx={{ width: 130 }}
      />
      <IconButton size="small" onClick={onRemove} sx={{ color: '#ef4444' }}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  );
}

function SchoolPlanCard({ plan, planIndex, schoolGroups, usedSchoolIds, onRemovePlan, onUpdateSchool, onAddItem, onRemoveItem, onUpdateItem }) {
  const schoolData = schoolGroups.find((g) => g.school.id === plan.schoolId);
  const products = schoolData?.products ?? [];
  const takenProductIds = plan.items.map((it) => it.productId).filter(Boolean);
  const color = PALETTE[planIndex % PALETTE.length];

  const availableSchools = schoolGroups.filter(
    (g) => g.school.id === plan.schoolId || !usedSchoolIds.includes(g.school.id),
  );

  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* School selector header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: color + '22' }}
          >
            <SchoolOutlinedIcon sx={{ fontSize: 17, color }} />
          </div>
          <Select
            size="small"
            value={plan.schoolId}
            onChange={(e) => onUpdateSchool(planIndex, e.target.value)}
            displayEmpty
            sx={{ minWidth: 230, fontSize: '0.875rem', fontWeight: 600, backgroundColor: 'white' }}
          >
            <MenuItem value="" disabled><em>Select school…</em></MenuItem>
            {availableSchools.map((g) => (
              <MenuItem key={g.school.id} value={g.school.id}>{g.school.schoolName}</MenuItem>
            ))}
          </Select>
          {plan.schoolId && (
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              {products.length} product{products.length !== 1 ? 's' : ''} available
            </Typography>
          )}
        </div>
        <IconButton
          size="small"
          onClick={() => onRemovePlan(planIndex)}
          sx={{ color: '#d1d5db', '&:hover': { color: '#ef4444' } }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </div>

      {/* Product rows */}
      <div className="px-5 py-4">
        {!plan.schoolId ? (
          <p className="text-sm text-gray-400 py-3 text-center">Select a school above to start adding products</p>
        ) : (
          <div className="space-y-3">
            {plan.items.map((item, ii) => (
              <ProductPlanRow
                key={ii}
                item={item}
                products={products}
                takenProductIds={takenProductIds.filter((_, j) => j !== ii)}
                onUpdate={(updated) => onUpdateItem(planIndex, ii, updated)}
                onRemove={() => onRemoveItem(planIndex, ii)}
              />
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => onAddItem(planIndex)}
              disabled={products.length > 0 && takenProductIds.length >= products.length}
              sx={{ textTransform: 'none', color: '#6b7280', fontWeight: 500, mt: 0.5 }}
            >
              Add product
            </Button>
          </div>
        )}
      </div>
    </Paper>
  );
}

// ─── Result display components ─────────────────────────────────────────────────

function ProductResult({ prod }) {
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const fulfillColor = prod.actualMade >= prod.targetQuantity
    ? '#22c55e'
    : prod.actualMade > 0
    ? '#f59e0b'
    : '#ef4444';

  const selectedRecipe = prod.recipeBreakdown?.find((recipe) => recipe.recipeId === selectedRecipeId) ?? null;

  return (
    <>
      <div className="border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BuildOutlinedIcon sx={{ fontSize: 16, color: '#6b7280' }} />
            <span className="font-semibold text-gray-900 text-sm">{prod.productName}</span>
            {prod.unassemblable && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                {prod.reason}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Target: <strong className="text-gray-900">{prod.targetQuantity}</strong></span>
            <span>→</span>
            <span>Made: <strong style={{ color: fulfillColor }}>{prod.actualMade}</strong></span>
            {prod.shortfall > 0 && (
              <span className="text-red-500 font-semibold">({prod.shortfall} short)</span>
            )}
          </div>
        </div>

        {prod.chosenRecipes && prod.chosenRecipes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {prod.chosenRecipes.map((r) => (
              <button
                key={r.recipeId}
                type="button"
                onClick={() => setSelectedRecipeId(r.recipeId)}
                className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-800 border border-green-200 rounded-full px-2.5 py-0.5 font-medium hover:bg-green-100 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer group"
                title="Open recipe details"
              >
                <span>{r.recipeName}: {r.unitsMade} unit{r.unitsMade !== 1 ? 's' : ''}</span>
                <span aria-hidden="true" className="text-[10px] text-green-600 group-hover:translate-x-0.5 transition-transform">↗</span>
              </button>
            ))}
          </div>
        )}

      {prod.ingredients && prod.ingredients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Ingredient</th>
                <th className="text-left py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Size</th>
                <th className="text-right py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Available</th>
                <th className="text-right py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Consumed</th>
                <th className="text-right py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Stored</th>
              </tr>
            </thead>
            <tbody>
              {prod.ingredients.map((ing, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1.5 px-2 text-gray-700">{ing.categoryName ?? `Item Type ${ing.itemTypeId}`}</td>
                  <td className="py-1.5 px-2 text-gray-400">{ing.sizeClass === 'ALL' ? 'All' : (ing.sizeClass ?? '—')}</td>
                  <td className="py-1.5 px-2 text-right text-gray-600">{ing.qtyAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{ing.qtyConsumed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-semibold text-blue-600">
                    {ing.qtyLeftover.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

        <StyledModal
          open={Boolean(selectedRecipe)}
          onClose={() => setSelectedRecipeId(null)}
          title={selectedRecipe?.recipeName ?? 'Recipe details'}
          subtitle={selectedRecipe ? `Style: ${selectedRecipe.styleName ?? '—'} · ${selectedRecipe.unitsMade} unit${selectedRecipe.unitsMade !== 1 ? 's' : ''}` : undefined}
          maxWidth="md"
        >
          {selectedRecipe && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Ingredient</th>
                      <th className="text-left py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Size</th>
                      <th className="text-right py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Required / Unit</th>
                      <th className="text-right py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Consumed</th>
                      <th className="text-right py-1.5 px-2 text-gray-500 font-semibold uppercase tracking-wide">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 px-2 text-gray-700">{ing.categoryName ?? `Item Type ${ing.itemTypeId}`}</td>
                        <td className="py-1.5 px-2 text-gray-400">{ing.sizeClass === 'ALL' ? 'All' : (ing.sizeClass ?? '—')}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600">{Number(ing.quantityRequired).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{ing.qtyConsumed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600">{ing.qtyAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </StyledModal>
      </>
  );
}

function SchoolResultCard({ schoolResult, colorOffset }) {
  const [expanded, setExpanded] = useState(true);

  const fulfillmentPct = schoolResult.totalTargeted > 0
    ? Math.round((schoolResult.totalMade / schoolResult.totalTargeted) * 100)
    : 0;

  const statusColor = fulfillmentPct >= 90
    ? 'text-green-700 bg-green-50 border-green-200'
    : fulfillmentPct >= 50
    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-700 bg-red-50 border-red-200';

  return (
    <Paper elevation={0} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer"
        style={{ borderBottom: '1px solid #f3f4f6' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: PALETTE[colorOffset % PALETTE.length] }}
          >
            {schoolResult.school.schoolName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{schoolResult.school.schoolName}</p>
            <p className="text-xs text-gray-400">
              {schoolResult.products.length} product{schoolResult.products.length !== 1 ? 's' : ''} planned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusColor}`}>
            {schoolResult.totalMade} / {schoolResult.totalTargeted} made ({fulfillmentPct}%)
          </span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-6 py-5 space-y-6">
          {schoolResult.products.map((prod) => (
            <ProductResult key={prod.productId} prod={prod} />
          ))}

          {schoolResult.wasteSummary.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Stock Carried Forward — Available for Future Activities
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Size Class</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Available</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumed</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stored</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Used This Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolResult.wasteSummary.map((w, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-800">{w.categoryName ?? `Item Type ${w.itemTypeId}`}</td>
                        <td className="py-2 px-3 text-gray-500">{w.sizeClass === 'ALL' ? 'All sizes' : (w.sizeClass ?? '—')}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{w.qtyAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900">{w.qtyConsumed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-semibold text-blue-600">{w.qtyLeftover.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-gray-600 bg-gray-50 border-gray-200">
                            {w.utilizationPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Paper>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RepurposingPlannerPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Derive role synchronously on first render — avoids a setState-in-effect lint error
  const [role] = useState(() => getRoleFromSession() || 'UNKNOWN');
  const [schoolGroups, setSchoolGroups] = useState([]);
  // Start as false if we already know the user isn't an admin
  const [loadingProducts, setLoadingProducts] = useState(() => (getRoleFromSession() || 'UNKNOWN') === 'TCC_ADMIN');
  const [loadError, setLoadError] = useState(null);

  // Plan state: one card per school, each with its own product rows
  const [plansBySchool, setPlansBySchool] = useState([
    { schoolId: '', items: [{ productId: '', targetQuantity: '' }] },
  ]);

  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (role !== 'TCC_ADMIN') return;

    fetch(`/api/assembly/products`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        return res.json();
      })
      .then((body) => setSchoolGroups(body.data ?? []))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingProducts(false));
  }, [role]);

  // ── Plan handlers ──────────────────────────────────────────────────────
  const addSchool = useCallback(() => {
    setPlansBySchool((prev) => [...prev, { schoolId: '', items: [{ productId: '', targetQuantity: '' }] }]);
  }, []);

  const removeSchool = useCallback((si) => {
    setPlansBySchool((prev) => prev.filter((_, i) => i !== si));
  }, []);

  const updateSchool = useCallback((si, schoolId) => {
    // Reset product rows when school changes
    setPlansBySchool((prev) =>
      prev.map((s, i) => (i === si ? { schoolId, items: [{ productId: '', targetQuantity: '' }] } : s)),
    );
  }, []);

  const addItem = useCallback((si) => {
    setPlansBySchool((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: [...s.items, { productId: '', targetQuantity: '' }] } : s)),
    );
  }, []);

  const removeItem = useCallback((si, ii) => {
    setPlansBySchool((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s)),
    );
  }, []);

  const updateItem = useCallback((si, ii, updated) => {
    setPlansBySchool((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: s.items.map((it, j) => (j === ii ? updated : it)) } : s)),
    );
  }, []);

  // ── Calculate ──────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    setCalcError(null);

    const requests = plansBySchool
      .filter((plan) => plan.schoolId)
      .flatMap((plan) =>
        plan.items
          .filter((it) => it.productId && it.targetQuantity && Number(it.targetQuantity) >= 1)
          .map((it) => ({
            schoolId: Number(plan.schoolId),
            productId: Number(it.productId),
            targetQuantity: Number(it.targetQuantity),
          })),
      );

    if (requests.length === 0) {
      setCalcError('Please add at least one complete entry (school, product and target quantity).');
      return;
    }

    setCalculating(true);
    try {
      const res = await fetch(`/api/assembly/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Calculation failed (${res.status})`);
      }
      const body = await res.json();
      setResults(body.data ?? []);
    } catch (err) {
      setCalcError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  // ── Derived KPIs ───────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    if (!results) return null;
    const totalMade = results.reduce((s, sc) => s + sc.totalMade, 0);
    const totalTargeted = results.reduce((s, sc) => s + sc.totalTargeted, 0);
    const allWaste = results.flatMap((sc) => sc.wasteSummary);
    const totalLeftover = allWaste.reduce((s, w) => s + w.qtyLeftover, 0);
    const totalConsumed = allWaste.reduce((s, w) => s + w.qtyConsumed, 0);
    const overallUtil = (totalConsumed + totalLeftover) > 0
      ? Math.round((totalConsumed / (totalConsumed + totalLeftover)) * 100)
      : 0;
    return { totalMade, totalTargeted, totalLeftover, overallUtil };
  }, [results]);

  const barData = useMemo(() => {
    if (!results) return [];
    return results
      .flatMap((sc) => sc.products.map((p) => ({ name: `${p.productName} (${sc.school.schoolName})`, count: p.actualMade })))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [results]);

  const usedSchoolIds = plansBySchool.map((p) => p.schoolId).filter(Boolean);

  // ── Access guards ──────────────────────────────────────────────────────

  if (!mounted) {
    return null;
  }

  if (role === 'UNKNOWN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (role !== 'TCC_ADMIN') {
    return null;
  }

  return (
    <Box className="px-4 py-6 max-w-7xl mx-auto space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Repurposing Planner</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Plan how many uniform sets to pack per school from donated items — stock is sourced exclusively from each school&apos;s own collected inventory to minimise waste.
        </p>
      </div>

      {loadError && (
        <Paper elevation={0} className="border border-amber-200 bg-amber-50 rounded-2xl px-5 py-4">
          <p className="text-sm text-amber-700 font-semibold">Could not load product catalogue</p>
          <p className="text-xs text-amber-600 mt-0.5">{loadError}</p>
        </Paper>
      )}

      {/* KPI cards (shown after calculation) */}
      {kpiStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BuildOutlinedIcon} iconBg="#f0fdf4" label="Total Sets Packed" value={kpiStats.totalMade.toLocaleString()} sub={`target: ${kpiStats.totalTargeted}`} />
          <StatCard icon={CheckCircleOutlinedIcon} iconBg="#eff6ff" label="Fulfillment Rate" value={kpiStats.totalTargeted > 0 ? `${Math.round((kpiStats.totalMade / kpiStats.totalTargeted) * 100)}%` : '—'} sub={`${kpiStats.totalMade} of ${kpiStats.totalTargeted} units`} />
          <StatCard icon={Inventory2OutlinedIcon} iconBg="#faf5ff" label="Stock Used This Run" value={`${kpiStats.overallUtil}%`} sub="of available stock consumed" />
          <StatCard icon={Inventory2OutlinedIcon} iconBg="#dbeafe" label="Stored for Next Run" value={kpiStats.totalLeftover.toLocaleString(undefined, { maximumFractionDigits: 2 })} sub="whole items available for future activities" />
        </div>
      )}

      {/* Plan builder */}
      <Section
        title="Plan Repurposing"
        subtitle="Select a school, then add the uniform sets you want to pack from donated items. Each school draws only from its own collected stock — no cross-school mixing."
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={calculating ? <CircularProgress size={14} color="inherit" /> : <PlayArrowOutlinedIcon />}
            onClick={handleCalculate}
            disabled={calculating || loadingProducts}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 600, backgroundColor: '#69aa56', '&:hover': { backgroundColor: '#55923e' } }}
          >
            {calculating ? 'Calculating…' : 'Calculate'}
          </Button>
        }
      >
        {loadingProducts ? (
          <div className="space-y-3">
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          </div>
        ) : (
          <div className="space-y-4">
            {plansBySchool.map((plan, si) => (
              <SchoolPlanCard
                key={si}
                plan={plan}
                planIndex={si}
                schoolGroups={schoolGroups}
                usedSchoolIds={usedSchoolIds.filter((id) => id !== plan.schoolId)}
                onRemovePlan={removeSchool}
                onUpdateSchool={updateSchool}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onUpdateItem={updateItem}
              />
            ))}

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addSchool}
              disabled={schoolGroups.length > 0 && plansBySchool.length >= schoolGroups.length}
              sx={{ textTransform: 'none', color: '#6b7280', fontWeight: 500 }}
            >
              Add school
            </Button>

            {calcError && (
              <p className="text-sm text-red-500 font-medium">{calcError}</p>
            )}
          </div>
        )}
      </Section>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Repurposing Results</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Optimal allocation per school — expand each school to see ingredient usage and stock carried forward.
            </p>
          </div>
          {results.map((schoolResult, i) => (
            <SchoolResultCard key={schoolResult.school.id} schoolResult={schoolResult} colorOffset={i} />
          ))}
        </div>
      )}

      {results && barData.length > 0 && (
        <Section title="Sets Packed by Product" subtitle="Top 10 products across all schools">
          <BarChart data={barData} valueKey="count" labelKey="name" colorFn={(i) => PALETTE[i % PALETTE.length]} />
        </Section>
      )}

    </Box>
  );
}
