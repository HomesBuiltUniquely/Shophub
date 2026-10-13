import type { OfferingsInvoiceSummary } from '@/lib/quote/invoice.types';

export type InvoiceMatchContext = {
  email?: string;
  name?: string;
  leadId?: string;
  clientId?: string;
};

function norm(value?: string | number | null) {
  return String(value || '').trim().toLowerCase();
}

export function invoiceMatchesCustomer(
  invoice: OfferingsInvoiceSummary,
  ctx: InvoiceMatchContext
) {
  const email = norm(ctx.email);
  if (email) {
    if (norm(invoice.ownerEmail) === email) return true;
    if (norm(invoice.customerEmail) === email) return true;
  }

  const clientId = norm(ctx.clientId);
  if (clientId) {
    if (norm(invoice.customerCode) === clientId) return true;
    if (norm(invoice.customerName).includes(clientId)) return true;
  }

  const leadId = String(ctx.leadId || '').trim();
  if (leadId) {
    if (String(invoice.leadId || '') === leadId) return true;
    if (String(invoice.customerId || '') === leadId) return true;
    if (norm(invoice.customerName).includes(leadId.toLowerCase())) return true;
  }

  const name = norm(ctx.name).split('(')[0].trim();
  const invoiceName = norm(invoice.customerName).split('(')[0].trim();
  if (name.length >= 4 && invoiceName) {
    if (invoiceName.includes(name) || name.includes(invoiceName)) return true;
    const first = name.split(/\s+/)[0];
    if (first.length >= 4 && invoiceName.split(/\s+/)[0] === first) return true;
  }

  return false;
}
