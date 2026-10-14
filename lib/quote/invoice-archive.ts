import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { OfferingsInvoiceRecord, OfferingsInvoiceSummary } from '@/lib/quote/invoice.types';
import { readJsonCollection, upsertJsonRecord } from '@/lib/db/json-collection';

export type { OfferingsInvoiceRecord, OfferingsInvoiceSummary };

const FILE = path.join(process.cwd(), 'data', 'offerings-invoices.json');
const COLLECTION = 'offerings_invoices';
const useMysql = Boolean(process.env.VERCEL);

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

async function readAll(): Promise<OfferingsInvoiceRecord[]> {
  if (useMysql) {
    try {
      return await readJsonCollection<OfferingsInvoiceRecord>(COLLECTION);
    } catch (err) {
      console.error('[invoice-archive] MySQL read failed:', err);
      return [];
    }
  }
  return readFileAll();
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

  if (useMysql) {
    await upsertJsonRecord(COLLECTION, record);
    return record;
  }

  try {
    const all = await readFileAll();
    all.unshift(record);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');
  } catch (err) {
    console.warn('[invoice-archive] File write failed, using MySQL:', err);
    await upsertJsonRecord(COLLECTION, record);
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
