import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { OfferingsInvoiceRecord, OfferingsInvoiceSummary } from '@/lib/quote/invoice.types';

export type { OfferingsInvoiceRecord, OfferingsInvoiceSummary };

const FILE = path.join(process.cwd(), 'data', 'offerings-invoices.json');

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<OfferingsInvoiceRecord[]> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: OfferingsInvoiceRecord[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2), 'utf8');
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
  const all = await readAll();
  all.unshift(record);
  await writeAll(all);
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
