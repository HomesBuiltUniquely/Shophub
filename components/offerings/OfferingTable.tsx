'use client';

import React from 'react';
import { OfferingResponse } from '@/lib/types/offerings/offering.types';
import OfferingRow from './OfferingRow';
import { isInternalStaff } from '@/lib/auth/session';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface OfferingTableProps {
  offerings: OfferingResponse[];
  isLoading?: boolean;
  canSelect?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (prodId: string, selected: boolean) => void;
  onToggleSelectAll?: (selected: boolean) => void;
}

export default function OfferingTable({
  offerings,
  isLoading = false,
  canSelect = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: OfferingTableProps) {
  const user = useCurrentUser();
  const hideActions = isInternalStaff(user);
  const selectedSet = new Set(selectedIds);
  const pageIds = offerings.map((item) => String(item.prodId || '')).filter(Boolean);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someSelected = pageIds.some((id) => selectedSet.has(id));

  if (offerings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm">No offerings found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/70 border-b border-gray-200">
            <tr>
              {canSelect && (
                <th scope="col" className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                    aria-label="Select all products on this page"
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                </th>
              )}
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                OFFERING NAME
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                SKU
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                CATEGORY
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                TYPE
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                PRICE
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                MARGIN
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                STOCK
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                STATUS
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                UPDATED
              </th>
              {!hideActions && (
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
              >
                ACTIONS
              </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {offerings.map((offering) => (
              <OfferingRow
                key={offering.prodId}
                offering={offering}
                canSelect={canSelect}
                selected={selectedSet.has(String(offering.prodId || ''))}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
