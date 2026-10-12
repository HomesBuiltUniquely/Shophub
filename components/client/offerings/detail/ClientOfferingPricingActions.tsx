'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { addToDraft } from '@/lib/client/offeringsDraftStore';

interface ClientOfferingPricingActionsProps {
  price?: number;
  discount?: number;
  gstRate?: string;
  units?: string;
  offeringName: string;
  sku?: string;
  onAddToQuote?: (data: { quantity: number; room: string; designerNote: string }) => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
  /** Called after item is saved to draft — triggers the slide-in drawer */
  onOpenDraftDrawer?: () => void;
}

const AVAILABLE_ROOMS = [
  'Living Room',
  'Master Bedroom',
  'Dining Area',
  'Guest Bedroom',
  'Foyer / Lounge',
  'Study / Home Office',
];

export default function ClientOfferingPricingActions({
  price = 1500,
  discount = 0,
  gstRate = '18',
  units = 'per piece',
  offeringName,
  sku = 'SKU-CHAIR-010',
  onAddToQuote,
  onToggleWishlist,
  isWishlisted = false,
  onOpenDraftDrawer,
}: ClientOfferingPricingActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState('Living Room');
  const [designerNote, setDesignerNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const formattedPrice = price.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const originalPrice = discount > 0 ? price / (1 - discount / 100) : null;

  // Total estimate calculation
  const totalItemEstimate = Math.round(price * quantity * 1.18);

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrement = () => {
    setQuantity(quantity + 1);
  };

  const handleAddToQuoteClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);

      // Persist to localStorage draft store
      addToDraft({
        offeringId: sku,
        offeringName,
        sku,
        unitPrice: price,
        gstRate: Number(gstRate.replace(/[^0-9]/g, '') || '18'),
        quantity,
        room: selectedRoom,
        designerNote: designerNote.trim() || undefined,
      });

      onAddToQuote?.({
        quantity,
        room: selectedRoom,
        designerNote: designerNote.trim(),
      });

      // Open the draft drawer
      onOpenDraftDrawer?.();

      setTimeout(() => setJustAdded(false), 2500);
    }, 400);
  };

  return (
    <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-black/[0.04] shadow-sm space-y-6">
      {/* 1. Price Showcase Card */}
      <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE8DC]/80">
        <div className="text-[10.5px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
          PRICE ESTIMATE
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            ₹ {formattedPrice}
          </span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            INR / {units.replace(/_/g, ' ').toLowerCase()}
          </span>

          {originalPrice && (
            <span className="text-sm font-semibold text-gray-400 line-through ml-2">
              ₹ {originalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          )}

          {discount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold ml-1">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* GST Notice (Replaces internal cost pricing from enterprise) */}
        <div className="mt-2 text-xs font-semibold text-[#65783A] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Inclusive of {gstRate.replace(/[^0-9]/g, '') || '18'}% GST</span>
        </div>
      </div>

      {/* 2. Room Assignment & Designer Notes (Replaces Check Delivery Pincode) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-950">
            ASSIGN TO ROOM IN QUOTATION
          </span>
          <span className="text-[11px] font-semibold text-gray-400">Project Breakdown</span>
        </div>

        {/* Room Selection Interactive Pills */}
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_ROOMS.map((room) => {
            const isSelected = room === selectedRoom;
            return (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-black text-white shadow-2xs scale-[1.02]'
                    : 'bg-[#FAF7F2] text-gray-700 hover:bg-[#F0EAE0] border border-gray-200/60'
                }`}
              >
                {room}
              </button>
            );
          })}
        </div>

        {/* Designer / Custom Specification Note */}
        <div className="pt-1">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            CUSTOM FINISH OR DESIGN NOTE (OPTIONAL)
          </label>
          <input
            type="text"
            value={designerNote}
            onChange={(e) => setDesignerNote(e.target.value)}
            placeholder="e.g. Emerald green velvet, walnut leg finish, or custom dimensions..."
            className="w-full bg-[#FAF7F2] border border-gray-200/80 px-4 py-2.5 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 font-medium"
          />
        </div>

        {/* Active Quote Impact Helper */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2]/80 border border-[#EFE8DC]/80 flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="text-gray-500 font-medium">
              Adds to <span className="font-bold text-gray-950">{selectedRoom}</span>:
            </div>
            <div className="font-bold text-gray-950">
              ₹ {totalItemEstimate.toLocaleString('en-IN')} (incl. 18% GST)
            </div>
          </div>

          <Link
            href="/client/quotations?tab=offerings"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] hover:underline shrink-0"
          >
            <span>Active Quote Q-52330-003</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* 3. Actions: Quantity Stepper + Add to Quotation Draft + Save to Wishlist */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center justify-between bg-[#FAF7F2] border border-gray-200/90 rounded-full px-3 py-2 w-full sm:w-36 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-black font-extrabold text-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
            >
              −
            </button>
            <span className="font-black text-sm text-gray-950 px-2 select-none">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-black font-extrabold text-lg cursor-pointer transition-all"
            >
              +
            </button>
          </div>

          {/* Add to Quotation Draft Button */}
          <button
            type="button"
            onClick={handleAddToQuoteClick}
            disabled={isAdding}
            className={`flex-1 inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full font-bold text-xs shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
              justAdded
                ? 'bg-[#65783A] text-white'
                : 'bg-black hover:bg-zinc-800 text-white'
            }`}
          >
            {isAdding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : justAdded ? (
              <>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Added to {selectedRoom} ({quantity})</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Add to Quotation Draft</span>
              </>
            )}
          </button>
        </div>

        {/* Save to Wishlist Button */}
        <button
          type="button"
          onClick={onToggleWishlist}
          className={`w-full py-3 px-5 rounded-full font-bold text-xs border transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.98] ${
            isWishlisted
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : 'bg-white hover:bg-[#FAF7F2] text-gray-800 border-gray-200 hover:border-gray-300'
          }`}
        >
          <svg
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'text-rose-600 fill-rose-600' : 'text-gray-500'
            }`}
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>{isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
        </button>
      </div>

      {/* 4. Quotation & Project Guarantees (Replaces Delivery / Returns / Warranty) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
        {/* Price Lock */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2]/70 border border-black/[0.03]">
          <div className="text-[11px] font-bold text-gray-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Price Lock</span>
          </div>
          <div className="text-xs text-gray-600 font-semibold">30-day guarantee</div>
        </div>

        {/* Custom Fit */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2]/70 border border-black/[0.03]">
          <div className="text-[11px] font-bold text-gray-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>Custom Fit</span>
          </div>
          <div className="text-xs text-gray-600 font-semibold">Made-to-measure</div>
        </div>

        {/* Installation */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2]/70 border border-black/[0.03]">
          <div className="text-[11px] font-bold text-gray-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Installation</span>
          </div>
          <div className="text-xs text-gray-600 font-semibold">Turnkey placement</div>
        </div>
      </div>
    </div>
  );
}
