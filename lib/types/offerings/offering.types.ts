// ============================================================================
// OFFERING TYPES - Backend → UI
// ============================================================================

/**
 * Single offering result from Elasticsearch
 */
export interface OfferingResponse {
  prodId: string;
  offering_name: string;
  offering_type: string;        // PRODUCT, SERVICE
  sku_id: string;
  status: string;               // Active, Draft, Published
  updated_at?: string;          // ISO date string
  description?: string;
  pricing: {
    selling_price: number;
    cost_price?: number;
    cost?: number;
    margin_percentage?: number;
  };
  inventory: {
    current_stock: number;
    minimum_stock_level: number;
    reorder_quantity?: number;
    sourcingLogistics?: {
      preferred_vendor?: string;
    };
  };
  product?: {
    category: string;           // e.g., LIGHTING, ELECTRONICS
    offering_name?: string;
    image_url?: string;
    [key: string]: any;
  };
  internal?: {
    visibility_status: {
      publishing_status: string; // PUBLISHED, DRAFT
    };
  };
  brand?: string;
  vendor?: string;
  subCategoryName?: string;
  subcategory?: string;
  primaryCategoryId?: string | number;
  secondaryCategoryId?: string | number;
  [key: string]: any; // Allow additional fields
}

/**
 * Offering type badge display helper
 */
export function getOfferingTypeBadgeClass(type: string): string {
  return type === 'Product'
    ? 'bg-purple-50 text-purple-700 border border-purple-200'
    : 'bg-gray-100 text-gray-700 border border-gray-200';
}

/**
 * Offering status badge display helper
 */
export function getStatusBadgeClass(status: string): string {
  if (status === 'Active' || status === 'PUBLISHED') {
    return 'bg-green-50 text-green-700 border border-green-200';
  }
  if (status === 'Inactive') {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  return 'bg-orange-50 text-orange-600 border border-orange-200';
}

/**
 * Stock level display helper
 */
export function getStockDisplay(offering: OfferingResponse): {
  text: string;
  subtext: string | null;
  dotColor: string;
  textColor: string;
} {
  if (offering.offering_type === 'Service') {
    return {
      text: 'N/A',
      subtext: '(Unlimited)',
      dotColor: 'bg-gray-400',
      textColor: 'text-gray-600',
    };
  }

  const currentStock = offering.inventory?.current_stock ?? 0;
  const minLevel = offering.inventory?.minimum_stock_level ?? 10;

  if (currentStock === 0) {
    return {
      text: '0 (Out of Stock)',
      subtext: null,
      dotColor: 'bg-red-500',
      textColor: 'text-red-600',
    };
  }

  if (currentStock <= minLevel) {
    return {
      text: `Low (${currentStock})`,
      subtext: null,
      dotColor: 'bg-orange-500',
      textColor: 'text-orange-600',
    };
  }

  return {
    text: `${currentStock} In Stock`,
    subtext: null,
    dotColor: 'bg-green-500',
    textColor: 'text-gray-900',
  };
}

/**
 * Format date for display
 */
export function formatOfferingDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  };
}