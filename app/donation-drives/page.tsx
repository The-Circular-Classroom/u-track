// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getRoleFromSession } from "@/utils/auth";

// mui
import { Backdrop, Chip, Box, Typography, Alert } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";

// icon
import { FaPlus, FaCheck, FaBullhorn, FaBoxesStacked } from "react-icons/fa6";
import { FiEdit3, FiTrash2, FiArrowRight } from "react-icons/fi";
import { TbCancel } from "react-icons/tb";
import { IoClose } from "react-icons/io5";
import { LuBookOpen } from "react-icons/lu";

// components
import SnackbarAlert from "@/components/SnackbarAlert";
import DonationDriveFormModal from "@/components/DonationDriveFormModal";
import DownloadCSVTemplateModal from "@/components/DownloadCSVTemplateModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CustomButton from "@/components/ui/CustomButton";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import CustomErrorButton from "@/components/ui/CustomErrorButton";

// ── Status chip ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  upcoming: {
    label: "Upcoming",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#93c5fd",
  },
  ongoing: {
    label: "Ongoing",
    bg: "#f0fdf4",
    color: "#15803d",
    border: "#86efac",
  },
  completed: {
    label: "Completed",
    bg: "#f3f4f6",
    color: "#374151",
    border: "#d1d5db",
  },
};

function StatusChip({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.upcoming;
  return (
    <Chip
      label={style.label}
      size="small"
      sx={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: "6px",
        fontSize: "0.72rem",
        fontWeight: 600,
        height: 26,
      }}
    />
  );
}

// ── Column definitions ───────────────────────────────────────────────────────
const buildColumns = (isAdmin, onEdit, onDelete) => {
  const cols = [
    {
      field: "driveName",
      headerName: "Donation Drive",
      flex: 1,
      minWidth: 200,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            variant="body2"
            sx={{ color: "#111827", fontWeight: 500 }}
          >
            {value || "-"}
          </Typography>
        </Box>
      ),
    },

    // ── Admin-only: School Name ──────────────────────────────────────────────
    ...(isAdmin
      ? [
          {
            field: "school",
            headerName: "School",
            flex: 1,
            minWidth: 160,
            renderCell: ({ row }) => (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Typography variant="body2" sx={{ color: "#111827" }}>
                  {row.school?.schoolName
                    ? row.school.schoolName
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : "-"}
                </Typography>
              </Box>
            ),
          },
        ]
      : []),
    {
      field: "startDate",
      headerName: "Start Date",
      width: 120,
      valueGetter: (value) => (value ? new Date(value) : null),
      renderCell: ({ value }) => {
        if (!value) return "-";
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              gap: 0,
            }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1.1 }}>
              {value.toLocaleDateString("en-SG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "endDate",
      headerName: "End Date",
      width: 120,
      valueGetter: (value) => (value ? new Date(value) : null),
      renderCell: ({ value }) => {
        if (!value) return "-";
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              gap: 0,
            }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1.1 }}>
              {value.toLocaleDateString("en-SG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "location",
      headerName: "Location",
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography variant="body2" color="text.secondary">
            {value || "-"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      valueGetter: (value, row) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const startStr = row.startDate?.slice(0, 10);
        const endStr = row.endDate?.slice(0, 10);

        if (startStr && todayStr < startStr) return "upcoming";
        if (endStr && todayStr > endStr) return "completed";
        return "ongoing";
      },
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <StatusChip status={value} />
        </Box>
      ),
    },
    {
      field: "action",
      headerName: "Action",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            gap: 0.5,
          }}
        >
          <CustomButton
            iconOnly
            icon={<FiEdit3 size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
          />
          <CustomButton
            iconOnly
            variant="iconDanger"
            icon={<FiTrash2 size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
          />
        </Box>
      ),
    },
  ];

  return cols;
};

