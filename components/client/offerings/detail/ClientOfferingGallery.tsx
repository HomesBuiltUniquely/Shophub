'use client';

import React, { useState } from 'react';

interface ClientOfferingGalleryProps {
  primaryImage?: string;
  galleryImages?: string[];
  productName: string;
  category?: string;
}

export default function ClientOfferingGallery({
  primaryImage,
  galleryImages = [],
  productName,
  category = 'Catalog',
}: ClientOfferingGalleryProps) {
  // Consolidate images into a unified list
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (primaryImage && !primaryImage.includes('example.com')) {
      list.push(primaryImage);
    }
    galleryImages.forEach((img) => {
      if (img && !img.includes('example.com') && !list.includes(img)) {
        list.push(img);
      }
    });

    // If no valid image found, supply sample furniture render images for a velvet sofa
    if (list.length === 0) {
      list.push(
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80'
      );
    }
    return list;
  }, [primaryImage, galleryImages]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  const activeImage = allImages[selectedIndex] || allImages[0];

  return (
    <div className="space-y-4">
      {/* Main Image Showcase Card */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-black/[0.04] p-5 sm:p-7 shadow-sm overflow-hidden relative group">
        {/* Floating Badges */}
        <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-gray-800 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full shadow-2xs border border-gray-100">
            {category}
          </span>
          <span className="px-3 py-1 bg-[#65783A] text-white text-[10.5px] font-bold rounded-full shadow-2xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Verified Spec
          </span>
        </div>

        {/* Zoom Action Button */}
        <button
          type="button"
          onClick={() => setIsZoomed(!isZoomed)}
          title="Toggle Zoom Preview"
          className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-black flex items-center justify-center shadow-xs border border-gray-200/80 transition-all cursor-pointer opacity-90 group-hover:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>

        {/* Product Display Frame */}
        <div className="h-[360px] sm:h-[460px] w-full rounded-2xl bg-[#F6F3EE] flex items-center justify-center overflow-hidden relative">
          {!imgError && activeImage ? (
            <img
              src={activeImage}
              alt={productName}
              onError={() => setImgError(true)}
              className={`max-h-full max-w-full object-contain transition-transform duration-500 cursor-zoom-in ${
                isZoomed ? 'scale-125' : 'group-hover:scale-[1.03]'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 rounded-2xl bg-gray-900 text-white font-black text-2xl flex items-center justify-center shadow-md mb-3">
                {productName.slice(0, 2).toUpperCase()}
              </div>
              <h4 className="text-base font-bold text-gray-900">{productName}</h4>
              <p className="text-xs text-gray-500 mt-1">High-Definition Catalog View</p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails Strip (Matching PDF & Multi-angle views) */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {allImages.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedIndex(idx);
                  setIsZoomed(false);
                }}
                className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-white border transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-gray-950 ring-2 ring-gray-950/20 shadow-sm scale-102'
                    : 'border-gray-200/80 hover:border-gray-400 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="w-full h-full rounded-xl bg-[#F6F3EE] flex items-center justify-center overflow-hidden">
                  <img
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
            );
          })}

          <div className="text-[11px] font-semibold text-gray-500 pl-2 whitespace-nowrap">
            {allImages.length} Renders Available
          </div>
        </div>
      )}
    </div>
  );
}
