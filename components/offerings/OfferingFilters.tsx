'use client';

import React, { useEffect, useMemo } from 'react';
import { canViewServices } from '@/lib/catalog/offering-type';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  setCategoryType,
  selectMainCategoryThunk,
  clearMainCategorySelection,
  selectSubOrProduct,
  setFilter,
  clearStandardFilters,
  clearAllFilters,
  fetchMainCategories,
  selectCategoryType,
  selectMainCategories,
  selectSelectedMainCategoryId,
  selectSubOrProductItems,
  selectSelectedSubOrProductId,
  selectFilters,
  selectCategoriesLoading,
  selectDerivedOfferings,
} from '@/lib/store/slices/categoriesSlice';

const PRODUCT_CATEGORIES = [
  'LIGHTING',
  'FURNITURE',
  'DECOR',
  'BEDDING',
  'BATH',
  'KITCHEN',
  'OUTDOOR',
  'STORAGE',
  'RUGS',
  'WALL_ART',
  'OTHER',
];

const OFFERING_TYPES = ['PRODUCT', 'SERVICE', 'BUNDLE'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PUBLISHED', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
];

const STOCK_OPTIONS = [
  { value: 'all', label: 'Any Status' },
  { value: 'In Stock', label: 'In Stock' },
  { value: 'Low Stock', label: 'Low Stock' },
  { value: 'Out of Stock', label: 'Out of Stock' },
];

