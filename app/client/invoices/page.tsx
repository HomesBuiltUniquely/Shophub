'use client';

import React, { Suspense, useEffect, useState } from 'react';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';
import type { OfferingsInvoiceSummary } from '@/lib/quote/invoice.types';

function inr(amount?: number) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InvoicesContent() {
  const user = useCurrentUser();
  const { data, leadId } = useClientDashboard();
  const [invoices, setInvoices] = useState<OfferingsInvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (leadId) params.set('leadId', leadId);
    if (data.profile.clientId) params.set('clientId', data.profile.clientId);
    if (data.profile.name || user?.name) params.set('name', data.profile.name || user?.name || '');
    fetch(`/api/quote/invoices?${params.toString()}`, { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Unable to load invoices'))))
      .then((payload) => {
        if (!cancelled) setInvoices(Array.isArray(payload?.invoices) ? payload.invoices : []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Unable to load invoices');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, data.profile.clientId, data.profile.name, user?.name]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader pageTitle="My Hub" searchPlaceholder="Search invoices..." />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto space-y-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
              Invoices
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl font-normal">
              Invoices from your catalog selections, plus invoices created for you by sales or design.
            </p>
          </div>

          <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-black/[0.04] shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-gray-900">
                Offerings invoices
              </h2>
              <span className="bg-black text-white text-xs font-bold px-3 py-0.5 rounded-full">
                {invoices.length}
              </span>
            </div>

            {isLoading && (
              <p className="text-sm text-gray-500 py-10 text-center">Loading invoices…</p>
            )}

            {!isLoading && error && (
              <p className="text-sm text-red-600 py-10 text-center">{error}</p>
            )}

            {!isLoading && !error && invoices.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-lg font-extrabold text-gray-950 tracking-tight">No invoices yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  When a designer generates an offerings invoice, it will appear here.
                </p>
              </div>
            )}

            {!isLoading && invoices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[840px]">
                  <thead>
                    <tr className="bg-[#FAF7F2] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 pl-5 pr-3 rounded-l-xl">Invoice #</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Items</th>
                      <th className="py-3 px-3">From</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 pr-5 rounded-r-xl text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80 text-sm">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-[#FAF7F2]/40">
                        <td className="py-4 pl-5 pr-3 font-bold text-gray-950 whitespace-nowrap">
                          {invoice.quoteNumber}
                        </td>
                        <td className="py-4 px-3 text-gray-600 font-medium whitespace-nowrap">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="py-4 px-3 text-gray-700">{invoice.customerName || '—'}</td>
                        <td className="py-4 px-3 text-gray-700">{invoice.projectName || '—'}</td>
                        <td className="py-4 px-3 text-gray-600">{invoice.itemCount ?? 0}</td>
                        <td className="py-4 px-3 text-gray-700 whitespace-nowrap">
                          {invoice.source === 'client' ? 'Your selection' : invoice.issuedBy || 'Designer'}
                        </td>
                        <td className="py-4 px-3 font-bold text-gray-950 whitespace-nowrap">
                          {inr(invoice.grandTotal)}
                        </td>
                        <td className="py-4 pr-5 text-right">
                          <a
                            href={`/quote-invoice?s=${encodeURIComponent(invoice.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 px-3.5 py-2 rounded-full"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        <ClientFooter />
      </div>

      <ContactRmModal />
      <FloatingSupportChat />
    </div>
  );
}

export default function ClientInvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-500">Loading invoices...</span>
        </div>
      }
    >
      <ClientDashboardProvider>
        <InvoicesContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
