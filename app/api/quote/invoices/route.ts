import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import {
  createOfferingsInvoice,
  listOfferingsInvoices,
  toInvoiceSummary,
} from '@/lib/quote/invoice-archive';
import { invoiceMatchesCustomer } from '@/lib/quote/invoice-match';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const invoices = (await listOfferingsInvoices()).map(toInvoiceSummary);
  if (user.role !== 'client') {
    return NextResponse.json({ invoices });
  }

  const { searchParams } = new URL(request.url);
  const mine = invoices.filter((invoice) =>
    invoiceMatchesCustomer(invoice, {
      email: user.email,
      name: searchParams.get('name') || user.name,
      leadId: searchParams.get('leadId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
    })
  );
  return NextResponse.json({ invoices: mine });
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const quote = body?.quote;
  if (!quote || !Array.isArray(quote.items) || quote.items.length === 0) {
    return NextResponse.json({ error: 'Quote has no items to invoice.' }, { status: 400 });
  }

  const record = await createOfferingsInvoice({
    quote,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    customerId: body.customerId,
    customerCode: body.customerCode,
    ownerEmail: body.ownerEmail,
    source: body.source === 'client' ? 'client' : 'staff',
    projectName: body.projectName,
    leadId: body.leadId ? String(body.leadId) : undefined,
    validityPeriod: body.validityPeriod,
    issuedBy: body.issuedBy || user.name,
    id: typeof body.id === 'string' ? body.id : undefined,
  });

  return NextResponse.json({ id: record.id, invoice: record });
}
