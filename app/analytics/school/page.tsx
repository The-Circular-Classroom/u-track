// @ts-nocheck
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SellIcon from '@mui/icons-material/Sell';
import RecyclingIcon from '@mui/icons-material/Recycling';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DownloadIcon from '@mui/icons-material/Download';
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
  aggregateInventoryRows,
  buildActiveDriveSummary,
  buildCircularityRows,
  buildDonationBreakdownSummary,
  buildDrivePerformanceSummary,
  buildMonthlySeries,
  buildRates,
  buildSustainabilitySummary,
  buildSchoolProfile,
  buildSchoolDrives,
  buildSchoolCollectionOverview,
  buildSchoolInventoryByItem,
  buildSchoolCollaborations,
  buildSchoolProductsCreated,
  fetchCollectionDonationBreakdown,
  fetchCollectionDrivePerformance,
  fetchCollectionFunnel,
  fetchCollectionInventoryCount,
  fetchCollectionMonthlyTrends,
  fetchCollectionSustainability,
  fetchSchoolProfile,
  fetchSchoolDrives,
  fetchSchoolCollectionOverview,
  fetchSchoolInventoryByItem,
  fetchSchoolCollaborations,
  fetchSchoolProductsCreated,
  fetchCollectionDonationVolume,
  buildDonationVolumeRows,
  flattenInventoryCount,
  getAnalyticsApiUrl,
  getSchoolOptions,
  summariseInventory,
} from '@/utils/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BREAKDOWN_ORDER = [
  'School Stock',
  'For PSG Activities',
  'Used by PSG',
  'For Repurpose',
  'Repurposed',
  'Disposed',
];

const STATUS_BREAKDOWN_COLORS = {
  'School Stock': '#69aa56',
  'For PSG Activities': '#3b82f6',
  'Used by PSG': '#1d4ed8',
  'For Repurpose': '#f59e0b',
  'Repurposed': '#b45309',
  'Disposed': '#6b7280',
};

const CORE_COLORS = {
  schoolStock: '#639922',
  psg:         '#378ADD',
  repurposing: '#BA7517',
  waste:       '#888780',
};

const CORE_CONFIG = [
  { key: 'schoolStock', label: 'For School',      bg: 'bg-green-50',  text: 'text-green-900', sub: 'text-green-600', border: 'border-green-200' },
  { key: 'psg',         label: 'For PSG activities', bg: 'bg-blue-50',   text: 'text-blue-900',  sub: 'text-blue-600',  border: 'border-blue-200' },
  { key: 'repurposing', label: 'For Repurposing',   bg: 'bg-amber-50',  text: 'text-amber-900', sub: 'text-amber-600', border: 'border-amber-200' },
  { key: 'waste',       label: 'For recycling/disposing',     bg: 'bg-gray-100',  text: 'text-gray-800',  sub: 'text-gray-500',  border: 'border-gray-300' },
];

const KPI_STYLES = {
  donated:   { icon: VolunteerActivismIcon,  bg: '#dcfce7', color: '#15803d' },
  sold:      { icon: SellIcon,               bg: '#fef3c7', color: '#b45309' },
  repurposed:{ icon: RecyclingIcon,          bg: '#ccfbf1', color: '#0f766e' },
  disposed:  { icon: DeleteOutlineIcon,      bg: '#f3f4f6', color: '#4b5563' },
  inventory: { icon: Inventory2OutlinedIcon, bg: '#dbeafe', color: '#1d4ed8' },
  school:    { icon: SchoolIcon,             bg: '#ede9fe', color: '#6d28d9' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 100000 ? 1 : 2,
  }).format(Number(value) || 0);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── UI Components ────────────────────────────────────────────────────────────

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

function SectionCard({ title, subtitle, action, children }) {
  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-6 h-full">
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{title}</Typography>}
            {subtitle && <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.82rem', mt: 0.5 }}>{subtitle}</Typography>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Paper>
  );
}

function MetricCard({ title, value, subtitle, tone, secondaryValue, imageSrc, imageAlt }) {
  const style = KPI_STYLES[tone] ?? KPI_STYLES.inventory;
  const Icon = style.icon;
  return (
    <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: style.bg }}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt || 'Metric icon'}
              width={40}
              height={40}
              className="h-[40px] w-[40px] object-contain"
            />
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
          <Skeleton variant="text" width="40%" height={18} />
          <Skeleton variant="text" width="55%" height={34} />
          <Skeleton variant="text" width="48%" height={20} />
          <Skeleton variant="text" width="60%" height={16} />
        </div>
      </div>
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

