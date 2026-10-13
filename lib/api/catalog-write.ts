import { createHash } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import { trySpring } from '@/lib/api/spring';
import type { SessionUser } from '@/lib/auth/session';
import type { CreateProductPayload } from '@/lib/api/offering-save';

export function toSpringProductPayload(body: any) {
  const published =
    body.is_published === true ||
    body.is_published === 1 ||
    body.is_published === '1' ||
    String(body.publishing_status || '').toUpperCase() === 'PUBLISHED';

  return {
    offering_name: body.offering_name,
    offering_type: body.offering_type || 'PRODUCT',
    sku_id: String(body.sku_id || '').trim().toUpperCase(),
    category: String(body.category || 'FURNITURE').toUpperCase(),
    brand: body.brand,
    brand_id: body.brand_id != null && body.brand_id !== '' ? Number(body.brand_id) : undefined,
    tags: Array.isArray(body.tags) ? body.tags : [],
    short_desc: body.short_desc || body.offering_name,
    long_desc: body.long_desc || body.short_desc || body.offering_name,
    featured_offer: Boolean(body.featured_offer),
    is_published: published,
    pricing: body.pricing || {
      selling_price: Number(body.selling_price) || 0,
      cost_price: Number(body.cost_price) || 0,
      discount: Number(body.discount) || 0,
      gst_rate: body.gst_rate || 'GST_18',
      units: body.units || 'PER_PIECE',
    },
    inventory: body.inventory || {
      sku_Id: String(body.sku_id || '').trim().toUpperCase(),
      current_stock: Number(body.current_stock) || 0,
      sourcingLogistics: {
        preferred_vendor: body.preferred_vendor || 'IN_HOUSE',
        lead_time: Number(body.lead_time) || 0,
      },
    },
    media: body.media,
    specifications: body.specifications,
    seo: body.seo,
    internal: body.internal || {
      visibility_status: {
        publishing_status: published ? 'PUBLISHED' : 'DRAFT',
        visibility: true,
      },
      access_permissions: {
        allowed_users: ['admin@example.com'],
        restricted_region: 'NONE',
      },
    },
  };
}

export function localProductValues(payload: ReturnType<typeof toSpringProductPayload>, sessionId: number) {
  return {
    offering_name: payload.offering_name,
    offering_type: payload.offering_type,
    sku_id: payload.sku_id,
    category: payload.category,
    brand: payload.brand || '',
    current_stock: Number(payload.inventory?.current_stock) || 0,
    selling_price: Number(payload.pricing?.selling_price) || 0,
    cost_price: Number(payload.pricing?.cost_price) || 0,
    is_published: payload.is_published ? 1 : 0,
    publishing_status: payload.is_published ? 'PUBLISHED' : 'DRAFT',
    gallery_images: JSON.stringify(payload.media?.gallery_images || []),
    seo_keywords: JSON.stringify(payload.seo?.keywords || payload.tags || []),
    finish_type: payload.specifications?.material_finish?.finish_type || 'MATTE',
    load_capacity: payload.specifications?.technical_properties?.load_capacity || 'UP_TO_200_KG',
    preferred_vendor: payload.inventory?.sourcingLogistics?.preferred_vendor || '',
    primary_material: payload.specifications?.material_finish?.primary_material || 'SOLID_WOOD',
    secondary_material: payload.specifications?.material_finish?.secondary_material || '',
    gst_rate: payload.pricing?.gst_rate || 'GST_18',
    price_unit: payload.pricing?.units || 'PER_PIECE',
    discount: Number(payload.pricing?.discount) || 0,
    lead_time: Number(payload.inventory?.sourcingLogistics?.lead_time) || 0,
    minimum_stock_level: Number(payload.inventory?.minimum_stock_level) || 0,
    reorder_quantity: Number(payload.inventory?.reorder_quantity) || 0,
    short_desc: payload.short_desc,
    long_desc: payload.long_desc,
    featured_offer: payload.featured_offer ? 1 : 0,
    primary_image: payload.media?.primary_image || '',
    page_title: payload.seo?.page_title || payload.offering_name,
    meta_desc: payload.seo?.meta_desc || payload.short_desc || '',
    url_slug: payload.seo?.url_slug || '',
    video_link: payload.media?.video_link || '',
    image_360: payload.media?.image_360 || '',
    length_cm: Number(payload.specifications?.physical_dimensions?.length) || 0,
    width_cm: Number(payload.specifications?.physical_dimensions?.width) || 0,
    height_cm: Number(payload.specifications?.physical_dimensions?.height) || 0,
    weight_kg: Number(payload.specifications?.physical_dimensions?.weight) || 0,
    created_by: sessionId,
  };
}

