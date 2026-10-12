'use client';

import React from 'react';
import { QuotationSummaryItem } from '@/lib/client/types';

interface RecentQuotationsCardProps {
  quotations: QuotationSummaryItem[];
  selectedQuoteNumber: string;
  onSelectQuote: (quoteNumber: string) => void;
  onViewQuote?: (quote: QuotationSummaryItem) => void;
}

export default function RecentQuotationsCard({
  quotations,
  selectedQuoteNumber,
  onSelectQuote,
  onViewQuote,
}: RecentQuotationsCardProps) {
  const handleView = (q: QuotationSummaryItem) => {
    if (onViewQuote) {
      onViewQuote(q);
      return;
    }
    const targetUrl =
      q.pdfUrl || q.quoteUrl || `https://design.hubinterior.com/quote/${q.quoteNumber}`;
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-black/[0.04] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-gray-900">
          RECENT QUOTATIONS
        </h2>
        <span className="bg-[#DC2626] text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-xs">
          {quotations.length}
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left border-collapse min-w-[840px]">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[16%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[16%]" />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="bg-[#FAF7F2] text-[11px] font-bold text-gray-500 uppercase tracking-wider rounded-xl overflow-hidden">
              <th className="py-3 pl-5 pr-3 rounded-l-xl">QUOTE #</th>
              <th className="py-3 px-3">DATE ISSUED</th>
              <th className="py-3 px-3">REVISION</th>
              <th className="py-3 px-3">STATUS</th>
              <th className="py-3 px-3">PREVIEW</th>
              <th className="py-3 px-3">TOTAL AMOUNT</th>
              <th className="py-3 pr-4 rounded-r-xl text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/80 text-sm">
            {quotations.map((q) => {
              const isSelected = q.quoteNumber === selectedQuoteNumber;

              return (
                <tr
                  key={q.id || q.quoteNumber}
                  onClick={() => onSelectQuote(q.quoteNumber)}
                  className={`cursor-pointer transition-all duration-150 group ${
                    isSelected
                      ? 'bg-[#FAF7F2]/80 font-medium'
                      : 'hover:bg-[#FAF7F2]/40'
                  }`}
                >
                  {/* Quote Number */}
                  <td className="py-4 pl-5 pr-3 font-bold text-gray-950 whitespace-nowrap">
                    <span className="group-hover:text-[#DC2626] transition-colors">
                      {q.quoteNumber}
                    </span>
                  </td>

                  {/* Date Issued */}
                  <td className="py-4 px-3 text-gray-600 font-medium whitespace-nowrap">
                    {q.dateIssued}
                  </td>

                  {/* Revision Badge */}
                  <td className="py-4 px-3 whitespace-nowrap">
                    <span className="inline-block bg-[#F2EDE4] text-gray-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                      {q.revision}
                    </span>
                  </td>

                  {/* Status Indicator */}
                  <td className="py-4 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {q.status === 'Pending Approval' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
                          <span className="font-bold text-[#DC2626]">
                            Pending Approval
                          </span>
                        </>
                      )}
                      {q.status === 'Approved' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#65783A] shrink-0" />
                          <span className="font-bold text-[#65783A]">
                            Approved
                          </span>
                        </>
                      )}
                      {(q.status === 'Expired' || q.status === 'Superseded') && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                          <span className="font-medium text-gray-500">
                            {q.status}
                          </span>
                        </>
                      )}
                      {q.status !== 'Pending Approval' && q.status !== 'Approved' && q.status !== 'Expired' && q.status !== 'Superseded' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                          <span className="font-medium text-gray-500">
                            {q.status}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Preview Action Button */}
                  <td className="py-4 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleView(q)}
                      title={`Open PDF for quotation ${q.quoteNumber}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF7F2] text-gray-800 hover:text-black text-xs font-bold border border-gray-200/90 shadow-2xs hover:border-gray-400 active:scale-95 transition-all cursor-pointer group/btn whitespace-nowrap"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-red-500/80 group-hover/btn:text-red-600 transition-colors shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>View PDF</span>
                      <span className="text-gray-400 group-hover/btn:text-gray-900 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform font-bold text-[11px]">
                        ↗
                      </span>
                    </button>
                  </td>

                  {/* Total Amount */}
                  <td className="py-4 px-3 font-black text-gray-950 text-[15px] whitespace-nowrap">
                    {q.totalAmountFormatted}
                  </td>

                  {/* Right Arrow Chevron */}
                  <td className="py-4 pr-4 text-right text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all">
                    <svg
                      className="w-4 h-4 ml-auto"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
