'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrandEntity } from '@/lib/db/homesmerry';

interface AddBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandCreated: () => void;
  brand?: BrandEntity | null;
}

const COUNTRY_CODES: Record<string, string> = {
  Italy: 'IT',
  Sweden: 'SE',
  Spain: 'ES',
  Germany: 'DE',
  India: 'IN',
  Denmark: 'DK',
  Japan: 'JP',
  Switzerland: 'CH',
};

const availableCategories = ['FURNITURE', 'LIGHTING', 'DECOR', 'BEDDING', 'STORAGE', 'KITCHEN', 'OUTDOOR'];

async function uploadBrandLogo(file: File) {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', 'brands');
  const res = await fetch('/api/uploads', { method: 'POST', body, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not upload brand image.');
  if (!data.url) throw new Error('Upload succeeded but no image URL was returned.');
  return String(data.url);
}

export default function AddBrandModal({ isOpen, onClose, onBrandCreated, brand = null }: AddBrandModalProps) {
  const isEdit = Boolean(brand?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [brandName, setBrandName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('Italy');
  const [offeringsCount, setOfferingsCount] = useState(0);
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['FURNITURE']);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setUploadingLogo(false);
    if (brand) {
      setBrandName(brand.brand_name || '');
      setManufacturer(brand.manufacturer || '');
      setCode(brand.code || '');
      setCountry(brand.country || 'Italy');
      setOfferingsCount(Number(brand.offerings_count) || 0);
      setStatus(brand.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE');
      setSelectedCategories(Array.isArray(brand.categories) && brand.categories.length ? brand.categories : ['FURNITURE']);
      setLogoUrl(brand.logo_url && brand.logo_url !== '/brands/default.svg' ? brand.logo_url : '');
    } else {
      setBrandName('');
      setManufacturer('');
      setCode('');
      setCountry('Italy');
      setOfferingsCount(0);
      setStatus('ACTIVE');
      setSelectedCategories(['FURNITURE']);
      setLogoUrl('');
    }
  }, [isOpen, brand]);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const onPickLogo = async (file?: File | null) => {
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const url = await uploadBrandLogo(file);
      setLogoUrl(url);
    } catch (err: any) {
      setError(err.message || 'Could not upload brand image.');
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !code) {
      setError('Brand Name and Code are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      brand_name: brandName,
      manufacturer: manufacturer || `${brandName} Global Group`,
      code: code.toUpperCase(),
      country,
      country_code: COUNTRY_CODES[country] || 'IN',
      offerings_count: offeringsCount,
      categories: selectedCategories,
      status,
      logo_url: logoUrl || '/brands/default.svg',
    };

    try {
      const res = await fetch('/api/brands', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: brand?.id, ...payload } : payload),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || (isEdit ? 'Failed to update brand' : 'Failed to create brand'));
      }

      onBrandCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || (isEdit ? 'Error updating brand' : 'Error creating brand'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-black text-gray-950 tracking-tight">
              {isEdit ? 'Edit Brand' : 'Add New Brand'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit
                ? 'Update manufacturer details and brand logo.'
                : 'Register a manufacturer brand in the Master Catalog.'}
            </p>
          </div>
          <button
            type="button"
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
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Brand Image
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={logoUrl || '/brands/default.svg'}
                  alt="Brand logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/brands/default.svg';
                  }}
                />
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
                  className="hidden"
                  onChange={(e) => onPickLogo(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace image' : 'Upload image'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Remove
                  </button>
                )}
                <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, WEBP, GIF, or SVG. Max 8MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Cassina Living"
              className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Manufacturer / Group
            </label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Meda Industrial Designs"
              className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Brand Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CAS-IT-01"
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              >
                <option value="Italy">🇮🇹 Italy</option>
                <option value="Sweden">🇸🇪 Sweden</option>
                <option value="Spain">🇪🇸 Spain</option>
                <option value="Germany">🇩🇪 Germany</option>
                <option value="India">🇮🇳 India</option>
                <option value="Denmark">🇩🇰 Denmark</option>
                <option value="Japan">🇯🇵 Japan</option>
                <option value="Switzerland">🇨🇭 Switzerland</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Initial Offerings
              </label>
              <input
                type="number"
                min="0"
                value={offeringsCount}
                onChange={(e) => setOfferingsCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'DRAFT')}
                className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Categories
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
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
              disabled={isSubmitting || uploadingLogo}
              className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
