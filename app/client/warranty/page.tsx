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
import { DownloadIcon, StepShieldIcon } from '../icons/ClientIcons';

function WarrantyContent() {
  const { data, isLoading, openContactModal } = useClientDashboard();
  const profile = data.profile;
  const summary = data.paymentSummary;

  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimText, setClaimText] = useState('');

  const warrantyItems = [
    {
      id: 'war-1',
      title: '10-Year Core Modular Woodwork Warranty',
      coverage: 'BWP & BWR Plywood Carcass & Internal Cabinets',
      details: 'Covers borer, termite infestations, core rotting, and structural delamination under normal residential usage conditions.',
      duration: '10 Years',
      status: 'Active & Guaranteed',
    },
    {
      id: 'war-2',
      title: '5-Year Hardware Mechanism Warranty',
      coverage: 'Hettich / Hafele Soft-Close Hinges & Tandem Drawers',
      details: 'Full replacement guarantee on hydraulic soft-close hinges, drawer channels, lift-ups, and pull-out mechanisms against functional mechanical defects.',
      duration: '5 Years',
      status: 'Active & Guaranteed',
    },
    {
      id: 'war-3',
      title: '1-Year Workmanship & Finish Warranty',
      coverage: 'Surface Finishes, Edge Banding & Silicone Sealing',
      details: 'Covers edge-banding adhesion, acrylic/laminate surface bonding, quartz joint sealants, and installation alignment calibration.',
      duration: '1 Year',
      status: 'Active & Guaranteed',
    },
    {
      id: 'war-4',
      title: 'Complimentary Annual Health Check-Up',
      coverage: 'On-Site Maintenance Visits',
      details: '3 complimentary annual maintenance visits by certified HUB technicians to inspect drawer alignments, hinge lubrication, and tighten hardware.',
      duration: '3 Years (3 Visits)',
      status: 'Included Free',
    },
  ];

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
                PEACE OF MIND GUARANTEE
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Certificate HUB-WAR-99903
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              10-Year Comprehensive Warranty
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Certified coverage safeguarding your modular kitchen, wardrobes, hardware, and woodwork against manufacturing defects.
            </p>
          </div>

          {/* Certificate Banner Card */}
          <div className="bg-gradient-to-br from-black via-zinc-900 to-black text-white rounded-[32px] p-8 sm:p-10 mb-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15),transparent)] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[11px] tracking-wider uppercase border border-emerald-500/30">
                    CERTIFICATE ISSUED & ACTIVE
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    ID: HUB-WAR-99903-2026
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  HUB 10-Year Warranty Protection
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Issued to <strong>{profile?.name || 'Client S'}</strong> for the interior project at{' '}
                  <strong>{profile?.propertyDetails || 'Purva Palm Beach, Bangalore'}</strong> (Project Code: {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}).
                  Covers all factory woodwork detailed in Quotation #{summary?.quoteId || '75774'} ({summary?.quoteNum || 'Q-53993-019'}).
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white hover:bg-zinc-100 text-black font-extrabold text-xs px-5 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download Certificate PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(true)}
                  className="bg-[#DC2626] hover:bg-red-700 text-white font-extrabold text-xs px-5 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Request Warranty Service</span>
                </button>
              </div>
            </div>
          </div>

          {/* Warranty Coverage Cards */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-950 mb-4">Coverage Tiers & Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {warrantyItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[26px] p-6 shadow-sm border border-black/[0.04] flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                        {item.coverage}
                      </span>
                      <span className="text-xs font-black text-black bg-[#FAF7F2] px-3 py-1 rounded-full border border-gray-200">
                        {item.duration}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-gray-950">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.details}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {item.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowClaimModal(true)}
                      className="text-gray-500 hover:text-black font-semibold"
                    >
                      Raise Service →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to Claim Warranty Section */}
          <div className="bg-white rounded-[28px] p-8 shadow-sm border border-black/[0.04] mb-8">
            <h3 className="text-base font-extrabold text-gray-950 mb-3">
              How Does Warranty Support Work?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-600">
              <div className="space-y-1.5 p-4 rounded-2xl bg-[#FAF7F2]">
                <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <div className="font-bold text-gray-900 text-sm">Raise a Request</div>
                <p>Click "Request Warranty Service" or contact your Relationship Manager Sharanya with a quick photo or description.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-[#FAF7F2]">
                <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <div className="font-bold text-gray-900 text-sm">48-Hr Technician Visit</div>
                <p>A certified HUB service engineer visits your home within 48 hours for an inspection and diagnosis.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-[#FAF7F2]">
                <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <div className="font-bold text-gray-900 text-sm">Zero-Cost Resolution</div>
                <p>Parts and repair are covered with 100% zero labor or component charges under your active warranty plan.</p>
              </div>
            </div>
          </div>

          <ClientFooter />
        </main>

        {/* Claim Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-[32px] p-7 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-950">Raise Warranty Service Request</h3>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {claimSubmitted ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-base font-extrabold text-gray-950">Service Ticket Raised!</h4>
                  <p className="text-xs text-gray-500">
                    Ticket #TK-99903-WAR has been logged. RM Sharanya and your site team will reach out within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setClaimSubmitted(false);
                      setShowClaimModal(false);
                    }}
                    className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <p className="text-gray-500">
                    Describe the issue with your modular units or hardware (e.g. hinge squeak, drawer alignment, shutter adjustment).
                  </p>
                  <textarea
                    rows={4}
                    value={claimText}
                    onChange={(e) => setClaimText(e.target.value)}
                    placeholder="E.g., Kitchen drawer channel needs lubrication or soft-close adjustment..."
                    className="w-full p-3.5 rounded-2xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowClaimModal(false)}
                      className="px-4 py-2.5 rounded-full text-gray-500 font-bold hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaimSubmitted(true)}
                      className="bg-black hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-full"
                    >
                      Submit Service Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function WarrantyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <WarrantyContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
