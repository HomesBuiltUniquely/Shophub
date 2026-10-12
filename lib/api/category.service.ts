import {
  PrimaryCategory,
  SecondaryCategory,
  Product,
  ApiError,
} from '../types/api.types';

export type { PrimaryCategory, SecondaryCategory };

export type CategorySeo = {
  page_title?: string;
  meta_desc?: string;
  url_slug?: string;
  keywords?: string[];
};

export type CategoryWrite = {
  name: string;
  description?: string;
  imageUrl?: string;
  seo?: CategorySeo;
  internalTags?: string[];
  parentSecondaryId?: number;
};

function unwrapArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.payload)) return data.payload;
  return [];
}

function unwrapEntity(data: any) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  if (data.primaryCategoryId != null || data.secondaryCategoryId != null || data.id != null) {
    return data;
  }
  return data.data || data.category || data.result || data.payload || data;
}

async function catalogRequest(
  path: string,
  init?: { method?: string; body?: unknown; allowError?: boolean }
) {
  const res = await fetch(`/api/catalog${path}`, {
    method: init?.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
    credentials: 'include',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok && !init?.allowError) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    throw Object.assign(new Error(message), {
      status: res.status,
      code: data?.errorCode || data?.code,
    });
  }
  return { status: res.status, data };
}

function primaryBody(data: CategoryWrite) {
  return {
    primaryCategoryName: data.name,
    primaryCategoryDescription: data.description || '',
    imageUrl: data.imageUrl || '',
    seo: {
      page_title: data.seo?.page_title || data.name,
      meta_desc: data.seo?.meta_desc || data.description || '',
      url_slug: data.seo?.url_slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      keywords: data.seo?.keywords || data.internalTags || [],
    },
    internalTags: data.internalTags || [],
  };
}

function secondaryBody(data: CategoryWrite) {
  return {
    secondaryCategoryName: data.name,
    secondaryCategoryDescription: data.description || '',
    imageUrl: data.imageUrl || '',
    seo: {
      page_title: data.seo?.page_title || data.name,
      meta_desc: data.seo?.meta_desc || data.description || '',
      url_slug: data.seo?.url_slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      keywords: data.seo?.keywords || data.internalTags || [],
    },
    internalTags: data.internalTags || [],
    ...(data.parentSecondaryId
      ? {
          parent_scat_id: data.parentSecondaryId,
          parent: { secondaryCategoryId: data.parentSecondaryId },
        }
      : {}),
  };
}

