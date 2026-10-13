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
  leadId?: string;
  clientId?: string;
};

const SUBMITTED_KEY = 'hub_offerings_submitted';

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