// ── Resources panel ────────────────────────────────────────────────────────
const RESOURCES = [
  {
    key: "handbook",
    title: "Donation Drive Handbook",
    description: "Step-by-step guide to planning and running a drive",
    icon: <LuBookOpen size={22} />,
    href: "#",
  },
  {
    key: "promo",
    title: "Promo Material",
    description: "Posters, banners and templates to spread the word",
    icon: <FaBullhorn size={20} />,
    href: "#",
  },
  {
    key: "inventory",
    title: "Inventory Support",
    description: "Boxes, uniforms and logistics resources",
    icon: <FaBoxesStacked size={20} />,
    href: "#",
  },
];

function ResourcesPanel({ onAddDrive, onDownloadTemplate }) {
  return (
    <Box
      sx={{
        width: { xs: "100%", lg: 320 },
        flexShrink: 0,
        backgroundColor: "#fff",
        borderRadius: 2,
        boxShadow: 1,
        p: 2.5,
        height: "max-content",
      }}
    >
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ color: "var(--color-darker)", mb: 0.5 }}
      >
        Resources
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Helpful guides and materials for your drive
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Add New Drive Action Link */}
        <Box
          component="button"
          type="button"
          onClick={onAddDrive}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            backgroundColor: "transparent",
            textAlign: "left",
            transition: "all 0.15s ease",
            cursor: "pointer",
            width: "100%",
            "&:hover": {
              borderColor: "var(--color-main)",
              backgroundColor: "var(--color-bg-light)",
              "& .resource-arrow": { opacity: 1, transform: "translateX(0)" },
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2,
              backgroundColor: "var(--color-bg-light)",
              color: "var(--color-main)",
            }}
          >
            <FaPlus size={18} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: "#111827", lineHeight: 1.3 }}
            >
              Add New Drive
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", lineHeight: 1.3 }}
            >
              Create and schedule a new donation drive
            </Typography>
          </Box>
          <Box
            className="resource-arrow"
            sx={{
              color: "var(--color-main)",
              display: "flex",
              alignItems: "center",
              opacity: 0,
              transform: "translateX(-4px)",
              transition: "all 0.15s ease",
            }}
          >
            <FiArrowRight size={16} />
          </Box>
        </Box>

        {/* Download Template Action Link */}
        <Box
          component="button"
          type="button"
          onClick={onDownloadTemplate}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            backgroundColor: "transparent",
            textAlign: "left",
            transition: "all 0.15s ease",
            cursor: "pointer",
            width: "100%",
            "&:hover": {
              borderColor: "var(--color-main)",
              backgroundColor: "var(--color-bg-light)",
              "& .resource-arrow": { opacity: 1, transform: "translateX(0)" },
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2,
              backgroundColor: "var(--color-bg-light)",
              color: "var(--color-main)",
            }}
          >
            <DownloadIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: "#111827", lineHeight: 1.3 }}
            >
              Download Template
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", lineHeight: 1.3 }}
            >
              Pre-filled donation drive spreadsheet
            </Typography>
          </Box>
          <Box
            className="resource-arrow"
            sx={{
              color: "var(--color-main)",
              display: "flex",
              alignItems: "center",
              opacity: 0,
              transform: "translateX(-4px)",
              transition: "all 0.15s ease",
            }}
          >
            <FiArrowRight size={16} />
          </Box>
        </Box>
        {RESOURCES.map((res) => (
          <Box
            key={res.key}
            component="a"
            href={res.href}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              transition: "all 0.15s ease",
              cursor: "pointer",
              "&:hover": {
                borderColor: "var(--color-main)",
                backgroundColor: "var(--color-bg-light)",
                "& .resource-arrow": { opacity: 1, transform: "translateX(0)" },
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 2,
                backgroundColor: "var(--color-bg-light)",
                color: "var(--color-main)",
              }}
            >
              {res.icon}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: "#111827", lineHeight: 1.3 }}
              >
                {res.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.3 }}
              >
                {res.description}
              </Typography>
            </Box>
            <Box
              className="resource-arrow"
              sx={{
                color: "var(--color-main)",
                display: "flex",
                alignItems: "center",
                opacity: 0,
                transform: "translateX(-4px)",
                transition: "all 0.15s ease",
              }}
            >
              <FiArrowRight size={16} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DonationDrivePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [donationDrives, setDonationDrives] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [allSchools, setAllSchools] = useState([]);
  const [userId, setUserId] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  const [filterSchool, setFilterSchool] = useState("");


  
  // Determine role and resolve school ID / user ID from /api/users/me
  useEffect(() => {
    const role = getRoleFromSession();
    const admin = role === "TCC_ADMIN";
    if (admin) setIsAdmin(true);

    fetch('/api/users/me')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      })
      .then((json) => {
        const resolvedUserId = json?.userId ?? json?.id;
        if (resolvedUserId) setUserId(resolvedUserId);
        if (!admin) {
          const resolvedSchoolId = json?.schoolId ?? json?.school?.id;
          const resolvedSchoolName = json?.schoolName ?? json?.school?.name;
          if (resolvedSchoolId) {
            setSchoolId(resolvedSchoolId);
            if (resolvedSchoolName) setSchoolName(resolvedSchoolName);
          } else {
            setError("Your account is not linked to a school.");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user profile:", err);
        if (!admin) setError("Failed to retrieve school information.");
      })
      .finally(() => setProfileLoading(false));
  }, [router]);

  useEffect(() => {
    if (profileLoading) return;
    fetchAllDonationDrives();
  }, [profileLoading, isAdmin, schoolId]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/schools')
      .then((res) => res.json())
      .then((data) => {
        const list = (data.schools || data.data || []).map((s: any) => ({
          id: s.id,
          name: s.schoolName || s.name,
        }));
        setAllSchools(list);
      })
      .catch(console.error);
  }, [isAdmin]);

  const fetchAllDonationDrives = async () => {
    try {
      setLoading(true);

      const apiUrl = '';

      // Admins fetch all drives; non-admins fetch only their school's
      const url = isAdmin
        ? `${apiUrl}/api/donations/drives`
        : `${apiUrl}/api/donation-drive/school/${schoolId}`;

      if (!isAdmin && !schoolId) {
        setError("No school linked to your account.");
        return;
      }

      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to fetch donation drives");

      const result = await response.json();

      // Admin response: { drives: [...] }, school response: { data: [...] }
      const driveList = result.drives || result.data || [];
      const sortedData = driveList.sort(
        (a, b) => new Date(b.created_at || b.startDate) - new Date(a.created_at || a.startDate),
      );

      setDonationDrives(sortedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching donation drives:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row) => {
    setEditRow(row);
    setModalOpen(true);
  };

  const handleDelete = (row) => setDeleteRow(row);

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    setDeleteLoading(true);
    try {
      const apiUrl = '';
      const response = await fetch(
        `${apiUrl}/api/donations/drives/${deleteRow.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();
      setSnackbar({
        open: true,
        message: response.ok
          ? "Donation drive deleted successfully"
          : result.message || "Failed to delete donation drive",
        severity: response.ok ? "success" : "error",
      });

      if (response.ok) fetchAllDonationDrives();
    } catch (err) {
      console.error("Error deleting donation drive:", err);
      setSnackbar({
        open: true,
        message: "Something went wrong",
        severity: "error",
      });
    } finally {
      setDeleteLoading(false);
      setDeleteRow(null);
    }
  };

  const handleClose = (result) => {
    setModalOpen(false);
    setEditRow(null);
    if (result) {
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? "success" : "error",
      });
      fetchAllDonationDrives();
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const columns = useMemo(
    () => buildColumns(isAdmin, handleEdit, handleDelete),
    [isAdmin],
  );

  const uniqueSchools = useMemo(() => {
    if (!isAdmin) return [];
    if (allSchools.length > 0) return allSchools;
    const map = new Map();
    for (const d of donationDrives) {
      if (d.school?.id && d.school?.schoolName) {
        map.set(d.school.id, d.school.schoolName);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [donationDrives, isAdmin, allSchools]);

  const filteredDrives = useMemo(() => {
    if (!isAdmin || !filterSchool) return donationDrives;
    return donationDrives.filter((d) => String(d.school?.id) === String(filterSchool));
  }, [donationDrives, isAdmin, filterSchool]);

  // Title shown below the page heading: "All Schools" for admins,
  // or the selected school if filtered, otherwise the logged-in user's school name
  const schoolTitle = useMemo(() => {
    if (isAdmin) {
      if (filterSchool) {
        const found = uniqueSchools.find((s) => String(s.id) === String(filterSchool));
        return found ? found.name : "All School(s)";
      }
      return "All School(s)";
    }
    const resolved =
      schoolName || donationDrives.find((d) => d.school?.schoolName)?.school?.schoolName;
    if (!resolved) return "";
    return resolved.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }, [isAdmin, filterSchool, uniqueSchools, schoolName, donationDrives]);

  const selectClass =
    "w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none " +
    "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] " +
    "bg-no-repeat bg-[center_right_0.75rem]";

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: "var(--color-darker)" }}
          >
            Donation Drives
          </Typography>
          {schoolTitle && (
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ color: "#000", mt: 0.5 }}
            >
              {schoolTitle}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {filteredDrives.length} total drive
            {filteredDrives.length !== 1 ? "s" : ""} — manage and track your
            donation drive campaigns
          </Typography>
        </Box>

        {isAdmin && (
          <Box sx={{ minWidth: 200 }}>
            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className={selectClass}
            >
              <option value="">All Schools</option>
              {uniqueSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Box>
        )}
      </Box>

      {/* Loading */}
      {loading && <LoadingSpinner message="Loading donation drives..." />}

      {/* Error */}
      {!loading && error && (
        <Alert
          severity="error"
          action={
            <CustomErrorButton onClick={() => fetchAllDonationDrives()}>
              Retry
            </CustomErrorButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* DataGrid + Resources */}
      {!loading && !error && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 3,
            alignItems: "flex-start",
          }}
        >
        <Box
          sx={{
            height: "max-content",
            flex: 1,
            minWidth: 0,
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: 2,
            boxShadow: 1,
            overflow: "hidden",
          }}
        >
          <DataGrid
            rows={filteredDrives}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 300 },
                printOptions: { disableToolbarButton: true },
              },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            density="comfortable"
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "var(--color-bg-light)",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700,
                fontSize: "1rem",
              },
            }}
          />
        </Box>

          {/* Resources panel */}
          <ResourcesPanel
            onAddDrive={() => setModalOpen(true)}
            onDownloadTemplate={() => setTemplateModalOpen(true)}
          />
        </Box>
      )}

      {/* Snackbar */}
      <SnackbarAlert
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        severity={snackbar.severity}
        icon={snackbar.severity === "success" ? <FaCheck /> : <TbCancel />}
      />

      {/* Download CSV Template Modal */}
      <DownloadCSVTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Edit Modal */}
      {modalOpen && (
        <Backdrop
          open={modalOpen}
          onClick={() => {
            setModalOpen(false);
            setEditRow(null);
          }}
          sx={{ zIndex: 50, p: 2 }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {editRow ? "Edit Donation Drive" : "Create New Donation Drive"}
              </h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditRow(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
              >
                <IoClose />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-73px)]">
              <DonationDriveFormModal
                isAdmin={isAdmin}
                onClose={handleClose}
                editData={editRow}
                loggedInUserId={userId}
                loggedInSchoolId={schoolId}
              />
            </div>
          </div>
        </Backdrop>
      )}

      {/* Delete Confirmation */}
      {deleteRow && (
        <DeleteConfirmModal
          open={!!deleteRow}
          onClose={() => setDeleteRow(null)}
          onConfirm={handleDeleteConfirm}
          loading={deleteLoading}
          title="Delete Donation Drive"
          description={
            <>
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-700">
                {deleteRow?.driveName}
              </span>
              ? This action cannot be undone.
            </>
          }
        />
      )}
    </Box>
  );
}
