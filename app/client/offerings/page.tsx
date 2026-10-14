'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientDashboardProvider, useClientDashboard } from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';
import type { SavedOfferingRow } from '@/lib/client/saved-offerings';

function OfferingCard({ offering }: { offering: SavedOfferingRow }) {
  const router = useRouter();
  const imageUrl = offering.imageUrl && !offering.imageUrl.includes('example.com') ? offering.imageUrl : undefined;
  const price = offering.unitPrice ?? 0;
  const category = offering.category || offering.room || 'Selected for you';

  return (
    <button
      type="button"
      onClick={() => {
        const id = String(offering.prodId || offering.skuId || offering.id || '').trim();
        if (!id) return;
        router.push(`/client/offerings/detail?id=${encodeURIComponent(id)}`);
      }}
      className="text-left bg-white rounded-[24px] border border-black/[0.04] shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="h-44 bg-[#F4EFE6] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={offering.offeringName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-black text-gray-400">
            {(offering.offeringName || 'PR').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 mb-1.5">
          {category}
        </div>
        <h3 className="text-base font-extrabold text-gray-950 tracking-tight line-clamp-2">
          {offering.offeringName}
        </h3>
        <p className="text-xs text-gray-500 mt-1 font-mono">{offering.skuId || 'SKU pending'}</p>
        <div className="mt-4 text-lg font-black text-gray-950">
          ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </div>
    </button>
  );
}

function ClientOfferingsContent() {
  const { data, isLoading: dashLoading } = useClientDashboard();
  const [items, setItems] = useState<SavedOfferingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (dashLoading) return;
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (data.profile?.leadId) params.set('leadId', String(data.profile.leadId));
    if (data.profile?.clientId) params.set('clientId', String(data.profile.clientId));
    if (data.profile?.email) params.set('email', data.profile.email);
    if (data.profile?.phone) params.set('phone', data.profile.phone);
    fetch(`/api/client/saved-offerings?${params.toString()}`, { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dashLoading, data.profile?.leadId, data.profile?.clientId, data.profile?.email, data.profile?.phone]);

  const offerings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.offeringName.toLowerCase().includes(q) ||
        String(item.skuId || '').toLowerCase().includes(q) ||
        String(item.category || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader
          pageTitle="Offerings"
          searchPlaceholder="Search my offerings..."
          onSearch={setSearch}
        />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          <div className="mb-8">
            <div className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em] mb-1.5">
              Selected for you
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Your Offerings
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Products your designer saved for this project in the Quote Engine.
            </p>
          </div>

          {isLoading && offerings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <p className="mt-3 text-sm font-semibold text-gray-500">Loading your offerings...</p>
            </div>
          )}

          {!isLoading && offerings.length === 0 && (
            <div className="bg-white rounded-[24px] border border-black/[0.04] px-8 py-16 text-center">
              <h3 className="text-base font-extrabold text-gray-950">No offerings saved yet</h3>
              <p className="text-sm text-gray-500 mt-2">
                When your designer saves products for you in Quote Engine, they will appear here.
              </p>
            </div>
          )}

          {offerings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {offerings.map((offering) => (
                <OfferingCard key={`${offering.prodId}-${offering.id}`} offering={offering} />
              ))}
            </div>
          )}

          <ClientFooter />
        </main>

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function ClientOfferingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <ClientOfferingsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
