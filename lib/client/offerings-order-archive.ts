import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { OfferingsSubmittedOrder } from '@/lib/client/offerings-order';
import { readJsonCollection, upsertJsonRecord } from '@/lib/db/json-collection';
import { hasIdentity, identitiesOverlap, type OfferingIdentity } from '@/lib/client/offering-identity';

const FILE = path.join(process.cwd(), 'data', 'offerings-orders.json');
const COLLECTION = 'offerings_orders';

async function readFileAll(): Promise<OfferingsSubmittedOrder[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeById(rows: OfferingsSubmittedOrder[]) {
  const byId = new Map<string, OfferingsSubmittedOrder>();
  for (const row of rows) {
    if (row?.id) byId.set(row.id, row);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function readAll(): Promise<OfferingsSubmittedOrder[]> {
  let mysqlRows: OfferingsSubmittedOrder[] = [];
  try {
    mysqlRows = await readJsonCollection<OfferingsSubmittedOrder>(COLLECTION);
  } catch (err) {
    console.error('[offerings-order-archive] MySQL read failed:', err);
  }
  const fileRows = await readFileAll();
  return mergeById([...fileRows, ...mysqlRows]);
}

export async function createOfferingsOrder(order: OfferingsSubmittedOrder) {
  let persisted = false;
  try {
    await upsertJsonRecord(COLLECTION, order);
    persisted = true;
  } catch (err) {
    console.error('[offerings-order-archive] MySQL write failed:', err);
  }
  try {
    const all = mergeById([order, ...(await readFileAll())]);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');
    persisted = true;
  } catch (err) {
    console.warn('[offerings-order-archive] File write failed:', err);
  }
  if (!persisted) {
    throw new Error('Could not persist offering invoice.');
  }
  return order;
}

export async function listOfferingsOrders(filters?: OfferingIdentity & { search?: string }) {
  const all = await readAll();
  const search = String(filters?.search || '').toLowerCase().trim();
  const identity: OfferingIdentity = {
    email: filters?.email,
    phone: filters?.phone,
    leadId: filters?.leadId,
    clientId: filters?.clientId,
    extra: filters?.extra,
  };

  return all.filter((order) => {
    const orderIdentity: OfferingIdentity = {
      email: order.customerEmail,
      phone: order.customerPhone,
      leadId: order.leadId,
      clientId: order.clientId,
      extra: [order.invoiceId, order.quoteNumber, order.customerName, ...(order.identityKeys || [])],
    };
    const identityOk = !hasIdentity(identity) || identitiesOverlap(identity, orderIdentity);
    if (!search) return identityOk;
    const hay = [
      order.customerName,
      order.customerEmail,
      order.clientId,
      order.leadId,
      order.quoteNumber,
      ...(order.items || []).map((item) => `${item.offeringName} ${item.sku} ${item.room}`),
    ]
      .join(' ')
      .toLowerCase();
    return identityOk && hay.includes(search);
  });
}
