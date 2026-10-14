'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { OfferingResponse } from '@/lib/types/offerings/offering.types';
import { isInternalStaff } from '@/lib/auth/session';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { offeringImageUrl } from '@/lib/media/offering-image';

interface OfferingRowProps {
  offering: OfferingResponse;
}

// Generate 2-letter uppercase initials from offering name
function getInitials(name: string = ''): string {
  if (!name) return 'PR';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function OfferingRow({ offering }: OfferingRowProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const hideActions = isInternalStaff(user);
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = offeringImageUrl(
    offering.product?.image_url,
    offering.media?.primary_image,
    offering.image
  );

  const sellingPrice = offering.pricing?.selling_price ?? 0;
  const costPrice = offering.pricing?.cost_price ?? offering.pricing?.cost ?? 0;
  
  // Calculate margin dynamically if missing from DB: ((selling - cost) / selling) * 100
  let margin: number | null = null;
  if (
    offering.pricing?.margin_percentage != null &&
    !isNaN(Number(offering.pricing.margin_percentage)) &&
    Number(offering.pricing.margin_percentage) !== 0
  ) {
    margin = Number(offering.pricing.margin_percentage);
  } else if (sellingPrice > 0 && costPrice > 0) {
    margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
  }

  const currentStock = offering.inventory?.current_stock ?? 0;
  const subCategoryTitle =
    offering.subCategoryName ||
    offering.subcategory ||
    offering.description ||
    (offering.product?.category ? `${offering.product.category} Collection` : 'Catalog Item');

  const handleRowClick = () => {
    const targetId = offering.prodId || '1';
    router.push(`/offerings/single_offering?id=${targetId}`);
  };

  return (
    <tr
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
      tabIndex={0}
      role="button"
      className="border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer transition-colors group focus:outline-none focus:bg-gray-50"
    >
      {/* 1. OFFERING NAME with Avatar Badge & Subtitle */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar Initial Box (w-9 h-9 black rounded-lg matching UI) */}
          <div className="w-9 h-9 rounded-lg bg-gray-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 tracking-wider shadow-xs overflow-hidden relative">
            {imageUrl && !imageFailed ? (
              <Image
                src={imageUrl}
                alt={offering.offering_name}
                width={36}
                height={36}
                className="w-full h-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              getInitials(offering.offering_name)
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 group-hover:text-black transition-colors truncate">
              {offering.offering_name}
            </div>
            <div className="text-xs text-gray-500 font-normal truncate mt-0.5">
              {subCategoryTitle}
            </div>
          </div>
        </div>
      </td>

      {/* 2. SKU */}
      <td className="px-6 py-4">
        <div className="text-xs font-mono text-gray-500 tracking-wide">
          {offering.sku_id || 'N/A'}
        </div>
      </td>

      {/* 3. CATEGORY */}
      <td className="px-6 py-4">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          {offering.product?.category || offering.category || 'GENERAL'}
        </div>
      </td>

      {/* 4. TYPE */}
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {offering.offering_type?.toLowerCase() || 'product'}
        </span>
      </td>

      {/* 5. PRICE & COST (In Rupees Only) */}
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-bold text-gray-900">
            ₹{sellingPrice.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          {costPrice > 0 && (
            <div className="text-xs text-gray-500 mt-0.5">
              Cost: ₹{costPrice.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
        </div>
      </td>

      {/* 6. MARGIN */}
      <td className="px-6 py-4">
        <div className="text-sm font-bold text-emerald-600">
          {margin !== null ? `${margin.toFixed(1)}%` : '—'}
        </div>
      </td>

      {/* 7. STOCK */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
          <span>{currentStock} In Stock</span>
        </div>
      </td>

      {/* 8. STATUS */}
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200">
          {offering.status || 'ACTIVE'}
        </span>
      </td>

      {/* 9. UPDATED */}
      <td className="px-6 py-4">
        <div className="text-xs text-gray-500 font-normal">
          Just now
        </div>
      </td>

      {!hideActions && (
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const params = new URLSearchParams({
              addToCart: 'true',
              prodId: offering.prodId?.toString() || '',
              offeringName: offering.offering_name || '',
              price: offering.pricing?.selling_price?.toString() || '0',
              cost: offering.pricing?.cost_price?.toString() || '0',
              category: offering.product?.category || offering.category || 'GENERAL',
              skuId: offering.sku_id || '',
              image: offering.media?.primary_image || '',
            });
            
            window.location.href = `/quote-engine?${params.toString()}`;
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="Add to Quote Engine"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Quote
        </button>
        <button
          type="button"
          onClick={() => router.push(`/offerings/CreateOfferings?id=${offering.prodId || ''}`)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"
        >
          Update
        </button>
        </div>
      </td>
      )}
    </tr>
  );
}
