import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { OfferingsInvoiceRecord, OfferingsInvoiceSummary } from '@/lib/quote/invoice.types';
import { readJsonCollection, upsertJsonRecord } from '@/lib/db/json-collection';

export type { OfferingsInvoiceRecord, OfferingsInvoiceSummary };

const FILE = path.join(process.cwd(), 'data', 'offerings-invoices.json');
const COLLECTION = 'offerings_invoices';

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function readFileAll(): Promise<OfferingsInvoiceRecord[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeById(rows: OfferingsInvoiceRecord[]) {
  const byId = new Map<string, OfferingsInvoiceRecord>();
  for (const row of rows) {
    if (row?.id) byId.set(row.id, row);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function readAll(): Promise<OfferingsInvoiceRecord[]> {
  let mysqlRows: OfferingsInvoiceRecord[] = [];
  try {
    mysqlRows = await readJsonCollection<OfferingsInvoiceRecord>(COLLECTION);
  } catch (err) {
    console.error('[invoice-archive] MySQL read failed:', err);
  }
  return mergeById([...(await readFileAll()), ...mysqlRows]);
}

export function toInvoiceSummary(row: OfferingsInvoiceRecord): OfferingsInvoiceSummary {
  const { quote: _quote, ...summary } = row;
  return summary;
}

export async function createOfferingsInvoice(
  input: Omit<OfferingsInvoiceRecord, 'id' | 'createdAt' | 'quoteNumber' | 'grandTotal' | 'itemCount'> & {
    id?: string;
    createdAt?: string;
  }
): Promise<OfferingsInvoiceRecord> {
  const quote = input.quote;
  const record: OfferingsInvoiceRecord = {
    ...input,
    id: input.id || makeId(),
    createdAt: input.createdAt || new Date().toISOString(),
    quoteNumber: quote?.quoteNumber || `INV-${Date.now().toString(36).toUpperCase()}`,
    grandTotal: Number(quote?.grandTotal || 0),
    itemCount: Array.isArray(quote?.items) ? quote.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0,
    quote,
  };

  let persisted = false;
  try {
    await upsertJsonRecord(COLLECTION, record);
    persisted = true;
  } catch (err) {
    console.error('[invoice-archive] MySQL write failed:', err);
  }
  try {
    const all = mergeById([record, ...(await readFileAll())]);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');
    persisted = true;
  } catch (err) {
    console.warn('[invoice-archive] File write failed:', err);
  }
  if (!persisted) {
    throw new Error('Could not persist offering invoice.');
  }
  return record;
}

export async function listOfferingsInvoices(): Promise<OfferingsInvoiceRecord[]> {
  return readAll();
}

export async function getOfferingsInvoice(id: string): Promise<OfferingsInvoiceRecord | null> {
  if (!id) return null;
  const all = await readAll();
  return all.find((row) => row.id === id) || null;
}
