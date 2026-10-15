/**
 * Offerings Mapper
 * Converts category API product responses to OfferingResponse format
 */

import { Product, PrimaryCategory, SecondaryCategory } from '../types/api.types';
import { OfferingResponse } from '../types/offerings/offering.types';
import { offeringImageUrl } from '@/lib/media/offering-image';

/**
 * Map a Product from database or category API to OfferingResponse
 * Extracts available fields and provides sensible defaults for missing data
 */
export function isLiveCatalogProduct(product: any): boolean {
  const published = product?.is_published;
  if (published !== true && published !== 1 && published !== '1') {
    return false;
  }
  const status = String(
    product?.internal?.visibility_status?.publishing_status ||
      product?.publishing_status ||
      product?.status ||
      ''
  ).toUpperCase();
  return status !== 'DRAFT';
}

export function mapProductToOffering(
  product: Product,
  categoryName?: string,
  categoryId?: string | number
): OfferingResponse {
  const prodId = String(product.prodId || product.productId || product.sku_id || '');
  const offeringName = product.offering_name || product.productName || 'Unnamed Offering';
  const skuId = product.sku_id || product.sku || '';
  const offeringType = product.offering_type || 'PRODUCT';
  
  // Normalize publishing status to ACTIVE for published products
  const rawStatus =
    product.status ||
    product.internal?.visibility_status?.publishing_status ||
    'ACTIVE';
  const publishingStatus =
    rawStatus.toUpperCase() === 'PUBLISHED' || rawStatus.toUpperCase() === 'ACTIVE'
      ? 'ACTIVE'
      : rawStatus;
  
  // Compute margin percentage if missing: ((selling - cost) / selling) * 100
  const sellingPrice = product.pricing?.selling_price ?? product.price ?? 0;
  const costPrice = product.pricing?.cost_price ?? product.pricing?.cost ?? undefined;
  let marginPercentage = product.pricing?.margin_percentage ?? undefined;
  if ((marginPercentage === undefined || marginPercentage === null || marginPercentage === 0) && costPrice !== undefined && sellingPrice > 0) {
    marginPercentage = Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1));
  }

  return {
    prodId,
    offering_name: offeringName,
    offering_type: offeringType,
    sku_id: skuId,
    status: publishingStatus,
    updated_at: product.created_at || product.updated_at || new Date().toISOString(),
    description: product.productDescription || product.description,
    pricing: {
      selling_price: sellingPrice,
      cost_price: costPrice,
      cost: costPrice,
      margin_percentage: marginPercentage,
    },
    inventory: {
      current_stock: product.inventory?.current_stock ?? product.stock ?? 0,
      minimum_stock_level: product.inventory?.minimum_stock_level ?? 0,
      reorder_quantity: product.inventory?.reorder_quantity,
      sourcingLogistics: {
        preferred_vendor: product.inventory?.sourcingLogistics?.preferred_vendor ?? undefined,
      },
    },
    media: {
      ...(product.media || {}),
      primary_image:
        offeringImageUrl(
          product.media?.primary_image,
          product.image_url,
          product.primary_image,
          product.image
        ) || '',
      gallery_images: product.media?.gallery_images || [],
    },
    product: {
      category: product.category || 'FURNITURE',
      offering_name: offeringName,
      image_url:
        offeringImageUrl(
          product.media?.primary_image,
          product.image_url,
          product.primary_image,
          product.image
        ) || '',
    },
    internal: {
      visibility_status: {
        publishing_status: publishingStatus,
      },
    },
    vendor: offeringName,
    brand: product.brand,
    subCategoryName: categoryName,
    subcategory: categoryName,
    primaryCategoryId: categoryId,
    secondaryCategoryId: categoryId,
  };
}

/**
 * Extract all products from primary categories
 */
export function extractProductsFromPrimaryCategories(
  categories: PrimaryCategory[]
): OfferingResponse[] {
  const offerings: OfferingResponse[] = [];

  for (const category of categories) {
    if (category.products && Array.isArray(category.products)) {
      for (const product of category.products) {
        offerings.push(
          mapProductToOffering(product, category.primaryCategoryName, category.primaryCategoryId)
        );
      }
    }
    if (category.subCategory && Array.isArray(category.subCategory)) {
      for (const sub of category.subCategory) {
        if (sub.products && Array.isArray(sub.products)) {
          for (const product of sub.products) {
            offerings.push(
              mapProductToOffering(product, sub.secondaryCategoryName, sub.secondaryCategoryId)
            );
          }
        }
      }
    }
  }

  return offerings;
}

/**
 * Extract all products from secondary categories
 */
export function extractProductsFromSecondaryCategories(
  categories: SecondaryCategory[]
): OfferingResponse[] {
  const offerings: OfferingResponse[] = [];

  for (const category of categories) {
    if (category.products && Array.isArray(category.products)) {
      for (const product of category.products) {
        offerings.push(
          mapProductToOffering(product, category.secondaryCategoryName, category.secondaryCategoryId)
        );
      }
    }
    if (category.subCategory && Array.isArray(category.subCategory)) {
      for (const sub of category.subCategory) {
        if (sub.products && Array.isArray(sub.products)) {
          for (const product of sub.products) {
            offerings.push(
              mapProductToOffering(product, sub.secondaryCategoryName, sub.secondaryCategoryId)
            );
          }
        }
      }
    }
  }

  return offerings;
}

/**
 * Extract all products from both primary and secondary categories
 * Deduplicates by prodId to avoid showing the same product twice
 */
export function extractAllProductsFromCategories(
  primaryCategories: PrimaryCategory[],
  secondaryCategories: SecondaryCategory[]
): OfferingResponse[] {
  const primaryOfferings = extractProductsFromPrimaryCategories(primaryCategories);
  const secondaryOfferings = extractProductsFromSecondaryCategories(secondaryCategories);

  const productMap = new Map<string, OfferingResponse>();

  for (const offering of primaryOfferings) {
    productMap.set(offering.prodId, offering);
  }

  for (const offering of secondaryOfferings) {
    if (!productMap.has(offering.prodId)) {
      productMap.set(offering.prodId, offering);
    }
  }

  return Array.from(productMap.values());
}

/**
 * Extract all offerings combining live products query with category relations
 */
export function extractAllOfferingsFromDatabase(
  products: Product[],
  primaryCategories: PrimaryCategory[] = [],
  secondaryCategories: SecondaryCategory[] = []
): OfferingResponse[] {
  // Map to store secondary category name by prodId
  const subCategoryByProdId = new Map<string, { id: string | number; name: string }>();

  for (const sec of secondaryCategories) {
    if (sec.products && Array.isArray(sec.products)) {
      for (const p of sec.products) {
        const id = String(p.prodId || p.productId || p.sku_id || '');
        if (id) {
          subCategoryByProdId.set(id, {
            id: sec.secondaryCategoryId,
            name: sec.secondaryCategoryName,
          });
        }
      }
    }
  }

  const productMap = new Map<string, OfferingResponse>();

  // 1. First add direct products from database products table
  for (const product of products) {
    const pId = String(product.prodId || product.productId || product.sku_id || '');
    if (!pId) continue;

    const subInfo = subCategoryByProdId.get(pId);
    const subCatName =
      subInfo?.name ||
      product.subCategoryName ||
      product.subcategory ||
      product.description ||
      (product.category ? `${product.category} Collection` : 'Catalog Item');

    const offering = mapProductToOffering(product, subCatName, subInfo?.id);
    productMap.set(offering.prodId, offering);
  }

  return Array.from(productMap.values());
}
