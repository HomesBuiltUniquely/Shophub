'use client';

import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import { useAuthSession } from '@/lib/auth/useCurrentUser';
import { QuoteCustomer, QuoteProject } from '@/lib/api/leads.service';
import type { OfferingsSubmittedOrder } from '@/lib/client/offerings-order';
import type { OfferingDraftItem } from '@/lib/client/offeringsDraftStore';
import { identitiesOverlap } from '@/lib/client/offering-identity';

const fmt = (n?: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function OfferingInvoiceContent() {
  const { user, loading: authLoading } = useAuthSession();
  const searchParams = useSearchParams();

  // Customer Context State (consistent with Quote Engine)
  const [customers, setCustomers] = useState<QuoteCustomer[]>([]);
  const [projects, setProjects] = useState<QuoteProject[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'ALL'>('ALL');
  const [clientQuery, setClientQuery] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  // Orders State
  const [orders, setOrders] = useState<OfferingsSubmittedOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'REVIEWED'>('ALL');

  // Load Customers & Projects from /api/quote/bucket
  useEffect(() => {
    if (authLoading) return;

    const loadContext = async () => {
      try {
        setIsLoadingContext(true);
        const res = await fetch('/api/quote/bucket');
        const bucketData: { customers: QuoteCustomer[]; projects: QuoteProject[] } = res.ok
          ? await res.json()
          : { customers: [], projects: [] };

        const custs = bucketData.customers || [];
        setCustomers(custs);
        setProjects(bucketData.projects || []);

        const paramLeadId = searchParams?.get('leadId') ? Number(searchParams.get('leadId')) : null;
        if (paramLeadId) {
          const match = custs.find((c) => c.id === paramLeadId);
          if (match) setSelectedCustomerId(match.id);
        } else if (custs.length > 0) {
          // Default to first customer (e.g. Client QK-KJT5T5P7EF)
          setSelectedCustomerId(custs[0].id);
        }
      } catch (err) {
        console.error('Failed to load customer bucket:', err);
      } finally {
        setIsLoadingContext(false);
      }
    };

    loadContext();
  }, [authLoading, searchParams]);

  // Fetch Submitted Orders
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      const params = new URLSearchParams();

      if (selectedCustomerId !== 'ALL') {
        const cust = customers.find((c) => c.id === selectedCustomerId);
        const project = projects.find((p) => p.customerId === selectedCustomerId || p.id === selectedCustomerId);
        if (cust) {
          if (cust.email) params.set('email', cust.email);
          if (cust.phone) params.set('phone', cust.phone);
          if (cust.customerId) params.set('clientId', cust.customerId);
          params.set('leadId', String(cust.id));
          if (project?.leadId) params.set('pid', String(project.leadId));
          if (cust.crmLeadId) params.set('crmLeadId', String(cust.crmLeadId));
        }
      }

      const res = await fetch(`/api/client/offerings-orders?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (Array.isArray(json?.orders)) {
        setOrders(json.orders);
      }
    } catch (err) {
      console.error('Failed to fetch offering orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [selectedCustomerId, customers, projects]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Selected customer details
  const currentCustomer = useMemo(() => {
    if (selectedCustomerId === 'ALL') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const currentProject = useMemo(() => {
    if (!currentCustomer) return null;
    return projects.find((p) => p.customerId === currentCustomer.id || p.id === currentCustomer.id) || null;
  }, [projects, currentCustomer]);

  // Matching clients for search in context sidebar
  const filteredCustomers = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const email = String(c.email || '').toLowerCase();
      const code = String(c.customerId || '').toLowerCase();
      return c.name.toLowerCase().includes(q) || email.includes(q) || code.includes(q);
    });
  }, [customers, clientQuery]);

  // Filtered orders to display
  const displayedOrders = useMemo(() => {
    let result = orders;

    // Filter by client if a specific client is selected
    if (selectedCustomerId !== 'ALL' && currentCustomer) {
      result = result.filter((o) =>
        identitiesOverlap(
          {
            email: currentCustomer.email,
            phone: currentCustomer.phone,
            leadId: String(currentCustomer.id),
            clientId: currentCustomer.customerId,
            extra: [currentProject?.leadId, currentCustomer.crmLeadId],
          },
          {
            email: o.customerEmail,
            phone: o.customerPhone,
            leadId: o.leadId,
            clientId: o.clientId,
            extra: [o.quoteNumber, o.customerName],
          }
        )
      );
    }

    // Filter by search text
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter((o) => {
        const num = String(o.quoteNumber || '').toLowerCase();
        const name = String(o.customerName || '').toLowerCase();
        const client = String(o.clientId || '').toLowerCase();
        const itemMatch = (o.items || []).some((it) =>
          it.offeringName.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.room.toLowerCase().includes(q)
        );
        return num.includes(q) || name.includes(q) || client.includes(q) || itemMatch;
      });
    }

    return result;
  }, [orders, selectedCustomerId, currentCustomer, currentProject, searchFilter]);

  // Compute overall summary stats
  const totalValue = useMemo(() => {
    return displayedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  }, [displayedOrders]);

  const totalItemsCount = useMemo(() => {
    return displayedOrders.reduce((sum, o) => sum + (o.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0), 0);
  }, [displayedOrders]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <TopHeader />

      {/* Main Container */}
      <div className="flex pt-16">
        {/* Main Left Sidebar */}
        <Sidebar />

        {/* Inner Content Area */}
        <div className="flex-1 ml-56 flex">
          {/* Left Context Column: Customer Selector (Matching Quote Engine) */}
          <aside className="w-72 bg-white border-r border-gray-200 h-[calc(100vh-4rem)] sticky top-16 p-5 overflow-y-auto flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  CUSTOMER CONTEXT
                </h3>

                {/* Customer search & dropdown */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    CUSTOMER
                  </label>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      placeholder="Search client name / ID..."
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black pr-8"
                    />
                    {clientQuery && (
                      <button
                        onClick={() => setClientQuery('')}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    value={String(selectedCustomerId)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCustomerId(val === 'ALL' ? 'ALL' : Number(val));
                    }}
                    className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="ALL">All Clients ({customers.length})</option>
                    {filteredCustomers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Project Card */}
                {selectedCustomerId !== 'ALL' && currentCustomer && (
                  <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-black/[0.04] space-y-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      ACTIVE PROJECT
                    </div>
                    <div className="text-xs font-bold text-gray-900 leading-snug">
                      {typeof currentProject?.projectName === 'string'
                        ? currentProject.projectName
                        : `Project #${currentCustomer.customerId || currentCustomer.id}`}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[11px] font-semibold text-gray-600">
                        {typeof currentProject?.status === 'string'
                          ? currentProject.status
                          : typeof currentProject?.status === 'object' && currentProject?.status !== null
                          ? String(
                              (currentProject.status as Record<string, unknown>).milestoneStage ||
                                (currentProject.status as Record<string, unknown>).stage ||
                                (currentProject.status as Record<string, unknown>).substage ||
                                '10% PAYMENT'
                            )
                          : '10% PAYMENT'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick stats in sidebar */}
                <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    INVOICE STATS
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="text-[10px] text-gray-500">Invoices</div>
                      <div className="text-base font-extrabold text-gray-900 mt-0.5">
                        {displayedOrders.length}
                      </div>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="text-[10px] text-gray-500">Total Items</div>
                      <div className="text-base font-extrabold text-gray-900 mt-0.5">
                        {totalItemsCount}
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="text-[10px] text-gray-500">Total Value</div>
                    <div className="text-sm font-extrabold text-gray-900 mt-0.5">
                      ₹ {fmt(totalValue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom button to reload / sync */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => fetchOrders()}
                disabled={isLoadingOrders}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isLoadingOrders ? 'Syncing...' : 'Sync Invoices'}</span>
              </button>
            </div>
          </aside>

          {/* Right Main Content Area: Invoices View */}
          <main className="flex-1 p-8 max-w-5xl">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                  Offering Invoices
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Client catalog selections submitted to you as the Lead Designer.
                </p>
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter by invoice or offering..."
                    className="w-64 text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <svg className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" strokeWidth={2} />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth={2} />
                  </svg>
                </div>

                <Link
                  href="/quote-engine"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Open Quote Engine</span>
                </Link>
              </div>
            </div>

            {/* Invoices List */}
            {isLoadingOrders ? (
              <div className="bg-white rounded-[24px] border border-black/[0.04] p-12 text-center text-gray-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mb-3"></div>
                <div className="text-xs font-semibold">Loading offering invoices...</div>
              </div>
            ) : displayedOrders.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-black/[0.04] p-12 text-center shadow-sm">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900">No Offering Invoices Found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {selectedCustomerId !== 'ALL'
                    ? `No offering selections submitted yet by ${currentCustomer?.name || 'this client'}.`
                    : 'No client has submitted any offering selections yet.'}
                </p>
                {selectedCustomerId !== 'ALL' && (
                  <button
                    onClick={() => setSelectedCustomerId('ALL')}
                    className="mt-4 text-xs font-bold text-black underline underline-offset-2 hover:text-zinc-700"
                  >
                    View Invoices from All Clients
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {displayedOrders.map((order) => {
                  const items: OfferingDraftItem[] = Array.isArray(order.items) ? order.items : [];
                  
                  // Group items by room
                  const groupedRooms = items.reduce<Record<string, OfferingDraftItem[]>>((acc, item) => {
                    const roomKey = (item.room || 'General Selection').trim();
                    if (!acc[roomKey]) acc[roomKey] = [];
                    acc[roomKey].push(item);
                    return acc;
                  }, {});

                  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                  const subTotal = items.reduce(
                    (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1),
                    0
                  );

                  return (
                    /* The Exact Card Layout from Image 2 */
                    <div
                      key={order.id}
                      className="bg-white rounded-[24px] border border-black/[0.04] shadow-sm overflow-hidden transition-all hover:shadow-md"
                    >
                      {/* Top Header Row matching Image 2 */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-[#FAF7F2]">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            {order.source === 'staff' ? 'SAVED FOR CLIENT' : 'SENT TO DESIGNER'}
                          </div>
                          <div className="text-base font-extrabold text-gray-950 mt-0.5">
                            {order.quoteNumber || 'INV-OFF'} · ₹ {fmt(order.grandTotal ?? subTotal)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}{' '}
                            {order.source === 'staff' ? 'saved by designer for this client.' : 'chosen by client — submitted for review.'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {order.invoiceId && (
                            <Link
                              href={`/quote-invoice?s=${encodeURIComponent(order.invoiceId)}`}
                              target="_blank"
                              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 active:scale-[0.98] transition-all"
                            >
                              View invoice
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Items Grouped by Room matching Image 2 */}
                      <div className="divide-y divide-gray-100">
                        {Object.entries(groupedRooms).map(([room, roomItems]) => (
                          <div key={room} className="p-6">
                            {/* Room Header */}
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                              {room.toUpperCase()}
                            </div>

                            {/* Item Rows */}
                            <div className="space-y-4">
                              {roomItems.map((item, idx) => {
                                const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
                                return (
                                  <div
                                    key={item.draftId || `${item.offeringId}-${idx}`}
                                    className="flex items-center justify-between gap-4"
                                  >
                                    <div className="flex items-center gap-4">
                                      {/* Thumbnail */}
                                      <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-black/[0.04] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {item.imageUrl ? (
                                          <img
                                            src={item.imageUrl}
                                            alt={item.offeringName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                                            <svg
                                              className="w-6 h-6"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                      </div>

                                      {/* Item Description */}
                                      <div>
                                        <div className="text-sm font-bold text-gray-950">
                                          {item.offeringName}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          Qty {item.quantity || 1}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Item Price */}
                                    <div className="text-sm font-extrabold text-gray-950">
                                      ₹ {fmt(lineTotal)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Client Info & Meta Bar */}
                      <div className="px-6 py-3.5 bg-[#FAF7F2]/60 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {order.customerName || 'Client'}
                          </span>
                          {order.clientId && (
                            <span className="text-gray-400">({order.clientId})</span>
                          )}
                          {order.customerEmail && (
                            <span className="text-gray-400">• {order.customerEmail}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400">
                            Submitted on{' '}
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function OfferingInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black"></div>
        </div>
      }
    >
      <OfferingInvoiceContent />
    </Suspense>
  );
}
