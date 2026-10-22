'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface OfferingInfoButtonProps {
  offeringName: string;
  skuId?: string;
  prodId?: string | number;
  shortDesc?: string;
  longDesc?: string;
  buttonSize?: 'xs' | 'sm' | 'md';
  className?: string;
  title?: string;
}

export default function OfferingInfoButton({
  offeringName,
  skuId,
  prodId,
  shortDesc: propShortDesc,
  longDesc: propLongDesc,
  buttonSize = 'xs',
  className = '',
  title = 'View product descriptions',
}: OfferingInfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shortDesc, setShortDesc] = useState(propShortDesc || '');
  const [longDesc, setLongDesc] = useState(propLongDesc || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (propShortDesc) setShortDesc(propShortDesc);
    if (propLongDesc) setLongDesc(propLongDesc);
  }, [propShortDesc, propLongDesc]);

  // When modal opens, if either short or long description is missing and prodId or skuId exists, load full product details
  useEffect(() => {
    if (!isOpen) return;

    if ((!shortDesc || !longDesc) && (prodId || skuId)) {
      const identifier = prodId || skuId;
      setIsLoading(true);

      const resolveFromPayload = (data: any) => {
        if (!data) return false;
        const fetchedShort =
          data.short_desc ||
          data.shortDescription ||
          data.description ||
          data.desc ||
          '';
        const fetchedLong =
          data.long_desc ||
          data.longDescription ||
          data.product?.long_desc ||
          data.product?.description ||
          '';
        if (fetchedShort && !shortDesc) setShortDesc(fetchedShort);
        if (fetchedLong && !longDesc) setLongDesc(fetchedLong);
        return Boolean(fetchedLong || fetchedShort);
      };

      fetch(`/api/products?id=${encodeURIComponent(String(identifier))}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = resolveFromPayload(data);
          // If not resolved and we have a secondary identifier (e.g. skuId), try that too
          if (!resolved && skuId && String(skuId) !== String(identifier)) {
            return fetch(`/api/products?id=${encodeURIComponent(String(skuId))}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((skuData) => resolveFromPayload(skuData));
          }
        })
        .catch((err) => {
          console.warn('[OfferingInfoButton] Error fetching description:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, prodId, skuId, shortDesc, longDesc]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sizeClasses = {
    xs: 'w-4 h-4 text-[10px]',
    sm: 'w-4.5 h-4.5 text-[11px]',
    md: 'w-5.5 h-5.5 text-xs',
  }[buttonSize];

  const modal = isOpen && mounted ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(false);
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              ℹ
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">{offeringName}</h3>
              {skuId && skuId !== '—' && (
                <span className="text-[10px] font-mono text-gray-500">{skuId}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-black w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Close descriptions modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isLoading && (
            <div className="py-2 text-center text-xs text-gray-500 font-medium">
              Loading detailed descriptions...
            </div>
          )}

          {/* Short Description */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>Short Description</span>
            </h4>
            <div className="p-3 bg-gray-50 rounded-xl text-gray-800 text-xs leading-relaxed border border-gray-100">
              {shortDesc ? (
                /<[a-z][\s\S]*>/i.test(shortDesc) ? (
                  <div
                    className="space-y-1.5 [&>p]:mb-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                    dangerouslySetInnerHTML={{ __html: shortDesc }}
                  />
                ) : (
                  <p className="whitespace-pre-line">{shortDesc}</p>
                )
              ) : (
                <p className="text-gray-400 italic">No short description available.</p>
              )}
            </div>
          </div>

          {/* Long Description */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>Long Description</span>
            </h4>
            <div className="p-3.5 bg-gray-50 rounded-xl text-gray-800 text-xs leading-relaxed border border-gray-100 max-h-60 overflow-y-auto">
              {longDesc ? (
                /<[a-z][\s\S]*>/i.test(longDesc) ? (
                  <div
                    className="space-y-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                    dangerouslySetInnerHTML={{ __html: longDesc }}
                  />
                ) : (
                  <p className="whitespace-pre-line">{longDesc}</p>
                )
              ) : (
                <p className="text-gray-400 italic">No detailed long description available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(true);
        }}
        className={`rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200/60 flex items-center justify-center font-bold shrink-0 transition-colors cursor-pointer select-none leading-none ${sizeClasses} ${className}`}
        title={title}
        aria-label={title}
      >
        i
      </button>

      {mounted && typeof document !== 'undefined' && modal
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}
