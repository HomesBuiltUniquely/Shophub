'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getDraftItems,
  getDraftSummary,
  getDraftGroupedByRoom,
  getDraftItemTotals,
  updateDraftItemQty,
  removeDraftItem,
  OfferingDraftItem,
} from '@/lib/client/offeringsDraftStore';

interface DraftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Trigger key — bumped each time an item is added so the drawer re-reads localStorage */
  refreshKey?: number;
}

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DraftDrawer({ isOpen, onClose, refreshKey = 0 }: DraftDrawerProps) {
  const [items, setItems] = useState<OfferingDraftItem[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Re-read localStorage whenever the drawer opens or an item is added
  useEffect(() => {
    if (isOpen) {
      setItems(getDraftItems());
    }
  }, [isOpen, refreshKey]);

  const refresh = useCallback(() => setItems(getDraftItems()), []);

  // Close on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleQtyChange = (draftId: string, qty: number) => {
    updateDraftItemQty(draftId, qty);
    refresh();
  };

  const handleRemove = (draftId: string) => {
    removeDraftItem(draftId);
    refresh();
  };

  const grouped = getDraftGroupedByRoom(items);
  const roomNames = Object.keys(grouped);
  const summary = getDraftSummary(items);

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Drawer panel ─────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quotation Draft"
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[440px] bg-[#FAF7F2] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/70 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-950 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-black text-gray-950 tracking-tight">Quotation Draft</div>
              {items.length > 0 && (
                <div className="text-[11px] font-semibold text-gray-500">
                  {summary.itemCount} item{summary.itemCount !== 1 ? 's' : ''} · {roomNames.length} room{roomNames.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
            aria-label="Close drawer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body: scrollable item list ────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {items.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-10">
              <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-950">Draft is empty</p>
                <p className="text-xs text-gray-500 mt-0.5">Add items from the catalog to build your quotation.</p>
              </div>
            </div>
          ) : (
            /* Room-grouped items */
            roomNames.map((room) => (
              <div key={room} className="bg-white rounded-2xl border border-black/[0.04] shadow-2xs overflow-hidden">
                {/* Room label */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100/80 bg-[#FAF7F2]/60">
                  <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-[10.5px] font-black uppercase tracking-widest text-gray-700">{room}</span>
                </div>

                {/* Items in this room */}
                <div className="divide-y divide-gray-100/60">
                  {grouped[room].map((item) => {
                    const { baseTotal, gstAmount } = getDraftItemTotals(item);
                    return (
                      <div key={item.draftId} className="flex items-start gap-3 p-4">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.offeringName} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-xs font-bold text-gray-950 leading-snug truncate">{item.offeringName}</div>
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{item.sku}</div>
                          {item.designerNote && (
                            <div className="text-[10px] text-[#65783A] font-semibold bg-[#65783A]/8 border border-[#65783A]/15 px-2 py-0.5 rounded-md inline-block max-w-full truncate">
                              {item.designerNote}
                            </div>
                          )}
                          <div className="text-[10.5px] text-gray-500 font-medium">
                            ₹{fmt(baseTotal)}
                            <span className="text-gray-400 ml-1">+₹{fmt(gstAmount)} GST</span>
                          </div>
                        </div>

                        {/* Right: qty + remove */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => handleRemove(item.draftId)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                            title="Remove"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {/* Qty stepper */}
                          <div className="flex items-center gap-1 bg-[#FAF7F2] border border-gray-200/80 rounded-full px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.draftId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-600 hover:bg-white font-bold text-sm cursor-pointer disabled:opacity-30 transition-all"
                            >−</button>
                            <span className="text-xs font-black text-gray-950 w-4 text-center select-none">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.draftId, item.quantity + 1)}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-600 hover:bg-white font-bold text-sm cursor-pointer transition-all"
                            >+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer: summary + CTAs ────────────────────────────── */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-gray-200/70 bg-white px-5 pt-4 pb-6 space-y-4">
            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500 font-semibold">
                <span>Sub-total</span>
                <span className="text-gray-800 font-bold">₹ {fmt(summary.subTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-semibold">
                <span>Est. GST</span>
                <span className="text-gray-800 font-bold">₹ {fmt(summary.totalGst)}</span>
              </div>
              <div className="flex justify-between font-black text-gray-950 text-sm pt-1.5 border-t border-gray-100">
                <span>Est. Total</span>
                <span>₹ {fmt(summary.grandTotal)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2.5">
              {/* Proceed to Quotation — primary */}
              <Link
                href="/client/quotations?tab=offerings"
                onClick={onClose}
                className="w-full py-3.5 px-5 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Proceed to Quotation</span>
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Continue Shopping — secondary */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-5 rounded-full border border-gray-200 bg-[#FAF7F2] hover:bg-white text-gray-800 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer hover:border-gray-300"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