async function getLocalProducts(): Promise<Product[]> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${origin}/api/products?page=0&size=100`, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.content) ? data.content : [];
  } catch {
    return [];
  }
}

function groupProductsByCategory(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const name = String(product.category || 'GENERAL').toUpperCase();
    const list = groups.get(name) || [];
    list.push(product);
    groups.set(name, list);
  }
  return groups;
}

async function getCategoriesFromLocalProducts(kind: 'primary' | 'secondary') {
  const products = await getLocalProducts();
  if (products.length === 0) return [];
  const groups = groupProductsByCategory(products);
  return [...groups.entries()].map(([name, grouped], index) => {
    if (kind === 'primary') {
      return {
        primaryCategoryId: index + 1,
        primaryCategoryName: name,
        products: grouped,
      } as PrimaryCategory;
    }
    return {
      secondaryCategoryId: index + 1,
      secondaryCategoryName: name,
      products: grouped,
    } as SecondaryCategory;
  });
}

/**
 * Fetch all primary categories directly from the database
 * GET /api/v1/categories/getAllCategories
 */
export const getAllPrimaryCategories = async (): Promise<PrimaryCategory[]> => {
  try {
    const response = await catalogRequest('/categories/getAllCategories', { allowError: true });
    if (response.status >= 200 && response.status < 300) {
      return unwrapArray(response.data);
    }
  } catch (error: any) {
    console.warn('[category.service] getAllPrimaryCategories database query failed (using fallback):', error.message);
  }
  return getCategoriesFromLocalProducts('primary');
};

/**
 * Fetch one primary category by ID directly from the database
 * GET /api/v1/categories/getCategory/{primaryCategoryId}
 */
export const getPrimaryCategoryById = async (
  primaryCategoryId: string | number
): Promise<PrimaryCategory | null> => {
  try {
    const response = await catalogRequest(`/categories/getCategory/${primaryCategoryId}`, {
      allowError: true,
    });
    if (response.status >= 200 && response.status < 300 && response.data) {
      return unwrapEntity(response.data);
    }
  } catch (error: any) {
    console.warn(`[category.service] getPrimaryCategoryById(${primaryCategoryId}) database query failed:`, error.message);
  }
  return null;
};

/**
 * Fetch all secondary categories directly from the database
 * GET /api/v1/secondary-categories/getAllCategories
 */
export const getAllSecondaryCategories = async (): Promise<SecondaryCategory[]> => {
  try {
    const response = await catalogRequest('/secondary-categories/getAllCategories', { allowError: true });
    if (response.status >= 200 && response.status < 300) {
      return unwrapArray(response.data);
    }
  } catch (error: any) {
    console.warn('[category.service] getAllSecondaryCategories database query failed (using fallback):', error.message);
  }
  return getCategoriesFromLocalProducts('secondary');
};

/**
 * Fetch secondary categories by primary category ID directly from the database
 * GET /api/v1/secondary-categories/getCategoriesByPrimary/{primaryCategoryId}
 */
export const getCategoriesByPrimary = async (
  primaryCategoryId: string | number
): Promise<SecondaryCategory[]> => {
  try {
    const response = await catalogRequest(
      `/secondary-categories/getCategoriesByPrimary/${primaryCategoryId}`,
      { allowError: true }
    );
    if (response.status >= 200 && response.status < 300) {
      return unwrapArray(response.data);
    }
  } catch (error: any) {
    console.warn(
      `[category.service] getCategoriesByPrimary(${primaryCategoryId}) database query failed:`,
      error.message
    );
  }
  return [];
};

/**
 * Fetch one secondary category by ID directly from the database
 * GET /api/v1/secondary-categories/getCategory/{secondaryCategoryId}
 */
export const getSecondaryCategoryById = async (
  secondaryCategoryId: string | number
): Promise<SecondaryCategory | null> => {
  try {
    const response = await catalogRequest(`/secondary-categories/getCategory/${secondaryCategoryId}`, {
      allowError: true,
    });
    if (response.status >= 200 && response.status < 300 && response.data) {
      return unwrapEntity(response.data);
    }
  } catch (error: any) {
    console.warn(
      `[category.service] getSecondaryCategoryById(${secondaryCategoryId}) database query failed:`,
      error.message
    );
  }
  return null;
};

export const deletePrimaryCategory = async (id: string | number): Promise<void> => {
  try {
    await catalogRequest(`/categories/deleteCategory/${id}`, { method: 'DELETE' });
  } catch (error: any) {
    throw toApiError(error, `Failed to delete category ${id}`);
  }
};

export const deleteSecondaryCategory = async (id: string | number): Promise<void> => {
  try {
    await catalogRequest(`/secondary-categories/deleteCategory/${id}`, { method: 'DELETE' });
  } catch (error: any) {
    throw toApiError(error, `Failed to delete secondary category ${id}`);
  }
};

function toApiError(error: any, fallback: string): Error & ApiError {
  const err = Object.assign(new Error(error.response?.data?.message || error.message || fallback), {
    status: error.response?.status || error.status,
    code: error.response?.data?.code || error.code,
  });
  return err;
}

/**
 * Create a new primary category
 * POST /categories/createCategory
 */
export const createPrimaryCategory = async (data: CategoryWrite): Promise<PrimaryCategory> => {
  try {
    const response = await catalogRequest('/categories/createCategory', {
      method: 'POST',
      body: primaryBody(data),
    });
    return unwrapEntity(response.data);
  } catch (error: any) {
    throw toApiError(error, 'Failed to create primary category');
  }
};

/**
 * Update a primary category
 * PUT /categories/updateCategory/{id}
 */
export const updatePrimaryCategory = async (
  primaryCategoryId: number | string,
  data: CategoryWrite
): Promise<PrimaryCategory> => {
  try {
    const response = await catalogRequest(`/categories/updateCategory/${primaryCategoryId}`, {
      method: 'PUT',
      body: primaryBody(data),
    });
    return unwrapEntity(response.data);
  } catch (error: any) {
    throw toApiError(error, 'Failed to update primary category');
  }
};

/**
 * Create a secondary category under a primary category
 * POST /secondary-categories/createCategory/{primaryCategoryId}
 */
export const createSecondaryCategory = async (
  primaryCategoryId: number | string,
  data: CategoryWrite
): Promise<SecondaryCategory> => {
  try {
    const response = await catalogRequest(`/secondary-categories/createCategory/${primaryCategoryId}`, {
      method: 'POST',
      body: secondaryBody(data),
    });
    return unwrapEntity(response.data);
  } catch (error: any) {
    throw toApiError(error, 'Failed to create secondary category');
  }
};

/**
 * Create a sub-category under a parent secondary category
 * POST /secondary-categories/createSubCategory/{parentSecondaryCategoryId}
 */
export const createSubCategory = async (
  parentSecondaryCategoryId: number | string,
  data: CategoryWrite
): Promise<SecondaryCategory> => {
  try {
    const response = await catalogRequest(
      `/secondary-categories/createSubCategory/${parentSecondaryCategoryId}`,
      { method: 'POST', body: secondaryBody(data) }
    );
    return unwrapEntity(response.data);
  } catch (error: any) {
    throw toApiError(error, 'Failed to create sub-category');
  }
};

/**
 * Update a secondary category
 * PUT /secondary-categories/updateCategory/{secondaryCategoryId}
 */
export const updateSecondaryCategory = async (
  secondaryCategoryId: number | string,
  data: CategoryWrite
): Promise<SecondaryCategory> => {
  try {
    const response = await catalogRequest(`/secondary-categories/updateCategory/${secondaryCategoryId}`, {
      method: 'PUT',
      body: secondaryBody(data),
    });
    return unwrapEntity(response.data);
  } catch (error: any) {
    throw toApiError(error, 'Failed to update secondary category');
  }
};
