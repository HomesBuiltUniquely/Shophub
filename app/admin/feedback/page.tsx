'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface AdminFeedbackItem {
  id: number;
  prod_id: number;
  product_name: string;
  sku_id?: string;
  enterprise_id?: number;
  enterprise_name: string;
  client_id: number;
  client_name: string;
  client_email: string;
  rating: number;
  comment: string;
  purchase_ref?: string;
  is_visible: boolean | number;
  toggled_by?: number;
  toggled_at?: string;
  created_at: string;
  product_image?: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, visible: 0, hidden: 0, averageRating: 0 });
  const [enterprises, setEnterprises] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Filters
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [enterpriseFilter, setEnterpriseFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchFeedback = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (visibilityFilter !== 'all') params.set('visibility', visibilityFilter);
      if (enterpriseFilter !== 'all') params.set('enterprise', enterpriseFilter);
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load feedback');
      }

      setItems(data.items || []);
      if (data.counts) setCounts(data.counts);
      if (Array.isArray(data.enterprises)) setEnterprises(data.enterprises);
    } catch (err: any) {
      setError(err.message || 'Error fetching feedback');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/offerings');
      return;
    }
    if (user?.role === 'admin') {
      fetchFeedback();
    }
  }, [user, visibilityFilter, enterpriseFilter, ratingFilter, router]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      if (user?.role === 'admin') fetchFeedback();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleToggleVisibility = async (item: AdminFeedbackItem) => {
    setTogglingId(item.id);
    const targetState = !Boolean(item.is_visible);

    try {
      const res = await fetch(`/api/admin/feedback/${item.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: targetState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update visibility');
      }

      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 3500);

      // Optimistic update
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_visible: targetState } : it))
      );
      setCounts((prev) => ({
        ...prev,
        visible: prev.visible + (targetState ? 1 : -1),
        hidden: prev.hidden + (targetState ? -1 : 1),
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update visibility');
    } finally {
      setTogglingId(null);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex">
        <Sidebar />
        <main className="flex-1 ml-56 p-8 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-600 mb-4">
              Administrator privileges required to access Feedback Controls.
            </p>
            <Link href="/offerings" className="inline-block px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg">
              Back to Catalog
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      <Sidebar />
      <main className="flex-1 ml-56 pt-20 flex flex-col min-w-0">
        <TopHeader title="Feedback Controls" />

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Feedback Visibility & Management
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                View submitted ratings and comments across all enterprises and products. Control client visibility using the Show to Clients toggle switch.
              </p>
            </div>

            <button
              onClick={fetchFeedback}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-xs"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Toast / Error */}
          {toastMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="font-bold text-emerald-700">✕</button>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold text-rose-700">✕</button>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-white border-gray-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Submissions
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{counts.total}</div>
            </div>

            <div className="p-4 rounded-xl border bg-emerald-50/50 border-emerald-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Shown to Clients
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{counts.visible}</div>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 border-gray-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Hidden from Clients
              </div>
              <div className="text-2xl font-black text-gray-700 mt-1">{counts.hidden}</div>
            </div>

            <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Average Rating
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1 flex items-center gap-1.5">
                <span>{counts.averageRating || '—'}</span>
                <span className="text-amber-500 text-lg">★</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Visibility Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {(['all', 'visible', 'hidden'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setVisibilityFilter(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      visibilityFilter === tab
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'all' && `All (${counts.total})`}
                    {tab === 'visible' && `Shown (${counts.visible})`}
                    {tab === 'hidden' && `Hidden (${counts.hidden})`}
                  </button>
                ))}
              </div>

              {/* Enterprise Filter */}
              {enterprises.length > 0 && (
                <select
                  value={enterpriseFilter}
                  onChange={(e) => setEnterpriseFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="all">All Enterprises</option>
                  {enterprises.map((ent) => (
                    <option key={ent} value={ent}>
                      {ent}
                    </option>
                  ))}
                </select>
              )}

              {/* Rating Filter */}
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search product, client, enterprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-black/10"
              />
            </div>
          </div>

          {/* Feedback Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                <p className="mt-2 text-xs font-medium text-gray-500">Loading feedback records...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-bold text-gray-900">No feedback found</p>
                <p className="text-xs text-gray-500">
                  {searchQuery || visibilityFilter !== 'all' || enterpriseFilter !== 'all'
                    ? 'No records matched your filter criteria.'
                    : 'No customer feedback has been submitted yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Product Offering</th>
                      <th className="py-3 px-4">Enterprise Brand</th>
                      <th className="py-3 px-4">Verified Client</th>
                      <th className="py-3 px-4">Rating & Review</th>
                      <th className="py-3 px-4">Submitted</th>
                      <th className="py-3 px-4 text-center">Client Visibility Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const isToggling = togglingId === item.id;
                      const isVisible = Boolean(item.is_visible);

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.product_image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=120'}
                                alt={item.product_name}
                                className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=120';
                                }}
                              />
                              <div>
                                <div className="font-bold text-gray-900">{item.product_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  {item.sku_id || `ID: #${item.prod_id}`}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Enterprise */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-900 px-2 py-0.5 rounded bg-gray-100 text-[11px]">
                              {item.enterprise_name}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-gray-900">{item.client_name}</div>
                            <div className="text-[11px] text-gray-400">{item.client_email}</div>
                            {item.purchase_ref && (
                              <span className="inline-block mt-0.5 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Ref: {item.purchase_ref}
                              </span>
                            )}
                          </td>

                          {/* Rating & Comment */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex text-amber-400 mb-1">
                              {'★'.repeat(item.rating)}
                              {'☆'.repeat(5 - item.rating)}
                            </div>
                            <p className="text-gray-700 text-xs line-clamp-2 italic">
                              "{item.comment}"
                            </p>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-[11px] text-gray-400">
                            {new Date(item.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Visibility Toggle Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleVisibility(item)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                                isVisible
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
                              }`}
                              title={isVisible ? 'Click to hide from clients' : 'Click to show to clients'}
                            >
                              {isToggling ? (
                                <span className="inline-block animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                              ) : isVisible ? (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                              )}
                              <span>{isVisible ? 'Show to Clients' : 'Hide from Clients'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
