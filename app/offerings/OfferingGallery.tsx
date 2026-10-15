'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { OfferingResponse } from '@/lib/types/offerings/offering.types';
import { isInternalStaff } from '@/lib/auth/session';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { offeringImageUrl } from '@/lib/media/offering-image';

function getInitials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (name.slice(0, 2) || 'PR').toUpperCase();
}

function formatPrice(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function OfferingThumb({
  offering,
  className,
}: {
  offering: OfferingResponse;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = offeringImageUrl(
    offering.product?.image_url,
    offering.media?.primary_image,
    offering.image
  );

  return (
    <div className={`${className} bg-gray-900 text-white font-bold flex items-center justify-center overflow-hidden relative`}>
      {imageUrl && !failed ? (
        <Image
          src={imageUrl}
          alt={offering.offering_name}
          fill
          className="object-cover"
          sizes="240px"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="tracking-wider">{getInitials(offering.offering_name)}</span>
      )}
    </div>
  );
}

function openQuote(offering: OfferingResponse) {
  const params = new URLSearchParams({
    addToCart: 'true',
    prodId: offering.prodId?.toString() || '',
    offeringName: offering.offering_name || '',
    price: offering.pricing?.selling_price?.toString() || '0',
    cost: offering.pricing?.cost_price?.toString() || '0',
    category: offering.product?.category || offering.category || 'GENERAL',
    skuId: offering.sku_id || '',
    image: offering.product?.image_url || offering.media?.primary_image || '',
  });
  window.location.href = `/quote-engine?${params.toString()}`;
}

export function OfferingGrid({ offerings }: { offerings: OfferingResponse[] }) {
  const router = useRouter();
  const hideActions = isInternalStaff(useCurrentUser());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {offerings.map((offering) => {
        const price = offering.pricing?.selling_price ?? 0;
        const stock = offering.inventory?.current_stock ?? 0;
        return (
          <div
            key={offering.prodId}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/offerings/single_offering?id=${offering.prodId || '1'}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/offerings/single_offering?id=${offering.prodId || '1'}`);
              }
            }}
            className="text-left bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <OfferingThumb offering={offering} className="h-40 w-full text-lg" />
            <div className="p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {offering.product?.category || offering.category || 'GENERAL'}
              </p>
              <h3 className="text-sm font-bold text-gray-900 truncate">{offering.offering_name}</h3>
              <p className="text-xs font-mono text-gray-500">{offering.sku_id || 'N/A'}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-extrabold text-gray-950">{formatPrice(price)}</span>
                <span className="text-xs font-medium text-emerald-700">{stock} in stock</span>
              </div>
              {!hideActions && (
              <div
                className="flex gap-2 pt-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => openQuote(offering)}
                  className="flex-1 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
                >
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/offerings/CreateOfferings?id=${offering.prodId || ''}`)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  Update
                </button>
              </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OfferingMatrix({ offerings }: { offerings: OfferingResponse[] }) {
  const router = useRouter();
  const groups = useMemo(() => {
    const map = new Map<string, OfferingResponse[]>();
    offerings.forEach((offering) => {
      const key = String(offering.product?.category || offering.category || 'GENERAL').toUpperCase();
      const list = map.get(key) || [];
      list.push(offering);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [offerings]);

  return (
    <div className="space-y-6">
      {groups.map(([category, items]) => (
        <section key={category} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((offering) => (
              <button
                key={offering.prodId}
                type="button"
                onClick={() => router.push(`/offerings/single_offering?id=${offering.prodId || '1'}`)}
                className="rounded-lg border border-gray-200 p-2 hover:border-gray-400 hover:bg-gray-50 text-left transition-colors"
                title={offering.offering_name}
              >
                <OfferingThumb offering={offering} className="h-20 w-full rounded-md text-xs mb-2" />
                <p className="text-[11px] font-bold text-gray-900 truncate">{offering.offering_name}</p>
                <p className="text-[10px] font-semibold text-gray-600 mt-0.5">
                  {formatPrice(offering.pricing?.selling_price ?? 0)}
                </p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
