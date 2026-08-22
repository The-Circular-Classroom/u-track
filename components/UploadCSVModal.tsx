// @ts-nocheck
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

// icons
import { FaCheck } from 'react-icons/fa6';
import { TbCancel } from 'react-icons/tb';
import { IoClose } from 'react-icons/io5';
import { MdCallSplit } from 'react-icons/md';

// components
import SnackbarAlert from '@/components/SnackbarAlert';
import CustomButton from '@/components/ui/CustomButton';

const MAX_UPLOAD_FILE_SIZE_MB = 10;
const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;
const RAW_REQUIRED_HEADERS = [
  'school name',
  'name of donation drive',
  'start date',
  'end date',
  'item type id',
  'item name',
  'user id',
  'school id',
  'donation drive id',
  'size name',
  'storage location',
];
const RAW_METRIC_HEADERS = [
  { header: 'for psg activities', label: 'For PSG Activities' },
  { header: 'for school', label: 'For School' },
  { header: 'for school stock', label: 'For School' },
  { header: 'for tcc repurposing', label: 'For TCC Repurposing' },
  { header: 'for repurposing for tcc storage', label: 'For TCC Repurposing' },
  { header: 'for recycling/disposal', label: 'For Recycling/Disposal' },
];

// ============================================================
// Helpers
// ============================================================

/**
 * Parse the new matrix-format Excel file.
 * Returns fixedValues lookup, parsed transactions, and metadata.
 */
