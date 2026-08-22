// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, createContext, useContext, memo } from 'react';

// mui
import { DataGrid, GridToolbar, GridRow } from '@mui/x-data-grid';
import { Box, Typography, CircularProgress, Collapse, IconButton } from '@mui/material';

// icon
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SellIcon from '@mui/icons-material/Sell';
import RecyclingIcon from '@mui/icons-material/Recycling';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';

// components
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CustomErrorButton from '@/components/ui/CustomErrorButton';

// ── Context for detail panel state ──────────────────────────────────────────
const DetailContext = createContext({
  selectedTxn: null,
  setSelectedTxn: () => { },
  itemTypeDetail: null,
  detailLoading: false,
});

// ── Status badge classes (Tailwind) ──────────────────────────────────────────
const STATUS_BADGE_CLASSES = {
  'For Sale': 'bg-yellow-50 text-yellow-700 border border-yellow-300',
  'For PSG Activities': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Sold': 'bg-red-50 text-red-700 border border-red-200',
  'Used by PSG': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'For Repurpose': 'bg-blue-50 text-blue-700 border border-blue-200',
  'For TCC Repurposing': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Repurposed': 'bg-green-50 text-green-700 border border-green-300',
  'Repurposed by TCC': 'bg-green-50 text-green-700 border border-green-300',
  'Disposed': 'bg-gray-100 text-gray-700 border border-gray-300',
  'Recycled/Disposed': 'bg-gray-100 text-gray-700 border border-gray-300',
  'General Office' : 'bg-teal-50 text-teal-700 border border-teal-300',
  'For School' : 'bg-teal-50 text-teal-700 border border-teal-300',
};

const TXN_TYPE_BADGE_CLASSES = {
  'Donation In': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Transfer': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Status Change': 'bg-purple-50 text-purple-700 border border-purple-200',
  'Sale': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Repurposing': 'bg-teal-50 text-teal-700 border border-teal-200',
  'Disposal': 'bg-gray-100 text-gray-600 border border-gray-300',
};

const TXN_TYPE_ICONS = {
  'Donation In': VolunteerActivismIcon,
  'Transfer': SwapHorizIcon,
  'Status Change': SyncAltIcon,
  'Sale': SellIcon,
  'Repurposing': RecyclingIcon,
  'Disposal': DeleteOutlineIcon,
};

function TransactionTypeChip({ type }) {
  const cls = type
    ? (TXN_TYPE_BADGE_CLASSES[type] || 'bg-gray-50 text-gray-600 border border-gray-200')
    : 'bg-gray-50 text-gray-500 border border-gray-200';
  const Icon = type ? TXN_TYPE_ICONS[type] : null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${cls}`}>
      {Icon && <Icon style={{ fontSize: 13 }} />}
      {type || '—'}
    </span>
  );
}

function StatusChip({ status }) {
  const cls = status
    ? (STATUS_BADGE_CLASSES[status] || 'bg-gray-50 text-gray-600 border border-gray-200')
    : 'bg-gray-50 text-gray-500 border border-gray-200';
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${cls}`}>
      {status || '—'}
    </span>
  );
}

// ── Detail field helper ─────────────────────────────────────────────────────
function DetailField({ label, value, custom }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.65rem',
        }}
      >
        {label}
      </Typography>
      {custom || (
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          {value || '-'}
        </Typography>
      )}
    </Box>
  );
}

