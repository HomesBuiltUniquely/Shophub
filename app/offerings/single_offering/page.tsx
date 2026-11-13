'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StoreProvider from '@/components/providers/StoreProvider';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import OfferingDetailView from '@/components/offerings/detail/OfferingDetailView';
import { useSingleOffering } from '@/lib/hooks/useSingleOffering';

function SingleOfferingLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-black rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Loading offering details...
      </p>
    </div>
  );
}

function SingleOfferingContent() {
  const searchParams = useSearchParams();
  const prodId = searchParams.get('id') || '1';

  const {
    product,
    primaryCategory,
    secondaryCategories,
    currentSecondaryCategory,
    isLoading,
    error,
    refetch,
  } = useSingleOffering(prodId);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <Sidebar />
      <TopHeader
        title="ERP Offerings"
        searchQuery=""
        onSearchChange={() => {}}
      />

      <main className="lg:ml-56 pt-20 px-6 sm:px-8">
        {isLoading && !product ? (
          <SingleOfferingLoader />
        ) : (
          <OfferingDetailView
            product={product}
            primaryCategory={primaryCategory}
            secondaryCategories={secondaryCategories}
            currentSecondaryCategory={currentSecondaryCategory}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            fallbackProdId={prodId}
          />
        )}
      </main>
    </div>
  );
}

export default function SingleOfferingPage() {
  return (
    <StoreProvider>
      <Suspense fallback={<SingleOfferingLoader />}>
        <SingleOfferingContent />
      </Suspense>
    </StoreProvider>
  );
}
