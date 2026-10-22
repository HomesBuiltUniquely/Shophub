/**
 * ==============================================================================
 * FILE: app/api/brands/[id]/route.ts
 * PURPOSE: Single Brand CRUD Operations connecting to Spring Boot backend
 *          (E:\HUB\Ecom-homes-and-merry)
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getBrandByIdFromBackend,
  updateBrandInBackend,
  deleteBrandInBackend,
  SpringBrandReqDTO,
} from '@/lib/api/brand.service';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandId = Number(id);

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Invalid brand ID' }, { status: 400 });
    }

    // 1. Try Spring Boot backend
    const brand = await getBrandByIdFromBackend(brandId);
    if (brand) {
      return NextResponse.json({ success: true, source: 'spring_boot', brand });
    }

    // 2. Direct DB fallback
    const pool = getHomesMerryDbPool();
    const [rows]: any = await pool.query('SELECT * FROM brands WHERE id = ?', [brandId]);
    if (rows && rows[0]) {
      const row = rows[0];
      let categories = ['FURNITURE'];
      try {
        categories = typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories;
      } catch {}

      return NextResponse.json({
        success: true,
        source: 'database_direct',
        brand: {
          id: row.id,
          brand_name: row.brand_name,
          manufacturer: row.manufacturer,
          code: row.code,
          country: row.country,
          country_code: row.country_code || 'IT',
          offerings_count: row.offerings_count,
          categories,
          status: row.status,
          logo_url: row.logo_url || '/brands/default.svg',
          updated_date: row.updated_date,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandId = Number(id);
    const body = await request.json();

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Invalid brand ID' }, { status: 400 });
    }

    // 1. Try Spring Boot backend
    try {
      const updated = await updateBrandInBackend(brandId, body as SpringBrandReqDTO);
      if (updated) {
        return NextResponse.json({ success: true, source: 'spring_boot', brand: updated });
      }
    } catch (err: any) {
      console.warn('[Brands [id] PUT] Spring Boot update failed, trying DB:', err.message);
    }

    const pool = getHomesMerryDbPool();
    await pool.query(
      `UPDATE brands SET
         brand_name = COALESCE(?, brand_name),
         manufacturer = COALESCE(?, manufacturer),
         code = COALESCE(?, code),
         country = COALESCE(?, country),
         country_code = COALESCE(?, country_code),
         status = COALESCE(?, status),
         categories = COALESCE(?, categories),
         logo_url = COALESCE(?, logo_url),
         offerings_count = COALESCE(?, offerings_count),
         updated_date = ?
       WHERE id = ?`,
      [
        body.brand_name || null,
        body.manufacturer || null,
        body.code ? String(body.code).toUpperCase() : null,
        body.country || null,
        body.country_code || null,
        body.status || null,
        Array.isArray(body.categories) ? JSON.stringify(body.categories) : null,
        body.logo_url || null,
        body.offerings_count ?? null,
        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        brandId,
      ]
    );

    return NextResponse.json({ success: true, source: 'database_direct', message: 'Brand updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandId = Number(id);

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Invalid brand ID' }, { status: 400 });
    }

    // 1. Try Spring Boot backend
    const ok = await deleteBrandInBackend(brandId);

    // 2. Also ensure DB sync
    const pool = getHomesMerryDbPool();
    await pool.query('DELETE FROM brands WHERE id = ?', [brandId]);

    return NextResponse.json({
      success: true,
      message: `Brand with ID ${brandId} deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
