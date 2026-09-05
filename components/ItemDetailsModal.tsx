// @ts-nocheck
'use client';

import { useReducer, useMemo, useRef, useEffect, useState } from 'react';
import Image from 'next/image';

// mui
import { Backdrop } from '@mui/material';

// icon
import { IoClose } from 'react-icons/io5';

// components
import CustomButton from '@/components/ui/CustomButton';

const initialFormState = {
  localSchoolId: '',
  selectedCategoryName: '',
  selectedColourName: '',
  selectedSizeName: '',
  selectedGender: '',
  selectedMaterial: '',
  selectedPattern: '',
  quantity: 1,
  status: 'ForSale',
  storedAt: 'School',
  selectedDonationDriveId: '',
  donationDriveOpen: false,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialFormState, ...action.payload };
    case 'PATCH':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ─── Swatch ──────────────────────────────────────────────────────────────────

const Swatch = ({ hex }) => (
  <span
    style={{
      width: 16,
      height: 16,
      borderRadius: '50%',
      backgroundColor: hex || '#fff',
      border: '1px solid #ccc',
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

const ChevronIcon = () => (
  <svg className="w-3 h-3 text-gray-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ─── ColorDropdown (name-based) ───────────────────────────────────────────────

function ColorDropdown({ label, value, onChange, colourOptions, disabled, required, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = value ? colourOptions.find((c) => c.name === value) : null;

  const triggerClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' +
    'flex items-center justify-between cursor-pointer';

  const disabledTriggerClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-400 bg-gray-100 ' +
    'flex items-center justify-between cursor-not-allowed opacity-50';

  return (
    <div className="flex flex-col" ref={ref}>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => { if (!disabled) setOpen(!open); }}
          className={disabled ? disabledTriggerClass : triggerClass}
          disabled={disabled}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <Swatch hex={selected.hexcode} />
              {selected.name}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder || `Select ${label}`}</span>
          )}
          <ChevronIcon />
        </button>

        {open && !disabled && (
          <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            <li
              className="px-3 py-2 text-gray-400 cursor-pointer hover:bg-gray-50 text-sm"
              onClick={() => { onChange(''); setOpen(false); }}
            >
              Select {label}
            </li>
            {colourOptions.map((colour) => (
              <li
                key={colour.name}
                onClick={() => { onChange(colour.name); setOpen(false); }}
                className="flex items-center text-gray-700 gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
              >
                <Swatch hex={colour.hexcode} />
                {colour.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItemDetailsModal({
  isOpen,
  onClose,
  psgItems = [],
  selectedSchool,
  donationDrives = [],
  onSubmit,
  submitting = false,
  isAdmin = false,
  schools = [],
  selectedItemType = null,
  selectedColor = null,
  onSchoolChange,
}) {
  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const {
    localSchoolId,
    selectedCategoryName,
    selectedColourName,
    selectedSizeName,
    selectedGender,
    selectedMaterial,
    selectedPattern,
    quantity,
    status,
    storedAt,
    selectedDonationDriveId,
    donationDriveOpen,
  } = form;
  const donationDriveRef = useRef(null);

  useEffect(() => {
    if (!donationDriveOpen) return;
    const handler = (e) => {
      if (donationDriveRef.current && !donationDriveRef.current.contains(e.target))
        dispatch({ type: 'PATCH', payload: { donationDriveOpen: false } });
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [donationDriveOpen, dispatch]);

  const getDriveDisplay = (drive) => {
    const now = new Date();
    const start = new Date(drive.startDate || drive.start_date);
    const end = new Date(drive.endDate || drive.end_date);
    const isActive = start <= now && now <= end;
    const name = drive.driveName || drive.drive_name;
    const dateRange = `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
    return { name, dateRange, isActive };
  };

  const isCategoryLocked = !!selectedItemType?.category?.categoryName;
  const isColorLocked = !!selectedColor?.colorName;

  useEffect(() => {
    if (!isOpen) return;
    const cat = selectedItemType?.category?.categoryName || '';
    const col = cat ? (selectedColor?.colorName || '') : '';
    dispatch({
      type: 'RESET',
      payload: {
        localSchoolId: selectedSchool?.id ? String(selectedSchool.id) : '',
        selectedCategoryName: cat,
        selectedColourName: col,
      },
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps


  const categoryOptions = useMemo(() => {
    const s = new Set(psgItems.map((r) => r.category_name).filter(Boolean));
    return Array.from(s).sort();
  }, [psgItems]);

  const byCategory = useMemo(
    () => psgItems.filter((r) => r.category_name === selectedCategoryName),
    [psgItems, selectedCategoryName]
  );

  const colourOptions = useMemo(() => {
    const map = new Map();
    for (const r of byCategory) {
      if (r.primary_colour && !map.has(r.primary_colour))
        map.set(r.primary_colour, { name: r.primary_colour, hexcode: r.primary_colour_hexcode || null });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [byCategory]);

  const byColor = useMemo(
    () => byCategory.filter((r) => !selectedColourName || r.primary_colour === selectedColourName),
    [byCategory, selectedColourName]
  );

  const sizeOptions = useMemo(() => {
    const s = new Set(byColor.map((r) => r.size_name).filter(Boolean));
    return Array.from(s).sort();
  }, [byColor]);

  const bySize = useMemo(
    () => byColor.filter((r) => !selectedSizeName || r.size_name === selectedSizeName),
    [byColor, selectedSizeName]
  );

  const genderOptions = useMemo(() => {
    const s = new Set(bySize.map((r) => r.gender).filter(Boolean));
    return Array.from(s).sort();
  }, [bySize]);

  const materialOptions = useMemo(() => {
    const s = new Set(bySize.map((r) => r.material_name).filter(Boolean));
    return Array.from(s).sort();
  }, [bySize]);

  const patternOptions = useMemo(() => {
    const s = new Set(bySize.map((r) => r.pattern_name).filter(Boolean));
    return Array.from(s).sort();
  }, [bySize]);

  useEffect(() => {
    if (genderOptions.length === 1) dispatch({ type: 'PATCH', payload: { selectedGender: genderOptions[0] } });
    else if (genderOptions.length === 0) dispatch({ type: 'PATCH', payload: { selectedGender: '' } });
  }, [genderOptions]);

  useEffect(() => {
    if (materialOptions.length === 1) dispatch({ type: 'PATCH', payload: { selectedMaterial: materialOptions[0] } });
    else if (materialOptions.length === 0) dispatch({ type: 'PATCH', payload: { selectedMaterial: '' } });
  }, [materialOptions]);

  useEffect(() => {
    if (patternOptions.length === 1) dispatch({ type: 'PATCH', payload: { selectedPattern: patternOptions[0] } });
    else if (patternOptions.length === 0) dispatch({ type: 'PATCH', payload: { selectedPattern: '' } });
  }, [patternOptions]);

  const selectedPreset = useMemo(() => {
    const candidates = bySize.filter((r) => {
      if (selectedGender && r.gender && r.gender !== selectedGender) return false;
      if (selectedMaterial && r.material_name && r.material_name !== selectedMaterial) return false;
      if (selectedPattern && r.pattern_name && r.pattern_name !== selectedPattern) return false;
      return true;
    });
    return candidates[0] || bySize[0] || byCategory[0] || null;
  }, [bySize, byCategory, selectedGender, selectedMaterial, selectedPattern]);

  const secondaryColourName = useMemo(
    () => selectedPreset?.secondary_colour || '',
    [selectedPreset]
  );

  const imageUrl = useMemo(
    () =>
      selectedPreset?.image_url ||
      selectedPreset?.imageUrl ||
      byColor[0]?.image_url ||
      byCategory[0]?.image_url ||
      null,
    [selectedPreset, byColor, byCategory]
  );

  const handleSubmit = async () => {
    const effectiveSchoolId = localSchoolId || selectedSchool?.id;
    if (!selectedPreset?.item_type_id || !effectiveSchoolId) return;

    const selectedColourObj = colourOptions.find((c) => c.name === selectedColourName);

    await onSubmit({
      category_name: selectedCategoryName,
      primary_colour: selectedColourName,
      primary_colour_hex: selectedColourObj?.primary_colour_hexcode || null,
      secondary_colour: selectedPreset?.secondary_colour || null,
      secondary_colour_hex: selectedPreset?.secondary_colour_hexcode || null,
      size_name: selectedSizeName || 'No Size given',
      quantity,
      to_status: status,
      to_stored_at: storedAt,
      item_type_id: selectedPreset.item_type_id,
      school_id: effectiveSchoolId,
      donation_drive_id: selectedDonationDriveId ? parseInt(selectedDonationDriveId, 10) : null,
    });
  };

  const canSubmit =
    !!selectedPreset?.item_type_id &&
    !!(localSchoolId || selectedSchool?.id) &&
    !!selectedDonationDriveId &&
    quantity > 0;

  const effectiveSchoolId = localSchoolId || (selectedSchool?.id ? String(selectedSchool.id) : '');

  // ── Shared input styles ──────────────────────────────────────────────────
  const selectCls =
    'w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ' +
    "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] " +
    'bg-no-repeat bg-[center_right_0.75rem]';
  const disabledSelectCls = selectCls + ' opacity-50 cursor-not-allowed bg-gray-100';
  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const readonlyCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-900';
  const labelCls = 'block text-sm font-medium text-gray-900 mb-2';

  if (!isOpen) return null;

  return (
    <Backdrop open={isOpen} onClick={onClose} sx={{ zIndex: 50, p: 2 }}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Pieces</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
          >
            <IoClose />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">

            {/* Left: image panel */}
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[260px] flex items-center justify-center overflow-hidden relative">
                {imageUrl ? (
                  <Image src={imageUrl} alt={selectedCategoryName || 'Item'} fill unoptimized className="object-contain p-3" />
                ) : (
                  <span className="text-gray-400 text-sm text-center px-4">
                    {selectedCategoryName ? 'No image for this category' : 'Select a category to see its image'}
                  </span>
                )}
              </div>
            </div>

            {/* Right: form */}
            <div className="md:col-span-2 flex flex-col gap-4">

              {/* School (admin only) */}
              {isAdmin && (
                <div>
                  <label className={labelCls}>School<span className="text-red-500 ml-0.5">*</span></label>
                  {selectedSchool?.id ? (
                    <input type="text" value={selectedSchool.schoolName || String(selectedSchool.id)} readOnly className={readonlyCls} />
                  ) : (
                    <select
                      value={localSchoolId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        dispatch({ type: 'PATCH', payload: { localSchoolId: newId } });
                        if (newId) onSchoolChange?.(newId);
                      }}
                      className={selectCls}
                    >
                      <option value="">Select School</option>
                      {schools.map((s) => (
                        <option key={s.id} value={String(s.id)}>{s.schoolName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Donation Event */}
              <div ref={donationDriveRef} className="relative">
                <label className={labelCls}>Donation Event<span className="text-red-500 ml-0.5">*</span></label>
                <button
                  type="button"
                  onClick={() => {
                    if (effectiveSchoolId && donationDrives.length > 0)
                      dispatch({ type: 'PATCH', payload: { donationDriveOpen: !donationDriveOpen } });
                  }}
                  disabled={!effectiveSchoolId || donationDrives.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex flex-col gap-0.5 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  {!selectedDonationDriveId ? (
                    <span className="text-gray-400">
                      {!effectiveSchoolId
                        ? 'Select a School first'
                        : donationDrives.length === 0
                          ? 'No events for this school'
                          : 'Select donation event'}
                    </span>
                  ) : (() => {
                    const drive = donationDrives.find((d) => String(d.id) === selectedDonationDriveId);
                    if (!drive) return <span className="text-gray-400">Select donation event</span>;
                    const { name, dateRange, isActive } = getDriveDisplay(drive);
                    return (
                      <>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="font-medium text-sm truncate">{name}</span>
                          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{dateRange}</span>
                      </>
                    );
                  })()}
                </button>
                {donationDriveOpen && (
                  <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg py-1 text-sm">
                    {donationDrives.map((drive) => {
                      const { name, dateRange, isActive } = getDriveDisplay(drive);
                      const isSel = String(drive.id) === selectedDonationDriveId;
                      return (
                        <li
                          key={drive.id}
                          onClick={() => dispatch({ type: 'PATCH', payload: { selectedDonationDriveId: String(drive.id), donationDriveOpen: false } })}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex flex-col gap-0.5 ${isSel ? 'bg-green-50' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium truncate ${isSel ? 'text-[var(--color-main)]' : 'text-gray-900'}`}>
                              {name}
                            </span>
                            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{dateRange}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Category + Primary Colour */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className={labelCls}>Item Category<span className="text-red-500 ml-0.5">*</span></label>
                  {isCategoryLocked ? (
                    <input type="text" value={selectedCategoryName} readOnly className={readonlyCls} />
                  ) : (
                    <select
                      value={selectedCategoryName}
                      onChange={(e) => {
                        dispatch({ type: 'PATCH', payload: { selectedCategoryName: e.target.value, selectedColourName: '', selectedSizeName: '', selectedGender: '', selectedMaterial: '', selectedPattern: '' } });
                      }}
                      className={selectCls}
                    >
                      <option value="">Select Item Category</option>
                      {categoryOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  )}
                </div>

                {/* Primary Colour — use ColorDropdown if not locked */}
                {isColorLocked ? (
                  <div className="flex flex-col">
                    <label className={labelCls}>Primary Colour<span className="text-red-500 ml-0.5">*</span></label>
                    <input type="text" value={selectedColourName} readOnly className={readonlyCls} />
                  </div>
                ) : (
                  <ColorDropdown
                    label="Primary Colour"
                    value={selectedColourName}
                    onChange={(v) => dispatch({ type: 'PATCH', payload: { selectedColourName: v, selectedSizeName: '', selectedGender: '', selectedMaterial: '', selectedPattern: '' } })}
                    colourOptions={colourOptions}
                    disabled={!selectedCategoryName}
                    required
                    placeholder={selectedCategoryName ? 'Select Primary Colour' : 'Select a Category first'}
                  />
                )}
              </div>
              {/* Secondary Colour + Size */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className={labelCls}>Secondary Colour</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-900 flex items-center gap-2 min-h-[38px]">
                    {secondaryColourName ? (
                      <>
                        <Swatch hex={selectedPreset?.secondary_colour_hex || null} />
                        <span>{secondaryColourName}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className={labelCls}>Size (optional)</label>
                  <select
                    value={selectedSizeName}
                    onChange={(e) => { dispatch({ type: 'PATCH', payload: { selectedSizeName: e.target.value, selectedGender: '', selectedMaterial: '', selectedPattern: '' } }); }}
                    disabled={!selectedColourName}
                    className={!selectedColourName ? disabledSelectCls : selectCls}
                  >
                    <option value="">No Size given</option>
                    {sizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* Gender + Material + Pattern */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className={labelCls}>Gender</label>
                  {genderOptions.length > 1 ? (
                    <select value={selectedGender} onChange={(e) => dispatch({ type: 'PATCH', payload: { selectedGender: e.target.value } })} className={selectCls}>
                      <option value="">Any</option>
                      {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={selectedPreset?.gender || ''} readOnly className={readonlyCls} placeholder="—" />
                  )}
                </div>
                <div className="flex flex-col">
                  <label className={labelCls}>Material</label>
                  {materialOptions.length > 1 ? (
                    <select value={selectedMaterial} onChange={(e) => dispatch({ type: 'PATCH', payload: { selectedMaterial: e.target.value } })} className={selectCls}>
                      <option value="">Any</option>
                      {materialOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={selectedPreset?.material_name || ''} readOnly className={readonlyCls} placeholder="—" />
                  )}
                </div>
                <div className="flex flex-col">
                  <label className={labelCls}>Pattern</label>
                  {patternOptions.length > 1 ? (
                    <select value={selectedPattern} onChange={(e) => dispatch({ type: 'PATCH', payload: { selectedPattern: e.target.value } })} className={selectCls}>
                      <option value="">Any</option>
                      {patternOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={selectedPreset?.pattern_name || ''} readOnly className={readonlyCls} placeholder="—" />
                  )}
                </div>
              </div>

              {/* Quantity + Status + Stored At */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className={labelCls}>Quantity<span className="text-red-500 ml-0.5">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => dispatch({ type: 'PATCH', payload: { quantity: Math.max(1, Number(e.target.value) || 1) } })}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col">
                  <label className={labelCls}>Status<span className="text-red-500 ml-0.5">*</span></label>
                  <select value={status} onChange={(e) => dispatch({ type: 'PATCH', payload: { status: e.target.value } })} className={selectCls}>
                    <option value="GeneralOffice">General Office</option>
                    <option value="ForSale">For Sale</option>
                    <option value="ForRepurpose">For Repurpose</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className={labelCls}>Stored At<span className="text-red-500 ml-0.5">*</span></label>
                  <select value={storedAt} onChange={(e) => dispatch({ type: 'PATCH', payload: { storedAt: e.target.value } })} className={selectCls}>
                    <option value="School">School</option>
                    <option value="TCC">TCC</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 gap-3 flex-shrink-0">
          <CustomButton variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </CustomButton>
          <CustomButton onClick={handleSubmit} disabled={!canSubmit || submitting} className="flex-1">
            {submitting ? 'Adding...' : 'Add Pieces'}
          </CustomButton>
        </div>
      </div>
    </Backdrop>
  );
}