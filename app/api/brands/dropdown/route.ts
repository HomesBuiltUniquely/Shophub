/**
 * ==============================================================================
 * FILE: app/api/brands/dropdown/route.ts
 * PURPOSE: Active Brands Dropdown Endpoint connecting to Spring Boot
 *          (GET /api/v1/brands/dropdown)
 * ==============================================================================
 */

import { NextResponse } from 'next/server';
import { fetchBrandDropdownFromBackend } from '@/lib/api/brand.service';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';

const STATIC_HUB_BRAND = {
  brand_id: 0,
  brand_name: 'Hub',
  code: 'HUB',
  logo_url: '/brands/hub.svg',
  status: 'ACTIVE',
};

function formatBrandDropdown(rawBrands: any[]) {
  const filtered = (rawBrands || []).filter(
    (b) => b && b.brand_name?.trim().toLowerCase() !== 'hub brand'
  );
  const existingHub = filtered.find(
    (b) => b.brand_name?.trim().toLowerCase() === 'hub'
  );
  const hubItem = existingHub
    ? { ...STATIC_HUB_BRAND, ...existingHub, brand_name: 'Hub' }
    : STATIC_HUB_BRAND;

  const others = filtered.filter(
    (b) =>
      b.brand_name?.trim().toLowerCase() !== 'hub' &&
      b.brand_id !== hubItem.brand_id
  );

  return [hubItem, ...others];
}

export async function GET() {
  try {
    // 1. Try Spring Boot backend
    const backendDropdown = await fetchBrandDropdownFromBackend();
    if (backendDropdown && backendDropdown.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'spring_boot_backend',
        brands: formatBrandDropdown(backendDropdown),
      });
    }

    // 2. DB fallback
    const pool = getHomesMerryDbPool();
    const [rows]: any = await pool.query(
      'SELECT id as brand_id, brand_name, code, logo_url, status FROM brands WHERE status = "ACTIVE" ORDER BY brand_name ASC'
    );

    const dbBrands = Array.isArray(rows) ? rows : [];
    return NextResponse.json({
      success: true,
      source: 'database_direct',
      brands: formatBrandDropdown(dbBrands),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      source: 'static_fallback',
      brands: [STATIC_HUB_BRAND],
    });
  }
}
