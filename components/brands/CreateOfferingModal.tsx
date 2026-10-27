'use client';

/**
 * ==============================================================================
 * COMPONENT: components/brands/CreateOfferingModal.tsx
 * PURPOSE: Modal Dialog for Creating a New Catalog Offering (Product/Service/Bundle)
 * ==============================================================================
 * TRIGGERED BY:
 * - The black "+ CREATE OFFERING" button in the top navigation header (BrandsHeader).
 *
 * BACKEND & APIDOG INTEGRATION:
 * - Directly maps to Apidog's `ProductService_CreateProduct` endpoint:
 *   POST http://localhost:8080/api/v1/products/createProduct
 * - Submits via Next.js `/api/offerings`, sending pricing, inventory, specs, and SEO.
 * - Dynamic Brand Dropdown is populated with all registered master brands.
 * ==============================================================================
 */

import React, { useRef, useState } from 'react';
import { BrandEntity } from '@/lib/db/homesmerry';
import { canCreateService } from '@/lib/catalog/offering-type';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { generateSku } from '@/lib/utils/sku';

interface CreateOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: BrandEntity[];
  onOfferingCreated: () => void;
}

const STATIC_HUB_BRAND = { brand_id: 7, brand_name: 'HUB', code: 'HUB', logo_url: '/images/hub-logo.jpg' };

export default function CreateOfferingModal({

  isOpen,
  onClose,
  brands,
  onOfferingCreated,
}: CreateOfferingModalProps) {
  const user = useCurrentUser();
  const allowService = canCreateService(user);
  const [offeringName, setOfferingName] = useState('');
  const [offeringType, setOfferingType] = useState<'PRODUCT' | 'SERVICE' | 'BUNDLE'>('PRODUCT');
  const [skuId, setSkuId] = useState('');
  const [category, setCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Hub');
  const [dropdownBrands, setDropdownBrands] = useState<{ brand_id: number; brand_name: string; code?: string }[]>([
    STATIC_HUB_BRAND,
  ]);
  const [sellingPrice, setSellingPrice] = useState(19999);
  const [costPrice, setCostPrice] = useState(11000);
  const [currentStock, setCurrentStock] = useState(40);
  const [publishingStatus, setPublishingStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [shortDesc, setShortDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitInProgress = useRef(false);

  // Fetch full active brands dropdown directly from Spring Boot backend
  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/brands/dropdown')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.brands) && data.brands.length > 0) {
            const filtered = data.brands.filter(
              (b: any) => b && b.brand_name?.trim().toLowerCase() !== 'hub brand'
            );
            const existingHub = filtered.find(
              (b: any) => b.brand_name?.trim().toLowerCase() === 'hub'
            );
            const hubItem = existingHub
              ? { ...STATIC_HUB_BRAND, ...existingHub, brand_name: 'HUB' }
              : STATIC_HUB_BRAND;

            const others = filtered.filter(
              (b: any) =>
                b.brand_name?.trim().toLowerCase() !== 'hub' &&
                b.brand_id !== hubItem.brand_id
            );
            const list = [hubItem, ...others];
            setDropdownBrands(list);
            if (!selectedBrand || selectedBrand.trim().toLowerCase() === 'hub brand') {
              setSelectedBrand(list[0].brand_name);
            }
          }
        })
        .catch((err) => console.warn('Failed to fetch brand dropdown:', err));
    }
  }, [isOpen, selectedBrand]);

  if (!isOpen) return null;

  const brandOptions =
    dropdownBrands.length > 0
      ? dropdownBrands
      : [
          STATIC_HUB_BRAND,
          ...brands.map((b) => ({ brand_id: b.id, brand_name: b.brand_name, code: b.code })),
        ];

  const categories = [
    'FURNITURE',
    'LIGHTING',
    'DECOR',
    'BEDDING',
    'KITCHEN',
    'STORAGE',
    'OUTDOOR',
    'RUGS',
    'WALL_ART',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInProgress.current) return;
    if (!offeringName || !category || !skuId || !selectedBrand) {
      setError('Offering Name, Category, and Brand are required.');
      return;
    }

    submitInProgress.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offering_name: offeringName,
          offering_type: !allowService && offeringType === 'SERVICE' ? 'PRODUCT' : offeringType,
          sku_id: skuId.toUpperCase(),
          category,
          brand: selectedBrand,
          selling_price: Number(sellingPrice),
          cost_price: Number(costPrice),
          current_stock: Number(currentStock),
          short_desc: shortDesc || offeringName,
          publishing_status: publishingStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create offering');
      }

      onOfferingCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating offering');
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm font-black">
              +
            </div>
            <div>
              <h2 className="text-base font-black text-gray-950 tracking-tight">Create Catalog Offering</h2>
              <p className="text-xs text-gray-500">
                Connected to Spring Boot Apidog Endpoint: <code className="text-gray-700 font-semibold font-mono">POST /api/v1/products/createProduct</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Offering Name *
              </label>
              <input
                type="text"
                required
                value={offeringName}
                onChange={(e) => setOfferingName(e.target.value)}
                placeholder="e.g. Lumina Crystal Sconce"
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Offering Type
              </label>
              <select
                value={!allowService && offeringType === 'SERVICE' ? 'PRODUCT' : offeringType}
                onChange={(e) => setOfferingType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              >
                <option value="PRODUCT">PRODUCT</option>
                {allowService && <option value="SERVICE">SERVICE</option>}
                <option value="BUNDLE">BUNDLE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                SKU Identifier
              </label>
              <input
                type="text"
                required
                readOnly
                tabIndex={-1}
                value={skuId}
                placeholder="Select category to generate SKU"
                title={skuId ? "SKU is automatically generated and cannot be manually edited." : "Select category to generate SKU."}
                className="w-full px-3.5 py-2 bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold font-mono text-gray-800 cursor-not-allowed select-all focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  setSkuId(newCat ? generateSku({ category: newCat, offeringName, brand: selectedBrand }) : '');
                }}
                className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Brand Owner *
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              >
                {brandOptions.map((b) => (
                  <option key={b.brand_id} value={b.brand_name}>
                    {b.brand_name} {b.code ? `(${b.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="High-grade brass architectural luminaire"
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Publishing Status
              </label>
              {user?.role === 'enterprise' ? (
                <div className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
                  Requires Admin Approval
                </div>
              ) : (
                <select
                  value={publishingStatus}
                  onChange={(e) => setPublishingStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                >
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? (user?.role === 'enterprise' ? 'Submitting for Approval...' : 'Creating Offering...')
                : (user?.role === 'enterprise' ? 'Submit for Approval' : 'Create Offering')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
