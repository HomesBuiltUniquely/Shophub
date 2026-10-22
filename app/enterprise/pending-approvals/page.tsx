'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface EnterpriseSubmission {
  prod_id: number;
  offering_name: string;
  offering_type: string;
  sku_id: string;
  category: string;
  brand: string;
  current_stock: number;
  minimum_stock_level?: number;
  reorder_quantity?: number;
  lead_time?: number;
  preferred_vendor?: string;
  selling_price: number;
  cost_price: number;
  discount: number;
  gst_rate: string;
  price_unit: string;
  is_published: number;
  publishing_status: string;
  approval_status: string;
  primary_image?: string;
  gallery_images?: string;
  short_desc?: string;
  long_desc?: string;
  primary_material?: string;
  secondary_material?: string;
  finish_type?: string;
  load_capacity?: string;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  weight_kg?: number;
  created_by?: number;
}

function parseGallery(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getStatusCategory(item: EnterpriseSubmission): 'PENDING' | 'APPROVED' | 'REJECTED' {
  const approval = String(item.approval_status || '').toUpperCase();
  const publishing = String(item.publishing_status || '').toUpperCase();

  if (approval === 'REJECTED' || publishing === 'REJECTED') return 'REJECTED';
  if (approval === 'APPROVED' || publishing === 'PUBLISHED') return 'APPROVED';
  return 'PENDING';
}

export default function EnterprisePendingApprovalsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [items, setItems] = useState<EnterpriseSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingItem, setReviewingItem] = useState<EnterpriseSubmission | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');

  const fetchSubmissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/enterprise/pending-approvals');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load submissions');
      }
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Error loading submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'enterprise' && user.role !== 'admin') {
      router.push('/offerings');
      return;
    }
    fetchSubmissions();
  }, [user, router]);

  const openReviewModal = (item: EnterpriseSubmission) => {
    setReviewingItem(item);
    const gallery = parseGallery(item.gallery_images);
    setActiveImage(item.primary_image || gallery[0] || '');
  };

  // Status counts
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const item of items) {
      const cat = getStatusCategory(item);
      if (cat === 'PENDING') pending++;
      else if (cat === 'APPROVED') approved++;
      else if (cat === 'REJECTED') rejected++;
    }
    return { total: items.length, pending, approved, rejected };
  }, [items]);

  // Filtering by tab and search
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const cat = getStatusCategory(item);
      if (activeTab !== 'ALL' && cat !== activeTab) return false;
      if (!q) return true;

      const name = (item.offering_name || '').toLowerCase();
      const sku = (item.sku_id || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || brand.includes(q) || category.includes(q);
    });
  }, [items, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      <Sidebar />
      <main className="flex-1 ml-56 pt-20 flex flex-col min-w-0">
        <TopHeader title="Approval Tracker" />

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Offering Approval Tracker
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                  Enterprise Submissions
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Monitor the real-time status of your creations, imports, and uploads awaiting Administrator review before publishing to the Master Catalog.
              </p>
            </div>

            <button
              onClick={fetchSubmissions}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">✕</button>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'ALL'
                  ? 'bg-black text-white border-black shadow-md ring-2 ring-black/20'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
              }`}
            >
              <div className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'ALL' ? 'text-gray-300' : 'text-gray-500'}`}>
                Total Submissions
              </div>
              <div className="text-2xl font-black mt-1">{counts.total}</div>
            </button>

            <button
              onClick={() => setActiveTab('PENDING')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'PENDING'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-amber-50/60 border-amber-200 hover:border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'PENDING' ? 'text-amber-100' : 'text-amber-700'}`}>
                  Pending Review
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black mt-1">{counts.pending}</div>
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'APPROVED'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/20'
                  : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 text-emerald-900'
              }`}
            >
              <div className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'APPROVED' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                Approved & Live
              </div>
              <div className="text-2xl font-black mt-1">{counts.approved}</div>
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'REJECTED'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-600/20'
                  : 'bg-rose-50/60 border-rose-200 hover:border-rose-300 text-rose-900'
              }`}
            >
              <div className={`text-xs font-semibold uppercase tracking-wider ${activeTab === 'REJECTED' ? 'text-rose-100' : 'text-rose-700'}`}>
                Rejected
              </div>
              <div className="text-2xl font-black mt-1">{counts.rejected}</div>
            </button>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-200/60 p-1 rounded-xl">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'ALL' && `All (${counts.total})`}
                  {tab === 'PENDING' && `Pending (${counts.pending})`}
                  {tab === 'APPROVED' && `Approved (${counts.approved})`}
                  {tab === 'REJECTED' && `Rejected (${counts.rejected})`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 shadow-xs"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                <p className="mt-2 text-xs font-medium text-gray-500">Loading submissions...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  {searchQuery ? 'No matching submissions' : `No ${activeTab.toLowerCase()} offerings found`}
                </h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try adjusting your search keywords.'
                    : activeTab === 'PENDING'
                    ? 'You have no offerings currently awaiting admin approval.'
                    : 'Submit a new offering or import to track approval progress here.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-semibold text-gray-700 underline"
                    >
                      Clear search
                    </button>
                  )}
                  <Link
                    href="/offerings/CreateOfferings"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    + Create Offering
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Offering / SKU</th>
                      <th className="py-3 px-4">Category & Brand</th>
                      <th className="py-3 px-4">Pricing & Stock</th>
                      <th className="py-3 px-4 text-center">Approval Status</th>
                      <th className="py-3 px-4 text-center">Full Details</th>
                      <th className="py-3 px-4 text-center">Catalog Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map((item) => {
                      const gallery = parseGallery(item.gallery_images);
                      const hasImage = Boolean(item.primary_image || gallery.length > 0);
                      const displayImg = item.primary_image || gallery[0] || '';
                      const totalPhotos = (item.primary_image ? 1 : 0) + gallery.filter((g) => g !== item.primary_image).length;
                      const statusCat = getStatusCategory(item);

                      return (
                        <tr key={item.prod_id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Offering & SKU */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openReviewModal(item)}
                                className="relative group flex-shrink-0 cursor-pointer focus:outline-none"
                                title="Click to inspect images and details"
                              >
                                {hasImage ? (
                                  <div className="relative">
                                    <img
                                      src={displayImg}
                                      alt={item.offering_name}
                                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 group-hover:ring-2 group-hover:ring-black transition-all"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=120';
                                      }}
                                    />
                                    {totalPhotos > 1 && (
                                      <span className="absolute -bottom-1 -right-1 bg-black text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                                        {totalPhotos}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 group-hover:border-gray-500 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[8px] text-gray-400 font-semibold mt-0.5">No img</span>
                                  </div>
                                )}
                              </button>

                              <div>
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(item)}
                                  className="font-bold text-gray-900 hover:text-indigo-600 text-left transition-colors cursor-pointer"
                                  title="Review submission details"
                                >
                                  {item.offering_name}
                                </button>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {item.sku_id}
                                  </span>
                                  <span className="inline-block text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {item.offering_type || 'PRODUCT'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category & Brand */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-gray-900">{item.category || 'Uncategorized'}</div>
                            <div className="text-[11px] text-gray-500">{item.brand || 'No Brand'}</div>
                          </td>

                          {/* Pricing & Stock */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">
                              ₹{Number(item.selling_price || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Cost: ₹{Number(item.cost_price || 0).toLocaleString()}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                Number(item.current_stock || 0) > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                Stock: {item.current_stock ?? 0}
                              </span>
                              {Number(item.minimum_stock_level || 0) > 0 && (
                                <span className="text-[10px] text-gray-400" title="Minimum Stock Level">
                                  (Min: {item.minimum_stock_level})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Approval Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {statusCat === 'PENDING' && (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Pending Approval
                                </span>
                                <span className="text-[10px] text-gray-400 mt-1">Under Admin Review</span>
                              </div>
                            )}

                            {statusCat === 'APPROVED' && (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Approved
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold mt-1">Live in Master Catalog</span>
                              </div>
                            )}

                            {statusCat === 'REJECTED' && (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Rejected
                                </span>
                                <span className="text-[10px] text-rose-600 font-semibold mt-1">Action Required</span>
                              </div>
                            )}
                          </td>

                          {/* Full Details Modal Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => openReviewModal(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                              title="Inspect full offering specifications, inventory, and images"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Review Details
                            </button>
                          </td>

                          {/* Catalog Action */}
                          <td className="py-3.5 px-4 text-center">
                            {statusCat === 'APPROVED' ? (
                              <Link
                                href={`/offerings?search=${encodeURIComponent(item.sku_id)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-gray-800 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                                title="View in Master Catalog"
                              >
                                View in Catalog
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            ) : statusCat === 'PENDING' ? (
                              <span className="text-gray-400 text-xs italic">
                                Awaiting Approval
                              </span>
                            ) : (
                              <Link
                                href={`/offerings/CreateOfferings?id=${item.prod_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-lg text-xs transition-colors"
                              >
                                Edit & Resubmit
                              </Link>
                            )}
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

        {/* ========================================================================= */}
        {/* REVIEW OFFERING DETAILS MODAL */}
        {/* ========================================================================= */}
        {reviewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{reviewingItem.offering_name}</h2>
                      <span className="font-mono text-xs text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded font-bold">
                        {reviewingItem.sku_id}
                      </span>
                      {(() => {
                        const status = getStatusCategory(reviewingItem);
                        if (status === 'APPROVED') {
                          return (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                              Approved & Live
                            </span>
                          );
                        }
                        if (status === 'REJECTED') {
                          return (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                              Rejected
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                            Pending Admin Approval
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Category: <span className="font-semibold text-gray-800">{reviewingItem.category || 'N/A'}</span>
                      {' • '}
                      Brand: <span className="font-semibold text-gray-800">{reviewingItem.brand || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Banner inside Modal */}
              <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 text-xs flex items-center justify-between">
                {(() => {
                  const status = getStatusCategory(reviewingItem);
                  if (status === 'APPROVED') {
                    return (
                      <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        This offering is approved and appended to your Enterprise Master Catalog.
                      </div>
                    );
                  }
                  if (status === 'REJECTED') {
                    return (
                      <div className="text-rose-800 font-semibold flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        This submission was rejected by the administrator. Please review the details or edit and resubmit.
                      </div>
                    );
                  }
                  return (
                    <div className="text-amber-800 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Awaiting Administrator approval. Once approved, it will automatically appear in your Master Catalog.
                    </div>
                  );
                })()}
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT: Images & Media */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Product Media & Photos
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center min-h-[260px] max-h-[340px]">
                      {activeImage ? (
                        <img
                          src={activeImage}
                          alt={reviewingItem.offering_name}
                          className="w-full h-full object-contain max-h-[340px]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400';
                          }}
                        />
                      ) : (
                        <div className="text-center p-8 text-gray-400">
                          <svg className="w-12 h-12 mx-auto stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-xs font-medium">No images uploaded for this offering</p>
                        </div>
                      )}
                    </div>

                    {/* Gallery Thumbnails */}
                    {(() => {
                      const allImgs = [
                        reviewingItem.primary_image,
                        ...parseGallery(reviewingItem.gallery_images),
                      ].filter((img, i, arr): img is string => Boolean(img) && arr.indexOf(img) === i);

                      if (allImgs.length <= 1) return null;

                      return (
                        <div>
                          <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
                            Gallery Images ({allImgs.length}):
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {allImgs.map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImage(img)}
                                className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer transition-all ${
                                  activeImage === img ? 'border-black ring-2 ring-black/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Physical Dimensions */}
                    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                      <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Dimensions & Specifications
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Dimensions:</span>{' '}
                          <span className="font-semibold text-gray-800">
                            {reviewingItem.length_cm || 0} × {reviewingItem.width_cm || 0} × {reviewingItem.height_cm || 0} cm
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Weight:</span>{' '}
                          <span className="font-semibold text-gray-800">{reviewingItem.weight_kg || 0} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Primary Material:</span>{' '}
                          <span className="font-semibold text-gray-800">{reviewingItem.primary_material || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Finish:</span>{' '}
                          <span className="font-semibold text-gray-800">{reviewingItem.finish_type || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Inventory, Pricing & Descriptions */}
                  <div className="space-y-4">
                    {/* Inventory & Stock Card */}
                    <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Inventory & Stock Details
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          Number(reviewingItem.current_stock || 0) > 0
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {Number(reviewingItem.current_stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">Current Stock</div>
                          <div className="text-lg font-bold text-emerald-800">{reviewingItem.current_stock ?? 0} units</div>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">Min Stock Level</div>
                          <div className="text-lg font-bold text-gray-800">{reviewingItem.minimum_stock_level ?? 0} units</div>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">Reorder Quantity</div>
                          <div className="text-sm font-bold text-gray-800">{reviewingItem.reorder_quantity ?? 0} units</div>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">Lead Time</div>
                          <div className="text-sm font-bold text-gray-800">{reviewingItem.lead_time ?? 0} days</div>
                        </div>
                      </div>

                      {reviewingItem.preferred_vendor && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-semibold">Preferred Vendor:</span> {reviewingItem.preferred_vendor}
                        </div>
                      )}
                    </div>

                    {/* Pricing Card */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Pricing & Commercials
                      </h3>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">Selling Price</div>
                          <div className="text-base font-bold text-gray-900">
                            ₹{Number(reviewingItem.selling_price || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">Cost Price</div>
                          <div className="text-base font-bold text-gray-600">
                            ₹{Number(reviewingItem.cost_price || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                          <div className="text-[10px] text-gray-500 font-semibold uppercase">GST Rate</div>
                          <div className="text-sm font-bold text-gray-800">{reviewingItem.gst_rate || 'GST_18'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Offering Descriptions
                      </h3>

                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Short Description:</div>
                        <p className="text-xs text-gray-800 mt-1 bg-white p-2.5 rounded-lg border border-gray-200">
                          {reviewingItem.short_desc
                            ? reviewingItem.short_desc.replace(/<[^>]*>/g, '').trim()
                            : <span className="italic text-gray-400">No short description provided</span>}
                        </p>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Detailed / Long Description:</div>
                        <div className="text-xs text-gray-800 mt-1 bg-white p-2.5 rounded-lg border border-gray-200 max-h-36 overflow-y-auto leading-relaxed">
                          {reviewingItem.long_desc ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: reviewingItem.long_desc.replace(/<p[^>]*>\s*<\/p>/gi, ''),
                              }}
                            />
                          ) : (
                            <span className="italic text-gray-400">No detailed description provided</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div>
                  {getStatusCategory(reviewingItem) === 'APPROVED' ? (
                    <Link
                      href={`/offerings?search=${encodeURIComponent(reviewingItem.sku_id)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      View in Master Catalog
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  ) : getStatusCategory(reviewingItem) === 'REJECTED' ? (
                    <Link
                      href={`/offerings/CreateOfferings?id=${reviewingItem.prod_id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      Edit & Resubmit
                    </Link>
                  ) : (
                    <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                      ⏳ Admin review in progress
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="px-5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
