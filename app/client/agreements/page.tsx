'use client';

import React, { Suspense } from 'react';
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
import { DownloadIcon, CheckCircleIcon } from '@/components/client/icons/ClientIcons';

function AgreementsContent() {
  const { data, isLoading, openContactModal } = useClientDashboard();
  const profile = data.profile;
  const summary = data.paymentSummary;

  const totalValueFormatted = summary?.totalQuotationValueFormatted || '₹13,33,946';

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
                LEGAL & COMPLIANCE
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Project {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Project Agreements & Contracts
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Legally binding design & interior works contract, service-level commitments, and move-in timeline guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
            {/* Left 8 Columns: Agreement Document Viewer */}
            <div className="lg:col-span-8 bg-white rounded-[28px] p-8 sm:p-10 shadow-sm border border-black/[0.04] space-y-8">
              {/* Document Header */}
              <div className="border-b border-gray-100 pb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                    DOC ID: HUB-AGR-99903-2026
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-950 mt-1">
                    Master Interior Works & Execution Agreement
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Executed on Oct 12, 2026 • Valid through Project Completion & 10-Year Warranty
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-full bg-[#FAF7F2] hover:bg-[#F2ECE1] text-xs font-bold text-gray-800 transition-colors flex items-center gap-2 shrink-0"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Contracting Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF7F2] rounded-2xl p-5 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                    SERVICE PROVIDER
                  </div>
                  <div className="font-extrabold text-gray-950 text-sm">
                    HUB Interior Solutions Pvt. Ltd.
                  </div>
                  <div className="text-gray-600">
                    4th Floor, Salarpuria Citadel, Hosur Road, Bangalore, Karnataka - 560068
                  </div>
                  <div className="text-gray-500 font-mono">GSTIN: 29AABCH4932F1ZY</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                    CLIENT / PROPERTY OWNER
                  </div>
                  <div className="font-extrabold text-gray-950 text-sm">
                    {profile?.name || 'Client S'}
                  </div>
                  <div className="text-gray-600">
                    {profile?.propertyDetails || 'Purva Palm Beach, Bangalore • 560001'}
                  </div>
                  <div className="text-gray-500 font-mono">
                    Project Code: {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
                  </div>
                </div>
              </div>

              {/* Scope & Contract Articles */}
              <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                <div>
                  <h3 className="font-bold text-gray-950 text-base mb-2">
                    1. Scope of Work & Quotation Value
                  </h3>
                  <p className="text-xs text-gray-600">
                    HUB agrees to manufacture, supply, and install modular cabinetry, woodwork, and associated interior works for the property specified above, strictly adhering to the finalized 3D architectural drawings and approved Quotation <strong>#{summary?.quoteId || '75774'} ({summary?.quoteNum || 'Q-53993-019'})</strong>. The total works contract value is fixed at <strong>{totalValueFormatted}</strong> (inclusive of factory finishing, logistics, labor, and applicable GST).
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-950 text-base mb-2">
                    2. Milestone Payment Schedule (10% - 10% - 40% - 40%)
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                      <span><strong>Milestone 1 (10%):</strong> Booking Closure Advance</span>
                      <span className="font-bold text-emerald-700">₹{summary?.alreadyPaidFormatted || '₹1,33,395'} (Paid)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                      <span><strong>Milestone 2 (10%):</strong> Design Module Advance after DQC1 first-cut review</span>
                      <span className="font-bold text-[#DC2626]">₹{summary?.amountToCollectNowFormatted || '₹1,33,395'} (Active Due)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                      <span><strong>Milestone 3 (40%):</strong> Final Design Freeze & Production Clearance (DQC2)</span>
                      <span className="font-bold text-gray-800">₹5,33,578 (Upon Sign-off)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                      <span><strong>Milestone 4 (40%):</strong> Factory Dispatch & On-Site Handover</span>
                      <span className="font-bold text-gray-800">₹5,33,578 (On Handover)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-950 text-base mb-2">
                    3. 45-Day Move-in Guarantee
                  </h3>
                  <p className="text-xs text-gray-600">
                    HUB guarantees on-site installation and completion within 45 working days following the 60% cumulative payment sign-off and site readiness verification. Any delay attributable solely to HUB will incur a compensation of ₹1,000 per day of delay.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-950 text-base mb-2">
                    4. 10-Year Warranty Commitment
                  </h3>
                  <p className="text-xs text-gray-600">
                    All modular cabinetry fabricated using BWP plywood comes with a 10-year warranty against borer, termite, and delamination. Hardware fittings (Hettich / Hafele) carry the manufacturer’s 5-year soft-close mechanism warranty.
                  </p>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                  <div className="text-[11px] font-bold uppercase text-gray-400">
                    AUTHORIZED HUB SIGNATORY
                  </div>
                  <div className="h-10 flex items-center">
                    <span className="font-serif italic text-lg text-gray-800">Sharanya C.</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-900">
                    Sharanya (Relationship Manager)
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Digitally signed • Oct 12, 2026 14:30 IST
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                  <div className="text-[11px] font-bold uppercase text-gray-400">
                    CLIENT ACCEPTANCE
                  </div>
                  <div className="h-10 flex items-center">
                    <span className="font-serif italic text-lg text-gray-800">{profile?.name || 'Client S'}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-900">
                    {profile?.name || 'Client S'}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Authenticated via go@hubinterior.com
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Contract Summary & Action Cards */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-black/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Agreement Active & Bound
                  </span>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Contract Value</span>
                    <span className="font-bold text-gray-950">{totalValueFormatted}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Quote Version</span>
                    <span className="font-bold text-gray-950">{summary?.quoteNum || 'Q-53993-019'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Current Phase</span>
                    <span className="font-bold text-[#DC2626]">10% Payment & D2 Masking</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Execution Timeline</span>
                    <span className="font-bold text-gray-950">45 Working Days</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full bg-black hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-full text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download Signed PDF</span>
                  </button>
                </div>
              </div>

              {/* Need Clarifications Card */}
              <div className="bg-[#FAF7F2] rounded-[24px] p-6 border border-[#EAE5DA] space-y-3 text-xs">
                <h4 className="font-bold text-gray-950 text-sm">Need Clause Clarifications?</h4>
                <p className="text-gray-600">
                  Your Relationship Manager Sharanya can answer any questions regarding project timelines, material specifications, or warranty terms.
                </p>
                <button
                  type="button"
                  onClick={openContactModal}
                  className="font-bold text-black hover:underline block pt-1"
                >
                  Contact RM Sharanya →
                </button>
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

export default function AgreementsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <AgreementsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
