'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
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

interface PurchasedProduct {
  prodId: number;
  offeringName: string;
  skuId?: string;
  category?: string;
  enterpriseName: string;
  purchaseRef: string;
  purchaseDate: string;
  price?: number;
  imageUrl?: string;
}

interface FeedbackReview {
  id: number;
  prodId?: number;
  prod_id?: number;
  product_name: string;
  enterprise_name: string;
  client_name?: string;
  rating: number;
  comment: string;
  created_at: string;
}

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState<number | null>(null);
  const sizeCls = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = hover !== null ? star <= hover : star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(null)}
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'} text-amber-400 focus:outline-none`}
            title={`${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              className={`${sizeCls} ${active ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-300'}`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function ClientFeedbackContent() {
  const user = useCurrentUser();
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);
  const [myReviews, setMyReviews] = useState<FeedbackReview[]>([]);
  const [peerReviews, setPeerReviews] = useState<FeedbackReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review modal state
  const [selectedProduct, setSelectedProduct] = useState<PurchasedProduct | null>(null);
  const [modalRating, setModalRating] = useState<number>(5);
  const [modalComment, setModalComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadFeedbackData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/feedback', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setPurchasedProducts(data.purchasedProducts || []);
        setMyReviews(data.myReviews || []);
        setPeerReviews(data.peerReviews || []);
      }
    } catch (err: any) {
      console.error('Failed to load feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const openReviewModal = (product: PurchasedProduct) => {
    setSelectedProduct(product);
    setModalError(null);
    const existing = myReviews.find((r) => Number(r.prodId || r.prod_id) === product.prodId);
    if (existing) {
      setModalRating(existing.rating || 5);
      setModalComment(existing.comment || '');
    } else {
      setModalRating(5);
      setModalComment('');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!modalComment.trim()) {
      setModalError('Please share your thoughts in the review comment.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prodId: selectedProduct.prodId,
          rating: modalRating,
          comment: modalComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit feedback.');
      }

      showToast(`Thank you! Your feedback for "${selectedProduct.offeringName}" has been submitted.`);
      setSelectedProduct(null);
      await loadFeedbackData();
    } catch (err: any) {
      setModalError(err.message || 'Error submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader pageTitle="Customer Feedback" searchPlaceholder="Search purchased products..." />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em]">
                  VERIFIED PURCHASER PORTAL
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Ratings & Reviews
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
                Feedback & Reviews
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl font-normal">
                Share ratings and comments for products you have purchased from our verified enterprise network, and browse reviews from other verified buyers.
              </p>
            </div>
          </div>

          {/* Toast feedback */}
          {toastMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. MY PURCHASED PRODUCTS */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950 tracking-tight">
                  My Purchased Products & Enterprises
                </h2>
                <p className="text-xs text-gray-500">
                  Products verified in your project invoices and catalog purchases eligible for your feedback.
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-black/5 px-2.5 py-1 rounded-full">
                {purchasedProducts.length} Purchased
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center bg-white rounded-[28px] border border-black/[0.04]">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                <p className="mt-2 text-xs font-medium text-gray-500">Verifying purchases...</p>
              </div>
            ) : purchasedProducts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-[28px] border border-black/[0.04]">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900">No verified purchases yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Feedback is reserved for verified purchasers. Once your project quotation or invoice is confirmed, your purchased products will appear here.
                </p>
                <Link
                  href="/client/offerings"
                  className="mt-4 inline-block px-4 py-2 bg-black text-white text-xs font-semibold rounded-full hover:bg-zinc-800 transition-colors"
                >
                  Browse Catalog
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {purchasedProducts.map((prod) => {
                  const review = myReviews.find(
                    (r) => Number(r.prodId || r.prod_id) === prod.prodId
                  );

                  return (
                    <div
                      key={prod.prodId}
                      className="bg-white rounded-[24px] p-5 border border-black/[0.05] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        {/* Product Header */}
                        <div className="flex items-start gap-3.5 mb-3.5">
                          <img
                            src={
                              prod.imageUrl ||
                              'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=140'
                            }
                            alt={prod.offeringName}
                            className="w-16 h-16 rounded-2xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=140';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider mb-1">
                              {prod.enterpriseName}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                              {prod.offeringName}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                              <span>{prod.skuId || `PROD-${prod.prodId}`}</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-sans font-semibold">Verified Purchase</span>
                            </div>
                          </div>
                        </div>

                        {/* Existing Review or Prompt */}
                        {review ? (
                          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl mb-4 border border-[#EFECE6]/80">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Your Rating
                              </span>
                              <StarRating value={review.rating} readOnly size="sm" />
                            </div>
                            <p className="text-xs text-gray-700 italic line-clamp-3">
                              "{review.comment}"
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50/70 p-3.5 rounded-2xl mb-4 border border-dashed border-gray-200">
                            <p className="text-xs text-gray-500 text-center">
                              You haven't reviewed this product yet.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/client/offerings/detail?id=${prod.prodId}`}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          View Details →
                        </Link>
                        <button
                          type="button"
                          onClick={() => openReviewModal(prod)}
                          className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-full transition-colors active:scale-[0.98]"
                        >
                          {review ? 'Edit Review' : 'Rate & Review'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 2. VERIFIED REVIEWS ON PURCHASED PRODUCTS */}
          {/* ========================================================================= */}
          <section className="space-y-4 pt-4">
            <div>
              <h2 className="text-lg font-bold text-gray-950 tracking-tight">
                Verified Customer Reviews for Products You Own
              </h2>
              <p className="text-xs text-gray-500">
                Verified reviews from other clients on the specific products in your purchased collection.
              </p>
            </div>

            {peerReviews.length === 0 ? (
              <div className="bg-white rounded-[24px] p-8 text-center border border-black/[0.04]">
                <p className="text-xs font-medium text-gray-500">
                  No community reviews currently displayed for your purchased products.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {peerReviews.map((peer) => (
                  <div
                    key={peer.id}
                    className="bg-white rounded-[24px] p-5 border border-black/[0.04] shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-gray-900">{peer.product_name}</div>
                        <div className="text-[11px] text-gray-500">{peer.enterprise_name}</div>
                      </div>
                      <StarRating value={peer.rating} readOnly size="sm" />
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed">
                      "{peer.comment}"
                    </p>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-gray-700">{peer.client_name || 'Verified Purchaser'}</span>
                      </div>
                      <span>
                        {new Date(peer.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <ClientFooter />
      </div>

      {/* ========================================================================= */}
      {/* REVIEW SUBMISSION MODAL */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Verified Review
                </span>
                <h3 className="font-bold text-base text-gray-900">
                  Review {selectedProduct.offeringName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-700 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-7 space-y-5">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <img
                  src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=140'}
                  alt={selectedProduct.offeringName}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">{selectedProduct.offeringName}</div>
                  <div className="text-[11px] text-gray-500">{selectedProduct.enterpriseName}</div>
                </div>
              </div>

              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-3">
                  <StarRating value={modalRating} onChange={setModalRating} size="lg" />
                  <span className="text-xs font-bold text-gray-600">
                    {modalRating === 5 && 'Outstanding'}
                    {modalRating === 4 && 'Very Good'}
                    {modalRating === 3 && 'Average'}
                    {modalRating === 2 && 'Below Expectation'}
                    {modalRating === 1 && 'Unsatisfactory'}
                  </span>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Your Review & Comments *
                </label>
                <textarea
                  rows={4}
                  value={modalComment}
                  onChange={(e) => setModalComment(e.target.value)}
                  placeholder="Share details on product quality, finish, craftsmanship, and enterprise service..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ContactRmModal />
      <FloatingSupportChat />
    </div>
  );
}

export default function ClientFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <ClientFeedbackContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
