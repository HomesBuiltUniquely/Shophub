import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { PrimaryCategory, SecondaryCategory, Product } from '../../types/api.types';
import {
  getAllPrimaryCategories,
  getPrimaryCategoryById,
  getAllSecondaryCategories,
  getCategoriesByPrimary,
  getSecondaryCategoryById,
} from '../../api/category.service';
import { getAllProducts } from '../../api/product.service';
import { OfferingResponse } from '../../types/offerings/offering.types';
import {
  extractAllOfferingsFromDatabase,
  extractAllProductsFromCategories,
  mapProductToOffering,
} from '../../utils/offerings.mapper';

export interface SubOrProductItem {
  type: 'subcategory' | 'product';
  id: string;
  name: string;
  data: any;
}

export interface StandardFiltersState {
  category: string; // Product category (e.g. LIGHTING, FURNITURE)
  type: string;     // PRODUCT, SERVICE, BUNDLE
  status: string;   // ACTIVE, PUBLISHED, DRAFT, etc.
  vendor: string;   // Vendor (maps to offering_name or vendor)
  stock: string;    // In Stock, Low Stock, Out of Stock
  searchQuery: string;
}

export interface CategoriesState {
  categoryType: 'all' | 'primary' | 'secondary';
  mainCategories: Array<PrimaryCategory | SecondaryCategory>;
  selectedMainCategoryId: string | null;
  selectedMainCategory: PrimaryCategory | SecondaryCategory | null;

  subOrProductItems: SubOrProductItem[];
  selectedSubOrProductId: string | null;
  selectedSubOrProductItem: SubOrProductItem | null;

  // Standard filters
  filters: StandardFiltersState;

  // Pagination
  currentPage: number;
  pageSize: number;

  // Base offerings extracted from database
  primaryCategories: PrimaryCategory[];
  secondaryCategories: SecondaryCategory[];
  databaseProducts: Product[];
  derivedOfferings: OfferingResponse[];

  isLoading: boolean;
  error: string | null;
}

const initialFilters: StandardFiltersState = {
  category: 'all',
  type: 'all',
  status: 'all',
  vendor: 'all',
  stock: 'all',
  searchQuery: '',
};

const initialState: CategoriesState = {
  categoryType: 'all',
  mainCategories: [],
  selectedMainCategoryId: null,
  selectedMainCategory: null,

  subOrProductItems: [],
  selectedSubOrProductId: null,
  selectedSubOrProductItem: null,

  filters: initialFilters,
  currentPage: 1,
  pageSize: 10,

  primaryCategories: [],
  secondaryCategories: [],
  databaseProducts: [],
  derivedOfferings: [],

  isLoading: false,
  error: null,
};

/**
 * Fetch all catalog offerings directly from the database
 * Combines live MySQL products table with secondary and primary category mappings
 */
export const fetchCatalogOfferingsThunk = createAsyncThunk(
  'categories/fetchCatalogOfferingsThunk',
  async () => {
    const [productsRes, secondaryCats, primaryCats] = await Promise.all([
      getAllProducts(0, 200),
      getAllSecondaryCategories(),
      getAllPrimaryCategories(),
    ]);

    return {
      products: productsRes?.content || [],
      secondaryCategories: secondaryCats || [],
      primaryCategories: primaryCats || [],
    };
  }
);

// Fetch Main Categories based on categoryType
export const fetchMainCategories = createAsyncThunk<
  { type: 'primary' | 'secondary'; data: any[] },
  'primary' | 'secondary',
  { state: { categories: CategoriesState } }
>(
  'categories/fetchMainCategories',
  async (categoryType, { getState }) => {
    const state = getState().categories;
    if (categoryType === 'primary' && state.primaryCategories.length > 0) {
      return { type: 'primary', data: state.primaryCategories };
    }
    if (categoryType === 'secondary' && state.secondaryCategories.length > 0) {
      return { type: 'secondary', data: state.secondaryCategories };
    }

    if (categoryType === 'primary') {
      const cats = await getAllPrimaryCategories();
      return { type: 'primary', data: cats };
    } else {
      const cats = await getAllSecondaryCategories();
      return { type: 'secondary', data: cats };
    }
  }
);

