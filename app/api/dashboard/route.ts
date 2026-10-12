import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { getSessionFromRequest } from '@/lib/auth/account';
import { ensureAuthSchema } from '@/lib/auth/ensure';
import { fetchAllSpringProducts } from '@/lib/api/spring';
import {
  deduplicateProducts,
  filterEnterpriseProducts,
} from '@/lib/auth/product-visibility';

function publishedExpr() {
  return `CAST(is_published AS UNSIGNED) = 1`;
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const session = getSessionFromRequest(request);
    if (!session || (session.role !== 'admin' && session.role !== 'enterprise')) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const springProducts = await fetchAllSpringProducts();
    const scopedSpring =
      session.role === 'enterprise'
        ? await filterEnterpriseProducts(springProducts, session.id)
        : deduplicateProducts(springProducts);
    if (scopedSpring.length > 0) {
      const quoteStats = await loadQuoteStats(getHomesMerryDbPool());
      return NextResponse.json({ success: true, source: 'spring', ...buildStatsFromProducts(scopedSpring), quotes: quoteStats });
    }

    const pool = getHomesMerryDbPool();
    const ownerWhere = session.role === 'admin' ? '1 = 1' : 'created_by = ?';
    const ownerParams = session.role === 'admin' ? [] : [session.id];
    const published = publishedExpr();

    const [statRows]: any = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN ${published} AND UPPER(IFNULL(publishing_status,'')) <> 'ARCHIVED' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN (NOT ${published}) AND UPPER(IFNULL(publishing_status,'')) <> 'ARCHIVED' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN UPPER(IFNULL(publishing_status,'')) = 'ARCHIVED' THEN 1 ELSE 0 END) AS archived,
        SUM(CASE WHEN UPPER(IFNULL(offering_type,'PRODUCT')) = 'PRODUCT' THEN 1 ELSE 0 END) AS products,
        SUM(CASE WHEN UPPER(IFNULL(offering_type,'')) = 'SERVICE' THEN 1 ELSE 0 END) AS services,
        SUM(CASE WHEN UPPER(IFNULL(offering_type,'')) IN ('PACKAGE','BUNDLE') THEN 1 ELSE 0 END) AS packages,
        SUM(CASE WHEN primary_image IS NULL OR TRIM(primary_image) = '' THEN 1 ELSE 0 END) AS missing_images,
        SUM(CASE WHEN IFNULL(selling_price,0) = 0 THEN 1 ELSE 0 END) AS missing_pricing,
        SUM(CASE WHEN IFNULL(length_cm,0) = 0 AND IFNULL(width_cm,0) = 0 AND IFNULL(height_cm,0) = 0 THEN 1 ELSE 0 END) AS missing_specs,
        SUM(CASE WHEN (primary_image IS NOT NULL AND TRIM(primary_image) <> '') AND IFNULL(selling_price,0) > 0 THEN 1 ELSE 0 END) AS ready_count
      FROM product
      WHERE ${ownerWhere}`,
      ownerParams
    );

    const s = statRows?.[0] || {};
    const total = Number(s.total || 0);
    const active = Number(s.active || 0);
    const drafts = Number(s.drafts || 0);
    const archived = Number(s.archived || 0);
    const products = Number(s.products || 0);
    const services = Number(s.services || 0);
    const packages = Number(s.packages || 0);
    const missingImages = Number(s.missing_images || 0);
    const missingPricing = Number(s.missing_pricing || 0);
    const missingSpecs = Number(s.missing_specs || 0);
    const readyCount = Number(s.ready_count || 0);
    const healthPercent = total ? Math.round((readyCount / total) * 100) : 0;
    const skuWarnings = missingImages + missingPricing + missingSpecs;
    const compositionTotal = Math.max(1, products + services + packages);

    const [topRows]: any = await pool.query(
      `SELECT prod_id, offering_name, sku_id, category, offering_type, selling_price, price_unit,
              current_stock, minimum_stock_level, primary_image, publishing_status, is_published
       FROM product
       WHERE ${ownerWhere}
       ORDER BY current_stock DESC, selling_price DESC, prod_id DESC
       LIMIT 5`,
      ownerParams
    );

    const [recentRows]: any = await pool.query(
      `SELECT prod_id, offering_name, sku_id, publishing_status, is_published, category, selling_price
       FROM product
       WHERE ${ownerWhere}
       ORDER BY prod_id DESC
       LIMIT 6`,
      ownerParams
    );

    const quoteStats = await loadQuoteStats(pool);

    return NextResponse.json({
      success: true,
      source: 'mysql',
      catalog: {
        total,
        active,
        drafts,
        archived,
        activeShare: total ? Math.round((active / total) * 100) : 0,
      },
      health: {
        percent: healthPercent,
        skuWarnings,
        missingImages,
        missingPricing,
        missingSpecs,
      },
      composition: {
        products,
        services,
        packages,
        productShare: Math.round((products / compositionTotal) * 100),
        serviceShare: Math.round((services / compositionTotal) * 100),
        packageShare: Math.round((packages / compositionTotal) * 100),
      },
      quotes: quoteStats,
      mostUsed: (Array.isArray(topRows) ? topRows : []).map((row: any) => ({
        prodId: row.prod_id,
        offering_name: row.offering_name,
        sku_id: row.sku_id,
        category: row.category || 'GENERAL',
        offering_type: row.offering_type || 'PRODUCT',
        selling_price: Number(row.selling_price || 0),
        units: row.price_unit || 'PER_PIECE',
        current_stock: Number(row.current_stock || 0),
        primary_image: row.primary_image || '',
        inStock: Number(row.current_stock || 0) > Number(row.minimum_stock_level || 0),
      })),
      recentActivity: (Array.isArray(recentRows) ? recentRows : []).map((row: any) => {
        const published = row.is_published === 1 || row.is_published === true || String(row.is_published) === '1';
        const status = String(row.publishing_status || (published ? 'PUBLISHED' : 'DRAFT')).toUpperCase();
        return {
          prodId: row.prod_id,
          offering_name: row.offering_name,
          sku_id: row.sku_id,
          action: status === 'PUBLISHED' ? 'published' : status === 'ARCHIVED' ? 'archived' : 'saved as draft',
          category: row.category || '',
        };
      }),
    });
  } catch (error: any) {
    console.error('[API /api/dashboard]', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load dashboard' }, { status: 500 });
  }
}

function isPublishedProduct(item: any) {
  const value = item?.is_published;
  return value === true || value === 1 || value === '1' || value === 'true';
}

function sellingPriceOf(item: any) {
  return Number(item?.pricing?.selling_price ?? item?.selling_price ?? 0);
}

function primaryImageOf(item: any) {
  return String(item?.media?.primary_image || item?.primary_image || '');
}

function hasDimensions(item: any) {
  const dims = item?.specifications?.physical_dimensions || {};
  return Number(dims.length || item?.length_cm || 0) > 0 || Number(dims.width || item?.width_cm || 0) > 0 || Number(dims.height || item?.height_cm || 0) > 0;
}

function buildStatsFromProducts(items: any[]) {
  const total = items.length;
  const active = items.filter((item) => isPublishedProduct(item) && String(item.publishing_status || item.internal?.visibility_status?.publishing_status || '').toUpperCase() !== 'ARCHIVED').length;
  const archived = items.filter((item) => String(item.publishing_status || item.internal?.visibility_status?.publishing_status || '').toUpperCase() === 'ARCHIVED').length;
  const drafts = Math.max(0, total - active - archived);
  const products = items.filter((item) => String(item.offering_type || 'PRODUCT').toUpperCase() === 'PRODUCT').length;
  const services = items.filter((item) => String(item.offering_type || '').toUpperCase() === 'SERVICE').length;
  const packages = items.filter((item) => ['PACKAGE', 'BUNDLE'].includes(String(item.offering_type || '').toUpperCase())).length;
  const missingImages = items.filter((item) => !primaryImageOf(item).trim()).length;
  const missingPricing = items.filter((item) => !sellingPriceOf(item)).length;
  const missingSpecs = items.filter((item) => !hasDimensions(item)).length;
  const readyCount = items.filter((item) => primaryImageOf(item).trim() && sellingPriceOf(item) > 0).length;
  const compositionTotal = Math.max(1, products + services + packages);
  const sorted = [...items].sort((a, b) => Number(b.inventory?.current_stock ?? b.current_stock ?? 0) - Number(a.inventory?.current_stock ?? a.current_stock ?? 0));

  return {
    catalog: {
      total,
      active,
      drafts,
      archived,
      activeShare: total ? Math.round((active / total) * 100) : 0,
    },
    health: {
      percent: total ? Math.round((readyCount / total) * 100) : 0,
      skuWarnings: missingImages + missingPricing + missingSpecs,
      missingImages,
      missingPricing,
      missingSpecs,
    },
    composition: {
      products,
      services,
      packages,
      productShare: Math.round((products / compositionTotal) * 100),
      serviceShare: Math.round((services / compositionTotal) * 100),
      packageShare: Math.round((packages / compositionTotal) * 100),
    },
    mostUsed: sorted.slice(0, 5).map((item) => ({
      prodId: item.prodId ?? item.prod_id,
      offering_name: item.offering_name,
      sku_id: item.sku_id,
      category: item.category || 'GENERAL',
      offering_type: item.offering_type || 'PRODUCT',
      selling_price: sellingPriceOf(item),
      units: item.pricing?.units || item.price_unit || 'PER_PIECE',
      current_stock: Number(item.inventory?.current_stock ?? item.current_stock ?? 0),
      primary_image: primaryImageOf(item),
      inStock: Number(item.inventory?.current_stock ?? item.current_stock ?? 0) > Number(item.inventory?.minimum_stock_level ?? 0),
    })),
    recentActivity: [...items].reverse().slice(0, 6).map((item) => {
      const published = isPublishedProduct(item);
      const status = String(item.internal?.visibility_status?.publishing_status || item.publishing_status || (published ? 'PUBLISHED' : 'DRAFT')).toUpperCase();
      return {
        prodId: item.prodId ?? item.prod_id,
        offering_name: item.offering_name,
        sku_id: item.sku_id,
        action: status === 'PUBLISHED' ? 'published' : status === 'ARCHIVED' ? 'archived' : 'saved as draft',
        category: item.category || '',
      };
    }),
  };
}

async function loadQuoteStats(pool: ReturnType<typeof getHomesMerryDbPool>) {
  const empty = { createdMtd: 0, approvedValue: 0, averageValue: 0, spark: [0, 0, 0, 0, 0] };
  try {
    const [tables]: any = await pool.query(`SHOW TABLES`);
    const names = (Array.isArray(tables) ? tables : []).map((row: any) => String(Object.values(row)[0] || '').toLowerCase());
    const quoteTable = names.find((name: string) => ['quotes', 'quote', 'quotations', 'quotation'].includes(name));
    if (!quoteTable) return empty;

    const [cols]: any = await pool.query(`SHOW COLUMNS FROM \`${quoteTable}\``);
    const colNames = (Array.isArray(cols) ? cols : []).map((c: any) => String(c.Field || '').toLowerCase());
    const amountCol = ['grand_total', 'total', 'amount', 'quote_value', 'value'].find((c) => colNames.includes(c));
    const dateCol = ['created_at', 'created', 'quote_date', 'updated_at'].find((c) => colNames.includes(c));
    if (!amountCol) return empty;

    const dateFilter = dateCol ? `WHERE YEAR(${dateCol}) = YEAR(CURDATE()) AND MONTH(${dateCol}) = MONTH(CURDATE())` : '';
    const [agg]: any = await pool.query(
      `SELECT COUNT(*) AS createdMtd, IFNULL(SUM(${amountCol}),0) AS approvedValue, IFNULL(AVG(${amountCol}),0) AS averageValue FROM \`${quoteTable}\` ${dateFilter}`
    );
    return {
      createdMtd: Number(agg?.[0]?.createdMtd || 0),
      approvedValue: Number(agg?.[0]?.approvedValue || 0),
      averageValue: Number(agg?.[0]?.averageValue || 0),
      spark: [0, 0, 0, 0, Number(agg?.[0]?.createdMtd || 0)],
    };
  } catch {
    return empty;
  }
}
