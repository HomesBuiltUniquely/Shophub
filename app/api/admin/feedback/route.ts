import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ensureFeedbackSchema } from '@/lib/feedback/ensure';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

function requireAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return {
      error: NextResponse.json(
        { success: false, error: 'Access denied: Administrator privileges required.' },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/**
 * GET /api/admin/feedback
 * Administrator reads all client feedback across all enterprises and products.
 * Includes metrics (total, visible, hidden, avg rating) and filter/search capabilities.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth && auth.error) return auth.error;

    await ensureFeedbackSchema();
    const pool = getHomesMerryDbPool();

    const { searchParams } = new URL(request.url);
    const visibilityParam = searchParams.get('visibility')?.toLowerCase(); // 'all' | 'visible' | 'hidden'
    const enterpriseParam = searchParams.get('enterprise')?.trim();
    const ratingParam = searchParams.get('rating');
    const searchParam = searchParams.get('search')?.trim().toLowerCase();

    const whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    if (visibilityParam === 'visible') {
      whereClauses.push('f.is_visible = 1');
    } else if (visibilityParam === 'hidden') {
      whereClauses.push('f.is_visible = 0');
    }

    if (enterpriseParam && enterpriseParam !== 'all') {
      whereClauses.push('LOWER(f.enterprise_name) = LOWER(?)');
      params.push(enterpriseParam);
    }

    if (ratingParam && ratingParam !== 'all') {
      const r = Number(ratingParam);
      if (!isNaN(r) && r >= 1 && r <= 5) {
        whereClauses.push('f.rating = ?');
        params.push(r);
      }
    }

    if (searchParam) {
      whereClauses.push(`(
        LOWER(f.product_name) LIKE ? OR
        LOWER(f.enterprise_name) LIKE ? OR
        LOWER(f.client_name) LIKE ? OR
        LOWER(f.client_email) LIKE ? OR
        LOWER(f.comment) LIKE ? OR
        LOWER(COALESCE(f.purchase_ref, '')) LIKE ?
      )`);
      const wild = `%${searchParam}%`;
      params.push(wild, wild, wild, wild, wild, wild);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Fetch filtered items
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        f.id,
        f.prod_id,
        f.product_name,
        f.sku_id,
        f.enterprise_id,
        f.enterprise_name,
        f.client_id,
        f.client_name,
        f.client_email,
        f.rating,
        f.comment,
        f.purchase_ref,
        f.is_visible,
        f.toggled_by,
        f.toggled_at,
        f.created_at,
        f.updated_at,
        p.primary_image AS product_image
      FROM product_feedback f
      LEFT JOIN product p ON f.prod_id = p.prod_id
      WHERE ${whereSql}
      ORDER BY f.created_at DESC`,
      params
    );

    // 2. Fetch overall metrics
    const [summaryRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) AS total_count,
        SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) AS visible_count,
        SUM(CASE WHEN is_visible = 0 THEN 1 ELSE 0 END) AS hidden_count,
        AVG(rating) AS average_rating
      FROM product_feedback`
    );

    const summary = Array.isArray(summaryRows) && summaryRows[0] ? summaryRows[0] : null;

    // 3. Fetch distinct enterprises for filter dropdown
    const [enterpriseRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT enterprise_name FROM product_feedback WHERE enterprise_name IS NOT NULL AND enterprise_name != '' ORDER BY enterprise_name ASC`
    );

    const enterprises = Array.isArray(enterpriseRows)
      ? enterpriseRows.map((r: any) => r.enterprise_name)
      : [];

    return NextResponse.json({
      success: true,
      items: items || [],
      counts: {
        total: Number(summary?.total_count || 0),
        visible: Number(summary?.visible_count || 0),
        hidden: Number(summary?.hidden_count || 0),
        averageRating: summary?.average_rating ? Number(Number(summary.average_rating).toFixed(1)) : 0,
      },
      enterprises,
    });
  } catch (error: any) {
    console.error('[API /api/admin/feedback GET]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin feedback' },
      { status: 500 }
    );
  }
}