// ── Custom row with inline detail panel ─────────────────────────────────────
const CustomRow = memo(function CustomRow(props) {
  const { selectedTxn, setSelectedTxn, itemTypeDetail, detailLoading } =
    useContext(DetailContext);
  const isExpanded = props.rowId === selectedTxn?.id;

  return (
    <div>
      <GridRow {...props} />
      <Collapse in={isExpanded} timeout={200} unmountOnExit>
        <Box
          sx={{
            borderTop: '1px solid',
            borderBottom: '2px solid',
            borderColor: 'divider',
            backgroundColor: '#FAFBFC',
            position: 'relative',
            px: 3,
            py: 2.5,
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTxn(null);
            }}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* ── Transaction Details ──────────────────────────── */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1.5fr 1.5fr' },
              gap: 2,
              mb: 2.5,
            }}
          >
            <DetailField label="Sender" value={selectedTxn?.fromStoredAtLabel} />
            <DetailField label="Receiver" value={selectedTxn?.toStoredAtLabel} />
            <DetailField
              label="Donation Drive"
              value={selectedTxn?.donationDrive?.driveName}
            />
            <DetailField label="Remarks" value={selectedTxn?.remarks} />
          </Box>

          {/* ── Item Type Details Card ─────────────────────────── */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              backgroundColor: '#fff',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: '#F8F9FA',
              }}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: '0.7rem',
                }}
              >
                Item Type Details
              </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              {detailLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    Loading item details...
                  </Typography>
                </Box>
              ) : itemTypeDetail ? (
                <Box sx={{ display: 'flex', gap: 2.5 }}>
                  {/* Image thumbnail */}
                  {itemTypeDetail.imageUrl ? (
                    <Box
                      component="img"
                      src={itemTypeDetail.imageUrl}
                      alt={itemTypeDetail.category?.categoryName || 'Item'}
                      sx={{
                        width: 88,
                        height: 88,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 88,
                        height: 88,
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                        backgroundColor: '#F5F5F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        No image
                      </Typography>
                    </Box>
                  )}

                  {/* Details grid beside image */}
                  <Box
                    sx={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                      gap: 2,
                      alignContent: 'start',
                    }}
                  >
                    <DetailField
                      label="Category"
                      value={itemTypeDetail.category?.categoryName}
                    />
                    <DetailField label="Gender" value={itemTypeDetail.gender} />
                    <DetailField
                      label="Primary Colour"
                      value={
                        itemTypeDetail.primaryColour ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: itemTypeDetail.primaryColour.hexcode,
                                border: '1px solid #ccc',
                                flexShrink: 0,
                              }}
                            />
                            {itemTypeDetail.primaryColour.colourName}
                          </Box>
                        ) : null
                      }
                    />
                    <DetailField
                      label="Secondary Colour"
                      value={
                        itemTypeDetail.secondaryColour ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: itemTypeDetail.secondaryColour.hexcode,
                                border: '1px solid #ccc',
                                flexShrink: 0,
                              }}
                            />
                            {itemTypeDetail.secondaryColour.colourName}
                          </Box>
                        ) : null
                      }
                    />
                    <DetailField
                      label="Pattern"
                      value={itemTypeDetail.pattern?.patternName}
                    />
                    <DetailField
                      label="Material"
                      value={itemTypeDetail.material?.materialName}
                    />
                    <DetailField
                      label="Size Category"
                      value={itemTypeDetail.sizeCategory?.sizeCategoryName}
                    />
                    <DetailField
                      label="Size"
                      value={selectedTxn?.sizeOption?.sizeName}
                    />
                  </Box>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No item type information available
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </div>
  );
});

// ── Column definitions ──────────────────────────────────────────────────────
const buildColumns = () => [
  {
    field: 'transactionDate',
    headerName: 'Date',
    width: 160,
    type: 'dateTime',
    valueGetter: (value) => (value ? new Date(value) : null),
    renderCell: ({ value }) => {
      if (!value) return '-';
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%',
            gap: 0,
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.1 }}>
            {value.toLocaleDateString('en-SG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.1 }}
          >
            {value.toLocaleTimeString('en-SG', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </Typography>
        </Box>
      );
    },
  },
  {
    field: 'userName',
    headerName: 'User',
    width: 160,
    valueGetter: (value, row) => {
      const u = row.user;
      return u ? `${u.firstName} ${u.lastName}` : '-';
    },
    renderCell: ({ row }) => {
      const u = row.user;
      if (!u) return '-';
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%',
            gap: 0,
          }}
        >
          <Typography variant="body2">{`${u.firstName} ${u.lastName}`}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.userRoleLabel || '-'}
          </Typography>
        </Box>
      );
    },
  },
  {
    field: 'schoolName',
    headerName: 'School',
    flex: 1,
    minWidth: 160,
    valueGetter: (value, row) => row.itemType?.school?.schoolName || '-',
  },
  {
    field: 'itemType',
    headerName: 'Item Type - Colour (Size)',
    flex: 1.2,
    minWidth: 180,
    // keep valueGetter for sorting/filtering
    valueGetter: (value, row) => {
      const category = value?.category?.categoryName;
      if (!category) return '-';
      const colour = value?.primaryColour?.colourName;
      const size = row.sizeOption?.sizeName;
      return `${category}${colour ? ` - ${colour}` : ''}${size ? ` (${size})` : ''}`;
    },
    renderCell: ({ row }) => {
      const item = row.itemType;
      const category = item?.category?.categoryName;
      if (!category) return '-';

      const colour = item?.primaryColour;
      const size = row.sizeOption?.sizeName;

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, height: '100%' }}>
          <span>{category}</span>
          {colour && (
            <>
              <span>-</span>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: colour.hexcode, // e.g. '#FFFFFF'
                  border: '1px solid #ccc',           // helps white colors show
                  flexShrink: 0,
                }}
              />
              <span>{colour.colourName}</span>
            </>
          )}
          {size && <span style={{ color: '#888' }}>({size})</span>}
        </Box>
      );
    },
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 80,
    type: 'number',
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'transactionTypeLabel',
    headerName: 'Type',
    width: 160,  // was 140
    type: 'singleSelect',
    valueOptions: ['Donation In', 'Transfer', 'Status Change', 'Sale', 'Repurposing', 'Disposal'],
    renderCell: ({ value }) => <TransactionTypeChip type={value} />,
  },
  {
    field: 'statusChange',
    headerName: 'Status',
    width: 240,
    sortable: false,
    filterable: false,
    valueGetter: (value, row) => {
      const from = row.fromStatusLabel || '-';
      const to = row.toStatusLabel || '-';
      return `${from} → ${to}`;
    },
    renderCell: ({ row }) => {
      const from = row.fromStatusLabel;
      const to = row.toStatusLabel;
      if (!from && !to) return '-';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
          <StatusChip status={from} />
          <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <StatusChip status={to} />
        </Box>
      );
    },
  },
];

