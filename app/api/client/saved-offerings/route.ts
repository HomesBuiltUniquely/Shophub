import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { isInternalStaff } from '@/lib/auth/session';
import {
  excludeServiceSavedItems,
  listSavedOfferingsForClient,
  replaceSavedOfferingsForClient,
} from '@/lib/client/saved-offerings';
import { resolveClientUser } from '@/lib/client/userLeadResolver';
import { draftItemsFromQuoteLines } from '@/lib/client/offerings-order';
import { persistOfferingOrder } from '@/lib/client/persist-offering-order';
import { listOfferingsOrders } from '@/lib/client/offerings-order-archive';
import type { SavedOfferingRow } from '@/lib/client/saved-offerings';

export const dynamic = 'force-dynamic';

function identityFromRequest(
  searchParams: URLSearchParams,
  clientUser: Awaited<ReturnType<typeof resolveClientUser>>,
  user: { email?: string; leadId?: string; role?: string }
) {
  return {
    email: user.role === 'client' ? clientUser?.email || user.email : searchParams.get('email'),
    phone: clientUser?.phone || searchParams.get('phone'),
    leadId: clientUser?.leadId || searchParams.get('leadId') || user.leadId,
    clientId: clientUser?.clientId || searchParams.get('clientId'),
    extra: [searchParams.get('pid'), clientUser?.clientId, clientUser?.leadId],
  };
}

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientUser = user.role === 'client' ? await resolveClientUser(request) : null;
  const identity = identityFromRequest(searchParams, clientUser, user);

  try {
    const saved = await listSavedOfferingsForClient(identity);
    const orders = await listOfferingsOrders(identity);
    const items: SavedOfferingRow[] = [...saved];
    const seen = new Set(saved.map((row) => row.prodId));
    for (const order of orders) {
      for (const line of order.items || []) {
        const prodId = String(line.offeringId || line.sku || '');
        if (!prodId || seen.has(prodId)) continue;
        seen.add(prodId);
        items.push({
          id: items.length + 1,
          assignmentId: order.id,
          customerEmail: order.customerEmail || '',
          customerPhone: order.customerPhone || '',
          leadId: order.leadId || '',
          clientId: order.clientId || '',
          customerName: order.customerName || '',
          prodId,
          offeringName: line.offeringName,
          skuId: line.sku,
          category: line.room,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          imageUrl: line.imageUrl,
          room: line.room,
          savedBy: order.source || 'staff',
          createdAt: order.createdAt,
        });
      }
    }
    const visible = user.role === 'client' ? await excludeServiceSavedItems(items) : items;
    return NextResponse.json({ items: visible });
  } catch (err) {
    console.error('[saved-offerings GET]', err);
    return NextResponse.json({ items: [], error: 'Could not load saved offerings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user || (!isInternalStaff(user) && user.role !== 'admin' && user.role !== 'enterprise')) {
    return NextResponse.json({ error: 'Staff sign in required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: 'Add at least one product to the quote first.' }, { status: 400 });
  }
  if (!body?.customerEmail && !body?.customerPhone && !body?.leadId && !body?.clientId) {
    return NextResponse.json(
      { error: 'Select a client (email, phone, or lead) before saving offerings.' },
      { status: 400 }
    );
  }

  const mapped = items.map((item: Record<string, unknown>) => ({
    prodId: String(item.prodId || item.id || ''),
    offeringName: String(item.offeringName || item.offering_name || 'Offering'),
    skuId: item.skuId ? String(item.skuId) : undefined,
    category: item.category ? String(item.category) : undefined,
    unitPrice: Number(item.unitPrice || 0),
    quantity: Number(item.quantity || 1),
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    room: item.room ? String(item.room) : undefined,
  }));

  try {
    const saved = await replaceSavedOfferingsForClient({
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      leadId: body.leadId ? String(body.leadId) : undefined,
      clientId: body.clientId,
      customerName: body.customerName,
      savedBy: user.email || user.name,
      extra: [body.numericLeadId, body.pid, body.customerId],
      items: mapped,
    });

    const order = await persistOfferingOrder({
      items: draftItemsFromQuoteLines(items),
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      leadId: body.leadId ? String(body.leadId) : undefined,
      clientId: body.clientId,
      ownerEmail: user.email,
      issuedBy: user.name,
      projectName: body.projectName,
      source: 'staff',
      extra: [body.numericLeadId, body.pid, body.customerId],
    });

    return NextResponse.json({ success: true, ...saved, orderId: order.id, invoiceId: order.invoiceId });
  } catch (err) {
    console.error('[saved-offerings POST]', err);
    return NextResponse.json({ error: 'Could not save offerings for this client.' }, { status: 500 });
  }
}
