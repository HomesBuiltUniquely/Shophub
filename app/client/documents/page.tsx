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
import { DownloadIcon } from '../icons/ClientIcons';

function DocumentsContent() {
  const { data, isLoading, openContactModal } = useClientDashboard();
  const profile = data.profile;
  const summary = data.paymentSummary;

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; size: string; date: string }>>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  const documents = [
    {
      id: 'doc-quote',
      title: 'Quotation Q-53993-019 (Final Sign-off)',
      category: 'financial',
      categoryLabel: 'Quotation & Financial',
      fileName: 'CLIENT_QUOTATION_Q-53993-019.pdf',
      fileSize: '4.8 MB',
      updatedAt: 'Oct 12, 2026',
      status: 'Approved',
      url: summary?.quoteUrl || 'https://design.hubinterior.com/quote/75774',
      isExternal: true,
      description: 'Official verified quotation with itemized room specifications and finishes.',
    },
    {
      id: 'doc-floorplan',
      title: 'Architectural Floor Plan & Civil Layout',
      category: 'drawings',
      categoryLabel: 'Drawings & Design',
      fileName: 'Purva_Palm_Beach_3BHK_FloorPlan.pdf',
      fileSize: '6.2 MB',
      updatedAt: 'Oct 12, 2026',
      status: 'Verified',
      url: 'https://hows.hubinterior.com/v1/public/floor-plan/800f754e-cde7-4ebc-bc82-29467ad15257',
      isExternal: true,
      description: '2D CAD layout and architectural dimensions for Purva Palm Beach 3 BHK.',
    },
    {
      id: 'doc-dqc1',
      title: 'DQC1 Submission & Design Review DWG',
      category: 'drawings',
      categoryLabel: 'Drawings & Design',
      fileName: 'DQC1_Submission_DWG_99903.pdf',
      fileSize: '8.4 MB',
      updatedAt: 'Oct 12, 2026',
      status: 'Approved',
      url: summary?.quoteUrl || 'https://design.hubinterior.com/quote/75774',
      isExternal: true,
      description: 'Completed within 48 hrs from D1 documents. Approved by Design Quality Cell.',
    },
    {
      id: 'doc-agreement',
      title: 'Master Interior Execution Works Contract',
      category: 'contracts',
      categoryLabel: 'Contracts & Legal',
      fileName: 'HUB_Master_Agreement_99903.pdf',
      fileSize: '2.1 MB',
      updatedAt: 'Oct 12, 2026',
      status: 'Active',
      url: '/client/agreements',
      isExternal: false,
      description: 'Executed client agreement with 45-day move-in and 10-year warranty clauses.',
    },
    {
      id: 'doc-receipt-bkg',
      title: '10% Booking Token Official GST Receipt',
      category: 'financial',
      categoryLabel: 'Quotation & Financial',
      fileName: 'Receipt_REC-99903-BKG.pdf',
      fileSize: '1.2 MB',
      updatedAt: 'Oct 12, 2026',
      status: 'Paid',
      url: '/client/invoices',
      isExternal: false,
      description: 'Tax receipt for ₹1,33,395 booking advance confirmation.',
    },
    {
      id: 'doc-mmt',
      title: 'D1 Site Measurement Survey Report',
      category: 'drawings',
      categoryLabel: 'Drawings & Design',
      fileName: 'D1_Site_Measurement_Sheet.pdf',
      fileSize: '3.5 MB',
      updatedAt: 'Oct 12, 2026',
      status: 'Completed',
      url: summary?.quoteUrl || 'https://design.hubinterior.com/quote/75774',
      isExternal: true,
      description: 'Physical site measurements, beam depths, and plumbing/electrical point markings.',
    },
  ];

  const filteredDocs = activeCategory === 'all'
    ? documents
    : documents.filter((d) => d.category === activeCategory);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;
    setUploadedDocs((prev) => [
      ...prev,
      {
        name: uploadFileName.endsWith('.pdf') ? uploadFileName : `${uploadFileName}.pdf`,
        size: '1.5 MB',
        date: 'Just now',
      },
    ]);
    setUploadFileName('');
    setShowUploadModal(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em]">
                  PROJECT VAULT
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                Documents & Files
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Access your CAD floor plans, verified quotations, tax invoices, and legal contracts anytime.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="bg-black hover:bg-zinc-800 text-white font-extrabold text-xs px-5 py-3 rounded-full transition-all shrink-0 self-start sm:self-auto flex items-center gap-2"
            >
              <span>+ Upload Document</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            {[
              { id: 'all', label: 'All Documents' },
              { id: 'drawings', label: 'Drawings & Design' },
              { id: 'financial', label: 'Quotation & Financial' },
              { id: 'contracts', label: 'Contracts & Legal' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:text-black border border-black/[0.04]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-[26px] p-6 shadow-sm border border-black/[0.04] flex flex-col justify-between space-y-4 hover:shadow-md transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                      {doc.categoryLabel}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        doc.status === 'Approved' || doc.status === 'Paid' || doc.status === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] border border-gray-200 flex items-center justify-center text-red-600 font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                      PDF
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-[#DC2626] transition-colors line-clamp-1">
                        {doc.title}
                      </h3>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {doc.fileName} • {doc.fileSize}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {doc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">{doc.updatedAt}</span>
                  {doc.isExternal ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-black hover:text-[#DC2626] flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Document</span>
                      <span>↗</span>
                    </a>
                  ) : (
                    <Link
                      href={doc.url}
                      className="font-bold text-black hover:text-[#DC2626] flex items-center gap-1.5 transition-colors"
                    >
                      <span>View File</span>
                      <span>→</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Custom Uploaded Documents */}
            {uploadedDocs.map((doc, idx) => (
              <div
                key={`up-${idx}`}
                className="bg-white rounded-[26px] p-6 shadow-sm border border-emerald-100 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 font-mono">
                      Client Upload
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Uploaded
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                      DOC
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-950">
                        {doc.name}
                      </h3>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {doc.size} • {doc.date}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Uploaded by client for design team review.
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100 text-xs text-emerald-700 font-bold">
                  ✓ Available to Designer Seher & RM Sharanya
                </div>
              </div>
            ))}
          </div>

          <ClientFooter />
        </main>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-[32px] p-7 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-950">Upload Project Document</h3>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                <p className="text-gray-500">
                  Upload key handover documents, site electricity layout, or customization reference files.
                </p>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Document Title / File Name
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder="E.g. Purva_Palm_Beach_Possession_Letter.pdf"
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400 hover:border-gray-400 transition-colors cursor-pointer">
                  <div className="font-bold text-gray-700 mb-1">Click to browse or drop file here</div>
                  <div className="text-[11px]">PDF, PNG, JPG, CAD DWG up to 25MB</div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2.5 rounded-full text-gray-500 font-bold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-black hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-full"
                  >
                    Upload File
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <DocumentsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
