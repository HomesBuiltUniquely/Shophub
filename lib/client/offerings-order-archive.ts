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

export async function listOfferingsOrders(filters?: { email?: string; leadId?: string; clientId?: string }) {
  const all = await readAll();
  if (!filters) return all;
  const email = String(filters.email || '').toLowerCase();
  const leadId = String(filters.leadId || '');
  const clientId = String(filters.clientId || '').toLowerCase();
  return all.filter((order) => {
    if (email && String(order.customerEmail || '').toLowerCase() === email) return true;
    if (leadId && String(order.leadId || '') === leadId) return true;
    if (clientId && String(order.clientId || '').toLowerCase() === clientId) return true;
    return false;
  });
}