export async function createCatalogOffering(
  body: CreateProductPayload | Record<string, unknown>,
  session: SessionUser,
  springToken?: string | null
) {
  const payload = toSpringProductPayload(body);
  if (!payload.offering_name || !payload.sku_id) {
    return { success: false as const, error: 'offering_name and sku_id are required.', status: 400 };
  }

  await ensureAuthSchema();
  const pool = getHomesMerryDbPool();
  const row = localProductValues(payload, session.id);
  const lockName = `shophub:create:${session.id}:${createHash('sha256')
    .update(payload.sku_id)
    .digest('hex')
    .slice(0, 24)}`;
  const connection = await pool.getConnection();
  let lockAcquired = false;
  let connectionDestroyed = false;

  try {
    const [lockRows] = await connection.query<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [lockName]
    );
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) {
      return { success: false as const, error: 'This offering is being saved. Please try again shortly.', status: 503 };
    }

    const [existingRows] = await connection.query<RowDataPacket[]>(
      `SELECT prod_id
       FROM product
       WHERE UPPER(sku_id) = ? AND created_by = ?
       ORDER BY prod_id ASC
       LIMIT 1`,
      [payload.sku_id, session.id]
    );
    const existingId = existingRows[0]?.prod_id;
    if (existingId != null) {
      return {
        success: true as const,
        alreadyExists: true,
        message: `Offering with SKU "${payload.sku_id}" already exists.`,
        prodId: existingId,
      };
    }

    const spring = await trySpring('/products/createProduct', payload, 'POST', springToken);
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO product (
        offering_name, offering_type, sku_id, category, brand, current_stock,
        selling_price, cost_price, is_published, publishing_status,
        gallery_images, additional_attributes, allowed_users, seo_keywords,
        finish_type, load_capacity, preferred_vendor, primary_material, secondary_material,
        restricted_region, gst_rate, price_unit, discount, lead_time, minimum_stock_level, reorder_quantity,
        pricing_desc, short_desc, long_desc, inventory_sku_id, featured_offer, inventory_sync, procurement_pipeline, sales_module, visibility,
        created_by, primary_image, page_title, meta_desc, url_slug, video_link, image_360, length_cm, width_cm, height_cm, weight_kg
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, '[]', ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 1, 1, 1, 1,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        row.offering_name, row.offering_type, row.sku_id, row.category, row.brand, row.current_stock,
        row.selling_price, row.cost_price, row.is_published, row.publishing_status,
        row.gallery_images, JSON.stringify(payload.internal?.access_permissions?.allowed_users || ['admin@example.com']), row.seo_keywords,
        row.finish_type, row.load_capacity, row.preferred_vendor, row.primary_material, row.secondary_material,
        payload.internal?.access_permissions?.restricted_region || 'NONE', row.gst_rate, row.price_unit, row.discount, row.lead_time, row.minimum_stock_level, row.reorder_quantity,
        payload.pricing?.desc || 'Standard pricing', row.short_desc, row.long_desc, payload.sku_id, row.featured_offer,
        row.created_by, row.primary_image, row.page_title, row.meta_desc, row.url_slug, row.video_link, row.image_360, row.length_cm, row.width_cm, row.height_cm, row.weight_kg,
      ]
    );

    if (payload.brand) {
      await connection.query(
        `UPDATE brands SET offerings_count = offerings_count + 1 WHERE brand_name = ?`,
        [payload.brand]
      );
    }

    const springId =
      Number((spring.data as any)?.prodId || (spring.data as any)?.data?.prodId || (spring.data as any)?.id) ||
      undefined;

    return {
      success: true as const,
      message: payload.is_published
        ? `Offering "${payload.offering_name}" published`
        : `Draft "${payload.offering_name}" saved`,
      prodId: springId || result.insertId,
      spring,
    };
  } finally {
    try {
      if (lockAcquired) {
        await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    } catch (error) {
      connection.destroy();
      connectionDestroyed = true;
      throw error;
    } finally {
      if (!connectionDestroyed) connection.release();
    }
  }
}
