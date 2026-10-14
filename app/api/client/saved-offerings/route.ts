import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { isInternalStaff } from '@/lib/auth/session';
import { listSavedOfferingsForClient, replaceSavedOfferingsForClient } from '@/lib/client/saved-offerings';
import { resolveClientUser } from '@/lib/client/userLeadResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientUser = user.role === 'client' ? await resolveClientUser(request) : null;

  try {
    const items = await listSavedOfferingsForClient({
      email: user.role === 'client' ? clientUser?.email || user.email : searchParams.get('email'),
      phone: clientUser?.phone || searchParams.get('phone'),
      leadId: clientUser?.leadId || searchParams.get('leadId') || user.leadId,
      clientId: clientUser?.clientId || searchParams.get('clientId'),
    });
    return NextResponse.json({ items });
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

  try {
    const saved = await replaceSavedOfferingsForClient({
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      leadId: body.leadId ? String(body.leadId) : undefined,
      clientId: body.clientId,
      customerName: body.customerName,
      savedBy: user.email || user.name,
      items: items.map((item: Record<string, unknown>) => ({
        prodId: String(item.prodId || item.id || ''),
        offeringName: String(item.offeringName || item.offering_name || 'Offering'),
        skuId: item.skuId ? String(item.skuId) : undefined,
        category: item.category ? String(item.category) : undefined,
        unitPrice: Number(item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        room: item.room ? String(item.room) : undefined,
      })),
    });
    return NextResponse.json({ success: true, ...saved });
  } catch (err) {
    console.error('[saved-offerings POST]', err);
    return NextResponse.json({ error: 'Could not save offerings for this client.' }, { status: 500 });
  }
}
