import { createHash } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import { trySpring } from '@/lib/api/spring';
import type { SessionUser } from '@/lib/auth/session';
import type { CreateProductPayload } from '@/lib/api/offering-save';
import { denyEnterpriseService } from '@/lib/catalog/offering-type';
import { generateSku } from '@/lib/utils/sku';

export function toSpringProductPayload(body: any) {
  const published =
    body.is_published === true ||
    body.is_published === 1 ||
    body.is_published === '1' ||
    String(body.publishing_status || '').toUpperCase() === 'PUBLISHED';

  const generatedSku =
    String(body.sku_id || '').trim().toUpperCase() ||
    generateSku({
      offeringName: body.offering_name,
      category: body.category,
      brand: body.brand,
      material: body.primary_material,
    });

  return {
    offering_name: body.offering_name,
    offering_type: body.offering_type || 'PRODUCT',
    sku_id: generatedSku,
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
      sku_Id: generatedSku,
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
  const typeError = denyEnterpriseService(session, payload.offering_type);
  if (typeError) {
    return { success: false as const, error: typeError, status: 403 };
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

    // Ensure SKU is 100% globally unique across the whole product catalog
    let uniqueSku = payload.sku_id;
    let attempts = 0;
    while (attempts < 10) {
      const [existingRows] = await connection.query<RowDataPacket[]>(
        `SELECT prod_id
         FROM product
         WHERE UPPER(sku_id) = ?
         LIMIT 1`,
        [uniqueSku]
      );
      if (!existingRows || existingRows.length === 0) {
        break; // Confirmed 100% unique in DB
      }
      // Regenerate if matching SKU already exists in database
      uniqueSku = generateSku({
        offeringName: payload.offering_name,
        category: payload.category,
        brand: payload.brand,
      });
      attempts++;
    }

    payload.sku_id = uniqueSku;
    row.sku_id = uniqueSku;

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

function uniqueProductKeys(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return [
    ...new Set(
      list
        .map((value) => String(value ?? '').trim())
        .filter((value) => value.length > 0)
    ),
  ];
}

async function findCatalogProductIds(
  rawIds: unknown,
  session: SessionUser
) {
  const keys = uniqueProductKeys(rawIds);
  if (keys.length === 0) {
    return { keys, localIds: [] as number[], status: 400 as const, error: 'Select at least one product.' };
  }

  await ensureAuthSchema();
  const pool = getHomesMerryDbPool();
  const placeholders = keys.map(() => '?').join(', ');
  const ownerSql = session.role === 'admin' ? '1 = 1' : 'created_by = ?';
  const ownerParams = session.role === 'admin' ? [] : [session.id];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT prod_id, sku_id, brand
     FROM product
     WHERE (${ownerSql})
       AND (prod_id IN (${placeholders})
         OR sku_id IN (${placeholders})
         OR CAST(prod_id AS CHAR) IN (${placeholders}))`,
    [...ownerParams, ...keys, ...keys, ...keys]
  );
  const localIds = [
    ...new Set((rows || []).map((row) => Number(row.prod_id)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  return { keys, localIds, rows: rows || [], pool };
}

export async function bulkUpdateCatalogOfferings(input: {
  rawIds: unknown;
  action: 'activate' | 'deactivate' | 'price';
  sellingPrice?: number;
  percent?: number;
  amount?: number;
  session: SessionUser;
  springToken?: string | null;
}) {
  const found = await findCatalogProductIds(input.rawIds, input.session);
  if (!found.pool) {
    return {
      success: false as const,
      error: found.error || 'Select at least one product.',
      status: found.status || 400,
    };
  }
  const { localIds, pool } = found;
  if (localIds.length === 0) {
    return { success: false as const, error: 'Product not found.', status: 404 };
  }

  const placeholders = localIds.map(() => '?').join(', ');
  if (input.action === 'price') {
    const amount = Number(input.amount);
    const percent = Number(input.percent ?? (Number.isFinite(amount) && amount !== 0 ? NaN : input.sellingPrice));
    const useAmount = Number.isFinite(amount) && amount !== 0;
    if (useAmount) {
      await pool.query(
        `UPDATE product
         SET selling_price = GREATEST(ROUND(selling_price + ?, 2), 0)
         WHERE prod_id IN (${placeholders})`,
        [amount, ...localIds]
      );
    } else {
      if (!Number.isFinite(percent) || percent === 0) {
        return { success: false as const, error: 'Enter a non-zero percentage or amount.', status: 400 };
      }
      if (percent < -100) {
        return { success: false as const, error: 'Percentage cannot be less than -100%.', status: 400 };
      }
      await pool.query(
        `UPDATE product
         SET selling_price = GREATEST(ROUND(selling_price * (1 + ? / 100), 2), 0)
         WHERE prod_id IN (${placeholders})`,
        [percent, ...localIds]
      );
    }
    const [updatedRows] = await pool.query<RowDataPacket[]>(
      `SELECT prod_id, selling_price FROM product WHERE prod_id IN (${placeholders})`,
      localIds
    );
    await Promise.all(
      (updatedRows || []).map((row) =>
        trySpring(
          `/products/updateProduct/${row.prod_id}`,
          { pricing: { selling_price: Number(row.selling_price) || 0 } },
          'PUT',
          input.springToken
        )
      )
    );
    return {
      success: true as const,
      updated: localIds.length,
      ids: localIds,
      action: input.action,
      percent: useAmount ? undefined : percent,
      amount: useAmount ? amount : undefined,
    };
  }

  const published = input.action === 'activate';
  const publishingStatus = published ? 'PUBLISHED' : 'DRAFT';
  await pool.query(
    `UPDATE product SET is_published = ?, publishing_status = ?, visibility = ? WHERE prod_id IN (${placeholders})`,
    [published ? 1 : 0, publishingStatus, published ? 1 : 0, ...localIds]
  );
  await Promise.all(
    localIds.map((id) =>
      trySpring(
        `/products/updateProduct/${id}`,
        {
          is_published: published,
          internal: { visibility_status: { publishing_status: publishingStatus, visibility: published } },
        },
        'PUT',
        input.springToken
      )
    )
  );
  return { success: true as const, updated: localIds.length, ids: localIds, action: input.action };
}

export async function deleteCatalogOfferings(
  rawIds: unknown,
  springToken?: string | null
) {
  const keys = uniqueProductKeys(rawIds);
  if (keys.length === 0) {
    return { success: false as const, error: 'Select at least one product to delete.', status: 400 };
  }

  await ensureAuthSchema();
  const pool = getHomesMerryDbPool();
  const placeholders = keys.map(() => '?').join(', ');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT prod_id, sku_id, brand
     FROM product
     WHERE prod_id IN (${placeholders})
        OR sku_id IN (${placeholders})
        OR CAST(prod_id AS CHAR) IN (${placeholders})`,
    [...keys, ...keys, ...keys]
  );

  const localIds = [
    ...new Set((rows || []).map((row) => Number(row.prod_id)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const springIds = [...new Set([...keys, ...localIds.map(String)])];

  const springResults = await Promise.all(
    springIds.map(async (id) => {
      const result = await trySpring(`/products/deleteProduct/${encodeURIComponent(id)}`, undefined, 'DELETE', springToken);
      return { id, ok: result.ok || result.status === 404, status: result.status };
    })
  );

  if (localIds.length > 0) {
    const localPlaceholders = localIds.map(() => '?').join(', ');
    await pool.query(`DELETE FROM product WHERE prod_id IN (${localPlaceholders})`, localIds);
    try {
      await pool.query(
        `DELETE FROM client_saved_offerings WHERE prod_id IN (${localPlaceholders}) OR prod_id IN (${keys.map(() => '?').join(', ')})`,
        [...localIds.map(String), ...keys]
      );
    } catch {
      /* table may not exist on every environment */
    }
    const brandCounts = new Map<string, number>();
    for (const row of rows || []) {
      const brand = String(row.brand || '').trim();
      if (!brand) continue;
      brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    }
    for (const [brand, count] of brandCounts) {
      await pool.query(
        `UPDATE brands
         SET offerings_count = GREATEST(CAST(offerings_count AS SIGNED) - ?, 0)
         WHERE brand_name = ?`,
        [count, brand]
      );
    }
  }

  const deleted = Math.max(localIds.length, keys.length);
  const springFailed = springResults.filter((item) => !item.ok);
  if (localIds.length === 0 && springFailed.length === springResults.length) {
    const allMissing = springResults.every((item) => item.status === 404);
    return {
      success: false as const,
      error: allMissing ? 'Product not found.' : 'Unable to delete products from the catalog service.',
      status: allMissing ? 404 : 502,
    };
  }

  return {
    success: true as const,
    deleted,
    ids: localIds.length ? localIds : keys,
    springFailed: springFailed.map((item) => item.id),
  };
}