function DataTable({ columns, rows, emptyText = 'No data available.' }) {
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
            <tr key={row.id ?? row.driveId ?? row.itemTypeId ?? row.productId ?? i} className="border-b border-gray-50 hover:bg-gray-50">
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

function EmptyState({ title, body }) {
  return (
    <Paper elevation={0} className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
      <SchoolIcon sx={{ fontSize: 44, color: '#d1d5db', mb: 1 }} />
      <p className="text-base font-semibold text-gray-600">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">{body}</p>
    </Paper>
  );
}

function AnalyticsSectionSkeleton({ title, subtitle, height = 280, compact = false }) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className={compact ? 'space-y-3' : ''}>
        {compact ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton variant="rounded" height={92} />
              <Skeleton variant="rounded" height={92} />
            </div>
            <Skeleton variant="rounded" height={height} />
          </>
        ) : (
          <Skeleton variant="rounded" height={height} />
        )}
      </div>
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const analyticsApiUrl = getAnalyticsApiUrl();
  const authApiUrl = '';
  const currentYear = new Date().getFullYear();

  const [role] = useState(() => getRoleFromSession() || 'UNKNOWN');
  const isAdmin = role === 'TCC_ADMIN';

  // ── School ID resolution ────────────────────────────────────────────────────
  // Admin: uses the dropdown selector
  // School staff / PSG: resolved automatically from their session profile
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [sessionSchoolId, setSessionSchoolId] = useState('');
  const [profileLoading, setProfileLoading] = useState(!isAdmin);
  const [profileError, setProfileError] = useState(null);

  const needsSessionSchool = !isAdmin && role !== 'UNKNOWN';

  useEffect(() => {
    if (isAdmin || role === 'UNKNOWN') return;

    fetch(`${authApiUrl}/api/users/me`)
      .then((res) => res.json())
      .then((json) => {
        const resolvedSchoolId = json?.schoolId ?? json?.school?.id;
        if (resolvedSchoolId) {
          setSessionSchoolId(String(resolvedSchoolId));
        } else {
          setProfileError('Your account is not linked to a school. Contact your TCC administrator.');
        }
      })
      .catch(() => setProfileError('Failed to load your school profile. Please try again.'))
      .finally(() => setProfileLoading(false));
  }, [authApiUrl, isAdmin, role]);

  const [year, setYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [partialErrors, setPartialErrors] = useState([]);

  const [analyticsData, setAnalyticsData] = useState({
    inventoryCount: [],
    monthlyTrends: { monthly: [], schools: [] },
    funnel: { schools: [] },
    donationBreakdown: { schools: [] },
    drivePerformance: { drives: [] },
    sustainability: { summary: {}, categories: [] },
    donationVolume: [],
    schoolProfile: null,
    schoolDrives: null,
    collectionOverview: null,
    inventoryByItem: null,
    collaborations: null,
    productsCreated: null,
  });

  // Inventory rows only needed for admin school selector
  const inventoryRows = useMemo(() => flattenInventoryCount(analyticsData.inventoryCount), [analyticsData.inventoryCount]);
  const schoolOptions = useMemo(() => getSchoolOptions(inventoryRows), [inventoryRows]);

  // effectiveSchoolId — admin uses selector, others use session
  const effectiveSchoolId = useMemo(() => {
    if (isAdmin) return selectedSchoolId || (schoolOptions[0] ? String(schoolOptions[0].id) : '');
    return sessionSchoolId;
  }, [isAdmin, selectedSchoolId, schoolOptions, sessionSchoolId]);

  // ── Data fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (role === 'UNKNOWN') return;
    if (!isAdmin && profileLoading) return; // wait for session school resolution
    let cancelled = false;

    async function run() {
      const schoolId = effectiveSchoolId;

      if (!cancelled) { setLoading(true); setPartialErrors([]); }

      // Admin still needs inventoryCount to build the school selector options
      const requests = [
        ...(isAdmin ? [['inventoryCount', fetchCollectionInventoryCount(analyticsApiUrl)]] : []),
      ];

      if (schoolId) {
        if (isAdmin) {
          requests.push(
            ['monthlyTrends',     fetchCollectionMonthlyTrends(analyticsApiUrl, { year, schoolId })],
            ['funnel',            fetchCollectionFunnel(analyticsApiUrl, { year, schoolId })],
            ['donationBreakdown', fetchCollectionDonationBreakdown(analyticsApiUrl, { year, schoolId, startMonth, endMonth })],
            ['drivePerformance',  fetchCollectionDrivePerformance(analyticsApiUrl, { year, schoolId, startMonth, endMonth })],
            ['sustainability',    fetchCollectionSustainability(analyticsApiUrl, { year, schoolId })],
            ['donationVolume',    fetchCollectionDonationVolume(analyticsApiUrl, { schoolId })],
          );
        }

        requests.push(
          ['schoolProfile',     fetchSchoolProfile(analyticsApiUrl, schoolId)],
          ['schoolDrives',      fetchSchoolDrives(analyticsApiUrl, schoolId)],
          ['collectionOverview',fetchSchoolCollectionOverview(analyticsApiUrl, schoolId)],
          ['inventoryByItem',   fetchSchoolInventoryByItem(analyticsApiUrl, schoolId, { isAdmin })],
        );
        if (isAdmin) {
          requests.push(
            ['collaborations',  fetchSchoolCollaborations(analyticsApiUrl, schoolId)],
            ['productsCreated', fetchSchoolProductsCreated(analyticsApiUrl, schoolId)],
          );
        }
      }

      const settled = await Promise.allSettled(requests.map(([, p]) => p));
      if (cancelled) return;

      const nextState = {
        inventoryCount: [], monthlyTrends: { monthly: [], schools: [] },
        funnel: { schools: [] }, donationBreakdown: { schools: [] },
        drivePerformance: { drives: [] }, sustainability: { summary: {}, categories: [] },
        donationVolume: [], schoolProfile: null, schoolDrives: null,
        collectionOverview: null, inventoryByItem: null,
        collaborations: null, productsCreated: null,
      };
      const nextErrors = [];

      settled.forEach((result, i) => {
        const key = requests[i][0];
        if (result.status === 'fulfilled') { nextState[key] = result.value; }
        else { nextErrors.push(`${key}: ${result.reason?.message ?? 'Request failed'}`); }
      });

      setAnalyticsData(nextState);
      setPartialErrors(nextErrors);
      setLoading(false);
      setHasLoadedOnce(true);
    }

    run();
    return () => { cancelled = true; };
  }, [analyticsApiUrl, effectiveSchoolId, endMonth, isAdmin, profileLoading, role, startMonth, year]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const schoolProfile      = useMemo(() => buildSchoolProfile(analyticsData.schoolProfile), [analyticsData.schoolProfile]);
  const schoolDrives       = useMemo(() => buildSchoolDrives(analyticsData.schoolDrives), [analyticsData.schoolDrives]);
  const collectionOverview = useMemo(() => buildSchoolCollectionOverview(analyticsData.collectionOverview), [analyticsData.collectionOverview]);
  const inventoryByItem    = useMemo(() => buildSchoolInventoryByItem(analyticsData.inventoryByItem), [analyticsData.inventoryByItem]);
  const collaborations     = useMemo(() => buildSchoolCollaborations(analyticsData.collaborations), [analyticsData.collaborations]);
  const productsCreated    = useMemo(() => buildSchoolProductsCreated(analyticsData.productsCreated), [analyticsData.productsCreated]);

  const scopedInventoryRows      = useMemo(() => aggregateInventoryRows(inventoryRows, { schoolId: effectiveSchoolId, category: 'all', size: 'all', status: 'all' }), [effectiveSchoolId, inventoryRows]);
  const inventorySummary         = useMemo(() => summariseInventory(scopedInventoryRows, 'all'), [scopedInventoryRows]);
  const monthlySeries            = useMemo(() => buildMonthlySeries(analyticsData.monthlyTrends?.monthly ?? [], { startMonth, endMonth }), [analyticsData.monthlyTrends?.monthly, endMonth, startMonth]);
  const periodTotals             = useMemo(() => buildCircularityRows(analyticsData.funnel?.schools ?? [], effectiveSchoolId), [analyticsData.funnel?.schools, effectiveSchoolId]);
  const periodRates              = useMemo(() => buildRates({ donated: periodTotals.donated, sold: periodTotals.sold, repurposed: periodTotals.repurposed, disposed: periodTotals.disposed }), [periodTotals]);
  const donationBreakdownSummary = useMemo(() => buildDonationBreakdownSummary(analyticsData.donationBreakdown, effectiveSchoolId), [analyticsData.donationBreakdown, effectiveSchoolId]);
  const drivePerformanceSummary  = useMemo(() => buildDrivePerformanceSummary(analyticsData.drivePerformance), [analyticsData.drivePerformance]);
  const sustainabilitySummary    = useMemo(() => buildSustainabilitySummary(analyticsData.sustainability), [analyticsData.sustainability]);
  const activeDriveSummary       = useMemo(() => buildActiveDriveSummary({ drives: drivePerformanceSummary.drives.filter((d) => d.isActive) }), [drivePerformanceSummary.drives]);
  const donationVolumeRows       = useMemo(() => buildDonationVolumeRows(analyticsData.donationVolume), [analyticsData.donationVolume]);
  const statusDonutData          = useMemo(() => {
    const byStatusMap = new Map(inventorySummary.byStatus.map((row) => [row.label, row.value]));
    return STATUS_BREAKDOWN_ORDER.map((label) => ({
      label,
      value: byStatusMap.get(label) ?? 0,
      color: STATUS_BREAKDOWN_COLORS[label],
    }));
  }, [inventorySummary.byStatus]);
  const adminPeriodMetrics       = useMemo(() => ([
    {
      title: 'Collected By School',
      value: periodTotals.donated.toLocaleString(),
      subtitle: `${MONTH_LABELS[startMonth - 1]} to ${MONTH_LABELS[endMonth - 1]} ${year}`,
      tone: 'donated',
      secondaryValue: `${sustainabilitySummary.donatedKg.toLocaleString()} kg`,
    },
    {
      title: 'Used By PSG',
      value: periodTotals.sold.toLocaleString(),
      subtitle: 'Processed through resale or redistribution',
      tone: 'sold',
      secondaryValue: `${sustainabilitySummary.soldKg.toLocaleString()} kg`,
    },
    {
      title: 'Repurposed',
      value: periodTotals.repurposed.toLocaleString(),
      subtitle: 'Used for new products',
      tone: 'repurposed',
      imageSrc: '/images/Logo-Symbol-green-stem.png',
      imageAlt: 'Repurposed logo',
      secondaryValue: `${sustainabilitySummary.repurposedKg.toLocaleString()} kg`,
    },
    {
      title: 'Disposed',
      value: periodTotals.disposed.toLocaleString(),
      subtitle: 'Processed end-of-life items',
      tone: 'disposed',
      secondaryValue: `${sustainabilitySummary.disposedKg.toLocaleString()} kg`,
    },
    {
      title: <HelpLabel label="Diverted Weight" tooltip="Weight kept out of waste through resale or repurposing." />,
      value: `${sustainabilitySummary.divertedKg.toLocaleString()} kg`,
      subtitle: `${sustainabilitySummary.diversionRate}% waste diversion rate`,
      tone: 'repurposed',
    },
  ]), [
    endMonth,
    periodTotals.disposed,
    periodTotals.donated,
    periodTotals.repurposed,
    periodTotals.sold,
    startMonth,
    sustainabilitySummary.disposedKg,
    sustainabilitySummary.diversionRate,
    sustainabilitySummary.divertedKg,
    sustainabilitySummary.donatedKg,
    sustainabilitySummary.repurposedKg,
    sustainabilitySummary.soldKg,
    year,
  ]);

  const piecesDonutData = useMemo(() => CORE_CONFIG.map((c) => ({
    name: c.label, value: collectionOverview[c.key], color: CORE_COLORS[c.key],
  })).filter((d) => d.value > 0), [collectionOverview]);

  const weightDonutData = useMemo(() => {
    const total = collectionOverview.totalPieces || 0;
    if (!total) return [];
    return CORE_CONFIG.map((c) => ({
      name: c.label,
      value: Number(((collectionOverview[c.key] / total) * collectionOverview.totalWeightKg).toFixed(2)),
      color: CORE_COLORS[c.key],
    })).filter((d) => d.value > 0);
  }, [collectionOverview]);

  const rateChips = useMemo(() => [
    { key: 'resold',     label: 'Resold rate',     value: periodRates.sellThroughRate, description: 'Share of donated items sold.',            formula: 'sold / donated',                          color: '#854d0e', bg: '#fef3c7' },
    { key: 'repurposed', label: 'Repurposed rate', value: periodRates.repurposeRate,   description: 'Share of donated items repurposed.',      formula: 'repurposed / donated',                    color: '#115e59', bg: '#ccfbf1' },
    { key: 'recovered',  label: 'Recovered rate',  value: periodRates.recoveryRate,    description: 'Share sold or repurposed.',               formula: '(sold + repurposed) / donated',            color: '#1d4ed8', bg: '#dbeafe' },
    { key: 'disposal',   label: 'Disposal rate',   value: periodRates.disposalRate,    description: 'Share of processed items that disposed.', formula: 'disposed / (sold + repurposed + disposed)',color: '#4b5563', bg: '#f3f4f6' },
  ], [periodRates]);

  const schoolName = useMemo(() => {
    if (schoolProfile?.schoolName) return schoolProfile.schoolName;
    return schoolOptions.find((s) => String(s.id) === String(effectiveSchoolId))?.label ?? null;
  }, [effectiveSchoolId, schoolOptions, schoolProfile]);

  const showFullPageLoading = loading && !hasLoadedOnce;
  const showAdminPeriodLoading = isAdmin && loading && hasLoadedOnce;

  // ── Loading / error states ──────────────────────────────────────────────────

  if (role === 'UNKNOWN' || (!isAdmin && profileLoading)) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner /></div>;
  }

  // Non-admin with no school linked
  if (!isAdmin && profileError) {
    return (
      <Box className="flex min-h-[60vh] items-center justify-center px-4">
        <Paper elevation={0} className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center max-w-md">
          <LockOutlinedIcon sx={{ fontSize: 40, color: '#b45309', mb: 1 }} />
          <p className="text-base font-semibold text-amber-900">School not linked</p>
          <p className="mt-2 text-sm text-amber-700">{profileError}</p>
        </Paper>
      </Box>
    );
  }

  const noSchoolSelected = !showFullPageLoading && !effectiveSchoolId;

  async function handleDownloadReport() {
    try {
      const res = await fetch(
        `${analyticsApiUrl}/api/report/school/${effectiveSchoolId}?year=${year}`
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `tcc-school-report-${effectiveSchoolId}-${year}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Report download failed:', err);
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <Box className="mx-auto max-w-7xl space-y-6 px-4 py-6">

      {/* ── Filter bar ── only show school selector for admins ── */}
      <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">

          {/* School dropdown — admin only */}
          {isAdmin && (
            <SelectField
              label="School"
              value={effectiveSchoolId}
              onChange={setSelectedSchoolId}
              options={schoolOptions.map((o) => ({ value: o.id, label: o.label }))}
              width={240}
            />
          )}

          <SelectField
            label="Reporting year"
            value={year}
            onChange={(v) => setYear(Number(v))}
            options={Array.from({ length: 5 }, (_, i) => currentYear - i).map((v) => ({ value: v, label: String(v) }))}
            width={130}
          />
          <SelectField
            label="From month"
            value={startMonth}
            onChange={(v) => { const n = Number(v); setStartMonth(n); if (n > endMonth) setEndMonth(n); }}
            options={MONTH_LABELS.map((l, i) => ({ value: i + 1, label: l }))}
            width={140}
          />
          <SelectField
            label="To month"
            value={endMonth}
            onChange={(v) => setEndMonth(Math.max(Number(v), startMonth))}
            options={MONTH_LABELS.map((l, i) => ({ value: i + 1, label: l }))}
            width={140}
          />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!effectiveSchoolId}
            onClick={handleDownloadReport}
            sx={{
              textTransform: 'none',
              borderRadius: '12px',
              alignSelf: 'flex-end',
              color: '#69aa56',
              borderColor: '#69aa56',
              '&:hover': { borderColor: '#55923e', backgroundColor: 'rgba(105, 170, 86, 0.08)' },
            }}
          >
            Download Report
          </Button>
        </div>
      </Paper>

      {partialErrors.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: '16px' }}>
          Some analytics could not be loaded: {partialErrors.join(' | ')}
        </Alert>
      )}

      {showFullPageLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><LoadingSpinner /></div>
      ) : noSchoolSelected ? (
        <Paper elevation={0} className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <SchoolIcon sx={{ fontSize: 44, color: '#d1d5db', mb: 1 }} />
          <p className="text-base font-semibold text-gray-600">No school selected</p>
          <p className="mt-2 text-sm text-gray-400">Choose a school from the dropdown above to view its analytics.</p>
        </Paper>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — SCHOOL HEADER
              Logo | School name | Contacts | Donation drives
          ══════════════════════════════════════════════════════════════ */}
          <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">

            {/* Logo + name */}
            <div className="flex items-center gap-5 px-6 py-5 border-b border-gray-100">
              {schoolProfile?.logoUrl ? (
                <img src={schoolProfile.logoUrl} alt={schoolProfile.schoolName} className="h-14 w-14 rounded-full object-contain border border-gray-100 flex-shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <SchoolIcon sx={{ fontSize: 28, color: '#15803d' }} />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{schoolName ?? 'School Analytics'}</h1>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {schoolProfile?.mainlevelCode && <Chip label={schoolProfile.mainlevelCode} size="small" />}
                  {schoolProfile?.natureCode && <Chip label={schoolProfile.natureCode} size="small" variant="outlined" />}
                  {schoolProfile?.zoneCode && <Chip label={`Zone ${schoolProfile.zoneCode}`} size="small" variant="outlined" />}
                  {schoolProfile?.isCooperating && (
                    <Chip
                      label="Collaboration"
                      size="small"
                      sx={{ backgroundColor: '#69aa56', color: '#fff', fontWeight: 600 }}
                    />
                  )}
                  {/* Role badge for non-admin so user knows what view they are in */}
                  {!isAdmin && (
                    <Chip
                      label={role === 'SCHOOL_STAFF' ? 'School staff view' : 'PSG volunteer view'}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  )}
                </div>
              </div>
              <Button
                component={Link}
                href="/inventory"
                variant="contained"
                startIcon={<Inventory2OutlinedIcon />}
                sx={{
                  textTransform: 'none',
                  borderRadius: '12px',
                  flexShrink: 0,
                  fontWeight: 600,
                  backgroundColor: '#69aa56',
                  '&:hover': { backgroundColor: '#55923e' },
                }}
              >
                Go to Inventory
              </Button>
            </div>

            {/* Contacts + drives strip */}
            <div className="px-6 py-5 grid grid-cols-1 gap-5 md:grid-cols-3">

              {/* Contact person — school */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Contact person — school</p>
                {schoolProfile?.contacts.schoolStaff.length > 0 ? (
                  <div className="space-y-1.5">
                    {schoolProfile.contacts.schoolStaff.map((c) => (
                      <div key={c.id}>
                        <p className="text-sm font-medium text-gray-900">{c.name || '—'}</p>
                        <p className="text-xs text-gray-400">{c.email}{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">Not registered</p>}
              </div>

              {/* Contact person — PSG */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Contact person — PSG</p>
                {schoolProfile?.contacts.psgVolunteers.length > 0 ? (
                  <div className="space-y-1.5">
                    {schoolProfile.contacts.psgVolunteers.map((c) => (
                      <div key={c.id}>
                        <p className="text-sm font-medium text-gray-900">{c.name || '—'}</p>
                        <p className="text-xs text-gray-400">{c.email}{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">Not registered</p>}
              </div>

              {/* Donation drives */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Uniform donation drives
                  {schoolDrives && (
                    <span className="ml-2 text-gray-600 normal-case font-medium">{schoolDrives.summary.total} total</span>
                  )}
                </p>
                {schoolDrives?.drives.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {schoolDrives.drives.map((drive) => (
                      <div key={drive.driveId} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700 truncate flex-1">{drive.driveName}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(drive.startDate)}</span>
                          <span className="text-xs text-gray-300">–</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(drive.endDate)}</span>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${drive.isActive ? 'bg-green-400' : drive.isUpcoming ? 'bg-blue-400' : 'bg-gray-300'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No drives recorded</p>}
              </div>
            </div>
          </Paper>

          {/* SECTION 2 — COLLECTION OVERVIEW */}
          <Paper elevation={0} className="rounded-2xl border border-gray-100 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Collection overview</p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">

                {/* Total pieces — large left card */}
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 leading-tight">Total pieces collected</p>
                  <p className="text-3xl font-bold text-gray-900">{collectionOverview.totalPieces.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">{collectionOverview.totalWeightKg.toLocaleString()} kg</p>
                </div>

                {/* Four core categories */}
                {CORE_CONFIG.map((cfg) => (
                  <div key={cfg.key} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col items-center text-center`}>
                    <span className="w-3 h-3 rounded-full mb-2 flex-shrink-0" style={{ background: CORE_COLORS[cfg.key] }} />
                    <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.sub} mb-2 leading-tight`}>{cfg.label}</p>

                    {/* # */}
                    <div className="w-full rounded-lg bg-white/60 px-2 py-1.5 mb-1.5 flex-1 flex flex-col justify-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">#</p>
                      <p className={`text-xl font-bold ${cfg.text}`}>{collectionOverview[cfg.key].toLocaleString()}</p>
                      <p className={`text-[10px] ${cfg.sub}`}>{collectionOverview.percentages[cfg.key]}%</p>
                    </div>

                    {/* kg */}
                    <div className="w-full rounded-lg bg-white/60 px-2 py-1.5 flex-1 flex flex-col justify-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">kg</p>
                      <p className={`text-base font-bold ${cfg.text}`}>
                        {collectionOverview.totalPieces > 0
                          ? `${formatCompactNumber((collectionOverview[cfg.key] / collectionOverview.totalPieces) * collectionOverview.totalWeightKg)} kg`
                          : '0 kg'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Two donuts + shared legend */}
              <div className="flex flex-row lg:flex-col gap-4 justify-center items-center">

                {/* # donut */}
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"># pieces</p>
                  <div className="relative w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={piecesDonutData} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} startAngle={90} endAngle={-270}>
                          {piecesDonutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-700">{formatCompactNumber(collectionOverview.totalPieces)}</span>
                    </div>
                  </div>
                </div>

                {/* kg donut */}
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">kg</p>
                  <div className="relative w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={weightDonutData} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} startAngle={90} endAngle={-270}>
                          {weightDonutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-700">{formatCompactNumber(collectionOverview.totalWeightKg)}</span>
                    </div>
                  </div>
                </div>

                {/* Shared legend */}
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
          </Paper>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3 — INVENTORY BY ITEMS
              School/PSG view: school stock + PSG only, no repurposing/waste
              Admin view: all four groups
          ══════════════════════════════════════════════════════════════ */}
          {inventoryByItem && (
            <SectionCard
              title="Inventory by items"
              subtitle={isAdmin
                    ? 'All four categories — school stock, reserved for PSG activities, repurposing, and waste.'
                    : 'Showing available school stock and items reserved for PSG activities.'}
            >
              <div className="space-y-2">
                {inventoryByItem.items.map((item) => (
                  <div key={item.itemTypeId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.categoryName} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Inventory2OutlinedIcon sx={{ fontSize: 20, color: '#9ca3af' }} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.categoryName}</p>
                        {item.primaryColour && (
                          <MuiTooltip title={item.primaryColour.colourName}>
                            <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ background: item.primaryColour.hexcode }} />
                          </MuiTooltip>
                        )}
                        {item.secondaryColour && (
                          <MuiTooltip title={item.secondaryColour.colourName}>
                            <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ background: item.secondaryColour.hexcode }} />
                          </MuiTooltip>
                        )}
                        {item.gender && item.gender !== 'Unisex' && (
                          <Chip label={item.gender} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </div>
                    </div>

                    {/* Stacked bar */}
                    <div className="w-60 hidden sm:block">
                      <div className="h-3 rounded overflow-hidden flex">
                        {(['schoolStock', 'psg', ...(isAdmin ? ['repurposing', 'waste'] : [])]).map((key) => {
                          const val = item[key];
                          const pct = item.totalPieces > 0 ? ((val / item.totalPieces) * 100).toFixed(1) : 0;
                          return val > 0 ? (
                            <MuiTooltip key={key} title={`${key}: ${val.toLocaleString()}`}>
                              <div style={{ width: `${pct}%`, background: CORE_COLORS[key] }} />
                            </MuiTooltip>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <span className="text-sm font-bold text-gray-900 w-12 text-right flex-shrink-0">{item.totalPieces.toLocaleString()}</span>
                  </div>
                ))}
                {inventoryByItem.items.length === 0 && (
                  <p className="py-6 text-sm text-gray-400">No inventory items found for this school.</p>
                )}
              </div>
            </SectionCard>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 4 — PERIOD ACTIVITY KPIs + RATE CHIPS
          ══════════════════════════════════════════════════════════════ */}
          {isAdmin && (
            <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Period activity - {MONTH_LABELS[startMonth - 1]} to {MONTH_LABELS[endMonth - 1]} {year}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {showAdminPeriodLoading
                ? Array.from({ length: 5 }, (_, i) => <MetricCardSkeleton key={i} />)
                : adminPeriodMetrics.map((metric, i) => (
                    <MetricCard key={i} {...metric} />
                  ))}
            </div>
          </div>



          {/* ══════════════════════════════════════════════════════════════
              SECTION 5 — CHARTS
          ══════════════════════════════════════════════════════════════ */}
          {showAdminPeriodLoading ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">
            <AnalyticsSectionSkeleton
              title="Donation trends"
              subtitle="Monthly donated, sold, repurposed, and disposed volume."
            />
            <AnalyticsSectionSkeleton
              title="Status breakdown"
              subtitle="On-hand statuses reflect current inventory."
            />
            <AnalyticsSectionSkeleton
              title="Donation breakdown"
              subtitle="Donation inflow grouped by category for the selected window."
              compact
              height={240}
            />
            <AnalyticsSectionSkeleton
              title="Sustainability"
              subtitle="Weight diverted, used by PSG, repurposed, and disposed."
              compact
              height={240}
            />
          </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">

            <SectionCard title="Donation trends" subtitle="Monthly donated, sold, repurposed, and disposed volume.">
              <div className="h-[280px]">
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
            </SectionCard>

            <SectionCard title="Status breakdown" subtitle="On-hand statuses reflect current inventory.">
              {statusDonutData.length ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDonutData} dataKey="value" nameKey="label" innerRadius={60} outerRadius={96} paddingAngle={2}>
                          {statusDonutData.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<DashboardTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {statusDonutData.map((entry) => (
                      <div key={entry.label} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm text-gray-600">{entry.label}</span>
                        <span className="ml-auto text-sm font-semibold text-gray-900">{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="py-10 text-sm text-gray-400">No status data available.</p>}
            </SectionCard>

            <SectionCard title="Donation breakdown" subtitle="Donation inflow grouped by category for the selected window.">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-lime-50 p-4"><p className="text-xs uppercase tracking-wide text-lime-700">Donated items</p><p className="mt-2 text-2xl font-bold text-lime-900">{donationBreakdownSummary.totalQuantity.toLocaleString()}</p></div>
                <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs uppercase tracking-wide text-emerald-700">Est. weight</p><p className="mt-2 text-2xl font-bold text-emerald-900">{formatCompactNumber(donationBreakdownSummary.totalEstimatedWeightKg)} kg</p></div>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={donationBreakdownSummary.categories.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<DashboardTooltip />} />
                    <Bar dataKey="value" name="Items" fill="#69aa56" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Sustainability" subtitle="Weight diverted, used by PSG, repurposed, and disposed.">
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
                    <Bar dataKey="disposedKg"   name="Disposed kg"    fill="#6b7280" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {donationVolumeRows.length > 0 && (
              <SectionCard title="Donation volume by drive" subtitle="Total items donated per drive.">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donationVolumeRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="driveName" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<DashboardTooltip />} />
                      <Bar dataKey="totalDonated" name="Items donated" fill="#69aa56" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            )}
          </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 6 — DRIVE PERFORMANCE TABLE
          ══════════════════════════════════════════════════════════════ */}
          {showAdminPeriodLoading ? (
            <AnalyticsSectionSkeleton
              title="Donation drives"
              subtitle="Active and completed drives for the selected reporting window."
              height={220}
            />
          ) : (
            <SectionCard
              title="Donation drives"
              subtitle="Active and completed drives for the selected reporting window."
              action={<Chip icon={<EventAvailableOutlinedIcon />} label={`${drivePerformanceSummary.totalDrives} drives`} size="small" />}
            >
              <DataTable
                columns={[
                  { key: 'driveName', label: 'Drive' },
                  { key: 'totalQuantity', label: 'Items', render: (v) => v.toLocaleString() },
                  { key: 'topCategory', label: 'Top category' },
                  { key: 'topSize', label: 'Top size' },
                  {
                    key: 'isActive',
                    label: 'Status',
                    render: (v) => (
                      <Chip
                        label={v ? 'Active' : 'Completed'}
                        size="small"
                        color={v ? undefined : 'default'}
                        sx={v ? { backgroundColor: '#69aa56', color: '#fff', fontWeight: 600 } : undefined}
                      />
                    ),
                  },
                ]}
                rows={drivePerformanceSummary.drives}
                emptyText="No donation drives available for this school and reporting window."
              />
            </SectionCard>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 7 — ADMIN-ONLY: COLLABORATIONS + PRODUCTS
          ══════════════════════════════════════════════════════════════ */}
          {isAdmin && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">

              <SectionCard
                title="Collaborations"
                subtitle="Projects and activities conducted with this school."
                action={<Chip icon={<HandshakeOutlinedIcon />} label="Admin only" size="small" />}
              >
                {collaborations.byYear.length > 0 ? (
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {collaborations.byYear.map((group) => (
                      <div key={group.year}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{group.year}</p>
                        <div className="space-y-2">
                          {group.activities.map((activity) => (
                            <div key={activity.id} className="rounded-xl bg-gray-50 px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{activity.activityName}</p>
                              {activity.remarks && <p className="text-xs text-gray-400 mt-0.5">{activity.remarks}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-6 text-sm text-gray-400">No collaborations recorded for this school.</p>}
              </SectionCard>

              <SectionCard
                title="Products created"
                subtitle="Products designed using this school's donated uniforms."
                action={<Chip icon={<DesignServicesOutlinedIcon />} label="Admin only" size="small" />}
              >
                {productsCreated.totalProducts > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-xl bg-lime-50 p-3 text-center"><p className="text-xs uppercase tracking-wide text-lime-700">Products</p><p className="text-xl font-bold text-lime-900 mt-1">{productsCreated.totalProducts}</p></div>
                      <div className="rounded-xl bg-sky-50 p-3 text-center"><p className="text-xs uppercase tracking-wide text-sky-700">Styles</p><p className="text-xl font-bold text-sky-900 mt-1">{productsCreated.totalStyles}</p></div>
                      <div className="rounded-xl bg-violet-50 p-3 text-center"><p className="text-xs uppercase tracking-wide text-violet-700">Recipes</p><p className="text-xl font-bold text-violet-900 mt-1">{productsCreated.totalRecipes}</p></div>
                    </div>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {productsCreated.products.map((product) => (
                        <div key={product.productId} className="rounded-xl border border-gray-100 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{product.productName}</p>
                              {product.productType && <p className="text-xs text-gray-400">{product.productType}</p>}
                            </div>
                            <p className="text-xs text-gray-400">
                              {product.createdDate ? new Date(product.createdDate).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '—'}
                            </p>
                          </div>
                          {product.styles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.styles.map((style) => (
                                <span key={style.styleId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {style.styleName ?? 'Style'} ({style.recipes.length} recipes)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="py-6 text-sm text-gray-400">No products created for this school yet.</p>}
              </SectionCard>
            </div>
          )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
