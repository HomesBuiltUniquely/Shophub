'use client';

import React from 'react';

interface QuoteBottomBarProps {
  grandTotal: number;
  designerMarginPct?: number;
  designerMarginAmount?: number;
  projectedProfit?: number;
  onShareQuote?: () => void;
  onSaveForClient?: () => void;
  isSavingForClient?: boolean;
  onGeneratePdf?: () => void;
  isGeneratingPdf?: boolean;
}

export default function QuoteBottomBar({
  grandTotal,
  designerMarginPct = 24.5,
  designerMarginAmount = 3802.0,
  projectedProfit = 5240.0,
  onShareQuote,
  onSaveForClient,
  isSavingForClient = false,
  onGeneratePdf,
  isGeneratingPdf = false,
}: QuoteBottomBarProps) {
  // If margin is not specified, calculate proportional to grandTotal
  const effectiveMarginAmount = designerMarginAmount > 0 
    ? designerMarginAmount 
    : grandTotal * (designerMarginPct / 100);
  const effectiveProfit = projectedProfit > 0 
    ? projectedProfit 
    : grandTotal * 0.33;

  return (
    <footer className="fixed bottom-0 left-56 right-0 h-20 bg-neutral-950 text-white z-30 px-6 border-t border-neutral-800 flex items-center justify-between shadow-2xl">
      {/* Financial Metrics */}
      <div className="flex items-center gap-8">
        {/* Grand Total */}
        <div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            GRAND TOTAL
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="h-8 w-px bg-neutral-800" />

        {/* Designer Margin */}
        <div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            DESIGNER MARGIN
          </div>
          <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
            <span>+{designerMarginPct.toFixed(1)}%</span>
            <span className="text-emerald-500/80 font-medium text-xs">
              (₹{effectiveMarginAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-neutral-800" />

        {/* Projected Profit */}
        <div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            PROJECTED PROFIT
          </div>
          <div className="text-sm font-bold text-neutral-200">
            ₹{effectiveProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveForClient}
          disabled={isSavingForClient}
          className="px-4 py-2.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60"
        >
          {isSavingForClient ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{isSavingForClient ? 'Saving…' : 'Save for client'}</span>
        </button>

        {/* Share Quote */}
        <button
          type="button"
          onClick={onShareQuote}
          className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-2 border border-neutral-700/60 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share Quote</span>
        </button>

        {/* Generate PDF */}
        <button
          type="button"
          onClick={onGeneratePdf}
          disabled={isGeneratingPdf}
          className="px-5 py-2.5 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-950 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
        >
          {isGeneratingPdf ? (
            <svg className="w-4 h-4 animate-spin text-neutral-950" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span>{isGeneratingPdf ? 'Generating...' : 'Generate PDF'}</span>
        </button>
      </div>
    </footer>
  );
}
