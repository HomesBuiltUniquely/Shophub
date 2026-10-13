import { NextRequest, NextResponse } from 'next/server';
import { getOfferingsInvoice } from '@/lib/quote/invoice-archive';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await getOfferingsInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}
