'use client';

import React, { useState } from 'react';

interface AddBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandCreated: () => void;
}

export default function AddBrandModal({ isOpen, onClose, onBrandCreated }: AddBrandModalProps) {

  const [brandName, setBrandName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('Italy');
  const [offeringsCount, setOfferingsCount] = useState(150);
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['FURNITURE', 'LIGHTING']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableCategories = ['FURNITURE', 'LIGHTING', 'DECOR', 'BEDDING', 'STORAGE', 'KITCHEN', 'OUTDOOR'];

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
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

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName,
          manufacturer: manufacturer || `${brandName} Global Group`,
          code: code.toUpperCase(),
          country,
          country_code: country === 'Italy' ? 'IT' : country === 'Sweden' ? 'SE' : country === 'Spain' ? 'ES' : country === 'Germany' ? 'DE' : 'IN',
          offerings_count: offeringsCount,
          categories: selectedCategories,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create brand');
      }

      onBrandCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-black text-gray-950 tracking-tight">Add New Brand</h2>
            <p className="text-xs text-gray-500 mt-0.5">Register a manufacturer brand in the Master Catalog.</p>
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
                onChange={(e) => setStatus(e.target.value as any)}
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
                      isSelected
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
