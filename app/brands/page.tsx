'use client';

/**
 * ==============================================================================
 * PAGE: app/brands/page.tsx (and alias app/master-catalog/brands/page.tsx)
 * PURPOSE: Main Brands Master Page Orchestrator (1:1 Screenshot Recreation)
 * ==============================================================================
 * ARCHITECTURE:
 * - 100% Dynamic Client Component with real-time API binding to `/api/brands`.
 * - State Management:
 *   * Live brands array, pagination (page, pageSize, totalPages, totalFiltered).
 *   * Filters: search query, status ('ACTIVE' | 'DRAFT'), country.
 *   * KPI Stats: totalBrands, activeOfferings, countriesCount, pendingReviewCount.
 * - Distinct Action Modals:
 *   1. isAddBrandModalOpen -> AddBrandModal (for "+ ADD BRAND" button)
 *   2. isCreateOfferingModalOpen -> CreateOfferingModal (for "+ CREATE OFFERING" button)
 *   3. isImportModalOpen -> ImportCatalogModal (for "IMPORT" button)
 *   4. isFiltersModalOpen -> AdvancedFiltersModal (for "Advanced Filters" button)
 *   5. selectedBrand -> BrandDetailDrawer (for table row click)
 *   6. isReportsModalOpen -> ReportsModal (for sidebar "VIEW REPORTS" button)
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import BrandsStats from '@/components/brands/BrandsStats';
import BrandsFilters from '@/components/brands/BrandsFilters';
import BrandsTable from '@/components/brands/BrandsTable';
import BrandsPagination from '@/components/brands/BrandsPagination';
import AddBrandModal from '@/components/brands/AddBrandModal';
import CreateOfferingModal from '@/components/brands/CreateOfferingModal';
import ImportCatalogModal from '@/components/brands/ImportCatalogModal';
import AdvancedFiltersModal from '@/components/brands/AdvancedFiltersModal';
import BrandDetailDrawer from '@/components/brands/BrandDetailDrawer';
import { BrandEntity, BrandStats } from '@/lib/db/homesmerry';

export default function BrandsMasterPage() {

  // State
  const [brands, setBrands] = useState<BrandEntity[]>([]);
  const [stats, setStats] = useState<BrandStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // Dynamic filter
  const [countryFilter, setCountryFilter] = useState<string>(''); // Dynamic filter
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [totalCatalogBrands, setTotalCatalogBrands] = useState<number>(0);
  const [selectedBrand, setSelectedBrand] = useState<BrandEntity | null>(null);

  // Separate distinct modals for each button
  const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<BrandEntity | null>(null);
  const [isCreateOfferingModalOpen, setIsCreateOfferingModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState<boolean>(false);

  // Fetch dynamic brands from API
  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      if (countryFilter && countryFilter !== 'ALL') params.set('country', countryFilter);
      params.set('page', String(currentPage));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/brands?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        setBrands(data.brands || []);
        setStats(data.stats);
        setTotalFiltered(data.totalFiltered || 0);
        setTotalCatalogBrands(data.totalCatalogBrands || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching brands dynamically from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, countryFilter, currentPage, pageSize]);

  // Load when query params change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrands();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchBrands]);

  // Export current filtered dataset as CSV
  const handleExport = () => {
    if (!brands.length) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Brand Name,Manufacturer,Code,Country,Offerings,Status,Updated']
        .concat(
          brands.map(
            (b) =>
              `"${b.id}","${b.brand_name}","${b.manufacturer}","${b.code}","${b.country}",${b.offerings_count},"${b.status}","${b.updated_date}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brands_master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans antialiased">
      <Sidebar />

      <TopHeader
        title="Brands"
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        placeholder="Search brands, codes, or manufacturers..."
      />

      {/* 3. Main Content Area */}
      <main className="ml-56 pt-16 min-h-screen">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          {/* Breadcrumb & Main Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">
                <span>MASTER CATALOG</span>
                <span>&gt;</span>
                <span className="text-gray-700">BRANDS</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-black text-gray-950 tracking-tight">
                Brands Master
              </h1>

              {/* Subtitle */}
              <p className="text-xs text-gray-500 font-medium mt-1">
                Manage global manufacturer relationships and internal brand hierarchies.
              </p>
            </div>

            {/* Top Right Action Buttons: EXPORT, IMPORT, ADD BRAND */}
            <div className="flex items-center gap-2.5">
              {/* EXPORT Button */}
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200/90 rounded-xl text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>EXPORT</span>
              </button>

              {/* IMPORT Button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200/90 rounded-xl text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>IMPORT</span>
              </button>

              {/* ADD BRAND Button */}
              <button
                onClick={() => {
                  setEditingBrand(null);
                  setIsAddBrandModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span className="text-sm font-extrabold leading-none">+</span>
                <span>ADD BRAND</span>
              </button>
            </div>
          </div>

          {/* 4. Live Dynamic KPI Stat Cards */}
          <BrandsStats stats={stats} isLoading={isLoading} />

          {/* 5. Live Filter Toolbar & Active Chips */}
          <BrandsFilters
            statusFilter={statusFilter}
            countryFilter={countryFilter}
            onStatusChange={(st) => {
              setStatusFilter(st);
              setCurrentPage(1);
            }}
            onCountryChange={(c) => {
              setCountryFilter(c);
              setCurrentPage(1);
            }}
            onToggleAdvancedFilters={() => setIsFiltersModalOpen(true)}
            totalFiltered={totalFiltered}
            pageSize={pageSize}
            currentPage={currentPage}
          />

          {/* 6. Live Brands Master Table */}
          <BrandsTable
            brands={brands}
            isLoading={isLoading}
            onBrandClick={(b) => setSelectedBrand(b)}
            onEditBrand={(b) => {
              setSelectedBrand(null);
              setEditingBrand(b);
              setIsAddBrandModalOpen(true);
            }}
          />

          {/* 7. Live Dynamic Pagination Footer */}
          {totalFiltered > 0 && (
            <BrandsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </main>

      {/* 1. Slide-over Brand Detail Drawer */}
      <BrandDetailDrawer
        brand={selectedBrand}
        isOpen={Boolean(selectedBrand)}
        onClose={() => setSelectedBrand(null)}
        onStatusUpdated={() => {
          fetchBrands();
          setSelectedBrand(null);
        }}
        onEdit={(b) => {
          setSelectedBrand(null);
          setEditingBrand(b);
          setIsAddBrandModalOpen(true);
        }}
      />

      {/* 2. Add / Edit Brand Modal */}
      <AddBrandModal
        isOpen={isAddBrandModalOpen}
        brand={editingBrand}
        onClose={() => {
          setIsAddBrandModalOpen(false);
          setEditingBrand(null);
        }}
        onBrandCreated={fetchBrands}
      />

      {/* 3. Create Offering Modal (for + CREATE OFFERING button - maps to Apidog createProduct API) */}
      <CreateOfferingModal
        isOpen={isCreateOfferingModalOpen}
        onClose={() => setIsCreateOfferingModalOpen(false)}
        brands={brands}
        onOfferingCreated={fetchBrands}
      />

      {/* 4. Import Catalog Modal (for IMPORT button) */}
      <ImportCatalogModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={fetchBrands}
      />

      {/* 5. Advanced Filters Modal */}
      <AdvancedFiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        statusFilter={statusFilter}
        countryFilter={countryFilter}
        onStatusChange={(st) => {
          setStatusFilter(st);
          setCurrentPage(1);
        }}
        onCountryChange={(c) => {
          setCountryFilter(c);
          setCurrentPage(1);
        }}
        onResetFilters={() => {
          setStatusFilter('');
          setCountryFilter('');
          setSearchQuery('');
          setCurrentPage(1);
          setIsFiltersModalOpen(false);
        }}
      />

    </div>
  );
}
