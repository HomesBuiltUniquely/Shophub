import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { getSessionFromRequest } from '@/lib/auth/account';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import { SPRING_TOKEN_COOKIE, trySpring } from '@/lib/api/spring';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export const runtime = 'nodejs';

function requireAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return {
      error: NextResponse.json(
        { success: false, error: 'Access denied: Admin privileges required.' },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth && auth.error) return auth.error;

    await ensureAuthSchema();
    const pool = getHomesMerryDbPool();

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
        p.created_by,
        u.email AS submitter_email,
        u.first_name AS submitter_first_name,
        u.last_name AS submitter_last_name,
        u.brand_name AS submitter_brand,
        u.role AS submitter_role
      FROM product p
      LEFT JOIN user u ON p.created_by = u.uuid
      WHERE u.role = 'ENTERPRISE' OR p.approval_status = 'PENDING' OR p.publishing_status = 'PENDING_APPROVAL' OR p.approval_status = 'REJECTED'
      ORDER BY p.prod_id DESC`
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
      count: rows.length,
      counts: {
        total: rows.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      items: rows,
    });
  } catch (error: any) {
    console.error('[API /api/admin/pending-approvals GET]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth && auth.error) return auth.error;

    const body = await request.json();
    const prodId = Number(body.prodId || body.prod_id);
    const action = String(body.action || '').toLowerCase().trim(); // 'approve' | 'reject'
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!prodId || isNaN(prodId)) {
      return NextResponse.json(
        { success: false, error: 'Valid prodId is required.' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: "action must be either 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    await ensureAuthSchema();
    const pool = getHomesMerryDbPool();

    // Verify offering exists
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT prod_id, offering_name, sku_id, approval_status, publishing_status, is_published
       FROM product
       WHERE prod_id = ?
       LIMIT 1`,
      [prodId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Offering not found.' },
        { status: 404 }
      );
    }

    const current = existing[0];
    const isApprove = action === 'approve';

    const newApprovalStatus = isApprove ? 'APPROVED' : 'REJECTED';
    const newPublishingStatus = isApprove ? 'PUBLISHED' : 'REJECTED';
    const newIsPublished = isApprove ? 1 : 0;

    await pool.query<ResultSetHeader>(
      `UPDATE product
       SET approval_status = ?,
           publishing_status = ?,
           is_published = ?
       WHERE prod_id = ?`,
      [newApprovalStatus, newPublishingStatus, newIsPublished, prodId]
    );

    // Sync to Spring Boot if available
    const springToken = request.cookies.get(SPRING_TOKEN_COOKIE)?.value;
    const springSync = await trySpring(
      `/products/updateProduct/${prodId}`,
      {
        prod_id: prodId,
        offering_name: current.offering_name,
        sku_id: current.sku_id,
        is_published: isApprove,
        visibility_status: {
          publishing_status: newPublishingStatus,
        },
      },
      'PUT',
      springToken
    );

    const message = isApprove
      ? `Offering "${current.offering_name}" has been approved and published to the Enterprise Master Catalog.`
      : `Offering "${current.offering_name}" has been rejected.`;

    return NextResponse.json({
      success: true,
      message,
      prodId,
      action,
      approval_status: newApprovalStatus,
      publishing_status: newPublishingStatus,
      is_published: Boolean(newIsPublished),
      notes,
      spring: springSync,
    });
  } catch (error: any) {
    console.error('[API /api/admin/pending-approvals POST]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process approval action' },
      { status: 500 }
    );
  }
}
