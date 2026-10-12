/**
 * offeringsDraftStore.ts
 * Lightweight localStorage-backed store for offerings the client has
 * added to their quotation draft from the catalog.
 *
 * Persists across navigation and page refreshes.
 * Cleared after the client submits the draft to the designer.
 */

const STORAGE_KEY = 'hub_offerings_draft';

export interface OfferingDraftItem {
  /** Unique draft line-item id */
  draftId: string;
  /** Product / offering id */
  offeringId: string;
  offeringName: string;
  sku: string;
  /** Unit price (selling price before GST) */
  unitPrice: number;
  /** GST rate as a number e.g. 18 */
  gstRate: number;
  quantity: number;
  /** Room this item is assigned to */
  room: string;
  /** Custom finish / designer note from the client */
  designerNote?: string;
  /** ISO timestamp when added */
  addedAt: string;
  /** Primary image URL for display */
  imageUrl?: string;
}

/** Derive totals from a draft item */
export function getDraftItemTotals(item: OfferingDraftItem) {
  const baseTotal = item.unitPrice * item.quantity;
  const gstAmount = (baseTotal * item.gstRate) / 100;
  const grandTotal = baseTotal + gstAmount;
  return { baseTotal, gstAmount, grandTotal };
}

/** Derive summary totals from all draft items */
export function getDraftSummary(items: OfferingDraftItem[]) {
  let subTotal = 0;
  let totalGst = 0;

  items.forEach((item) => {
    const { baseTotal, gstAmount } = getDraftItemTotals(item);
    subTotal += baseTotal;
    totalGst += gstAmount;
  });

  return {
    subTotal,
    totalGst,
    grandTotal: subTotal + totalGst,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
  };
}

/** Read all draft items from localStorage (SSR-safe) */
export function getDraftItems(): OfferingDraftItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfferingDraftItem[];
  } catch {
    return [];
  }
}

/** Save the full draft array to localStorage */
function saveDraftItems(items: OfferingDraftItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Add or increment an offering in the draft */
export function addToDraft(item: Omit<OfferingDraftItem, 'draftId' | 'addedAt'>): OfferingDraftItem {
  const items = getDraftItems();

  // Check if same offering + room + note already exists → increment qty instead
  const existingIdx = items.findIndex(
    (i) =>
      i.offeringId === item.offeringId &&
      i.room === item.room &&
      (i.designerNote || '') === (item.designerNote || '')
  );

  if (existingIdx !== -1) {
    items[existingIdx].quantity += item.quantity;
    saveDraftItems(items);
    return items[existingIdx];
  }

  const newItem: OfferingDraftItem = {
    ...item,
    draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString(),
  };

  items.push(newItem);
  saveDraftItems(items);
  return newItem;
}

/** Update quantity of a specific draft line item */
export function updateDraftItemQty(draftId: string, quantity: number) {
  const items = getDraftItems();
  const idx = items.findIndex((i) => i.draftId === draftId);
  if (idx === -1) return;
  if (quantity <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx].quantity = quantity;
  }
  saveDraftItems(items);
}

/** Remove a specific draft line item */
export function removeDraftItem(draftId: string) {
  const items = getDraftItems().filter((i) => i.draftId !== draftId);
  saveDraftItems(items);
}

/** Wipe the entire draft (call after submission) */
export function clearDraft() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Count total items (quantity sum) in draft — used for badge */
export function getDraftItemCount(): number {
  return getDraftItems().reduce((acc, i) => acc + i.quantity, 0);
}

/** Group draft items by room name */
export function getDraftGroupedByRoom(
  items: OfferingDraftItem[]
): Record<string, OfferingDraftItem[]> {
  return items.reduce<Record<string, OfferingDraftItem[]>>((acc, item) => {
    if (!acc[item.room]) acc[item.room] = [];
    acc[item.room].push(item);
    return acc;
  }, {});
}
