// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
import { CircularProgress, Autocomplete, TextField, Box, Typography, Chip } from '@mui/material';
import { MdLocationOn } from 'react-icons/md';
import { HiShieldCheck } from 'react-icons/hi2';

// components
import CustomButton from '@/components/ui/CustomButton';

// Standardised donation drive name options
const YEARS = [2026, 2027, 2028, 2029, 2030];
const DRIVE_NAME_OPTIONS = [
    ...YEARS.map((y) => `Mid-Year ${y}`),
    ...YEARS.map((y) => `End of Year ${y}`),
];
const OTHERS_OPTION = 'Others';

function getSchoolOptionId(school) {
    if (!school) return '';
    return String(
        school.schoolId ??
        school.school_id ??
        school.id ??
        ''
    );
}

export default function DonationDriveFormModal({ isAdmin, onClose, editData = null, loggedInUserId = null, loggedInSchoolId = null }) {
    const [form, setForm] = useState({
        driveName: '',
        startDate: '',
        endDate: '',
        location: '',
        schoolId: loggedInSchoolId ? String(loggedInSchoolId) : ''
    });

    const [isCustomDrive, setIsCustomDrive] = useState(false);
    const [locationType, setLocationType] = useState('others');
    const [schools, setSchools] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const sortedSchools = useMemo(
        () =>
            [...schools].sort((a, b) =>
                String(a?.schoolName || '').localeCompare(String(b?.schoolName || '')),
            ),
        [schools],
    );

    const selectedSchoolOption = useMemo(
        () => sortedSchools.find((school) => String(school.id) === String(form.schoolId)) || null,
        [sortedSchools, form.schoolId],
    );

    const selectedSchoolName = selectedSchoolOption?.schoolName || '';

    useEffect(() => {
        if (editData) {
                const editDriveName = editData.driveName || '';
                setIsCustomDrive(
                    Boolean(editDriveName) && !DRIVE_NAME_OPTIONS.includes(editDriveName),
                );
                setForm({
                    driveName: editDriveName,
                    startDate: editData.startDate ? editData.startDate.split('T')[0] : '',
                    endDate: editData.endDate ? editData.endDate.split('T')[0] : '',
                    location: editData.location || '',
                    schoolId: editData.schoolId ?? editData.school?.id ? String(editData.schoolId ?? editData.school?.id) : ''
                });
                const editSchoolName = editData.school?.schoolName || '';
                if (editSchoolName && editData.location === editSchoolName) {
                    setLocationType('school');
                } else {
                    setLocationType('others');
                }
        } else if (loggedInSchoolId) {
            setForm((prev) => ({ ...prev, schoolId: String(loggedInSchoolId) }));
        }
    }, [editData, loggedInSchoolId]);

    // Keep location in sync with selected school when "School" mode is active
    useEffect(() => {
        if (locationType !== 'school') return;
        setForm((prev) =>
            prev.location === selectedSchoolName
                ? prev
                : { ...prev, location: selectedSchoolName },
        );
        setErrors((prev) => ({ ...prev, location: '' }));
    }, [locationType, selectedSchoolName]);

    const handleLocationTypeChange = (nextType) => {
        if (nextType === locationType) return;
        setLocationType(nextType);
        if (nextType === 'others') {
            setForm((prev) => ({ ...prev, location: '' }));
        }
        setErrors((prev) => ({ ...prev, location: '' }));
    };

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const apiUrl = '';
                const res = await fetch(`${apiUrl}/api/schools`);
                const result = await res.json();
                const normalizedSchools = (result.data || [])
                    .map((school) => ({
                        ...school,
                        id: getSchoolOptionId(school),
                    }))
                    .filter((school) => school.id);
                setSchools(normalizedSchools);
            } catch (err) {
                console.error('Failed to fetch schools:', err);
            } finally {
                setLoadingSchools(false);
            }
        };
        fetchSchools();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleDriveNameSelect = (e) => {
        const { value } = e.target;
        if (value === OTHERS_OPTION) {
            setIsCustomDrive(true);
            setForm((prev) => ({ ...prev, driveName: '' }));
        } else {
            setIsCustomDrive(false);
            setForm((prev) => ({ ...prev, driveName: value }));
        }
        setErrors((prev) => ({ ...prev, driveName: '' }));
    };

    const handleSchoolChange = (_event, school) => {
        setForm((prev) => ({
            ...prev,
            schoolId: school?.id ? String(school.id) : '',
        }));
        setErrors((prev) => ({ ...prev, schoolId: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!form.driveName.trim()) newErrors.driveName = 'Drive name is required.';
        if (!form.startDate) newErrors.startDate = 'Start date is required.';
        if (!form.endDate) newErrors.endDate = 'End date is required.';
        if (form.startDate && form.endDate && form.endDate < form.startDate)
            newErrors.endDate = 'End date must be after start date.';
        if (!form.location.trim()) newErrors.location = 'Location is required.';
        return newErrors;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        try {
            const apiUrl = '';
            const url = editData
                ? `${apiUrl}/api/donations/drives/${editData.id}`
                : `${apiUrl}/api/donations/drives`;
            const method = editData ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    driveName: form.driveName,
                    startDate: form.startDate,
                    endDate: form.endDate,
                    location: form.location,
                    schoolId: form.schoolId ? parseInt(form.schoolId) : null,
                    ...(loggedInUserId ? { createdByUserId: loggedInUserId } : {}),
                }),
            });

            const result = await response.json();
            onClose({
                success: response.ok,
                message: response.ok
                    ? `Donation drive ${editData ? 'updated' : 'created'} successfully`
                    : result.message || 'Something went wrong',
            });
        } catch (err) {
            console.error('Submit error:', err);
            onClose({ success: false, message: 'Something went wrong' });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Shared input styles (matching preset modal) ───────────────────────
    const inputCls =
        'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white ' +
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

    const inputErrorCls =
        'w-full px-3 py-2 border border-red-400 rounded-md text-sm text-gray-900 bg-white ' +
        'focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-colors';

    const labelCls = 'block text-sm font-medium text-gray-900 mb-2';

    // ── Form validation ───────────────────────────────────────────────────
    const isFormValid =
        form.driveName.trim() &&
        form.startDate &&
        form.endDate &&
        form.location.trim();

    return (
        <div className="flex flex-col">

            {/* Fields */}
            <div className="flex flex-col gap-5 p-6">

                {/* Donation Drive */}
                <div>
                    <label className={labelCls}>
                        Donation Drive<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        name="driveNameOption"
                        value={isCustomDrive ? OTHERS_OPTION : form.driveName}
                        onChange={handleDriveNameSelect}
                        className={
                            (errors.driveName && !isCustomDrive ? inputErrorCls : inputCls) +
                            ' cursor-pointer'
                        }
                    >
                        <option value="" disabled>
                            Select a donation drive
                        </option>
                        {DRIVE_NAME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                        <option value={OTHERS_OPTION}>{OTHERS_OPTION}</option>
                    </select>
                    {isCustomDrive && (
                        <input
                            type="text"
                            name="driveName"
                            value={form.driveName}
                            onChange={handleChange}
                            placeholder="Enter donation drive name"
                            className={`mt-2 ${errors.driveName ? inputErrorCls : inputCls}`}
                        />
                    )}
                    {errors.driveName && <p className="text-xs text-red-500 mt-1">{errors.driveName}</p>}
                </div>

                {/* Start Date & End Date */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>
                            Start Date<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                            type="date"
                            name="startDate"
                            value={form.startDate}
                            onChange={handleChange}
                            className={errors.startDate ? inputErrorCls : inputCls}
                        />
                        {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>
                            End Date<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                            type="date"
                            name="endDate"
                            value={form.endDate}
                            onChange={handleChange}
                            className={errors.endDate ? inputErrorCls : inputCls}
                        />
                        {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className={labelCls}>
                        Location<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                        {[
                            { value: 'school', label: 'School' },
                            { value: 'others', label: 'Others' },
                        ].map((opt) => {
                            const active = locationType === opt.value;
                            const disabled = opt.value === 'school' && !selectedSchoolName;
                            return (
                                <button
                                    type="button"
                                    key={opt.value}
                                    onClick={() => handleLocationTypeChange(opt.value)}
                                    disabled={disabled}
                                    className={
                                        'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ' +
                                        (active
                                            ? 'bg-[var(--color-main)] text-white border-[var(--color-main)]'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50') +
                                        (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer')
                                    }
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative">
                        <MdLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                        <input
                            type="text"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            readOnly={locationType === 'school'}
                            placeholder={
                                locationType === 'school'
                                    ? 'Auto-filled from selected school'
                                    : 'Street address or community hall'
                            }
                            className={
                                `pl-9 ${errors.location ? inputErrorCls : inputCls}` +
                                (locationType === 'school' ? ' bg-gray-50 cursor-not-allowed' : '')
                            }
                        />
                    </div>
                    {locationType === 'school' && !selectedSchoolName && (
                        <p className="text-xs text-gray-500 mt-1">
                            Select an assigned school to auto-fill the location.
                        </p>
                    )}
                    {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                </div>

                {/* Administrative Controls */}
                {isAdmin && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <HiShieldCheck className="text-[var(--color-main)]" size={18} />
                            <span className="text-xs font-semibold tracking-widest text-[var(--color-main)] uppercase">
                                Administrative Controls
                            </span>
                        </div>
                        <div>
                            <label className={labelCls}>Assigned School</label>
                            <Autocomplete
                                options={sortedSchools}
                                value={selectedSchoolOption}
                                onChange={handleSchoolChange}
                                loading={loadingSchools}
                                disabled={loadingSchools}
                                clearOnEscape
                                autoHighlight
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                getOptionLabel={(option) => option?.schoolName || ''}
                                noOptionsText="No schools found"
                                loadingText="Loading schools..."
                                slotProps={{
                                    paper: {
                                        sx: {
                                            '& .MuiAutocomplete-listbox': {
                                                py: 0.5,
                                            },
                                            '& .MuiAutocomplete-option': {
                                                display: 'block',
                                                px: 1.5,
                                                py: 1,
                                            },
                                        },
                                    },
                                }}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'minmax(0, 1fr) auto',
                                                alignItems: 'center',
                                                gap: 1,
                                                width: '100%',
                                                minWidth: 0,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{
                                                    minWidth: 0,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {option.schoolName}
                                            </Typography>
                                            <Chip
                                                label={option.isCooperating ? 'Collaborating' : 'Not collaborating'}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.65rem',
                                                    height: 20,
                                                    flexShrink: 0,
                                                }}
                                                color={option.isCooperating ? 'success' : 'warning'}
                                                variant="outlined"
                                            />
                                        </Box>
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Search school name"
                                        size="small"
                                        error={Boolean(errors.schoolId)}
                                        helperText={
                                            errors.schoolId ||
                                            (!form.schoolId
                                                ? 'If no school is selected, this donation drive will be islandwide.'
                                                : ' ')
                                        }
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: '#fff',
                                            },
                                        }}
                                    />
                                )}
                            />
                            {!form.schoolId && (
                                null
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                <CustomButton
                    variant="ghost"
                    onClick={() => onClose(null)}
                    disabled={submitting}
                    className="flex-1"
                >
                    Cancel
                </CustomButton>
                <CustomButton
                    onClick={handleSubmit}
                    disabled={submitting || !isFormValid}
                    icon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
                    className="flex-1"
                >
                    {submitting ? 'Saving...' : editData ? 'Save Changes' : 'Create Donation Drive'}
                </CustomButton>
            </div>
        </div>
    );
}
