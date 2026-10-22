'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProductById } from '@/lib/api/product.service';
import { getAllPrimaryCategories, getAllSecondaryCategories } from '@/lib/api/category.service';
import { ProdDataResDTO } from '@/lib/types/dto.types';
import { PrimaryCategory, SecondaryCategory } from '@/lib/types/api.types';
import { useAppSelector } from '@/lib/store/hooks';

export interface SingleOfferingState {
  product: ProdDataResDTO | null;
  primaryCategory: PrimaryCategory | null;
  secondaryCategories: SecondaryCategory[];
  currentSecondaryCategory: SecondaryCategory | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for Single Offering View
 * Dynamically loads product details for the given prodId directly from backend and database.
 */
export function useSingleOffering(prodId: string | number = ''): SingleOfferingState {
  const [product, setProduct] = useState<ProdDataResDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check Redux store in case catalog already fetched categories & products
  const reduxCategories = useAppSelector((state) => state.categories);

  const fetchData = useCallback(async () => {
    if (!prodId) {
      setIsLoading(false);
      setError('No offering selected.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const reduxProduct =
        reduxCategories.databaseProducts.find(
          (p: any) =>
            String(p.prodId || p.prod_id || p.id) === String(prodId) ||
            String(p.sku_id) === String(prodId)
        ) ||
        reduxCategories.derivedOfferings.find(
          (o) => String(o.prodId) === String(prodId) || String(o.sku_id) === String(prodId)
        );

      const prod = (await getProductById(prodId)) || (reduxProduct as ProdDataResDTO | undefined) || null;

      if (!prod) {
        throw new Error(`Product not found with ID: ${prodId}`);
      }

      let enrichedProd: ProdDataResDTO = { ...prod };

      // Helper to find full product entity in category arrays if any fields are missing
      const findProductInCategoryList = (categories: any[]) => {
        if (!categories || !Array.isArray(categories)) return null;

        for (const cat of categories) {
          const catProducts = cat.products || cat.Products;
          if (catProducts && Array.isArray(catProducts)) {
            const found = catProducts.find(
              (p: any) =>
                String(p.prodId || p.prod_id || p.productId || p.id) === String(prodId) ||
                (p.sku_id && p.sku_id === enrichedProd.sku_id) ||
                (p.skuId && p.skuId === enrichedProd.sku_id)
            );
            if (found) return found;
          }

          const subCats = cat.subCategory || cat.subCategories;
          if (subCats && Array.isArray(subCats)) {
            for (const sub of subCats) {
              const subProducts = sub.products || sub.Products;
              if (subProducts && Array.isArray(subProducts)) {
                const found = subProducts.find(
                  (p: any) =>
                    String(p.prodId || p.prod_id || p.productId || p.id) === String(prodId) ||
                    (p.sku_id && p.sku_id === enrichedProd.sku_id) ||
                    (p.skuId && p.skuId === enrichedProd.sku_id)
                );
                if (found) return found;
              }
            }
          }
        }
        return null;
      };

      // If specifications or inventory are still missing from the direct endpoint response, check category trees
      if (!enrichedProd.inventory || !enrichedProd.specifications || !enrichedProd.seo) {
        let catEntity =
          findProductInCategoryList(reduxCategories.primaryCategories) ||
          findProductInCategoryList(reduxCategories.secondaryCategories);

        if (!catEntity) {
          try {
            const [primaryCats, secondaryCats] = await Promise.all([
              getAllPrimaryCategories(),
              getAllSecondaryCategories(),
            ]);
            catEntity =
              findProductInCategoryList(primaryCats) ||
              findProductInCategoryList(secondaryCats);
          } catch (catErr) {
            console.warn('[useSingleOffering] Could not fetch categories for details:', catErr);
          }
        }

        if (catEntity) {
          enrichedProd = {
            ...catEntity,
            ...enrichedProd,
            inventory: enrichedProd.inventory || catEntity.inventory,
            specifications: enrichedProd.specifications || catEntity.specifications,
            internal: enrichedProd.internal || catEntity.internal,
            media: enrichedProd.media || catEntity.media,
            long_desc: enrichedProd.long_desc || catEntity.long_desc || (catEntity as any)?.longDescription,
            short_desc: enrichedProd.short_desc || catEntity.short_desc || (catEntity as any)?.shortDescription || (catEntity as any)?.description,
          };
        }
      }

      setProduct(enrichedProd);
    } catch (err: any) {
      console.warn(`[useSingleOffering] Error loading product (${prodId}):`, err);
      setError(err?.message || 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  }, [prodId, reduxCategories.primaryCategories, reduxCategories.secondaryCategories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    product,
    primaryCategory: null,
    secondaryCategories: [],
    currentSecondaryCategory: null,
    isLoading,
    error,
    refetch: fetchData,
  };
}
