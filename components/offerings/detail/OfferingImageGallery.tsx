'use client';

import { useMemo, useState } from 'react';

interface OfferingImageGalleryProps {
  primaryImage?: string;
  galleryImages?: string[] | string;
  productName: string;
  category?: string;
}

function isUsableImage(url?: string): url is string {
  return Boolean(url && url.trim() && !url.includes('example.com'));
}

function normalizeGalleryImages(raw?: string[] | string): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter(isUsableImage);
  }

  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(isUsableImage) : [];
    } catch {
      return [];
    }
  }

  return isUsableImage(trimmed) ? [trimmed] : [];
}

export default function OfferingImageGallery({
  primaryImage,
  galleryImages = [],
  productName,
  category = '—',
}: OfferingImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const slides = useMemo(() => {
    const images: string[] = [];
    if (isUsableImage(primaryImage)) {
      images.push(primaryImage);
    }
    images.push(...normalizeGalleryImages(galleryImages));
    return images;
  }, [primaryImage, galleryImages]);

  const extraGalleryCount = Math.max(slides.length - (isUsableImage(primaryImage) ? 1 : 0), 0);
  const safeIndex = slides.length === 0 ? 0 : Math.min(selectedIndex, slides.length - 1);
  const selectedSrc = slides[safeIndex];

  const initials = productName
    ? productName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'PR';

  const selectSlide = (index: number) => {
    setSelectedIndex(index);
    setHasError(false);
  };

  return (
    <div className="space-y-4">
      {/* Large Hero Showcase Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex items-center justify-center p-4 sm:p-6 2xl:pl-10 2xl:pr-10 2xl:pt-10 2xl:pb-10 w-full max-w-full 2xl:w-[600px] h-[240px] sm:h-[340px] lg:h-[410px] 2xl:h-[520px] relative groups">
        {!hasError && selectedSrc ? (
          <img
            src={selectedSrc}
            alt={productName}
            onError={() => setHasError(true)}
            className="max-h-full max-w-full 2xl:w-[600px] transition-all duration-300 group-hover:scale-105 rounded-xl"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-radial from-gray-50 to-white rounded-xl border border-gray-100">
            <div className="w-30 h-24 rounded-2xl bg-gray-900 text-white font-black text-3xl flex items-center justify-center tracking-wider shadow-lg mb-4">
              {initials}
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-gray-100 text-gray-700 mb-2">
              {category}
            </span>

            <h3 className="text-lg font-bold text-gray-900 max-w-sm">
              {productName}
            </h3>

            <p className="text-xs text-gray-400 mt-1 font-medium">
              Verified Product Catalog Image
            </p>
          </div>
        )}
      </div>

      {slides.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {slides.map((src, index) => {
            const isSelected = index === safeIndex;
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => selectSlide(index)}
                aria-label={`View image ${index + 1} of ${productName}`}
                aria-pressed={isSelected}
                className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border bg-white transition-all ${
                  isSelected
                    ? 'border-gray-900 ring-2 ring-gray-900/10 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Gallery Indicator Bar */}
      <div className="flex items-center gap-3">
        <div className="px-3.5 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 flex items-center gap-2 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{safeIndex === 0 ? 'Primary Catalog View' : `Gallery View ${safeIndex}`}</span>
        </div>

        {extraGalleryCount > 0 && (
          <div className="px-3.5 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium text-gray-500">
            {extraGalleryCount} Additional Render{extraGalleryCount > 1 ? 's' : ''} Attached
          </div>
        )}
      </div>
    </div>
  );
}