// ── Main component ──────────────────────────────────────────────────────────
export default function TransactionPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [itemTypeDetail, setItemTypeDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,        // MUI DataGrid is 0-indexed
    pageSize: 10,
  });

  const columns = useMemo(() => buildColumns(), []);

  useEffect(() => {
    fetchTransactions(paginationModel.page, paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize]);

  const fetchTransactions = async (page = paginationModel.page, pageSize = paginationModel.pageSize) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/inventory/transactions?page=${page + 1}&limit=${pageSize}`);

      if (!response.ok) throw new Error('Failed to fetch transactions');

      const result = await response.json();

      // Prisma sorted by 'transactionDate: desc'
      setTransactions(result.data || []);
      setRowCount(result.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (params) => {
    // Toggle off if clicking the same row
    if (selectedTxn?.id === params.row.id) {
      setSelectedTxn(null);
      setItemTypeDetail(null);
      return;
    }

    setSelectedTxn(params.row);
    setItemTypeDetail(null);

    const itemTypeId = params.row.itemType?.id;
    if (!itemTypeId) return;

    try {
      setDetailLoading(true);
      const res = await fetch(`/api/inventory/item-types/${itemTypeId}`);
      if (!res.ok) throw new Error('Failed to fetch item type');
      const result = await res.json();
      setItemTypeDetail(result.itemType || result);
    } catch (err) {
      console.error('Error fetching item type details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingSpinner message="Loading activity logs..." />;
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Activity Logs Page"
        message={error}
        onRetry={fetchTransactions}
      />
    );
  }

  // ── Data grid ─────────────────────────────────────────────────────────────
  return (
    <Box p={4}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: 'var(--color-darker)' }}>
            Activity Logs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {rowCount} total record{rowCount !== 1 ? 's' : ''} across all schools — click a row for details
          </Typography>
        </Box>

      </Box>
      <Box
        sx={{
          height: 680,
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 2,
          boxShadow: 1,
          overflow: 'hidden',
        }}
      >
        <DetailContext.Provider
          value={{
            selectedTxn,
            setSelectedTxn,
            itemTypeDetail,
            detailLoading,
          }}
        >
          <DataGrid
            rows={transactions}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            disableVirtualization
            slots={{
              toolbar: GridToolbar,
              row: CustomRow,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 300 },
                printOptions: { disableToolbarButton: true },
              },
            }}
            getRowClassName={(params) =>
              params.row.id === selectedTxn?.id ? 'row-selected-detail' : ''
            }
            paginationMode="server"
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              sorting: {
                sortModel: [{ field: 'transactionDate', sort: 'desc' }],
              },
            }}
            disableRowSelectionOnClick
            density="comfortable"
            sx={{
              border: 'none',
              cursor: 'pointer',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'var(--color-bg-light)',
                fontWeight: 600,
              },
              '& .MuiDataGrid-cell .MuiTypography-root': {
                lineHeight: 1.3,
              },
              '& .row-selected-detail': {
                backgroundColor: 'var(--color-bg-light) !important',
                borderLeft: '3px solid var(--color-main)',
              },
            }}
          />
        </DetailContext.Provider>
      </Box>
    </Box>
  );
}
