'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OfferingResponse } from '@/lib/types/offerings/offering.types';

function openQuote(offering: OfferingResponse) {
  const params = new URLSearchParams({
    addToCart: 'true',
    prodId: offering.prodId?.toString() || '',
    offeringName: offering.offering_name || '',
    price: offering.pricing?.selling_price?.toString() || '0',
    cost: offering.pricing?.cost_price?.toString() || '0',
    category: offering.product?.category || offering.category || 'GENERAL',
    skuId: offering.sku_id || '',
    image: offering.media?.primary_image || offering.product?.image_url || '',
  });
  window.location.href = `/quote-engine?${params.toString()}`;
}

export default function OfferingActionsMenu({
  offering,
  align = 'right',
}: {
  offering: OfferingResponse;
  align?: 'left' | 'right';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Open offering actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              openQuote(offering);
            }}
          >
            Quote
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              router.push(`/offerings/CreateOfferings?id=${offering.prodId || ''}`);
            }}
          >
            Update
          </button>
        </div>
      )}
    </div>
  );
}
