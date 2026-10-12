'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientDashboardProvider } from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  fetchCatalogOfferingsThunk,
  selectFilteredOfferings,
  selectCategoriesLoading,
  setSearchQuery,
} from '@/lib/store/slices/categoriesSlice';
import { OfferingResponse } from '@/lib/types/offerings/offering.types';

function OfferingCard({ offering }: { offering: OfferingResponse }) {
  const router = useRouter();
  const imageUrl =
    offering.product?.image_url && !offering.product.image_url.includes('example.com')
      ? offering.product.image_url
      : offering.media?.primary_image && !String(offering.media.primary_image).includes('example.com')
        ? offering.media.primary_image
        : undefined;
  const price = offering.pricing?.selling_price ?? 0;
  const category = offering.product?.category || offering.category || 'Catalog';

  return (
    <button
      type="button"
      onClick={() => router.push(`/client/offerings/detail?id=${offering.prodId || '1'}`)}
      className="text-left bg-white rounded-[24px] border border-black/[0.04] shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="h-44 bg-[#F4EFE6] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={offering.offering_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-black text-gray-400">
            {(offering.offering_name || 'PR').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 mb-1.5">
          {category}
        </div>
        <h3 className="text-base font-extrabold text-gray-950 tracking-tight line-clamp-2">
          {offering.offering_name}
        </h3>
        <p className="text-xs text-gray-500 mt-1 font-mono">{offering.sku_id || 'SKU pending'}</p>
        <div className="mt-4 text-lg font-black text-gray-950">
          ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </div>
    </button>
  );
}

function ClientOfferingsContent() {
  const dispatch = useAppDispatch();
  const offerings = useAppSelector(selectFilteredOfferings);
  const isLoading = useAppSelector(selectCategoriesLoading);

  useEffect(() => {
    dispatch(fetchCatalogOfferingsThunk());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader
          pageTitle="Offerings"
          searchPlaceholder="Search catalog..."
          onSearch={(query) => dispatch(setSearchQuery(query))}
        />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          <div className="mb-8">
            <div className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em] mb-1.5">
              Product Catalog
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Explore Offerings
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Browse the latest collections and add finishes to your project quote.
            </p>
          </div>

          {isLoading && offerings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <p className="mt-3 text-sm font-semibold text-gray-500">Loading catalog...</p>
            </div>
          )}

          {!isLoading && offerings.length === 0 && (
            <div className="bg-white rounded-[24px] border border-black/[0.04] px-8 py-16 text-center">
              <h3 className="text-base font-extrabold text-gray-950">No offerings available</h3>
              <p className="text-sm text-gray-500 mt-2">
                The catalog is empty right now. Please try again in a moment.
              </p>
            </div>
          )}

          {offerings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {offerings.map((offering) => (
                <OfferingCard key={offering.prodId || offering.sku_id} offering={offering} />
              ))}
            </div>
          )}

          <ClientFooter />
        </main>

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function ClientOfferingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <ClientOfferingsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
