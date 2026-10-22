export async function deleteCatalogProducts(ids: Array<string | number>) {
  const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  const response = await fetch('/api/offerings', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: uniqueIds }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Unable to delete products.');
  }
  return data as { success: true; deleted: number };
}

export async function bulkUpdateCatalogProducts(
  ids: Array<string | number>,
  action: 'activate' | 'deactivate' | 'price',
  adjustment?: { percent?: number; amount?: number }
) {
  const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  const response = await fetch('/api/offerings/bulk', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids: uniqueIds,
      action,
      percent: adjustment?.percent,
      amount: adjustment?.amount,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Unable to update products.');
  }
  return data as { success: true; updated: number };
}

export function confirmDeleteProducts(count: number) {
  const message =
    count === 1
      ? 'Delete this product permanently? This cannot be undone.'
      : `Delete ${count} selected products permanently? This cannot be undone.`;
  return window.confirm(message);
}
