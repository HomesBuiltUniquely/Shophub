/**
 * ==============================================================================
 * FILE: app/api/brands/route.ts
 * PURPOSE: Dynamic Brands Master API connecting to Spring Boot backend
 *          (E:\HUB\Ecom-homes-and-merry)
 * ==============================================================================
 * BACKEND INTEGRATIONS:
 * 1. GET: Fetches live brands and metrics from Spring Boot BrandController
 *    (GET /api/v1/brands/getAllBrands and GET /api/v1/brands/stats).
 *    Includes search, status (ACTIVE, DRAFT, PENDING_REVIEW), country filters,
 *    and pagination.
 * 2. POST: Creates a new master brand via Spring Boot (POST /api/v1/brands/createBrand).
 * 3. PATCH / PUT: Updates brand status or fields via Spring Boot (PUT /api/v1/brands/updateBrand/{id}).
 * 4. Resilient Fallback: If Spring Boot is restarting or unreachable, gracefully
 *    falls back to the MySQL database pool (`homes_merry.brands`).
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHomesMerryDbPool, BrandEntity, BrandStats } from '@/lib/db/homesmerry';
import {
  fetchBrandsFromBackend,
  fetchBrandStatsFromBackend,
  createBrandInBackend,
  updateBrandInBackend,
  mapSpringBrandToEntity,
  formatOfferingsCount,
  SpringBrandResDTO,
  BrandStatusType,
} from '@/lib/api/brand.service';

const SPRING_BOOT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

function countryCodeFor(country: string, fallback?: string) {
  const map: Record<string, string> = {
    Italy: 'IT',
    Sweden: 'SE',
    Spain: 'ES',
    Germany: 'DE',
    India: 'IN',
    Denmark: 'DK',
    Japan: 'JP',
    Switzerland: 'CH',
    USA: 'US',
    France: 'FR',
    UK: 'GB',
  };
  return fallback || map[country] || 'IN';
}

function generateBrandCode(brandName: string, countryCode: string): string {
  const clean = (brandName || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = clean.length >= 3 ? clean.slice(0, 3) : (clean || 'BRD').padEnd(3, 'X');
  return `${prefix}-${countryCode || 'IN'}-01`;
}

function formatBrandDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortBrandsWithHubFirst<T extends { brand_name?: string }>(brandList: T[]): T[] {
  return [...brandList].sort((a, b) => {
    const isHubA = a.brand_name?.trim().toLowerCase() === 'hub' ? 0 : 1;
    const isHubB = b.brand_name?.trim().toLowerCase() === 'hub' ? 0 : 1;
    if (isHubA !== isHubB) return isHubA - isHubB;
    return 0;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const statusParam = searchParams.get('status')?.trim().toUpperCase() || '';
    const countryParam = searchParams.get('country')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '15', 10));

    // 1. First attempt: Query Spring Boot backend (E:\HUB\Ecom-homes-and-merry)
    const [backendBrands, backendStats] = await Promise.all([
      fetchBrandsFromBackend({
        search,
        status: statusParam,
        country: countryParam,
        page,
        size: pageSize,
        sort: 'id,asc',
      }),
      fetchBrandStatsFromBackend(),
    ]);

    // Retrieve available countries for dropdown filters
    let availableCountries: string[] = [];
    try {
      const pool = getHomesMerryDbPool();
      const [countryRows]: any = await pool.query(
        'SELECT DISTINCT country FROM brands WHERE country IS NOT NULL AND country != "" ORDER BY country ASC'
      );
      availableCountries = (countryRows || []).map((r: any) => r.country).filter(Boolean);
    } catch (dbErr: any) {
      console.warn('[Brands API] Failed to fetch countries from DB:', dbErr.message);
      availableCountries = [];
    }

    if (backendBrands) {
      const countriesFromBrands = [
        ...new Set(backendBrands.brands.map((b) => b.country).filter(Boolean)),
      ].sort();
      const pendingFromBrands = backendBrands.brands.filter(
        (b) => b.status === 'PENDING' || b.status === 'DRAFT'
      ).length;
      const offeringsFromBrands = backendBrands.brands.reduce(
        (sum, b) => sum + (Number(b.offerings_count) || 0),
        0
      );
      const stats: BrandStats = {
        totalBrands: backendStats?.totalBrands ?? backendBrands.totalFiltered,
        brandsGrowthPercentage: backendStats?.brandsGrowthPercentage || '',
        activeOfferings: backendStats?.activeOfferings ?? offeringsFromBrands,
        activeOfferingsFormatted:
          backendStats?.activeOfferingsFormatted || formatOfferingsCount(offeringsFromBrands),
        countriesCount: backendStats?.countriesCount ?? countriesFromBrands.length,
        pendingReviewCount: backendStats?.pendingReviewCount ?? pendingFromBrands,
      };

      return NextResponse.json({
        success: true,
        source: 'spring_boot_backend',
        brands: sortBrandsWithHubFirst(backendBrands.brands).map((b) =>
          b.brand_name?.trim().toLowerCase() === 'hub'
            ? { ...b, brand_name: 'HUB', code: 'HUB', status: 'ACTIVE', logo_url: '/images/hub-logo.jpg' }
            : b
        ),
        totalFiltered: backendBrands.totalFiltered,
        totalCatalogBrands: stats.totalBrands,
        page: backendBrands.page,
        pageSize: backendBrands.pageSize,
        totalPages: Math.max(1, backendBrands.totalPages),
        stats,
        availableCountries: countriesFromBrands.length ? countriesFromBrands : availableCountries,
        filters: {
          search,
          status: statusParam,
          country: countryParam,
        },
      });
    }

    // 2. Graceful Fallback: Query MySQL database directly if Spring Boot returned empty or failed
    const pool = getHomesMerryDbPool();

    let query = 'SELECT * FROM brands WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (LOWER(brand_name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(manufacturer) LIKE ? OR LOWER(country) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    if (statusParam && statusParam !== 'ALL') {
      if (statusParam === 'PENDING') {
        query += ' AND (status = "PENDING" OR status = "PENDING_REVIEW")';
      } else {
        query += ' AND status = ?';
        params.push(statusParam);
      }
    }

    if (countryParam && countryParam !== 'ALL') {
      query += ' AND LOWER(country) = LOWER(?)';
      params.push(countryParam);
    }

    query += ' ORDER BY CASE WHEN LOWER(TRIM(brand_name)) = "hub" THEN 0 ELSE 1 END, id ASC';

    const [rows]: any = await pool.query(query, params);

    const allMatchingBrands: BrandEntity[] = (rows || []).map((row: any) => {
      const isHub = row.brand_name?.trim().toLowerCase() === 'hub';
      let categories: string[] = [];
      if (typeof row.categories === 'string') {
        try {
          categories = JSON.parse(row.categories);
        } catch {
          categories = ['FURNITURE'];
        }
      } else if (Array.isArray(row.categories)) {
        categories = row.categories;
      }

      return {
        id: row.id,
        brand_name: isHub ? 'HUB' : row.brand_name,
        manufacturer: isHub ? 'HUB' : row.manufacturer,
        code: isHub ? 'HUB' : row.code,
        country: row.country,
        country_code: row.country_code || 'IT',
        offerings_count: row.offerings_count,
        categories,
        status: isHub ? 'ACTIVE' : ((row.status || 'ACTIVE').toUpperCase() as 'ACTIVE' | 'DRAFT' | 'PENDING'),
        logo_url: isHub ? '/images/hub-logo.jpg' : (row.logo_url || '/brands/default.svg'),
        updated_date: row.updated_date || 'Oct 24, 2023',
        created_at: row.created_at,
      };
    });

    const [statsResult]: any = await pool.query(`
      SELECT 
        COUNT(*) as totalDbBrands,
        COALESCE(SUM(offerings_count), 0) as totalDbOfferings,
        COUNT(DISTINCT country) as totalDbCountries,
        SUM(CASE WHEN status = 'DRAFT' OR status = 'PENDING' OR status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) as totalPending
      FROM brands
    `);

    const dbStats = statsResult?.[0] || {};
    const totalBrands = Number(dbStats.totalDbBrands) || allMatchingBrands.length;
    const rawOfferings = Number(dbStats.totalDbOfferings) || 0;
    const countriesCount = Number(dbStats.totalDbCountries) || availableCountries.length;
    const pendingReviewCount = Number(dbStats.totalPending) || 0;

    const stats: BrandStats = backendStats || {
      totalBrands,
      brandsGrowthPercentage: '',
      activeOfferings: rawOfferings,
      activeOfferingsFormatted: formatOfferingsCount(rawOfferings),
      countriesCount,
      pendingReviewCount,
    };

    const totalFiltered = allMatchingBrands.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const sortedMatching = sortBrandsWithHubFirst(allMatchingBrands);
    const paginatedBrands = sortedMatching.slice(offset, offset + pageSize);

    return NextResponse.json({
      success: true,
      source: 'database_direct',
      brands: paginatedBrands,
      totalFiltered,
      totalCatalogBrands: totalBrands,
      page: safePage,
      pageSize,
      totalPages,
      stats,
      availableCountries,
      filters: {
        search,
        status: statusParam,
        country: countryParam,
      },
    });
  } catch (error: any) {
    console.error('[API /api/brands] Error querying brands:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch brands',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand_name, manufacturer, code, country, country_code, status, categories, offerings_count, logo_url } =
      body;

    if (!brand_name) {
      return NextResponse.json(
        { success: false, error: 'brand_name is required' },
        { status: 400 }
      );
    }

    const cleanCountry = country || 'Italy';
    const cleanCountryCode = countryCodeFor(cleanCountry, country_code);
    const cleanCode = (code ? String(code) : generateBrandCode(brand_name, cleanCountryCode)).toUpperCase();
    const cleanCategories = categories && categories.length > 0 ? categories : ['FURNITURE'];
    const cleanStatus = status === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
    const cleanLogo = String(logo_url || '').trim() || '/brands/default.svg';

    // 1. Dispatch to Spring Boot backend
    try {
      const springRes = await createBrandInBackend({
        brand_name,
        manufacturer: manufacturer || `${brand_name} Manufacturing Group`,
        code: cleanCode,
        country: cleanCountry,
        country_code: cleanCountryCode,
        status: cleanStatus,
        categories: cleanCategories,
        logo_url: cleanLogo,
      });

      if (springRes && springRes.brand_id) {
        return NextResponse.json({
          success: true,
          source: 'spring_boot_backend',
          id: springRes.brand_id,
          brand: springRes,
          message: 'Brand created successfully in Spring Boot backend',
        });
      }
    } catch (springErr: any) {
      console.warn('[API /api/brands POST] Spring Boot createBrand failed, falling back to direct DB:', springErr.message);
    }

    // 2. Direct DB fallback
    const pool = getHomesMerryDbPool();
    const formattedDate = formatBrandDate();

    const [result]: any = await pool.query(
      `INSERT INTO brands (brand_name, manufacturer, code, country, country_code, offerings_count, categories, status, logo_url, updated_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        brand_name,
        manufacturer || `${brand_name} Industrial Group`,
        cleanCode,
        cleanCountry,
        cleanCountryCode,
        offerings_count || 10,
        JSON.stringify(cleanCategories),
        cleanStatus,
        cleanLogo,
        formattedDate,
      ]
    );

    return NextResponse.json({
      success: true,
      source: 'database_direct',
      id: result.insertId,
      message: 'Brand created successfully in database and catalog',
    });
  } catch (error: any) {
    console.error('[API /api/brands POST] Error creating brand:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create brand' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, brand_name, code, manufacturer, country, country_code, categories, logo_url, offerings_count } =
      body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const pool = getHomesMerryDbPool();
    const [existingRows]: any = await pool.query('SELECT * FROM brands WHERE id = ?', [id]);
    const existing = existingRows?.[0];
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Brand not found.' }, { status: 404 });
    }

    let existingCats: string[] = ['FURNITURE'];
    try {
      existingCats =
        typeof existing.categories === 'string' ? JSON.parse(existing.categories) : existing.categories || existingCats;
    } catch {}

    const nextCountry = country || existing.country;
    const nextStatus: BrandStatusType =
      String(status || existing.status || 'ACTIVE').toUpperCase() === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
    const next = {
      brand_name: brand_name || existing.brand_name,
      manufacturer: manufacturer || existing.manufacturer,
      code: String(existing.code || code || "").toUpperCase(),
      country: nextCountry,
      country_code: countryCodeFor(nextCountry, country_code || existing.country_code),
      status: nextStatus,
      categories: Array.isArray(categories) && categories.length ? categories : existingCats,
      logo_url: String(logo_url || existing.logo_url || '').trim() || '/brands/default.svg',
      offerings_count:
        offerings_count === undefined || offerings_count === null
          ? existing.offerings_count
          : Number(offerings_count) || 0,
    };

    try {
      await updateBrandInBackend(id, {
        brand_name: next.brand_name,
        manufacturer: next.manufacturer,
        code: next.code,
        country: next.country,
        country_code: next.country_code,
        status: next.status,
        categories: next.categories,
        logo_url: next.logo_url,
      });
    } catch (springErr: any) {
      console.warn(`[API /api/brands PATCH] Spring Boot updateBrand failed, using DB:`, springErr.message);
    }

    await pool.query(
      `UPDATE brands
       SET brand_name = ?, manufacturer = ?, code = ?, country = ?, country_code = ?,
           offerings_count = ?, categories = ?, status = ?, logo_url = ?, updated_date = ?
       WHERE id = ?`,
      [
        next.brand_name,
        next.manufacturer,
        next.code,
        next.country,
        next.country_code,
        next.offerings_count,
        JSON.stringify(next.categories),
        next.status,
        next.logo_url,
        formatBrandDate(),
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      source: 'database_direct',
      message: `Brand #${id} updated`,
    });
  } catch (error: any) {
    console.error('[API /api/brands PATCH] Error updating brand:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update brand' },
      { status: 500 }
    );
  }
}
