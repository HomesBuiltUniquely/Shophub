'use client';

import React from 'react';

interface ClientOfferingOverviewProps {
  offeringName: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  shortDesc?: string;
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
  tags = [],
  keywords = [],
  isVerified = true,
}: ClientOfferingOverviewProps) {
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
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-950 tracking-tight leading-tight">
          {offeringName}
        </h1>
        {shortDesc && (
          <p className="mt-2 text-sm text-gray-600 font-normal leading-relaxed">
            {shortDesc}
          </p>
        )}
      </div>

      {/* SKU & Brand Pill & Client Tags */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* SKU Pill */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs font-bold text-gray-700 border border-gray-200/80 shadow-2xs">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>SKU: {sku}</span>
        </span>

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
    </div>
  );
}
