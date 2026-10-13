import type { QuoteModel } from '@/lib/types/quote.types';

export type SharedQuoteSnapshot = {
  quote: QuoteModel;
  customerName?: string;
  customerEmail?: string;
  customerId?: number;
  projectName?: string;
  leadId?: string;
  validityPeriod?: string;
  issuedBy?: string;
};

const STORAGE_PREFIX = 'shophub_quote_share_';

export function saveSharedQuote(snapshot: SharedQuoteSnapshot, existingId?: string) {
  const id = existingId || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
  return id;
}

export function readSharedQuote(id?: string | null): SharedQuoteSnapshot | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as SharedQuoteSnapshot;
  } catch {
    return null;
  }
}

export function invoiceSharePath(id: string) {
  return `/quote-invoice?s=${encodeURIComponent(id)}`;
}