function parseMatrixFile(workbook) {
  // 1. Read fixed values sheet
  const fixedSheetName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === 'fixed values'
  );
  if (!fixedSheetName) {
    throw new Error('Missing "fixed values" sheet in the uploaded file.');
  }

  const fixedSheet = workbook.Sheets[fixedSheetName];
  const fixedRows = XLSX.utils.sheet_to_json(fixedSheet);

  if (!fixedRows || fixedRows.length === 0) {
    throw new Error('"fixed values" sheet is empty.');
  }

  // Build lookup: item_name → fixed values row
  const itemLookup = {};
  for (const row of fixedRows) {
    const itemName = String(row.item_name || '').trim();
    if (itemName) {
      itemLookup[itemName] = {
        colour_name: String(row.colour_name || '').trim(),
        gender: String(row.gender || 'Unisex').trim(),
        item_type_id: row.item_type_id,
        category_name: String(row.category_name || '').trim(),
        user_id: row.user_id,
        school_id: row.school_id,
        donation_drive_id: row.donation_drive_id,
        location: String(row.location || '').trim(),
        has_sizes: String(row.has_sizes || 'no').toLowerCase() === 'yes',
        available_sizes: String(row.available_sizes || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
    }
  }

  // Validate fixed values have required fields
  for (const [itemName, vals] of Object.entries(itemLookup)) {
    const missingFields = [];
    if (!vals.item_type_id) missingFields.push('item_type_id');
    if (!vals.user_id) missingFields.push('user_id');
    if (!vals.school_id) missingFields.push('school_id');
    if (!vals.donation_drive_id) missingFields.push('donation_drive_id');
    if (!vals.location) missingFields.push('location');

    if (missingFields.length > 0) {
      throw new Error(
        `"fixed values" is missing required fields for "${itemName}": ${missingFields.join(', ')}. Do not modify the fixed values sheet.`
      );
    }
  }

  // 2. Read "Donations" sheet (stacked format)
  const donationsSheetName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === 'donations'
  );
  if (!donationsSheetName) {
    throw new Error('Missing "Donations" sheet in the uploaded file.');
  }

  const ws = workbook.Sheets[donationsSheetName];
  const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!sheetData || sheetData.length < 3) {
    throw new Error('Donations sheet must contain at least one item type section.');
  }

  // 3. Parse stacked format: label → headers → data → empty → repeat
  const transactions = [];
  const sheetSummaries = [];
  const locationValue = fixedRows[0]?.location || '';

  let i = 0;
  while (i < sheetData.length) {
    const row = sheetData[i];

    // Skip empty rows
    if (!row || !row[0] || String(row[0]).trim() === '') {
      i++;
      continue;
    }

    // Check if this is a label row (item name that exists in fixed values)
    const cellValue = String(row[0]).trim();
    const fixedVals = itemLookup[cellValue];

    if (fixedVals) {
      // This is a label row — next row should be column headers, then data row
      const itemName = cellValue;

      // Read header row
      i++;
      if (i >= sheetData.length) break;
      const headerRow = sheetData[i];
      if (!headerRow || !headerRow[0]) {
        i++;
        continue;
      }

      const columnHeaders = headerRow.map((h) =>
        h ? String(h).trim() : ''
      );

      // Validate first column is "location"
      if (columnHeaders[0].toLowerCase() !== 'location') {
        throw new Error(
          `Expected "location" header after "${itemName}" label, got "${columnHeaders[0]}". The file may have been modified.`
        );
      }

      // Find remarks column and status columns
      const remarksIdx = columnHeaders.findIndex(
        (h) => h.toLowerCase() === 'remarks'
      );
      const statusColumns = columnHeaders
        .slice(1, remarksIdx !== -1 ? remarksIdx : undefined)
        .filter(Boolean);

      if (statusColumns.length === 0) {
        throw new Error(
          `No status columns found for "${itemName}". The file may have been modified.`
        );
      }

      let itemTotal = 0;

      // Read data row(s) — there should be one data row per item section
      i++;
      while (i < sheetData.length) {
        const dataRow = sheetData[i];

        // Empty row or next label = end of this section
        if (!dataRow || !dataRow[0] || String(dataRow[0]).trim() === '') {
          i++;
          break;
        }

        // Check if this is the next label row (exists in itemLookup)
        const nextCellValue = String(dataRow[0]).trim();
        if (itemLookup[nextCellValue]) {
          break; // Don't increment i — let the outer loop handle it
        }

        const location = String(dataRow[0]).trim();

        statusColumns.forEach((status) => {
          const colIdx = columnHeaders.indexOf(status);
          const quantity = parseInt(dataRow[colIdx]) || 0;

          if (quantity <= 0) return;

          if (quantity > 10000) {
            throw new Error(
              `"${itemName}" - ${location}: Quantity ${quantity} exceeds maximum of 10,000.`
            );
          }

          // Get remarks
          const remarks = remarksIdx !== -1 && dataRow[remarksIdx]
            ? String(dataRow[remarksIdx]).trim()
            : '';

          transactions.push({
            item_type_id: fixedVals.item_type_id,
            user_id: fixedVals.user_id,
            school_id: fixedVals.school_id,
            donation_drive_id: fixedVals.donation_drive_id,
            to_stored_at: location,
            to_status: status,
            size_name: 'One Size',
            quantity,
            remarks,
            // display metadata
            _item_name: itemName,
            _category: fixedVals.category_name,
            _colour: fixedVals.colour_name,
            _gender: fixedVals.gender,
            _has_sizes: fixedVals.has_sizes,
            _available_sizes: fixedVals.available_sizes,
          });
          itemTotal += quantity;
        });

        i++;
      }

      sheetSummaries.push({
        itemName,
        category: fixedVals.category_name,
        colour: fixedVals.colour_name,
        gender: fixedVals.gender,
        itemTypeId: fixedVals.item_type_id,
        hasSizes: fixedVals.has_sizes,
        availableSizes: fixedVals.available_sizes,
        totalItems: itemTotal,
      });
    } else {
      // Unknown row — could be a header row without a label, skip
      i++;
    }
  }

  // Validate we found at least some items in fixed values
  const unmatchedItems = Object.keys(itemLookup).filter(
    (name) => !sheetSummaries.find((s) => s.itemName === name)
  );
  if (unmatchedItems.length > 0) {
    console.warn('Items in fixed values not found in Donations sheet:', unmatchedItems);
  }

  return {
    sourceType: 'matrix',
    itemLookup,
    transactions,
    sheetSummaries,
    location: locationValue,
    categoryName: fixedRows[0]?.category_name || 'Unknown',
  };
}

function parseCsvDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  ) {
    return parsed;
  }
  return null;
}

