import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { OfferingsSubmittedOrder } from '@/lib/client/offerings-order';
import { readJsonCollection, upsertJsonRecord } from '@/lib/db/json-collection';

const FILE = path.join(process.cwd(), 'data', 'offerings-orders.json');
const COLLECTION = 'offerings_orders';
const useMysql = Boolean(process.env.VERCEL);

async function readFileAll(): Promise<OfferingsSubmittedOrder[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readAll(): Promise<OfferingsSubmittedOrder[]> {
  if (useMysql) {
    try {
      return await readJsonCollection<OfferingsSubmittedOrder>(COLLECTION);
    } catch (err) {
      console.error('[offerings-order-archive] MySQL read failed:', err);
      return [];
    }
  }
  return readFileAll();
}

export async function createOfferingsOrder(order: OfferingsSubmittedOrder) {
  if (useMysql) {
    await upsertJsonRecord(COLLECTION, order);
    return order;
  }
  try {
    const all = await readFileAll();
    all.unshift(order);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');
  } catch (err) {
    console.warn('[offerings-order-archive] File write failed, using MySQL:', err);
    await upsertJsonRecord(COLLECTION, order);
  }
  return order;
}

export async function listOfferingsOrders(filters?: {
  email?: string;
  leadId?: string;
  clientId?: string;
  search?: string;
}) {
  const all = await readAll();
  if (!filters || (!filters.email && !filters.leadId && !filters.clientId && !filters.search)) {
    return all;
  }

  const email = String(filters.email || '').toLowerCase().trim();
  const leadId = String(filters.leadId || '').trim();
  const clientId = String(filters.clientId || '').toLowerCase().trim();
  const cleanClientId = clientId.replace(/^blr-?/i, '');
  const search = String(filters.search || '').toLowerCase().trim();

  return all.filter((order) => {
    const orderEmail = String(order.customerEmail || '').toLowerCase().trim();
    const orderLeadId = String(order.leadId || '').trim();
    const orderClientId = String(order.clientId || '').toLowerCase().trim();
    const orderCleanClientId = orderClientId.replace(/^blr-?/i, '');
    const orderCustName = String(order.customerName || '').toLowerCase();
    const orderQuoteNum = String(order.quoteNumber || '').toLowerCase();

    if (email && orderEmail === email) return true;
    if (leadId && (orderLeadId === leadId || orderLeadId.includes(leadId) || leadId.includes(orderLeadId))) {
      return true;
    }
    if (
      clientId &&
      (orderClientId === clientId ||
        orderCleanClientId === cleanClientId ||
        orderClientId.includes(cleanClientId) ||
        clientId.includes(orderCleanClientId))
    ) {
      return true;
    }
    if (
      search &&
      (orderCustName.includes(search) ||
        orderEmail.includes(search) ||
        orderQuoteNum.includes(search) ||
        orderClientId.includes(search) ||
        orderLeadId.includes(search))
    ) {
      return true;
    }
    return false;
  });
}
