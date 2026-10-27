'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface EnterpriseReviewItem {
  id: number;
  prod_id: number;
  product_name: string;
  sku_id?: string;
  enterprise_name: string;
  client_name: string;
  rating: number;
  comment: string;
  is_visible: boolean | number;
  created_at: string;
  product_image?: string;
}

export default function EnterpriseFeedbackPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [reviews, setReviews] = useState<EnterpriseReviewItem[]>([]);
  const [brandName, setBrandName] = useState<string>('Your Brand');
  const [metrics, setMetrics] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnterpriseFeedback = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/enterprise/feedback');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load enterprise feedback');
      }

      setReviews(data.reviews || []);
      if (data.metrics) setMetrics(data.metrics);
      if (data.brandName) setBrandName(data.brandName);
    } catch (err: any) {
      setError(err.message || 'Error loading feedback');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'enterprise' && user.role !== 'admin') {
      router.push('/offerings');
      return;
    }
    if (user?.role === 'enterprise' || user?.role === 'admin') {
      fetchEnterpriseFeedback();
    }
  }, [user, router]);

  if (user && user.role !== 'enterprise' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex">
        <Sidebar />
        <main className="flex-1 ml-56 p-8 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enterprise account privileges required to view customer reviews.
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
        <TopHeader title="Customer Feedback" />

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {brandName}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Verified Purchaser Ratings
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Customer Ratings & Feedback
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                Direct ratings and comments from clients who purchased products from your brand catalog.
              </p>
            </div>

            <button
              onClick={fetchEnterpriseFeedback}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-xs"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold text-rose-700">✕</button>
            </div>
          )}

          {/* Metric Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border bg-white border-gray-200 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Reviews Received
              </span>
              <div className="text-3xl font-black text-gray-900 mt-2">{metrics.totalReviews}</div>
              <span className="text-[11px] text-gray-400 mt-1">From verified client purchases</span>
            </div>

            <div className="p-5 rounded-2xl border bg-amber-50/60 border-amber-200 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Average Rating
              </span>
              <div className="text-3xl font-black text-amber-900 mt-2 flex items-center gap-2">
                <span>{metrics.averageRating || '—'}</span>
                <span className="text-amber-500 text-2xl">★</span>
              </div>
              <span className="text-[11px] text-amber-700 mt-1">Out of 5.0 stars</span>
            </div>

            <div className="p-5 rounded-2xl border bg-white border-gray-200 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Rating Breakdown
              </span>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = metrics.ratingDistribution[star] || 0;
                  const pct = metrics.totalReviews > 0 ? (count / metrics.totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-gray-600 font-bold">{star}★</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-gray-400 font-mono text-[10px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Customer Review Feed</h2>
              <span className="text-xs text-gray-500 font-medium">
                {reviews.length} feedback record{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                <p className="mt-2 text-xs font-medium text-gray-500">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-bold text-gray-900">No client reviews yet</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  When clients purchase your products and submit ratings, their feedback will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reviews.map((rev) => {
                  const isVisible = Boolean(rev.is_visible);
                  return (
                    <div key={rev.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <img
                          src={rev.product_image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=120'}
                          alt={rev.product_name}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=120';
                          }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{rev.product_name}</span>
                            <span className="text-amber-400 text-xs">
                              {'★'.repeat(rev.rating)}
                              {'☆'.repeat(5 - rev.rating)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 italic leading-relaxed">
                            "{rev.comment}"
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-600">{rev.client_name}</span>
                            <span>•</span>
                            <span>
                              {new Date(rev.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex sm:flex-col items-end gap-1">
                        {isVisible ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Visible to Clients
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Hidden from Clients
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
