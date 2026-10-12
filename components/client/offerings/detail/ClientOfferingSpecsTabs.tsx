'use client';

import React, { useState } from 'react';

interface ClientOfferingSpecsTabsProps {
  description?: string;
  dimensions?: string;
  weight?: string;
  weightCapacity?: string;
  assemblyRequired?: string;
  primaryMaterial?: string;
  secondaryMaterial?: string;
  frameFinish?: string;
  cushionDesc?: string;
}

export default function ClientOfferingSpecsTabs({
  description,
  dimensions = '210 cm (L) × 88 cm (W) × 82 cm (H)',
  weight = '48 kg',
  weightCapacity = '320 kg',
  assemblyRequired = 'Free White-Glove Installation Included',
  primaryMaterial = 'Premium Velvet Upholstery',
  secondaryMaterial = 'Kiln-Dried Hardwood Frame',
  frameFinish = 'Natural Walnut Tapered Legs',
  cushionDesc = 'High-Resilience Multi-Density Foam with pocket springs',
}: ClientOfferingSpecsTabsProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'specs' | 'care'>('about');

  return (
    <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-black/[0.04] shadow-sm">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'about'
              ? 'bg-black text-white shadow-2xs'
              : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-gray-700'
          }`}
        >
          About This Offering
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'specs'
              ? 'bg-black text-white shadow-2xs'
              : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-gray-700'
          }`}
        >
          Specifications & Dimensions
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('care')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'care'
              ? 'bg-black text-white shadow-2xs'
              : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-gray-700'
          }`}
        >
          Care & Maintenance
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="pt-6">
        {/* Tab 1: About This Offering */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-950 mb-2">
                OVERVIEW
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                {description ||
                  'The Modern Luxury Velvet Sofa delivers the ideal balance of plush luxury and enduring durability. Crafted with premium high-grade velvet upholstery over a reinforced kiln-dried hardwood frame, this piece provides exceptional ergonomic lumbar support and a sleek modern silhouette designed for contemporary living environments.'}
              </p>
            </div>

            {/* Design Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#FAF7F2]/80 border border-black/[0.03]">
                <div className="text-xs font-bold text-gray-950 mb-1">Tailored Comfort</div>
                <div className="text-xs text-gray-600">
                  Dual-density foam cushioning with pocket spring core for long-lasting shape retention.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2]/80 border border-black/[0.03]">
                <div className="text-xs font-bold text-gray-950 mb-1">Durable Performance</div>
                <div className="text-xs text-gray-600">
                  Stain-resistant, colorfast velvet tested for high-traffic residential and commercial use.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Specifications & Dimensions */}
        {activeTab === 'specs' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-950 mb-2">
              TECHNICAL SPECIFICATIONS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-gray-100">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                  Overall Dimensions
                </div>
                <div className="text-xs font-bold text-gray-950 mt-0.5">{dimensions}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-gray-100">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                  Primary Material
                </div>
                <div className="text-xs font-bold text-gray-950 mt-0.5">{primaryMaterial}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-gray-100">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                  Structure & Legs
                </div>
                <div className="text-xs font-bold text-gray-950 mt-0.5">
                  {secondaryMaterial} • {frameFinish}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-gray-100">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                  Weight & Load Capacity
                </div>
                <div className="text-xs font-bold text-gray-950 mt-0.5">
                  {weight} (Supports up to {weightCapacity})
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-gray-100 sm:col-span-2">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                  Assembly & Placement
                </div>
                <div className="text-xs font-bold text-gray-950 mt-0.5">
                  {assemblyRequired === 'No' || assemblyRequired === '—'
                    ? 'Fully assembled. White-glove placement included.'
                    : 'Complimentary assembly & placement completed by HubInterior specialists.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Care & Maintenance */}
        {activeTab === 'care' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-950 mb-2">
              CARE & CLEANING GUIDE
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2]/80 border border-black/[0.03]">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-gray-800 shrink-0 shadow-2xs">
                  1
                </span>
                <div>
                  <div className="text-xs font-bold text-gray-950">Regular Dusting & Vacuuming</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Use a soft brush attachment on your vacuum cleaner once every 2 weeks to maintain fabric nap.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2]/80 border border-black/[0.03]">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-gray-800 shrink-0 shadow-2xs">
                  2
                </span>
                <div>
                  <div className="text-xs font-bold text-gray-950">Spills & Spot Treatment</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Blot liquid spills immediately using a clean, dry microfiber cloth. Do not rub aggressively.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2]/80 border border-black/[0.03]">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-gray-800 shrink-0 shadow-2xs">
                  3
                </span>
                <div>
                  <div className="text-xs font-bold text-gray-950">Sunlight Exposure</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Position away from direct, harsh sunlight to preserve the richness of the velvet dyes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
