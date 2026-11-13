'use client';

/**
 * ==============================================================================
 * COMPONENT: components/brands/BrandsTable.tsx
 * PURPOSE: 8-Column Brands Master Catalog Data Table
 * ==============================================================================
 * DESIGN & COLUMNS:
 * 1. LOGO: Custom brand SVG marks (Lumina, Nordic, Terra, Lux, etc.).
 * 2. BRAND NAME: Primary bold title + manufacturer subtitle.
 * 3. CODE: Monospaced catalog identifier (e.g. `LUM-IT-02`).
 * 4. COUNTRY: Country flag emoji + name.
 * 5. OFFERINGS: Formatted offering count with bold styling.
 * 6. CATEGORIES: Icon-coded category icons (Lighting, Furniture, Decor, Bedding, etc.).
 * 7. STATUS: Green 'ACTIVE' pill or Gray 'DRAFT' pill.
 * 8. UPDATED: Display date formatted.
 * - Interactive: Clicking any row opens the slide-over BrandDetailDrawer.
 * ==============================================================================
 */

import React from 'react';
import { BrandEntity } from '@/lib/db/homesmerry';

interface BrandsTableProps {
  brands: BrandEntity[];
  isLoading?: boolean;
  onBrandClick?: (brand: BrandEntity) => void;
  onEditBrand?: (brand: BrandEntity) => void;
}


// Country flags lookup
const COUNTRY_FLAGS: Record<string, string> = {
  Italy: '🇮🇹',
  Sweden: '🇸🇪',
  Spain: '🇪🇸',
  Germany: '🇩🇪',
  India: '🇮🇳',
  Denmark: '🇩🇰',
  Japan: '🇯🇵',
  Switzerland: '🇨🇭',
  USA: '🇺🇸',
  France: '🇫🇷',
  UK: '🇬🇧',
};

// Render small icons for each product category matching the screenshot
function CategoryIcon({ category }: { category: string }) {
  const cat = category.toUpperCase();

  if (cat.includes('LIGHT') || cat.includes('LAMP')) {
    // Lamp / Lighting icon
    return (
      <span className="w-5 h-5 flex items-center justify-center text-gray-600" title={category}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21h6m-3-3v3M12 3a6 6 0 00-6 6c0 2.22 1.21 4.16 3 5.2V17a1 1 0 001 1h4a1 1 0 001-1v-2.8c1.79-1.04 3-2.98 3-5.2a6 6 0 00-6-6z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  if (cat.includes('FURN') || cat.includes('CHAIR') || cat.includes('TABLE')) {
    // Chair / Table icon
    return (
      <span className="w-5 h-5 flex items-center justify-center text-gray-600" title={category}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 18v3m16-3v3M4 11h16M7 11V6a3 3 0 013-3h4a3 3 0 013 3v5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 14h12a2 2 0 012 2v2H4v-2a2 2 0 012-2z" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }

  if (cat.includes('BED')) {
    // Bed / Sleep icon
    return (
      <span className="w-5 h-5 flex items-center justify-center text-gray-600" title={category}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v11m0-4h18m0-7v11M7 10h10a2 2 0 012 2v2H5v-2a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  if (cat.includes('DECOR') || cat.includes('VASE') || cat.includes('ART')) {
    // Decor / Vase / Ceramic icon
    return (
      <span className="w-5 h-5 flex items-center justify-center text-gray-600" title={category}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 3h6m-5 0v3a4 4 0 01-2 3.46V18a3 3 0 003 3h2a3 3 0 003-3V9.46A4 4 0 0114 6V3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  // Default box / category node icon
  return (
    <span className="w-5 h-5 flex items-center justify-center text-gray-600" title={category}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

export default function BrandsTable({ brands, isLoading, onBrandClick, onEditBrand }: BrandsTableProps) {
  const sortedBrands = React.useMemo(() => {
    return [...brands].sort((a, b) => {
      const isHubA = a.brand_name?.trim().toLowerCase() === 'hub' ? 0 : 1;
      const isHubB = b.brand_name?.trim().toLowerCase() === 'hub' ? 0 : 1;
      if (isHubA !== isHubB) return isHubA - isHubB;
      return 0;
    });
  }, [brands]);
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-black"></div>
        <p className="mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Loading Brands Master...
        </p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <div className="text-sm font-bold text-gray-900">No brands found</div>
        <div className="text-xs text-gray-500 mt-1">Try adjusting your filters or search keywords.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="py-4 pl-6 pr-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                LOGO
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                BRAND NAME
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                CODE
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                COUNTRY
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-center">
                OFFERINGS
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                CATEGORIES
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                STATUS
              </th>
              <th className="py-4 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">
                UPDATED
              </th>
              <th className="py-4 pl-4 pr-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedBrands.map((brand) => {
              const flag = COUNTRY_FLAGS[brand.country] || '🌐';
              const categories = Array.isArray(brand.categories) ? brand.categories : [];
              const visibleCategories = categories.slice(0, 2);
              const overflowCount = categories.length - visibleCategories.length;
              const isHub = brand.brand_name?.trim().toLowerCase() === 'hub';
              const logoSrc = isHub ? '/images/hub-logo.jpg' : (brand.logo_url || '/brands/default.svg');

              return (
                <tr
                  key={brand.id}
                  onClick={() => onBrandClick?.(brand)}
                  className="hover:bg-[#F9FAFB]/75 transition-colors cursor-pointer group"
                >
                  {/* LOGO */}
                  <td className="py-4 pl-6 pr-3 w-16">
                    <div className="w-11 h-11 bg-white border border-gray-200/90 rounded-xl p-1 flex items-center justify-center shadow-2xs group-hover:border-gray-300 transition-all">
                      <img
                        src={logoSrc}
                        alt={`${brand.brand_name} logo`}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          // Fallback to default SVG if image fails
                          (e.target as HTMLImageElement).src = isHub ? '/images/hub-logo.jpg' : '/brands/default.svg';
                        }}
                      />
                    </div>
                  </td>

                  {/* BRAND NAME */}
                  <td className="py-4 px-4 min-w-[200px]">
                    <div className="text-sm font-extrabold text-gray-900 group-hover:text-black transition-colors leading-tight">
                      {brand.brand_name}
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-0.5">
                      {brand.manufacturer}
                    </div>
                  </td>

                  {/* CODE */}
                  <td className="py-4 px-4">
                    <span className="text-xs font-semibold text-gray-600 tracking-wide font-mono">
                      {brand.code}
                    </span>
                  </td>

                  {/* COUNTRY */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                      <span className="text-sm leading-none">{flag}</span>
                      <span>{brand.country}</span>
                    </div>
                  </td>

                  {/* OFFERINGS */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-[#F3F4F6] text-gray-900 font-extrabold text-xs rounded-lg min-w-[50px]">
                      {brand.offerings_count.toLocaleString()}
                    </span>
                  </td>

                  {/* CATEGORIES */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5">
                      {visibleCategories.map((cat, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200/50"
                        >
                          <CategoryIcon category={cat} />
                        </div>
                      ))}
                      {overflowCount > 0 && (
                        <span className="text-[11px] font-bold text-gray-400 ml-0.5">
                          +{overflowCount}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="py-4 px-4">
                    {brand.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F4F6] text-[#4B5563] border border-gray-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"></span>
                        DRAFT
                      </span>
                    )}
                  </td>

                  {/* UPDATED */}
                  <td className="py-4 px-4 text-right">
                    <span className="text-xs text-gray-500 font-normal">
                      {brand.updated_date}
                    </span>
                  </td>
                  <td className="py-4 pl-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBrand?.(brand);
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