export default function OfferingFilters() {
  const dispatch = useAppDispatch();
  const user = useCurrentUser();
  const showServices = canViewServices(user);
  const typeOptions = showServices ? OFFERING_TYPES : OFFERING_TYPES.filter((type) => type !== 'SERVICE');

  // Redux state
  const categoryType = useAppSelector(selectCategoryType);
  const mainCategories = useAppSelector(selectMainCategories);
  const selectedMainCategoryId = useAppSelector(selectSelectedMainCategoryId);
  const subOrProductItems = useAppSelector(selectSubOrProductItems);
  const selectedSubOrProductId = useAppSelector(selectSelectedSubOrProductId);
  const filters = useAppSelector(selectFilters);
  const isLoading = useAppSelector(selectCategoriesLoading);
  const derivedOfferings = useAppSelector(selectDerivedOfferings);

  useEffect(() => {
    if (!showServices && filters.type === 'SERVICE') {
      dispatch(setFilter({ key: 'type', value: 'all' }));
    }
  }, [showServices, filters.type, dispatch]);

  // Dynamic vendor options from offering names
  const vendorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const offering of derivedOfferings) {
      if (offering.vendor) {
        set.add(offering.vendor);
      } else if (offering.offering_name) {
        set.add(offering.offering_name);
      }
    }
    return Array.from(set).sort();
  }, [derivedOfferings]);

  // Handlers
  const handleCategoryTypeChange = (val: 'all' | 'primary' | 'secondary') => {
    dispatch(setCategoryType(val));
    if (val === 'primary') {
      // Calls /api/v1/categories/getAllCategories
      dispatch(fetchMainCategories('primary'));
    } else if (val === 'secondary') {
      // Calls /api/v1/secondary-categories/getAllCategories
      dispatch(fetchMainCategories('secondary'));
    } else {
      // "all all should be seen"
      dispatch(fetchMainCategories('primary'));
      dispatch(fetchMainCategories('secondary'));
    }
  };

  const handleMainCategoryChange = (val: string) => {
    if (val === 'all') {
      dispatch(clearMainCategorySelection());
    } else {
      dispatch(
        selectMainCategoryThunk({
          categoryId: val,
          categoryType: categoryType === 'secondary' ? 'secondary' : 'primary',
        })
      );
    }
  };

  const handleSubOrProductChange = (val: string) => {
    dispatch(selectSubOrProduct(val === 'all' ? null : val));
  };

  // Determine label for subOrProduct partition
  const isSubcategoryType = subOrProductItems.some((i) => i.type === 'subcategory');
  const subOrProductLabel = isSubcategoryType ? 'SUB CATEGORY' : 'PRODUCT';

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* ========================================================================= */}
        {/* 1. CATEGORY TYPE PILL */}
        {/* ========================================================================= */}
        <div className="relative inline-flex items-center border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-xs hover:border-gray-400 transition-colors">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1.5 select-none">
            CATEGORY:
          </span>
          <select
            value={categoryType}
            onChange={(e) =>
              handleCategoryTypeChange(e.target.value as 'all' | 'primary' | 'secondary')
            }
            disabled={isLoading}
            className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="primary">Primary Category</option>
            <option value="secondary">Secondary Category</option>
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-500 pointer-events-none -ml-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 2. DYNAMIC MAIN CATEGORY PILL (Opens when Category Type is Primary/Secondary) */}
        {/* ========================================================================= */}
        {categoryType !== 'all' && mainCategories.length > 0 && (
          <div className="relative inline-flex items-center border border-blue-300 rounded-lg px-3 py-1.5 bg-blue-50/40 shadow-xs hover:border-blue-400 transition-colors animate-fadeIn">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mr-1.5 select-none">
              MAIN CATEGORY:
            </span>
            <select
              value={selectedMainCategoryId || 'all'}
              onChange={(e) => handleMainCategoryChange(e.target.value)}
              disabled={isLoading}
              className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">
                {categoryType === 'primary' ? 'All Primary' : 'All Secondary'}
              </option>
              {mainCategories.map((cat: any) => {
                const id = String(cat.primaryCategoryId ?? cat.secondaryCategoryId ?? '');
                const name = cat.primaryCategoryName ?? cat.secondaryCategoryName ?? `Category ${id}`;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
            <svg
              className="w-3.5 h-3.5 text-blue-600 pointer-events-none -ml-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DYNAMIC SUB CATEGORY / PRODUCT PILL (Opens depending on child data) */}
        {/* ========================================================================= */}
        {categoryType !== 'all' && selectedMainCategoryId && subOrProductItems.length > 0 && (
          <div className="relative inline-flex items-center border border-purple-300 rounded-lg px-3 py-1.5 bg-purple-50/40 shadow-xs hover:border-purple-400 transition-colors animate-fadeIn">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mr-1.5 select-none">
              {subOrProductLabel}:
            </span>
            <select
              value={selectedSubOrProductId || 'all'}
              onChange={(e) => handleSubOrProductChange(e.target.value)}
              disabled={isLoading}
              className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              <option value="all">All</option>
              {subOrProductItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <svg
              className="w-3.5 h-3.5 text-purple-600 pointer-events-none -ml-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. TYPE PILL */}
        {/* ========================================================================= */}
        <div className="relative inline-flex items-center border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-xs hover:border-gray-400 transition-colors">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1.5 select-none">
            TYPE:
          </span>
          <select
            value={filters.type}
            onChange={(e) => dispatch(setFilter({ key: 'type', value: e.target.value }))}
            disabled={isLoading}
            className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer capitalize"
          >
            <option value="all">Any</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-500 pointer-events-none -ml-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 5. STATUS PILL */}
        {/* ========================================================================= */}
        <div className="relative inline-flex items-center border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-xs hover:border-gray-400 transition-colors">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1.5 select-none">
            STATUS:
          </span>
          <select
            value={filters.status}
            onChange={(e) => dispatch(setFilter({ key: 'status', value: e.target.value }))}
            disabled={isLoading}
            className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-500 pointer-events-none -ml-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 6. VENDOR PILL */}
        {/* ========================================================================= */}
        <div className="relative inline-flex items-center border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-xs hover:border-gray-400 transition-colors">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1.5 select-none">
            VENDOR:
          </span>
          <select
            value={filters.vendor}
            onChange={(e) => dispatch(setFilter({ key: 'vendor', value: e.target.value }))}
            disabled={isLoading}
            className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer max-w-[160px] truncate"
          >
            <option value="all">All</option>
            {vendorOptions.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-500 pointer-events-none -ml-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 7. STOCK PILL */}
        {/* ========================================================================= */}
        <div className="relative inline-flex items-center border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-xs hover:border-gray-400 transition-colors">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1.5 select-none">
            STOCK:
          </span>
          <select
            value={filters.stock}
            onChange={(e) => dispatch(setFilter({ key: 'stock', value: e.target.value }))}
            disabled={isLoading}
            className="appearance-none bg-transparent pr-4 text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer"
          >
            {STOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-500 pointer-events-none -ml-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 8. ACTIONS: Clear All & Funnel Filter Icon */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Clear All Text Button */}
          <button
            onClick={() => dispatch(clearAllFilters())}
            disabled={isLoading}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Clear All
          </button>

          {/* Funnel Icon Button */}
          <button
            onClick={() => dispatch(clearStandardFilters())}
            disabled={isLoading}
            title="Reset attribute filters"
            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-xs disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
