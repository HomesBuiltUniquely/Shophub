import { createOfferingsInvoice } from '@/lib/quote/invoice-archive';
import { createOfferingsOrder } from '@/lib/client/offerings-order-archive';
import { quoteModelFromDraftItems, type OfferingsSubmittedOrder } from '@/lib/client/offerings-order';
import type { OfferingDraftItem } from '@/lib/client/offeringsDraftStore';
import { offeringIdentityKeys } from '@/lib/client/offering-identity';

export async function persistOfferingOrder(input: {
  items: OfferingDraftItem[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  leadId?: string;
  clientId?: string;
  ownerEmail?: string;
  issuedBy?: string;
  projectName?: string;
  source: 'client' | 'staff';
  extra?: Array<string | number | null | undefined>;
}): Promise<OfferingsSubmittedOrder> {
  const quote = quoteModelFromDraftItems(input.items, input.customerName);
  const invoice = await createOfferingsInvoice({
    quote,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    ownerEmail: input.ownerEmail,
    customerCode: input.clientId,
    leadId: input.leadId,
    projectName: input.projectName || 'Offerings selection',
    issuedBy: input.issuedBy,
    source: input.source,
    validityPeriod: '30 Days (Standard)',
  });

  const order: OfferingsSubmittedOrder = {
    id: `${input.source}-${invoice.id}`,
    createdAt: invoice.createdAt,
    invoiceId: invoice.id,
    quoteNumber: invoice.quoteNumber,
    grandTotal: invoice.grandTotal,
    items: input.items,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    leadId: input.leadId,
    clientId: input.clientId,
    source: input.source,
    identityKeys: offeringIdentityKeys({
      email: input.customerEmail,
      phone: input.customerPhone,
      leadId: input.leadId,
      clientId: input.clientId,
      extra: input.extra,
    }),
  };

  await createOfferingsOrder(order);
  return order;
}
