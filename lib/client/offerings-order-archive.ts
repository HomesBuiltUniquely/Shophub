import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { OfferingsSubmittedOrder } from '@/lib/client/offerings-order';

const FILE = path.join(process.cwd(), 'data', 'offerings-orders.json');

async function readAll(): Promise<OfferingsSubmittedOrder[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: OfferingsSubmittedOrder[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

export async function createOfferingsOrder(order: OfferingsSubmittedOrder) {
  const all = await readAll();
  all.unshift(order);
  await writeAll(all);
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

    // If email filter is specified (e.g. For client users)
    if (email && orderEmail === email) return true;

    // If leadId filter is specified
    if (leadId && (orderLeadId === leadId || orderLeadId.includes(leadId) || leadId.includes(orderLeadId))) {
      return true;
    }

    // If clientId filter is specified (flexible BLR- prefix match)
    if (clientId && (
      orderClientId === clientId ||
      orderCleanClientId === cleanClientId ||
      orderClientId.includes(cleanClientId) ||
      clientId.includes(orderCleanClientId)
    )) {
      return true;
    }

    // If generic search query is provided
    if (search && (
      orderCustName.includes(search) ||
      orderEmail.includes(search) ||
      orderQuoteNum.includes(search) ||
      orderClientId.includes(search) ||
      orderLeadId.includes(search)
    )) {
      return true;
    }

    return false;
  });
}
