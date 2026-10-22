'use client';

import { useState } from 'react';

interface OfferingPricingSummaryProps {
  offeringName: string;
  category?: string;
  subcategory?: string;
  sku?: string;
  batchNumber?: string;
  upc?: string;
  price?: number;
  costPrice?: number;
  discount?: number;
  gstRate?: string;
  units?: string;
  shortDesc?: string;
  longDesc?: string;
  brand?: string;
  tags?: string[];
  keywords?: string[];
  isVerified?: boolean;
}

export default function OfferingPricingSummary({
  offeringName,
  category = 'OFFERING',
  subcategory = '',
  sku = '—',
  batchNumber = '',
  upc = '',
  price = 0,
  costPrice = 0,
  discount = 0,
  gstRate = 'GST_18',
  units = 'PER_PIECE',
  shortDesc,
  longDesc,
  brand,
  tags = [],
  keywords = [],
  isVerified = true,
}: OfferingPricingSummaryProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const formattedPrice = price.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedCost = costPrice.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedGst = gstRate ? gstRate.replace(/_/g, ' ') : 'GST 18%';
  const formattedUnits = units ? units.replace(/_/g, ' ').toLowerCase() : 'piece';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
      {/* Category Subtitle & Verified Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">
          {category} {subcategory ? `/ ${subcategory}` : ''} {brand ? `• ${brand}` : ''}
        </span>
        {isVerified && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-600 border border-green-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>VERIFIED LISTING</span>
          </div>
        )}
      </div>

      {/* Main Title & Short Description */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
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
          /<[a-z][\s\S]*>/i.test(shortDesc) ? (
            <div
              className="mt-1.5 text-xs text-gray-600 font-medium space-y-1 [&>p]:mb-1"
              dangerouslySetInnerHTML={{ __html: shortDesc }}
            />
          ) : (
            <p className="mt-1.5 text-xs text-gray-600 font-medium whitespace-pre-line">
              {shortDesc}
            </p>
          )
        )}
      </div>

      {/* Identifiers / Meta Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* SKU */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100/90 rounded-md text-xs font-semibold text-gray-700">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>SKU: {sku}</span>
        </div>

        {/* Batch / Accounting Code */}
        {batchNumber && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100/90 rounded-md text-xs font-semibold text-gray-700">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Batch: {batchNumber}</span>
          </div>
        )}

        {/* UPC / Barcode */}
        {upc && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100/90 rounded-md text-xs font-semibold text-gray-700">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>UPC: {upc}</span>
          </div>
        )}
      </div>

      {/* Current Market Price (MSRP) Card */}
      <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-100">
        <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2">
          CURRENT MARKET PRICE (MSRP)
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-gray-400 text-lg font-normal">₹</span>
          <span className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
            {formattedPrice}
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            INR / {formattedUnits}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 font-medium">
          <span>Cost: ₹{formattedCost}</span>
          {discount > 0 && (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
              {discount}% Discount Applied
            </span>
          )}
          <span>{formattedGst}</span>
        </div>
      </div>

      {/* Long Description */}
      {longDesc && (
        <div className="pt-2">
          <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">
            ABOUT THIS OFFERING
          </div>
          {/<[a-z][\s\S]*>/i.test(longDesc) ? (
            <div
              className="text-xs text-gray-600 leading-relaxed space-y-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
              dangerouslySetInnerHTML={{ __html: longDesc }}
            />
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
              {longDesc}
            </p>
          )}
        </div>
      )}

      {/* Internal Classification & Tags (from SEO keywords) */}
      <div>
        <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2.5">
          CLASSIFICATION & TAGS
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {brand && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black text-white text-xs font-bold shadow-xs">
              <span>★</span>
              <span>{brand}</span>
            </span>
          )}

          {(keywords && keywords.length > 0 ? keywords : tags).map((item) => (
            <span
              key={item}
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold capitalize"
            >
              #{item}
            </span>
          ))}

          {price > costPrice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <span>High Margin</span>
            </span>
          )}
        </div>
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
                    /<[a-z][\s\S]*>/i.test(shortDesc) ? (
                      <div
                        className="space-y-1 [&>p]:mb-1 [&>ul]:list-disc [&>ul]:pl-4"
                        dangerouslySetInnerHTML={{ __html: shortDesc }}
                      />
                    ) : (
                      <p className="whitespace-pre-line">{shortDesc}</p>
                    )
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
