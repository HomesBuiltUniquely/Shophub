'use client';

import { useState } from 'react';

interface CatalogBulkBarProps {
  selectedCount: number;
  totalCount: number;
  busy?: boolean;
  canDelete?: boolean;
  onClear: () => void;
  onSelectPage: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onChangePrice: (percent: number) => void;
  onDelete?: () => void;
}

export default function CatalogBulkBar({
  selectedCount,
  totalCount,
  busy = false,
  canDelete = false,
  onClear,
  onSelectPage,
  onActivate,
  onDeactivate,
  onChangePrice,
  onDelete,
}: CatalogBulkBarProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [percent, setPercent] = useState('');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');

  if (selectedCount === 0) return null;

  const applyPrice = () => {
    const value = Number(percent);
    if (!Number.isFinite(value) || value <= 0) {
      window.alert('Enter a percentage greater than 0.');
      return;
    }
    if (direction === 'decrease' && value > 100) {
      window.alert('Decrease cannot be more than 100%.');
      return;
    }
    onChangePrice(direction === 'decrease' ? -value : value);
    setPriceOpen(false);
  };

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">
          {selectedCount} product{selectedCount === 1 ? '' : 's'} selected
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Select page ({totalCount})
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onActivate}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Make active
          </button>
          <button
            type="button"
            onClick={onDeactivate}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            Make inactive
          </button>
          <button
            type="button"
            onClick={() => setPriceOpen((open) => !open)}
            disabled={busy}
            className="rounded-lg bg-black px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            Change price
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Working…' : 'Delete selected'}
            </button>
          )}
        </div>
      </div>
      {priceOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <label className="text-xs font-semibold text-gray-600" htmlFor="bulk-price-percent">
            Adjust by (%)
          </label>
          <input
            id="bulk-price-percent"
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900"
            placeholder="10"
          />
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'increase' | 'decrease')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800"
          >
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </select>
          <button
            type="button"
            onClick={applyPrice}
            disabled={busy}
            className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Apply to selected
          </button>
        </div>
      )}
    </div>
  );
}
