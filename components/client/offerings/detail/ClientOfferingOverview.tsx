'use client';

import React from 'react';

interface ClientOfferingOverviewProps {
  offeringName: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  shortDesc?: string;
  longDesc?: string;
  tags?: string[];
  keywords?: string[];
  isVerified?: boolean;
}

export default function ClientOfferingOverview({
  offeringName,
  category = 'FURNITURE',
  subcategory = 'CHAIR',
  brand = 'HOMES & MERRY',
  sku = 'SKU-CHAIR-010',
  shortDesc,
  longDesc,
  tags = [],
  keywords = [],
  isVerified = true,
}: ClientOfferingOverviewProps) {
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);

  // Filter out internal enterprise tags like "high margin" or "cost"
  const clientVisibleTags = Array.from(
    new Set([
      ...tags,
      ...keywords,
      'Velvet Sofa',
      'Luxury Furniture',
      'Living Room Sofa',
    ])
  ).filter((t) => {
    const lower = t.toLowerCase();
    return !lower.includes('margin') && !lower.includes('cost') && !lower.includes('internal');
  });

  return (
    <div className="space-y-4">
      {/* Category / Subcategory / Brand Bar & Verified Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {category} {subcategory ? `/ ${subcategory}` : ''} {brand ? `• ${brand}` : ''}
        </span>

        {isVerified && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-[#65783A] border border-[#65783A]/30 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-[#65783A]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>VERIFIED LISTING</span>
          </span>
        )}
      </div>

      {/* Main Offering Title */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-950 tracking-tight leading-tight">
            {offeringName}
          </h1>
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/60 flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer"
            title="View product descriptions"
          >
            i
          </button>
        </div>
        {shortDesc && (
          <p className="mt-2 text-sm text-gray-600 font-normal leading-relaxed">
            {shortDesc}
          </p>
        )}
      </div>

      {/* Brand Pill & Client Tags */}
      <div className="flex flex-wrap items-center gap-2 pt-1">

        {/* Brand Badge */}
        {brand && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-xs font-bold shadow-2xs">
            <span>★</span>
            <span>{brand}</span>
          </span>
        )}

        {/* Public Tags */}
        {clientVisibleTags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-3 py-1 rounded-full bg-[#FAF7F2] text-gray-700 text-xs font-semibold border border-[#EBE5DA]"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Description Info Modal */}
      {isInfoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsInfoOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2 min-w-0 pr-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold font-serif shrink-0">
                  i
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{offeringName}</h3>
                  {sku && sku !== '—' && (
                    <span className="text-[10px] font-mono text-gray-500">{sku}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="text-gray-400 hover:text-black w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Short Description */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>Short Description</span>
                </h4>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-800 text-xs leading-relaxed border border-gray-100">
                  {shortDesc ? (
                    <p>{shortDesc}</p>
                  ) : (
                    <p className="text-gray-400 italic">No short description available.</p>
                  )}
                </div>
              </div>

              {/* Long Description */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>Long Description</span>
                </h4>
                <div className="p-3.5 bg-gray-50 rounded-xl text-gray-800 text-xs leading-relaxed border border-gray-100 max-h-60 overflow-y-auto">
                  {longDesc ? (
                    <div
                      className="space-y-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                      dangerouslySetInnerHTML={{ __html: longDesc }}
                    />
                  ) : (
                    <p className="text-gray-400 italic">No detailed long description available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
