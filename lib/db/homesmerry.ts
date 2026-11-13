/**
 * ==============================================================================
 * FILE: lib/db/homesmerry.ts
 * PURPOSE: MySQL Database Connection Pool & Data Models for `homes_merry` Catalog
 * ==============================================================================
 * WHY THIS FILE WAS CREATED:
 * Provides a high-performance, singleton connection pool to the local MySQL
 * database `homes_merry`. It connects the Next.js API routes with the persistent
 * catalog tables and Spring Boot entities.
 *
 * CREDENTIALS & DEFAULTS:
 * - Host: localhost:3306
 * - Database: homes_merry
 * - User: root / root@00
 * ==============================================================================
 */

import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

/**
 * Returns the singleton MySQL connection pool for `homes_merry`.
 */
export function getHomesMerryDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.HOMES_MERRY_DB_HOST || '127.0.0.1',
      port: Number(process.env.HOMES_MERRY_DB_PORT || 3306),
      user: process.env.HOMES_MERRY_DB_USER || 'root',
      password: process.env.HOMES_MERRY_DB_PASSWORD || 'root@root',
      database: process.env.HOMES_MERRY_DB_NAME || 'homes_merry',
      waitForConnections: true,
      connectionLimit: 8,
      queueLimit: 0,
      connectTimeout: 8000,
    });
  }
  return pool;
}


export interface BrandEntity {
  id: number;
  brand_name: string;
  manufacturer: string;
  code: string;
  country: string;
  country_code: string;
  offerings_count: number;
  categories: string[];
  status: 'ACTIVE' | 'DRAFT' | 'PENDING';
  logo_url: string;
  updated_date: string;
  created_at?: string;
}

export interface BrandStats {
  totalBrands: number;
  brandsGrowthPercentage: string;
  activeOfferings: number;
  activeOfferingsFormatted: string;
  countriesCount: number;
  pendingReviewCount: number;
}
