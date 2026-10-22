'use client';

import React, { useState, useMemo } from 'react';
import OfferingInfoButton from '@/components/offerings/OfferingInfoButton';

export interface CatalogProduct {
  prodId: number;
  offering_name: string;
  category: string;
  sku_id: string;
  brand?: string;
  short_desc?: string;
  long_desc?: string;
  pricing?: {
    selling_price: number;
    cost_price?: number;
    margin_percentage?: number;
  };
  inventory?: {
    current_stock: number;
    minimum_stock_level?: number;
  };
  media?: {
    primary_image?: string;
  };
  lead_time?: number;
}

interface QuoteCatalogSectionProps {
  products: CatalogProduct[];
  categories?: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onAddToCart: (product: CatalogProduct, quantity: number) => void;
  isLoading: boolean;
}

export default function QuoteCatalogSection({
  products,
  categories: propCategories,
  selectedCategory,
  onSelectCategory,
  onAddToCart,
  isLoading,
}: QuoteCatalogSectionProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const categories = propCategories && propCategories.length > 0
    ? propCategories
    : ['ALL', 'FIXTURES', 'FURNISHING', 'FURNITURE', 'LIGHTING', 'HARDWARE'];

  // Smart suggestions - Show top 2 featured catalog products
  const smartSuggestions = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 2);
  }, [products]);

  // Filter products by selected category
  const filteredProducts = products.filter((p) => {
    if (inStockOnly && p.inventory && p.inventory.current_stock <= 0) return false;
    if (selectedCategory === 'ALL') return true;
    const cat = (p.category || '').toUpperCase();
    const sel = selectedCategory.toUpperCase();
    return cat === sel || cat.includes(sel) || sel.includes(cat);
  });

  return (
    <div className="flex-1 px-8 py-6 pb-24 overflow-y-auto">
      {/* Offering Catalog Header with Filters */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Offering Catalog</h1>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
            filterOpen ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>Filters</span>
        </button>
      </div>

      {/* Expandable Filter Panel */}
      {filterOpen && (
        <div className="mb-5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-6 text-xs transition-all">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <span>In Stock Only</span>
          </label>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-8 text-xs font-bold tracking-wider overflow-x-auto">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`pb-2.5 transition-colors uppercase whitespace-nowrap ${
                isActive
                  ? 'text-black border-b-2 border-black font-extrabold'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Smart Suggestions Section */}
      <div className="mb-10">
        <h2 className="text-base font-bold text-gray-900 mb-3 tracking-tight">Smart Suggestions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {smartSuggestions.map((item) => {
            const price = item.pricing?.selling_price ?? 0;
            const isPerPiece = item.offering_name.toLowerCase().includes('pulls');
            const imageUrl = item.media?.primary_image?.startsWith('http')
              ? item.media.primary_image
              : null;

            return (
              <div
                key={item.prodId}
                onClick={() => onAddToCart(item, 1)}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3.5 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.offering_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 text-gray-300">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-900 truncate">{item.offering_name}</h3>
                    {item.sku_id && (
                      <span className="text-[9px] font-mono font-medium text-gray-500 bg-gray-100 px-1 rounded shrink-0">{item.sku_id}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mb-1">{item.short_desc || 'Frequently used together'}</p>
                  <div className="text-xs font-bold text-gray-900">
                    ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {isPerPiece && <span className="text-[10px] text-gray-500 font-normal"> / pc</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offerings Catalog Grid */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4 tracking-tight">Offerings Catalog</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-gray-300 border-t-black"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredProducts.map((prod) => {
              const price = prod.pricing?.selling_price ?? 0;
              const imageUrl = prod.media?.primary_image?.startsWith('http')
                ? prod.media.primary_image
                : null;
              const isLeadTime = prod.offering_name.toLowerCase().includes('pendant') || (prod.lead_time && prod.lead_time > 2);

              return (
                <div
                  key={prod.prodId}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col group"
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-4/3 bg-gray-50 overflow-hidden flex items-center justify-center">
                    {/* Badge */}
                    {isLeadTime ? (
                      <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold text-amber-500 bg-white/90 px-2 py-0.5 rounded shadow-2xs">
                        LEAD TIME: 4W
                      </span>
                    ) : (
                      <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold text-gray-700 bg-white/90 px-2 py-0.5 rounded shadow-2xs">
                        IN STOCK
                      </span>
                    )}

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={prod.offering_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 text-gray-300">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <h3 className="text-xs font-bold text-gray-900 truncate">{prod.offering_name}</h3>
                          <OfferingInfoButton
                            offeringName={prod.offering_name}
                            skuId={prod.sku_id}
                            prodId={prod.prodId}
                            shortDesc={prod.short_desc}
                            longDesc={prod.long_desc}
                            buttonSize="xs"
                          />
                        </div>
                        {prod.sku_id && (
                          <span className="text-[9px] font-mono font-medium text-gray-500 bg-gray-100 px-1 py-0.5 rounded shrink-0">{prod.sku_id}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                        {prod.short_desc || prod.category}
                      </p>
                    </div>

                    {/* Price and Add button */}
                    <div className="flex items-center justify-between mt-3 pt-2">
                      <div className="text-sm font-extrabold text-gray-900">
                        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(prod, 1);
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-200 hover:border-black hover:bg-black hover:text-white text-gray-700 flex items-center justify-center transition-all shadow-2xs"
                        title="Add to Quote"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
