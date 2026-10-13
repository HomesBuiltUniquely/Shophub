'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import CatalogWelcome from '@/components/layout/CatalogWelcome';
import OfferingFilters from '@/components/offerings/OfferingFilters';
import OfferingTable from '@/components/offerings/OfferingTable';
import { OfferingGrid, OfferingMatrix } from './OfferingGallery';
import Pagination from '@/components/offerings/Pagination';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { isInternalStaff } from '@/lib/auth/session';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import {
  fetchCatalogOfferingsThunk,
  fetchMainCategories,
  selectFilteredOfferings,
  selectPaginatedOfferings,
  selectCurrentPage,
  selectPageSize,
  selectCategoriesLoading,
  selectCategoriesError,
  setPage,
  setSearchQuery,
  clearAllFilters,
} from '@/lib/store/slices/categoriesSlice';

export default function OfferingsPage() {
  const dispatch = useAppDispatch();
  const user = useCurrentUser();
  const hideCatalogTools = isInternalStaff(user);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'matrix'>('list');

  // Redux selectors
  const filteredOfferings = useAppSelector(selectFilteredOfferings);
  const paginatedOfferings = useAppSelector(selectPaginatedOfferings);
  const currentPage = useAppSelector(selectCurrentPage);
  const pageSize = useAppSelector(selectPageSize);
  const isLoading = useAppSelector(selectCategoriesLoading);
  const error = useAppSelector(selectCategoriesError);

  const totalItems = filteredOfferings.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // ============================================================================
  // LIFECYCLE - Load initial data directly from database
  // ============================================================================

  useEffect(() => {
    // Load offerings directly from MySQL database and category mappings
    dispatch(fetchCatalogOfferingsThunk());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <TopHeader title="Offerings" onSearch={(query) => dispatch(setSearchQuery(query))} />

      {/* Main Content Area */}
      <main className="ml-56 pt-16">
        <div className="p-6">
          {/* ===================================================================== */}
          {/* MASTER CATALOG HEADER (Matching UI Reference) */}
          {/* ===================================================================== */}
          <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
            <div>
              <CatalogWelcome />
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                MASTER CATALOG
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                All Offerings
              </h2>
            </div>

            {/* Right Side Tools: View Switchers & Import */}
            <div className="flex items-center gap-3">
              {/* View Switcher Segmented Control */}
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                {/* List View Icon */}
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white shadow-xs text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                {/* Grid View Icon */}
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-xs text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                {/* Matrix View Icon */}
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'matrix'
                      ? 'bg-white shadow-xs text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Matrix View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                  </svg>
                </button>
              </div>

              {!hideCatalogTools && (
                <Link
                  href="/import"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Import</span>
                </Link>
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* FILTER BAR (Matching UI Reference + Dynamic Hierarchy) */}
          {/* ===================================================================== */}
          <div className="mb-4">
            <OfferingFilters />
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-red-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && totalItems === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
              <p className="mt-4 text-sm text-gray-600 font-medium">
                Loading offerings from catalog...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && totalItems === 0 && !error && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-xs">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">No offerings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No offerings match the current category hierarchy or filter criteria.
              </p>
              <button
                onClick={() => dispatch(clearAllFilters())}
                className="mt-4 inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-white bg-black hover:bg-gray-800 shadow-xs transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TABLE & PAGINATION (Matching UI Reference) */}
          {/* ===================================================================== */}
          {totalItems > 0 && (
            <div>
              {viewMode === 'list' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <OfferingTable offerings={paginatedOfferings} isLoading={isLoading} />
                </div>
              )}
              {viewMode === 'grid' && <OfferingGrid offerings={paginatedOfferings} />}
              {viewMode === 'matrix' && <OfferingMatrix offerings={paginatedOfferings} />}
              <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={pageSize}
                  onPageChange={(page) => dispatch(setPage(page))}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
