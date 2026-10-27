import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ensureFeedbackSchema } from '@/lib/feedback/ensure';
import {
  getClientPurchasedProducts,
  verifyClientProductPurchase,
} from '@/lib/feedback/purchase-verification';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export const runtime = 'nodejs';

/**
 * POST /api/feedback
 * Client submits or updates star rating (1-5) and comment for a purchased product.
 * Enforces server-side purchase verification and defaults is_visible = false.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 });
    }

    if (session.role !== 'client' && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only clients can submit product feedback.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }

    const prodId = Number(body.prodId || body.prod_id);
    const rating = Number(body.rating);
    const comment = String(body.comment || '').trim();

    if (!prodId || isNaN(prodId)) {
      return NextResponse.json({ success: false, error: 'Valid prodId is required.' }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!comment || comment.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter a review comment.' },
        { status: 400 }
      );
    }

    // Server-side purchase verification
    const { hasPurchased, purchasedItem } = await verifyClientProductPurchase(session, prodId);
    if (!hasPurchased && session.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You can only review products and enterprises you have purchased.',
        },
        { status: 403 }
      );
    }

    await ensureFeedbackSchema();
    const pool = getHomesMerryDbPool();

    // Look up product info
    const [pRows] = await pool.query<RowDataPacket[]>(
      'SELECT prod_id, offering_name, sku_id, brand, created_by FROM product WHERE prod_id = ? LIMIT 1',
      [prodId]
    );
    const pRow = Array.isArray(pRows) && pRows[0] ? pRows[0] : null;

    const productName = pRow?.offering_name || purchasedItem?.offeringName || `Product #${prodId}`;
    const skuId = pRow?.sku_id || purchasedItem?.skuId || '';
    const enterpriseName = pRow?.brand || purchasedItem?.enterpriseName || 'Hub Homes';
    const enterpriseId = pRow?.created_by ? Number(pRow.created_by) : null;
    const purchaseRef = purchasedItem?.purchaseRef || 'INV-VERIFIED';

    // Check if client already submitted feedback for this product
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM product_feedback WHERE client_id = ? AND prod_id = ? LIMIT 1',
      [session.id, prodId]
    );

    let feedbackId: number;

    if (Array.isArray(existing) && existing.length > 0) {
      feedbackId = Number(existing[0].id);
      // Update existing feedback (keeps is_visible as-is or resets to false on content edit)
      await pool.query(
        `UPDATE product_feedback
         SET rating = ?,
             comment = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [rating, comment, feedbackId]
      );
    } else {
      // Insert new feedback with is_visible = false (hidden by default)
      const [insertRes] = await pool.query<ResultSetHeader>(
        `INSERT INTO product_feedback (
          prod_id, product_name, sku_id, enterprise_id, enterprise_name,
          client_id, client_name, client_email, rating, comment,
          purchase_ref, is_visible, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
        [
          prodId,
          productName,
          skuId,
          enterpriseId,
          enterpriseName,
          session.id,
          session.name,
          session.email,
          rating,
          comment,
          purchaseRef,
        ]
      );
      feedbackId = insertRes.insertId;
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback has been recorded.',
      feedbackId,
      prodId,
      rating,
      comment,
      is_visible: false,
    });
  } catch (error: any) {
    console.error('[API /api/feedback POST]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * Returns:
 * 1. If ?prodId=X: Verifies purchase, then returns visible reviews for that product + client's own review.
 * 2. If no prodId: Returns client's purchased products list and their submitted reviews.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 });
    }

    await ensureFeedbackSchema();
    const pool = getHomesMerryDbPool();
    const { searchParams } = new URL(request.url);
    const prodIdParam = searchParams.get('prodId') || searchParams.get('id');

    if (prodIdParam) {
      const prodId = Number(prodIdParam);
      if (isNaN(prodId)) {
        return NextResponse.json({ success: false, error: 'Invalid prodId.' }, { status: 400 });
      }

      // If user is client, verify purchase
      if (session.role === 'client') {
        const { hasPurchased } = await verifyClientProductPurchase(session, prodId);
        if (!hasPurchased) {
          return NextResponse.json(
            {
              success: false,
              hasPurchased: false,
              error: 'Reviews are only available to verified purchasers of this product.',
              reviews: [],
            },
            { status: 403 }
          );
        }

        // Return reviews where is_visible is TRUE OR the review belongs to this client
        const [reviews] = await pool.query<RowDataPacket[]>(
          `SELECT 
            id, prod_id, product_name, sku_id, enterprise_name,
            client_name, rating, comment, is_visible,
            created_at, (client_id = ?) AS is_mine
           FROM product_feedback
           WHERE prod_id = ? AND (is_visible = 1 OR client_id = ?)
           ORDER BY (client_id = ?) DESC, created_at DESC`,
          [session.id, prodId, session.id, session.id]
        );

        return NextResponse.json({
          success: true,
          hasPurchased: true,
          reviews: reviews || [],
        });
      }

      // Admins can see all feedback for this product
      if (session.role === 'admin') {
        const [reviews] = await pool.query<RowDataPacket[]>(
          `SELECT * FROM product_feedback WHERE prod_id = ? ORDER BY created_at DESC`,
          [prodId]
        );
        return NextResponse.json({ success: true, reviews: reviews || [] });
      }

      // Enterprises can see feedback for this product
      const [reviews] = await pool.query<RowDataPacket[]>(
        `SELECT id, prod_id, product_name, enterprise_name, client_name, rating, comment, is_visible, created_at
         FROM product_feedback
         WHERE prod_id = ?
         ORDER BY created_at DESC`,
        [prodId]
      );
      return NextResponse.json({ success: true, reviews: reviews || [] });
    }

    // Default: client purchases hub
    if (session.role === 'client') {
      const purchasedProducts = await getClientPurchasedProducts(session);
      const [myReviews] = await pool.query<RowDataPacket[]>(
        `SELECT id, prod_id, product_name, enterprise_name, rating, comment, is_visible, created_at
         FROM product_feedback
         WHERE client_id = ?
         ORDER BY created_at DESC`,
        [session.id]
      );

      // Also get peer reviews for all products purchased by this client where is_visible = 1
      const prodIds = purchasedProducts.map((p) => p.prodId);
      let peerReviews: any[] = [];
      if (prodIds.length > 0) {
        const [visibleRows] = await pool.query<RowDataPacket[]>(
          `SELECT id, prod_id, product_name, enterprise_name, client_name, rating, comment, created_at
           FROM product_feedback
           WHERE prod_id IN (?) AND is_visible = 1 AND client_id != ?
           ORDER BY created_at DESC`,
          [prodIds, session.id]
        );
        peerReviews = Array.isArray(visibleRows) ? visibleRows : [];
      }

      return NextResponse.json({
        success: true,
        purchasedProducts,
        myReviews: myReviews || [],
        peerReviews,
      });
    }

    return NextResponse.json({ success: true, message: 'Specify prodId for reviews.' });
  } catch (error: any) {
    console.error('[API /api/feedback GET]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
