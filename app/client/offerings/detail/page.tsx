'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import StoreProvider from '@/components/providers/StoreProvider';
import { ClientDashboardProvider } from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';

import ClientOfferingGallery from '@/components/client/offerings/detail/ClientOfferingGallery';
import ClientOfferingOverview from '@/components/client/offerings/detail/ClientOfferingOverview';
import ClientOfferingPricingActions from '@/components/client/offerings/detail/ClientOfferingPricingActions';
import ClientOfferingSpecsTabs from '@/components/client/offerings/detail/ClientOfferingSpecsTabs';
import DraftDrawer from '@/components/client/offerings/detail/DraftDrawer';

import { useSingleOffering } from '@/lib/hooks/useSingleOffering';

function ClientOfferingDetailLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-black rounded-full animate-spin" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Loading offering details...
      </p>
    </div>
  );
}

function ClientOfferingDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prodId = searchParams.get('id') || '1';

  const {
    product,
    primaryCategory,
    isLoading,
    error,
    refetch,
  } = useSingleOffering(prodId);

  // Client interactive state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerRefreshKey, setDrawerRefreshKey] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Product field extraction
  const offeringName = product?.offering_name || 'Modern Luxury Velvet Sofa';
  const categoryName = product?.category || primaryCategory?.primaryCategoryName || 'FURNITURE';
  const subcategory =
    (product as any)?.subCategoryName ||
    (product as any)?.subcategory ||
    (product?.tags && product.tags.length > 0 ? product.tags[0].toUpperCase() : 'CHAIR');
  const brand = product?.brand || 'HOMES & MERRY';
  const sku = product?.sku_id || 'SKU-CHAIR-010';
  const price = product?.pricing?.selling_price ?? 1500;
  const discount = product?.pricing?.discount ?? 0;
  const gstRate = product?.pricing?.gst_rate ?? '18';
  const units = product?.pricing?.units ?? 'PER_PIECE';
  const shortDesc = product?.short_desc || 'High quality ergonomic velvet sofa with resilient dual-density core.';
  const longDesc = product?.long_desc;
  const tags = product?.tags || ['Velvet Sofa', 'Luxury Furniture', 'Living Room Sofa'];
  const keywords = product?.seo?.keywords || [];

  // Specs
  const specs = product?.specifications;
  const primaryMaterial = specs?.material_finish?.primary_material || 'Premium Velvet Upholstery';
  const secondaryMaterial = specs?.material_finish?.secondary_material || 'Kiln-Dried Hardwood Frame';
  const frameFinish = specs?.material_finish?.finish_type || 'Natural Walnut Tapered Legs';
  const dimensions = specs?.physical_dimensions
    ? `${specs.physical_dimensions.length} cm (L) × ${specs.physical_dimensions.width} cm (W) × ${specs.physical_dimensions.height} cm (H)`
    : '210 cm (L) × 88 cm (W) × 82 cm (H)';
  const weight = specs?.physical_dimensions?.weight
    ? `${specs.physical_dimensions.weight} kg`
    : '48 kg';
  const weightCapacity = specs?.technical_properties?.load_capacity || '320 kg';
  const assemblyRequired = specs?.technical_properties?.assembly_required !== undefined
    ? (specs.technical_properties.assembly_required ? 'Yes' : 'No')
    : 'No';
  const cushionDesc = specs?.technical_properties?.desc;

  const handleAddToQuote = ({
    quantity: qty,
    room,
    designerNote,
  }: {
    quantity: number;
    room: string;
    designerNote: string;
  }) => {
    setCartCount((prev) => prev + qty);
    // Bump the key so the drawer re-reads localStorage
    setDrawerRefreshKey((k) => k + 1);
  };

  const handleToggleWishlist = () => {
    setIsWishlisted((prev) => {
      const next = !prev;
      showToast(next ? `Saved "${offeringName}" to your Wishlist!` : `Removed from Wishlist`);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      {/* Slide-In Draft Drawer */}
      <DraftDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        refreshKey={drawerRefreshKey}
      />

      {/* Client Sidebar */}
      <ClientSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader
          pageTitle="Offerings"
          searchPlaceholder="Search catalog & finishes..."
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-gray-950 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-3 duration-200">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <nav className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Link href="/client/offerings" className="hover:text-black transition-colors">
                Catalog
              </Link>
              <span>›</span>
              <span className="text-gray-600">{categoryName}</span>
              <span>›</span>
              <span className="font-bold text-gray-950 truncate max-w-xs">{offeringName}</span>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/client/offerings"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF7F2] text-gray-800 text-xs font-bold border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Catalog</span>
              </Link>

              {/* Share Quote / Offering */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Offering link copied to clipboard!');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF7F2] text-gray-800 text-xs font-bold border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>

          {isLoading && !product ? (
            <ClientOfferingDetailLoader />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* Left Column (7 of 12 cols): Showcase Gallery & Specs Tabs */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Interactive Image Gallery */}
                <ClientOfferingGallery
                  primaryImage={product?.media?.primary_image}
                  galleryImages={product?.media?.gallery_images || []}
                  productName={offeringName}
                  category={categoryName}
                />

                {/* 2. Specs & Care Tabs */}
                <ClientOfferingSpecsTabs
                  description={longDesc}
                  dimensions={dimensions}
                  weight={weight}
                  weightCapacity={weightCapacity}
                  assemblyRequired={assemblyRequired}
                  primaryMaterial={primaryMaterial}
                  secondaryMaterial={secondaryMaterial}
                  frameFinish={frameFinish}
                  cushionDesc={cushionDesc}
                />
              </div>

              {/* Right Column (5 of 12 cols): Overview, Pricing, Actions & Policies */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. Product Overview Card */}
                <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-black/[0.04] shadow-sm">
                  <ClientOfferingOverview
                    offeringName={offeringName}
                    category={categoryName}
                    subcategory={subcategory}
                    brand={brand}
                    sku={sku}
                    shortDesc={shortDesc}
                    tags={tags}
                    keywords={keywords}
                  />
                </div>

                {/* 2. Pricing & E-Commerce Actions (Add to Cart, Wishlist, Pincode) */}
                <ClientOfferingPricingActions
                  price={price}
                  discount={discount}
                  gstRate={gstRate}
                  units={units}
                  offeringName={offeringName}
                  sku={sku}
                  onAddToQuote={handleAddToQuote}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={isWishlisted}
                  onOpenDraftDrawer={() => setIsDrawerOpen(true)}
                />
              </div>
            </div>
          )}
        </main>

        <ClientFooter />
        <ContactRmModal />
        <FloatingSupportChat />
      </div>
    </div>
  );
}

export default function ClientOfferingDetailPage() {
  return (
    <StoreProvider>
      <ClientDashboardProvider>
        <Suspense fallback={<ClientOfferingDetailLoader />}>
          <ClientOfferingDetailContent />
        </Suspense>
      </ClientDashboardProvider>
    </StoreProvider>
  );
}
