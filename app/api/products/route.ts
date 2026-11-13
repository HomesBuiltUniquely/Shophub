import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { getSessionFromRequest } from '@/lib/auth/account';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import { fetchAllSpringProducts } from '@/lib/api/spring';
import {
  deduplicateProducts,
  filterEnterpriseProducts,
} from '@/lib/auth/product-visibility';
import { canViewServices, filterVisibleByType, isServiceOffering, productTypeSql } from '@/lib/catalog/offering-type';

function isPublishedRow(row: any): boolean {
  const value = row?.is_published;
  if (value == null) return false;
  if (Buffer.isBuffer(value)) return value[0] === 1;
  return value === 1 || value === true || value === '1';
}

function parseJson(value: unknown, fallback: unknown) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function mapProductRow(row: any) {
  const sellingPrice = Number(row.selling_price ?? row.price ?? 0);
  const costPrice = Number(row.cost_price ?? 0);
  const galleryImages = parseJson(row.gallery_images, []) as string[];
  const allowedUsers = parseJson(row.allowed_users, []) as string[];
  const seoKeywords = parseJson(row.seo_keywords, []) as string[];
  const additionalAttributes = parseJson(row.additional_attributes, []) as any[];

  return {
    prodId: row.prodId ?? row.prod_id ?? row.id ?? row.sku_id,
    image_url: row.primary_image || row.image_url || '',
    primary_image: row.primary_image || row.image_url || '',
    offering_name: row.offering_name || row.product_name || 'Unnamed Offering',
    offering_type: row.offering_type || 'PRODUCT',
    sku_id: row.sku_id || row.sku || '',
    category: row.category || 'FURNITURE',
    brand: row.brand || '',
    brand_id: row.brand_id ?? null,
    tags: Array.isArray(seoKeywords) ? seoKeywords : [],
    short_desc: row.short_desc || '',
    long_desc: row.long_desc || '',
    featured_offer: Boolean(row.featured_offer),
    is_published: isPublishedRow(row),
    created_by: row.created_by ?? null,
    pricing: {
      selling_price: sellingPrice,
      cost_price: costPrice,
      cost: costPrice,
      discount: Number(row.discount ?? 0),
      gst_rate: row.gst_rate || 'GST_18',
      units: row.price_unit || row.units || 'PER_PIECE',
      desc: row.pricing_desc || '',
    },
    inventory: {
      sku_Id: row.inventory_sku_id || row.sku_id || '',
      barcode: row.barcode || '',
      current_stock: Number(row.current_stock ?? 0),
      minimum_stock_level: Number(row.minimum_stock_level ?? 0),
      reorder_quantity: Number(row.reorder_quantity ?? 0),
      sourcingLogistics: {
        preferred_vendor: row.preferred_vendor || '',
        lead_time: Number(row.lead_time ?? 0),
      },
    },
    media: {
      primary_image: row.primary_image || row.image_url || '',
      gallery_images: Array.isArray(galleryImages) ? galleryImages : [],
      video_link: row.video_link || '',
      image_360: row.image_360 || '',
      product_brochure: row.product_brochure || '',
      upload_draw: row.upload_draw || '',
    },
    specifications: {
      physical_dimensions: {
        length: Number(row.length_cm ?? 0),
        width: Number(row.width_cm ?? 0),
        height: Number(row.height_cm ?? 0),
        weight: Number(row.weight_kg ?? 0),
      },
      material_finish: {
        primary_material: row.primary_material || '',
        secondary_material: row.secondary_material || '',
        finish_type: row.finish_type || '',
      },
      technical_properties: {
        load_capacity: row.load_capacity || '',
      },
      additional_attributes: Array.isArray(additionalAttributes) ? additionalAttributes : [],
    },
    seo: {
      page_title: row.page_title || '',
      meta_desc: row.meta_desc || '',
      url_slug: row.url_slug || '',
      keywords: Array.isArray(seoKeywords) ? seoKeywords : [],
    },
    internal: {
      visibility_status: {
        publishing_status: row.publishing_status || (row.is_published ? 'PUBLISHED' : 'DRAFT'),
        visibility: row.visibility !== 0 && row.visibility !== false,
      },
      access_permissions: {
        allowed_users: Array.isArray(allowedUsers) ? allowedUsers : [],
        restricted_region: row.restricted_region || '',
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const pool = getHomesMerryDbPool();
    const ownerWhere =
      session.role === 'admin'
        ? '1 = 1'
        : session.role === 'enterprise'
          ? '(created_by = ? OR CAST(is_published AS UNSIGNED) = 1)'
          : 'CAST(is_published AS UNSIGNED) = 1';
    const ownerParams = session.role === 'enterprise' ? [session.id] : [];
    const typeSql = productTypeSql(session);

    if (id) {
      const [rows]: any = await pool.query(
        `SELECT * FROM product WHERE (prod_id = ? OR sku_id = ?) AND ${ownerWhere}${typeSql} LIMIT 1`,
        [id, id, ...ownerParams]
      );
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        try {
          const springUrl = process.env.NEXT_PUBLIC_SPRING_BOOT_URL || 'http://localhost:8080';
          const springRes = await fetch(`${springUrl}/api/v1/products/getProduct/${encodeURIComponent(String(id))}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (springRes.ok) {
            const springData = await springRes.json();
            if (springData) return NextResponse.json(springData);
          }
        } catch {
          // ignore spring fallback error
        }
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (!canViewServices(session) && isServiceOffering(row.offering_type)) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (!canViewServices(session) && isServiceOffering(row.offering_type)) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(mapProductRow(row));
    }

    const page = Math.max(0, Number(searchParams.get('page') || 0));
    const size = Math.min(200, Math.max(1, Number(searchParams.get('size') || 50)));
    const publishedParam = searchParams.get('is_published');
    const isPublished =
      publishedParam == null ? true : publishedParam === 'true' || publishedParam === '1';
    const sort = searchParams.get('sort') || 'prodId,asc';
    const springProducts = await fetchAllSpringProducts({ isPublished, sort });
    const springCatalog =
      session.role === 'enterprise'
        ? await filterEnterpriseProducts(springProducts, session.id)
        : deduplicateProducts(springProducts);

    let localCatalog: any[] = [];
    const listWhere =
      session.role === 'enterprise'
        ? "CAST(is_published AS UNSIGNED) = 1 AND (approval_status IS NULL OR approval_status = 'APPROVED')"
        : ownerWhere;
    const listParams = session.role === 'enterprise' ? [] : ownerParams;

    try {
      const publishedSql = isPublished && session.role !== 'enterprise' ? ' AND CAST(is_published AS UNSIGNED) = 1' : '';
      const [localRows]: any = await pool.query(
        `SELECT * FROM product WHERE ${listWhere}${publishedSql}${typeSql} ORDER BY prod_id DESC`,
        listParams
      );
      localCatalog = deduplicateProducts((Array.isArray(localRows) ? localRows : []).map(mapProductRow));
    } catch (error: any) {
      console.warn('[API /api/products GET] Local catalog skipped:', error?.message || error);
    }
    const merged = new Map<string, any>();
    for (const product of springCatalog) {
      const key = String(product.sku_id || product.sku || product.prodId || '').trim().toUpperCase();
      if (key) merged.set(key, product);
    }
    for (const product of localCatalog) {
      const key = String(product.sku_id || product.sku || product.prodId || '').trim().toUpperCase();
      if (key && !merged.has(key)) merged.set(key, product);
    }
    let catalogProducts = filterVisibleByType(Array.from(merged.values()), session);
    if (session.role === 'enterprise') {
      catalogProducts = catalogProducts.filter((p: any) => {
        const isPub = p.is_published ?? p.isPublished;
        const approval = p.approval_status ?? p.approvalStatus;
        const publishing = p.publishing_status ?? p.publishingStatus;
        if (approval === 'PENDING' || approval === 'REJECTED') return false;
        if (publishing === 'PENDING_APPROVAL' || publishing === 'REJECTED') return false;
        if (isPub === false || isPub === 0 || isPub === '0') return false;
        return true;
      });
    }
    if (catalogProducts.length > 0) {
      const totalElements = catalogProducts.length;
      const totalPages = Math.max(1, Math.ceil(totalElements / size));
      const content = catalogProducts.slice(page * size, (page + 1) * size);
      return NextResponse.json({
        content,
        totalElements,
        totalPages,
        size,
        number: page,
        first: page === 0,
        last: page >= totalPages - 1,
        numberOfElements: content.length,
        empty: content.length === 0,
        source: springCatalog.length ? 'spring+local' : 'local',
      });
    }

    const offset = page * size;
    const uniqueProductIdsSql = `
      SELECT MAX(prod_id) AS prod_id
      FROM product
      WHERE ${listWhere}${typeSql}
      GROUP BY COALESCE(NULLIF(UPPER(TRIM(sku_id)), ''), CONCAT('ID:', prod_id))
    `;

    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM (${uniqueProductIdsSql}) AS unique_products`,
      listParams
    );
    const totalElements = Number(countRows?.[0]?.total ?? 0);

    const [rows]: any = await pool.query(
      `SELECT product.*
       FROM product
       INNER JOIN (${uniqueProductIdsSql}) AS unique_products
         ON unique_products.prod_id = product.prod_id
       ORDER BY product.prod_id DESC
       LIMIT ? OFFSET ?`,
      [...listParams, ...listParams, size, offset]
    );

    const content = deduplicateProducts(
      (Array.isArray(rows) ? rows : []).map(mapProductRow)
    );
    const totalPages = Math.max(1, Math.ceil(totalElements / size));

    return NextResponse.json({
      content,
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: page >= totalPages - 1,
      numberOfElements: content.length,
      empty: content.length === 0,
    });
  } catch (error: any) {
    console.error('[API /api/products GET] Failed to load products from MySQL:', error?.message || error);
    return NextResponse.json(
      {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 0,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true,
        error: error?.message || 'Failed to load products',
      },
      { status: 200 }
    );
  }
}
