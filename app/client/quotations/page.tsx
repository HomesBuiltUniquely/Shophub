'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';

import RecentQuotationsCard from '@/components/client/quotations/RecentQuotationsCard';
import ActiveQuoteDetailCard from '@/components/client/quotations/ActiveQuoteDetailCard';
import QuickActionsCard from '@/components/client/quotations/QuickActionsCard';
import QuoteValidityCard from '@/components/client/quotations/QuoteValidityCard';
import CompareRevisionsCard from '@/components/client/quotations/CompareRevisionsCard';
import OfferingsQuotationView from '@/components/client/quotations/OfferingsQuotationView';

import ApproveQuoteModal from '@/components/client/quotations/ApproveQuoteModal';
import RequestChangesModal from '@/components/client/quotations/RequestChangesModal';
import DetailedComparisonModal from '@/components/client/quotations/DetailedComparisonModal';
import FullHistoryModal from '@/components/client/quotations/FullHistoryModal';

import { QuotationsPageData, ActiveQuoteDetail, QuotationSummaryItem } from '@/lib/client/types';

type QuotationType = 'interior' | 'offerings';

function QuotationsContent() {
  const { leadId, openContactModal } = useClientDashboard();

  const searchParams = useSearchParams();

  // Honour ?tab=offerings when navigating from the offering detail page
  const [quotationType, setQuotationType] = useState<QuotationType>(
    searchParams.get('tab') === 'offerings' ? 'offerings' : 'interior'
  );
  const [pageData, setPageData] = useState<QuotationsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuoteNumber, setSelectedQuoteNumber] = useState<string>('');
  const [isApproved, setIsApproved] = useState(false);

  // Modals state
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch dynamic quotation data
  useEffect(() => {
    let isMounted = true;

    async function fetchQuoteData() {
      try {
        setIsLoading(true);
        const quoteQuery = selectedQuoteNumber ? `&quoteNum=${encodeURIComponent(selectedQuoteNumber)}` : '';
        const url = `/api/client/quotations?leadId=${encodeURIComponent(leadId)}${quoteQuery}`;
        const res = await fetch(url, { cache: 'no-store' });

        if (!res.ok) {
          throw new Error('Failed to load quotation details');
        }

        const json = await res.json();
        if (isMounted && json.data) {
          setPageData(json.data);
          if (!selectedQuoteNumber && json.data.activeQuote?.quoteNumber) {
            setSelectedQuoteNumber(json.data.activeQuote.quoteNumber);
          }
          setIsApproved(json.data.activeQuote?.status === 'Approved');
        }
      } catch (err) {
        console.warn('[Quotations] Error fetching quote data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchQuoteData();

    return () => {
      isMounted = false;
    };
  }, [leadId, selectedQuoteNumber]);

  // Handle switching selected quote
  const handleSelectQuote = (quoteNum: string) => {
    setSelectedQuoteNumber(quoteNum);
    const matched = pageData?.recentQuotations.find((q) => q.quoteNumber === quoteNum);
    if (matched) {
      setIsApproved(matched.status === 'Approved');
    }
  };

  // Filter recent quotations based on user search query
  const filteredQuotations = useMemo(() => {
    if (!pageData?.recentQuotations) return [];
    if (!searchQuery.trim()) return pageData.recentQuotations;

    const q = searchQuery.toLowerCase();
    return pageData.recentQuotations.filter(
      (item) =>
        item.quoteNumber.toLowerCase().includes(q) ||
        item.dateIssued.toLowerCase().includes(q) ||
        item.revision.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.totalAmountFormatted.toLowerCase().includes(q)
    );
  }, [pageData?.recentQuotations, searchQuery]);

  // Approve Quote action
  const handleConfirmApprove = async () => {
    try {
      const res = await fetch('/api/client/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          quoteNumber: selectedQuoteNumber,
        }),
      });

      if (res.ok) {
        setIsApproved(true);
        showToast(`Quotation ${selectedQuoteNumber} successfully approved!`);
      }
    } catch (err) {
      console.error(err);
      setIsApproved(true);
      showToast(`Quotation ${selectedQuoteNumber} approved!`);
    }
  };

  // Submit revision request
  const handleSubmitChanges = async (notes: string) => {
    try {
      await fetch('/api/client/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-changes',
          quoteNumber: selectedQuoteNumber,
          notes,
        }),
      });
      showToast('Revision request sent to your Lead Designer!');
    } catch (err) {
      console.error(err);
      showToast('Revision request recorded!');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!pageData) return;

    const quotes = pageData.recentQuotations;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'QUOTE #,DATE ISSUED,REVISION,STATUS,TOTAL AMOUNT\n';

    quotes.forEach((q) => {
      csvContent += `"${q.quoteNumber}","${q.dateIssued}","${q.revision}","${q.status}","${q.totalAmountFormatted}"\n`;
    });

    if (pageData.activeQuote) {
      csvContent += '\nACTIVE QUOTE ROOM BREAKDOWN\n';
      csvContent += 'ROOM,ITEM NAME,PRICE\n';
      pageData.activeQuote.rooms.forEach((r) => {
        r.items.forEach((item) => {
          csvContent += `"${r.roomName}","${item.name}","${item.priceFormatted}"\n`;
        });
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HubInterior_Quotations_${selectedQuoteNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Quotations exported as CSV');
  };

  const activeQuote = pageData?.activeQuote;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      {/* Client Sidebar */}
      <ClientSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Sticky Top Header with "My Hub" & "Search quotations..." */}
        <ClientHeader
          pageTitle="My Hub"
          searchPlaceholder="Search quotations..."
          onSearch={setSearchQuery}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-gray-950 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-3 duration-200">
            <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Quotations Main Body */}
        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto space-y-8">
          {/* Top Page Title & Actions Strip */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
                Quotations
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl font-normal">
                {quotationType === 'interior'
                  ? 'Review, compare, and approve your project estimates with full transparency.'
                  : 'Your catalog selections — grouped by room and ready to submit to your Lead Designer.'}
              </p>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">

              {/* ── Quotation Type Toggle ── */}
              <div className="flex items-center bg-white border border-gray-200/80 rounded-full p-1 shadow-2xs gap-1">
                {/* Interior Quotation */}
                <button
                  type="button"
                  onClick={() => setQuotationType('interior')}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${
                    quotationType === 'interior'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Interior Quotation</span>
                </button>

                {/* Offerings Quotation */}
                <button
                  type="button"
                  onClick={() => setQuotationType('offerings')}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${
                    quotationType === 'offerings'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Offerings Quotation</span>
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-200" />

              {/* View Full History — only relevant for interior */}
              {quotationType === 'interior' && (
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-[#FAF7F2] text-gray-800 text-xs font-bold py-2.5 px-4 rounded-full border border-gray-200/80 shadow-2xs hover:border-gray-300 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>View Full History</span>
                </button>
              )}

              {/* Export All (CSV) — only for interior */}
              {quotationType === 'interior' && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold py-2.5 px-4 rounded-full shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export All (CSV)</span>
                </button>
              )}
            </div>
          </div>

          {/* ── INTERIOR QUOTATION VIEW ─────────────────────────── */}
          {quotationType === 'interior' && (
            <>
              {/* Section 1: Recent Quotations Table Card */}
              <RecentQuotationsCard
                quotations={filteredQuotations}
                selectedQuoteNumber={selectedQuoteNumber}
                onSelectQuote={handleSelectQuote}
                onViewQuote={(quote) => {
                  const targetUrl =
                    quote.pdfUrl || quote.quoteUrl || `https://design.hubinterior.com/quote/${quote.quoteNumber}`;
                  if (typeof window !== 'undefined') {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                  }
                  showToast(`Opening PDF for quotation ${quote.quoteNumber}...`);
                }}
              />

              {/* Section 2: Active Quote Detail (Left) + Quick Actions / Validity / Comparison (Right) */}
              {activeQuote && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                  {/* Left Column (8 of 12 cols): Active Quote Detail */}
                  <div className="lg:col-span-8 flex flex-col">
                    <ActiveQuoteDetailCard
                      quote={activeQuote}
                      isApproved={isApproved}
                      onApproveClick={() => setIsApproveModalOpen(true)}
                    />
                  </div>

                  {/* Right Column (4 of 12 cols): Quick Actions, Validity, Revisions */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* 1. Quick Actions Card */}
                    <QuickActionsCard
                      pdfUrl={activeQuote.pdfUrl}
                      quoteUrl={activeQuote.quoteUrl}
                      onRequestChanges={() => setIsChangesModalOpen(true)}
                      onShareQuote={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(activeQuote.quoteUrl || window.location.href);
                          showToast('Live quotation link copied to clipboard!');
                        }
                      }}
                    />

                    {/* 2. Quote Validity Card */}
                    <QuoteValidityCard
                      validUntil={activeQuote.validUntil}
                      validityNote={activeQuote.validityNote}
                    />

                    {/* 3. Compare Revisions Card */}
                    <CompareRevisionsCard
                      comparison={activeQuote.revisionComparison}
                      onViewDetailedReport={() => setIsComparisonModalOpen(true)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── OFFERINGS QUOTATION VIEW ────────────────────────────── */}
          {quotationType === 'offerings' && (
            <OfferingsQuotationView onShowToast={showToast} />
          )}

          {/* Footer */}
          <ClientFooter />
        </main>

        {/* Floating Support Chat & Contact RM Modal */}
        <FloatingSupportChat />
        <ContactRmModal />

        {/* Quotation Modals */}
        {activeQuote && (
          <>
            <ApproveQuoteModal
              isOpen={isApproveModalOpen}
              onClose={() => setIsApproveModalOpen(false)}
              quote={activeQuote}
              onConfirmApprove={handleConfirmApprove}
            />

            <RequestChangesModal
              isOpen={isChangesModalOpen}
              onClose={() => setIsChangesModalOpen(false)}
              quote={activeQuote}
              onSubmitChanges={handleSubmitChanges}
            />

            <DetailedComparisonModal
              isOpen={isComparisonModalOpen}
              onClose={() => setIsComparisonModalOpen(false)}
              quote={activeQuote}
            />

            <FullHistoryModal
              isOpen={isHistoryModalOpen}
              onClose={() => setIsHistoryModalOpen(false)}
              quotations={pageData?.recentQuotations || []}
              onSelectQuote={handleSelectQuote}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-gray-500">
              Loading quotations...
            </span>
          </div>
        </div>
      }
    >
      <ClientDashboardProvider>
        <QuotationsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