function parseRawCsvFile(workbook) {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rows || rows.length < 2) {
    throw new Error('Raw CSV must contain headers and at least one data row.');
  }

  const headers = rows[0].map((header) => String(header || '').trim());
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const headerSet = new Set(normalizedHeaders);
  const missingHeaders = RAW_REQUIRED_HEADERS.filter((header) => !headerSet.has(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing raw CSV headers: ${missingHeaders.join(', ')}`);
  }

  const metricHeaders = RAW_METRIC_HEADERS.filter((metric) => headerSet.has(metric.header));
  if (metricHeaders.length === 0) {
    throw new Error('Raw CSV must include at least one item categorization metric quantity column.');
  }

  const transactions = [];
  const summaryByItem = new Map();

  rows.slice(1).forEach((row, rowIndex) => {
    if (!row || row.every((cell) => String(cell || '').trim() === '')) return;

    const rowNumber = rowIndex + 2;
    const data = {};
    normalizedHeaders.forEach((header, index) => {
      data[header] = String(row[index] ?? '').trim();
    });

    RAW_REQUIRED_HEADERS.forEach((header) => {
      if (!data[header]) {
        throw new Error(`Row ${rowNumber}: Missing value for ${header}.`);
      }
    });

    if (!parseCsvDate(data['start date'])) {
      throw new Error(`Row ${rowNumber}: Start Date must be a valid date.`);
    }
    if (!parseCsvDate(data['end date'])) {
      throw new Error(`Row ${rowNumber}: End Date must be a valid date.`);
    }

    const itemName = data['item name'];
    let itemTotal = 0;

    metricHeaders.forEach((metric) => {
      const rawQuantity = data[metric.header];
      const quantity = rawQuantity === '' ? 0 : Number(rawQuantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error(`Row ${rowNumber}: ${metric.label} must be a whole number 0 or greater.`);
      }
      if (quantity === 0) return;
      if (String(data['storage location']).trim().toLowerCase() === 'tcc' && metric.label === 'For PSG Activities') return;

      transactions.push({
        item_type_id: data['item type id'],
        user_id: data['user id'] || data.user_id,
        school_id: data['school id'] || data.school_id,
        donation_drive_id: data['donation drive id'] || data.donation_drive_id,
        to_stored_at: data['storage location'],
        to_status: metric.label,
        size_name: data['size name'] || 'One Size',
        quantity,
        remarks: data.remarks || '',
        _item_name: itemName,
        _category: data.category || '',
        _colour: data.colour || '',
        _gender: data.gender || 'Unisex',
        _has_sizes: false,
        _available_sizes: [],
      });
      itemTotal += quantity;
    });

    if (!summaryByItem.has(itemName)) {
      summaryByItem.set(itemName, {
        itemName,
        category: data.category || '',
        colour: data.colour || '',
        gender: data.gender || 'Unisex',
        itemTypeId: data['item type id'],
        hasSizes: false,
        availableSizes: [],
        totalItems: 0,
      });
    }
    summaryByItem.get(itemName).totalItems += itemTotal;
  });

  if (transactions.length === 0) {
    throw new Error('Enter at least one item categorization metric quantity.');
  }

  return {
    sourceType: 'raw-csv',
    itemLookup: {},
    transactions,
    sheetSummaries: Array.from(summaryByItem.values()).filter((summary) => summary.totalItems > 0),
    location: transactions[0]?.to_stored_at || '',
    categoryName: transactions[0]?._category || 'Raw CSV',
  };
}

/**
 * Apply size splits to transactions.
 * Returns a new array with split transactions replacing originals.
 */
function applySizeSplits(transactions, sizeSplits) {
  const result = [];

  for (const txn of transactions) {
    const splitKey = `${txn._item_name}|${txn.to_stored_at}|${txn.to_status}`;

    if (sizeSplits[splitKey]) {
      const splitTotal = sizeSplits[splitKey].reduce(
        (sum, s) => sum + (parseInt(s.quantity) || 0), 0
      );

      if (splitTotal !== txn.quantity) {
        console.warn(`Split total (${splitTotal}) doesn't match quantity (${txn.quantity}) for ${splitKey}, using original`);
        result.push(txn);
      } else {
        for (const split of sizeSplits[splitKey]) {
          if (split.quantity > 0) {
            result.push({
              ...txn,
              size_name: split.sizeName,
              quantity: split.quantity,
              remarks: split.remarks || txn.remarks,
            });
          }
        }
      }
    } else {
      result.push(txn);
    }
  }

  return result;
}

