'use client';

import Link from 'next/link';

interface OfferingDetailHeaderProps {
  offeringName: string;
  categoryName?: string;
  status?: string;
  prodId?: string | number;
  onEdit?: () => void;
}

export default function OfferingDetailHeader({
  offeringName,
  categoryName = '—',
  status = 'ACTIVE',
  prodId,
  onEdit,
}: OfferingDetailHeaderProps) {
  const isStatusActive = status.toUpperCase() === 'ACTIVE' || status.toUpperCase() === 'PUBLISHED';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Link
          href="/offerings"
          className="hover:text-gray-900 transition-colors"
        >
          Catalog
        </Link>
        <span>&gt;</span>
        <span className="text-gray-600">{categoryName}</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-semibold">{offeringName}</span>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isStatusActive
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isStatusActive ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span>{status}</span>
        </div>

        {/* Client Perspective Link */}
        <Link
          href={`/client/offerings/detail?id=${prodId || '1'}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Client Perspective ↗</span>
        </Link>

        {/* Edit Offering Button */}
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span>Edit Offering</span>
        </button>
      </div>
    </div>
  );
}
