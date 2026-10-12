'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getDraftItems,
  getDraftSummary,
  getDraftGroupedByRoom,
  getDraftItemTotals,
  updateDraftItemQty,
  removeDraftItem,
  clearDraft,
  OfferingDraftItem,
} from '@/lib/client/offeringsDraftStore';

interface OfferingsQuotationViewProps {
  onShowToast: (msg: string) => void;
}

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OfferingsQuotationView({ onShowToast }: OfferingsQuotationViewProps) {
  const [items, setItems] = useState<OfferingDraftItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Hydrate from localStorage on mount (SSR-safe)
  useEffect(() => {
    setItems(getDraftItems());
  }, []);

  const refresh = useCallback(() => setItems(getDraftItems()), []);

  const handleQtyChange = (draftId: string, qty: number) => {
    updateDraftItemQty(draftId, qty);
    refresh();
  };

  const handleRemove = (draftId: string, name: string) => {
    removeDraftItem(draftId);
    refresh();
    onShowToast(`Removed "${name}" from draft`);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call — replace with real endpoint when ready
    await new Promise((r) => setTimeout(r, 1200));
    clearDraft();
    refresh();
    setIsSubmitting(false);
    setSubmitted(true);
    onShowToast('Offerings quotation submitted to your Lead Designer!');
  };

  const grouped = getDraftGroupedByRoom(items);
  const roomNames = Object.keys(grouped);
  const summary = getDraftSummary(items);

  /* ─── Empty State ──────────────────────────────────────────────── */
  if (submitted || items.length === 0) {
    return (
      <div className="bg-white rounded-[28px] sm:rounded-[32px] p-10 border border-black/[0.04] shadow-sm flex flex-col items-center justify-center min-h-[340px] gap-5 text-center">
        {/* Bag icon */}
        <div className="w-16 h-16 rounded-full bg-[#FAF7F2] flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>

        <div>
          <p className="text-lg font-extrabold text-gray-950 tracking-tight">
            {submitted ? 'Draft Submitted!' : 'Your Offerings Draft is Empty'}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            {submitted
              ? 'Your Lead Designer will review your selections and prepare a formal quotation shortly.'
              : 'Browse the catalog and click "Add to Quotation Draft" on any offering to begin building your selection.'}
          </p>
        </div>

        <Link
          href="/client/offerings"
          className="inline-flex items-center gap-2 bg-black text-white text-xs font-bold py-3 px-6 rounded-full hover:bg-zinc-800 active:scale-[0.98] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h12" />
          </svg>
          <span>Browse Offerings Catalog</span>
        </Link>
      </div>
    );
  }

  /* ─── Draft Table ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="flex items-center justify-between bg-[#FAF7F2] border border-[#EFE8DC] rounded-2xl px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-xs font-bold text-gray-700">
          <svg className="w-4 h-4 text-[#65783A]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Draft — <span className="text-gray-950">{summary.itemCount} item{summary.itemCount !== 1 ? 's' : ''}</span> across{' '}
            <span className="text-gray-950">{roomNames.length} room{roomNames.length !== 1 ? 's' : ''}</span>.
            Submit to get a formal quotation from your Lead Designer.
          </span>
        </div>
        <Link
          href="/client/offerings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black bg-white border border-gray-200 px-3.5 py-2 rounded-full hover:border-gray-300 transition-all shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add More
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left: Room-grouped items ─────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          {roomNames.map((room) => {
            const roomItems = grouped[room];
            const roomTotal = roomItems.reduce(
              (acc, i) => acc + getDraftItemTotals(i).grandTotal,
              0
            );
            return (
              <div
                key={room}
                className="bg-white rounded-[24px] border border-black/[0.04] shadow-sm overflow-hidden"
              >
                {/* Room header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#FAF7F2] border border-[#EFE8DC] flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-950">{room}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {roomItems.length} item{roomItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-950">₹ {fmt(roomTotal)}</span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100/60">
                  {roomItems.map((item) => {
                    const { baseTotal, gstAmount, grandTotal } = getDraftItemTotals(item);
                    return (
                      <div key={item.draftId} className="flex items-start gap-4 px-6 py-4">

                        {/* Thumbnail placeholder */}
                        <div className="w-14 h-14 rounded-xl bg-[#FAF7F2] border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.offeringName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-sm font-bold text-gray-950 truncate">{item.offeringName}</div>
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.sku}</div>
                          {item.designerNote && (
                            <div className="text-[11px] text-[#65783A] font-semibold bg-[#65783A]/8 border border-[#65783A]/15 px-2.5 py-1 rounded-lg inline-block max-w-full truncate">
                              Note: {item.designerNote}
                            </div>
                          )}
                          <div className="text-[11px] text-gray-500 font-medium">
                            ₹ {fmt(item.unitPrice)} × {item.quantity} = ₹ {fmt(baseTotal)}
                            <span className="ml-1.5 text-gray-400">+ ₹ {fmt(gstAmount)} GST ({item.gstRate}%)</span>
                          </div>
                        </div>

                        {/* Qty Stepper */}
                        <div className="flex items-center gap-1 bg-[#FAF7F2] border border-gray-200/80 rounded-full px-2 py-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.draftId, item.quantity - 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-700 hover:bg-white font-bold text-sm cursor-pointer transition-all disabled:opacity-30"
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-black text-gray-950 select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.draftId, item.quantity + 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-700 hover:bg-white font-bold text-sm cursor-pointer transition-all"
                          >
                            +
                          </button>
                        </div>

                        {/* Line total */}
                        <div className="text-right shrink-0 min-w-[80px]">
                          <div className="text-sm font-black text-gray-950">₹ {fmt(grandTotal)}</div>
                          <div className="text-[10px] text-gray-400 font-medium">incl. GST</div>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemove(item.draftId, item.offeringName)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer shrink-0 mt-0.5"
                          title="Remove item"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right: Summary Card ──────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4 sticky top-24">
          <div className="bg-white rounded-[24px] border border-black/[0.04] shadow-sm p-6 space-y-5">
            <div className="text-xs font-black uppercase tracking-widest text-gray-950">
              Draft Summary
            </div>

            {/* Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-600 font-semibold">
                <span>Sub-total ({summary.itemCount} items)</span>
                <span className="font-bold text-gray-900">₹ {fmt(summary.subTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-semibold">
                <span>Estimated GST</span>
                <span className="font-bold text-gray-900">₹ {fmt(summary.totalGst)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2.5 flex justify-between font-black text-gray-950 text-sm">
                <span>Estimated Total</span>
                <span>₹ {fmt(summary.grandTotal)}</span>
              </div>
            </div>

            <div className="text-[10.5px] text-gray-400 font-medium leading-relaxed bg-[#FAF7F2] rounded-xl p-3 border border-[#EFE8DC]/80">
              This is an indicative draft estimate. Final pricing will be confirmed by your Lead Designer after reviewing custom specifications and availability.
            </div>

            {/* Submit CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Submit to Lead Designer</span>
                </>
              )}
            </button>

            {/* Secondary */}
            <Link
              href="/client/offerings"
              className="w-full py-3 px-5 rounded-full border border-gray-200 bg-white hover:bg-[#FAF7F2] text-gray-800 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer hover:border-gray-300"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Continue Browsing</span>
            </Link>
          </div>

          {/* Room mini-summary */}
          <div className="bg-white rounded-[24px] border border-black/[0.04] shadow-sm p-5 space-y-3">
            <div className="text-[10.5px] font-black uppercase tracking-widest text-gray-500">By Room</div>
            <div className="space-y-2">
              {roomNames.map((room) => {
                const roomTotal = grouped[room].reduce(
                  (acc, i) => acc + getDraftItemTotals(i).grandTotal,
                  0
                );
                const pct = summary.grandTotal > 0 ? (roomTotal / summary.grandTotal) * 100 : 0;
                return (
                  <div key={room} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-700">
                      <span className="truncate">{room}</span>
                      <span className="shrink-0 ml-2 font-bold text-gray-900">₹ {fmt(roomTotal)}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
