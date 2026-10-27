import { listOfferingsInvoices, createOfferingsInvoice } from '@/lib/quote/invoice-archive';
import { invoiceMatchesCustomer } from '@/lib/quote/invoice-match';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import type { SessionUser } from '@/lib/auth/session';
import type { RowDataPacket } from 'mysql2/promise';

export interface PurchasedProductItem {
  prodId: number;
  offeringName: string;
  skuId?: string;
  category?: string;
  enterpriseName: string;
  purchaseRef: string;
  purchaseDate: string;
  price?: number;
  imageUrl?: string;
}

let demoInvoiceSeeded = false;

async function seedDemoClientInvoiceIfNeeded(clientUser: SessionUser) {
  if (demoInvoiceSeeded) return;
  if (clientUser.email?.toLowerCase() !== 'client@hubinterior.com') return;

  try {
    const invoices = await listOfferingsInvoices();
    const hasClientInvoice = invoices.some((inv) =>
      invoiceMatchesCustomer(inv, { email: clientUser.email, name: clientUser.name })
    );

    if (!hasClientInvoice) {
      // Find a sample product from DB
      const pool = getHomesMerryDbPool();
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT prod_id, offering_name, sku_id, category, brand, selling_price, primary_image FROM product ORDER BY prod_id ASC LIMIT 2'
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const quoteItems = rows.map((r: any) => ({
          prodId: Number(r.prod_id),
          offeringName: r.offering_name || 'Executive Velvet Armchair',
          skuId: r.sku_id || 'SKU-DEMO-01',
          category: r.category || 'FURNITURE',
          room: 'Living Room',
          quantity: 1,
          unitPrice: Number(r.selling_price || 24999),
          totalPrice: Number(r.selling_price || 24999),
          imageUrl: r.primary_image || '',
        }));

        await createOfferingsInvoice({
          quote: {
            quoteNumber: 'INV-DEMO-CLIENT-001',
            customerId: clientUser.id,
            customerName: clientUser.name || 'Client User',
            subtotal: quoteItems.reduce((acc, it) => acc + it.totalPrice, 0),
            grandTotal: quoteItems.reduce((acc, it) => acc + it.totalPrice, 0),
            items: quoteItems,
          },
          customerName: clientUser.name || 'Client User',
          customerEmail: clientUser.email,
          customerId: clientUser.id,
          source: 'client',
          projectName: 'Demo Luxury Residence',
        });
      }
    }
  } catch (err) {
    console.warn('[purchase-verification] Failed to seed demo invoice:', err);
  } finally {
    demoInvoiceSeeded = true;
  }
}

/**
 * Returns all products verified to have been purchased by this client.
 */
export async function getClientPurchasedProducts(clientUser: SessionUser): Promise<PurchasedProductItem[]> {
  await seedDemoClientInvoiceIfNeeded(clientUser);

  const allInvoices = await listOfferingsInvoices();
  const clientInvoices = allInvoices.filter((inv) =>
    invoiceMatchesCustomer(inv, {
      email: clientUser.email,
      name: clientUser.name,
      leadId: clientUser.leadId,
      clientId: String(clientUser.id),
    })
  );

  const purchasedMap = new Map<number, PurchasedProductItem>();

  for (const inv of clientInvoices) {
    const items = inv.quote?.items || [];
    for (const item of items) {
      const prodId = Number(item.prodId);
      if (!prodId || isNaN(prodId)) continue;

      if (!purchasedMap.has(prodId)) {
        purchasedMap.set(prodId, {
          prodId,
          offeringName: item.offeringName || `Product #${prodId}`,
          skuId: item.skuId,
          category: item.category,
          enterpriseName: 'Hub Homes', // default or resolved below
          purchaseRef: inv.quoteNumber || inv.id || 'INV-VERIFIED',
          purchaseDate: inv.createdAt,
          price: item.unitPrice || item.totalPrice,
          imageUrl: item.imageUrl,
        });
      }
    }
  }

  // Resolve enterprise names from product table if available
  if (purchasedMap.size > 0) {
    try {
      const pool = getHomesMerryDbPool();
      const prodIds = Array.from(purchasedMap.keys());
      const [pRows] = await pool.query<RowDataPacket[]>(
        `SELECT prod_id, brand, primary_image FROM product WHERE prod_id IN (?)`,
        [prodIds]
      );
      if (Array.isArray(pRows)) {
        for (const row of pRows) {
          const item = purchasedMap.get(Number(row.prod_id));
          if (item) {
            if (row.brand) item.enterpriseName = row.brand;
            if (row.primary_image && !item.imageUrl) item.imageUrl = row.primary_image;
          }
        }
      }
    } catch (err) {
      console.warn('[purchase-verification] Error enriching enterprise names:', err);
    }
  }

  return Array.from(purchasedMap.values());
}

/**
 * Verifies if the client has purchased a specific product.
 */
export async function verifyClientProductPurchase(
  clientUser: SessionUser,
  prodId: number
): Promise<{ hasPurchased: boolean; purchasedItem?: PurchasedProductItem }> {
  const purchased = await getClientPurchasedProducts(clientUser);
  const found = purchased.find((p) => p.prodId === Number(prodId));

  if (!found) {
    return { hasPurchased: false };
  }

  return { hasPurchased: true, purchasedItem: found };
}
