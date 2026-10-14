'use client';

import React from 'react';
import { QuoteItemModel, QuoteModel } from '@/lib/types/quote.types';

interface QuoteSidebarProps {
  quote: QuoteModel | null;
  onUpdateQuantity: (itemId: number, newQty: number) => void;
  onRemoveItem: (itemId: number) => void;
  onClearQuote: () => void;
  onClose: () => void;
  isAdmin?: boolean;
  canEditDiscount?: boolean;
  onUpdateDiscount?: (newPct: number) => void;
  onUpdateFreight?: (newFreightPct: number) => void;
}

export default function QuoteSidebar({
  quote,
  onUpdateQuantity,
  onRemoveItem,
  onClearQuote,
  onClose,
  isAdmin = false,
  canEditDiscount = false,
  onUpdateDiscount,
  onUpdateFreight,
}: QuoteSidebarProps) {
  const allowDiscountEdit = Boolean(canEditDiscount || isAdmin);
  const [isEditingDiscount, setIsEditingDiscount] = React.useState(false);
  const [customDiscountInput, setCustomDiscountInput] = React.useState('');
  const [isEditingFreight, setIsEditingFreight] = React.useState(false);
  const [customFreightInput, setCustomFreightInput] = React.useState('');
  const items = quote?.items || [];

  // Group items by room
  const roomsMap = items.reduce((acc, item) => {
    const room = item.room || 'General';
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {} as Record<string, QuoteItemModel[]>);

  const roomNames = Object.keys(roomsMap);
  const totalItemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const subtotal = quote?.subtotal ?? items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const discountPct = quote?.discountPercentage ?? 5;
  const discountAmount = quote?.totalDiscount ?? subtotal * (discountPct / 100);

  const getRoomIcon = (roomName: string) => {
    const lower = roomName.toLowerCase();
    if (lower.includes('kitchen')) {
      return (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
    if (lower.includes('living')) {
      return (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    );
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 h-[calc(100vh-3.5rem-5rem)] fixed top-14 right-0 flex flex-col justify-between z-20 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Your Quote</h2>
          <p className="text-[11px] text-gray-400 font-medium">
            {totalItemCount} items across {roomNames.length || 1} rooms
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <button
            onClick={onClearQuote}
            className="p-1 hover:text-red-500 transition-colors"
            title="Clear Quote"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-black transition-colors"
            title="Close Sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Room Groups & Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {roomNames.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            No items in quote yet
          </div>
        ) : (
          roomNames.map((room) => {
            const roomItems = roomsMap[room];
            const roomTotal = roomItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

            return (
              <div key={room} className="space-y-2.5">
                {/* Room Header with Icon and Subtotal */}
                <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <span className="text-gray-500">{getRoomIcon(room)}</span>
                    <span>{room}</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">
                    ₹{roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Room Items */}
                <div className="space-y-2">
                  {roomItems.map((item) => {
                    const imageUrl = item.imageUrl || `http://localhost:8080/api/v1/products/${item.prodId}/image`;
                    const hasOriginal = item.originalPrice && item.quantity > 1;

                    return (
                      <div
                        key={item.id || `${item.prodId}-${room}`}
                        className="bg-gray-50/70 border border-gray-100 rounded-xl p-2.5 flex items-center gap-3 relative group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <img
                            src={imageUrl}
                            alt={item.offeringName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Details & Controls */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-start justify-between">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{item.offeringName}</h4>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity Controls: [ - ] [ qty ] [ + ] */}
                            <div className="inline-flex items-center border border-gray-200 rounded-md bg-white text-xs">
                              <button
                                onClick={() => item.id && onUpdateQuantity(item.id, item.quantity - 1)}
                                className="px-1.5 py-0.5 text-gray-500 hover:text-black font-bold"
                              >
                                -
                              </button>
                              <span className="px-2 py-0.5 font-bold text-gray-900 text-[11px]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => item.id && onUpdateQuantity(item.id, item.quantity + 1)}
                                className="px-1.5 py-0.5 text-gray-500 hover:text-black font-bold"
                              >
                                +
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              {hasOriginal && (
                                <div className="text-[10px] text-gray-400 line-through">
                                  ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              <div className="text-xs font-extrabold text-gray-900">
                                ₹{(item.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Remove 'x' Button */}
                        <button
                          onClick={() => item.id && onRemoveItem(item.id)}
                          className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Summary Section */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2 text-xs">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-bold text-gray-900">
            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Total Discount Section */}
        <div className="pt-1 pb-1">
          <div className="flex items-center justify-between text-xs">
            <span className={discountPct > 0 ? 'text-red-500 font-medium' : 'text-gray-500'}>
              Total Discount ({discountPct}%)
            </span>

            <div className="flex items-center gap-2">
              <span className={discountPct > 0 ? 'font-bold text-red-500' : 'font-medium text-gray-400'}>
                {discountPct > 0
                  ? `-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '₹0.00'}
              </span>

              {allowDiscountEdit && onUpdateDiscount && (
                <button
                  type="button"
                  onClick={() => setIsEditingDiscount(!isEditingDiscount)}
                  className="text-[10px] font-semibold text-black hover:text-gray-700 underline underline-offset-2 ml-1"
                >
                  {isEditingDiscount ? 'Close' : discountPct > 0 ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>
          </div>

          {/* Discount Control Panel (Admin, CRM, Designer) */}
          {allowDiscountEdit && isEditingDiscount && onUpdateDiscount && (
            <div className="mt-2.5 p-2.5 bg-white border border-gray-200 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Select Discount
                </span>
                {discountPct > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateDiscount(0);
                      setIsEditingDiscount(false);
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove Discount
                  </button>
                )}
              </div>

              {/* Preset percentage pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[3, 5, 7, 10, 15].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onUpdateDiscount(preset);
                      setIsEditingDiscount(false);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-colors ${
                      discountPct === preset
                        ? 'bg-black text-white border-black'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              {/* Custom percentage input */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Custom %"
                  value={customDiscountInput}
                  onChange={(e) => setCustomDiscountInput(e.target.value)}
                  className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseFloat(customDiscountInput);
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                      onUpdateDiscount(parsed);
                      setCustomDiscountInput('');
                      setIsEditingDiscount(false);
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Estimated Freight Section */}
        <div className="pt-1 pb-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Estimated Freight ({quote?.freightPercentage ?? 2.5}%)</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">
                ₹{(quote?.estimatedFreight ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {allowDiscountEdit && onUpdateFreight && (
                <button
                  type="button"
                  onClick={() => setIsEditingFreight(!isEditingFreight)}
                  className="text-[10px] font-semibold text-black hover:text-gray-700 underline underline-offset-2 ml-1"
                >
                  {isEditingFreight ? 'Close' : 'Edit'}
                </button>
              )}
            </div>
          </div>

          {/* Freight Control Panel (Admin, CRM, Designer) */}
          {allowDiscountEdit && isEditingFreight && onUpdateFreight && (
            <div className="mt-2.5 p-2.5 bg-white border border-gray-200 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Freight Rate (% of Net Total)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateFreight(2.5);
                    setIsEditingFreight(false);
                  }}
                  className="text-[10px] text-gray-500 hover:text-black font-medium"
                >
                  Reset (2.5%)
                </button>
              </div>

              {/* Preset percentage pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 2.5, 3, 5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onUpdateFreight(preset);
                      setIsEditingFreight(false);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-colors ${
                      (quote?.freightPercentage ?? 2.5) === preset
                        ? 'bg-black text-white border-black'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              {/* Custom percentage input */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Custom %"
                  value={customFreightInput}
                  onChange={(e) => setCustomFreightInput(e.target.value)}
                  className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseFloat(customFreightInput);
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                      onUpdateFreight(parsed);
                      setCustomFreightInput('');
                      setIsEditingFreight(false);
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Regional logistics surcharges note */}
        <div className="mt-3 bg-gray-900 text-white text-[10px] p-2.5 rounded-lg flex items-center gap-2 shadow-xs">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
          <span className="leading-tight text-gray-300">Calculations include regional logistics surcharges.</span>
        </div>
      </div>
    </aside>
  );
}
