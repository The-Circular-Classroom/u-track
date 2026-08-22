// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getRoleFromSession } from "@/utils/auth";
import { getUniformImageUrl } from "@/lib/inventory/uniformImageUrl";

// mui
import { Backdrop, Tooltip, Box, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

// icon
import { FaPlus, FaCheck } from "react-icons/fa6";
import { FiTrash2 } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { TbCancel } from "react-icons/tb";
import { MdOutlineInfo } from "react-icons/md";

// components
import SnackbarAlert from "@/components/SnackbarAlert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CustomButton from "@/components/ui/CustomButton";
import CustomErrorButton from "@/components/ui/CustomErrorButton";
import AddMethodModal from "@/components/AddMethodModal";
import ItemDetailsModal from "@/components/ItemDetailsModal";
import UploadCSVModal from "@/components/UploadCSVModal";

export default function UpdateItemCondition() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newCondition, setNewCondition] = useState({});
  const [modalOpen, setModalOpen] = useState(false);

  // ── Modals for Add New Pieces ───────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);

  // ── Modal filter state ──────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  
  const [pageFilterSchool, setPageFilterSchool] = useState("");

  const displayedSelectedItems = useMemo(() => {
    if (!isAdmin || !pageFilterSchool) return selectedItems;
    return selectedItems.filter(item => String(item.school?.id || item.itemType?.school?.id) === String(pageFilterSchool));
  }, [selectedItems, isAdmin, pageFilterSchool]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [loading, setLoading] = useState(true);
  const [confirmChangesLoading, setConfirmChangesLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Determine role and resolve school ID from /api/users/me ─────────────────
  useEffect(() => {
    const role = getRoleFromSession();
    const admin = role === "TCC_ADMIN";
    if (admin) setIsAdmin(true);

    const apiUrl = '';
    fetch(`${apiUrl}/api/users/me`)
      .then((res) => res.json())
      .then((json) => {
        if (!admin) {
          if (json?.school?.id) {
            setSchoolId(json.school.id);
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
    fetchAllInventoryItems();
  }, [profileLoading, isAdmin, schoolId]);

  const fetchAllInventoryItems = async () => {
    try {
      setLoading(true);
      const apiUrl = '';

      const response = await fetch(`${apiUrl}/api/inventory/balance`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Failed to fetch inventory items",
        );
      }

      const sortedData = (result.balances || []).sort(
        (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated),
      );

      // Client-side fallback: enrich imageUrl if the API didn't set it
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      sortedData.forEach((balance) => {
        const itemType = balance?.itemType;
        if (itemType) {
          const categoryName = itemType.category?.categoryName ?? null;
          const colourName = itemType.primaryColour?.colourName ?? null;
          itemType.imageUrl = getUniformImageUrl(supabaseUrl, categoryName, colourName, itemType.imageUrl);
        }
      });

      setInventoryItems(sortedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching inventory items:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilterStatus("");
    setFilterLocation("");
    setFilterSchool("");
  };

  const handleModalOpen = () => setModalOpen(true);

  // ── Derive unique school list for admin filter ───────────────────────────────
  const uniqueSchools = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map();
    for (const item of inventoryItems) {
      const school = item.itemType?.school;
      if (school?.id && school?.schoolName) {
        map.set(school.id, school.schoolName);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [inventoryItems, isAdmin]);

  // ── Filter grid rows based on modal dropdowns ───────────────────────────────
  const filteredInventoryItems = useMemo(() => {
    if (!filterStatus && !filterLocation && !filterSchool)
      return inventoryItems;
    return inventoryItems.filter((item) => {
      const statusMatch = !filterStatus || item.itemStatus === filterStatus;
      const locationMatch = !filterLocation || item.storedAt === filterLocation;
      const schoolMatch =
        !filterSchool ||
        String(item.itemType?.school?.id) === String(filterSchool);
      return statusMatch && locationMatch && schoolMatch;
    });
  }, [inventoryItems, filterStatus, filterLocation, filterSchool]);

  const handleAddItem = useCallback(
    (item) => {
      if (!selectedItems.find((selected) => selected.id === item.id)) {
        setSelectedItems((prev) => [
          ...prev,
          {
            ...item,
            itemStatus: filterStatus || item.itemStatus,
            storedAt: filterLocation || item.storedAt,
          },
        ]);
        setNewCondition((prev) => ({
          ...prev,
          [item.id]: {
            quantity: 1,
            status: "",
            storedAt: filterLocation || item.storedAt,
            remarks: "",
          },
        }));
      }
    },
    [selectedItems, filterStatus, filterLocation],
  );

  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
    setNewCondition((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleConfirmChanges = async () => {
    try {
      setConfirmChangesLoading(true);
      const apiUrl = '';

      const itemsToUpdate = selectedItems.map((item) => ({
        itemTypeId: item.itemTypeId,
        sizeOptionId: item.sizeOptionId,
        fromStatus: item.itemStatus,
        toStatus: newCondition[item.id]?.status || item.itemStatus,
        quantity: newCondition[item.id]?.quantity || 1,
        remarks: newCondition[item.id]?.remarks || "",
        fromStoredAt: item.storedAt,
        toStoredAt: newCondition[item.id]?.storedAt || item.storedAt,
        transactionType: 'StatusChange',
        userId: null,
      }));

      // Submit each transaction individually
      const results = await Promise.allSettled(
        itemsToUpdate.map((txn) =>
          fetch(`${apiUrl}/api/inventory/transactions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(txn),
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Transaction failed");
            return data;
          })
        )
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length === 0) {
        setSnackbar({
          open: true,
          message: "Items updated successfully",
          severity: "success",
        });
        setSelectedItems([]);
        setNewCondition({});
        await fetchAllInventoryItems();
      } else {
        const errorMsg = failures.map((f) => f.reason?.message || 'Unknown error').join('; ');
        setSnackbar({
          open: true,
          message: `Failed to update ${failures.length} item(s): ${errorMsg}`,
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Error confirming changes:", err);
      setError(err.message);
      setSnackbar({
        open: true,
        message: err.message || "Failed to update items",
        severity: "error",
      });
    } finally {
      setConfirmChangesLoading(false);
    }
  };

  const handleConditionChange = (itemId, field, value) => {
    setNewCondition((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]:
          field === "quantity" ? Math.max(1, parseInt(value) || 1) : value,
      },
    }));
  };

  const isFormValid = () => {
    return selectedItems.every((item) => {
      const condition = newCondition[item.id];
      const isSameStatus = condition?.status === item.itemStatus;
      const isSameStoredAt = condition?.storedAt === item.storedAt;
      const hasChange = !isSameStatus || !isSameStoredAt;
      const bothConfigsSet = condition?.status && condition?.storedAt;
      return condition && bothConfigsSet && condition.quantity > 0 && hasChange;
    });
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "GeneralOffice":
        return "bg-teal-50 text-teal-700 border border-teal-300";
      case "ForSale":
        return "bg-yellow-50 text-yellow-700 border border-yellow-300";
      case "Sold":
        return "bg-red-50 text-red-700 border border-red-200";
      case "Repurposed":
        return "bg-green-50 text-green-700 border border-green-300";
      case "Disposed":
        return "bg-gray-100 text-gray-700 border border-gray-300";
      default:
        return "bg-gray-50 text-gray-600 border border-gray-200";
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case "ForSale":
        return "For Sale";
      case "ForRepurpose":
        return "For Repurpose";
      case "GeneralOffice":
        return "General Office";
      default:
        return status || "-";
    }
  };

  const selectClass =
    "w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none " +
    "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] " +
    "bg-no-repeat bg-[center_right_0.75rem]";

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  const labelClass = "block text-sm font-medium text-gray-900 mb-2";

  // ── DataGrid columns ────────────────────────────────────────────────────────
  const modalColumns = useMemo(
    () => [
      {
        field: "preview",
        headerName: "Preview",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Image
              src={row.itemType?.imageUrl || "https://placehold.co/100/png"}
              alt={row.itemType?.category?.categoryName || "preview"}
              width={48}
              height={48}
              unoptimized
              style={{ objectFit: "contain", borderRadius: 4 }}
            />
          </Box>
        ),
      },

      // ── Admin-only: School column ────────────────────────────────────────────
      ...(isAdmin
        ? [
            {
              field: "school",
              headerName: "School",
              flex: 1,
              minWidth: 200,
              valueGetter: (value, row) =>
                row.itemType?.school?.schoolName || "",
              renderCell: ({ row }) => {
                const schoolName = row.itemType?.school?.schoolName;
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "#111827" }}>
                      {schoolName
                        ? schoolName
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                        : "-"}
                    </Typography>
                  </Box>
                );
              },
            },
          ]
        : []),
      {
        field: "itemType",
        headerName: "Item Type - Colour (Size)",
        flex: 1,
        minWidth: 200,
        valueGetter: (value, row) => {
          const category = value?.category?.categoryName;
          if (!category) return "-";
          const colour = value?.primaryColour?.colourName;
          const size = row.sizeOption?.sizeName;
          return `${category}${colour ? ` - ${colour}` : ""}${size ? ` (${size})` : ""}`;
        },
        renderCell: ({ row }) => {
          const item = row.itemType;
          const category = item?.category?.categoryName;
          if (!category) return "-";

          const colour = item?.primaryColour;
          const size = row.sizeOption?.sizeName;

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                height: "100%",
              }}
            >
              <Tooltip
                title={
                  category +
                  (colour?.colourName
                    ? ` - ${colour.colourName}${size ? ` (${size})` : ""}`
                    : "")
                }
              >
                <span>{category}</span>
              </Tooltip>
              {colour && (
                <>
                  <span>-</span>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: colour.hexcode,
                      border: "1px solid #ccc",
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2">
                    {colour.colourName || "-"}
                  </Typography>
                </>
              )}
              {size && <span style={{ color: "#888" }}>({size})</span>}
            </Box>
          );
        },
      },
      {
        field: "quantity",
        headerName: "Quantity",
        width: 100,
        renderCell: ({ value }) => (
          <div className="flex items-center h-full">
            <span className="text-sm text-gray-900">{value}</span>
          </div>
        ),
      },
      {
        field: "itemStatus",
        headerName: "Status",
        width: 150,
        renderCell: ({ value }) => (
          <div className="flex items-center h-full">
            <span
              className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusStyle(value)}`}
            >
              {value === "ForSale"
                ? "For Sale"
                : value === "ForRepurpose"
                  ? "For Repurpose"
                  : value === "GeneralOffice"
                    ? "General Office"
                    : value || "-"}
            </span>
          </div>
        ),
      },
      {
        field: "storedAt",
        headerName: "Storage Location",
        width: 150,
        renderCell: ({ value }) => (
          <div className="flex items-center h-full">
            <span className="text-sm text-gray-900">{value || "-"}</span>
          </div>
        ),
      },
      {
        field: "action",
        headerName: "Action",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const isAdded = selectedItems.find((s) => s.id === row.id);
          return (
            <div className="flex items-center h-full">
              {isAdded ? (
                <span className="text-sm font-medium text-green-600">
                  Added
                </span>
              ) : (
                <CustomButton
                  iconOnly
                  icon={<FaPlus size={12} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddItem(row);
                  }}
                />
              )}
            </div>
          );
        },
      },
    ],
    [isAdmin, selectedItems, handleAddItem],
  );

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (profileLoading || loading) {
    return <LoadingSpinner message="Loading items..." />;
  }

  if (error) {
    return (
      <CustomErrorButton
        title="Error Loading Update Inventory page"
        message={error}
        onRetry={fetchAllInventoryItems}
      />
    );
  }

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
            Update Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Update the details and status of individual items
          </Typography>
        </Box>

        {isAdmin && (
          <Box sx={{ minWidth: 200 }}>
            <select
              value={pageFilterSchool}
              onChange={(e) => setPageFilterSchool(e.target.value)}
              className={selectClass}
            >
              <option value="">All Schools</option>
              {uniqueSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </Box>
        )}
      </Box>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Items to Update */}
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 w-full lg:w-[60%]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6">
            <p className="text-base font-semibold text-gray-900">
              Items to Update
            </p>
            <div className="flex gap-2">
              <CustomButton
                variant="outline"
                onClick={() => setAddModalOpen(true)}
                icon={<FaPlus />}
                className="w-full sm:w-auto"
              >
                Add New Pieces
              </CustomButton>
              <CustomButton
                onClick={handleModalOpen}
                icon={<FaPlus />}
                className="w-full sm:w-auto"
              >
                Select Item
              </CustomButton>
            </div>
          </div>

          {displayedSelectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <p className="text-gray-900 font-medium mb-1">
                No items selected
              </p>
              <p className="text-gray-500 text-sm">
                Add items from inventory to update their status
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedSelectedItems.map((item) => {
                const condition = newCondition[item.id];
                const bothSet = condition?.status && condition?.storedAt;
                const removeQty = condition?.quantity || 1;
                const remaining = Math.max(0, (item.quantity || 1) - removeQty);
                const colour = item.itemType?.primaryColour;
                const size = item.sizeOption?.sizeName;

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-6 border border-gray-200 rounded-lg bg-white"
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="relative w-14 h-14 shrink-0 mx-auto sm:mx-0">
                        <Image
                          src={
                            item.itemType?.imageUrl ||
                            "https://placehold.co/100/png"
                          }
                          alt={item.itemType?.category?.categoryName || "Item"}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                              {item.itemType?.category?.categoryName}
                            </h3>
                            {isAdmin &&
                              (item.school?.schoolName ||
                                item.itemType?.school?.schoolName) && (
                                <p className="text-xs sm:text-sm text-green-600 mt-1">
                                  {(
                                    item.school?.schoolName ||
                                    item.itemType?.school?.schoolName
                                  )
                                    .toLowerCase()
                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                                </p>
                              )}

                            {/* Colour + Size tags */}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {colour && (
                                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <span
                                    className="inline-block w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: colour.hexcode }}
                                  />
                                  {colour.colourName}
                                </span>
                              )}
                              {size && (
                                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {size === "One Size" ? size : `Size ${size}`}
                                </span>
                              )}
                            </div>

                            {/* Current condition */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-xs text-gray-400">
                                Current status:
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(item.itemStatus)}`}
                              >
                                {formatStatus(item.itemStatus)}
                              </span>
                              <span className="text-xs text-gray-400">
                                Current storage location:
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {item.storedAt}
                              </span>
                              <span className="text-xs text-gray-400">
                                ● Qty: {item.quantity} items
                              </span>
                            </div>
                          </div>
                          <CustomButton
                            iconOnly
                            variant="iconGhost"
                            icon={<FiTrash2 size={20} />}
                            onClick={() => handleRemoveItem(item.id)}
                            className="ml-2"
                          />
                        </div>

                        {/* New condition */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                            New condition
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <label className={labelClass}>New Status</label>
                              <select
                                value={condition?.status || ""}
                                onChange={(e) =>
                                  handleConditionChange(
                                    item.id,
                                    "status",
                                    e.target.value,
                                  )
                                }
                                className={selectClass}
                              >
                                <option value="" disabled>
                                  Select new status
                                </option>
                                <option
                                  value="GeneralOffice"
                                  disabled={
                                    item.itemStatus === "GeneralOffice" &&
                                    condition?.storedAt === item.storedAt
                                  }
                                >
                                  General Office
                                </option>
                                <option
                                  value="ForSale"
                                  disabled={
                                    item.itemStatus === "ForSale" &&
                                    condition?.storedAt === item.storedAt
                                  }
                                >
                                  For Sale
                                </option>
                                <option
                                  value="Sold"
                                  disabled={
                                    item.itemStatus === "Sold" &&
                                    condition?.storedAt === item.storedAt
                                  }
                                >
                                  Sold
                                </option>
                                <option
                                  value="ForRepurpose"
                                  disabled={
                                    item.itemStatus === "ForRepurpose" &&
                                    condition?.storedAt === item.storedAt
                                  }
                                >
                                  For Repurpose
                                </option>
                                <option
                                  value="Repurposed"
                                  disabled={
                                    item.itemStatus === "Repurposed" &&
                                    condition?.storedAt === item.storedAt
                                  }
                                >
                                  Repurposed
                                </option>
                                <option
                                  value="Disposed"
                                  disabled={
                                    item.itemStatus === "Disposed" &&
                                    condition?.storedAt === item.storedAt
                                  }
                                >
                                  Disposed
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className={labelClass}>
                                New Storage Location
                              </label>
                              <select
                                value={condition?.storedAt || ""}
                                onChange={(e) =>
                                  handleConditionChange(
                                    item.id,
                                    "storedAt",
                                    e.target.value,
                                  )
                                }
                                className={selectClass}
                              >
                                <option value="" disabled>
                                  Select location
                                </option>
                                <option value="School">School</option>
                                <option value="TCC">TCC</option>
                              </select>
                            </div>
                          </div>

                          {/* Quantity + Remark — only shown once both configs set */}
                          {bothSet && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-dashed border-gray-200">
                              <div>
                                <label className={labelClass}>
                                  Quantity to remove
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={condition?.quantity || 1}
                                  onChange={(e) =>
                                    handleConditionChange(
                                      item.id,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className={inputClass}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                  {item.quantity} available · {remaining} will
                                  remain
                                </p>
                              </div>

                              <div>
                                <label className={labelClass}>Remark</label>
                                <input
                                  type="text"
                                  value={condition?.remarks || ""}
                                  onChange={(e) =>
                                    handleConditionChange(
                                      item.id,
                                      "remarks",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Optional"
                                  className={inputClass}
                                />
                              </div>
                            </div>
                          )}

                          {!bothSet && (
                            <p className="text-xs text-gray-400 mt-3 italic">
                              Select both a new status and storage location to
                              set the quantity.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 w-full lg:w-[40%] h-fit">
          <p className="text-base font-semibold text-gray-900 mb-6">Summary</p>

          {selectedItems.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-gray-500 text-sm">Add item to view summary</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-sm text-gray-600">Items to update</span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedItems.length}
                </span>
              </div>

              <div>
                <p className="text-lg font-bold text-gray-900 mb-4">
                  Status Changes
                </p>
                <div className="space-y-4">
                  {selectedItems.map((item) => {
                    const condition = newCondition[item.id];
                    const removeQty = condition?.quantity || 1;
                    const remaining = Math.max(
                      0,
                      (item.quantity || 1) - removeQty,
                    );
                    const nextStatus = condition?.status || item.itemStatus;
                    const nextStoredAt = condition?.storedAt || item.storedAt;
                    const remark = condition?.remarks || "";
                    const schoolName =
                      item.school?.schoolName ||
                      item.itemType?.school?.schoolName;
                    const bothSet = condition?.status && condition?.storedAt;
                    const size = item.sizeOption?.sizeName;
                    const colour = item.itemType?.primaryColour;

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg bg-gray-50 p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.itemType?.category?.categoryName}
                          </p>
                          {colour && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: colour.hexcode }}
                              />
                              {colour.colourName}
                            </span>
                          )}
                          {size && (
                            <span className="text-xs font-medium text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                              {size}
                            </span>
                          )}
                        </div>

                        {isAdmin && schoolName && (
                          <p className="text-xs text-green-600 font-semibold">
                            {schoolName
                              .toLowerCase()
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusStyle(item.itemStatus)}`}
                          >
                            {formatStatus(item.itemStatus)}
                          </span>
                          <span className="text-gray-400 text-xs">→</span>
                          {condition?.status ? (
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusStyle(nextStatus)}`}
                            >
                              {formatStatus(nextStatus)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              not set
                            </span>
                          )}
                        </div>

                        {bothSet && (
                          <div className="space-y-1 text-xs text-gray-600">
                            <p>
                              Qty: {item.quantity} - {removeQty} ={" "}
                              <span className="font-semibold text-green-600">
                                {remaining} remaining
                              </span>
                            </p>
                            <p>
                              Location:{" "}
                              <span className="font-semibold text-gray-800">
                                {nextStoredAt}
                              </span>
                            </p>
                            {remark && (
                              <p>
                                Remark:{" "}
                                <span className="font-semibold text-gray-800">
                                  {remark}
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        {!bothSet && (
                          <p className="text-xs text-amber-500 italic">
                            Pending configuration
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {confirmChangesLoading ? (
                <div className="w-full text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-main) mx-auto"></div>
                </div>
              ) : (
                <CustomButton
                  onClick={handleConfirmChanges}
                  disabled={!isFormValid()}
                  className="w-full"
                >
                  Confirm Changes
                </CustomButton>
              )}
            </div>
          )}
        </div>

        <SnackbarAlert
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          message={snackbar.message}
          severity={snackbar.severity}
          icon={snackbar.severity === "success" ? <FaCheck /> : <TbCancel />}
        />

        {/* Modal */}
        {modalOpen && (
          <Backdrop
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            open={modalOpen}
            onClick={handleModalClose}
          >
            <div
              className={`bg-white rounded-lg shadow-xl w-full ${isAdmin ? "max-w-6xl" : "max-w-4xl"} max-h-[90vh] overflow-hidden flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start p-4 sm:p-6 border-b shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Select Item from Inventory
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Filter by current status and location, then add the items
                    you want to update
                  </p>
                </div>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer ml-4"
                >
                  <IoClose />
                </button>
              </div>

              {/* Filter bar */}
              <div className="px-4 sm:px-6 py-4 border-b bg-gray-50 shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Filter by current item condition
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {isAdmin && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        School
                      </label>
                      <select
                        value={filterSchool}
                        onChange={(e) => setFilterSchool(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">All schools</option>
                        {uniqueSchools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name
                              .toLowerCase()
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Current Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">All statuses</option>
                      <option value="GeneralOffice">General Office</option>
                      <option value="ForSale">For Sale</option>
                      <option value="ForRepurpose">For Repurpose</option>
                      <option value="Sold">Sold</option>
                      <option value="Repurposed">Repurposed</option>
                      <option value="Disposed">Disposed</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Current Storage Location
                    </label>
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">All locations</option>
                      <option value="School">School</option>
                      <option value="TCC">TCC</option>
                    </select>
                  </div>

                  {(filterStatus || filterLocation || filterSchool) && (
                    <div className="flex items-end gap-2 flex-wrap">
                      {filterSchool && (
                        <span className="text-xs text-green-700 bg-green-50 border border-green-300 px-2.5 py-1 rounded-full font-semibold">
                          {uniqueSchools
                            .find((s) => String(s.id) === String(filterSchool))
                            ?.name?.toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase()) ||
                            filterSchool}
                        </span>
                      )}
                      {filterStatus && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyle(filterStatus)}`}
                        >
                          {formatStatus(filterStatus)}
                        </span>
                      )}
                      {filterLocation && (
                        <span className="text-xs text-gray-600 bg-gray-200 px-2.5 py-1 rounded-full font-medium">
                          {filterLocation}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setFilterStatus("");
                          setFilterLocation("");
                          setFilterSchool("");
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {(!filterStatus || !filterLocation) && (
                  <div className="flex items-center gap-1 text-amber-600 mt-2">
                    <MdOutlineInfo />
                    <p className="text-xs">
                      Tip: Selecting both a status and a location will help
                      prefill new items with the correct values.
                    </p>
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="px-4 sm:px-6 overflow-y-auto flex-1">
                <Box
                  sx={{
                    width: "100%",
                    backgroundColor: "#fff",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <DataGrid
                    rows={filteredInventoryItems}
                    columns={modalColumns}
                    getRowId={(row) => row.id}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10 } },
                      sorting: {
                        sortModel: [{ field: "school", sort: "asc" }],
                      },
                    }}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                      toolbar: {
                        showQuickFilter: true,
                        quickFilterProps: { debounceMs: 300 },
                        printOptions: { disableToolbarButton: true },
                      },
                    }}
                    disableRowSelectionOnClick
                    density="comfortable"
                    autoHeight
                    sx={{
                      border: "none",
                      "& .MuiDataGrid-columnHeaders": {
                        backgroundColor: "var(--color-bg-light)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "#6b7280",
                      },
                      "& .MuiDataGrid-row:hover": {
                        backgroundColor: "#f9fafb",
                      },
                      "& .MuiDataGrid-cell": {
                        borderBottom: "1px solid #f3f4f6",
                      },
                      "& .MuiDataGrid-footerContainer": {
                        borderTop: "1px solid #e5e7eb",
                      },
                      "& .MuiDataGrid-toolbarContainer": {
                        padding: "8px 16px",
                        borderBottom: "1px solid #e5e7eb",
                      },
                    }}
                  />
                </Box>
              </div>
            </div>
          </Backdrop>
        )}
      </div>

      <AddMethodModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddManually={() => {
          setAddModalOpen(false);
          setManualAddOpen(true);
        }}
        onUploadExcel={() => {
          setAddModalOpen(false);
          setCsvUploadOpen(true);
        }}
        onDownloadTemplate={() => {
          setAddModalOpen(false);
          // Insert download template logic if applicable
        }}
      />
      <ItemDetailsModal
        isOpen={manualAddOpen}
        onClose={() => setManualAddOpen(false)}
        isAdmin={isAdmin}
        schools={uniqueSchools.map(s => ({ id: s.id, schoolName: s.name }))}
      />
      <UploadCSVModal
        isOpen={csvUploadOpen}
        onClose={() => setCsvUploadOpen(false)}
      />
    </Box>
  );
}
