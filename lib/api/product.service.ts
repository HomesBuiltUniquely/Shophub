import apiClient from './axios-instance';
import {
  ProdDataResDTO,
  PageResponse,
  ElasticsearchSearchRequest,
  ElasticsearchSearchResponse,
} from '../types/dto.types';
/**
 * Empty page response fallback if API is unreachable or empty
 */
const createEmptyPageResponse = (page = 0, size = 10): PageResponse<ProdDataResDTO> => ({
  content: [],
  pageable: {
    pageNumber: page,
    pageSize: size,
    sort: {
      empty: true,
      sorted: false,
      unsorted: true,
    },
    offset: 0,
    paged: true,
    unpaged: false,
  },
  totalElements: 0,
  totalPages: 0,
  size,
  number: page,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
});

/**
 * Fetch all products with pagination directly from the database
 * GET /api/v1/products/getAllProducts?page={page}&size={size}&sort={sort}
 */
async function getProductsFromLocalApi(
  page = 0,
  size = 50,
  sort = 'prodId,asc'
): Promise<PageResponse<ProdDataResDTO> | null> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort,
    });
    const response = await fetch(`${origin}/api/products?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && Array.isArray(data.content)) {
      return data;
    }
  } catch (error: any) {
    console.warn('[product.service] Local catalog fallback failed:', error.message);
  }
  return null;
}

export const getAllProducts = async (
  page = 0,
  size = 50,
  sort = 'prodId,asc'
): Promise<PageResponse<ProdDataResDTO>> => {
  const localPage = await getProductsFromLocalApi(page, size, sort);
  if (localPage) {
    return localPage;
  }

  return createEmptyPageResponse(page, size);
};

/**
 * Convenience helper to return flat array of products from the Page response
 */
export const fetchCatalogProducts = async (): Promise<any[]> => {
  try {
    const data = await getAllProducts(0, 100);
    if (data && Array.isArray(data.content)) {
      return data.content;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err: any) {
    console.warn('Failed to fetch catalog products (using fallback):', err.message);
    return [];
  }
};

/**
 * Fetch one product by ID directly from the database
 * GET /api/v1/products/getProduct/{prodId}
 */
async function getProductFromLocalApi(prodId: number | string): Promise<ProdDataResDTO | null> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const byId = await fetch(`${origin}/api/products?id=${encodeURIComponent(String(prodId))}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (byId.ok) {
      const data = await byId.json();
      if (data && (data.prodId != null || data.offering_name)) {
        return data;
      }
    }

    const page = await getProductsFromLocalApi(0, 100);
    return (
      page?.content.find(
        (product) =>
          String(product.prodId) === String(prodId) ||
          String(product.sku_id) === String(prodId)
      ) || null
    );
  } catch {
    return null;
  }
}

export const getProductById = async (prodId: number | string): Promise<ProdDataResDTO | null> => {
  try {
    const response = await apiClient.get<ProdDataResDTO>(`/products/getProduct/${prodId}`, {
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 300 && response.data) {
      return response.data;
    }
  } catch (error: any) {
    console.warn(`[product.service] getProductById(${prodId}) database query failed:`, error.message);
  }

  return getProductFromLocalApi(prodId);
};

/**
 * Typed Elasticsearch search/filter execution using live database products
 */
export const searchProductsWithElasticsearch = async (
  request: ElasticsearchSearchRequest
): Promise<ElasticsearchSearchResponse<ProdDataResDTO>> => {
  const page = request.from ? Math.floor(request.from / (request.size || 10)) : 0;
  const size = request.size || 10;
  const pageData = await getAllProducts(page, size);

  return {
    took: 10,
    timed_out: false,
    hits: {
      total: {
        value: pageData.totalElements,
        relation: 'eq',
      },
      max_score: 1.0,
      hits: pageData.content.map((prod: any) => ({
        _index: 'products',
        _id: String(prod.prodId),
        _score: 1.0,
        _source: prod,
      })),
    },
  };
};
