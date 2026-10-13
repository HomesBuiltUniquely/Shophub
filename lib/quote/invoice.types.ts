import type { QuoteModel } from '@/lib/types/quote.types';

export type OfferingsInvoiceRecord = {
  id: string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
  customerId?: number;
  customerCode?: string;
  ownerEmail?: string;
  source?: 'client' | 'staff';
  projectName?: string;
  leadId?: string;
  validityPeriod?: string;
  issuedBy?: string;
  quoteNumber?: string;
  grandTotal?: number;
  itemCount?: number;
  quote: QuoteModel;
};

export type OfferingsInvoiceSummary = Omit<OfferingsInvoiceRecord, 'quote'>;
