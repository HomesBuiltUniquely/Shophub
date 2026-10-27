'use client';

/**
 * ==============================================================================
 * COMPONENT: components/brands/BrandDetailDrawer.tsx
 * PURPOSE: Slide-over Drawer for Brand Specifications, Details, and Quick Actions
 * ==============================================================================
 * TRIGGERED BY:
 * - Clicking any brand row in the Brands Master table.
 *
 * FUNCTIONALITY:
 * - Displays brand logo, code, manufacturer hierarchy, category pills, and country.
 * - Allows 1-click status toggling (ACTIVE <-> DRAFT) which calls `PATCH /api/brands`
 *   to update the database record in real-time.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { BrandEntity } from '@/lib/db/homesmerry';

interface BrandDetailDrawerProps {
  brand: BrandEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
  onEdit?: (brand: BrandEntity) => void;
}

export default function BrandDetailDrawer({

  brand,
  isOpen,
  onClose,
  onStatusUpdated,
  onEdit,
}: BrandDetailDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !brand) return null;

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    const newStatus = brand.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      const res = await fetch('/api/brands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brand.id, status: newStatus }),
      });
      if (res.ok) {
        onStatusUpdated();
      }
    } catch (err) {
      console.error('Failed to update brand status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/35 backdrop-blur-2xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-gray-200 animate-in slide-in-from-right duration-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200/90 p-1 flex items-center justify-center">
                <img
                  src={brand.brand_name?.trim().toLowerCase() === 'hub' ? '/images/hub-logo.jpg' : (brand.logo_url || '/brands/default.svg')}
                  alt={brand.brand_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = brand.brand_name?.trim().toLowerCase() === 'hub' ? '/images/hub-logo.jpg' : '/brands/default.svg';
                  }}
                />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-950 tracking-tight">
                  {brand.brand_name}
                </h3>
                <span className="text-xs font-mono text-gray-500 font-semibold">
                  {brand.code}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Status Control */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                  Catalog Status
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      brand.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        brand.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    ></span>
                    {brand.status}
                  </span>
                </div>
              </div>

              <button
                onClick={handleToggleStatus}
                disabled={isUpdating}
                className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : brand.status === 'ACTIVE' ? 'Set as Draft' : 'Activate Brand'}
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Manufacturer / Operating Group
                </div>
                <div className="text-xs font-bold text-gray-900 bg-white p-3 rounded-xl border border-gray-200/80">
                  {brand.manufacturer}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Country Origin
                  </div>
                  <div className="text-xs font-bold text-gray-900 bg-white p-3 rounded-xl border border-gray-200/80 flex items-center gap-2">
                    <span>{brand.country}</span>
                    <span className="text-xs text-gray-400 font-mono">({brand.country_code})</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Total Offerings
                  </div>
                  <div className="text-xs font-bold text-gray-900 bg-white p-3 rounded-xl border border-gray-200/80">
                    {brand.offerings_count.toLocaleString()} products
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Assigned Categories
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(brand.categories || []).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-bold border border-gray-200/60"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Last Catalog Sync
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {brand.updated_date}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(brand)}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Edit brand
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:text-black rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
