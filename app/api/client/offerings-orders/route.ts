import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { createOfferingsInvoice } from '@/lib/quote/invoice-archive';
import { quoteModelFromDraftItems, type OfferingsSubmittedOrder } from '@/lib/client/offerings-order';
import { createOfferingsOrder, listOfferingsOrders } from '@/lib/client/offerings-order-archive';
import type { OfferingDraftItem } from '@/lib/client/offeringsDraftStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const orders = await listOfferingsOrders({
    email: user.email,
    leadId: searchParams.get('leadId') || undefined,
    clientId: searchParams.get('clientId') || undefined,
  });
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? (body.items as OfferingDraftItem[]) : [];
  if (!items.length) {
    return NextResponse.json({ error: 'Select at least one offering.' }, { status: 400 });
  }

  const customerName = body.customerName || user.name;
  const customerEmail = body.customerEmail || user.email;
  const leadId = body.leadId ? String(body.leadId) : undefined;
  const clientId = body.clientId ? String(body.clientId) : undefined;
  const quote = quoteModelFromDraftItems(items, customerName);

  const invoice = await createOfferingsInvoice({
    quote,
    customerName,
    customerEmail,
    ownerEmail: user.email,
    customerCode: clientId,
    leadId,
    projectName: body.projectName || 'Offerings selection',
    issuedBy: user.name,
    source: 'client',
    validityPeriod: '30 Days (Standard)',
  });

  const order: OfferingsSubmittedOrder = {
    id: `ord-${invoice.id}`,
    createdAt: invoice.createdAt,
    invoiceId: invoice.id,
    quoteNumber: invoice.quoteNumber,
    grandTotal: invoice.grandTotal,
    items,
    customerName,
    customerEmail,
    leadId,
    clientId,
  };

  await createOfferingsOrder(order);
  return NextResponse.json({ order, invoiceId: invoice.id, quoteNumber: invoice.quoteNumber });
}
