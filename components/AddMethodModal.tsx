// @ts-nocheck
'use client';

import { Backdrop } from '@mui/material';
import { IoClose } from 'react-icons/io5';

export default function AddMethodModal({
  isOpen,
  onClose,
  onAddManually,
  onUploadExcel,
  onDownloadTemplate,
  showManual = true,
}) {
  if (!isOpen) return null;

  return (
    <Backdrop open={isOpen} onClick={onClose} sx={{ zIndex: 50, p: 2 }}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Add new pieces by uploading the Uniform Donation template
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
          >
            <IoClose />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className={`grid gap-4 ${showManual ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {showManual && (
              <button
                type="button"
                onClick={onAddManually}
                className="flex flex-col items-center p-8 rounded-lg border-2 border-gray-200 hover:border-[var(--color-main)] hover:bg-green-50/50 text-center transition-colors cursor-pointer group"
              >
                <span className="w-14 h-14 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-[var(--color-main)] mb-4 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900 text-base">Add Manually</span>
                <span className="text-sm text-gray-500 mt-1.5">Enter item details one by one</span>
              </button>
            )}

            <button
              type="button"
              onClick={onUploadExcel}
              className="flex flex-col items-center p-8 rounded-lg border-2 border-gray-200 hover:border-[var(--color-main)] hover:bg-green-50/50 text-center transition-colors cursor-pointer group"
            >
              <span className="w-14 h-14 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-[var(--color-main)] mb-4 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <span className="font-semibold text-gray-900 text-base">Upload Excel/CSV</span>
              <span className="text-sm text-gray-500 mt-1.5">Import multiple items at once</span>
            </button>

            {onDownloadTemplate && (
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="flex flex-col items-center p-8 rounded-lg border-2 border-gray-200 hover:border-[var(--color-main)] hover:bg-green-50/50 text-center transition-colors cursor-pointer group"
              >
                <span className="w-14 h-14 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-[var(--color-main)] mb-4 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900 text-base">Download Template</span>
                <span className="text-sm text-gray-500 mt-1.5">Download the Uniform Donation template</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Backdrop>
  );
}