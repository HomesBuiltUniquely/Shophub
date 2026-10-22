import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { getSessionFromRequest } from '@/lib/auth/account';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

function requireEnterprise(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || (session.role !== 'enterprise' && session.role !== 'admin')) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Access denied: Enterprise privileges required.' },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireEnterprise(request);
    if ('error' in auth && auth.error) return auth.error;
    const session = auth.session!;

    await ensureAuthSchema();
    const pool = getHomesMerryDbPool();

    // Enterprise users see their own submissions; Admins can see all if testing
    const whereSql = session.role === 'enterprise' ? 'WHERE p.created_by = ?' : 'WHERE 1 = 1';
    const params = session.role === 'enterprise' ? [session.id] : [];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.prod_id,
        p.offering_name,
        p.offering_type,
        p.sku_id,
        p.category,
        p.brand,
        p.current_stock,
        p.minimum_stock_level,
        p.reorder_quantity,
        p.lead_time,
        p.preferred_vendor,
        p.selling_price,
        p.cost_price,
        p.discount,
        p.gst_rate,
        p.price_unit,
        p.is_published,
        p.publishing_status,
        p.approval_status,
        p.primary_image,
        p.gallery_images,
        p.short_desc,
        p.long_desc,
        p.primary_material,
        p.secondary_material,
        p.finish_type,
        p.load_capacity,
        p.length_cm,
        p.width_cm,
        p.height_cm,
        p.weight_kg,
        p.created_by
      FROM product p
      ${whereSql}
      ORDER BY p.prod_id DESC`,
      params
    );

    // Compute status counts
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const r of rows) {
      const approval = String(r.approval_status || '').toUpperCase();
      const publishing = String(r.publishing_status || '').toUpperCase();

      if (approval === 'REJECTED' || publishing === 'REJECTED') {
        rejectedCount++;
      } else if (approval === 'PENDING' || publishing === 'PENDING_APPROVAL') {
        pendingCount++;
      } else if (approval === 'APPROVED' || publishing === 'PUBLISHED') {
        approvedCount++;
      } else {
        pendingCount++;
      }
    }

    return NextResponse.json({
      success: true,
      counts: {
        total: rows.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      items: rows,
    });
  } catch (error: any) {
    console.error('[API /api/enterprise/pending-approvals GET]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch enterprise submissions' },
      { status: 500 }
    );
  }
}
