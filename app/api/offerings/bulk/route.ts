import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { SPRING_TOKEN_COOKIE } from '@/lib/api/spring';
import { bulkUpdateCatalogOfferings } from '@/lib/api/catalog-write';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || (session.role !== 'admin' && session.role !== 'enterprise')) {
      return NextResponse.json(
        { success: false, error: 'Only admin or enterprise users can bulk-edit products.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').toLowerCase();
    if (action !== 'activate' && action !== 'deactivate' && action !== 'price') {
      return NextResponse.json({ success: false, error: 'Unknown bulk action.' }, { status: 400 });
    }

    const result = await bulkUpdateCatalogOfferings({
      rawIds: body?.ids ?? body?.id,
      action,
      sellingPrice: body?.selling_price ?? body?.sellingPrice,
      percent: body?.percent,
      session,
      springToken: request.cookies.get(SPRING_TOKEN_COOKIE)?.value,
    });
    return NextResponse.json(result, { status: result.success ? 200 : result.status || 400 });
  } catch (error: any) {
    console.error('[API /api/offerings/bulk POST]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update products.' },
      { status: 500 }
    );
  }
}
