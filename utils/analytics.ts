// @ts-nocheck
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STATUS_LABELS = {
  ForSale: 'For PSG Activities',
  ForRepurpose: 'For Repurpose',
  GeneralOffice: 'School Stock',
  Sold: 'Used by PSG',
  Repurposed: 'Repurposed',
  Disposed: 'Disposed',
};

const ON_HAND_STATUS_KEYS = ['ForSale', 'ForRepurpose', 'GeneralOffice'];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstDefinedNumber(...values) {
  const value = values.find((entry) => entry !== undefined && entry !== null);
  return toNumber(value);
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

async function fetchJson(url, { signal } = {}) {
  let cleanUrl = url;
  const apiIndex = url.indexOf('/api/');
  if (apiIndex !== -1) {
    cleanUrl = url.substring(apiIndex);
  }

  const response = await fetch(cleanUrl, { signal });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Request failed (${response.status})`);
  }

  return body?.data ?? body;
}

export function getAnalyticsApiUrl() {
  return '';
}

export async function fetchCollectionInventoryCount(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/collection/inventory-count`, options);
}

export async function fetchOverallDonations(apiUrl = '', options = {}) {
  return fetchJson(`${apiUrl}/api/collection/overall-donations`, options);
}

export async function fetchOverallDonationsByCategory(apiUrl = '', options = {}) {
  return fetchJson(`${apiUrl}/api/collection/overall-donations-by-category`, options);
}

export async function fetchCollectionFunnel(apiUrl, { year, schoolId }, options = {}) {
  const query = buildQuery({ year, schoolId });
  return fetchJson(`${apiUrl}/api/collection/funnel?${query}`, options);
}

export async function fetchCollectionMonthlyTrends(apiUrl, { year, schoolId }, options = {}) {
  const query = buildQuery({ year, schoolId });
  return fetchJson(`${apiUrl}/api/collection/monthly-trends?${query}`, options);
}

export async function fetchCollectionSchoolRankings(apiUrl, { year, metric }, options = {}) {
  const query = buildQuery({ year, metric });
  return fetchJson(`${apiUrl}/api/collection/school-rankings?${query}`, options);
}

export async function fetchCollectionActiveDrives(apiUrl, { schoolId }, options = {}) {
  const query = buildQuery({ schoolId });
  return fetchJson(`${apiUrl}/api/collection/active-drives?${query}`, options);
}

export async function fetchCollectionStockByLocation(apiUrl, { schoolId }, options = {}) {
  const query = buildQuery({ schoolId });
  return fetchJson(`${apiUrl}/api/collection/stock-by-location?${query}`, options);
}

export async function fetchCollectionCooperationAnalytics(apiUrl, { year }, options = {}) {
  const query = buildQuery({ year });
  return fetchJson(`${apiUrl}/api/collection/cooperation-analytics?${query}`, options);
}

export async function fetchCollectionSustainability(apiUrl, { year, schoolId }, options = {}) {
  const query = buildQuery({ year, schoolId });
  return fetchJson(`${apiUrl}/api/collection/sustainability?${query}`, options);
}

export async function fetchCollectionDonationBreakdown(apiUrl, { year, schoolId, startMonth, endMonth }, options = {}) {
  const query = buildQuery({ year, schoolId, startMonth, endMonth });
  return fetchJson(`${apiUrl}/api/collection/donation-breakdown?${query}`, options);
}

export async function fetchCollectionDrivePerformance(apiUrl, { year, schoolId, activeOnly, startMonth, endMonth }, options = {}) {
  const query = buildQuery({ year, schoolId, activeOnly, startMonth, endMonth });
  return fetchJson(`${apiUrl}/api/collection/drive-performance?${query}`, options);
}

export async function fetchAssemblyProducts(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/assembly/products`, options);
}

export async function fetchCollectionDonationVolume(apiUrl, { schoolId }, options = {}) {
  const query = buildQuery({ school_id: schoolId });
  return fetchJson(`${apiUrl}/api/collection/donation-volume?${query}`, options);
}

export async function fetchOverviewKPITotals(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/overview/kpi-totals`, options);
}

export async function fetchOverviewInventoryBySchool(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/overview/inventory-by-school`, options);
}

export async function fetchOverviewInventoryByCategory(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/overview/inventory-by-category`, options);
}

export async function fetchOverviewYearlyTrend(apiUrl, { startYear, endYear }, options = {}) {
  const query = buildQuery({ startYear, endYear });
  return fetchJson(`${apiUrl}/api/overview/yearly-trend?${query}`, options);
}

export async function fetchOverviewDriveParticipation(apiUrl, { year }, options = {}) {
  const query = buildQuery({ year });
  return fetchJson(`${apiUrl}/api/overview/drive-participation?${query}`, options);
}

