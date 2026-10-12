'use client';

import { useRouter } from 'next/navigation';
import OfferingDetailHeader from './OfferingDetailHeader';
import OfferingImageGallery from './OfferingImageGallery';
import OfferingPricingSummary from './OfferingPricingSummary';
import TechnicalSpecsCard from './TechnicalSpecsCard';
import InventorySourcingCard from './InventorySourcingCard';
import InternalNotesCard from './InternalNotesCard';
import ActivityTimelineCard from './ActivityTimelineCard';
import QuotationHistoryCard from './QuotationHistoryCard';
import { Offering } from '@/lib/types';
import { ProdDataResDTO } from '@/lib/types/dto.types';
import { PrimaryCategory, SecondaryCategory } from '@/lib/types/api.types';

interface OfferingDetailViewProps {
  offering?: Offering | null;
  product?: ProdDataResDTO | null;
  primaryCategory?: PrimaryCategory | null;
  secondaryCategories?: SecondaryCategory[];
  currentSecondaryCategory?: SecondaryCategory | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  fallbackProdId?: string | number;
}

export default function OfferingDetailView({
  offering,
  product,
  primaryCategory,
  secondaryCategories = [],
  currentSecondaryCategory,
  isLoading = false,
  error,
  onRefresh,
  fallbackProdId,
}: OfferingDetailViewProps) {
  const router = useRouter();
  const prodId = (product as any)?.prodId || (product as any)?.productId || offering?.id || fallbackProdId;
  // Extract core product info
  const offeringName =
    product?.offering_name ||
    offering?.name ||
    '—';

  const categoryName =
    product?.category ||
    primaryCategory?.primaryCategoryName ||
    offering?.category ||
    '—';

  const subcategory =
    (product as any)?.subCategoryName ||
    (product as any)?.subcategory ||
    (product?.tags && product.tags.length > 0 ? product.tags[0].toUpperCase() : '');

  const status =
    product?.internal?.visibility_status?.publishing_status ||
    offering?.status ||
    'ACTIVE';

  const sku = product?.sku_id || offering?.sku || '—';
  const price = product?.pricing?.selling_price ?? 0;
  const costPrice = product?.pricing?.cost_price ?? 0;
  const discount = product?.pricing?.discount ?? 0;
  const gstRate = product?.pricing?.gst_rate ?? 'GST_18';
  const units = product?.pricing?.units ?? 'PER_PIECE';
  const pricingDesc = product?.pricing?.desc ?? '';

  const brand = product?.brand || offering?.brand || '';
  const tags = product?.tags || [];
  const seoKeywords =
    product?.seo?.keywords && product.seo.keywords.length > 0
      ? product.seo.keywords
      : tags;
  const shortDesc = product?.short_desc;
  const longDesc = product?.long_desc;

  // Inventory fields
  const inventory = product?.inventory;
  const currentStock = inventory?.current_stock ?? 0;
  const minimumStockLevel = inventory?.minimum_stock_level ?? 0;
  const reorderQuantity = inventory?.reorder_quantity ?? 0;
  const barcode = inventory?.barcode ?? '';
  const vendor = inventory?.sourcingLogistics?.preferred_vendor || '—';
  const leadTime = inventory?.sourcingLogistics?.lead_time ?? 0;

  // Specifications
  const specs = product?.specifications;
  const primaryMaterial = specs?.material_finish?.primary_material || '—';
  const secondaryMaterial = specs?.material_finish?.secondary_material || '—';
  const frameFinish = specs?.material_finish?.finish_type || '—';
  const dimensions = specs?.physical_dimensions
    ? `${specs.physical_dimensions.length} cm (L) × ${specs.physical_dimensions.width} cm (W) × ${specs.physical_dimensions.height} cm (H)`
    : '—';
  const weight = specs?.physical_dimensions?.weight
    ? `${specs.physical_dimensions.weight} kg`
    : '—';
  const weightCapacity = specs?.technical_properties?.load_capacity || '—';
  const assemblyRequired = specs?.technical_properties?.assembly_required !== undefined
    ? (specs.technical_properties.assembly_required ? 'Yes' : 'No')
    : '—';
  const cushionDesc = specs?.technical_properties?.desc || '—';
  const additionalAttributes = specs?.additional_attributes || [];

  // Internal Audit & Systems
  const internal = product?.internal;
  const auditDesc = internal?.audit_trail_notes?.desc || '—';
  const accountingCode =
    internal?.system_hooks_integration?.erp_module_integration?.accounting_code ||
    sku ||
    '—';
  const allowedUsers = internal?.access_permissions?.allowed_users || [];
  const scheduleLaunch = internal?.visibility_status?.schedule_launch || '—';
  const isVerified = internal?.visibility_status?.visibility ?? true;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Error notification if API failed */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">Offline / Fallback:</span>
            <span>{error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="underline font-semibold hover:text-amber-900 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Top Breadcrumb & Header Action */}
      <OfferingDetailHeader
        offeringName={offeringName}
        categoryName={categoryName}
        status={status}
        prodId={product?.prodId || (product as any)?.prod_id || offering?.id || '1'}
        onEdit={() => {
          if (prodId) router.push(`/offerings/CreateOfferings?id=${prodId}`);
        }}
      />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Approx 60% width on desktop) */}
        <div className="lg:col-span-7 space-y-6 ">
          {/* 1. Hero Image & Thumbnail Gallery */}
          <OfferingImageGallery
            primaryImage={product?.media?.primary_image || offering?.image}
            galleryImages={product?.media?.gallery_images || []}
            productName={offeringName}
            category={categoryName}
          />

          {/* 2. Technical Specifications Card */}
          <TechnicalSpecsCard
            primaryMaterial={primaryMaterial}
            secondaryMaterial={secondaryMaterial}
            frameFinish={frameFinish}
            dimensions={dimensions}
            weight={weight}
            weightCapacity={weightCapacity}
            assemblyRequired={assemblyRequired}
            cushionDesc={cushionDesc}
            additionalAttributes={additionalAttributes}
            brand={brand}
          />

          {/* 3. Inventory & Sourcing Card */}
          <InventorySourcingCard
            currentStock={currentStock}
            minimumStockLevel={minimumStockLevel}
            reorderQuantity={reorderQuantity}
            barcode={barcode}
            skuId={sku}
            preferredVendor={vendor}
            leadTime={leadTime}
          />

          {/* 4. Quotation Usage History Card */}
          <QuotationHistoryCard skuId={sku} />
        </div>

        {/* Right Column (Approx 40% width on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 5. Product Header, Pricing & Classification */}
          <OfferingPricingSummary
            offeringName={offeringName}
            category={String(categoryName).toUpperCase()}
            subcategory={subcategory}
            sku={sku}
            batchNumber={accountingCode}
            upc={barcode}
            price={price}
            costPrice={costPrice}
            discount={discount}
            gstRate={gstRate}
            units={units}
            shortDesc={shortDesc}
            longDesc={longDesc}
            brand={brand}
            tags={tags}
            keywords={seoKeywords}
            isVerified={isVerified}
          />

          {/* 6. Internal Notes Card */}
          <InternalNotesCard
            auditTrailDesc={auditDesc}
            accountingCode={accountingCode}
            allowedUsers={allowedUsers}
            scheduleLaunch={scheduleLaunch}
          />

          {/* 7. Activity Timeline Card */}
          <ActivityTimelineCard
            sellingPrice={price}
            costPrice={costPrice}
            pricingDesc={pricingDesc}
            currentStock={currentStock}
            vendor={vendor}
            leadTime={leadTime}
            auditDesc={auditDesc}
            publishingStatus={status}
            scheduleLaunch={scheduleLaunch}
          />
        </div>
      </div>
    </div>
  );
}
