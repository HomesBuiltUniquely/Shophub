import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ensureFeedbackSchema } from '@/lib/feedback/ensure';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

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
 * PATCH /api/admin/feedback/[id]/visibility
 * Admin controls visibility using a Show to Clients / Hide from Clients toggle.
 * Body: { isVisible: boolean }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth && auth.error) return auth.error;
    const session = auth.session!;

    const params = await context.params;
    const feedbackId = Number(params?.id);
    if (!feedbackId || isNaN(feedbackId)) {
      return NextResponse.json({ success: false, error: 'Valid feedback ID required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.isVisible !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Request body must contain boolean isVisible.' },
        { status: 400 }
      );
    }

    await ensureFeedbackSchema();
    const pool = getHomesMerryDbPool();

    // Verify feedback exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id, prod_id, product_name, client_name, is_visible FROM product_feedback WHERE id = ? LIMIT 1',
      [feedbackId]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Feedback record not found.' }, { status: 404 });
    }

    const current = existing[0];
    const newIsVisible = body.isVisible ? 1 : 0;

    await pool.query<ResultSetHeader>(
      `UPDATE product_feedback
       SET is_visible = ?,
           toggled_by = ?,
           toggled_at = NOW()
       WHERE id = ?`,
      [newIsVisible, session.id, feedbackId]
    );

    const message = body.isVisible
      ? `Feedback for "${current.product_name}" is now visible to verified clients.`
      : `Feedback for "${current.product_name}" is now hidden from clients.`;

    return NextResponse.json({
      success: true,
      message,
      id: feedbackId,
      is_visible: Boolean(newIsVisible),
      product_name: current.product_name,
    });
  } catch (error: any) {
    console.error('[API /api/admin/feedback/[id]/visibility PATCH]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update feedback visibility' },
      { status: 500 }
    );
  }
}
