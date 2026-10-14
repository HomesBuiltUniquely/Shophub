import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { persistOfferingOrder } from '@/lib/client/persist-offering-order';
import { listOfferingsOrders } from '@/lib/client/offerings-order-archive';
import { replaceSavedOfferingsForClient } from '@/lib/client/saved-offerings';
import { resolveClientUser } from '@/lib/client/userLeadResolver';
import type { OfferingDraftItem } from '@/lib/client/offeringsDraftStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const isClient = user.role === 'client';
  const clientUser = isClient ? await resolveClientUser(request) : null;

  try {
    const orders = await listOfferingsOrders(
      isClient
        ? {
            email: clientUser?.email || user.email,
            phone: clientUser?.phone,
            leadId: clientUser?.leadId || searchParams.get('leadId') || user.leadId,
            clientId: clientUser?.clientId || searchParams.get('clientId'),
          }
        : {
            email: searchParams.get('email'),
            phone: searchParams.get('phone'),
            leadId: searchParams.get('leadId'),
            clientId: searchParams.get('clientId'),
            extra: [searchParams.get('pid'), searchParams.get('crmLeadId')],
            search: searchParams.get('search') || undefined,
          }
    );
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[offerings-orders GET]', err);
    return NextResponse.json({ orders: [], error: 'Could not load orders.' }, { status: 500 });
  }
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

  const clientUser = user.role === 'client' ? await resolveClientUser(request) : null;
  const customerName = body.customerName || clientUser?.fullName || user.name;
  const customerEmail = body.customerEmail || clientUser?.email || user.email;
  const customerPhone = body.customerPhone || clientUser?.phone;
  const leadId = String(body.leadId || clientUser?.leadId || user.leadId || '');
  const clientId = String(body.clientId || clientUser?.clientId || '');

  try {
    const order = await persistOfferingOrder({
      items,
      customerName,
      customerEmail,
      customerPhone,
      leadId: leadId || undefined,
      clientId: clientId || undefined,
      ownerEmail: user.email,
      issuedBy: user.name,
      projectName: body.projectName || 'Offerings selection',
      source: user.role === 'client' ? 'client' : 'staff',
      extra: [clientUser?.id, clientUser?.leadId, clientUser?.clientId],
    });

    await replaceSavedOfferingsForClient({
      customerEmail,
      customerPhone,
      leadId,
      clientId,
      customerName,
      savedBy: user.email || user.name,
      extra: [clientUser?.id, clientUser?.leadId, clientUser?.clientId],
      items: items.map((line) => ({
        prodId: String(line.offeringId || ''),
        offeringName: line.offeringName,
        skuId: line.sku,
        category: line.room,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        imageUrl: line.imageUrl,
        room: line.room,
      })),
    }).catch((err) => console.warn('[offerings-orders] saved catalog sync failed:', err));

    return NextResponse.json({ order, invoiceId: order.invoiceId, quoteNumber: order.quoteNumber });
  } catch (err) {
    console.error('[offerings-orders POST]', err);
    return NextResponse.json({ error: 'Could not submit offerings order.' }, { status: 500 });
  }
}
