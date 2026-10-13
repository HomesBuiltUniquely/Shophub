'use client';

import React, { Suspense, useState } from 'react';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import PaymentSummaryCard from '@/components/client/dashboard/PaymentSummaryCard';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';

function PaymentsContent() {
  const { data, isLoading } = useClientDashboard();
  const summary = data.paymentSummary;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      {/* Client Sidebar */}
      <ClientSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <ClientHeader />

        {/* Payments Main Body */}
        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em]">
                FINANCIAL OVERVIEW
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {summary?.quoteNum || 'Q-53993-001'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Payments & Milestone Schedule
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Track your quotation value, verified paid milestones, and your remaining project balance.
            </p>
          </div>

          {/* 3 Financial Stat Pills (Amount Due Now removed per requirement) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Total Quotation Value
              </div>
              <div className="text-2xl font-black text-gray-950 mt-2">
                {summary?.totalQuotationValueFormatted || '₹0'}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {summary?.quoteId ? `Latest quote #${summary.quoteId}` : 'Awaiting Quotation'}
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Already Paid
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {summary?.alreadyPaidFormatted || '₹0'}
              </div>
              <div className="text-[11px] text-emerald-700/80 font-medium mt-1">
                ✓ {Math.round(((summary?.alreadyPaid || 0) / (summary?.totalQuotationValue || 1)) * 100)}% cumulative cleared across milestones
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Remaining Balance
              </div>
              <div className="text-2xl font-black text-gray-950 mt-2">
                {summary?.remainingBalanceFormatted || '₹0'}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Payable across upcoming stages
              </div>
            </div>
          </div>

          {/* Dynamic Milestones Math for 10% / 10% / 40% / 40% */}
          {(() => {
            const totalVal = summary?.totalQuotationValue || 0;
            const m1 = Math.round(totalVal * 0.10);
            const m2 = Math.round(totalVal * 0.10);
            const m3 = Math.round(totalVal * 0.40);
            const m4 = totalVal - m1 - m2 - m3;

            const m1Str = `₹${m1.toLocaleString('en-IN')}`;
            const m2Str = `₹${m2.toLocaleString('en-IN')}`;
            const m3Str = `₹${m3.toLocaleString('en-IN')}`;
            const m4Str = `₹${m4.toLocaleString('en-IN')}`;

            const alreadyPaidNum = summary?.alreadyPaid ?? 0;
            const isM1Done = totalVal > 0 && alreadyPaidNum >= m1 - 50;
            const isM2Done = totalVal > 0 && alreadyPaidNum >= m1 + m2 - 50;
            const isM3Done = totalVal > 0 && alreadyPaidNum >= m1 + m2 + m3 - 100;
            const isM4Done = totalVal > 0 && alreadyPaidNum >= totalVal - 50;

            const rmName = data.team?.relationshipManager?.name || 'Sharanya';
            const rmPhone = data.team?.relationshipManager?.phone || '+91 87550 09932';
            const projectCode = data.profile?.projectCode || data.profile?.clientId || '';
            const cleanPhone = rmPhone.replace(/[^0-9]/g, '');
            const quoteUrl =
              summary?.quoteUrl ||
              (summary?.quoteId ? `https://design.hubinterior.com/quote/${summary.quoteId}` : undefined);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
                {/* Left 7 Columns: Milestone Payment Summary Card + Project Milestone Payment Cycle */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white rounded-[28px] p-6 sm:p-7 shadow-sm border border-black/[0.04]">
                    <div className="mb-4">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        MILESTONE BREAKDOWN
                      </span>
                      <h3 className="text-lg font-bold text-gray-950 mt-0.5">
                        Quotation & Payment Summary
                      </h3>
                    </div>

                    <PaymentSummaryCard summary={summary} showActions={true} />
                  </div>

                  {/* 4-Stage Payment Milestone Cycle */}
                  <div className="bg-white rounded-[28px] p-6 sm:p-7 shadow-sm border border-black/[0.04]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-950 tracking-tight">
                        Project Milestone Payment Cycle
                      </h3>
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        Quote ₹{totalVal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Step 1: 10% Booking Closure */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            ✓
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">
                              Milestone 1: Booking Closure (10%)
                            </div>
                            <div className="text-[11px] text-emerald-700">
                              Paid at sales level to confirm booking
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-extrabold text-emerald-700">
                            {m1Str}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-emerald-600">
                            Completed
                          </div>
                        </div>
                      </div>

                      {/* Step 2: 10% Design Advance */}
                      <div
                        className={`flex items-center justify-between p-3.5 rounded-2xl ${
                          isM2Done
                            ? 'bg-emerald-50/60 border border-emerald-100'
                            : 'bg-red-50/60 border border-red-200 ring-1 ring-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isM2Done ? 'bg-emerald-600 text-white' : 'bg-[#EF0101] text-white'
                            }`}
                          >
                            {isM2Done ? '✓' : '2'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">
                              Milestone 2: Design Advance (10%)
                            </div>
                            <div className={`text-[11px] ${isM2Done ? 'text-emerald-700' : 'text-red-700'}`}>
                              {isM2Done ? 'Paid & verified after DQC1 design review' : 'Due after DQC1 first-cut sign-off'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-extrabold ${
                              isM2Done ? 'text-emerald-700' : 'text-[#EF0101]'
                            }`}
                          >
                            {m2Str}
                          </div>
                          <div
                            className={`text-[10px] uppercase font-extrabold ${
                              isM2Done ? 'text-emerald-600' : 'text-[#EF0101]'
                            }`}
                          >
                            {isM2Done ? 'Completed' : 'Due Now'}
                          </div>
                        </div>
                      </div>

                      {/* Step 3: 40% Final Design Sign-off */}
                      <div
                        className={`flex items-center justify-between p-3.5 rounded-2xl ${
                          isM3Done
                            ? 'bg-emerald-50/60 border border-emerald-100'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isM3Done ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {isM3Done ? '✓' : '3'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">
                              Milestone 3: Final Design Sign-off (40%)
                            </div>
                            <div className={`text-[11px] ${isM3Done ? 'text-emerald-700' : 'text-gray-400'}`}>
                              {isM3Done
                                ? 'Brings cumulative cleared payments to 60% before production'
                                : 'Brings cumulative payments to 60% after DQC2'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-bold ${
                              isM3Done ? 'text-emerald-700 font-extrabold' : 'text-gray-600'
                            }`}
                          >
                            {m3Str}
                          </div>
                          <div
                            className={`text-[10px] uppercase font-semibold ${
                              isM3Done ? 'text-emerald-600 font-bold' : 'text-gray-400'
                            }`}
                          >
                            {isM3Done ? 'Completed' : 'Upcoming'}
                          </div>
                        </div>
                      </div>

                      {/* Step 4: 40% Execution & Handover */}
                      <div
                        className={`flex items-center justify-between p-3.5 rounded-2xl ${
                          isM4Done
                            ? 'bg-emerald-50/60 border border-emerald-100'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isM4Done ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {isM4Done ? '✓' : '4'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-600">
                              Milestone 4: Execution & Handover (40%)
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Remaining project balance during site installation & handover
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-gray-600">
                            {m4Str}
                          </div>
                          <div className="text-[10px] uppercase font-semibold text-gray-400">
                            {isM4Done ? 'Completed' : 'Upcoming'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Verified Corporate Billing & Payment Gateway */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Online Payment Card */}
                  <div className="bg-white rounded-[28px] p-6 sm:p-7 shadow-sm border border-black/[0.04]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-extrabold text-gray-950 tracking-tight">
                        Instant Online Payment
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        SECURE 256-BIT
                      </span>
                    </div>

                    {summary?.amountToCollectNow && summary.amountToCollectNow > 0 ? (
                      <>
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                          Pay instantly via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or Net Banking with automated receipt generation.
                        </p>

                        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#DDCDC1]/60 mb-5 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                              Amount to Pay
                            </div>
                            <div className="text-xl font-black text-[#EF0101]">
                              {summary?.amountToCollectNowFormatted}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-600 font-mono">
                            {summary?.quoteNum || 'Q-52330-003'}
                          </span>
                        </div>

                        <a
                          href="https://pay.easebuzz.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-black hover:bg-zinc-800 text-white font-bold text-xs py-3.5 px-4 rounded-full transition-all shadow-sm flex items-center justify-center gap-2 no-underline cursor-pointer"
                        >
                          <span>Pay Now with Easebuzz</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 mb-5 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                              Stage Payment Status
                            </div>
                            <div className="text-base font-black text-emerald-700 mt-0.5">
                              All Stage Dues Cleared (60% Paid)
                            </div>
                            <div className="text-[11px] text-emerald-700/90 mt-0.5">
                              Next milestone due on factory production dispatch
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-800 font-mono bg-white px-2 py-1 rounded-md border border-emerald-200">
                            {summary?.quoteNum || 'Q-52330-003'}
                          </span>
                        </div>

                        <a
                          href={quoteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-black hover:bg-zinc-800 text-white font-bold text-xs py-3.5 px-4 rounded-full transition-all shadow-sm flex items-center justify-center gap-2 no-underline cursor-pointer"
                        >
                          <span>View Approved Quotation</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </a>
                      </>
                    )}
                  </div>

                  {/* Standard Verified Corporate Billing Account (Requirement 3.d) */}
                  <div className="bg-white rounded-[28px] p-6 sm:p-7 shadow-sm border border-black/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-extrabold text-gray-950 tracking-tight">
                        Corporate Bank Transfer (RTGS / NEFT)
                      </h3>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        OFFICIAL ACCOUNT
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      Official verified company banking details for electronic fund transfers:
                    </p>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">Beneficiary Name</span>
                        <span className="font-bold text-gray-900 text-right">HUB INTERIOR PRIVATE LIMITED</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">Account Type</span>
                        <span className="font-bold text-gray-900">Current Corporate Account</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">Bank & Branch</span>
                        <span className="font-bold text-gray-900">ICICI Bank Ltd, Indiranagar, BLR</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">Account Number</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-950">000205031948</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('000205031948', 'acc')}
                            className="text-[10px] font-bold text-gray-500 hover:text-black uppercase px-1.5 py-0.5 rounded bg-gray-200/60 hover:bg-gray-300 transition-colors cursor-pointer"
                          >
                            {copiedField === 'acc' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">IFSC Code</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-950">ICIC0000002</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('ICIC0000002', 'ifsc')}
                            className="text-[10px] font-bold text-gray-500 hover:text-black uppercase px-1.5 py-0.5 rounded bg-gray-200/60 hover:bg-gray-300 transition-colors cursor-pointer"
                          >
                            {copiedField === 'ifsc' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">Corporate UPI VPA</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-900">hubinteriors@icici</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('hubinteriors@icici', 'vpa')}
                            className="text-[10px] font-bold text-gray-500 hover:text-black uppercase px-1.5 py-0.5 rounded bg-gray-200/60 hover:bg-gray-300 transition-colors cursor-pointer"
                          >
                            {copiedField === 'vpa' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                        <div>
                          <span className="text-amber-900 font-semibold block">Project Reference Code</span>
                          <span className="text-[10px] text-amber-700">Add in transfer narration for auto-credit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#DC2626] bg-white px-2 py-0.5 rounded border border-amber-200">
                            {projectCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(projectCode, 'ref')}
                            className="text-[10px] font-bold text-amber-900 hover:text-black uppercase px-1.5 py-0.5 rounded bg-amber-200/60 hover:bg-amber-300 transition-colors cursor-pointer"
                          >
                            {copiedField === 'ref' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                        <span className="text-gray-500">Corporate GSTIN</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-800">29AABCH4938K1Z7</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('29AABCH4938K1Z7', 'gst')}
                            className="text-[10px] font-bold text-gray-500 hover:text-black uppercase px-1.5 py-0.5 rounded bg-gray-200/60 hover:bg-gray-300 transition-colors cursor-pointer"
                          >
                            {copiedField === 'gst' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RM Verification & UTR Submission */}
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="text-[11px] text-gray-600 leading-snug">
                        Transferred via NEFT/RTGS? Share your UTR receipt with RM ({rmName}) for immediate credit.
                      </div>
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hi ${rmName}, I have initiated a payment transfer for Project ${projectCode}. Here is my UTR receipt:`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 no-underline shadow-2xs"
                      >
                        <span>Share UTR on WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Footer */}
          <ClientFooter />
        </main>

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function ClientPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-gray-500">
              Loading payment schedule...
            </span>
          </div>
        </div>
      }
    >
      <ClientDashboardProvider>
        <PaymentsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
