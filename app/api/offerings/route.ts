import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { getSessionFromRequest } from '@/lib/auth/account';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import { SPRING_TOKEN_COOKIE, trySpring } from '@/lib/api/spring';
import { createCatalogOffering, deleteCatalogOfferings, localProductValues, toSpringProductPayload } from '@/lib/api/catalog-write';
import { denyEnterpriseService } from '@/lib/catalog/offering-type';

function requireCatalogUser(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || (session.role !== 'enterprise' && session.role !== 'admin')) {
    return { error: NextResponse.json({ success: false, error: 'Only admin or enterprise users can manage offerings.' }, { status: 403 }) };
  }
  return { session };
}

function requireAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Only admins can delete products.' }, { status: 403 }) };
  }
  return { session };
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireCatalogUser(request);
    if ('error' in auth && auth.error) return auth.error;
    const session = auth.session!;
    const body = await request.json();
    const result = await createCatalogOffering(
      body,
      session,
      request.cookies.get(SPRING_TOKEN_COOKIE)?.value
    );
    return NextResponse.json(result, { status: result.success ? 200 : result.status || 400 });
  } catch (error: any) {
    console.error('[API /api/offerings POST]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create offering' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireCatalogUser(request);
    if ('error' in auth && auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const prodId = Number(body.prodId || body.prod_id);
    if (!prodId) {
      return NextResponse.json({ success: false, error: 'prodId is required to update.' }, { status: 400 });
    }

    const payload = toSpringProductPayload(body);
    const typeError = denyEnterpriseService(session, payload.offering_type);
    if (typeError) {
      return NextResponse.json({ success: false, error: typeError }, { status: 403 });
    }
    await ensureAuthSchema();
    const pool = getHomesMerryDbPool();
    const ownerSql = session.role === 'admin' ? 'prod_id = ?' : 'prod_id = ? AND created_by = ?';
    const ownerParams = session.role === 'admin' ? [prodId] : [prodId, session.id];
    const [existing]: any = await pool.query(`SELECT prod_id FROM product WHERE ${ownerSql} LIMIT 1`, ownerParams);
    if (!Array.isArray(existing) || !existing[0]) {
      return NextResponse.json({ success: false, error: 'Offering not found.' }, { status: 404 });
    }

    const row = localProductValues(payload, session.id);
    const spring = await trySpring(
      `/products/updateProduct/${prodId}`,
      payload,
      'PUT',
      request.cookies.get(SPRING_TOKEN_COOKIE)?.value
    );

    await pool.query(
      `UPDATE product SET
        offering_name=?, offering_type=?, sku_id=?, category=?, brand=?, current_stock=?,
        selling_price=?, cost_price=?, is_published=?, publishing_status=?,
        gallery_images=?, allowed_users=?, seo_keywords=?,
        finish_type=?, load_capacity=?, preferred_vendor=?, primary_material=?, secondary_material=?,
        gst_rate=?, price_unit=?, discount=?, lead_time=?, minimum_stock_level=?, reorder_quantity=?,
        short_desc=?, long_desc=?, featured_offer=?, primary_image=?, page_title=?, meta_desc=?, url_slug=?,
        video_link=?, image_360=?, length_cm=?, width_cm=?, height_cm=?, weight_kg=?
      WHERE prod_id=?`,
      [
        row.offering_name, row.offering_type, row.sku_id, row.category, row.brand, row.current_stock,
        row.selling_price, row.cost_price, row.is_published, row.publishing_status,
        row.gallery_images, JSON.stringify(payload.internal?.access_permissions?.allowed_users || []), row.seo_keywords,
        row.finish_type, row.load_capacity, row.preferred_vendor, row.primary_material, row.secondary_material,
        row.gst_rate, row.price_unit, row.discount, row.lead_time, row.minimum_stock_level, row.reorder_quantity,
        row.short_desc, row.long_desc, row.featured_offer, row.primary_image, row.page_title, row.meta_desc, row.url_slug,
        row.video_link, row.image_360, row.length_cm, row.width_cm, row.height_cm, row.weight_kg,
        prodId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: payload.is_published
        ? `Offering "${payload.offering_name}" updated and published`
        : `Draft "${payload.offering_name}" updated`,
      prodId,
      spring,
    });
  } catch (error: any) {
    console.error('[API /api/offerings PUT]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update offering' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth && auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const ids = body?.ids ?? body?.id ?? request.nextUrl.searchParams.getAll('id');
    const result = await deleteCatalogOfferings(ids, request.cookies.get(SPRING_TOKEN_COOKIE)?.value);
    return NextResponse.json(result, { status: result.success ? 200 : result.status || 400 });
  } catch (error: any) {
    console.error('[API /api/offerings DELETE]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete offerings' },
      { status: 500 }
    );
  }
}
