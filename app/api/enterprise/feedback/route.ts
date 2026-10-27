import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ensureFeedbackSchema } from '@/lib/feedback/ensure';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

function requireEnterprise(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || (session.role !== 'enterprise' && session.role !== 'admin')) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Access denied: Enterprise account required.' },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/**
 * GET /api/enterprise/feedback
 * Enterprise views client reviews submitted for products in their brand catalog.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireEnterprise(request);
    if ('error' in auth && auth.error) return auth.error;
    const session = auth.session!;

    await ensureFeedbackSchema();
    const pool = getHomesMerryDbPool();

    const brandName = session.brand || 'Hub Homes';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        f.id,
        f.prod_id,
        f.product_name,
        f.sku_id,
        f.enterprise_name,
        f.client_name,
        f.rating,
        f.comment,
        f.is_visible,
        f.created_at,
        p.primary_image AS product_image
      FROM product_feedback f
      LEFT JOIN product p ON f.prod_id = p.prod_id
      WHERE LOWER(f.enterprise_name) = LOWER(?) OR f.enterprise_id = ?
      ORDER BY f.created_at DESC`,
      [brandName, session.id]
    );

    const items = Array.isArray(rows) ? rows : [];

    // Calculate metrics
    const totalCount = items.length;
    const totalRating = items.reduce((acc, it) => acc + Number(it.rating || 0), 0);
    const averageRating = totalCount > 0 ? Number((totalRating / totalCount).toFixed(1)) : 0;

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const item of items) {
      const r = Number(item.rating);
      if (r >= 1 && r <= 5) distribution[r] = (distribution[r] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      brandName,
      metrics: {
        totalReviews: totalCount,
        averageRating,
        ratingDistribution: distribution,
      },
      reviews: items,
    });
  } catch (error: any) {
    console.error('[API /api/enterprise/feedback GET]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch enterprise feedback' },
      { status: 500 }
    );
  }
}
