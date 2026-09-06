// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import InventoryOverviewCard from "@/components/InventoryOverviewCard";
import InventoryBreakdownCard from "@/components/InventoryBreakdownCard";
import InventorySection from "@/components/InventorySection";
import InventoryBalancePreviewModal from "@/components/InventoryBalancePreviewModal";

/**
 * Shared items-detail view used by both admin and non-admin color pages.
 * Accepts the already-filtered baseInventoryData, isAdmin flag, and schoolLogoUrl.
 */
export default function ItemsDetailView({ items = [], isAdmin = false, schoolLogoUrl }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const openPreview = useCallback((item) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewItem(null);
  }, []);

  return (
    <>
      <InventoryOverviewCard items={items} isAdmin={isAdmin} />
      <InventoryBreakdownCard items={items} isAdmin={isAdmin} schoolLogoUrl={schoolLogoUrl} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <InventorySection
          title="Available for School Stock"
          items={items.filter((r) => r.itemStatus === "GeneralOffice" && r.storedAt === "School")}
          onRowClick={openPreview}
        />
        <InventorySection
          title="Reserved for PSG Activities"
          items={items.filter((r) => r.itemStatus === "ForSale" && r.storedAt === "School")}
          onRowClick={openPreview}
        />
        {isAdmin && (
          <InventorySection
            title="For Repurposing"
            items={items.filter((r) => r.itemStatus === "ForRepurpose" && r.storedAt === "TCC")}
            onRowClick={openPreview}
          />
        )}
      </div>

      <InventoryBalancePreviewModal
        isOpen={previewOpen}
        onClose={closePreview}
        item={previewItem}
      />
    </>
  );
}
