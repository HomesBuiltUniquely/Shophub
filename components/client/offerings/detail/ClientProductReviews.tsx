'use client';

import React, { useEffect, useState } from 'react';

interface ReviewItem {
  id: number;
  prod_id: number;
  client_name?: string;
  rating: number;
  comment: string;
  is_visible: boolean | number;
  is_mine?: boolean | number;
  created_at: string;
}

export default function ClientProductReviews({
  prodId,
  productName,
  enterpriseName,
}: {
  prodId: number | string;
  productName: string;
  enterpriseName: string;
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProductReviews = async () => {
    if (!prodId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/feedback?prodId=${encodeURIComponent(prodId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHasPurchased(true);
        setReviews(data.reviews || []);
        // Preload own review if present
        const myReview = (data.reviews || []).find((r: ReviewItem) => Boolean(r.is_mine));
        if (myReview) {
          setRating(myReview.rating || 5);
          setComment(myReview.comment || '');
        }
      } else if (res.status === 403) {
        setHasPurchased(false);
        setReviews([]);
      }
    } catch {
      setHasPurchased(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductReviews();
  }, [prodId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide comments for your review.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prodId: Number(prodId),
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      setToastMessage('Thank you! Your feedback has been recorded.');
      setIsModalOpen(false);
      await fetchProductReviews();
    } catch (err: any) {
      setError(err.message || 'Error submitting review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-black/[0.04] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Ratings & Feedback
            </span>
            {hasPurchased && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Verified Purchaser
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Customer Reviews</h3>
        </div>

        {hasPurchased && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-full transition-colors active:scale-[0.98]"
          >
            {reviews.some((r) => Boolean(r.is_mine)) ? 'Edit Your Review' : 'Write a Review'}
          </button>
        )}
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-xs text-gray-400">Loading reviews...</div>
      ) : hasPurchased === false ? (
        <div className="p-6 bg-gray-50 rounded-2xl text-center space-y-2 border border-dashed border-gray-200">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-700">
            Reviews are reserved for verified purchasers
          </p>
          <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
            Once you purchase this offering from {enterpriseName}, you will be able to submit your rating and read verified customer feedback.
          </p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-2xl text-center space-y-1">
          <p className="text-xs font-semibold text-gray-700">No reviews displayed yet</p>
          <p className="text-[11px] text-gray-500">
            Be the first verified purchaser to share feedback on this offering.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {avgRating && (
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="text-2xl font-black text-gray-900">{avgRating}</div>
              <div className="text-xs text-gray-500">
                out of 5 based on {reviews.length} verified review{reviews.length > 1 ? 's' : ''}
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {reviews.map((rev) => (
              <div key={rev.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {rev.is_mine ? 'You' : rev.client_name || 'Verified Client'}
                    </span>
                    {Boolean(rev.is_mine) && (
                      <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.2 rounded-full">
                        Your Submission
                      </span>
                    )}
                  </div>
                  <div className="flex text-amber-400">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">"{rev.comment}"</p>
                <div className="text-[10px] text-gray-400">
                  {new Date(rev.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Review {productName}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Star Rating (1–5) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-2xl focus:outline-none cursor-pointer"
                    >
                      <span className={star <= rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-gray-600 ml-2">
                    {rating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Comment *
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share feedback on quality, build, design, and enterprise service..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-full disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