// Select Main Category and dynamically compute SUB CATEGORY / PRODUCT partition without extra network calls
export const selectMainCategoryThunk = createAsyncThunk<
  {
    categoryId: string;
    categoryType: 'primary' | 'secondary';
    detail: any;
    items: SubOrProductItem[];
  },
  {
    categoryId: string | number;
    categoryType: 'primary' | 'secondary';
  },
  { state: { categories: CategoriesState } }
>(
  'categories/selectMainCategoryThunk',
  async ({ categoryId, categoryType }, { getState }) => {
    const state = getState().categories;
    const catIdStr = String(categoryId);

    if (categoryType === 'primary') {
      const detail =
        state.primaryCategories.find((c) => String(c.primaryCategoryId) === catIdStr) || null;

      const subCategories =
        detail?.subCategory && detail.subCategory.length > 0
          ? detail.subCategory
          : state.secondaryCategories;

      const items: SubOrProductItem[] = [];
      if (subCategories && subCategories.length > 0) {
        subCategories.forEach((sub) => {
          items.push({
            type: 'subcategory',
            id: String(sub.secondaryCategoryId),
            name: sub.secondaryCategoryName,
            data: sub,
          });
        });
      }

      return {
        categoryId: catIdStr,
        categoryType: 'primary',
        detail,
        items,
      };
    } else {
      const detail =
        state.secondaryCategories.find((c) => String(c.secondaryCategoryId) === catIdStr) || null;

      const items: SubOrProductItem[] = [];
      if (detail?.subCategory && detail.subCategory.length > 0) {
        detail.subCategory.forEach((sub: any) => {
          items.push({
            type: 'subcategory',
            id: String(sub.secondaryCategoryId || sub.subCategoryId),
            name: sub.secondaryCategoryName || sub.subCategoryName || 'Unnamed Subcategory',
            data: sub,
          });
        });
      }

      return {
        categoryId: catIdStr,
        categoryType: 'secondary',
        detail,
        items,
      };
    }
  }
);

