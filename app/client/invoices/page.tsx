'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';
import { DownloadIcon, CheckCircleIcon, ClockIcon } from '@/components/client/icons/ClientIcons';

function InvoicesContent() {
  const { data, isLoading, openContactModal } = useClientDashboard();
  const summary = data.paymentSummary;
  const profile = data.profile;

  const totalValue = summary?.totalQuotationValue || 1333946;
  const alreadyPaid = summary?.alreadyPaid || 133395;
  const pendingToCollect = summary?.amountToCollectNow || 133395;
  const remaining = summary?.remainingBalance || 1067157;

  // Real invoices for this project
  const invoices = [
    {
      id: 'INV-99903-01',
      receiptNumber: 'REC-99903-BKG',
      title: 'Milestone 01: Booking Closure Advance',
      description: 'Initial 10% sales closure token confirming project kickoff.',
      amount: alreadyPaid,
      amountFormatted: `₹${alreadyPaid.toLocaleString('en-IN')}`,
      date: 'Oct 12, 2026',
      status: 'PAID',
      method: 'Online Transfer / Easebuzz',
      transactionId: 'TXN-EZB-99903-01',
      taxBreakdown: {
        base: Math.round(alreadyPaid / 1.18),
        cgst: Math.round((alreadyPaid - Math.round(alreadyPaid / 1.18)) / 2),
        sgst: Math.round((alreadyPaid - Math.round(alreadyPaid / 1.18)) / 2),
      },
    },
    {
      id: 'INV-99903-02',
      receiptNumber: 'PENDING',
      title: 'Milestone 02: 10% Design Module Advance',
      description: 'Design module advance bringing cumulative payment to 20% of quotation.',
      amount: pendingToCollect,
      amountFormatted: `₹${pendingToCollect.toLocaleString('en-IN')}`,
      date: 'Due Oct 15, 2026',
      status: pendingToCollect > 0 ? 'DUE' : 'PAID',
      method: 'Awaiting Payment',
      transactionId: 'PENDING',
      taxBreakdown: {
        base: Math.round(pendingToCollect / 1.18),
        cgst: Math.round((pendingToCollect - Math.round(pendingToCollect / 1.18)) / 2),
        sgst: Math.round((pendingToCollect - Math.round(pendingToCollect / 1.18)) / 2),
      },
    },
  ];

  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em]">
                FINANCIAL RECORDS
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Project {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Invoices & Receipts
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Official GST invoices, payment receipts, and milestone tax documentation for your interior project.
            </p>
          </div>

          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Total Quotation Value
              </div>
              <div className="text-2xl font-black text-gray-950 mt-2">
                ₹{totalValue.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Quote #{summary?.quoteId || '75774'} ({summary?.quoteNum || 'Q-53993-019'})
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Verified Paid Amount
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                ₹{alreadyPaid.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700/80 font-medium mt-1">
                ✓ 10% Booking deposit verified
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Current Due / Due Now
              </div>
              <div className="text-2xl font-black text-[#DC2626] mt-2">
                ₹{pendingToCollect.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Milestone 03: 10% Design Module Advance
              </div>
            </div>
          </div>

          {/* Invoices List & Details Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
            {/* Left 7 Columns: Invoice List */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-lg font-bold text-gray-950">Issued Invoices & Bills</h2>

              {invoices.map((inv) => {
                const isPaid = inv.status === 'PAID';
                const isSelected = selectedInvoice.id === inv.id;

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`bg-white rounded-[24px] p-5 sm:p-6 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-black ring-1 ring-black shadow-md'
                        : 'border-black/[0.05] hover:border-black/[0.15] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gray-500">
                            {inv.id}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-gray-950">
                          {inv.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {inv.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-gray-950">
                          {inv.amountFormatted}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">
                          {inv.date}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>Receipt: <strong className="text-gray-800 font-mono">{inv.receiptNumber}</strong></span>
                      <div className="flex items-center gap-3">
                        {!isPaid && (
                          <Link
                            href="/client/payments"
                            className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-full text-xs transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Pay Now
                          </Link>
                        )}
                        <span className="text-black font-semibold hover:underline">
                          View Breakdown →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 5 Columns: Selected Invoice Detailed Receipt Card */}
            <div className="lg:col-span-5 bg-white rounded-[28px] p-6 sm:p-7 shadow-sm border border-black/[0.04] space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    TAX INVOICE PREVIEW
                  </span>
                  <h3 className="text-base font-extrabold text-gray-950 mt-0.5">
                    {selectedInvoice.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#F2ECE1] text-gray-700 transition-colors"
                  title="Print / Save PDF"
                >
                  <DownloadIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Client & Project Header Info */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Billed To:</span>
                  <span className="font-bold text-gray-900">{profile?.name || 'Client S'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Project:</span>
                  <span className="font-bold text-gray-900">{profile?.clientId || 'BLR-QK-KJT5T5P7EF'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Property:</span>
                  <span className="font-bold text-gray-900">{profile?.propertyDetails || 'Purva Palm Beach, Bangalore'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GSTIN:</span>
                  <span className="font-mono font-semibold text-gray-900">29AABCH4932F1ZY</span>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">Base Works Value:</span>
                  <span className="font-medium text-gray-900">₹{selectedInvoice.taxBreakdown.base.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">CGST (9%):</span>
                  <span className="font-medium text-gray-900">₹{selectedInvoice.taxBreakdown.cgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">SGST (9%):</span>
                  <span className="font-medium text-gray-900">₹{selectedInvoice.taxBreakdown.sgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-extrabold text-gray-950">
                  <span>Total Amount:</span>
                  <span className="text-lg">{selectedInvoice.amountFormatted}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="pt-3 border-t border-gray-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status:</span>
                  <span className={`font-bold ${selectedInvoice.status === 'PAID' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Method:</span>
                  <span className="font-medium text-gray-800">{selectedInvoice.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ref / Transaction:</span>
                  <span className="font-mono text-gray-800">{selectedInvoice.transactionId}</span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                {selectedInvoice.status === 'PAID' ? (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full bg-black hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-full text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download Official Receipt PDF</span>
                  </button>
                ) : (
                  <Link
                    href="/client/payments"
                    className="w-full bg-[#DC2626] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-full text-xs transition-colors flex items-center justify-center gap-2 block text-center"
                  >
                    <span>Proceed to Pay {selectedInvoice.amountFormatted}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <ClientFooter />
        </main>

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <InvoicesContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
