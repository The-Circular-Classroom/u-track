// @ts-nocheck
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Switch,
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SellIcon from '@mui/icons-material/Sell';
import RecyclingIcon from '@mui/icons-material/Recycling';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SchoolIcon from '@mui/icons-material/School';
import ScaleOutlinedIcon from '@mui/icons-material/ScaleOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getRoleFromSession } from '@/utils/auth';
import {
  MONTH_LABELS,
  STATUS_LABELS,
  aggregateInventoryRows,
  buildCircularityRows,
  buildCooperationSummary,
  buildDonationBreakdownSummary,
  buildDrivePerformanceSummary,
  buildMonthlySeries,
  buildNetworkKPIs,
  buildOverviewDriveParticipation,
  buildOverviewInventoryByCategory,
  buildOverviewInventoryBySchool,
  buildOverviewProductProjections,
  buildOverviewRepurposingByColour,
  buildOverviewYearlyTrend,
  buildProductSummary,
  buildRates,
  buildSchoolRankingRows,
  buildStockByLocationSummary,
  buildSustainabilitySummary,
  buildActiveDriveSummary,
  fetchAssemblyProducts,
  fetchCollectionActiveDrives,
  fetchCollectionCooperationAnalytics,
  fetchCollectionDonationBreakdown,
  fetchCollectionDrivePerformance,
  fetchCollectionFunnel,
  fetchCollectionInventoryCount,
  fetchCollectionMonthlyTrends,
  fetchCollectionSchoolRankings,
  fetchCollectionStockByLocation,
  fetchCollectionSustainability,
  fetchOverviewDriveParticipation,
  fetchOverviewInventoryByCategory,
  fetchOverviewInventoryBySchool,
  fetchOverviewKPITotals,
  fetchOverviewProductProjections,
  fetchOverviewRepurposingByColour,
  fetchOverviewYearlyTrend,
  flattenInventoryCount,
  getAnalyticsApiUrl,
  getCategoryOptions,
  getSchoolOptions,
  getSizeOptions,
  summariseInventory,
  summariseMonthlySeries,
} from '@/utils/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tcc-analytics-overview-settings';
const YEARLY_TREND_WINDOW = 5;

// Four core category colours — consistent across all charts
const CORE_COLORS = {
  schoolStock: '#639922',
  psg: '#378ADD',
  repurposing: '#BA7517',
  waste: '#888780',
};

const CHART_COLORS = ['#69aa56', '#3b82f6', '#f59e0b', '#14b8a6', '#8b5cf6', '#ec4899', '#f97316', '#64748b'];

const KPI_STYLES = {
  donated:   { icon: VolunteerActivismIcon,  bg: '#dcfce7', color: '#15803d' },
  sold:      { icon: SellIcon,               bg: '#fef3c7', color: '#b45309' },
  repurposed:{ icon: RecyclingIcon,          bg: '#ccfbf1', color: '#0f766e' },
  disposed:  { icon: DeleteOutlineIcon,      bg: '#f3f4f6', color: '#4b5563' },
  inventory: { icon: Inventory2OutlinedIcon, bg: '#dbeafe', color: '#1d4ed8' },
  schools:   { icon: SchoolIcon,             bg: '#ede9fe', color: '#6d28d9' },
  weight:    { icon: ScaleOutlinedIcon,      bg: '#fef3c7', color: '#b45309' },
  colour:    { icon: PaletteOutlinedIcon,    bg: '#fce7f3', color: '#9d174d' },
};

const CORE_CONFIG = [
  { key: 'schoolStock', label: 'For School', bg: 'bg-green-50', text: 'text-green-900', sub: 'text-green-600', border: 'border-green-200' },
  { key: 'psg', label: 'For PSG activities', bg: 'bg-blue-50', text: 'text-blue-900', sub: 'text-blue-600', border: 'border-blue-200' },
  { key: 'repurposing', label: 'For repurposing', bg: 'bg-amber-50', text: 'text-amber-900', sub: 'text-amber-600', border: 'border-amber-200' },
  { key: 'waste', label: 'For recycling/disposing', bg: 'bg-gray-100', text: 'text-gray-800', sub: 'text-gray-500', border: 'border-gray-300' },
];

const VIEW_OPTIONS = [
  { value: 'overview',    label: 'Executive' },
  { value: 'operations',  label: 'Operations' },
  { value: 'engagement',  label: 'Schools' },
  { value: 'repurposing', label: 'Repurposing' },
];

const SECTION_GROUPS = {
  overview: [
    'yearlyTrend',           // full width — time context
    'inventoryBySchool',     // full width — per school breakdown
    'inventoryByCategory',   // half — pieces by category
    'weightBreakdown',       // half — kg by category (pairs with above)
    'driveParticipation',    // full width — participation donut + school list
    'repurposingByColour',   // half — what colours are available
    'productProjections',    // half — what can be made (pairs with above)
  ],
  operations:  ['inventoryBreakdown', 'stockByLocation'],
  engagement:  ['schoolPerformance', 'cooperation', 'activeDrives', 'drivePerformance'],
  repurposing: ['repurposingCatalog', 'sustainability'],
};

const SECTION_LABELS = {
  yearlyTrend:         'Yearly trend',
  inventoryBySchool:   'Inventory by school',
  inventoryByCategory: 'Inventory by category',
  trends:              'Donation trends',
  donationBreakdown:   'Donation breakdown',
  circularity:         'Status breakdown',
  inventoryBreakdown:  'Inventory breakdown',
  stockByLocation:     'Stock by location',
  weightBreakdown:     'Weight breakdown',
  schoolPerformance:   'School performance',
  cooperation:         'Cooperation analytics',
  driveParticipation:  'Drive participation',
  activeDrives:        'Active drives',
  drivePerformance:    'Drive performance',
  repurposingByColour: 'Repurposing by colour',
  productProjections:  'Product projections',
  repurposingCatalog:  'Repurposing catalogue',
  sustainability:      'Sustainability',
};

const BREAKDOWN_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'size',     label: 'Size' },
  { value: 'status',   label: 'Status' },
  { value: 'school',   label: 'School' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 100000 ? 1 : 2,
  }).format(Number(value) || 0);
}

function getInitialSettings() {
  if (typeof window === 'undefined') return { view: 'overview', hiddenSections: {}, breakdown: 'category' };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      view: parsed.view || 'overview',
      hiddenSections: parsed.hiddenSections || {},
      breakdown: parsed.breakdown || 'category',
    };
  } catch {
    return { view: 'overview', hiddenSections: {}, breakdown: 'category' };
  }
}

// ─── UI Components ────────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, tone, imageSrc, imageAlt, secondaryValue }) {
  const style = KPI_STYLES[tone] ?? KPI_STYLES.inventory;
  const Icon = style.icon;
  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: style.bg }}>
          {imageSrc ? (
            <Image src={imageSrc} alt={imageAlt || 'Metric icon'} width={40} height={40} className="h-[40px] w-[40px] object-contain" />
          ) : (
            <Icon sx={{ fontSize: 22, color: style.color }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="text-xl font-bold leading-none text-gray-900">{value}</p>
          {secondaryValue ? <p className="mt-1 text-sm font-semibold text-gray-600">{secondaryValue}</p> : null}
          {subtitle ? <p className="mt-1 text-xs text-gray-400">{subtitle}</p> : null}
        </div>
      </div>
    </Paper>
  );
}

function MetricCardSkeleton() {
  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <Skeleton variant="rounded" width={56} height={56} />
        <div className="min-w-0 flex-1">
          <Skeleton variant="text" width="42%" height={18} />
          <Skeleton variant="text" width="58%" height={34} />
          <Skeleton variant="text" width="46%" height={20} />
          <Skeleton variant="text" width="62%" height={16} />
        </div>
      </div>
    </Paper>
  );
}