export const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setCategoryType: (state, action: PayloadAction<'all' | 'primary' | 'secondary'>) => {
      state.categoryType = action.payload;
      state.selectedMainCategoryId = null;
      state.selectedMainCategory = null;
      state.subOrProductItems = [];
      state.selectedSubOrProductId = null;
      state.selectedSubOrProductItem = null;
      state.currentPage = 1;
      state.error = null;

      if (action.payload === 'primary') {
        state.mainCategories = state.primaryCategories;
      } else if (action.payload === 'secondary') {
        state.mainCategories = state.secondaryCategories;
      } else {
        state.mainCategories = [];
      }
    },
    clearMainCategorySelection: (state) => {
      state.selectedMainCategoryId = null;
      state.selectedMainCategory = null;
      state.subOrProductItems = [];
      state.selectedSubOrProductId = null;
      state.selectedSubOrProductItem = null;
      state.currentPage = 1;
    },
    selectSubOrProduct: (state, action: PayloadAction<string | null>) => {
      state.selectedSubOrProductId = action.payload;
      state.currentPage = 1;
      if (!action.payload || action.payload === 'all') {
        state.selectedSubOrProductItem = null;
      } else {
        const found = state.subOrProductItems.find((item) => item.id === action.payload);
        state.selectedSubOrProductItem = found || null;
      }
    },
    setFilter: (
      state,
      action: PayloadAction<{ key: keyof StandardFiltersState; value: string }>
    ) => {
      state.filters[action.payload.key] = action.payload.value;
      state.currentPage = 1;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.searchQuery = action.payload;
      state.currentPage = 1;
    },
    clearStandardFilters: (state) => {
      state.filters = {
        ...initialFilters,
        searchQuery: state.filters.searchQuery,
      };
      state.currentPage = 1;
    },
    clearAllFilters: (state) => {
      state.categoryType = 'all';
      state.mainCategories = [];
      state.selectedMainCategoryId = null;
      state.selectedMainCategory = null;
      state.subOrProductItems = [];
      state.selectedSubOrProductId = null;
      state.selectedSubOrProductItem = null;
      state.filters = { ...initialFilters };
      state.currentPage = 1;
      state.error = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.currentPage = 1;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCatalogOfferingsThunk
      .addCase(fetchCatalogOfferingsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCatalogOfferingsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.databaseProducts = action.payload.products;
        state.primaryCategories = action.payload.primaryCategories;
        state.secondaryCategories = action.payload.secondaryCategories;

        if (state.categoryType === 'primary') {
          state.mainCategories = state.primaryCategories;
        } else if (state.categoryType === 'secondary') {
          state.mainCategories = state.secondaryCategories;
        }

        // Derive offerings directly from database products & categories
        state.derivedOfferings = extractAllOfferingsFromDatabase(
          action.payload.products,
          state.primaryCategories,
          state.secondaryCategories
        );
      })
      .addCase(fetchCatalogOfferingsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load catalog offerings from database';
      })

      // fetchMainCategories
      .addCase(fetchMainCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMainCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        const { type, data } = action.payload;

        if (type === 'primary') {
          state.primaryCategories = data as PrimaryCategory[];
          if (state.categoryType === 'primary') {
            state.mainCategories = data as PrimaryCategory[];
          }
        } else {
          state.secondaryCategories = data as SecondaryCategory[];
          if (state.categoryType === 'secondary') {
            state.mainCategories = data as SecondaryCategory[];
          }
        }

        // Merge and refresh derived offerings from database products & categories
        state.derivedOfferings = extractAllOfferingsFromDatabase(
          state.databaseProducts,
          state.primaryCategories,
          state.secondaryCategories
        );
      })
      .addCase(fetchMainCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load categories';
      })

      // selectMainCategoryThunk
      .addCase(selectMainCategoryThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(selectMainCategoryThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedMainCategoryId = action.payload.categoryId;
        state.selectedMainCategory = action.payload.detail;
        state.subOrProductItems = action.payload.items;
        state.selectedSubOrProductId = null;
        state.selectedSubOrProductItem = null;

        // Ensure newly fetched category products exist in derivedOfferings
        if (action.payload.detail?.products && Array.isArray(action.payload.detail.products)) {
          const catName =
            (action.payload.detail as any).primaryCategoryName ||
            (action.payload.detail as any).secondaryCategoryName;
          const mapped = action.payload.detail.products.map((p: any) =>
            mapProductToOffering(p, catName, action.payload.categoryId)
          );
          for (const item of mapped) {
            const idx = state.derivedOfferings.findIndex((o) => o.prodId === item.prodId);
            if (idx >= 0) {
              state.derivedOfferings[idx] = item;
            } else {
              state.derivedOfferings.push(item);
            }
          }
        }
      })
      .addCase(selectMainCategoryThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load category details';
      });
  },
});

export const {
  setCategoryType,
  clearMainCategorySelection,
  selectSubOrProduct,
  setFilter,
  setSearchQuery,
  clearStandardFilters,
  clearAllFilters,
  setPage,
  setPageSize,
  clearError,
} = categoriesSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectDerivedOfferings = (state: { categories: CategoriesState }) =>
  state.categories.derivedOfferings;

export const selectCategoriesLoading = (state: { categories: CategoriesState }) =>
  state.categories.isLoading;

export const selectCategoriesError = (state: { categories: CategoriesState }) =>
  state.categories.error;

export const selectPrimaryCategories = (state: { categories: CategoriesState }) =>
  state.categories.primaryCategories;