// Map friendly column names to snake_case for backend
const STATUS_MAP = {
  'For PSG': 'for_psg',
  'For PSG Activities': 'for_psg',
  'For School': 'for_school_stock',
  'For School Stock': 'for_school_stock',
  'For TCC Repurposing': 'for_repurposing',
  'For Repurposing': 'for_repurposing',
  'For Recycling/Disposal': 'for_recycling_disposal',
  'For recycling/disposal': 'for_recycling_disposal',
};

function normalizeStoredAt(val) {
  const v = val.toLowerCase().trim();
  if (v === 'school') return 'school';
  if (v === 'tcc') return 'tcc';
  return v;
}

/**
 * Build final flat rows for upload (strip display metadata).
 */
function buildFinalRows(transactions) {
  return transactions.map((txn) => ({
    item_type_id: txn.item_type_id,
    item_name: txn._item_name,
    colour_name: txn._colour,
    gender: txn._gender,
    user_id: txn.user_id,
    school_id: txn.school_id,
    donation_drive_id: txn.donation_drive_id,
    to_stored_at: normalizeStoredAt(txn.to_stored_at),
    to_status: STATUS_MAP[txn.to_status] || txn.to_status.toLowerCase().replace(/[\s\/]+/g, '_'),
    size_name: txn.size_name,
    quantity: txn.quantity,
    remarks: txn.remarks,
  }));
}

/**
 * Convert flat rows to an Excel file Blob for upload.
 */