function HelpLabel({ label, tooltip }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      {tooltip ? (
        <MuiTooltip arrow title={<span className="text-xs">{tooltip}</span>}>
          <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.65 }} />
        </MuiTooltip>
      ) : null}
    </span>
  );
}

function SustainabilityStatCard({ title, valueKg, toneClass, tooltip }) {
  return (
    <div className={`rounded-xl p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide"><HelpLabel label={title} tooltip={tooltip} /></p>
      <p className="mt-2 break-words text-xl font-bold leading-tight sm:text-2xl">{formatCompactNumber(valueKg)} kg</p>
      <p className="mt-1 text-xs opacity-75">{Number(valueKg).toLocaleString()} kg exact</p>
    </div>
  );
}

function RateChip({ label, value, description, formula, color, bg }) {
  return (
    <MuiTooltip arrow title={<div className="space-y-1"><p className="text-xs font-semibold">{label}</p><p className="text-xs">{description}</p><p className="text-xs opacity-80">Formula: {formula}</p></div>}>
      <button type="button" className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: bg, color }}>
        <span>{label} {value}%</span>
        <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.75 }} />
      </button>
    </MuiTooltip>
  );
}

function SectionShell({ title, subtitle, action, children }) {
  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.82rem', mt: 0.5 }}>{subtitle}</Typography>
        </div>
        {action}
      </div>
      {children}
    </Paper>
  );
}

function SelectField({ label, value, onChange, options, width = 180 }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <Select size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: width, backgroundColor: 'white', fontSize: '0.875rem' }}>
        {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </Select>
    </div>
  );
}

function EmptyCard({ title, body, action }) {
  return (
    <Paper elevation={0} className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
      <p className="text-base font-semibold text-gray-700">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Paper>
  );
}

function SectionSkeleton({ height = 280 }) {
  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5">
        <Skeleton variant="text" width="28%" height={26} />
        <Skeleton variant="text" width="52%" height={18} />
      </div>
      <Skeleton variant="rounded" height={height} />
    </Paper>
  );
}

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-semibold text-gray-700">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey || entry.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}</span>
            <span className="ml-auto font-semibold text-gray-800">{Number(entry.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoreLegend() {
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {[
        { key: 'schoolStock', label: 'School stock' },
        { key: 'psg',         label: 'For PSG activities' },
        { key: 'repurposing', label: 'For Repurposing' },
        { key: 'waste',       label: 'For Recycling/Disposal' },
      ].map((item) => (
        <span key={item.key} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: CORE_COLORS[item.key] }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Table({ columns, rows, emptyText = 'No data available.' }) {
  if (!rows.length) return <p className="py-6 text-sm text-gray-400">{emptyText}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-0">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.id ?? row.schoolName ?? row.categoryName ?? ''}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-3 text-gray-700 first:pl-0">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function truncateLabel(str, maxLength = 15) {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverallAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const analyticsApiUrl = getAnalyticsApiUrl();
  const currentYear = new Date().getFullYear();
  const initialSettings = useMemo(() => getInitialSettings(), []);
  const router = useRouter();

  const [role] = useState(() => getRoleFromSession() || 'UNKNOWN');

  useEffect(() => {
    if (role !== 'UNKNOWN' && role !== 'TCC_ADMIN') {
      router.replace('/analytics/school');
    }
  }, [role, router]);

  // Filter state
  const [year, setYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [selectedSchoolId, setSelectedSchoolId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // View / layout state
  const [selectedView, setSelectedView] = useState(initialSettings.view);
  const [inventoryBreakdown, setInventoryBreakdown] = useState(initialSettings.breakdown);
  const [donationBreakdownView, setDonationBreakdownView] = useState('category');
  const [trendView, setTrendView] = useState('monthly');
  const [hiddenSections, setHiddenSections] = useState(initialSettings.hiddenSections);
  const [showCustomize, setShowCustomize] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [hoveredSchool, setHoveredSchool] = useState(null);
  const [yearlyTrendData, setYearlyTrendData] = useState({ years: [] });

  // Loading / error
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [snapshotErrors, setSnapshotErrors] = useState([]);
  const [periodErrors, setPeriodErrors] = useState([]);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState({
    // existing endpoints
    inventoryCount: [],
    schoolRankings: { schools: [] },
    activeDrives: { drives: [] },
    drivePerformance: { drives: [] },
    donationBreakdown: { schools: [] },
    stockByLocation: { schools: [] },
    cooperationAnalytics: { groups: [] },
    sustainability: { summary: {}, categories: [] },
    funnel: { schools: [] },
    monthlyTrends: { monthly: [], schools: [] },
    assemblyProducts: null,
    // new overview endpoints
    networkKPIs: null,
    overviewBySchool: [],
    overviewByCategory: [],
    driveParticipation: null,
    allTimeDriveParticipation: null,
    repurposingByColour: null,
    productProjections: null,
  });

  // Persist layout settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ view: selectedView, hiddenSections, breakdown: inventoryBreakdown }));
  }, [hiddenSections, inventoryBreakdown, selectedView]);

  // ── Data fetching ───────────────────────────────────────────────────────────

  // Snapshot effect — data that does NOT change with year/month/school filters.
  // Controls the Inventory Overview section's loading state.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!cancelled) setLoadingSnapshot(true);

      const startYear = currentYear - YEARLY_TREND_WINDOW + 1;
      fetchOverviewYearlyTrend(analyticsApiUrl, { startYear, endYear: currentYear })
        .then((data) => setYearlyTrendData(data))
        .catch(() => setYearlyTrendData({ years: [] }));

      const requests = [
        ['inventoryCount',            fetchCollectionInventoryCount(analyticsApiUrl)],
        ['networkKPIs',               fetchOverviewKPITotals(analyticsApiUrl)],
        ['overviewBySchool',          fetchOverviewInventoryBySchool(analyticsApiUrl)],
        ['overviewByCategory',        fetchOverviewInventoryByCategory(analyticsApiUrl)],
        ['allTimeDriveParticipation', fetchOverviewDriveParticipation(analyticsApiUrl, {})],
        ['repurposingByColour',       fetchOverviewRepurposingByColour(analyticsApiUrl)],
        ['productProjections',        fetchOverviewProductProjections(analyticsApiUrl)],
      ];

      if (role === 'TCC_ADMIN') {
        requests.push(['assemblyProducts', fetchAssemblyProducts(analyticsApiUrl)]);
      }

      const settled = await Promise.allSettled(requests.map(([, p]) => p));
      if (cancelled) return;

      const nextState = {};
      const nextErrors = [];
      settled.forEach((result, i) => {
        const key = requests[i][0];
        if (result.status === 'fulfilled') nextState[key] = result.value;
        else nextErrors.push(`${key}: ${result.reason?.message ?? 'Request failed'}`);
      });

      setAnalyticsData((prev) => ({ ...prev, ...nextState }));
      setSnapshotErrors(nextErrors);
      setLoadingSnapshot(false);
      setHasLoadedOnce(true);
    }

    run();
    return () => { cancelled = true; };
  }, [analyticsApiUrl, currentYear, role, refreshIndex]);

  // Period effect — data that changes with year/month/school filters.
  // Controls the Period Activity section's loading state.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const schoolId = selectedSchoolId === 'all' ? '' : selectedSchoolId;
      if (!cancelled) setLoadingPeriod(true);

      const requests = [
        ['schoolRankings',       fetchCollectionSchoolRankings(analyticsApiUrl, { year, metric: 'recovery' })],
        ['activeDrives',         fetchCollectionActiveDrives(analyticsApiUrl, { schoolId })],
        ['drivePerformance',     fetchCollectionDrivePerformance(analyticsApiUrl, { year, schoolId, startMonth, endMonth })],
        ['donationBreakdown',    fetchCollectionDonationBreakdown(analyticsApiUrl, { year, schoolId, startMonth, endMonth })],
        ['stockByLocation',      fetchCollectionStockByLocation(analyticsApiUrl, { schoolId })],
        ['cooperationAnalytics', fetchCollectionCooperationAnalytics(analyticsApiUrl, { year })],
        ['sustainability',       fetchCollectionSustainability(analyticsApiUrl, { year, schoolId })],
        ['funnel',               fetchCollectionFunnel(analyticsApiUrl, { year, schoolId })],
        ['monthlyTrends',        fetchCollectionMonthlyTrends(analyticsApiUrl, { year, schoolId })],
        ['driveParticipation',   fetchOverviewDriveParticipation(analyticsApiUrl, { year })],
      ];

      const settled = await Promise.allSettled(requests.map(([, p]) => p));
      if (cancelled) return;

      const nextState = {};
      const nextErrors = [];
      settled.forEach((result, i) => {
        const key = requests[i][0];
        if (result.status === 'fulfilled') nextState[key] = result.value;
        else nextErrors.push(`${key}: ${result.reason?.message ?? 'Request failed'}`);
      });

      setAnalyticsData((prev) => ({ ...prev, ...nextState }));
      setPeriodErrors(nextErrors);
      setLoadingPeriod(false);
    }

    run();
    return () => { cancelled = true; };
  }, [analyticsApiUrl, year, startMonth, endMonth, selectedSchoolId, role, refreshIndex]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const inventoryRows = useMemo(() => flattenInventoryCount(analyticsData.inventoryCount), [analyticsData.inventoryCount]);
  const schoolOptions = useMemo(() => getSchoolOptions(inventoryRows, analyticsData.funnel?.schools ?? [], analyticsData.assemblyProducts ?? []), [analyticsData.assemblyProducts, analyticsData.funnel?.schools, inventoryRows]);
  const categoryOptions = useMemo(() => getCategoryOptions(inventoryRows), [inventoryRows]);
  const sizeOptions = useMemo(() => getSizeOptions(inventoryRows), [inventoryRows]);

  const dimensionFilteredRows = useMemo(() => aggregateInventoryRows(inventoryRows, { schoolId: selectedSchoolId === 'all' ? '' : selectedSchoolId, category: selectedCategory, size: selectedSize, status: 'all' }), [inventoryRows, selectedCategory, selectedSchoolId, selectedSize]);
  const statusFilteredRows = useMemo(() => aggregateInventoryRows(inventoryRows, { schoolId: selectedSchoolId === 'all' ? '' : selectedSchoolId, category: selectedCategory, size: selectedSize, status: selectedStatus }), [inventoryRows, selectedCategory, selectedSchoolId, selectedSize, selectedStatus]);

  const inventorySummary = useMemo(() => summariseInventory(statusFilteredRows, selectedStatus), [selectedStatus, statusFilteredRows]);
  const inventoryStatusSummary = useMemo(() => summariseInventory(dimensionFilteredRows, 'all'), [dimensionFilteredRows]);

  const monthlySeries = useMemo(() => buildMonthlySeries(analyticsData.monthlyTrends?.monthly ?? [], { startMonth, endMonth }), [analyticsData.monthlyTrends?.monthly, endMonth, startMonth]);
  const periodTotals = useMemo(() => summariseMonthlySeries(monthlySeries), [monthlySeries]);
  const periodRates = useMemo(() => buildRates(periodTotals), [periodTotals]);

  // New overview data
  const networkKPIs = useMemo(() => buildNetworkKPIs(analyticsData.networkKPIs), [analyticsData.networkKPIs]);
  const networkInventoryOverview = useMemo(() => {
    const totalPieces = networkKPIs.totalPieces || 0;
    const getPercentage = (value) => (totalPieces > 0 ? Number(((value / totalPieces) * 100).toFixed(1)) : 0);

    return {
      ...networkKPIs,
      percentages: {
        schoolStock: getPercentage(networkKPIs.schoolStock),
        psg: getPercentage(networkKPIs.psg),
        repurposing: getPercentage(networkKPIs.repurposing),
        waste: getPercentage(networkKPIs.waste),
      },
    };
  }, [networkKPIs]);
  const yearlyTrendRows = useMemo(() => buildOverviewYearlyTrend(yearlyTrendData), [yearlyTrendData]);
  const overviewBySchool = useMemo(() => buildOverviewInventoryBySchool(analyticsData.overviewBySchool), [analyticsData.overviewBySchool]);
  const overviewByCategory = useMemo(() => buildOverviewInventoryByCategory(analyticsData.overviewByCategory), [analyticsData.overviewByCategory]);
  const driveParticipation = useMemo(() => buildOverviewDriveParticipation(analyticsData.driveParticipation), [analyticsData.driveParticipation]);
  const allTimeDriveParticipation = useMemo(() => buildOverviewDriveParticipation(analyticsData.allTimeDriveParticipation), [analyticsData.allTimeDriveParticipation]);
  const repurposingByColour = useMemo(() => buildOverviewRepurposingByColour(analyticsData.repurposingByColour), [analyticsData.repurposingByColour]);
  const productProjections = useMemo(() => buildOverviewProductProjections(analyticsData.productProjections), [analyticsData.productProjections]);

  const schoolRankingRows = useMemo(() => buildSchoolRankingRows(analyticsData.schoolRankings), [analyticsData.schoolRankings]);
  const circularityTotals = useMemo(() => buildCircularityRows(analyticsData.funnel?.schools ?? [], selectedSchoolId === 'all' ? '' : selectedSchoolId), [analyticsData.funnel?.schools, selectedSchoolId]);
  const activeDriveSummary = useMemo(() => buildActiveDriveSummary(analyticsData.activeDrives), [analyticsData.activeDrives]);
  const stockByLocationRows = useMemo(() => buildStockByLocationSummary(analyticsData.stockByLocation, selectedSchoolId === 'all' ? '' : selectedSchoolId), [analyticsData.stockByLocation, selectedSchoolId]);
  const cooperationGroups = useMemo(() => buildCooperationSummary(analyticsData.cooperationAnalytics), [analyticsData.cooperationAnalytics]);
  const donationBreakdownSummary = useMemo(() => buildDonationBreakdownSummary(analyticsData.donationBreakdown, selectedSchoolId === 'all' ? '' : selectedSchoolId), [analyticsData.donationBreakdown, selectedSchoolId]);
  const drivePerformanceSummary = useMemo(() => buildDrivePerformanceSummary(analyticsData.drivePerformance), [analyticsData.drivePerformance]);
  const sustainabilitySummary = useMemo(() => buildSustainabilitySummary(analyticsData.sustainability), [analyticsData.sustainability]);
  const productSummary = useMemo(() => buildProductSummary(analyticsData.assemblyProducts ?? [], selectedSchoolId === 'all' ? '' : selectedSchoolId), [analyticsData.assemblyProducts, selectedSchoolId]);

  const selectedSchoolLabel = useMemo(() => schoolOptions.find((s) => s.id === String(selectedSchoolId))?.label ?? 'All schools', [schoolOptions, selectedSchoolId]);
  const networkPiecesDonutData = useMemo(() => (
    CORE_CONFIG.map((cfg) => ({
      name: cfg.label,
      value: networkInventoryOverview[cfg.key],
      color: CORE_COLORS[cfg.key],
    })).filter((item) => item.value > 0)
  ), [networkInventoryOverview]);
  const networkWeightDonutData = useMemo(() => {
    const total = networkInventoryOverview.totalPieces || 0;
    return CORE_CONFIG.map((cfg) => ({
      name: cfg.label,
      value: total > 0
        ? Number(((networkInventoryOverview[cfg.key] / total) * networkInventoryOverview.totalWeightKg).toFixed(2))
        : 0,
      color: CORE_COLORS[cfg.key],
    })).filter((item) => item.value > 0);
  }, [networkInventoryOverview]);
  const snapshotYearRangeLabel = useMemo(() => {
    const years = yearlyTrendRows
      .map((entry) => Number(entry.year))
      .filter((value) => Number.isFinite(value));

    if (!years.length) return '';

    const earliestYear = Math.min(...years);
    const latestYear = Math.max(...years);

    return earliestYear === latestYear
      ? String(earliestYear)
      : `${earliestYear} to ${latestYear}`;
  }, [yearlyTrendRows]);

  const breakdownRows = useMemo(() => {
    const source =
      inventoryBreakdown === 'category' ? inventorySummary.byCategory :
      inventoryBreakdown === 'size'     ? inventorySummary.bySize :
      inventoryBreakdown === 'school'   ? inventorySummary.bySchool :
                                         inventoryStatusSummary.byStatus;
    return source.slice(0, 10).map((row, i) => ({ ...row, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [inventoryBreakdown, inventoryStatusSummary.byStatus, inventorySummary.byCategory, inventorySummary.bySchool, inventorySummary.bySize]);

  const donationBreakdownRows = useMemo(() => {
    const source =
      donationBreakdownView === 'size'   ? donationBreakdownSummary.sizes :
      donationBreakdownView === 'school' ? donationBreakdownSummary.schoolRows.map((s) => ({
        label: s.schoolName,   // ← truncation applied below
        value: s.totalQuantity,
      })) :
      donationBreakdownSummary.categories;
  
    return source.slice(0, 10).map((row, i) => ({
      ...row,
      label: truncateLabel(row.label, 15),  // ← truncate here
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [donationBreakdownSummary, donationBreakdownView]);

  const displayedDonationStats = useMemo(() => {
    if (!hoveredSchool || donationBreakdownView !== 'school') {
      return {
        quantity: donationBreakdownSummary.totalQuantity,
        weightKg: donationBreakdownSummary.totalEstimatedWeightKg,
        label: null,
      };
    }
  
    // Find the matching school row by truncated label or schoolName
    const match = donationBreakdownSummary.schoolRows.find(
      (s) => truncateLabel(s.schoolName, 15) === hoveredSchool ||
             s.schoolName === hoveredSchool
    );
  
    return match
      ? { quantity: match.totalQuantity, weightKg: match.totalEstimatedWeightKg, label: match.schoolName }
      : { quantity: donationBreakdownSummary.totalQuantity, weightKg: donationBreakdownSummary.totalEstimatedWeightKg, label: null };
  }, [hoveredSchool, donationBreakdownView, donationBreakdownSummary]);

  const circularityChartData = useMemo(() => [
    { name: 'For sale',         value: circularityTotals.currentForSale,      color: '#f59e0b' },
    { name: 'Sold',             value: circularityTotals.sold,                 color: '#eab308' },
    { name: 'For repurpose',    value: circularityTotals.currentForRepurpose,  color: '#3b82f6' },
    { name: 'General office',   value: inventoryStatusSummary.byStatus.find((e) => e.label === 'General Office')?.value ?? 0, color: '#94a3b8' },
    { name: 'Repurposed',       value: circularityTotals.repurposed,           color: '#14b8a6' },
    { name: 'Disposed',         value: circularityTotals.disposed,             color: '#6b7280' },
  ].filter((item) => item.value > 0), [circularityTotals, inventoryStatusSummary.byStatus]);

  const rateChips = useMemo(() => [
    { key: 'resold',      label: 'Resold rate',     value: periodRates.sellThroughRate, description: 'Share of donated items sold.', formula: 'sold / donated', color: '#854d0e', bg: '#fef3c7' },
    { key: 'repurposed',  label: 'Repurposed rate', value: periodRates.repurposeRate,   description: 'Share of donated items repurposed.', formula: 'repurposed / donated', color: '#115e59', bg: '#ccfbf1' },
    { key: 'recovered',   label: 'Recovered rate',  value: periodRates.recoveryRate,    description: 'Share kept in circular use.', formula: '(sold + repurposed) / donated', color: '#1d4ed8', bg: '#dbeafe' },
    { key: 'disposal',    label: 'Disposal rate',   value: periodRates.disposalRate,    description: 'Share that ended up disposed.', formula: 'disposed / (sold + repurposed + disposed)', color: '#4b5563', bg: '#f3f4f6' },
  ], [periodRates]);

  const snapshotHighlights = useMemo(() => [
    {
      title: 'Participating Schools',
      value: allTimeDriveParticipation.participatingCount.toLocaleString(),
      subtitle: `${allTimeDriveParticipation.totalSchools.toLocaleString()} total schools with donated history across all years`,
      tone: 'schools',
    },
    {
      title: 'Drives',
      value: allTimeDriveParticipation.schools.reduce((sum, school) => sum + school.driveCount, 0).toLocaleString(),
      subtitle: `${activeDriveSummary.totalQuantity.toLocaleString()} items in collection • ${activeDriveSummary.count.toLocaleString()} active drives`,
      tone: 'inventory',
    },
  ], [activeDriveSummary.count, activeDriveSummary.totalQuantity, allTimeDriveParticipation.participatingCount, allTimeDriveParticipation.schools, allTimeDriveParticipation.totalSchools]);

  const kpis = useMemo(() => [
    { title: 'Collected By Schools', value: periodTotals.donated.toLocaleString(), subtitle: `${MONTH_LABELS[startMonth - 1]} to ${MONTH_LABELS[endMonth - 1]} ${year}`, tone: 'donated', secondaryValue: `${periodTotals.donatedKg.toLocaleString()} kg` },
    { title: 'Used By PSG', value: periodTotals.sold.toLocaleString(), subtitle: 'Processed through resale or redistribution', tone: 'sold', secondaryValue: `${periodTotals.soldKg.toLocaleString()} kg` },
    { title: 'Repurposed', value: periodTotals.repurposed.toLocaleString(), subtitle: 'Used for new products', tone: 'repurposed', imageSrc: '/images/Logo-Symbol-green-stem.png', imageAlt: 'Repurposed logo', secondaryValue: `${periodTotals.repurposedKg.toLocaleString()} kg` },
    { title: 'Disposed', value: periodTotals.disposed.toLocaleString(), subtitle: 'Processed end-of-life items', tone: 'disposed', secondaryValue: `${periodTotals.disposedKg.toLocaleString()} kg` },
    { title: <HelpLabel label="Diverted weight" tooltip="Weight kept out of waste through resale or repurposing." />, value: `${sustainabilitySummary.divertedKg.toLocaleString()} kg`, subtitle: `${sustainabilitySummary.diversionRate}% waste diversion rate`, tone: 'repurposed' },
  ], [endMonth, periodTotals, startMonth, sustainabilitySummary, year]);

  const availableSections = useMemo(() =>
    SECTION_GROUPS[selectedView]
      .filter((key) => !(key === 'repurposingCatalog' && role !== 'TCC_ADMIN'))
      .filter((key) => !hiddenSections[key]),
    [hiddenSections, role, selectedView]);

  const loading = loadingSnapshot || loadingPeriod;
  const partialErrors = [...snapshotErrors, ...periodErrors];
  const showFullPageLoading = loading && !hasLoadedOnce;
  const showOverviewLoading = loadingSnapshot;

  function toggleSection(key) { setHiddenSections((c) => ({ ...c, [key]: !c[key] })); }

  // ── Section content ─────────────────────────────────────────────────────────

  const sectionContent = {

    // ── yearlyTrend ──────────────────────────────────────────────────────────
    yearlyTrend: (
      <SectionShell title="Yearly donation trend" subtitle={`Donation, sale, recyclable, and disposal volumes across the last ${YEARLY_TREND_WINDOW} years.`}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearlyTrendRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="donated"    name="Donated"    stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sold"       name="Sold"       stroke="#f59e0b" strokeWidth={2}   dot={{ r: 3 }} />
              <Line type="monotone" dataKey="repurposed" name="Repurposed" stroke="#14b8a6" strokeWidth={2}   dot={{ r: 3 }} />
              <Line type="monotone" dataKey="disposed"   name="Disposed"   stroke="#9ca3af" strokeWidth={2}   dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),

    // ── inventoryBySchool ────────────────────────────────────────────────────
    inventoryBySchool: (
      <SectionShell title="Inventory by school" subtitle="Current stock per school split into the four core categories.">
        <CoreLegend />
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {overviewBySchool.slice(0, 20).map((school) => {
            const total = school.totalPieces || 1;
            return (
              <div key={school.schoolId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-40 truncate shrink-0 text-right">{school.schoolName}</span>
                <div className="flex-1 h-5 rounded overflow-hidden flex">
                  {['schoolStock', 'psg', 'repurposing', 'waste'].map((key) => {
                    const pct = ((school[key] / total) * 100).toFixed(1);
                    return school[key] > 0 ? (
                      <MuiTooltip key={key} title={`${SECTION_LABELS[key] ?? key}: ${school[key].toLocaleString()}`}>
                        <div style={{ width: `${pct}%`, background: CORE_COLORS[key] }} />
                      </MuiTooltip>
                    ) : null;
                  })}
                </div>
                <span className="text-xs font-semibold text-gray-800 w-12 text-right shrink-0">{school.totalPieces.toLocaleString()}</span>
              </div>
            );
          })}
          {overviewBySchool.length === 0 && <p className="text-sm text-gray-400 py-6">No inventory data available.</p>}
        </div>
      </SectionShell>
    ),

    // ── inventoryByCategory ──────────────────────────────────────────────────
    inventoryByCategory: (
      <SectionShell title="Inventory by category" subtitle="Total pieces per item category split into the four core categories.">
        <CoreLegend />
        <div style={{ height: Math.max(240, overviewByCategory.length * 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overviewByCategory.slice(0, 12)} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="categoryName" type="category" width={130} tick={{ fontSize: 11 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Bar dataKey="schoolStock" name="School stock"   stackId="a" fill={CORE_COLORS.schoolStock} />
              <Bar dataKey="psg"         name="For PSG activities" stackId="a" fill={CORE_COLORS.psg} />
              <Bar dataKey="repurposing" name="For repurposing"stackId="a" fill={CORE_COLORS.repurposing} />
              <Bar dataKey="waste"       name="For Recycling/Disposal"  stackId="a" fill={CORE_COLORS.waste} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),

    // ── trends (existing) ────────────────────────────────────────────────────
    trends: (
      <SectionShell
        title="Monthly donation trends"
        subtitle="Donated, sold, repurposed, and disposed volume across the selected reporting window."
        action={<Chip label={selectedSchoolLabel} size="small" />}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="donated"    name="Donated"    stroke="#22c55e" strokeWidth={3}   dot={false} />
              <Line type="monotone" dataKey="sold"       name="Sold"       stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="repurposed" name="Repurposed" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="disposed"   name="Disposed"   stroke="#6b7280" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),

    // ── donationBreakdown (existing) ─────────────────────────────────────────
    donationBreakdown: (
      <SectionShell
        title="Donation breakdown"
        subtitle="Donation inflow grouped by category, size, or top-contributing school."
        action={
          <div className="flex flex-wrap gap-2">
            {[{ value: 'category', label: 'Category' }, { value: 'size', label: 'Size' }, { value: 'school', label: 'School' }].map((o) => (
              <Button key={o.value} size="small" variant={donationBreakdownView === o.value ? 'contained' : 'outlined'} onClick={() => setDonationBreakdownView(o.value)} sx={{ textTransform: 'none', borderRadius: '999px' }}>{o.label}</Button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">
          <div className="rounded-xl bg-lime-50 p-4 transition-all duration-150">
            <p className="text-xs uppercase tracking-wide text-lime-700">
              {displayedDonationStats.label ? 'Donated units' : 'Donated units — all schools'}
            </p>
            {displayedDonationStats.label && (
              <p className="text-xs text-lime-600 mt-0.5 truncate">{displayedDonationStats.label}</p>
            )}
            <p className="mt-2 text-2xl font-bold text-lime-900">
              {displayedDonationStats.quantity.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 transition-all duration-150">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              {displayedDonationStats.label ? 'Estimated weight' : 'Estimated weight — all schools'}
            </p>
            {displayedDonationStats.label && (
              <p className="text-xs text-emerald-600 mt-0.5 truncate">{displayedDonationStats.label}</p>
            )}
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {displayedDonationStats.weightKg.toLocaleString()} kg
            </p>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={donationBreakdownRows}
              layout="vertical"
              margin={{ left: 16, right: 16 }}
              onMouseMove={(state) => {
                if (state.isTooltipActive && state.activePayload?.[0]) {
                  setHoveredSchool(state.activePayload[0].payload.label);
                }
              }}
              onMouseLeave={() => setHoveredSchool(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="label" type="category" width={150} tick={{ fontSize: 12 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Bar dataKey="value" radius={[4, 16, 16, 4]}>
                {donationBreakdownRows.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),

    // ── circularity (existing) ───────────────────────────────────────────────
    circularity: (
      <SectionShell title="Status breakdown" subtitle="On-hand statuses reflect current inventory. Sold, repurposed, disposed follow the selected year.">
        {circularityChartData.length ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={circularityChartData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={108} paddingAngle={2}>
                    {circularityChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<DashboardTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {circularityChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                  <span className="ml-auto text-sm font-semibold text-gray-900">{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="py-10 text-sm text-gray-400">No outcome data available for the selected filters.</p>}
      </SectionShell>
    ),

    // ── inventoryBreakdown (existing) ────────────────────────────────────────
    inventoryBreakdown: (
      <SectionShell
        title="Inventory breakdown"
        subtitle="Switch between category, size, school, and status breakdowns."
        action={
          <div className="flex flex-wrap gap-2">
            {BREAKDOWN_OPTIONS.map((o) => (
              <Button key={o.value} size="small" variant={inventoryBreakdown === o.value ? 'contained' : 'outlined'} onClick={() => setInventoryBreakdown(o.value)} sx={{ textTransform: 'none', borderRadius: '999px' }}>{o.label}</Button>
            ))}
          </div>
        }
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownRows} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>{breakdownRows.map((e) => <Cell key={e.label} fill={e.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),

    // ── stockByLocation (existing) ───────────────────────────────────────────
    stockByLocation: (
      <SectionShell title="Stock by location" subtitle="Current stock grouped by School, Sponsor office, and Exited.">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockByLocationRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Bar dataKey="value" name="Units" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),

    // ── weightBreakdown (new) ────────────────────────────────────────────────
    weightBreakdown: (
      <SectionShell title="Weight breakdown" subtitle="Estimated kg split across the four core categories.">
        <div className="mb-4 flex items-center justify-center gap-4">
          <div className="text-center"><p className="text-3xl font-bold text-gray-900">{networkKPIs.totalWeightKg.toLocaleString()} kg</p><p className="text-xs text-gray-400 mt-1">total weight</p></div>
        </div>
        <div className="space-y-3">
          {[
            { key: 'schoolStock', label: 'School stock',     value: overviewBySchool.reduce((s, r) => s + r.schoolStock, 0) },
        { key: 'psg',         label: 'For PSG activities',   value: overviewBySchool.reduce((s, r) => s + r.psg, 0) },
            { key: 'repurposing', label: 'For Repurposing',  value: overviewBySchool.reduce((s, r) => s + r.repurposing, 0) },
            { key: 'waste',       label: 'For Recycling/Disposal',    value: overviewBySchool.reduce((s, r) => s + r.waste, 0) },
          ].map((item) => {
            const total = networkKPIs.totalPieces || 1;
            const pct = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 shrink-0">{item.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CORE_COLORS[item.key] }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-16 text-right shrink-0">{item.value.toLocaleString()} pcs</span>
              </div>
            );
          })}
        </div>
      </SectionShell>
    ),

    // ── schoolPerformance (existing) ─────────────────────────────────────────
    schoolPerformance: (
      <SectionShell title="School participation and contribution" subtitle="School ranking based on recovered items.">
        <Table
          columns={[
            { key: 'rank', label: 'Rank' },
            { key: 'schoolName', label: 'School' },
            { key: 'donated', label: 'Donated', render: (v) => <span className="font-semibold">{v.toLocaleString()}</span> },
            { key: 'sold', label: 'Sold', render: (v) => v.toLocaleString() },
            { key: 'repurposed', label: 'Repurposed', render: (v) => v.toLocaleString() },
            { key: 'recoveryRate', label: 'Recovery', render: (v) => `${v}%` },
            { key: 'redistributionRate', label: 'Sell Through', render: (v) => `${v}%` },
            { key: 'deviationFromAverage', label: 'vs Avg', render: (v) => `${v}%` },
          ]}
          rows={schoolRankingRows}
          emptyText="No school ranking data available."
        />
      </SectionShell>
    ),

    // ── cooperation (existing) ───────────────────────────────────────────────
    cooperation: (
      <SectionShell title="Cooperation analytics" subtitle="Compare cooperating and non-cooperating schools.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cooperationGroups.map((group) => (
            <div key={group.label} className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-base font-semibold text-gray-900">{group.label}</p>
                <Chip label={`${group.schoolCount} schools`} size="small" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-400">Donated</p><p className="font-semibold">{group.donated.toLocaleString()} / {group.donatedKg.toLocaleString()} kg</p></div>
                <div><p className="text-gray-400">Recovered</p><p className="font-semibold">{group.recovered.toLocaleString()} / {group.recoveredKg.toLocaleString()} kg</p></div>
                <div><p className="text-gray-400">Recovery rate</p><p className="font-semibold">{group.recoveryRate}%</p></div>
                <div><p className="text-gray-400">Disposal rate</p><p className="font-semibold">{group.disposalRate}%</p></div>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>
    ),

    // ── driveParticipation (new) ─────────────────────────────────────────────
    driveParticipation: (
      <SectionShell title="Donation drive participation" subtitle={`Schools running drives out of ${driveParticipation.totalSchools} total.`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Donut */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ value: driveParticipation.participatingCount }, { value: driveParticipation.nonParticipatingCount }]} dataKey="value" innerRadius={48} outerRadius={68} startAngle={90} endAngle={-270} paddingAngle={2}>
                    <Cell fill={CORE_COLORS.schoolStock} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{driveParticipation.participatingCount}</span>
                <span className="text-xs text-gray-400">of {driveParticipation.totalSchools}</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">{driveParticipation.participationRate}% participation</p>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CORE_COLORS.schoolStock }} />Participating</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200" />Not yet</span>
            </div>
          </div>
          {/* School list */}
          <div className="max-h-[280px] overflow-y-auto">
            <Table
              columns={[
                { key: 'schoolName', label: 'School' },
                { key: 'driveCount', label: 'Drives', render: (v) => v },
                { key: 'drives', label: 'Status', render: (drives) => {
                  const hasActive = drives.some((d) => d.isActive);
                  return (
                    <Chip
                      label={hasActive ? 'Active' : 'Completed'}
                      size="small"
                      color={hasActive ? undefined : 'default'}
                      sx={hasActive ? { backgroundColor: '#69aa56', color: '#fff', fontWeight: 600 } : undefined}
                    />
                  );
                }},
              ]}
              rows={driveParticipation.schools}
              emptyText="No schools have run donation drives for this year."
            />
          </div>
        </div>
      </SectionShell>
    ),

    // ── activeDrives (existing) ──────────────────────────────────────────────
    activeDrives: (
      <SectionShell title="Active donation drives" subtitle="Live drive performance — items, weight, and days remaining." action={<Chip icon={<EventAvailableOutlinedIcon />} label={`${activeDriveSummary.count} active`} size="small" />}>
        <Table
          columns={[
            { key: 'driveName', label: 'Drive' },
            { key: 'schoolName', label: 'School' },
            { key: 'totalQuantity', label: 'Items', render: (v) => v.toLocaleString() },
            { key: 'totalEstimatedWeightKg', label: 'Weight', render: (v) => `${v.toLocaleString()} kg` },
            { key: 'averageDailyQuantity', label: 'Daily avg', render: (v) => v.toLocaleString() },
            { key: 'remainingDays', label: 'Days left', render: (v) => v.toLocaleString() },
          ]}
          rows={activeDriveSummary.drives}
          emptyText="No active donation drives."
        />
      </SectionShell>
    ),

    // ── drivePerformance (existing) ──────────────────────────────────────────
    drivePerformance: (
      <SectionShell title="Drive performance history" subtitle="Historical donation drive performance." action={<Chip label={`${drivePerformanceSummary.totalDrives} drives`} size="small" />}>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-sky-50 p-4"><p className="text-xs uppercase tracking-wide text-sky-700">Total drives</p><p className="mt-2 text-2xl font-bold text-sky-900">{drivePerformanceSummary.totalDrives.toLocaleString()}</p></div>
          <div className="rounded-xl bg-indigo-50 p-4"><p className="text-xs uppercase tracking-wide text-indigo-700">Active now</p><p className="mt-2 text-2xl font-bold text-indigo-900">{drivePerformanceSummary.activeDrives.toLocaleString()}</p></div>
          <div className="rounded-xl bg-lime-50 p-4"><p className="text-xs uppercase tracking-wide text-lime-700">Collected</p><p className="mt-2 text-2xl font-bold text-lime-900">{drivePerformanceSummary.totalQuantity.toLocaleString()}</p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs uppercase tracking-wide text-emerald-700">Est. weight</p><p className="mt-2 text-2xl font-bold text-emerald-900">{drivePerformanceSummary.totalEstimatedWeightKg.toLocaleString()} kg</p></div>
        </div>
        <Table
          columns={[
            { key: 'driveName', label: 'Drive' },
            { key: 'schoolName', label: 'School' },
            { key: 'totalQuantity', label: 'Items', render: (v) => v.toLocaleString() },
            { key: 'topCategory', label: 'Top category' },
            { key: 'topSize', label: 'Top size' },
          ]}
          rows={drivePerformanceSummary.drives.slice(0, 8)}
          emptyText="No drive performance data available."
        />
      </SectionShell>
    ),

    // ── repurposingByColour (new) ────────────────────────────────────────────
    repurposingByColour: (
      <SectionShell title="Recyclable materials by colour" subtitle={`${repurposingByColour.grandTotal.toLocaleString()} items — ${repurposingByColour.grandWeightKg.toLocaleString()} kg total available for repurposing.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {repurposingByColour.colours.map((colour) => (
            <div key={colour.colourId} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0" style={{ background: colour.hexcode }} />
                <span className="text-xs font-medium text-gray-700 truncate">{colour.colourName}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{colour.totalPieces.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{colour.totalWeightKg.toLocaleString()} kg</p>
            </div>
          ))}
          {repurposingByColour.colours.length === 0 && <p className="col-span-4 py-6 text-sm text-gray-400">No items currently allocated for repurposing.</p>}
        </div>
      </SectionShell>
    ),

    // ── productProjections (new) ─────────────────────────────────────────────
    productProjections: (
      <SectionShell
        title="Product projections"
        subtitle={`~${productProjections.totalEstimatedProducts.toLocaleString()} total products estimable from current recyclable stock.`}
        action={<Chip icon={<DesignServicesOutlinedIcon />} label="Admin only" size="small" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productProjections.projections.slice(0, 12).map((projection) => (
            <div key={projection.recipeId} className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">{projection.productName}</p>
              {projection.styleName ? <p className="text-xs text-gray-500">{projection.styleName}</p> : null}
              {projection.school ? <p className="text-xs text-green-600 mt-0.5">{projection.school.schoolName}</p> : null}
              <p className="text-2xl font-bold text-gray-900 mt-2">~{projection.estimatedUnits.toLocaleString()}</p>
              <p className="text-xs text-gray-400">estimated units</p>
              {projection.limitingIngredient ? (
                <p className="text-xs text-amber-600 mt-1.5">Limited by: {projection.limitingIngredient}</p>
              ) : null}
            </div>
          ))}
          {productProjections.projections.length === 0 && <p className="col-span-3 py-6 text-sm text-gray-400">No recipes found. Add product recipes to see projections.</p>}
        </div>
      </SectionShell>
    ),

    // ── repurposingCatalog (existing) ────────────────────────────────────────
    repurposingCatalog: (
      <SectionShell title="Recyclable catalogue" subtitle="Product types, styles, and recipe coverage." action={<Chip icon={<DesignServicesOutlinedIcon />} label="Admin only" size="small" />}>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-lime-50 p-4"><p className="text-xs uppercase tracking-wide text-lime-700">Products</p><p className="mt-2 text-2xl font-bold text-lime-900">{productSummary.productCount.toLocaleString()}</p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs uppercase tracking-wide text-emerald-700">Recipes</p><p className="mt-2 text-2xl font-bold text-emerald-900">{productSummary.recipeCount.toLocaleString()}</p></div>
          <div className="rounded-xl bg-sky-50 p-4"><p className="text-xs uppercase tracking-wide text-sky-700">Schools with products</p><p className="mt-2 text-2xl font-bold text-sky-900">{productSummary.schoolCount.toLocaleString()}</p></div>
          <div className="rounded-xl bg-violet-50 p-4"><p className="text-xs uppercase tracking-wide text-violet-700">Recipe coverage</p><p className="mt-2 text-2xl font-bold text-violet-900">{productSummary.recipeCoverageRate}%</p></div>
        </div>
      </SectionShell>
    ),

    // ── sustainability (existing) ────────────────────────────────────────────
    sustainability: (
      <SectionShell title="Sustainability" subtitle="Weight diverted, used by PSG, repurposed, and disposed.">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs uppercase tracking-wide text-emerald-700">Diverted</p><p className="mt-1 text-lg font-bold text-emerald-900">{formatCompactNumber(sustainabilitySummary.divertedKg)} kg</p></div>
          <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs uppercase tracking-wide text-blue-700">Used by PSG</p><p className="mt-1 text-lg font-bold text-blue-900">{formatCompactNumber(sustainabilitySummary.soldKg)} kg</p></div>
          <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-wide text-orange-700">Repurposed</p><p className="mt-1 text-lg font-bold text-orange-900">{formatCompactNumber(sustainabilitySummary.repurposedKg)} kg</p></div>
          <div className="rounded-xl bg-gray-100 p-3"><p className="text-xs uppercase tracking-wide text-gray-600">Disposed</p><p className="mt-1 text-lg font-bold text-gray-800">{formatCompactNumber(sustainabilitySummary.disposedKg)} kg</p></div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sustainabilitySummary.categories.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Legend />
              <Bar dataKey="soldKg"       name="Used by PSG kg" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="repurposedKg" name="Repurposed kg"  fill="#b45309" radius={[8, 8, 0, 0]} />
              <Bar dataKey="disposedKg"   name="Disposed kg"   fill="#6b7280" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>
    ),
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (role === 'UNKNOWN' && loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;
  }

  if (role !== 'TCC_ADMIN') {
    return null;
  }

  async function handleDownloadReport() {
    try {
      const res = await fetch(
        `${analyticsApiUrl}/api/report/admin?year=${year}`
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `tcc-admin-report-${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <Box className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Sticky header */}
      <div className="-mx-4 border-b border-gray-100 bg-[#f8faf8]/95 px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">Network-wide donation activity, inventory position, circular outcomes, school participation, and repurposing.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              component={Link}
              href="/inventory"
              variant="contained"
              startIcon={<Inventory2OutlinedIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                backgroundColor: '#69aa56',
                '&:hover': { backgroundColor: '#55923e' },
              }}
            >
              Go to Inventory
            </Button>
            <Button
              variant="outlined"
              startIcon={<TuneIcon />}
              onClick={() => setShowCustomize((v) => !v)}
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                color: '#69aa56',
                borderColor: '#69aa56',
                '&:hover': { borderColor: '#55923e', backgroundColor: 'rgba(105, 170, 86, 0.08)' },
              }}
            >
              Customize
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => setRefreshIndex((v) => v + 1)}
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                color: '#69aa56',
                borderColor: '#69aa56',
                '&:hover': { borderColor: '#55923e', backgroundColor: 'rgba(105, 170, 86, 0.08)' },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                color: '#69aa56',
                borderColor: '#69aa56',
                '&:hover': { borderColor: '#55923e', backgroundColor: 'rgba(105, 170, 86, 0.08)' },
              }}
            >
              Download Report
            </Button>
          </div>
        </div>
        <Collapse in={showCustomize}>
          <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Visible sections for this view</p>
                <p className="text-xs text-gray-500">Your selection is saved locally.</p>
              </div>
              <Button size="small" onClick={() => setHiddenSections({})} sx={{ textTransform: 'none' }}>Reset</Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SECTION_GROUPS[selectedView].filter((key) => !(key === 'repurposingCatalog' && role !== 'TCC_ADMIN')).map((key) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-700">{SECTION_LABELS[key]}</span>
                  <Switch
                    checked={!hiddenSections[key]}
                    onChange={() => toggleSection(key)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#69aa56',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#69aa56',
                        opacity: 1,
                      },
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Collapse>
      </div>

      {partialErrors.length > 0 ? (
        <Alert severity="warning" sx={{ borderRadius: '16px' }}>
          Some analytics sections could not be loaded: {partialErrors.join(' | ')}
        </Alert>
      ) : null}

      <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Inventory Overview</p>
          {snapshotYearRangeLabel ? (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              {snapshotYearRangeLabel}
            </span>
          ) : null}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {showOverviewLoading
            ? Array.from({ length: 2 }, (_, i) => <MetricCardSkeleton key={i} />)
            : snapshotHighlights.map((metric) => (
                <MetricCard
                  key={typeof metric.title === 'string' ? metric.title : String(metric.value)}
                  title={metric.title}
                  value={metric.value}
                  subtitle={metric.subtitle}
                  tone={metric.tone}
                />
              ))}
        </div>

        {showOverviewLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
            <Skeleton variant="rounded" height={260} />
            <Skeleton variant="rounded" height={220} />
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 leading-tight">Total pieces in network</p>
              <p className="text-3xl font-bold text-gray-900">{networkInventoryOverview.totalPieces.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{networkInventoryOverview.totalWeightKg.toLocaleString()} kg</p>
            </div>

            {CORE_CONFIG.map((cfg) => (
              <div key={cfg.key} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col items-center text-center`}>
                <span className="w-3 h-3 rounded-full mb-2 flex-shrink-0" style={{ background: CORE_COLORS[cfg.key] }} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.sub} mb-2 leading-tight`}>{cfg.label}</p>

                <div className="w-full rounded-lg bg-white/60 px-2 py-1.5 mb-1.5 flex-1 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">#</p>
                  <p className={`text-xl font-bold ${cfg.text}`}>{networkInventoryOverview[cfg.key].toLocaleString()}</p>
                  <p className={`text-[10px] ${cfg.sub}`}>{networkInventoryOverview.percentages[cfg.key]}%</p>
                </div>

                <div className="w-full rounded-lg bg-white/60 px-2 py-1.5 flex-1 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">kg</p>
                  <p className={`text-base font-bold ${cfg.text}`}>
                    {networkInventoryOverview.totalPieces > 0
                      ? `${formatCompactNumber((networkInventoryOverview[cfg.key] / networkInventoryOverview.totalPieces) * networkInventoryOverview.totalWeightKg)} kg`
                      : '0 kg'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-row lg:flex-col gap-4 justify-center items-center">
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"># pieces</p>
              <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={networkPiecesDonutData} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} startAngle={90} endAngle={-270}>
                      {networkPiecesDonutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">{formatCompactNumber(networkInventoryOverview.totalPieces)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">kg</p>
              <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={networkWeightDonutData} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} startAngle={90} endAngle={-270}>
                      {networkWeightDonutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">{formatCompactNumber(networkInventoryOverview.totalWeightKg)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {CORE_CONFIG.map((cfg) => (
                <span key={cfg.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CORE_COLORS[cfg.key] }} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        )}
      </Paper>

      {/* Filters */}
      <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <SelectField label="Reporting year" value={year} onChange={(v) => setYear(Number(v))} options={Array.from({ length: 5 }, (_, i) => currentYear - i).map((v) => ({ value: v, label: String(v) }))} width={130} />
          <SelectField label="From month" value={startMonth} onChange={(v) => { const n = Number(v); setStartMonth(n); if (n > endMonth) setEndMonth(n); }} options={MONTH_LABELS.map((l, i) => ({ value: i + 1, label: l }))} width={140} />
          <SelectField label="To month" value={endMonth} onChange={(v) => setEndMonth(Math.max(Number(v), startMonth))} options={MONTH_LABELS.map((l, i) => ({ value: i + 1, label: l }))} width={140} />
        </div>

        {/* View tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          {VIEW_OPTIONS.filter((o) => !(o.value === 'repurposing' && role !== 'TCC_ADMIN')).map((o) => (
            <Button
              key={o.value}
              size="small"
              variant={selectedView === o.value ? 'contained' : 'outlined'}
              onClick={() => setSelectedView(o.value)}
              sx={{
                textTransform: 'none',
                borderRadius: '999px',
                fontWeight: 600,
                ...(selectedView === o.value
                  ? {
                      backgroundColor: '#69aa56',
                      color: '#fff',
                      '&:hover': { backgroundColor: '#55923e' },
                    }
                  : {
                      color: '#69aa56',
                      borderColor: '#69aa56',
                      '&:hover': { borderColor: '#55923e', backgroundColor: 'rgba(105, 170, 86, 0.08)' },
                    }),
              }}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </Paper>

      {/* Transaction period KPI row (existing) */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Period activity — {MONTH_LABELS[startMonth - 1]} to {MONTH_LABELS[endMonth - 1]} {year}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {loadingPeriod
            ? Array.from({ length: 5 }, (_, i) => <MetricCardSkeleton key={i} />)
            : kpis.map((metric, i) => (
                <MetricCard key={i} {...metric} />
              ))}
        </div>
      </div>

      {/* Rate chips
      <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {rateChips.map((chip) => <RateChip key={chip.key} {...chip} />)}
        </div>
      </Paper> */}

      {/* Section grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(showFullPageLoading ? SECTION_GROUPS[selectedView] : availableSections).map((key) => (
            <div key={key} className={['yearlyTrend', 'inventoryBySchool', 'driveParticipation'].includes(key) ? 'xl:col-span-2' : ''}>
              <SectionSkeleton height={['inventoryBySchool', 'driveParticipation'].includes(key) ? 320 : 280} />
            </div>
          ))}
        </div>
      ) : availableSections.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {availableSections.map((key) => (
            <div key={key} className={['yearlyTrend', 'inventoryBySchool', 'driveParticipation'].includes(key) ? 'xl:col-span-2' : ''}>
              {sectionContent[key]}
            </div>
          ))}
        </div>
      ) : (
        <EmptyCard
          title="No sections visible in this view"
          body="Turn at least one section back on in Customize to see analytics."
          action={<Button onClick={() => setHiddenSections({})} sx={{ textTransform: 'none' }}>Reset visible sections</Button>}
        />
      )}
    </Box>
  );
}