export const selectSecondaryCategories = (state: { categories: CategoriesState }) =>
  state.categories.secondaryCategories;

export const selectCategoryType = (state: { categories: CategoriesState }) =>
  state.categories.categoryType;

export const selectMainCategories = (state: { categories: CategoriesState }) =>
  state.categories.mainCategories;

export const selectSelectedMainCategoryId = (state: { categories: CategoriesState }) =>
  state.categories.selectedMainCategoryId;

export const selectSubOrProductItems = (state: { categories: CategoriesState }) =>
  state.categories.subOrProductItems;

export const selectSelectedSubOrProductId = (state: { categories: CategoriesState }) =>
  state.categories.selectedSubOrProductId;

export const selectFilters = (state: { categories: CategoriesState }) =>
  state.categories.filters;

type CategoriesRoot = { categories: CategoriesState };

/**
 * Filtered Offerings Selector
 * Applies Category Hierarchy partition logic, standard attribute filters, and search query
 */
export const selectFilteredOfferings = createSelector(
  [
    (state: CategoriesRoot) => state.categories.categoryType,
    (state: CategoriesRoot) => state.categories.selectedMainCategoryId,
    (state: CategoriesRoot) => state.categories.selectedMainCategory,
    (state: CategoriesRoot) => state.categories.selectedSubOrProductId,
    (state: CategoriesRoot) => state.categories.selectedSubOrProductItem,
    (state: CategoriesRoot) => state.categories.derivedOfferings,
    (state: CategoriesRoot) => state.categories.filters,
  ],
  (
    categoryType,
    selectedMainCategoryId,
    selectedMainCategory,
    selectedSubOrProductId,
    selectedSubOrProductItem,
    derivedOfferings,
    filters
  ): OfferingResponse[] => {
  let result = derivedOfferings;

  // 1. Filter by Category Hierarchy Partitions
  if (categoryType === 'primary') {
    if (selectedMainCategoryId) {
      const mainCatIdStr = String(selectedMainCategoryId);

      if (selectedSubOrProductId && selectedSubOrProductId !== 'all') {
        if (selectedSubOrProductItem?.type === 'product') {
          // Isolate single product
          result = result.filter(
            (o) => String(o.prodId) === selectedSubOrProductId || o.sku_id === selectedSubOrProductId
          );
        } else if (selectedSubOrProductItem?.type === 'subcategory') {
          result = result.filter(
            (o) =>
              String(o.secondaryCategoryId) === selectedSubOrProductId ||
              String(o.subCategoryName) === selectedSubOrProductItem.name
          );
        }
      } else {
        // Show all products under this Primary Category
        const primaryCat = selectedMainCategory as PrimaryCategory | null;
        const directProdIds = new Set(
          (primaryCat?.products || []).map((p) => String(p.prodId || p.productId || p.sku_id))
        );
        const subCatIds = new Set(
          (primaryCat?.subCategory || []).map((s) => String(s.secondaryCategoryId))
        );

        result = result.filter((o) => {
          if (String(o.primaryCategoryId) === mainCatIdStr) return true;
          if (directProdIds.has(String(o.prodId))) return true;
          if (o.secondaryCategoryId && subCatIds.has(String(o.secondaryCategoryId))) return true;
          return false;
        });
      }
    } else {
      // All primary products
      result = result.filter((o) => o.primaryCategoryId !== undefined);
    }
  } else if (categoryType === 'secondary') {
    if (selectedMainCategoryId) {
      const secCatIdStr = String(selectedMainCategoryId);

      if (selectedSubOrProductId && selectedSubOrProductId !== 'all') {
        if (selectedSubOrProductItem?.type === 'product') {
          // Isolate single product
          result = result.filter(
            (o) => String(o.prodId) === selectedSubOrProductId || o.sku_id === selectedSubOrProductId
          );
        } else if (selectedSubOrProductItem?.type === 'subcategory') {
          result = result.filter(
            (o) =>
              String(o.secondaryCategoryId) === selectedSubOrProductId ||
              String(o.subCategoryName) === selectedSubOrProductItem.name
          );
        }
      } else {
        // Show all products under this Secondary Category
        const secCat = selectedMainCategory as SecondaryCategory | null;
        const directProdIds = new Set(
          (secCat?.products || []).map((p) => String(p.prodId || p.productId || p.sku_id))
        );

        result = result.filter((o) => {
          if (String(o.secondaryCategoryId) === secCatIdStr) return true;
          if (directProdIds.has(String(o.prodId))) return true;
          return false;
        });
      }
    } else {
      // All secondary products
      result = result.filter((o) => o.secondaryCategoryId !== undefined);
    }
  }

  // 2. Filter by Product Category (e.g. LIGHTING, FURNITURE)
  if (filters.category && filters.category !== 'all') {
    result = result.filter(
      (o) =>
        o.product?.category?.toUpperCase() === filters.category.toUpperCase() ||
        o.category?.toUpperCase() === filters.category.toUpperCase()
    );
  }

  // 3. Filter by Type (e.g. PRODUCT, SERVICE)
  if (filters.type && filters.type !== 'all') {
    result = result.filter(
      (o) => o.offering_type?.toUpperCase() === filters.type.toUpperCase()
    );
  }

  // 4. Filter by Status (e.g. ACTIVE / PUBLISHED)
  if (filters.status && filters.status !== 'all') {
    const filterStatus = filters.status.toUpperCase();
    result = result.filter((o) => {
      const oStatus = (o.status || '').toUpperCase();
      if (filterStatus === 'ACTIVE' || filterStatus === 'PUBLISHED') {
        return oStatus === 'ACTIVE' || oStatus === 'PUBLISHED';
      }
      return oStatus === filterStatus;
    });
  }

  // 5. Filter by Vendor
  if (filters.vendor && filters.vendor !== 'all') {
    result = result.filter(
      (o) =>
        (o.vendor || o.offering_name) === filters.vendor ||
        o.inventory?.sourcingLogistics?.preferred_vendor === filters.vendor
    );
  }

  // 6. Filter by Stock
  if (filters.stock && filters.stock !== 'all') {
    result = result.filter((o) => {
      const currentStock = o.inventory?.current_stock ?? 0;
      const minLevel = o.inventory?.minimum_stock_level ?? 10;
      if (filters.stock === 'In Stock') return currentStock > minLevel;
      if (filters.stock === 'Low Stock') return currentStock > 0 && currentStock <= minLevel;
      if (filters.stock === 'Out of Stock') return currentStock === 0;
      return true;
    });
  }

  // 7. Filter by Search Query
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    result = result.filter((o) => {
      const name = (o.offering_name || '').toLowerCase();
      const sku = (o.sku_id || '').toLowerCase();
      const cat = (o.product?.category || o.category || '').toLowerCase();
      const subCat = (o.subCategoryName || o.subcategory || '').toLowerCase();
      const vendor = (o.vendor || o.offering_name || '').toLowerCase();
      return (
        name.includes(q) ||
        sku.includes(q) ||
        cat.includes(q) ||
        subCat.includes(q) ||
        vendor.includes(q)
      );
    });
  }

  return result;
  }
);

export const selectCurrentPage = (state: { categories: CategoriesState }) =>
  state.categories.currentPage || 1;

export const selectPageSize = (state: { categories: CategoriesState }) =>
  state.categories.pageSize || 10;

export const selectPaginatedOfferings = createSelector(
  [
    selectFilteredOfferings,
    (state: CategoriesRoot) => state.categories.currentPage,
    (state: CategoriesRoot) => state.categories.pageSize,
  ],
  (filtered, currentPage, pageSize): OfferingResponse[] => {
    const page = currentPage || 1;
    const size = pageSize || 10;
    const start = (page - 1) * size;
    return filtered.slice(start, start + size);
  }
);

export default categoriesSlice.reducer;
