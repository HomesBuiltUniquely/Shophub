import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import type { RowDataPacket } from 'mysql2';

type ProductIdentity = {
  created_by?: unknown;
  createdBy?: unknown;
  prodId?: unknown;
  prod_id?: unknown;
  id?: unknown;
  sku_id?: unknown;
  skuId?: unknown;
  sku?: unknown;
};

export function deduplicateProducts<T extends ProductIdentity>(products: T[]): T[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const sku = product.sku_id ?? product.skuId ?? product.sku;
    const productId = product.prodId ?? product.prod_id ?? product.id;
    const ownerId = product.created_by ?? product.createdBy;
    const key =
      sku != null && String(sku).trim()
        ? `sku:${ownerId == null ? 'unknown' : String(ownerId)}:${String(sku).trim().toUpperCase()}`
        : productId != null
          ? `id:${String(productId)}`
          : null;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function filterEnterpriseProducts<T extends ProductIdentity>(
  products: T[],
  ownerId: number
): Promise<T[]> {
  const productsWithoutOwner = products.filter(
    (product) => product.created_by == null && product.createdBy == null
  );
  if (productsWithoutOwner.length === 0) {
    return deduplicateProducts(
      products.filter((product) => Number(product.created_by ?? product.createdBy) === ownerId)
    );
  }

  const skus = [
    ...new Set(
      productsWithoutOwner
        .map((product) => product.sku_id ?? product.skuId ?? product.sku)
        .filter((sku): sku is string => typeof sku === 'string' && sku.length > 0)
    ),
  ];
  const productIds = [
    ...new Set(
      productsWithoutOwner
        .map((product) => product.prodId ?? product.prod_id ?? product.id)
        .map(Number)
        .filter((id) => Number.isFinite(id))
    ),
  ];
  const matches: string[] = [];
  const params: (string | number)[] = [];

  if (skus.length > 0) {
    matches.push(`sku_id IN (${skus.map(() => '?').join(', ')})`);
    params.push(...skus);
  }
  if (productIds.length > 0) {
    matches.push(`prod_id IN (${productIds.map(() => '?').join(', ')})`);
    params.push(...productIds);
  }

  const ownedSkus = new Set<string>();
  const productsById = new Map<number, RowDataPacket>();
  const productsBySku = new Map<string, RowDataPacket[]>();
  if (matches.length > 0) {
    const [rows] = await getHomesMerryDbPool().query<RowDataPacket[]>(
      `SELECT prod_id, sku_id, created_by
       FROM product
       WHERE ${matches.join(' OR ')}`,
      params
    );
    for (const row of rows) {
      const productId = Number(row.prod_id);
      const sku = row.sku_id == null ? null : String(row.sku_id);
      if (Number.isFinite(productId)) productsById.set(productId, row);
      if (sku != null) {
        const matchingSkuRows = productsBySku.get(sku) || [];
        matchingSkuRows.push(row);
        productsBySku.set(sku, matchingSkuRows);
      }

      if (Number(row.created_by) === ownerId) {
        if (sku != null) ownedSkus.add(sku);
      }
    }
  }

  return deduplicateProducts(products.filter((product) => {
    const explicitOwner = product.created_by ?? product.createdBy;
    if (explicitOwner != null) return Number(explicitOwner) === ownerId;

    const sku = product.sku_id ?? product.skuId ?? product.sku;
    const productId = Number(product.prodId ?? product.prod_id ?? product.id);
    const localProduct = Number.isFinite(productId) ? productsById.get(productId) : undefined;
    if (localProduct) {
      return (
        Number(localProduct.created_by) === ownerId &&
        (sku == null || String(localProduct.sku_id) === String(sku))
      );
    }

    if (sku == null || !ownedSkus.has(String(sku))) return false;
    return productsBySku.get(String(sku))?.length === 1;
  }));
}