function rowsToExcelBlob(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donations');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ============================================================
// Size Split Dialog
// ============================================================

function SizeSplitDialog({
  open,
  onClose,
  onSave,
  availableSizes,
  totalQuantity,
  sheetName,
  location,
  status,
  originalRemarks,
}) {
  // Use a key to force re-mount when dialog opens with new data
  const dialogKey = `${sheetName}|${location}|${status}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <SizeSplitDialogContent
          key={dialogKey}
          onClose={onClose}
          onSave={onSave}
          availableSizes={availableSizes}
          totalQuantity={totalQuantity}
          sheetName={sheetName}
          location={location}
          status={status}
          originalRemarks={originalRemarks}
        />
      )}
    </Dialog>
  );
}

function SizeSplitDialogContent({
  onClose,
  onSave,
  availableSizes,
  totalQuantity,
  sheetName,
  location,
  status,
  originalRemarks,
}) {
  const [sizeValues, setSizeValues] = useState(() =>
    availableSizes.map((sizeName) => ({ sizeName, quantity: 0, remarks: originalRemarks || '' }))
  );

  const currentTotal = sizeValues.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
  const isValid = currentTotal === totalQuantity;

  const handleQuantityChange = (index, value) => {
    let numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      numericValue = 0;
    }
    const clampedQuantity = Math.floor(numericValue);

    const updated = [...sizeValues];
    updated[index] = { ...updated[index], quantity: clampedQuantity };
    setSizeValues(updated);
  };

  const handleRemarksChange = (index, value) => {
    const updated = [...sizeValues];
    updated[index] = { ...updated[index], remarks: value };
    setSizeValues(updated);
  };

  const handleSave = () => {
    if (isValid) {
      onSave(sizeValues);
      onClose();
    }
  };

  return (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          Split by Size
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {sheetName} — {location} — {status}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Total must equal {totalQuantity}. Currently: {currentTotal}
          {!isValid && (
            <span style={{ fontWeight: 600 }}>
              {' '}
              ({currentTotal < totalQuantity
                ? `${totalQuantity - currentTotal} remaining`
                : `${currentTotal - totalQuantity} over`})
            </span>
          )}
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sizeValues.map((size, index) => (
            <Box
              key={size.sizeName}
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <Typography
                variant="body2"
                sx={{ width: 60, fontWeight: 500, flexShrink: 0 }}
              >
                {size.sizeName}
              </Typography>
              <TextField
                type="number"
                size="small"
                label="Qty"
                value={size.quantity || ''}
                onChange={(e) => handleQuantityChange(index, e.target.value)}
                inputProps={{ min: 0, max: totalQuantity }}
                sx={{ width: 90 }}
              />
              <TextField
                size="small"
                label="Remarks"
                placeholder="Optional"
                value={size.remarks}
                onChange={(e) => handleRemarksChange(index, e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <CustomButton variant="ghost" onClick={onClose}>
          Cancel
        </CustomButton>
        <CustomButton onClick={handleSave} disabled={!isValid}>
          Apply Split
        </CustomButton>
      </DialogActions>
    </>
  );
}


// ===================================================
// Main Component
// ============================================================

export default function UploadCSVModal({ isOpen, onClose, selectedSchool }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationSummary, setValidationSummary] = useState(null);

  // New matrix format state
  const [parsedData, setParsedData] = useState(null);
  const [sizeSplits, setSizeSplits] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [splitDialog, setSplitDialog] = useState({
    open: false,
    availableSizes: [],
    totalQuantity: 0,
    sheetName: '',
    location: '',
    status: '',
    splitKey: '',
  });

  // Compute final transactions with splits applied
  const finalTransactions = useMemo(() => {
    if (!parsedData) return [];
    return applySizeSplits(parsedData.transactions, sizeSplits);
  }, [parsedData, sizeSplits]);

  const totalItems = useMemo(() => {
    return finalTransactions.reduce((sum, t) => sum + t.quantity, 0);
  }, [finalTransactions]);

  // ── Drag & Drop ─────────────────────────────────────────────
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  // ── File Validation & Parsing ───────────────────────────────
  const validateAndSetFile = async (selectedFile) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = selectedFile.name
      .slice(selectedFile.name.lastIndexOf('.'))
      .toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      setError('Invalid file format. Upload an Excel template (.xlsx, .xls) or raw CSV (.csv).');
      setToast({ open: true, message: 'Invalid file format', severity: 'error' });
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      setError(`File too large. Maximum size is ${MAX_UPLOAD_FILE_SIZE_MB}MB.`);
      setToast({ open: true, message: 'File too large', severity: 'error' });
      return;
    }

    try {
      let result;
      if (fileExt === '.csv') {
        const text = await selectedFile.text();
        const workbook = XLSX.read(text, { type: 'string', raw: true });
        result = parseRawCsvFile(workbook);
      } else {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        result = parseMatrixFile(workbook);
      }

      if (result.transactions.length === 0) {
        setError('No donation quantities found. Please fill in at least one quantity in the template.');
        setToast({ open: true, message: 'No data found in file', severity: 'error' });
        return;
      }

      setFile(selectedFile);
      setParsedData(result);
      setSizeSplits({});
      setActiveTab(0);
      setError('');
      setToast({
        open: true,
        message: `File loaded: ${result.sheetSummaries.length} variant(s), ${result.transactions.length} transaction(s)`,
        severity: 'success',
      });
    } catch (err) {
      setError(err.message);
      setToast({ open: true, message: err.message, severity: 'error' });
      setFile(null);
      setParsedData(null);
    }
  };

  const handleFileInput = (e) => {
    setError('');
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  // ── Size Split ──────────────────────────────────────────────
  const handleOpenSplitDialog = (txn) => {
    const splitKey = `${txn._item_name}|${txn.to_stored_at}|${txn.to_status}`;
    setSplitDialog({
      open: true,
      availableSizes: txn._available_sizes,
      totalQuantity: txn.quantity,
      sheetName: txn._item_name,
      location: txn.to_stored_at,
      status: txn.to_status,
      splitKey,
      originalRemarks: txn.remarks,
    });
  };

  const handleSaveSplit = (sizeValues) => {
    setSizeSplits((prev) => ({
      ...prev,
      [splitDialog.splitKey]: sizeValues,
    }));
    setToast({
      open: true,
      message: 'Size split applied',
      severity: 'success',
    });
  };

  const handleRemoveSplit = (splitKey) => {
    setSizeSplits((prev) => {
      const updated = { ...prev };
      delete updated[splitKey];
      return updated;
    });
  };

  // ── Upload ──────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file || !parsedData) {
      setError('Please select a file');
      setToast({ open: true, message: 'Please select a file', severity: 'error' });
      return;
    }

    setUploading(true);
    setError('');
    setValidationErrors([]);

    try {
      let uploadFile = file;
      let submittedRows = finalTransactions.length;

      if (parsedData.sourceType !== 'raw-csv') {
        const flatRows = buildFinalRows(finalTransactions);
        const blob = rowsToExcelBlob(flatRows);
        if (blob.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
          throw new Error(`Processed upload file exceeds the ${MAX_UPLOAD_FILE_SIZE_MB}MB limit. Reduce the file size and try again.`);
        }
        uploadFile = new File([blob], 'donation_upload.xlsx', { type: blob.type });
        submittedRows = flatRows.length;
      }

      const formData = new FormData();
      formData.append('file', uploadFile);

      const apiUrl = '';
      

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(progressInterval); return prev; }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${apiUrl}/api/donations/drives/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = result.message || 'Upload failed';
        if (result.errors?.length > 0) {
          setValidationErrors(result.errors);
          setValidationSummary({
            totalErrors: result.totalErrors || result.errors.length,
            showingCount: result.errors.length,
            note: result.note,
          });
        }
        setError(errorMessage);
        setToast({ open: true, message: errorMessage, severity: 'error' });
        setUploadProgress(0);
        setUploading(false);
        return;
      }

      setToast({
        open: true,
        message: `Upload successful! ${submittedRows} transaction(s) submitted.`,
        severity: 'success',
      });
      setTimeout(() => { onClose(); handleRemoveFile(); }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setToast({ open: true, message: `Upload failed: ${err.message}`, severity: 'error' });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────
  const handleRemoveFile = () => {
    setFile(null);
    setParsedData(null);
    setSizeSplits({});
    setActiveTab(0);
    setUploadProgress(0);
    setError('');
    setValidationErrors([]);
    setValidationSummary(null);
  };

  const handleClose = () => {
    if (!uploading) { handleRemoveFile(); onClose(); }
  };

  const handleCloseToast = () => setToast({ ...toast, open: false });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  const schoolLabel = selectedSchool?.schoolName || 'Selected school';

  if (!isOpen) return null;

  return (
    <>
      <Backdrop open={isOpen} onClick={handleClose} sx={{ zIndex: 50, p: 2 }}>
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b flex-shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Add New Pieces
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                School: <span className="font-medium text-gray-700">{schoolLabel}</span>
              </p>
              {parsedData && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {parsedData.categoryName} — {parsedData.sheetSummaries.length} variant(s)
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer disabled:opacity-50"
            >
              <IoClose />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 flex flex-col gap-4">
            {/* File upload area */}
            {!file && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input').click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all
                  ${dragActive
                    ? 'border-[var(--color-main)] bg-green-50'
                    : 'border-gray-300 hover:border-[var(--color-main)] hover:bg-gray-50'
                  }`}
              >
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <CloudUploadIcon sx={{ fontSize: 36, color: 'var(--color-main)' }} />
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-[var(--color-main)]">Click to upload</span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  CSV or Excel files (.csv, .xlsx, .xls) - max 10MB
                </p>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {/* Upload progress */}
            {file && uploading && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <CloudUploadIcon sx={{ color: 'var(--color-main)' }} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Uploading...</p>
                      <p className="text-xs text-gray-500">{uploadProgress}%</p>
                    </div>
                  </div>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 6,
                    borderRadius: 1,
                    '& .MuiLinearProgress-bar': { backgroundColor: 'var(--color-main)' },
                  }}
                />
              </div>
            )}

            {/* File info */}
            {file && !uploading && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white border border-gray-200 flex items-center justify-center">
                    <CloudUploadIcon sx={{ fontSize: 20, color: 'var(--color-main)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} — {totalItems} total items
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer transition-colors"
                >
                  <IoClose size={18} />
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert severity="error">
                <Typography variant="body2" fontWeight={600}>
                  {error}
                </Typography>
                {validationErrors.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" component="div" fontWeight={600} color="error.dark">
                      Validation Errors{' '}
                      {validationSummary &&
                        `(${validationSummary.showingCount} of ${validationSummary.totalErrors})`}
                      :
                    </Typography>
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflowY: 'auto',
                        mt: 1,
                        p: 1,
                        bgcolor: 'error.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'error.200',
                      }}
                    >
                      {validationErrors.map((err, idx) => (
                        <Typography
                          key={idx}
                          variant="caption"
                          component="div"
                          sx={{ fontFamily: 'monospace', fontSize: '0.7rem', mb: 0.5 }}
                        >
                          • {err}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Alert>
            )}

            {/* No school warning
            {!selectedSchool && (
              <Alert severity="warning">Please select a school before uploading</Alert>
            )} */}

            {/* ── Sheet Summary Cards ─────────────────────────────── */}
            {parsedData && parsedData.sheetSummaries.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Summary
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {parsedData.sheetSummaries.map((summary) => (
                    <div key={summary.itemName} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{summary.itemName}</p>
                      <p className="text-xs text-gray-500">
                        {summary.totalItems} items
                        {summary.hasSizes && <span className="ml-1 text-blue-600">• has sizes</span>}
                      </p>
                    </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Transaction Preview with Tabs ───────────────────── */}
            {parsedData && parsedData.sheetSummaries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Transaction Preview
                  </p>
                  <Chip
                    label={`${finalTransactions.length} rows`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </div>

                {/* Tabs for each sheet/variant */}
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 36,
                    mb: 1,
                    '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none' },
                  }}
                >
                  <Tab label="All" />
                  {parsedData.sheetSummaries.map((s) => (
                    <Tab key={s.itemName} label={s.itemName} />
                  ))}
                </Tabs>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }}>Variant</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }} align="right">Qty</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }}>Remarks</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', fontSize: '0.813rem' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {finalTransactions
                        .filter((txn) => {
                          if (activeTab === 0) return true;
                          const itemName = parsedData.sheetSummaries[activeTab - 1]?.itemName;
                          return txn._item_name === itemName;
                        })
                        .map((txn, idx) => {
                          const splitKey = `${txn._sheet}|${txn.to_stored_at}|${txn.to_status}`;
                          const isSplit = !!sizeSplits[splitKey];

                          return (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontSize: '0.813rem' }}>
                                {txn._item_name}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.813rem' }}>
                                {txn.to_stored_at}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.813rem' }}>
                                {txn.to_status}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.813rem' }}>
                                {isSplit ? (
                                  <Chip label={txn.size_name} size="small" color="info" variant="outlined" />
                                ) : (
                                  txn.size_name
                                )}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.813rem' }} align="right">
                                {txn.quantity}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.813rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {txn.remarks || '—'}
                              </TableCell>
                              <TableCell align="center">
                                {txn._has_sizes && txn._available_sizes.length > 1 && !isSplit && (
                                  <Tooltip title="Split by size">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenSplitDialog(txn)}
                                      sx={{ color: 'primary.main' }}
                                    >
                                      <MdCallSplit size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {isSplit && (
                                  <Tooltip title="Remove size split">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveSplit(splitKey)}
                                      sx={{ color: 'error.main' }}
                                    >
                                      <IoClose size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 gap-3 flex-shrink-0">
            <CustomButton variant="ghost" onClick={handleClose} disabled={uploading} className="flex-1">
              Cancel
            </CustomButton>
            <CustomButton
              onClick={handleUpload}
              disabled={!file || uploading || !parsedData || finalTransactions.length === 0}
              icon={<CloudUploadIcon />}
              className="flex-1"
            >
              Upload ({totalItems} items)
            </CustomButton>
          </div>
        </div>
      </Backdrop>

      {/* Size Split Dialog */}
      <SizeSplitDialog
        open={splitDialog.open}
        onClose={() => setSplitDialog((prev) => ({ ...prev, open: false }))}
        onSave={handleSaveSplit}
        availableSizes={splitDialog.availableSizes}
        totalQuantity={splitDialog.totalQuantity}
        sheetName={splitDialog.sheetName}
        location={splitDialog.location}
        status={splitDialog.status}
      />

      <SnackbarAlert
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        message={toast.message}
        severity={toast.severity}
        icon={toast.severity === 'success' ? <FaCheck /> : <TbCancel />}
      />
    </>
  );
}