export async function fetchOverviewRepurposingByColour(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/overview/repurposing-by-colour`, options);
}

export async function fetchOverviewProductProjections(apiUrl, options = {}) {
  return fetchJson(`${apiUrl}/api/overview/product-projections`, options);
}

export async function fetchSchoolProfile(apiUrl, schoolId, options = {}) {
  return fetchJson(`${apiUrl}/api/school/${schoolId}/profile`, options);
}

export async function fetchSchoolDrives(apiUrl, schoolId, options = {}) {
  return fetchJson(`${apiUrl}/api/school/${schoolId}/drives`, options);
}

export async function fetchSchoolCollectionOverview(apiUrl, schoolId, options = {}) {
  return fetchJson(`${apiUrl}/api/school/${schoolId}/collection-overview`, options);
}

export async function fetchSchoolInventoryByItem(apiUrl, schoolId, { isAdmin = false } = {}, options = {}) {
  const query = buildQuery({ isAdmin });
  return fetchJson(`${apiUrl}/api/school/${schoolId}/inventory-by-item?${query}`, options);
}

export async function fetchSchoolCollaborations(apiUrl, schoolId, options = {}) {
  return fetchJson(`${apiUrl}/api/school/${schoolId}/collaborations`, options);
}

export async function fetchSchoolProductsCreated(apiUrl, schoolId, options = {}) {
  return fetchJson(`${apiUrl}/api/school/${schoolId}/products`, options);
}

// ── Builder functions ─────────────────────────────────────────────────────────

export function buildSchoolProfile(data) {
  if (!data) return null;
  return {
    schoolId: data.schoolId,
    schoolName: data.schoolName,
    address: data.address ?? null,
    mrtDesc: data.mrtDesc ?? null,
    postalCode: data.postalCode ?? null,
    mainlevelCode: data.mainlevelCode ?? null,
    natureCode: data.natureCode ?? null,
    zoneCode: data.zoneCode ?? null,
    status: data.status ?? null,
    logoUrl: data.logoUrl ?? null,
    isCooperating: Boolean(data.isCooperating),
    contacts: {
      schoolStaff: (data.contacts?.schoolStaff ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phoneNumber: c.phoneNumber ?? null,
        role: c.role,
      })),
      psgVolunteers: (data.contacts?.psgVolunteers ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phoneNumber: c.phoneNumber ?? null,
        role: c.role,
      })),
    },
  };
}
 
export function buildSchoolDrives(data) {
  return {
    summary: {
      total: toNumber(data?.summary?.total),
      active: toNumber(data?.summary?.active),
      upcoming: toNumber(data?.summary?.upcoming),
      completed: toNumber(data?.summary?.completed),
    },
    drives: (data?.drives ?? []).map((drive) => ({
      driveId: drive.driveId,
      driveName: drive.driveName,
      startDate: drive.startDate,
      endDate: drive.endDate,
      location: drive.location ?? null,
      status: drive.status,
      isActive: Boolean(drive.isActive),
      isUpcoming: Boolean(drive.isUpcoming),
      isCompleted: Boolean(drive.isCompleted),
      createdBy: drive.createdBy ?? null,
    })),
  };
}
 
export function buildSchoolCollectionOverview(data) {
  if (!data) {
    return {
      totalPieces: 0,
      schoolStock: 0,
      psg: 0,
      repurposing: 0,
      waste: 0,
      totalWeightKg: 0,
      percentages: { schoolStock: 0, psg: 0, repurposing: 0, waste: 0 },
    };
  }
  return {
    totalPieces: toNumber(data.totalPieces),
    schoolStock: toNumber(data.schoolStock),
    psg: toNumber(data.psg),
    repurposing: toNumber(data.repurposing),
    waste: toNumber(data.waste),
    totalWeightKg: toNumber(data.totalWeightKg),
    percentages: {
      schoolStock: toNumber(data.percentages?.schoolStock),
      psg: toNumber(data.percentages?.psg),
      repurposing: toNumber(data.percentages?.repurposing),
      waste: toNumber(data.percentages?.waste),
    },
  };
}
 
export function buildSchoolInventoryByItem(data) {
  return {
    isAdmin: Boolean(data?.isAdmin),
    items: (data?.items ?? []).map((item) => ({
      itemTypeId: item.itemTypeId,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      gender: item.gender,
      imageUrl: item.imageUrl ?? null,
      primaryColour: item.primaryColour ?? null,
      secondaryColour: item.secondaryColour ?? null,
      weightKg: toNumber(item.weightKg),
      totalPieces: toNumber(item.totalPieces),
      schoolStock: toNumber(item.schoolStock),
      psg: toNumber(item.psg),
      repurposing: toNumber(item.repurposing),
      waste: toNumber(item.waste),
      estimatedWeightKg: toNumber(item.estimatedWeightKg),
      sizes: (item.sizes ?? []).map((s) => ({
        sizeOptionId: s.sizeOptionId,
        sizeName: s.sizeName,
        sizeClass: s.sizeClass,
        sortOrder: toNumber(s.sortOrder),
        schoolStock: toNumber(s.schoolStock),
        psg: toNumber(s.psg),
        repurposing: toNumber(s.repurposing ?? 0),
        waste: toNumber(s.waste ?? 0),
        total: toNumber(s.total),
      })),
    })),
  };
}
 
export function buildSchoolCollaborations(data) {
  return {
    total: toNumber(data?.total),
    collaborations: (data?.collaborations ?? []).map((c) => ({
      id: c.id,
      activityName: c.activityName,
      yearConducted: c.yearConducted ?? null,
      remarks: c.remarks ?? null,
    })),
    byYear: (data?.byYear ?? []).map((group) => ({
      year: group.year,
      activities: (group.activities ?? []).map((a) => ({
        id: a.id,
        activityName: a.activityName,
        remarks: a.remarks ?? null,
      })),
    })),
  };
}
 
export function buildSchoolProductsCreated(data) {
  return {
    totalProducts: toNumber(data?.totalProducts),
    totalStyles: toNumber(data?.totalStyles),
    totalRecipes: toNumber(data?.totalRecipes),
    products: (data?.products ?? []).map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productType: product.productType ?? null,
      createdDate: product.createdDate,
      totalStyles: toNumber(product.totalStyles),
      totalRecipes: toNumber(product.totalRecipes),
      styles: (product.styles ?? []).map((style) => ({
        styleId: style.styleId,
        styleName: style.styleName ?? null,
        imageUrl: style.imageUrl ?? null,
        createdDate: style.createdDate,
        lastUpdated: style.lastUpdated,
        recipes: (style.recipes ?? []).map((r) => ({
          recipeId: r.recipeId,
          recipeName: r.recipeName,
          createdDate: r.createdDate,
        })),
      })),
    })),
  };
}

export function buildNetworkKPIs(data) {
  return {
    totalPieces: toNumber(data?.totalPieces),
    schoolStock: toNumber(data?.schoolStock),
    psg: toNumber(data?.psg),
    repurposing: toNumber(data?.repurposing),
    waste: toNumber(data?.waste),
    totalWeightKg: toNumber(data?.totalWeightKg),
  };
}

export function buildOverviewInventoryBySchool(data) {
  return (data ?? []).map((school) => ({
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    totalPieces: toNumber(school.totalPieces),
    totalWeightKg: toNumber(school.totalWeightKg),
    schoolStock: toNumber(school.schoolStock),
    psg: toNumber(school.psg),
    repurposing: toNumber(school.repurposing),
    waste: toNumber(school.waste),
  }));
}

export function buildOverviewInventoryByCategory(data) {
  return (data ?? []).map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    totalPieces: toNumber(category.totalPieces),
    totalWeightKg: toNumber(category.totalWeightKg),
    schoolStock: toNumber(category.schoolStock),
    psg: toNumber(category.psg),
    repurposing: toNumber(category.repurposing),
    waste: toNumber(category.waste),
  }));
}

export function buildOverviewYearlyTrend(data) {
  return (data?.years ?? []).map((entry) => ({
    year: entry.year,
    label: String(entry.year),
    donated: toNumber(entry.donated),
    sold: toNumber(entry.sold),
    repurposed: toNumber(entry.repurposed),
    disposed: toNumber(entry.disposed),
    totalWeightKg: toNumber(entry.totalWeightKg),
  }));
}

export function buildOverviewDriveParticipation(data) {
  return {
    totalSchools: toNumber(data?.totalSchools),
    participatingCount: toNumber(data?.participatingCount),
    nonParticipatingCount: toNumber(data?.nonParticipatingCount),
    participationRate: toNumber(data?.participationRate),
    schools: (data?.schools ?? []).map((school) => ({
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      isCooperating: Boolean(school.isCooperating),
      driveCount: toNumber(school.driveCount),
      drives: (school.drives ?? []).map((drive) => ({
        driveId: drive.driveId,
        driveName: drive.driveName,
        startDate: drive.startDate,
        endDate: drive.endDate,
        isActive: Boolean(drive.isActive),
      })),
    })),
  };
}

export function buildOverviewRepurposingByColour(data) {
  return {
    grandTotal: toNumber(data?.grandTotal),
    grandWeightKg: toNumber(data?.grandWeightKg),
    colours: (data?.colours ?? []).map((colour) => ({
      colourId: colour.colourId,
      colourName: colour.colourName,
      hexcode: colour.hexcode,
      totalPieces: toNumber(colour.totalPieces),
      totalWeightKg: toNumber(colour.totalWeightKg),
    })),
  };
}

export function buildOverviewProductProjections(data) {
  return {
    totalEstimatedProducts: toNumber(data?.totalEstimatedProducts),
    projections: (data?.projections ?? []).map((projection) => ({
      recipeId: projection.recipeId,
      recipeName: projection.recipeName,
      productName: projection.productName,
      styleName: projection.styleName ?? null,
      productType: projection.productType ?? null,
      school: projection.school ?? null,
      estimatedUnits: toNumber(projection.estimatedUnits),
      limitingIngredient: projection.limitingIngredient ?? null,
      ingredients: (projection.ingredients ?? []).map((ingredient) => ({
        itemTypeId: ingredient.itemTypeId,
        categoryName: ingredient.categoryName,
        colourName: ingredient.colourName ?? null,
        hexcode: ingredient.hexcode ?? null,
        sizeClass: ingredient.sizeClass ?? null,
        quantityRequired: toNumber(ingredient.quantityRequired),
        availableStock: toNumber(ingredient.availableStock),
        possibleUnits: toNumber(ingredient.possibleUnits),
      })),
    })),
  };
}

export function buildDonationVolumeRows(donationVolumeData) {
  return (donationVolumeData ?? []).map((entry) => {
    const totalDonated = (entry.byCategory ?? []).reduce(
      (sum, cat) => sum + toNumber(cat.totalQuantityDonated), 0
    );

    return {
      driveId: entry.drive?.id ?? null,
      driveName: entry.drive?.driveName ?? 'Unknown Drive',
      startDate: entry.drive?.startDate ?? null,
      endDate: entry.drive?.endDate ?? null,
      totalDonated,
      categories: (entry.byCategory ?? [])
        .map((cat) => ({
          categoryName: cat.category?.categoryName ?? 'Unknown',
          totalQuantityDonated: toNumber(cat.totalQuantityDonated),
          transactionCount: toNumber(cat.transactionCount),
        }))
        .sort((a, b) => b.totalQuantityDonated - a.totalQuantityDonated),
    };
  }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
}

export function flattenInventoryCount(data) {
  return (data ?? []).flatMap((schoolEntry) => {
    const schoolId = schoolEntry?.schoolId ?? null;
    const schoolName = schoolEntry?.schoolName ?? 'Unknown school';
    const items = schoolEntry?.items ?? {};

    return Object.entries(items).flatMap(([categoryName, sizeMap]) =>
      Object.entries(sizeMap ?? {}).map(([sizeName, counts]) => ({
        schoolId,
        schoolName,
        categoryName,
        sizeName,
        sizeClass: counts?.sizeClass ?? null,
        total: toNumber(counts?.total),
        byStatus: {
          ForSale: firstDefinedNumber(counts?.forSale, counts?.schoolForSale, counts?.psgActivities),
          ForRepurpose: firstDefinedNumber(
            counts?.forRepurpose,
            counts?.schoolForRepurpose,
            counts?.sponsorForRepurpose,
            counts?.forRepurposing,
          ),
          GeneralOffice: firstDefinedNumber(counts?.generalOffice, counts?.schoolGeneralOffice, counts?.schoolStock),
          Sold: firstDefinedNumber(counts?.sold, counts?.allSold, counts?.usedByPsg),
          Repurposed: firstDefinedNumber(counts?.repurposed, counts?.allRepurposed),
          Disposed: firstDefinedNumber(counts?.disposed, counts?.allDisposed, counts?.recyclingDisposal),
        },
      })),
    );
  });
}

export function getSchoolOptions(inventoryRows, funnelSchools = [], productGroups = []) {
  const map = new Map();

  inventoryRows.forEach((row) => {
    if (row.schoolId != null) {
      map.set(String(row.schoolId), { id: String(row.schoolId), label: row.schoolName });
    }
  });

  funnelSchools.forEach((school) => {
    if (school?.schoolId != null) {
      map.set(String(school.schoolId), { id: String(school.schoolId), label: school.schoolName });
    }
  });

  productGroups.forEach((group) => {
    if (group?.school?.id != null) {
      map.set(String(group.school.id), { id: String(group.school.id), label: group.school.schoolName });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function getCategoryOptions(inventoryRows) {
  return Array.from(new Set(inventoryRows.map((row) => row.categoryName))).sort((a, b) => a.localeCompare(b));
}

export function getSizeOptions(inventoryRows) {
  return Array.from(new Set(inventoryRows.map((row) => row.sizeName))).sort((a, b) => a.localeCompare(b));
}

export function aggregateInventoryRows(rows, { schoolId, category, size, status } = {}) {
  return rows.filter((row) => {
    if (schoolId && String(row.schoolId) !== String(schoolId)) return false;
    if (category && category !== 'all' && row.categoryName !== category) return false;
    if (size && size !== 'all' && row.sizeName !== size) return false;
    if (!status || status === 'all') return row.total > 0;
    if (status === 'onHand') {
      return ON_HAND_STATUS_KEYS.some((key) => toNumber(row.byStatus[key]) > 0);
    }
    return toNumber(row.byStatus[status]) > 0;
  });
}

export function summariseInventory(rows, status = 'all') {
  const quantityForRow = (row) => {
    if (status === 'all') return row.total;
    if (status === 'onHand') {
      return ON_HAND_STATUS_KEYS.reduce((sum, key) => sum + toNumber(row.byStatus[key]), 0);
    }
    return toNumber(row.byStatus[status]);
  };

  const byCategory = {};
  const bySize = {};
  const bySchool = {};
  const byStatus = {};

  let currentOnHand = 0;
  let totalTracked = 0;

  rows.forEach((row) => {
    const qty = quantityForRow(row);
    const onHand = ON_HAND_STATUS_KEYS.reduce((sum, key) => sum + toNumber(row.byStatus[key]), 0);

    totalTracked += row.total;
    currentOnHand += onHand;

    byCategory[row.categoryName] = (byCategory[row.categoryName] ?? 0) + qty;
    bySize[row.sizeName] = (bySize[row.sizeName] ?? 0) + qty;
    bySchool[row.schoolName] = (bySchool[row.schoolName] ?? 0) + qty;

    Object.entries(row.byStatus).forEach(([key, value]) => {
      byStatus[STATUS_LABELS[key]] = (byStatus[STATUS_LABELS[key]] ?? 0) + toNumber(value);
    });
  });

  return {
    currentOnHand,
    totalTracked,
    byCategory: toSortedEntries(byCategory),
    bySize: toSortedEntries(bySize),
    bySchool: toSortedEntries(bySchool),
    byStatus: toSortedEntries(byStatus),
  };
}

function toSortedEntries(record) {
  return Object.entries(record)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function buildMonthlySeries(monthly = [], { startMonth = 1, endMonth = 12 } = {}) {
  return (monthly ?? [])
    .filter((entry) => entry.month >= startMonth && entry.month <= endMonth)
    .map((entry) => ({
      month: entry.month,
      label: MONTH_LABELS[entry.month - 1] ?? `M${entry.month}`,
      donated: toNumber(entry.donated),
      sold: toNumber(entry.sold),
      repurposed: toNumber(entry.repurposed),
      disposed: toNumber(entry.disposed),
      donatedKg: toNumber(entry.donatedKg),
      soldKg: toNumber(entry.soldKg),
      repurposedKg: toNumber(entry.repurposedKg),
      disposedKg: toNumber(entry.disposedKg),
      transferred: toNumber(entry.transferred),
      statusChanged: toNumber(entry.statusChanged),
    }));
}

export function summariseMonthlySeries(series) {
  return series.reduce(
    (summary, month) => ({
      donated: summary.donated + month.donated,
      sold: summary.sold + month.sold,
      repurposed: summary.repurposed + month.repurposed,
      disposed: summary.disposed + month.disposed,
      donatedKg: summary.donatedKg + month.donatedKg,
      soldKg: summary.soldKg + month.soldKg,
      repurposedKg: summary.repurposedKg + month.repurposedKg,
      disposedKg: summary.disposedKg + month.disposedKg,
      transferred: summary.transferred + month.transferred,
      statusChanged: summary.statusChanged + month.statusChanged,
    }),
    {
      donated: 0,
      sold: 0,
      repurposed: 0,
      disposed: 0,
      donatedKg: 0,
      soldKg: 0,
      repurposedKg: 0,
      disposedKg: 0,
      transferred: 0,
      statusChanged: 0,
    },
  );
}

export function buildRates({ donated, sold, repurposed, disposed }) {
  const processed = sold + repurposed + disposed;

  return {
    sellThroughRate: donated > 0 ? Number(((sold / donated) * 100).toFixed(1)) : 0,
    repurposeRate: donated > 0 ? Number(((repurposed / donated) * 100).toFixed(1)) : 0,
    recoveryRate: donated > 0 ? Number((((sold + repurposed) / donated) * 100).toFixed(1)) : 0,
    disposalRate: processed > 0 ? Number(((disposed / processed) * 100).toFixed(1)) : 0,
  };
}

export function buildSchoolContributionRows(funnelSchools = []) {
  return (funnelSchools ?? [])
    .map((school) => ({
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      donated: toNumber(school?.totals?.donated),
      sold: toNumber(school?.totals?.sold),
      repurposed: toNumber(school?.totals?.repurposed),
      disposed: toNumber(school?.totals?.disposed),
      currentForSale: toNumber(school?.totals?.currentForSale),
      currentForRepurpose: toNumber(school?.totals?.currentForRepurpose),
      sellThroughRate: toNumber(school?.totals?.sellThroughRate),
      recoveryRate: toNumber(school?.totals?.recoveryRate),
      disposalRate: toNumber(school?.totals?.disposalRate),
    }))
    .sort((a, b) => b.donated - a.donated || b.recoveryRate - a.recoveryRate || a.schoolName.localeCompare(b.schoolName));
}

export function buildCircularityRows(funnelSchools = [], schoolId = '') {
  const source = schoolId
    ? (funnelSchools ?? []).filter((school) => String(school.schoolId) === String(schoolId))
    : (funnelSchools ?? []);

  return source.reduce(
    (summary, school) => ({
      donated: summary.donated + toNumber(school?.totals?.donated),
      sold: summary.sold + toNumber(school?.totals?.sold),
      repurposed: summary.repurposed + toNumber(school?.totals?.repurposed),
      disposed: summary.disposed + toNumber(school?.totals?.disposed),
      currentForSale: summary.currentForSale + toNumber(school?.totals?.currentForSale),
      currentForRepurpose: summary.currentForRepurpose + toNumber(school?.totals?.currentForRepurpose),
      generalOffice: summary.generalOffice + toNumber(school?.totals?.generalOffice),
    }),
    {
      donated: 0,
      sold: 0,
      repurposed: 0,
      disposed: 0,
      currentForSale: 0,
      currentForRepurpose: 0,
      generalOffice: 0,
    },
  );
}

export function buildProductSummary(productGroups = [], schoolId = '') {
  const groups = schoolId
    ? (productGroups ?? []).filter((group) => String(group?.school?.id) === String(schoolId))
    : (productGroups ?? []);

  const byType = {};
  const byStyle = {};
  let productCount = 0;
  let recipeCount = 0;
  let productsWithRecipes = 0;

  groups.forEach((group) => {
    (group?.products ?? []).forEach((product) => {
      productCount += 1;
      recipeCount += toNumber(product.recipeCount);
      if (toNumber(product.recipeCount) > 0) {
        productsWithRecipes += 1;
      }

      const typeName = product?.productType?.typeName ?? 'Unclassified';
      byType[typeName] = (byType[typeName] ?? 0) + 1;

      (product?.productStyles ?? []).forEach((productStyle) => {
        const styleName = productStyle?.style?.styleName ?? 'Unstyled';
        byStyle[styleName] = (byStyle[styleName] ?? 0) + 1;
      });
    });
  });

  return {
    schoolCount: groups.length,
    productCount,
    recipeCount,
    productsWithRecipes,
    recipeCoverageRate: productCount > 0 ? Number(((productsWithRecipes / productCount) * 100).toFixed(1)) : 0,
    byType: toSortedEntries(byType),
    byStyle: toSortedEntries(byStyle),
  };
}

export function buildSchoolRankingRows(rankingsData) {
  return (rankingsData?.schools ?? []).map((school) => ({
    rank: school.rank,
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    donated: toNumber(school.totalDonated),
    sold: toNumber(school.totalSold),
    repurposed: toNumber(school.totalRepurposed),
    redistributionRate: toNumber(school.redistributionRate),
    recoveryRate: toNumber(school.recoveryRate),
    deviationFromAverage: toNumber(school.deviationFromAverage),
  }));
}

export function buildActiveDriveSummary(activeDrivesData) {
  const drives = activeDrivesData?.drives ?? [];
  const totalQuantity = drives.reduce((sum, drive) => sum + toNumber(drive.totalQuantity), 0);
  const totalEstimatedWeightKg = drives.reduce((sum, drive) => sum + toNumber(drive.totalEstimatedWeightKg), 0);
  const averageRemainingDays = drives.length > 0
    ? Number((drives.reduce((sum, drive) => sum + toNumber(drive.remainingDays), 0) / drives.length).toFixed(1))
    : 0;

  return {
    count: drives.length,
    totalQuantity,
    totalEstimatedWeightKg: Number(totalEstimatedWeightKg.toFixed(3)),
    averageRemainingDays,
    drives: drives.map((drive) => ({
      driveId: drive.driveId,
      driveName: drive.driveName,
      schoolId: drive.schoolId,
      schoolName: drive.schoolName,
      location: drive.location,
      transactionCount: toNumber(drive.transactionCount),
      totalQuantity: toNumber(drive.totalQuantity),
      totalEstimatedWeightKg: toNumber(drive.totalEstimatedWeightKg),
      averageDailyQuantity: toNumber(drive.averageDailyQuantity),
      averageDailyWeightKg: toNumber(drive.averageDailyWeightKg),
      remainingDays: toNumber(drive.remainingDays),
      isActive: Boolean(drive.isActive),
      categories: (drive.categories ?? []).map((category) => ({
        categoryName: category.categoryName,
        totalQuantity: toNumber(category.totalQuantity),
        totalEstimatedWeightKg: toNumber(category.totalEstimatedWeightKg),
      })),
      sizes: (drive.sizes ?? []).map((size) => ({
        sizeName: size.sizeName,
        sizeClass: size.sizeClass,
        totalQuantity: toNumber(size.totalQuantity),
      })),
    })),
  };
}

export function buildDonationBreakdownSummary(donationBreakdownData, schoolId = '') {
  const schools = schoolId
    ? (donationBreakdownData?.schools ?? []).filter((school) => String(school.schoolId) === String(schoolId))
    : (donationBreakdownData?.schools ?? []);
  const categoryTotals = {};
  const sizeTotals = {};

  const schoolRows = schools
    .map((school) => {
      (school.categories ?? []).forEach((category) => {
        if (!categoryTotals[category.categoryName]) {
          categoryTotals[category.categoryName] = {
            label: category.categoryName,
            value: 0,
            estimatedWeightKg: 0,
          };
        }
        categoryTotals[category.categoryName].value += toNumber(category.totalQuantity);
        categoryTotals[category.categoryName].estimatedWeightKg += toNumber(category.totalEstimatedWeightKg);
      });

      (school.sizes ?? []).forEach((size) => {
        const label = size.sizeName ?? 'Unknown';
        if (!sizeTotals[label]) {
          sizeTotals[label] = {
            label,
            value: 0,
          };
        }
        sizeTotals[label].value += toNumber(size.totalQuantity);
      });

      const topCategory = (school.categories ?? [])[0]?.categoryName ?? 'N/A';
      const topSize = (school.sizes ?? [])[0]?.sizeName ?? 'N/A';

      return {
        schoolId: school.schoolId,
        schoolName: school.schoolName,
        totalQuantity: toNumber(school.totalQuantity),
        totalEstimatedWeightKg: toNumber(school.totalEstimatedWeightKg),
        topCategory,
        topSize,
      };
    })
    .sort((a, b) => b.totalQuantity - a.totalQuantity || a.schoolName.localeCompare(b.schoolName));

  return {
    totalQuantity: schoolRows.reduce((sum, school) => sum + school.totalQuantity, 0),
    totalEstimatedWeightKg: Number(
      schoolRows.reduce((sum, school) => sum + school.totalEstimatedWeightKg, 0).toFixed(3),
    ),
    schoolRows,
    categories: Object.values(categoryTotals)
      .map((category) => ({
        ...category,
        estimatedWeightKg: Number(category.estimatedWeightKg.toFixed(3)),
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    sizes: Object.values(sizeTotals).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
  };
}

export function buildDrivePerformanceSummary(drivePerformanceData) {
  const drives = (drivePerformanceData?.drives ?? [])
    .map((drive) => ({
      driveId: drive.driveId,
      driveName: drive.driveName,
      schoolId: drive.schoolId,
      schoolName: drive.schoolName,
      location: drive.location,
      startDate: drive.startDate,
      endDate: drive.endDate,
      isActive: Boolean(drive.isActive),
      transactionCount: toNumber(drive.transactionCount),
      totalQuantity: toNumber(drive.totalQuantity),
      totalEstimatedWeightKg: toNumber(drive.totalEstimatedWeightKg),
      averageDailyQuantity: toNumber(drive.averageDailyQuantity),
      averageDailyWeightKg: toNumber(drive.averageDailyWeightKg),
      remainingDays: toNumber(drive.remainingDays),
      topCategory: (drive.categories ?? [])[0]?.categoryName ?? 'N/A',
      topSize: (drive.sizes ?? [])[0]?.sizeName ?? 'N/A',
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity || String(a.driveName).localeCompare(String(b.driveName)));

  return {
    totalDrives: drives.length,
    activeDrives: drives.filter((drive) => drive.isActive).length,
    totalQuantity: drives.reduce((sum, drive) => sum + drive.totalQuantity, 0),
    totalEstimatedWeightKg: Number(drives.reduce((sum, drive) => sum + drive.totalEstimatedWeightKg, 0).toFixed(3)),
    drives,
    chartRows: drives.slice(0, 8).map((drive) => ({
      label: drive.driveName,
      value: drive.totalQuantity,
      estimatedWeightKg: drive.totalEstimatedWeightKg,
      isActive: drive.isActive,
    })),
  };
}

export function buildStockByLocationSummary(stockByLocationData, schoolId = '') {
  const schools = schoolId
    ? (stockByLocationData?.schools ?? []).filter((school) => String(school.schoolId) === String(schoolId))
    : (stockByLocationData?.schools ?? []);
  const locations = {};

  schools.forEach((school) => {
    (school.locations ?? []).forEach((location) => {
      if (!locations[location.storedAt]) {
        locations[location.storedAt] = {
          label: formatStoredAtLabel(location.storedAt),
          storedAt: location.storedAt,
          quantity: 0,
          estimatedWeightKg: 0,
          statuses: {},
        };
      }

      locations[location.storedAt].quantity += toNumber(location.totalQuantity);
      locations[location.storedAt].estimatedWeightKg += toNumber(location.totalEstimatedWeightKg);

      (location.statuses ?? []).forEach((status) => {
        const label = STATUS_LABELS[status.itemStatus] ?? status.itemStatus;
        if (!locations[location.storedAt].statuses[label]) {
          locations[location.storedAt].statuses[label] = {
            label,
            quantity: 0,
            estimatedWeightKg: 0,
          };
        }
        locations[location.storedAt].statuses[label].quantity += toNumber(status.quantity);
        locations[location.storedAt].statuses[label].estimatedWeightKg += toNumber(status.estimatedWeightKg);
      });
    });
  });

  return Object.values(locations)
    .map((location) => ({
      label: location.label,
      storedAt: location.storedAt,
      value: location.quantity,
      estimatedWeightKg: Number(location.estimatedWeightKg.toFixed(3)),
      statuses: Object.values(location.statuses).sort((a, b) => b.quantity - a.quantity),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function buildCooperationSummary(cooperationData) {
  return (cooperationData?.groups ?? []).map((group) => ({
    label: group.label,
    schoolCount: toNumber(group.schoolCount),
    donated: toNumber(group.donated),
    sold: toNumber(group.sold),
    repurposed: toNumber(group.repurposed),
    disposed: toNumber(group.disposed),
    recovered: toNumber(group.recovered),
    donatedKg: toNumber(group.donatedKg),
    soldKg: toNumber(group.soldKg),
    repurposedKg: toNumber(group.repurposedKg),
    disposedKg: toNumber(group.disposedKg),
    recoveredKg: toNumber(group.recoveredKg),
    sellThroughRate: toNumber(group.sellThroughRate),
    recoveryRate: toNumber(group.recoveryRate),
    disposalRate: toNumber(group.disposalRate),
  }));
}

export function buildSustainabilitySummary(sustainabilityData) {
  const summary = sustainabilityData?.summary ?? {};
  const categories = sustainabilityData?.categories ?? [];

  return {
    donatedUnits: toNumber(summary.donatedUnits),
    soldUnits: toNumber(summary.soldUnits),
    repurposedUnits: toNumber(summary.repurposedUnits),
    disposedUnits: toNumber(summary.disposedUnits),
    donatedKg: toNumber(summary.donatedKg),
    soldKg: toNumber(summary.soldKg),
    repurposedKg: toNumber(summary.repurposedKg),
    disposedKg: toNumber(summary.disposedKg),
    divertedUnits: toNumber(summary.divertedUnits),
    divertedKg: toNumber(summary.divertedKg),
    diversionRate: toNumber(summary.diversionRate),
    categories: categories.map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      donatedUnits: toNumber(category.donatedUnits),
      soldUnits: toNumber(category.soldUnits),
      repurposedUnits: toNumber(category.repurposedUnits),
      disposedUnits: toNumber(category.disposedUnits),
      donatedKg: toNumber(category.donatedKg),
      soldKg: toNumber(category.soldKg),
      repurposedKg: toNumber(category.repurposedKg),
      disposedKg: toNumber(category.disposedKg),
    })),
  };
}

export function formatStoredAtLabel(value) {
  const labels = {
    School: 'School',
    SponsorOffice: 'Sponsor office',
    Exited: 'Exited',
  };

  return labels[value] ?? value ?? 'Unknown';
}

export { MONTH_LABELS, ON_HAND_STATUS_KEYS };
