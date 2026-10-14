import type { OfferingDraftItem } from '@/lib/client/offeringsDraftStore';
import { getDraftSummary } from '@/lib/client/offeringsDraftStore';
import type { QuoteModel } from '@/lib/types/quote.types';

export type OfferingsSubmittedOrder = {
  id: string;
  createdAt: string;
  invoiceId?: string;
  quoteNumber?: string;
  grandTotal?: number;
  items: OfferingDraftItem[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  leadId?: string;
  clientId?: string;
  source?: 'client' | 'staff';
  identityKeys?: string[];
};

const SUBMITTED_KEY = 'hub_offerings_submitted';

export function draftItemsFromQuoteLines(items: Array<Record<string, unknown>>): OfferingDraftItem[] {
  return items.map((item, index) => ({
    draftId: String(item.id || item.prodId || `line-${index}`),
    offeringId: String(item.prodId || item.offeringId || item.id || item.skuId || item.sku || ''),
    offeringName: String(item.offeringName || item.offering_name || 'Offering'),
    sku: String(item.skuId || item.sku || ''),
    unitPrice: Number(item.unitPrice || 0),
    gstRate: 18,
    quantity: Number(item.quantity || 1),
    room: String(item.room || item.category || 'General'),
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    addedAt: new Date().toISOString(),
  }));
}

export function quoteModelFromDraftItems(items: OfferingDraftItem[], customerName?: string): QuoteModel {
  const summary = getDraftSummary(items);
  return {
    quoteNumber: `INV-OFF-${Date.now().toString(36).toUpperCase()}`,
    customerName,
    subtotal: summary.subTotal,
    discountPercentage: 0,
    totalDiscount: 0,
    estimatedFreight: 0,
    grandTotal: summary.grandTotal,
    items: items.map((item, index) => ({
      id: index + 1,
      prodId: Number(item.offeringId) || index + 1,
      offeringName: item.offeringName,
      skuId: item.sku,
      room: item.room,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity,
      imageUrl: item.imageUrl,
      category: item.room,
    })),
  };
}

export function getSubmittedOrders(): OfferingsSubmittedOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SUBMITTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubmittedOrders(orders: OfferingsSubmittedOrder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUBMITTED_KEY, JSON.stringify(orders));
}

export function addSubmittedOrder(order: OfferingsSubmittedOrder) {
  const orders = getSubmittedOrders().filter((item) => item.id !== order.id);
  orders.unshift(order);
  saveSubmittedOrders(orders);
  return orders;
}
